import { Shuffle } from 'lucide-react'
import './Header.css'

export default function Header({ onRandom }) {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-brand">
          <div className="brand-logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="16" fill="#1f1f2a"/>
              <path d="M16 4 A12 12 0 0 1 28 16 L16 16 Z" fill="#4D96FF" opacity="0.9"/>
              <path d="M28 16 A12 12 0 0 1 16 28 L16 16 Z" fill="#6BCB77" opacity="0.9"/>
              <path d="M16 28 A12 12 0 0 1 4 16 L16 16 Z" fill="#F8B500" opacity="0.9"/>
              <path d="M4 16 A12 12 0 0 1 16 4 L16 16 Z" fill="#FF6B9D" opacity="0.9"/>
              <circle cx="16" cy="16" r="5" fill="#0a0a0f"/>
            </svg>
          </div>
          <div>
            <div className="brand-name">CHROMIA</div>
            <div className="brand-tagline">Color Palette Studio</div>
          </div>
        </div>

        <nav className="header-nav">
          <span className="nav-badge">Pantone® Referenced</span>
          <span className="nav-badge nav-badge-trend">2026 Trends</span>
        </nav>

        <div className="header-actions">
          <button className="btn btn-primary" onClick={onRandom}>
            <Shuffle size={16} />
            Random Palette
          </button>
        </div>
      </div>
    </header>
  )
}
