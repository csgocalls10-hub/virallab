import { useState, useRef } from 'react';
import VideoUploader from '../components/Editor/VideoUploader';
import ClipTimeline from '../components/Editor/ClipTimeline';
import PlatformPresets from '../components/Editor/PlatformPresets';
import ExportProgress from '../components/Editor/ExportProgress';
import useFFmpeg from '../lib/useFFmpeg';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001');

export default function ClipEditor() {
  const [inputMode, setInputMode] = useState('url'); // 'url' or 'file'
  const [videoUrl, setVideoUrl] = useState('');
  const [video, setVideo] = useState(null);
  const [videoSrc, setVideoSrc] = useState('');
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(30);
  const [platform, setPlatform] = useState('TikTok');
  const [clips, setClips] = useState([]);
  const [loadingClips, setLoadingClips] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState('');
  const [outputUrl, setOutputUrl] = useState(null);
  const [outputFilename, setOutputFilename] = useState('');
  const [error, setError] = useState('');
  const videoRef = useRef(null);

  const { load, loaded, loading: ffmpegLoading, progress, stage, processing, processClip } = useFFmpeg();

  // Handle file upload
  function handleVideoSelect(videoData) {
    setVideo(videoData);
    setVideoSrc(URL.createObjectURL(videoData.file));
    setStartTime(0);
    setEndTime(Math.min(videoData.duration, 30));
    setClips([]);
    setOutputUrl(null);
    setError('');
  }

  // Handle URL download
  async function handleUrlDownload() {
    if (!videoUrl.trim()) return;
    setError('');
    setDownloading(true);
    setDownloadProgress('Conectando ao servidor...');

    try {
      const res = await fetch(`${API_URL}/api/download-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: videoUrl.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao baixar vídeo');
      }

      setDownloadProgress('Baixando vídeo...');

      const blob = await res.blob();
      const title = decodeURIComponent(res.headers.get('X-Video-Title') || 'video');
      const duration = parseInt(res.headers.get('X-Video-Duration') || '0');
      const filename = decodeURIComponent(res.headers.get('X-Video-Filename') || 'video.mp4');
      const videoPlatform = res.headers.get('X-Video-Platform') || '';

      const file = new File([blob], filename, { type: 'video/mp4' });
      const src = URL.createObjectURL(blob);

      // Get actual video dimensions
      const videoEl = document.createElement('video');
      videoEl.preload = 'metadata';
      videoEl.onloadedmetadata = () => {
        const videoData = {
          file,
          url: src,
          name: filename,
          title,
          size: blob.size,
          duration: duration || videoEl.duration,
          width: videoEl.videoWidth,
          height: videoEl.videoHeight,
          platform: videoPlatform,
        };

        setVideo(videoData);
        setVideoSrc(src);
        setStartTime(0);
        setEndTime(Math.min(videoData.duration, 30));
        setClips([]);
        setOutputUrl(null);
        setDownloading(false);
        setDownloadProgress('');
      };
      videoEl.onerror = () => {
        // Fallback without dimensions
        const videoData = {
          file,
          url: src,
          name: filename,
          title,
          size: blob.size,
          duration: duration || 0,
          width: 0,
          height: 0,
          platform: videoPlatform,
        };
        setVideo(videoData);
        setVideoSrc(src);
        setStartTime(0);
        setEndTime(Math.min(duration || 30, 30));
        setDownloading(false);
        setDownloadProgress('');
      };
      videoEl.src = src;

    } catch (e) {
      console.error('Download error:', e);
      setError(e.message);
      setDownloading(false);
      setDownloadProgress('');
    }
  }

  // Ask AI for clip suggestions
  async function suggestClips() {
    if (!video) return;
    setLoadingClips(true);
    try {
      const res = await fetch(`${API_URL}/api/suggest-clips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration: video.duration,
          filename: video.name,
          platform,
        }),
      });
      if (!res.ok) throw new Error('Erro na sugestão');
      const data = await res.json();
      setClips(data.clips || []);
    } catch (e) {
      console.error('Clip suggestion error:', e);
      const dur = video.duration;
      const mockClips = [
        { start: 0, end: Math.min(15, dur), title: '🎯 Gancho Inicial', description: 'Primeiros segundos — use como abertura impactante' },
        { start: Math.floor(dur * 0.3), end: Math.floor(dur * 0.3) + 20, title: '⚡ Momento Alto', description: 'Trecho com maior energia ou impacto visual' },
        { start: Math.floor(dur * 0.6), end: Math.floor(dur * 0.6) + 15, title: '💥 Clímax', description: 'Ponto alto do vídeo — revelação ou surpresa' },
      ].filter(c => c.end <= dur);
      setClips(mockClips);
    } finally {
      setLoadingClips(false);
    }
  }

  function handleClipSelect(clip) {
    setStartTime(clip.start);
    setEndTime(clip.end);
    if (videoRef.current) {
      videoRef.current.currentTime = clip.start;
    }
  }

  async function handleExport() {
    if (!video || !platform) return;
    setError('');
    setOutputUrl(null);

    try {
      if (!loaded) await load();

      const result = await processClip(video.file, {
        startTime,
        endTime,
        platform,
      });

      setOutputUrl(result.url);
      setOutputFilename(result.filename);
    } catch (e) {
      console.error('Export error:', e);
      setError(`Erro ao processar: ${e.message}`);
    }
  }

  function resetEditor() {
    setVideo(null);
    setVideoSrc('');
    setVideoUrl('');
    setClips([]);
    setOutputUrl(null);
    setError('');
  }

  function formatSize(bytes) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  return (
    <div className="clip-editor-page">
      <div className="page-header">
        <h2>✂️ Recortar Vídeo</h2>
        <p>Cole uma URL ou faça upload, escolha os melhores momentos e exporte para cada plataforma</p>
      </div>

      {!video ? (
        <div className="input-mode-section">
          {/* Tab Switcher */}
          <div className="mode-tabs">
            <button
              className={`mode-tab ${inputMode === 'url' ? 'active' : ''}`}
              onClick={() => setInputMode('url')}
            >
              🔗 Colar URL
            </button>
            <button
              className={`mode-tab ${inputMode === 'file' ? 'active' : ''}`}
              onClick={() => setInputMode('file')}
            >
              📁 Upload de Arquivo
            </button>
          </div>

          {inputMode === 'url' ? (
            <div className="url-input-section">
              <div className="url-input-card">
                <div className="input-group">
                  <label>URL do vídeo</label>
                  <div className="input-url-wrapper">
                    <input
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=... ou link do TikTok/Instagram"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUrlDownload()}
                      disabled={downloading}
                    />
                    <button
                      className="btn-fetch"
                      onClick={handleUrlDownload}
                      disabled={downloading || !videoUrl.trim()}
                    >
                      {downloading ? '⏳ Baixando...' : '⬇️ Baixar'}
                    </button>
                  </div>
                </div>

                <div className="supported-platforms">
                  <span className="platform-badge yt">▶️ YouTube</span>
                  <span className="platform-badge tt">🎵 TikTok</span>
                  <span className="platform-badge ig">📸 Instagram</span>
                </div>

                {downloading && (
                  <div className="download-status">
                    <div className="loading-spinner small" />
                    <span>{downloadProgress}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <VideoUploader onVideoSelect={handleVideoSelect} />
          )}

          {error && <div className="error-msg">⚠️ {error}</div>}
        </div>
      ) : (
        <div className="editor-workspace">
          {/* Video Preview */}
          <div className="editor-preview-section">
            <div className="video-preview-card">
              <video
                ref={videoRef}
                src={videoSrc}
                controls
                controlsList="nodownload"
                className="video-player"
              />
              <div className="video-info-bar">
                <span>📁 {video.title || video.name}</span>
                <span>⏱️ {formatTime(video.duration)}</span>
                {video.width > 0 && <span>📐 {video.width}×{video.height}</span>}
                <span>💾 {formatSize(video.size)}</span>
                {video.platform && <span className="platform-badge-small">🌐 {video.platform}</span>}
              </div>
            </div>

            <div className="video-actions-row" style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button className="btn-secondary change-video-btn" onClick={resetEditor}>
                🔄 Trocar vídeo
              </button>
              {videoSrc.startsWith('blob:') && (
                <button 
                  onClick={async () => {
                    const safeName = (video?.name || 'video_original').endsWith('.mp4') 
                      ? (video?.name || 'video_original') 
                      : `${video?.name || 'video_original'}.mp4`;

                    // No mobile, tentar usar o Share nativo (Salvar na galeria)
                    if (navigator.share && video?.file) {
                      try {
                        const fileToShare = new File([video.file], safeName, { type: 'video/mp4' });
                        if (navigator.canShare && navigator.canShare({ files: [fileToShare] })) {
                          await navigator.share({
                            files: [fileToShare],
                            title: 'Salvar Vídeo'
                          });
                          return;
                        }
                      } catch (err) {
                        console.log('Share API abortada ou não suportada, tentando fallback...');
                      }
                    }

                    // Fallback normal de download (PC/Android)
                    const a = document.createElement('a');
                    a.href = videoSrc;
                    a.download = safeName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  ⬇️ Salvar Vídeo Original
                </button>
              )}
            </div>
          </div>

          {/* AI Clip Suggestions */}
          <div className="ai-suggestions-section">
            <div className="section-header-row">
              <h3 className="section-label">🤖 Sugestões da IA</h3>
              <button
                className="btn-small"
                onClick={suggestClips}
                disabled={loadingClips}
              >
                {loadingClips ? '⏳ Analisando...' : '✨ Sugerir Clips'}
              </button>
            </div>

            {clips.length > 0 && (
              <div className="clip-suggestions-list">
                {clips.map((clip, i) => (
                  <div
                    key={i}
                    className="clip-suggestion-card"
                    onClick={() => handleClipSelect(clip)}
                  >
                    <div className="clip-card-time">
                      {formatTime(clip.start)} → {formatTime(clip.end)}
                    </div>
                    <div className="clip-card-info">
                      <strong>{clip.title}</strong>
                      <span>{clip.description}</span>
                    </div>
                    <button className="btn-tiny" onClick={(e) => { e.stopPropagation(); handleClipSelect(clip); }}>
                      Usar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timeline */}
          <ClipTimeline
            duration={video.duration}
            startTime={startTime}
            endTime={endTime}
            onRangeChange={(s, e) => { setStartTime(s); setEndTime(e); }}
            clips={clips}
            onClipSelect={handleClipSelect}
          />

          {/* Platform Selection */}
          <PlatformPresets selected={platform} onSelect={setPlatform} />

          {/* Export */}
          <div className="export-section">
            {error && <div className="error-msg">⚠️ {error}</div>}

            {(processing || stage) && !outputUrl && (
              <ExportProgress stage={stage} progress={progress} />
            )}

            {outputUrl && (
              <ExportProgress
                stage="Pronto!"
                progress={100}
                outputUrl={outputUrl}
                outputFilename={outputFilename}
              />
            )}

            {!processing && !outputUrl && (
              <button
                className="btn-primary export-btn"
                onClick={handleExport}
                disabled={processing || ffmpegLoading}
              >
                {ffmpegLoading ? '⏳ Carregando FFmpeg...' : `✂️ Recortar para ${platform}`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
