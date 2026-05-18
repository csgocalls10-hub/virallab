import { useRef, useState } from 'react';

export default function VideoUploader({ onVideoSelect }) {
  const fileRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');

  const MAX_SIZE = 500 * 1024 * 1024; // 500MB
  const ACCEPTED = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];

  function handleFile(file) {
    setError('');
    if (!file) return;

    if (!ACCEPTED.includes(file.type) && !file.name.match(/\.(mp4|webm|mov|avi)$/i)) {
      setError('Formato não suportado. Use MP4, WebM ou MOV.');
      return;
    }

    if (file.size > MAX_SIZE) {
      setError(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(0)}MB). Máximo: 500MB.`);
      return;
    }

    // Get video duration
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      onVideoSelect({
        file,
        url,
        name: file.name,
        size: file.size,
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      });
      URL.revokeObjectURL(url); // Clean up after metadata loaded
    };
    video.onerror = () => {
      setError('Não foi possível ler o vídeo. Tente outro arquivo.');
      URL.revokeObjectURL(url);
    };
    video.src = url;
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }

  function onDragOver(e) {
    e.preventDefault();
    setDragOver(true);
  }

  return (
    <div className="upload-section">
      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files[0])}
        />
        <div className="upload-icon">📁</div>
        <h3>Arraste seu vídeo aqui</h3>
        <p>ou clique para selecionar</p>
        <span className="upload-hint">MP4, WebM, MOV • Máximo 500MB</span>
      </div>
      {error && <div className="error-msg">⚠️ {error}</div>}
    </div>
  );
}
