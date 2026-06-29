import { useState, useRef, useEffect, useCallback } from 'react'
import { X, RefreshCw, Download } from 'lucide-react'
import './ImagePanel.css'

// ── Deterministic seeded RNG (mulberry32) ─────────────────────────────────
function makeRng(seed) {
  let s = seed >>> 0
  return () => {
    s |= 0; s = s + 0x6D2B79F5 | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// ── Art style renderers ────────────────────────────────────────────────────

function drawWaves(ctx, w, h, colors, seed) {
  const rng = makeRng(seed)
  ctx.fillStyle = colors[0]
  ctx.fillRect(0, 0, w, h)
  const layers = colors.length * 3
  for (let i = 0; i < layers; i++) {
    const [r, g, b] = hexToRgb(colors[i % colors.length])
    ctx.strokeStyle = `rgba(${r},${g},${b},${0.3 + rng() * 0.5})`
    ctx.lineWidth = 2 + rng() * 10
    ctx.beginPath()
    const yBase = (i / layers) * h * 1.3 - h * 0.15
    const amp = 25 + rng() * 90
    const freq = 0.003 + rng() * 0.009
    const phase = rng() * Math.PI * 2
    for (let x = 0; x <= w; x += 2) {
      const y = yBase + Math.sin(x * freq + phase) * amp + Math.cos(x * freq * 0.6 + phase) * amp * 0.4
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
}

function drawCircles(ctx, w, h, colors, seed) {
  const rng = makeRng(seed)
  ctx.fillStyle = colors[0]
  ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < 22; i++) {
    const [r, g, b] = hexToRgb(colors[Math.floor(rng() * colors.length)])
    const x = rng() * w; const y = rng() * h
    const radius = 20 + rng() * Math.min(w, h) * 0.38
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius)
    grad.addColorStop(0, `rgba(${r},${g},${b},${0.2 + rng() * 0.5})`)
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
    ctx.fillStyle = grad
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill()
  }
}

function drawGradient(ctx, w, h, colors, seed) {
  const rng = makeRng(seed)
  const angle = rng() * Math.PI * 2
  const grad = ctx.createLinearGradient(
    w / 2 + Math.cos(angle) * w, h / 2 + Math.sin(angle) * h,
    w / 2 - Math.cos(angle) * w, h / 2 - Math.sin(angle) * h,
  )
  const shuffled = [...colors].sort(() => rng() - 0.5)
  shuffled.forEach((c, i) => grad.addColorStop(i / (shuffled.length - 1 || 1), c))
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < 8; i++) {
    const [r, g, b] = hexToRgb(colors[Math.floor(rng() * colors.length)])
    const cx = rng() * w; const cy = rng() * h; const rad = 80 + rng() * 220
    const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad)
    g2.addColorStop(0, `rgba(${r},${g},${b},${0.1 + rng() * 0.2})`)
    g2.addColorStop(1, `rgba(${r},${g},${b},0)`)
    ctx.fillStyle = g2; ctx.fillRect(0, 0, w, h)
  }
}

function drawMosaic(ctx, w, h, colors, seed) {
  const rng = makeRng(seed)
  const size = 40 + Math.floor(rng() * 70)
  for (let row = 0; row < Math.ceil(h / size); row++) {
    for (let col = 0; col < Math.ceil(w / size); col++) {
      const [R, G, B] = hexToRgb(colors[Math.floor(rng() * colors.length)])
      const j = () => Math.floor((rng() - 0.5) * 35)
      ctx.fillStyle = `rgb(${Math.max(0,Math.min(255,R+j()))},${Math.max(0,Math.min(255,G+j()))},${Math.max(0,Math.min(255,B+j()))})`
      ctx.fillRect(col * size, row * size, size, size)
    }
  }
}

