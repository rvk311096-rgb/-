import { useState } from 'react'
import { Copy, Check, Image, Download, Shuffle } from 'lucide-react'
import { getContrastColor, hexToHSL, hexToRGB, hexToCMYK } from '../utils/colorTheory.js'
import { findClosestPantone } from '../utils/pantoneColors.js'
import { HARMONIES } from '../utils/colorTheory.js'
import './PaletteDisplay.css'

export default function PaletteDisplay({ palette, baseColor, harmonyId, randomInfo, mode, onShowImage, onColorSelect }) {
  const [copied, setCopied] = useState(null)
  const [viewMode, setViewMode] = useState('swatches') // 'swatches' | 'strips' | 'grid'

  const harmony = HARMONIES.find(h => h.id === harmonyId)

  const copy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    })
  }

  const exportPalette = () => {
    const lines = palette.map((hex, i) => {
      const pantone = findClosestPantone(hex)
      const rgb = hexToRGB(hex)
      return `Color ${i + 1}: ${hex.toUpperCase()} | RGB: ${rgb.r},${rgb.g},${rgb.b} | ${pantone?.name || ''}`
    })
    const text = `CHROMIA Palette — ${harmony?.name || ''}\n${'─'.repeat(40)}\n${lines.join('\n')}`
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chromia-palette-${harmonyId}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const imageQuery = palette.map(hex => {
    const p = findClosestPantone(hex)
    return p?.name?.split(' ').pop() || ''
  }).filter(Boolean).join(' ') + ' color palette interior design'

  return (
    <div className="palette-display">
      {/* Header */}
      <div className="pd-header">
        <div className="pd-title-block">
          <h2 className="pd-title">
            {mode === 'random' ? 'Random Palette' : harmony?.nameRu || 'Palette'}
          </h2>
          {harmony && (
            <span className="pd-subtitle">{harmony.name} · {palette.length} colors</span>
          )}
        </div>

        <div className="pd-controls">
          {/* View mode */}
          <div className="view-tabs">
            {[
              { id: 'swatches', label: '⬛' },
              { id: 'strips', label: '▬' },
              { id: 'grid', label: '⊞' },
            ].map(v => (
              <button
                key={v.id}
                className={`view-tab ${viewMode === v.id ? 'active' : ''}`}
                onClick={() => setViewMode(v.id)}
                title={v.id}
              >
                {v.label}
              </button>
            ))}
          </div>

          <button className="btn btn-ghost btn-sm" onClick={() => onShowImage(imageQuery)}>
            <Image size={14} />
            Find Image
          </button>
          <button className="btn btn-ghost btn-sm" onClick={exportPalette}>
            <Download size={14} />
            Export
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => copy(palette.join(', '), 'all')}
          >
            {copied === 'all' ? <Check size={14} /> : <Copy size={14} />}
            Copy All
          </button>
        </div>
      </div>

      {/* Main palette view */}
      {viewMode === 'swatches' && (
        <div className="swatch-grid" style={{ '--count': palette.length }}>
          {palette.map((hex, i) => (
            <ColorSwatch
              key={hex + i}
              hex={hex}
              index={i}
              isBase={hex.toLowerCase() === baseColor.toLowerCase()}
              onShowImage={onShowImage}
              onColorSelect={onColorSelect}
            />
          ))}
        </div>
      )}

      {viewMode === 'strips' && (
        <div className="strip-view">
          {palette.map((hex, i) => (
            <ColorStrip
              key={hex + i}
              hex={hex}
              index={i}
              isBase={hex.toLowerCase() === baseColor.toLowerCase()}
              onShowImage={onShowImage}
            />
          ))}
        </div>
      )}

      {viewMode === 'grid' && (
        <div className="grid-view">
          {palette.map((hex, i) => (
            <ColorGridCard
              key={hex + i}
              hex={hex}
              index={i}
              isBase={hex.toLowerCase() === baseColor.toLowerCase()}
            />
          ))}
        </div>
      )}

      {/* Harmony info */}
      {harmony && (
        <div className="harmony-info-bar">
          <div className="hib-icon">{harmony.icon}</div>
          <div className="hib-text">
            <strong>{harmony.nameRu}</strong>
            <span>{harmony.description}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Swatch card ──────────────────────────────────────────
function ColorSwatch({ hex, index, isBase, onShowImage, onColorSelect }) {
  const [copied, setCopied] = useState(null)
  const textColor = getContrastColor(hex)
  const pantone = findClosestPantone(hex)
  const rgb = hexToRGB(hex)

  const copy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 1200)
    })
  }

  const query = pantone?.name?.split(' ').slice(-2).join(' ') + ' color lifestyle'

  return (
    <div className={`color-swatch ${isBase ? 'is-base' : ''}`}>
      <div
        className="swatch-color"
        style={{ background: hex }}
        onClick={() => onColorSelect?.(hex)}
      >
        {isBase && <div className="base-tag" style={{ color: textColor, borderColor: `${textColor}33` }}>Base</div>}

        <div className="swatch-overlay">
          <button
            className="swatch-copy-btn"
            style={{ color: textColor, borderColor: `${textColor}30` }}
            onClick={(e) => { e.stopPropagation(); copy(hex, 'hex') }}
          >
            {copied === 'hex' ? <Check size={12} /> : <Copy size={12} />}
            {hex.toUpperCase()}
          </button>
          <button
            className="swatch-img-btn"
            style={{ color: textColor, borderColor: `${textColor}30` }}
            onClick={(e) => { e.stopPropagation(); onShowImage?.(query) }}
          >
            <Image size={12} />
          </button>
        </div>
      </div>

      <div className="swatch-info">
        <div className="si-hex">{hex.toUpperCase()}</div>
        {pantone && (
          <div className="si-pantone">
            <span className="si-p-label">P</span>
            <span className="si-p-name">{pantone.name.replace('Pantone ', '')}</span>
          </div>
        )}
        <div className="si-rgb">rgb({rgb.r}, {rgb.g}, {rgb.b})</div>
      </div>
    </div>
  )
}

