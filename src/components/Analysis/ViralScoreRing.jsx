import { useEffect, useRef } from 'react'

export default function ViralScoreRing({ score = 0, size = 160 }) {
  const circleRef = useRef(null)
  const numberRef = useRef(null)
  const radius = (size - 16) / 2
  const circumference = 2 * Math.PI * radius

  useEffect(() => {
    const offset = circumference - (score / 100) * circumference
    if (circleRef.current) {
      circleRef.current.style.strokeDashoffset = circumference
      setTimeout(() => {
        circleRef.current.style.transition = 'stroke-dashoffset 1.5s ease-out'
        circleRef.current.style.strokeDashoffset = offset
      }, 100)
    }
    if (numberRef.current) {
      let current = 0
      const step = score / 40
      const interval = setInterval(() => {
        current += step
        if (current >= score) { current = score; clearInterval(interval) }
        numberRef.current.textContent = Math.round(current)
      }, 25)
      return () => clearInterval(interval)
    }
  }, [score, circumference])

  const getColor = () => {
    if (score >= 80) return '#00e676'
    if (score >= 60) return '#ff9500'
    if (score >= 40) return '#fbbf24'
    return '#ff3d57'
  }

  const getGlow = () => {
    if (score >= 80) return 'rgba(0,230,118,0.3)'
    if (score >= 60) return 'rgba(255,149,0,0.3)'
    return 'rgba(255,61,87,0.3)'
  }

  return (
    <div className="score-ring-container" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size/2} cy={size/2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8"
        />
        <circle
          ref={circleRef}
          cx={size/2} cy={size/2} r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ filter: `drop-shadow(0 0 8px ${getGlow()})` }}
        />
        <text
          ref={numberRef}
          x="50%" y="46%"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize={size * 0.25}
          fontWeight="800"
          fontFamily="Inter"
        >
          0
        </text>
        <text
          x="50%" y="63%"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="rgba(255,255,255,0.4)"
          fontSize="12"
          fontWeight="600"
          fontFamily="Inter"
        >
          VIRAL SCORE
        </text>
      </svg>
    </div>
  )
}
