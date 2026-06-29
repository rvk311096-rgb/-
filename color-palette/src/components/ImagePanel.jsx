import { useState, useEffect, useCallback } from 'react'
import { X, ExternalLink, RefreshCw, Key, AlertCircle } from 'lucide-react'
import { hexToHSL } from '../utils/colorTheory.js'
import './ImagePanel.css'

const LS_KEY = 'chromia_unsplash_key'

// ─────────────────────────────────────────────────────────────────────────────
// Map hex color → Unsplash color filter + search query
// Unsplash accepts: black_and_white, black, white, yellow, orange, red,
//                   purple, magenta, green, teal, blue
// ─────────────────────────────────────────────────────────────────────────────
function hexToUnsplashColor(hex) {
  const { h, s, l } = hexToHSL(hex)

  if (s < 12) {
    if (l < 25) return 'black'
    if (l > 80) return 'white'
    return 'black_and_white'
  }
  if (l < 12) return 'black'
  if (l > 92) return 'white'

  if (h < 15 || h >= 345) return 'red'
  if (h < 40)             return 'orange'
  if (h < 70)             return 'yellow'
  if (h < 155)            return 'green'
  if (h < 200)            return 'teal'
  if (h < 255)            return 'blue'
  if (h < 290)            return 'purple'
  if (h < 330)            return 'magenta'
  return 'red'
}

// Queries matched to Unsplash color filter for best relevance
const COLOR_QUERIES = {
  red:             ['texture', 'nature', 'fabric', 'flower', 'abstract'],
  orange:          ['texture', 'nature', 'autumn', 'fruit', 'abstract'],
  yellow:          ['texture', 'nature', 'flower', 'light', 'abstract'],
  green:           ['nature', 'plant', 'forest', 'texture', 'leaf'],
  teal:            ['water', 'ocean', 'nature', 'abstract', 'texture'],
  blue:            ['sky', 'ocean', 'nature', 'texture', 'abstract'],
  purple:          ['flower', 'nature', 'abstract', 'texture', 'art'],
  magenta:         ['flower', 'abstract', 'art', 'nature', 'texture'],
  black:           ['texture', 'minimal', 'abstract', 'night', 'dark'],
  white:           ['minimal', 'light', 'texture', 'clean', 'nature'],
  black_and_white: ['texture', 'minimal', 'abstract', 'architecture', 'nature'],
}