// ── Strip view ───────────────────────────────────────────
function ColorStrip({ hex, index, isBase, onShowImage }) {
  const [copied, setCopied] = useState(false)
  const textColor = getContrastColor(hex)
  const pantone = findClosestPantone(hex)
  const hsl = hexToHSL(hex)

  return (
    <div className="color-strip">
      <div
        className="strip-swatch"
        style={{ background: hex, flex: '0 0 80px' }}
      >
        {isBase && <div className="strip-base" style={{ color: textColor }}>●</div>}
      </div>
      <div className="strip-info">
        <div className="strip-main">
          <span className="strip-hex">{hex.toUpperCase()}</span>
          {pantone && <span className="strip-pantone-name">{pantone.name.replace('Pantone ', '')}</span>}
        </div>
        <div className="strip-values">
          <span>H: {Math.round(hsl.h)}°</span>
          <span>S: {Math.round(hsl.s)}%</span>
          <span>L: {Math.round(hsl.l)}%</span>
        </div>
      </div>
      <div className="strip-actions">
        <button className="btn btn-icon" onClick={() => { navigator.clipboard.writeText(hex); setCopied(true); setTimeout(() => setCopied(false), 1200) }}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
        <button className="btn btn-icon" onClick={() => onShowImage?.(pantone?.name + ' color')}>
          <Image size={13} />
        </button>
      </div>
    </div>
  )
}

// ── Grid card ────────────────────────────────────────────
function ColorGridCard({ hex, isBase }) {
  const pantone = findClosestPantone(hex)
  const cmyk = hexToCMYK(hex)
  const rgb = hexToRGB(hex)
  const textColor = getContrastColor(hex)

  return (
    <div className="color-grid-card card">
      <div className="cgc-swatch" style={{ background: hex }}>
        {isBase && <div className="base-tag" style={{ color: textColor, borderColor: `${textColor}33` }}>Base</div>}
      </div>
      <div className="cgc-body">
        <div className="cgc-hex">{hex.toUpperCase()}</div>
        {pantone && <div className="cgc-pantone">{pantone.name}</div>}
        <div className="cgc-values">
          <span>rgb({rgb.r},{rgb.g},{rgb.b})</span>
          <span>cmyk({cmyk.c},{cmyk.m},{cmyk.y},{cmyk.k})</span>
        </div>
      </div>
    </div>
  )
}
