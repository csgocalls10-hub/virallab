const elementIcons = ['⚡', '🎬', '🎯', '🔥', '✨', '💡', '🎭', '📌', '🚀', '💥']
const elementColors = [
  'rgba(255,107,0,0.15)', 'rgba(0,212,255,0.15)', 'rgba(0,230,118,0.15)',
  'rgba(255,61,87,0.15)', 'rgba(168,85,247,0.15)', 'rgba(251,191,36,0.15)',
]

export default function ViralElements({ elements }) {
  if (!elements || !elements.length) return null
  return (
    <div className="section-card">
      <h3>🧬 Elementos Virais Identificados</h3>
      <div className="elements-list">
        {elements.map((el, i) => (
          <div className="element-item" key={i} style={{ animationDelay: `${i * 0.08}s` }}>
            <div className="element-icon" style={{ background: elementColors[i % elementColors.length] }}>
              {elementIcons[i % elementIcons.length]}
            </div>
            <span>{el}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
