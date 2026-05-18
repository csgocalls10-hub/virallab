import { PLATFORM_SPECS } from '../../lib/useFFmpeg';

const platformMeta = {
  'TikTok':          { icon: '🎵', color: '#ff0050', desc: 'Vertical, curto e dinâmico' },
  'Instagram Reels': { icon: '📸', color: '#e1306c', desc: 'Vertical, até 90 segundos' },
  'YouTube Shorts':  { icon: '▶️', color: '#ff0000', desc: 'Vertical, até 60 segundos' },
  'X/Twitter':       { icon: '🐦', color: '#1da1f2', desc: 'Horizontal, até 2:20' },
  'LinkedIn':        { icon: '💼', color: '#0a66c2', desc: 'Quadrado ou horizontal' },
};

export default function PlatformPresets({ selected, onSelect }) {
  return (
    <div className="platform-presets">
      <h3 className="section-label">🎯 Plataforma de destino</h3>
      <div className="preset-grid">
        {Object.entries(PLATFORM_SPECS).map(([name, specs]) => {
          const meta = platformMeta[name];
          const isSelected = selected === name;
          return (
            <div
              key={name}
              className={`preset-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelect(name)}
              style={{
                '--platform-color': meta.color,
                borderColor: isSelected ? meta.color : undefined,
              }}
            >
              <div className="preset-icon">{meta.icon}</div>
              <div className="preset-info">
                <strong>{name}</strong>
                <span className="preset-specs">
                  {specs.ratio} • {specs.maxDuration < 120 ? `${specs.maxDuration}s` : `${Math.floor(specs.maxDuration / 60)}min`}
                </span>
                <span className="preset-desc">{meta.desc}</span>
              </div>
              <div className="preset-preview">
                <div className={`ratio-box ratio-${specs.ratio.replace(':', '-')}`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
