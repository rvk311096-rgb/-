import { useState, useCallback } from 'react'
import { HexColorPicker } from 'react-colorful'
import { Pipette, Copy, Check } from 'lucide-react'
import { hexToHSL, hexToRGB, hexToCMYK } from '../utils/colorTheory.js'
import { findClosestPantone } from '../utils/pantoneColors.js'
import './ColorPicker.css'

export default function ColorPicker({ color, onChange }) {
  const [inputValue, setInputValue] = useState(color)
  const [copied, setCopied] = useState(null)

  const handleHexInput = useCallback((e) => {
    const val = e.target.value
    setInputValue(val)
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      onChange(val)
    }
  }, [onChange])

  const handlePickerChange = useCallback((hex) => {
    setInputValue(hex)
    onChange(hex)
  }, [onChange])

  const copy = useCallback((text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    })
  }, [])

  const hsl = hexToHSL(color)
  const rgb = hexToRGB(color)
  const cmyk = hexToCMYK(color)
  const pantone = findClosestPantone(color)

  return (
    <div className="color-picker card">
      <div className="section-label">Base Color</div>

      <HexColorPicker color={color} onChange={handlePickerChange} />

      {/* Hex input */}
      <div className="hex-row">
        <div className="hex-preview" style={{ background: color }} />
        <input
          className="hex-input"
          value={inputValue}
          onChange={handleHexInput}
          placeholder="#000000"
          spellCheck={false}
        />
        <button className="btn btn-icon" onClick={() => copy(color, 'hex')}>
          {copied === 'hex' ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>

      {/* Pantone name */}
      {pantone && (
        <div className="pantone-chip">
          <div className="pantone-dot" style={{ background: pantone.hex }} />
          <div className="pantone-info">
            <span className="pantone-label">PANTONE®</span>
            <span className="pantone-name">{pantone.name}</span>
          </div>
          <button className="btn btn-icon" onClick={() => copy(pantone.name, 'pantone')}>
            {copied === 'pantone' ? <Check size={12} /> : <Copy size={12} />}
          </button>
        </div>
      )}

      {/* Color values */}
      <div className="color-values">
        <ColorValue
          label="HEX"
          value={color.toUpperCase()}
          onCopy={() => copy(color, 'hex2')}
          copied={copied === 'hex2'}
        />
        <ColorValue
          label="RGB"
          value={`${rgb.r}, ${rgb.g}, ${rgb.b}`}
          onCopy={() => copy(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`, 'rgb')}
          copied={copied === 'rgb'}
        />
        <ColorValue
          label="HSL"
          value={`${Math.round(hsl.h)}°, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%`}
          onCopy={() => copy(`hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`, 'hsl')}
          copied={copied === 'hsl'}
        />
        <ColorValue
          label="CMYK"
          value={`${cmyk.c}, ${cmyk.m}, ${cmyk.y}, ${cmyk.k}`}
          onCopy={() => copy(`cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`, 'cmyk')}
          copied={copied === 'cmyk'}
        />
      </div>
    </div>
  )
}

function ColorValue({ label, value, onCopy, copied }) {
  return (
    <div className="color-value-row">
      <span className="cv-label">{label}</span>
      <span className="cv-value">{value}</span>
      <button className="btn btn-icon cv-copy" onClick={onCopy}>
        {copied ? <Check size={11} /> : <Copy size={11} />}
      </button>
    </div>
  )
}
