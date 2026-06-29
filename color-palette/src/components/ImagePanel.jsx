import { useState, useEffect, useCallback } from 'react'
import { X, ExternalLink, RefreshCw } from 'lucide-react'
import { hexToHSL } from '../utils/colorTheory.js'
import './ImagePanel.css'

// ─────────────────────────────────────────────────────────────────────────────
// Color → naturally-colored subjects
// These keywords describe things that ARE that color in real life,
// so Unsplash will return visually color-accurate images
// ─────────────────────────────────────────────────────────────────────────────
const COLOR_SUBJECTS = {
  red: [
    'red roses', 'poppy field', 'red autumn leaves', 'red berries',
    'red fabric texture', 'red sunset sky', 'red door', 'pomegranate',
    'red dahlia flower', 'red chili peppers',
  ],
  orange: [
    'marigold flowers', 'orange autumn leaves', 'pumpkin harvest',
    'orange sunset', 'citrus orange', 'fox animal', 'orange persimmon',
    'amber resin', 'saffron spice', 'orange dahlia',
  ],
  yellow: [
    'sunflower field', 'yellow tulips', 'lemon fruit', 'yellow autumn ginkgo',
    'golden wheat field', 'yellow daffodils', 'mimosa flowers',
    'yellow butterfly', 'golden sand dunes', 'banana leaves',
  ],
  green: [
    'tropical jungle leaves', 'moss forest', 'green ferns', 'sage herb',
    'green tea matcha', 'olive trees grove', 'green succulents',
    'eucalyptus branches', 'green lichen stone', 'bamboo forest',
  ],
  teal: [
    'turquoise sea water', 'tropical lagoon', 'teal peacock feathers',
    'malachite mineral', 'teal door', 'tropical water shallow',
    'turquoise ice glacier', 'teal dragonfly', 'Caribbean ocean',
    'patina copper',
  ],
  blue: [
    'blue ocean waves', 'clear blue sky', 'cornflower field', 'blueberries',
    'blue hydrangea', 'blue morpho butterfly', 'blue morning glory',
    'indigo fabric', 'blue ice cave', 'forget-me-not flowers',
  ],
  purple: [
    'lavender field provence', 'purple wisteria', 'violet iris flower',
    'purple orchid', 'amethyst crystal', 'purple jacaranda tree',
    'lilac blossoms', 'purple grapes', 'plum fruit', 'purple heather moor',
  ],
  pink: [
    'cherry blossom sakura', 'pink peonies', 'pink flamingo',
    'pink rose garden', 'pink lotus flower', 'peony bouquet',
    'pink cosmo flowers', 'bougainvillea pink', 'pink anemone',
    'pink magnolia',
  ],
  brown: [
    'coffee beans', 'wooden texture bark', 'autumn fallen leaves',
    'leather texture', 'cinnamon spice', 'dark chocolate', 'terra cotta pot',
    'brown mushrooms forest', 'walnut wood grain', 'dried earth soil',
  ],
  gray: [
    'concrete texture minimal', 'morning fog mountains', 'silver stone pebbles',
    'gray wolf', 'overcast sky moody', 'pewter metal texture',
    'gray cat', 'ash volcanic rock', 'driftwood beach', 'silver birch trees',
  ],
  black: [
    'black ink splash', 'night sky stars', 'black volcanic sand',
    'black marble texture', 'charcoal texture', 'black raven bird',
    'obsidian crystal', 'black tulips', 'dark forest night', 'black sand beach',
  ],
  white: [
    'white snow landscape', 'white marble texture', 'white magnolia flower',
    'white sand beach', 'white clouds minimalist', 'white jasmine flowers',
    'polar bear arctic', 'white dove bird', 'cotton field',
    'white ceramic minimal',
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// Determine color family from HSL
// ─────────────────────────────────────────────────────────────────────────────
function getColorFamily(hex) {
  const { h, s, l } = hexToHSL(hex)

  if (s < 12) {
    if (l < 20) return 'black'
    if (l > 80) return 'white'
    return 'gray'
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
  if (h < 345)            return 'pink'
  return 'red'
}

// Build image list: for each color in palette, pick subjects from its family
// Distribute 9 slots across palette colors
function buildImages(hexColors, seed) {
  const slots = 9
  const images = []

  for (let i = 0; i < slots; i++) {
    const hex = hexColors[i % hexColors.length]
    const family = getColorFamily(hex)
    const subjects = COLOR_SUBJECTS[family] || COLOR_SUBJECTS.gray
    const subject = subjects[(seed + i * 3) % subjects.length]

    images.push({
      id: i,
      hex,
      family,
      subject,
      src: `https://source.unsplash.com/400x400/?${encodeURIComponent(subject)}&sig=${seed + i * 7}`,
      link: `https://unsplash.com/s/photos/${encodeURIComponent(subject)}`,
    })
  }
  return images
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ImagePanel({ palette = [], onClose }) {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 900))

  useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => {
      setImages(buildImages(palette, seed))
      setLoading(false)
    }, 200)
    return () => clearTimeout(t)
  }, [palette.join(','), seed])

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
              {palette.map(h => getColorFamily(h)).filter((v,i,a) => a.indexOf(v)===i).join(' · ')}
            </p>
          </div>
          <div className="ip-actions">
            <button className="btn btn-ghost" onClick={() => setSeed(s => s + 100)}>
              <RefreshCw size={14} /> Refresh
            </button>
            <button className="btn btn-icon" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Color family pills */}
        <div className="ip-categories">
          {palette.map(hex => (
            <span key={hex} className="ip-color-pill">
              <span className="ip-pill-dot" style={{ background: hex }} />
              {getColorFamily(hex)}
            </span>
          ))}
        </div>

        <div className="ip-grid">
          {loading
            ? Array.from({ length: 9 }, (_, i) => <div key={i} className="ip-skeleton" />)
            : images.map(img => (
                <div key={img.id} className="ip-image-wrap">
                  {/* Color accent border matching palette */}
                  <div className="ip-color-accent" style={{ background: img.hex }} />
                  <img
                    src={img.src}
                    alt={img.subject}
                    className="ip-image"
                    loading="lazy"
                    onError={e => {
                      // Fallback: more generic subject term
                      const family = img.family
                      const fallback = COLOR_SUBJECTS[family]?.[0] || family
                      e.target.src = `https://source.unsplash.com/400x400/?${encodeURIComponent(fallback)}&sig=${seed + img.id * 13 + 50}`
                      e.target.onerror = null
                    }}
                  />
                  <div className="ip-image-meta">
                    <span>{img.subject}</span>
                    <a href={img.link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={11} />
                    </a>
                  </div>
                </div>
              ))
          }
        </div>

        <div className="ip-footer">
          <span>Unsplash · subjects matched to palette colors</span>
          <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer">
            More on Unsplash ↗
          </a>
        </div>
      </div>
    </div>
  )
}
