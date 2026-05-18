export default function ExportProgress({ stage, progress, outputUrl, outputFilename }) {
  if (!stage && !outputUrl) return null;

  return (
    <div className="export-progress">
      {outputUrl ? (
        <div className="export-done">
          <div className="export-done-icon">✅</div>
          <h3>Clip pronto!</h3>
          <p>Seu vídeo foi recortado e adaptado com sucesso.</p>
          <div className="export-actions">
            <a href={outputUrl} download={outputFilename} className="btn-primary download-btn">
              ⬇️ Baixar Clip
            </a>
            <a href={outputUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">
              ▶️ Visualizar
            </a>
          </div>
        </div>
      ) : (
        <div className="export-processing">
          <div className="progress-stage">{stage}</div>
          <div className="progress-bar-container">
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="progress-pct">{progress}%</span>
          </div>
          <p className="progress-tip">⏳ O vídeo está sendo processado no seu navegador. Não feche a aba.</p>
        </div>
      )}
    </div>
  );
}
