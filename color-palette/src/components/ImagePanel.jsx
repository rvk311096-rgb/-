import { useState, useEffect, useCallback } from 'react'
import { X, ExternalLink, RefreshCw } from 'lucide-react'
import { hexToHSL } from '../utils/colorTheory.js'
import './ImagePanel.css'

// ─────────────────────────────────────────────────────────────────────────────
// Color → descriptive name for search
// ─────────────────────────────────────────────────────────────────────────────
function colorToSearchTerms(hex) {
  const { h, s, l } = hexToHSL(hex)

  // Lightness
  const lightness = l < 20 ? 'dark' : l > 80 ? 'light' : ''
  // Saturation
  const saturation = s < 20 ? 'muted' : s > 70 ? 'vivid' : ''

  // Hue bucket → color name
  let colorName = ''
  if (s < 12) {
    if (l < 25) colorName = 'black'
    else if (l > 75) colorName = 'white'
    else colorName = 'gray'
  } else if (h < 15 || h >= 345)  colorName = 'red'
  else if (h < 40)                 colorName = 'orange'
  else if (h < 70)                 colorName = 'yellow'
  else if (h < 150)                colorName = 'green'
  else if (h < 200)                colorName = 'teal'
  else if (h < 260)                colorName = 'blue'
  else if (h < 290)                colorName = 'purple'
  else if (h < 330)                colorName = 'pink'
  else                             colorName = 'red'

  return [saturation, lightness, colorName].filter(Boolean).join(' ')
}

// ─────────────────────────────────────────────────────────────────────────────
// Generate diverse category queries from a palette
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  'fashion style',
  'nature landscape',
  'architecture minimal',
  'food still life',
  'abstract art',
  'interior decor',
  'flowers botanical',
  'texture material',
  'travel urban',
]

function buildQueries(hexColors) {
  const colorTerms = hexColors.map(colorToSearchTerms).filter(Boolean)
  const primaryColor = colorTerms[0] || ''
  const secondaryColor = colorTerms[1] || ''

  // Mix: one color per category, rotating categories
  return CATEGORIES.map((cat, i) => {
    const color = colorTerms[i % colorTerms.length] || primaryColor
    return `${color} ${cat}`
  })
}

function buildImageUrls(queries, seed) {
  return queries.map((query, i) => ({
    id: i,
    src: `https://source.unsplash.com/400x400/?${encodeURIComponent(query)}&sig=${seed + i}`,
    query,
    link: `https://unsplash.com/s/photos/${encodeURIComponent(query)}`,
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ImagePanel({ query, palette, onClose }) {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 9000))
  const [activeCategory, setActiveCategory] = useState('all')

  // Extract hex colors from query string or use palette prop
  const hexColors = palette || []

  const queries = buildQueries(hexColors)
  const activeQueries = activeCategory === 'all'
    ? queries
    : queries.filter(q => q.includes(activeCategory))

  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(() => {
      setImages(buildImageUrls(queries, seed))
      setLoading(false)
    }, 200)
    return () => clearTimeout(timer)
  }, [seed, hexColors.join(',')])

  const refresh = useCallback(() => {
    setSeed(s => s + 100)
  }, [])

  const displayImages = activeCategory === 'all'
    ? images
    : images.filter((_, i) => queries[i]?.includes(activeCategory))

  return (
    <div className="image-panel-overlay" onClick={onClose}>
      <div className="image-panel" onClick={e => e.stopPropagation()}>

        <div className="ip-header">
          <div>
            <h3 className="ip-title">Visual Inspiration</h3>
            <p className="ip-query">
              {hexColors.map(h => (
                <span key={h} className="ip-color-dot" style={{ background: h }} title={h} />
              ))}
              {hexColors.map(colorToSearchTerms).join(' · ')}
            </p>
          </div>
          <div className="ip-actions">
            <button className="btn btn-ghost" onClick={refresh}>
              <RefreshCw size={14} /> Refresh
            </button>
            <button className="btn btn-icon" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Category filter */}
        <div className="ip-categories">
          <button
            className={`ip-cat ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >All</button>
          {['fashion', 'nature', 'architecture', 'food', 'abstract', 'interior', 'flowers', 'texture', 'travel'].map(cat => (
            <button
              key={cat}
              className={`ip-cat ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        <div className="ip-grid">
          {loading
            ? Array.from({ length: 9 }, (_, i) => <div key={i} className="ip-skeleton" />)
            : (activeCategory === 'all' ? images : displayImages).map((img, i) => (
                <div key={img.id} className="ip-image-wrap">
                  <img
                    src={img.src}
                    alt={img.query}
                    className="ip-image"
                    loading="lazy"
                    onError={e => {
                      e.target.src = `https://picsum.photos/seed/${img.query.replace(/\s/g,'-')}-${seed}/400/400`
                    }}
                  />
                  <div className="ip-image-meta">
                    <span>{img.query}</span>
                    <a href={img.link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={11} />
                    </a>
                  </div>
                </div>
              ))
          }
        </div>

        <div className="ip-footer">
          <span>Unsplash · Color-matched across categories</span>
          <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer">
            More on Unsplash ↗
          </a>
        </div>
      </div>
    </div>
  )
}
