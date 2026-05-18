import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';

// Ensure deno is on PATH (cross-platform)
const originalPath = process.env.PATH || '';
const userHome = os.homedir();
const denoPath = path.join(userHome, '.deno', 'bin');
const isWindows = os.platform() === 'win32';
const sep = isWindows ? ';' : ':';
const extraPaths = isWindows ? `C:\\Program Files\\Deno` : '/usr/local/bin';
process.env.PATH = `${denoPath}${sep}${extraPaths}${sep}${originalPath}`;

// Platform detection
function detectPlatform(url) {
  if (!url) return null;
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  if (/tiktok\.com/i.test(url)) return 'tiktok';
  if (/instagram\.com/i.test(url)) return 'instagram';
  return 'other';
}

// Common yt-dlp args
const BASE_ARGS = [
  '--remote-components', 'ejs:github',
  '--no-playlist',
  '--no-warnings',
  '--no-check-certificates',
];

// Get video info via yt-dlp
function getVideoInfo(url) {
  return new Promise((resolve, reject) => {
    const args = [...BASE_ARGS, '--dump-json', url];
    execFile('yt-dlp', args, { maxBuffer: 10 * 1024 * 1024, timeout: 60000 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(cleanError(stderr || error.message)));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        reject(new Error('Erro ao processar informações do vídeo'));
      }
    });
  });
}

// Check if file needs re-encoding (HEVC -> H.264)
function checkCodec(filePath) {
  return new Promise((resolve) => {
    execFile('ffprobe', [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=codec_name',
      '-of', 'csv=p=0',
      filePath,
    ], { timeout: 10000 }, (error, stdout) => {
      if (error) {
        resolve('unknown');
        return;
      }
      resolve(stdout.trim().toLowerCase());
    });
  });
}

// Re-encode to H.264 if needed
function reencodeToH264(inputPath) {
  return new Promise((resolve, reject) => {
    const outputPath = inputPath.replace('.mp4', '_h264.mp4');

    console.log('    🔄 Re-encoding HEVC → H.264...');

    execFile('ffmpeg', [
      '-i', inputPath,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      '-y',
      outputPath,
    ], { timeout: 120000 }, (error, stdout, stderr) => {
      if (error) {
        console.error('    ❌ Re-encode error:', error.message?.slice(0, 100));
        // Return original file if re-encode fails
        resolve(inputPath);
        return;
      }

      // Replace original with re-encoded
      try {
        fs.unlinkSync(inputPath);
        fs.renameSync(outputPath, inputPath);
        console.log('    ✅ Re-encode completo');
      } catch (e) {
        // If rename fails, use the new file
        if (fs.existsSync(outputPath)) {
          resolve(outputPath);
          return;
        }
      }
      resolve(inputPath);
    });
  });
}

// Download video via yt-dlp
async function downloadWithYtDlp(url) {
  const id = randomUUID();
  const tmpFile = path.join(os.tmpdir(), `virallab_${id}.mp4`);

  // Get info first
  let info;
  try {
    info = await getVideoInfo(url);
    console.log(`    ✅ Info: "${info.title}" (${Math.floor(info.duration || 0)}s)`);
  } catch (e) {
    console.error('    ⚠️ Info error:', e.message?.slice(0, 200));
    info = { title: 'video', duration: 0 };
  }

  // Download - try H.264 first, fallback to any format
  const downloaded = await new Promise((resolve, reject) => {
    const args = [
      ...BASE_ARGS,
      '-f', 'bestvideo[height<=720][vcodec^=avc1]+bestaudio/best[height<=720][vcodec^=avc]/best[height<=720]/best',
      '--merge-output-format', 'mp4',
      '--max-filesize', '200M',
      '-o', tmpFile,
      url,
    ];

    console.log(`    ⬇️ Downloading to: ${tmpFile}`);

    execFile('yt-dlp', args, { maxBuffer: 50 * 1024 * 1024, timeout: 180000 }, (error, stdout, stderr) => {
      if (error) {
        fs.unlink(tmpFile, () => {});
        reject(new Error(cleanError(stderr || error.message)));
        return;
      }
      resolve();
    });
  });

  // Find the actual downloaded file
  let actualFile = findDownloadedFile(tmpFile);

  if (!actualFile) {
    throw new Error('Download falhou — arquivo não encontrado');
  }

  // Check codec and re-encode if HEVC
  const codec = await checkCodec(actualFile);
  console.log(`    📋 Codec detectado: ${codec}`);

  if (codec !== 'h264' && codec !== 'unknown') {
    actualFile = await reencodeToH264(actualFile);
  }

  // Validate file
  const stats = fs.statSync(actualFile);
  if (stats.size < 1000) {
    fs.unlink(actualFile, () => {});
    throw new Error('Download falhou — arquivo vazio');
  }

  const title = info.title || 'video';
  const safeName = title.replace(/[^\w\s\-\u00C0-\u024F]/g, '').trim().substring(0, 80);

  return {
    filePath: actualFile,
    filename: `${safeName || 'video'}.mp4`,
    title: info.title || 'Vídeo',
    duration: Math.floor(info.duration || 0),
    size: stats.size,
    platform: detectPlatform(url),
  };
}

function findDownloadedFile(tmpFile) {
  if (fs.existsSync(tmpFile)) return tmpFile;

  const dir = path.dirname(tmpFile);
  const baseName = path.basename(tmpFile, '.mp4');
  try {
    const files = fs.readdirSync(dir);
    const match = files.find(f => f.includes(baseName));
    if (match) {
      const fullPath = path.join(dir, match);
      if (fs.existsSync(fullPath)) return fullPath;
    }
  } catch (e) {}

  return null;
}

function cleanError(msg) {
  if (!msg) return 'Erro desconhecido';
  const lines = msg.split('\n').filter(l => l.includes('ERROR'));
  if (lines.length > 0) {
    return lines[0].replace(/^ERROR:\s*(\[[\w]+\]\s*\w+:\s*)?/, '').trim();
  }
  return msg.slice(0, 200);
}

export { detectPlatform };

export async function downloadVideo(url) {
  const platform = detectPlatform(url);
  if (!platform) {
    throw new Error('URL não reconhecida. Use links do YouTube, TikTok ou Instagram.');
  }
  return await downloadWithYtDlp(url);
}

export function cleanupTempFile(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (e) {
    console.error('Cleanup error:', e.message);
  }
}
