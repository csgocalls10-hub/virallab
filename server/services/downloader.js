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

// Cobalt API instances (fallback chain)
// Cobalt API — self-hosted via COBALT_API_URL env var, or public fallbacks
const COBALT_INSTANCES = [
  process.env.COBALT_API_URL,
  'https://api.cobalt.tools',
].filter(Boolean);

// Platform detection
function detectPlatform(url) {
  if (!url) return null;
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  if (/tiktok\.com/i.test(url)) return 'tiktok';
  if (/instagram\.com/i.test(url)) return 'instagram';
  return 'other';
}

// ===== COBALT API DOWNLOAD =====
async function downloadWithCobalt(url) {
  const id = randomUUID();
  const tmpFile = path.join(os.tmpdir(), `virallab_${id}.mp4`);
  const isYoutube = /youtube\.com|youtu\.be/i.test(url);

  // Try different configs: normal first, then HLS for YouTube
  const configs = [
    { videoQuality: '720', youtubeVideoCodec: 'h264', youtubeHLS: false },
    ...(isYoutube ? [{ videoQuality: '720', youtubeVideoCodec: 'h264', youtubeHLS: true }] : []),
  ];

  for (const instance of COBALT_INSTANCES) {
    for (const config of configs) {
      try {
        console.log(`    🌐 Cobalt: ${instance} (HLS: ${config.youtubeHLS || false})...`);

        const res = await fetch(`${instance}/`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url,
            ...config,
            allowH265: false,
            filenameStyle: 'basic',
          }),
          signal: AbortSignal.timeout(30000),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          console.log(`    ⚠️ Cobalt ${res.status}: ${text.slice(0, 200)}`);
          // If youtube.login error, try next config (HLS)
          if (text.includes('youtube.login') || text.includes('youtube.token')) continue;
          // For other errors, try next instance
          continue;
      }

      const data = await res.json();
      console.log(`    📦 Cobalt status: ${data.status}`);

      if (data.status === 'error') {
        console.log(`    ❌ Cobalt error: ${data.error?.code || 'unknown'}`);
        continue;
      }

      // Get the download URL
      let downloadUrl = null;
      let filename = 'video.mp4';

      if (data.status === 'tunnel' || data.status === 'redirect') {
        downloadUrl = data.url;
        filename = data.filename || filename;
      } else if (data.status === 'picker' && data.picker?.length > 0) {
        // Pick the first video
        const videoItem = data.picker.find(p => p.type === 'video') || data.picker[0];
        downloadUrl = videoItem.url;
      } else if (data.status === 'local-processing' && data.tunnel?.length > 0) {
        downloadUrl = data.tunnel[0];
        filename = data.output?.filename || filename;
      }

      if (!downloadUrl) {
        console.log('    ⚠️ Cobalt: no download URL in response');
        continue;
      }

      // Download the file
      console.log(`    ⬇️ Cobalt: baixando arquivo...`);
      const fileRes = await fetch(downloadUrl, {
        signal: AbortSignal.timeout(120000),
      });

      if (!fileRes.ok) {
        console.log(`    ⚠️ Cobalt download failed: ${fileRes.status}`);
        continue;
      }

      const buffer = Buffer.from(await fileRes.arrayBuffer());

      if (buffer.length < 1000) {
        console.log(`    ⚠️ Cobalt: arquivo muito pequeno (${buffer.length} bytes)`);
        continue;
      }

      fs.writeFileSync(tmpFile, buffer);
      console.log(`    ✅ Cobalt: ${(buffer.length / 1024 / 1024).toFixed(1)}MB baixados`);

      // Check codec and re-encode if needed
      const codec = await checkCodec(tmpFile);
      let finalFile = tmpFile;
      if (codec !== 'h264' && codec !== 'unknown') {
        console.log(`    📋 Codec: ${codec} → convertendo para H.264`);
        finalFile = await reencodeToH264(tmpFile);
      }

      const stats = fs.statSync(finalFile);
      const safeName = sanitizeFilename(filename);

      return {
        filePath: finalFile,
        filename: safeName.endsWith('.mp4') ? safeName : `${safeName}.mp4`,
        title: safeName.replace(/\.mp4$/i, ''),
        duration: 0, // Cobalt doesn't return duration
        size: stats.size,
        platform: detectPlatform(url),
      };

    } catch (e) {
      console.log(`    ⚠️ Cobalt ${instance} falhou: ${e.message?.slice(0, 80)}`);
      continue;
    }
    } // end configs loop
  } // end instances loop

  throw new Error('COBALT_FAILED');
}