function drawMesh(ctx, w, h, colors, seed) {
  const rng = makeRng(seed)
  const pts = Array.from({ length: 6 + colors.length * 2 }, () => ({
    x: rng() * w, y: rng() * h, rgb: hexToRgb(colors[Math.floor(rng() * colors.length)])
  }))
  // Downscale for perf then stretch
  const S = 4
  const sw = Math.ceil(w / S); const sh = Math.ceil(h / S)
  const imgData = ctx.createImageData(sw, sh)
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      let tr = 0, tg = 0, tb = 0, tw = 0
      for (const p of pts) {
        const d2 = ((x * S - p.x) ** 2 + (y * S - p.y) ** 2) + 1
        const wt = 1 / d2
        tr += p.rgb[0] * wt; tg += p.rgb[1] * wt; tb += p.rgb[2] * wt; tw += wt
      }
      const i = (y * sw + x) * 4
      imgData.data[i] = tr / tw; imgData.data[i+1] = tg / tw; imgData.data[i+2] = tb / tw; imgData.data[i+3] = 255
    }
  }
  // Draw small then scale up
  const offscreen = document.createElement('canvas')
  offscreen.width = sw; offscreen.height = sh
  offscreen.getContext('2d').putImageData(imgData, 0, 0)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(offscreen, 0, 0, w, h)
}

function drawAurora(ctx, w, h, colors, seed) {
  const rng = makeRng(seed)
  ctx.fillStyle = colors[0]
  ctx.fillRect(0, 0, w, h)
  for (let li = 0; li < colors.length * 3; li++) {
    const [r, g, b] = hexToRgb(colors[li % colors.length])
    const yCenter = h * (0.2 + rng() * 0.6)
    const bandH = h * (0.12 + rng() * 0.38)
    const freq = 0.002 + rng() * 0.005
    const phase = rng() * Math.PI * 2
    const alpha = 0.08 + rng() * 0.28
    for (let x = 0; x < w; x += 1) {
      const wave = Math.sin(x * freq + phase) * bandH * 0.5
      const y0 = yCenter + wave - bandH / 2
      const y1 = yCenter + wave + bandH / 2
      const grad = ctx.createLinearGradient(x, y0, x, y1)
      grad.addColorStop(0, `rgba(${r},${g},${b},0)`)
      grad.addColorStop(0.5, `rgba(${r},${g},${b},${alpha})`)
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
      ctx.fillStyle = grad
      ctx.fillRect(x, y0, 1, y1 - y0)
    }
  }
}

const DRAW_FNS = { waves: drawWaves, circles: drawCircles, gradient: drawGradient, mosaic: drawMosaic, mesh: drawMesh, aurora: drawAurora }
const STYLES = ['aurora', 'waves', 'gradient', 'circles', 'mesh', 'mosaic']

// ── Component ──────────────────────────────────────────────────────────────

export default function ImagePanel({ palette = [], onClose }) {
  const canvasRef = useRef(null)
  const [style, setStyle] = useState('aurora')
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 0xFFFFFF))

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !palette.length) return
    DRAW_FNS[style](canvas.getContext('2d'), canvas.width, canvas.height, palette, seed)
  }, [palette, style, seed])

  useEffect(() => { render() }, [render])

  const refresh = () => setSeed(Math.floor(Math.random() * 0xFFFFFF))

  const download = () => {
    const a = document.createElement('a')
    a.href = canvasRef.current.toDataURL('image/png')
    a.download = `chromia-${style}.png`
    a.click()
  }

  return (
    <div className="image-panel-overlay" onClick={onClose}>
      <div className="image-panel ip-art-panel" onClick={e => e.stopPropagation()}>

        <div className="ip-header">
          <div>
            <h3 className="ip-title">Palette Art</h3>
            <p className="ip-query">
              {palette.map(h => (
                <span key={h} className="ip-color-dot" style={{ background: h }} title={h} />
              ))}
              {palette.join('  ·  ')}
            </p>
          </div>
          <div className="ip-actions">
            <button className="btn btn-ghost" onClick={refresh}>
              <RefreshCw size={14} /> Generate
            </button>
            <button className="btn btn-ghost" onClick={download}>
              <Download size={14} /> Save PNG
            </button>
            <button className="btn btn-icon" onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        <div className="ip-style-tabs">
          {STYLES.map(s => (
            <button
              key={s}
              className={`ip-style-tab ${style === s ? 'active' : ''}`}
              onClick={() => setStyle(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <div className="ip-canvas-wrap">
          <canvas ref={canvasRef} width={760} height={440} className="ip-canvas" />
        </div>

        <div className="ip-palette-strip">
          {palette.map(hex => (
            <div key={hex} className="ip-strip-color" style={{ background: hex }} title={hex} />
          ))}
        </div>

      </div>
    </div>
  )
}
