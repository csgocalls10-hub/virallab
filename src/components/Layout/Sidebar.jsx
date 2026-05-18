import { NavLink } from 'react-router-dom'

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">🧬</div>
          <h1>ViralLab</h1>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" onClick={onClose} className={({ isActive }) => isActive ? 'active' : ''}>
            <span className="nav-icon">🔬</span>
            Analisar Vídeo
          </NavLink>
          <NavLink to="/clip" onClick={onClose} className={({ isActive }) => isActive ? 'active' : ''}>
            <span className="nav-icon">✂️</span>
            Recortar
          </NavLink>
          <NavLink to="/history" onClick={onClose} className={({ isActive }) => isActive ? 'active' : ''}>
            <span className="nav-icon">📊</span>
            Histórico
          </NavLink>
          <NavLink to="/compare" onClick={onClose} className={({ isActive }) => isActive ? 'active' : ''}>
            <span className="nav-icon">⚖️</span>
            Comparar
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          ViralLab v1.0 — Powered by AI
        </div>
      </aside>
    </>
  )
}