// ===== YT-DLP DOWNLOAD (fallback) =====
const BASE_ARGS = [
  '--remote-components', 'ejs:github',
  '--no-playlist',
  '--no-warnings',
  '--no-check-certificates',
];

function getVideoInfo(url) {
  return new Promise((resolve, reject) => {
    execFile('yt-dlp', [...BASE_ARGS, '--dump-json', url],
      { maxBuffer: 10 * 1024 * 1024, timeout: 60000 },
      (error, stdout, stderr) => {
        if (error) { reject(new Error(cleanError(stderr || error.message))); return; }
        try { resolve(JSON.parse(stdout)); }
        catch (e) { reject(new Error('Erro ao processar info')); }
      }
    );
  });
}

async function downloadWithYtDlp(url) {
  const id = randomUUID();
  const tmpFile = path.join(os.tmpdir(), `virallab_${id}.mp4`);

  let info;
  try {
    info = await getVideoInfo(url);
    console.log(`    ✅ Info: "${info.title}" (${Math.floor(info.duration || 0)}s)`);
  } catch (e) {
    console.error('    ⚠️ Info error:', e.message?.slice(0, 200));
    info = { title: 'video', duration: 0 };
  }

  await new Promise((resolve, reject) => {
    const args = [
      ...BASE_ARGS,
      '-f', 'bestvideo[height<=720][vcodec^=avc1]+bestaudio/best[height<=720][vcodec^=avc]/best[height<=720]/best',
      '--merge-output-format', 'mp4',
      '--max-filesize', '200M',
      '-o', tmpFile,
      url,
    ];

    console.log(`    ⬇️ yt-dlp downloading...`);
    execFile('yt-dlp', args, { maxBuffer: 50 * 1024 * 1024, timeout: 180000 }, (error, stdout, stderr) => {
      if (error) { fs.unlink(tmpFile, () => {}); reject(new Error(cleanError(stderr || error.message))); return; }
      resolve();
    });
  });

  let actualFile = findDownloadedFile(tmpFile);
  if (!actualFile) throw new Error('yt-dlp: arquivo não encontrado');

  const codec = await checkCodec(actualFile);
  if (codec !== 'h264' && codec !== 'unknown') {
    actualFile = await reencodeToH264(actualFile);
  }

  const stats = fs.statSync(actualFile);
  if (stats.size < 1000) { fs.unlink(actualFile, () => {}); throw new Error('yt-dlp: arquivo vazio'); }

  const title = info.title || 'video';
  const safeName = sanitizeFilename(title);

  return {
    filePath: actualFile,
    filename: `${safeName}.mp4`,
    title: info.title || 'Vídeo',
    duration: Math.floor(info.duration || 0),
    size: stats.size,
    platform: detectPlatform(url),
  };
}

// ===== SHARED UTILS =====
function checkCodec(filePath) {
  return new Promise((resolve) => {
    execFile('ffprobe', [
      '-v', 'error', '-select_streams', 'v:0',
      '-show_entries', 'stream=codec_name', '-of', 'csv=p=0', filePath,
    ], { timeout: 10000 }, (error, stdout) => {
      resolve(error ? 'unknown' : stdout.trim().toLowerCase());
    });
  });
}

function reencodeToH264(inputPath) {
  return new Promise((resolve) => {
    const outputPath = inputPath.replace('.mp4', '_h264.mp4');
    console.log('    🔄 Re-encoding → H.264...');

    execFile('ffmpeg', [
      '-i', inputPath, '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
      '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-y', outputPath,
    ], { timeout: 120000 }, (error) => {
      if (error) { console.error('    ❌ Re-encode error'); resolve(inputPath); return; }
      try {
        fs.unlinkSync(inputPath);
        fs.renameSync(outputPath, inputPath);
        console.log('    ✅ Re-encode completo');
      } catch (e) {
        if (fs.existsSync(outputPath)) { resolve(outputPath); return; }
      }
      resolve(inputPath);
    });
  });
}

function findDownloadedFile(tmpFile) {
  if (fs.existsSync(tmpFile)) return tmpFile;
  const dir = path.dirname(tmpFile);
  const baseName = path.basename(tmpFile, '.mp4');
  try {
    const match = fs.readdirSync(dir).find(f => f.includes(baseName));
    if (match) { const p = path.join(dir, match); if (fs.existsSync(p)) return p; }
  } catch (e) {}
  return null;
}

function sanitizeFilename(name) {
  return (name || 'video').replace(/[^\w\s\-\u00C0-\u024F]/g, '').trim().substring(0, 80) || 'video';
}

