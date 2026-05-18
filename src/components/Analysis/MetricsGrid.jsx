export default function MetricsGrid({ metrics }) {
  if (!metrics) return null

  const items = [
    { label: 'Engajamento', value: metrics.engajamento || '—', color: 'orange', pct: parseInt(metrics.engajamento) || 0, barColor: '#ff6b00' },
    { label: 'Retenção', value: metrics.retencao || metrics['retenção'] || '—', color: 'cyan', pct: parseInt(metrics.retencao || metrics['retenção']) || 0, barColor: '#00d4ff' },
    { label: 'Compartilhamento', value: metrics.compartilhamento || '—', color: 'green', pct: metrics.compartilhamento === 'Muito alto' ? 95 : metrics.compartilhamento === 'Alto' ? 75 : 50, barColor: '#00e676' },
  ]

  return (
    <div className="metrics-grid">
      {items.map((item, i) => (
        <div className="metric-card" key={i} style={{ animationDelay: `${i * 0.1}s` }}>
          <div className="metric-label">{item.label}</div>
          <div className={`metric-value ${item.color}`}>{item.value}</div>
          <div className="metric-bar">
            <div
              className="metric-bar-fill"
              style={{ width: `${item.pct}%`, background: item.barColor }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
