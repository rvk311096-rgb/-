import { HARMONIES } from '../utils/colorTheory.js'
import './HarmonySelector.css'

const COUNT_OPTIONS = [2, 3, 4, 5, 6]

export default function HarmonySelector({ selected, onChange, colorCount, onCountChange }) {
  return (
    <div className="harmony-selector card">
      {/* Color count */}
      <div className="section-label">Colors in Palette</div>
      <div className="count-grid">
        {COUNT_OPTIONS.map(n => (
          <button
            key={n}
            className={`count-btn ${colorCount === n ? 'active' : ''}`}
            onClick={() => onCountChange(n)}
          >
            {n}
          </button>
        ))}
      </div>

      <div className="harmony-divider" />

      {/* Harmony type */}
      <div className="section-label">Color Harmony</div>
      <div className="harmony-list">
        {HARMONIES.map(h => (
          <button
            key={h.id}
            className={`harmony-item ${selected === h.id ? 'active' : ''}`}
            onClick={() => onChange(h.id)}
          >
            <span className="harmony-icon">{h.icon}</span>
            <div className="harmony-text">
              <span className="harmony-name">{h.nameRu}</span>
              <span className="harmony-name-en">{h.name}</span>
            </div>
            {selected === h.id && <div className="harmony-active-dot" />}
          </button>
        ))}
      </div>

      {/* Description of selected */}
      {(() => {
        const h = HARMONIES.find(h => h.id === selected)
        return h ? (
          <div className="harmony-desc">
            <p>{h.description}</p>
          </div>
        ) : null
      })()}
    </div>
  )
}
