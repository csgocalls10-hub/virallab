const tagColors = {
  'Curiosidade': { bg: 'rgba(0,212,255,0.15)', color: '#00d4ff' },
  'Surpresa': { bg: 'rgba(255,107,0,0.15)', color: '#ff6b00' },
  'Identificação': { bg: 'rgba(168,85,247,0.15)', color: '#a855f7' },
  'FOMO': { bg: 'rgba(255,61,87,0.15)', color: '#ff3d57' },
  'Nostalgia': { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
  'Inspiração': { bg: 'rgba(0,230,118,0.15)', color: '#00e676' },
  'Humor': { bg: 'rgba(255,149,0,0.15)', color: '#ff9500' },
  'Raiva': { bg: 'rgba(255,61,87,0.15)', color: '#ff3d57' },
  'Empatia': { bg: 'rgba(168,85,247,0.15)', color: '#a855f7' },
  'Urgência': { bg: 'rgba(255,107,0,0.15)', color: '#ff6b00' },
}

export default function EmotionalTags({ hooks }) {
  if (!hooks || !hooks.length) return null
  return (
    <div className="section-card">
      <h3>🎭 Gatilhos Emocionais</h3>
      <div className="tags-container">
        {hooks.map((hook, i) => {
          const c = tagColors[hook] || { bg: 'rgba(144,144,168,0.15)', color: '#9090a8' }
          return (
            <span key={i} className="emotion-tag" style={{ background: c.bg, color: c.color, animationDelay: `${i * 0.1}s` }}>
              {hook}
            </span>
          )
        })}
      </div>
    </div>
  )
}
