const platformColors = {
  TikTok: { bg: 'rgba(255,0,80,0.1)', border: '#ff0050', icon: '🎵' },
  'Instagram Reels': { bg: 'rgba(225,48,108,0.1)', border: '#e1306c', icon: '📸' },
  'YouTube Shorts': { bg: 'rgba(255,0,0,0.1)', border: '#ff0000', icon: '▶️' },
  'X/Twitter': { bg: 'rgba(29,155,240,0.1)', border: '#1d9bf0', icon: '𝕏' },
  LinkedIn: { bg: 'rgba(0,119,181,0.1)', border: '#0077b5', icon: '💼' },
}

export default function PlatformCard({ adaptation }) {
  const p = platformColors[adaptation.platform] || { bg: 'rgba(255,107,0,0.1)', border: '#ff6b00', icon: '📱' }

  return (
    <div className="platform-adapt-card">
      <div className="platform-adapt-header" style={{ background: p.bg }}>
        <div className="platform-icon" style={{ background: p.bg, border: `1px solid ${p.border}`, color: p.border }}>
          {p.icon}
        </div>
        <h4>{adaptation.platform}</h4>
      </div>
      <div className="platform-adapt-body">
        <div className="adapt-row">
          <span className="adapt-label">Duração</span>
          <span className="adapt-value">{adaptation.duration}</span>
        </div>
        <div className="adapt-row">
          <span className="adapt-label">Formato</span>
          <span className="adapt-value">{adaptation.format}</span>
        </div>
        <div className="adapt-row">
          <span className="adapt-label">Melhor Horário</span>
          <span className="adapt-value">{adaptation.bestTime}</span>
        </div>
        <div className="adapt-row">
          <span className="adapt-label">Hashtags</span>
          <div className="adapt-hashtags">
            {(adaptation.hashtags || []).map((h, i) => <span key={i}>{h}</span>)}
          </div>
        </div>
        <div className="adapt-strategy">
          <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>Estratégia:</strong>
          {adaptation.strategy}
        </div>
      </div>
    </div>
  )
}
