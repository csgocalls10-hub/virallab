import { useState, useRef, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

const PLATFORM_SPECS = {
  TikTok:          { width: 1080, height: 1920, maxDuration: 60,  ratio: '9:16' },
  'Instagram Reels': { width: 1080, height: 1920, maxDuration: 90,  ratio: '9:16' },
  'YouTube Shorts':  { width: 1080, height: 1920, maxDuration: 60,  ratio: '9:16' },
  'X/Twitter':       { width: 1920, height: 1080, maxDuration: 140, ratio: '16:9' },
  'LinkedIn':        { width: 1080, height: 1080, maxDuration: 600, ratio: '1:1' },
};

export { PLATFORM_SPECS };

export default function useFFmpeg() {
  const ffmpegRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    if (loaded || loading) return;
    setLoading(true);
    setStage('Carregando FFmpeg...');

    try {
      const ffmpeg = new FFmpeg();
      ffmpegRef.current = ffmpeg;

      ffmpeg.on('progress', ({ progress: p }) => {
        setProgress(Math.round(p * 100));
      });

      ffmpeg.on('log', ({ message }) => {
        console.log('[FFmpeg]', message);
      });

      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      setLoaded(true);
      setStage('');
    } catch (err) {
      console.error('FFmpeg load error:', err);
      setStage('Erro ao carregar FFmpeg');
    } finally {
      setLoading(false);
    }
  }, [loaded, loading]);

  const processClip = useCallback(async (file, { startTime, endTime, platform }) => {
    const ffmpeg = ffmpegRef.current;
    if (!ffmpeg || !loaded) {
      throw new Error('FFmpeg não carregado');
    }

    setProcessing(true);
    setProgress(0);

    try {
      const specs = PLATFORM_SPECS[platform];
      if (!specs) throw new Error(`Plataforma desconhecida: ${platform}`);

      // Write input file
      setStage('Preparando vídeo...');
      const inputData = await fetchFile(file);
      await ffmpeg.writeFile('input.mp4', inputData);

      // Calculate duration
      const duration = endTime - startTime;
      const clampedDuration = Math.min(duration, specs.maxDuration);
      const clampedEnd = startTime + clampedDuration;

      // Build FFmpeg command
      const args = [
        '-i', 'input.mp4',
        '-ss', String(startTime),
        '-to', String(clampedEnd),
      ];

      // Add crop/scale filter based on platform aspect ratio
      if (specs.ratio === '9:16') {
        // Vertical: crop center then scale
        args.push('-vf', `crop=ih*9/16:ih,scale=${specs.width}:${specs.height}`);
      } else if (specs.ratio === '1:1') {
        // Square: crop center
        args.push('-vf', `crop=min(iw\\,ih):min(iw\\,ih),scale=${specs.width}:${specs.height}`);
      } else {
        // 16:9 horizontal: crop then scale
        args.push('-vf', `crop=iw:iw*9/16,scale=${specs.width}:${specs.height}`);
      }

      args.push(
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-y',
        'output.mp4'
      );

      setStage('Cortando e adaptando...');
      await ffmpeg.exec(args);

      setStage('Finalizando...');
      const outputData = await ffmpeg.readFile('output.mp4');
      const blob = new Blob([outputData.buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);

      // Cleanup
      await ffmpeg.deleteFile('input.mp4');
      await ffmpeg.deleteFile('output.mp4');

      setStage('Pronto!');
      setProgress(100);

      return { url, blob, filename: `clip_${platform.replace(/[\/\s]/g, '_')}_${Date.now()}.mp4` };
    } catch (err) {
      console.error('FFmpeg process error:', err);
      setStage('Erro no processamento');
      throw err;
    } finally {
      setProcessing(false);
    }
  }, [loaded]);

  return { load, loaded, loading, progress, stage, processing, processClip };
}