function cleanError(msg) {
  if (!msg) return 'Erro desconhecido';
  const lines = msg.split('\n').filter(l => l.includes('ERROR'));
  return lines.length > 0 ? lines[0].replace(/^ERROR:\s*(\[[\w]+\]\s*\w+:\s*)?/, '').trim() : msg.slice(0, 200);
}

// ===== INVIDIOUS PROXY (YouTube fallback) =====
const INVIDIOUS_INSTANCES = [
  'https://inv.thepixora.com',
];

async function downloadWithInvidious(url) {
  // Extract video ID
  const match = url.match(/(?:v=|youtu\.be\/|\/shorts\/)([a-zA-Z0-9_-]{11})/);
  if (!match) throw new Error('INVIDIOUS: ID do vídeo não encontrado');
  const videoId = match[1];

  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      console.log(`    🔮 Invidious: ${instance}...`);

      const infoRes = await fetch(`${instance}/api/v1/videos/${videoId}`, {
        signal: AbortSignal.timeout(15000),
      });

      if (!infoRes.ok) {
        console.log(`    ⚠️ Invidious info ${infoRes.status}`);
        continue;
      }

      const info = await infoRes.json();

      // Find best mp4 stream <= 720p
      const streams = (info.formatStreams || [])
        .filter(s => s.container === 'mp4' && s.type?.includes('video'))
        .sort((a, b) => {
          const hA = parseInt(a.resolution) || 0;
          const hB = parseInt(b.resolution) || 0;
          return hB - hA;
        });

      const best = streams.find(s => (parseInt(s.resolution) || 999) <= 720) || streams[0];

      if (!best?.url) {
        console.log('    ⚠️ Invidious: no stream URL');
        continue;
      }

      console.log(`    ⬇️ Invidious: ${best.resolution || '?'}p, downloading...`);

      const fileRes = await fetch(best.url, {
        signal: AbortSignal.timeout(120000),
      });

      if (!fileRes.ok) {
        console.log(`    ⚠️ Invidious download ${fileRes.status}`);
        continue;
      }

      const id = randomUUID();
      const tmpFile = path.join(os.tmpdir(), `virallab_${id}.mp4`);
      const buffer = Buffer.from(await fileRes.arrayBuffer());

      if (buffer.length < 1000) {
        console.log(`    ⚠️ Invidious: arquivo muito pequeno`);
        continue;
      }

      fs.writeFileSync(tmpFile, buffer);
      console.log(`    ✅ Invidious: ${(buffer.length / 1024 / 1024).toFixed(1)}MB`);

      const stats = fs.statSync(tmpFile);
      const title = sanitizeFilename(info.title || 'video');

      return {
        filePath: tmpFile,
        filename: `${title}.mp4`,
        title: info.title || 'Vídeo',
        duration: info.lengthSeconds || 0,
        size: stats.size,
        platform: 'youtube',
      };

    } catch (e) {
      console.log(`    ⚠️ Invidious falhou: ${e.message?.slice(0, 80)}`);
      continue;
    }
  }

  throw new Error('INVIDIOUS_FAILED');
}

// ===== MAIN EXPORT =====
export { detectPlatform };

export async function downloadVideo(url) {
  const platform = detectPlatform(url);
  if (!platform) throw new Error('URL não reconhecida. Use links do YouTube, TikTok ou Instagram.');

  // Strategy: Cobalt → Invidious (YouTube only) → yt-dlp
  try {
    console.log(`  🎯 Método 1: Cobalt API`);
    return await downloadWithCobalt(url);
  } catch (e) {
    console.log(`  ⚠️ Cobalt falhou: ${e.message?.slice(0, 80)}`);
  }

  // Invidious only works for YouTube
  if (platform === 'youtube') {
    try {
      console.log(`  🎯 Método 2: Invidious Proxy`);
      return await downloadWithInvidious(url);
    } catch (e) {
      console.log(`  ⚠️ Invidious falhou: ${e.message?.slice(0, 80)}`);
    }
  }

  try {
    console.log(`  🎯 Método 3: yt-dlp`);
    return await downloadWithYtDlp(url);
  } catch (e) {
    console.log(`  ❌ yt-dlp falhou: ${e.message?.slice(0, 80)}`);
  }

  throw new Error('Não foi possível baixar o vídeo. Tente novamente ou use outra URL.');
}

export function cleanupTempFile(filePath) {
  try { if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath); }
  catch (e) { console.error('Cleanup error:', e.message); }
}

