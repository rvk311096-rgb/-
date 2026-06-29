import { useState, useCallback } from 'react'
import Header from './components/Header.jsx'
import ColorPicker from './components/ColorPicker.jsx'
import HarmonySelector from './components/HarmonySelector.jsx'
import PaletteDisplay from './components/PaletteDisplay.jsx'
import ImagePanel from './components/ImagePanel.jsx'
import { generatePalette, generateRandomPalette, HARMONIES } from './utils/colorTheory.js'
import './App.css'

const DEFAULT_COLOR = '#A47864'
const DEFAULT_HARMONY = 'analogous'
const DEFAULT_COUNT = 4

export default function App() {
  const [baseColor, setBaseColor] = useState(DEFAULT_COLOR)
  const [harmonyId, setHarmonyId] = useState(DEFAULT_HARMONY)
  const [colorCount, setColorCount] = useState(DEFAULT_COUNT)
  const [palette, setPalette] = useState(() => generatePalette(DEFAULT_COLOR, DEFAULT_HARMONY, DEFAULT_COUNT))
  const [selectedColor, setSelectedColor] = useState(null)
  const [showImage, setShowImage] = useState(false)
  const [imageQuery, setImageQuery] = useState(null)
  const [mode, setMode] = useState('picker') // 'picker' | 'random'
  const [randomInfo, setRandomInfo] = useState(null)

  const handleColorChange = useCallback((hex) => {
    setBaseColor(hex)
    setMode('picker')
    setPalette(generatePalette(hex, harmonyId, colorCount))
    setRandomInfo(null)
  }, [harmonyId, colorCount])

  const handleHarmonyChange = useCallback((id) => {
    setHarmonyId(id)
    if (mode === 'picker') {
      setPalette(generatePalette(baseColor, id, colorCount))
    }
  }, [baseColor, colorCount, mode])

  const handleCountChange = useCallback((count) => {
    setColorCount(count)
    if (mode === 'picker') {
      setPalette(generatePalette(baseColor, harmonyId, count))
    } else {
      const result = generateRandomPalette(count)
      setPalette(result.colors)
      setRandomInfo(result)
    }
  }, [baseColor, harmonyId, mode])

  const handleRandom = useCallback(() => {
    const result = generateRandomPalette(colorCount)
    setPalette(result.colors)
    setBaseColor(result.base)
    setHarmonyId(result.harmony.id)
    setRandomInfo(result)
    setMode('random')
  }, [colorCount])

  const handleShowImage = useCallback((hexArray) => {
    setImageQuery(hexArray)
    setShowImage(true)
  }, [])

  return (
    <div className="app">
      {/* Background gradient spheres */}
      <div className="bg-sphere sphere-1" />
      <div className="bg-sphere sphere-2" />
      <div className="bg-sphere sphere-3" />

      <Header onRandom={handleRandom} />

      <main className="main">
        <div className="layout">
          {/* LEFT PANEL */}
          <aside className="panel panel-left">
            <ColorPicker
              color={baseColor}
              onChange={handleColorChange}
            />
            <HarmonySelector
              selected={harmonyId}
              onChange={handleHarmonyChange}
              colorCount={colorCount}
              onCountChange={handleCountChange}
            />
          </aside>

          {/* CENTER — PALETTE */}
          <section className="panel panel-center">
            <PaletteDisplay
              palette={palette}
              baseColor={baseColor}
              harmonyId={harmonyId}
              randomInfo={randomInfo}
              mode={mode}
              onShowImage={handleShowImage}
              onColorSelect={setSelectedColor}
            />
          </section>
        </div>
      </main>

      {/* IMAGE MODAL */}
      {showImage && (
        <ImagePanel
          palette={Array.isArray(imageQuery) ? imageQuery : [imageQuery]}
          onClose={() => setShowImage(false)}
        />
      )}
    </div>
  )
}