async function fetchImages(apiKey, hexColors, page = 1) {
  const results = []
  const perColor = Math.ceil(6 / hexColors.length)

  for (const hex of hexColors) {
    const colorFilter = hexToUnsplashColor(hex)
    const queries = COLOR_QUERIES[colorFilter] || ['texture']

    for (let qi = 0; qi < Math.min(perColor, queries.length); qi++) {
      const query = queries[(page + qi) % queries.length]
      const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&color=${colorFilter}&per_page=3&page=${page}&client_id=${apiKey}`

      try {
        const res = await fetch(url)
        if (res.status === 401) throw new Error('invalid_key')
        if (!res.ok) continue
        const data = await res.json()
        const photos = data.results?.slice(0, perColor) || []
        photos.forEach(photo => {
          results.push({
            id: photo.id,
            src: photo.urls.small,
            full: photo.urls.regular,
            thumb: photo.urls.thumb,
            link: photo.links.html,
            credit: photo.user.name,
            creditLink: photo.user.links.html,
            color: photo.color,
            hex,
            colorFilter,
            query,
          })
        })
      } catch (e) {
        if (e.message === 'invalid_key') throw e
      }
    }
  }

  // Deduplicate and limit to 6
  const seen = new Set()
  return results.filter(r => {
    if (seen.has(r.id)) return false
    seen.add(r.id)
    return true
  }).slice(0, 6)
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ImagePanel({ palette = [], onClose }) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(LS_KEY) || '')
  const [keyInput, setKeyInput] = useState('')
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)

  const load = useCallback(async (key, pg) => {
    if (!key || !palette.length) return
    setLoading(true)
    setError(null)
    try {
      const imgs = await fetchImages(key, palette, pg)
      setImages(imgs)
    } catch (e) {
      if (e.message === 'invalid_key') {
        setError('invalid_key')
        localStorage.removeItem(LS_KEY)
        setApiKey('')
      } else {
        setError('network')
      }
    } finally {
      setLoading(false)
    }
  }, [palette.join(',')])

  useEffect(() => {
    if (apiKey) load(apiKey, page)
  }, [apiKey, page])

  const saveKey = () => {
    const k = keyInput.trim()
    if (!k) return
    localStorage.setItem(LS_KEY, k)
    setApiKey(k)
    setKeyInput('')
  }

  const resetKey = () => {
    localStorage.removeItem(LS_KEY)
    setApiKey('')
    setImages([])
  }

  // ── No API key — show setup screen ────────────────────────────────────────
  if (!apiKey) {
    return (
      <div className="image-panel-overlay" onClick={onClose}>
        <div className="image-panel ip-setup" onClick={e => e.stopPropagation()}>
          <div className="ip-header">
            <h3 className="ip-title">Visual Inspiration</h3>
            <button className="btn btn-icon" onClick={onClose}><X size={16} /></button>
          </div>

          <div className="ip-key-screen">
            <div className="ip-key-icon"><Key size={32} /></div>
            <h4>Нужен бесплатный Unsplash API ключ</h4>
            <p>
              Это позволит подбирать изображения точно по цвету палитры.
              <br />Ключ получается за 1 минуту и даёт 50 запросов/час.
            </p>

            <div className="ip-key-steps">
              <a href="https://unsplash.com/developers" target="_blank" rel="noopener noreferrer" className="ip-step-link">
                1. Открыть unsplash.com/developers →
              </a>
              <span className="ip-step">2. «Your apps» → «New application» → принять условия</span>
              <span className="ip-step">3. Скопировать <strong>Access Key</strong></span>
            </div>

            {error === 'invalid_key' && (
              <div className="ip-error">
                <AlertCircle size={14} /> Неверный ключ — попробуйте ещё раз
              </div>
            )}

            <div className="ip-key-input-row">
              <input
                className="ip-key-input"
                placeholder="Вставить Access Key..."
                value={keyInput}
                onChange={e => setKeyInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveKey()}
                autoFocus
              />
              <button className="btn btn-primary" onClick={saveKey} disabled={!keyInput.trim()}>
                Сохранить
              </button>
            </div>
            <p className="ip-key-note">Ключ хранится только локально в вашем браузере</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Main image grid ────────────────────────────────────────────────────────
  return (
    <div className="image-panel-overlay" onClick={onClose}>
      <div className="image-panel" onClick={e => e.stopPropagation()}>

        <div className="ip-header">
          <div>
            <h3 className="ip-title">Visual Inspiration</h3>
            <p className="ip-query">
              {palette.map(h => (
                <span key={h} className="ip-color-dot" style={{ background: h }} title={h} />
              ))}
              {palette.map(h => hexToUnsplashColor(h)).filter((v,i,a)=>a.indexOf(v)===i).join(' · ')}
            </p>
          </div>
          <div className="ip-actions">
            <button className="btn btn-ghost" onClick={() => setPage(p => p + 1)}>
              <RefreshCw size={14} /> Refresh
            </button>
            <button className="btn btn-ghost ip-key-reset" onClick={resetKey} title="Сменить API ключ">
              <Key size={14} />
            </button>
            <button className="btn btn-icon" onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        {/* Color pills */}
        <div className="ip-categories">
          {palette.map(hex => (
            <span key={hex} className="ip-color-pill">
              <span className="ip-pill-dot" style={{ background: hex }} />
              {hexToUnsplashColor(hex).replace('_', ' ')}
            </span>
          ))}
        </div>

        {error === 'network' && (
          <div className="ip-error ip-error-bar">
            <AlertCircle size={14} /> Ошибка сети — проверьте подключение
          </div>
        )}

        <div className={`ip-grid ip-grid-6 ${loading ? 'ip-loading' : ''}`}>
          {loading
            ? Array.from({ length: 6 }, (_, i) => <div key={i} className="ip-skeleton" />)
            : images.map(img => (
                <div key={img.id} className="ip-image-wrap">
                  <div className="ip-color-accent" style={{ background: img.hex }} />
                  <img src={img.src} alt={img.query} className="ip-image" />
                  <div className="ip-image-meta">
                    <span>{img.colorFilter.replace('_',' ')} · {img.query}</span>
                    <a href={img.link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={11} />
                    </a>
                  </div>
                  <div className="ip-credit">
                    <a href={img.creditLink} target="_blank" rel="noopener noreferrer">
                      {img.credit}
                    </a>
                  </div>
                </div>
              ))
          }
        </div>

        <div className="ip-footer">
          <span>Unsplash · filtered by palette color</span>
          <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer">
            Unsplash ↗
          </a>
        </div>
      </div>
    </div>
  )
}
