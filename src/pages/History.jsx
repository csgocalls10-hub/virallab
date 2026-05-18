import { useState, useEffect } from 'react'
import ViralScoreRing from '../components/Analysis/ViralScoreRing'
import MetricsGrid from '../components/Analysis/MetricsGrid'
import PlatformCard from '../components/Analysis/PlatformCard'
import EmotionalTags from '../components/Analysis/EmotionalTags'
import ViralElements from '../components/Analysis/ViralElements'

export default function History() {
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('virallab_history') || '[]')
    setItems(data)
  }, [])

  const handleDelete = (id) => {
    const updated = items.filter(i => i.id !== id)
    setItems(updated)
    localStorage.setItem('virallab_history', JSON.stringify(updated))
    if (selected?.id === id) setSelected(null)
  }

  if (selected) {
    const r = selected.result
    return (
      <div>
        <div className="page-header">
          <button className="btn-ghost" onClick={() => setSelected(null)}>← Voltar ao Histórico</button>
          <h2 style={{ marginTop: 12 }}>{selected.title}</h2>
          <p>{new Date(selected.date).toLocaleDateString('pt-BR')}</p>
        </div>
        {r && (
          <div className="results-section">
            <div className="score-hero">
              <ViralScoreRing score={r.viralScore} />
              <div className="score-info">
                <span className={`viral-level ${r.viralLevel?.toLowerCase().includes('explos') ? 'explosive' : 'high'}`}>
                  {r.viralLevel}
                </span>
                <p className="viral-reason">{r.viralReason}</p>
              </div>
            </div>
            <MetricsGrid metrics={r.metrics} />
            <ViralElements elements={r.viralElements} />
            <EmotionalTags hooks={r.emotionalHooks} />
            {r.platformAdaptations?.length > 0 && (
              <div className="platforms-grid">
                {r.platformAdaptations.map((a, i) => <PlatformCard key={i} adaptation={a} />)}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h2>📊 Histórico de Análises</h2>
        <p>Suas análises anteriores salvas localmente</p>
      </div>
      {items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>Nenhuma análise ainda</h3>
          <p>Analise seu primeiro vídeo viral para ele aparecer aqui</p>
        </div>
      ) : (
        <div className="history-grid">
          {items.map(item => (
            <div key={item.id} className="history-card" onClick={() => setSelected(item)}>
              {item.thumbnail && <img src={item.thumbnail} alt={item.title} />}
              <div className="history-card-body">
                <h4>{item.title}</h4>
                <div className="history-card-footer">
                  <span className="history-score">{item.score}</span>
                  <span className="history-date">{new Date(item.date).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
