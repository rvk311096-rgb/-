import { useState, useEffect, useCallback } from 'react'
import { X, ExternalLink, RefreshCw } from 'lucide-react'
import './ImagePanel.css'

// Unsplash source - free to use, no API key needed for direct links
function getUnsplashImages(query, count = 9) {
  const seeds = Array.from({ length: count }, (_, i) => `${query}-${i}-${Date.now()}`)
  return seeds.map((seed, i) => ({
    id: i,
    url: `https://source.unsplash.com/400x400/?${encodeURIComponent(query)}&sig=${i + Math.floor(Math.random() * 1000)}`,
    thumb: `https://source.unsplash.com/400x400/?${encodeURIComponent(query)}&sig=${i + Math.floor(Math.random() * 1000)}`,
    link: `https://unsplash.com/s/photos/${encodeURIComponent(query)}`,
  }))
}

export default function ImagePanel({ query, onClose }) {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    setLoading(true)
    // Small delay to show loading state
    const timer = setTimeout(() => {
      setImages(getUnsplashImages(query, 9))
      setLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, refresh])

  return (
    <div className="image-panel-overlay" onClick={onClose}>
      <div className="image-panel" onClick={e => e.stopPropagation()}>
        <div className="ip-header">
          <div>
            <h3 className="ip-title">Visual Inspiration</h3>
            <p className="ip-query">"{query}"</p>
          </div>
          <div className="ip-actions">
            <button className="btn btn-ghost" onClick={() => setRefresh(r => r + 1)}>
              <RefreshCw size={14} />
              Refresh
            </button>
            <button className="btn btn-icon" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="ip-grid">
          {loading ? (
            Array.from({ length: 9 }, (_, i) => (
              <div key={i} className="ip-skeleton" />
            ))
          ) : (
            images.map(img => (
              <div key={img.id} className="ip-image-wrap">
                <img
                  src={img.url}
                  alt={query}
                  className="ip-image"
                  loading="lazy"
                  onError={e => {
                    e.target.src = `https://picsum.photos/seed/${query}-${img.id}/400/400`
                  }}
                />
                <a
                  href={img.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ip-image-link"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            ))
          )}
        </div>

        <div className="ip-footer">
          <span>Images from Unsplash · Click to open source</span>
          <a href={`https://unsplash.com/s/photos/${encodeURIComponent(query)}`} target="_blank" rel="noopener noreferrer">
            View more on Unsplash ↗
          </a>
        </div>
      </div>
    </div>
  )
}
