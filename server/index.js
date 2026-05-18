import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import { getVideoMetadata } from './services/youtube.js';
import { analyzeWithGemini, generateScriptWithGemini, suggestClipsWithGemini } from './services/gemini.js';
import { downloadVideo, detectPlatform, cleanupTempFile } from './services/downloader.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Fetch YouTube metadata
app.get('/api/youtube/metadata', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL é obrigatória' });
    const data = await getVideoMetadata(url);
    res.json(data);
  } catch (e) {
    console.error('YouTube error:', e.message);
    res.status(400).json({ error: e.message });
  }
});

// Analyze video
app.post('/api/analyze', async (req, res) => {
  try {
    const { url, description, platforms, videoMeta } = req.body;
    if (!url) return res.status(400).json({ error: 'URL é obrigatória' });
    if (!platforms || platforms.length === 0) return res.status(400).json({ error: 'Selecione ao menos uma plataforma' });
    const result = await analyzeWithGemini({ url, description, platforms, videoMeta });
    res.json(result);
  } catch (e) {
    console.error('Analysis error:', e.message);
    res.status(500).json({ error: 'Erro na análise' });
  }
});

// Generate script
app.post('/api/script', async (req, res) => {
  try {
    const result = await generateScriptWithGemini(req.body);
    res.json(result);
  } catch (e) {
    console.error('Script error:', e.message);
    res.status(500).json({ error: 'Erro ao gerar roteiro' });
  }
});

// Suggest clips
app.post('/api/suggest-clips', async (req, res) => {
  try {
    const { duration, filename, platform } = req.body;
    if (!duration) return res.status(400).json({ error: 'Duração é obrigatória' });
    const result = await suggestClipsWithGemini({ duration, filename, platform });
    res.json(result);
  } catch (e) {
    console.error('Clip suggestion error:', e.message);
    res.status(500).json({ error: 'Erro ao sugerir clips' });
  }
});

// Download video from URL
app.post('/api/download-video', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL é obrigatória' });

    const platform = detectPlatform(url);
    if (!platform) return res.status(400).json({ error: 'URL não reconhecida. Use YouTube, TikTok ou Instagram.' });

    console.log(`  ⬇️ Baixando vídeo de ${platform}: ${url}`);
    const result = await downloadVideo(url);
    console.log(`  ✅ Download concluído: ${result.filename} (${(result.size / 1024 / 1024).toFixed(1)}MB)`);

    // Stream the file to the client
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', result.size);
    res.setHeader('X-Video-Title', encodeURIComponent(result.title));
    res.setHeader('X-Video-Duration', String(result.duration));
    res.setHeader('X-Video-Filename', encodeURIComponent(result.filename));
    res.setHeader('X-Video-Platform', result.platform);
    res.setHeader('Access-Control-Expose-Headers', 'X-Video-Title, X-Video-Duration, X-Video-Filename, X-Video-Platform');

    const readStream = fs.createReadStream(result.filePath);
    readStream.pipe(res);
    readStream.on('end', () => cleanupTempFile(result.filePath));
    readStream.on('error', () => cleanupTempFile(result.filePath));
  } catch (e) {
    console.error('Download error:', e.message);
    res.status(400).json({ error: e.message });
  }
});

// Direct Download (forces browser native download dialog without blob)
app.get('/api/download-direct', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).send('URL é obrigatória');

    const platform = detectPlatform(url);
    if (!platform) return res.status(400).send('URL não reconhecida.');

    console.log(`  ⬇️ Download Direto de ${platform}: ${url}`);
    const result = await downloadVideo(url);
    
    // Force attachment download
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.filename)}"`);
    res.setHeader('Content-Length', result.size);

    const readStream = fs.createReadStream(result.filePath);
    readStream.pipe(res);
    readStream.on('end', () => cleanupTempFile(result.filePath));
    readStream.on('error', () => cleanupTempFile(result.filePath));
  } catch (e) {
    console.error('Direct download error:', e.message);
    res.status(400).send(e.message);
  }
});

// ====== Production: serve React frontend ======
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '..', 'dist');

if (fs.existsSync(distPath)) {
  // Serve static files with proper headers
  app.use(express.static(distPath, {
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    },
  }));

  // SPA fallback — all non-API routes return index.html
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });

  console.log('  📦 Serving frontend from /dist');
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 ViralLab API running on http://localhost:${PORT}`);
  console.log(`   YouTube API: ${process.env.YOUTUBE_API_KEY ? '✅' : '❌'}`);
  console.log(`   Gemini API: ${process.env.GEMINI_API_KEY ? '✅' : '⚠️ Mock mode'}`);
});

