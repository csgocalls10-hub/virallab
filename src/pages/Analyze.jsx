import { useState } from 'react'
import ViralScoreRing from '../components/Analysis/ViralScoreRing'
import MetricsGrid from '../components/Analysis/MetricsGrid'
import PlatformCard from '../components/Analysis/PlatformCard'
import EmotionalTags from '../components/Analysis/EmotionalTags'
import ViralElements from '../components/Analysis/ViralElements'
import { fetchYouTubeMetadata, analyzeVideo, generateScript, formatNumber, formatDuration, extractVideoId } from '../lib/api'

const PLATFORMS = ['TikTok', 'Instagram Reels', 'YouTube Shorts', 'X/Twitter', 'LinkedIn']

function getViralLevelClass(level) {
  if (!level) return 'medium'
  const l = level.toLowerCase()
  if (l.includes('explos')) return 'explosive'
  if (l.includes('alt')) return 'high'
  if (l.includes('baix')) return 'low'
  return 'medium'
}

export default function Analyze() {
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState(['TikTok', 'Instagram Reels', 'YouTube Shorts'])
  const [videoMeta, setVideoMeta] = useState(null)
  const [fetchingMeta, setFetchingMeta] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [scriptData, setScriptData] = useState(null)
  const [generatingScript, setGeneratingScript] = useState(false)
  const [error, setError] = useState('')

  const handleFetchMeta = async () => {
    if (!url.trim()) return
    setFetchingMeta(true)
    setError('')
    try {
      const data = await fetchYouTubeMetadata(url)
      setVideoMeta(data)
    } catch (e) {
      setError('Não foi possível buscar os metadados. Verifique a URL.')
    }
    setFetchingMeta(false)
  }

  const handleUrlChange = (e) => {
    const val = e.target.value
    setUrl(val)
    if (extractVideoId(val)) {
      setTimeout(() => handleFetchMetaFromUrl(val), 500)
    }
  }

  const handleFetchMetaFromUrl = async (videoUrl) => {
    if (!videoUrl.trim()) return
    setFetchingMeta(true)
    setError('')
    try {
      const data = await fetchYouTubeMetadata(videoUrl)
      setVideoMeta(data)
    } catch (e) { /* silent */ }
    setFetchingMeta(false)
  }

  const togglePlatform = (p) => {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    )
  }

  const handleAnalyze = async () => {
    if (!url.trim()) return
    if (selectedPlatforms.length === 0) { setError('Selecione pelo menos uma plataforma'); return }
    setAnalyzing(true)
    setError('')
    setResult(null)
    setScriptData(null)
    try {
      const data = await analyzeVideo({
        url,
        description,
        platforms: selectedPlatforms,
        videoMeta,
      })
      setResult(data)
      // Save to localStorage history
      const history = JSON.parse(localStorage.getItem('virallab_history') || '[]')
      history.unshift({
        id: Date.now(),
        url,
        title: videoMeta?.title || url,
        thumbnail: videoMeta?.thumbnail || '',
        score: data.viralScore,
        level: data.viralLevel,
        date: new Date().toISOString(),
        result: data,
        videoMeta,
      })
      localStorage.setItem('virallab_history', JSON.stringify(history.slice(0, 50)))
    } catch (e) {
      setError('Erro na análise. Verifique se o servidor backend está rodando.')
    }
    setAnalyzing(false)
  }

  const handleGenerateScript = async () => {
    setGeneratingScript(true)
    try {
      const data = await generateScript({
        url,
        description,
        videoMeta,
        analysisResult: result,
      })
      setScriptData(data)
    } catch (e) {
      setError('Erro ao gerar roteiro.')
    }
    setGeneratingScript(false)
  }

  return (
    <div>
      <div className="page-header">
        <h2>🔬 Analisar Vídeo</h2>
        <p>Cole a URL de um vídeo viral e descubra por que ele viralizou</p>
      </div>

      <div className="input-section">
        <div className="input-group">
          <label>URL do Vídeo</label>
          <div className="input-url-wrapper">
            <input
              type="url"
              placeholder="https://youtube.com/watch?v=... ou TikTok, Instagram..."
              value={url}
              onChange={handleUrlChange}
            />
            <button className="btn-fetch" onClick={handleFetchMeta} disabled={fetchingMeta}>
              {fetchingMeta ? '⏳ Buscando...' : '🔍 Buscar'}
            </button>
          </div>
        </div>

        {videoMeta && (
          <div className="video-preview">
            {videoMeta.thumbnail && <img src={videoMeta.thumbnail} alt={videoMeta.title} />}
            <div className="video-preview-info">
              <h4>{videoMeta.title}</h4>
              <div className="video-meta">
                <span>👁️ <strong>{formatNumber(videoMeta.viewCount)}</strong> views</span>
                <span>👍 <strong>{formatNumber(videoMeta.likeCount)}</strong> likes</span>
                <span>💬 <strong>{formatNumber(videoMeta.commentCount)}</strong> comentários</span>
                <span>⏱️ <strong>{formatDuration(videoMeta.duration)}</strong></span>
                <span>📺 <strong>{videoMeta.channelTitle}</strong></span>
              </div>
            </div>
          </div>
        )}

        <div className="input-group">
          <label>Contexto / Descrição (opcional)</label>
          <textarea
            placeholder="Descreva o conteúdo do vídeo, o que acontece, por que você acha que viralizou..."
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        <div className="input-group">
          <label>Plataformas de Destino</label>
          <div className="platform-selector">
            {PLATFORMS.map(p => (
              <button
                key={p}
                className={`platform-chip ${selectedPlatforms.includes(p) ? 'selected' : ''}`}
                onClick={() => togglePlatform(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p style={{ color: 'var(--accent-red)', fontSize: 13, marginBottom: 16 }}>⚠️ {error}</p>
        )}

        <button className="btn-primary" onClick={handleAnalyze} disabled={analyzing || !url.trim()}>
          {analyzing ? '⏳ Analisando...' : '🚀 Analisar Vídeo'}
        </button>
      </div>

      {analyzing && (
        <div className="loading-container">
          <div className="loading-spinner" />
          <p className="loading-text">Analisando elementos virais com IA...</p>
        </div>
      )}

      {result && !analyzing && (
        <div className="results-section">
          <div className="results-header">
            <h2>📊 Resultado da Análise</h2>
            <button className="btn-secondary" onClick={handleGenerateScript} disabled={generatingScript}>
              {generatingScript ? '⏳ Gerando...' : '📝 Gerar Roteiro'}
            </button>
          </div>

          <div className="score-hero">
            <ViralScoreRing score={result.viralScore} />
            <div className="score-info">
              <span className={`viral-level ${getViralLevelClass(result.viralLevel)}`}>
                {result.viralLevel}
              </span>
              <p className="viral-reason">{result.viralReason}</p>
            </div>
          </div>

          <MetricsGrid metrics={result.metrics} />
          <ViralElements elements={result.viralElements} />
          <EmotionalTags hooks={result.emotionalHooks} />

          {result.platformAdaptations && result.platformAdaptations.length > 0 && (
            <>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
                🎯 Adaptação por Plataforma
              </h3>
              <div className="platforms-grid">
                {result.platformAdaptations.map((a, i) => (
                  <PlatformCard key={i} adaptation={a} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {scriptData && (
        <div className="script-container" style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>📝 Roteiro de Edição</h3>
          <div className="script-timeline">
            {(scriptData.segments || []).map((seg, i) => (
              <div className="script-segment" key={i}>
                <div className="segment-time">{seg.time}</div>
                <h4>{seg.title}</h4>
                <p>{seg.description}</p>
              </div>
            ))}
          </div>
          {scriptData.soundtrack && (
            <div style={{ marginTop: 20, padding: 16, background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
              <strong>🎵 Trilha Sonora Sugerida:</strong>
              <span style={{ color: 'var(--text-secondary)', marginLeft: 8 }}>{scriptData.soundtrack}</span>
            </div>
          )}
          {scriptData.editingPace && (
            <div style={{ marginTop: 12, padding: 16, background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
              <strong>⚡ Ritmo de Edição:</strong>
              <span style={{ color: 'var(--text-secondary)', marginLeft: 8 }}>{scriptData.editingPace}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
