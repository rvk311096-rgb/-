# CHROMIA — Color Palette Studio

Professional color palette generator with Pantone® references, color theory algorithms, and 2026 trend colors.

## Quick Install (macOS)

```bash
cd color-palette
chmod +x install.sh
./install.sh
```

The script will:
- Install Node.js via Homebrew if needed
- Install all dependencies
- Create a `chromia.sh` launcher
- Create `~/Applications/Chromia.app` (optional Dock icon)

## Manual Install

```bash
cd color-palette
npm install
npm start        # opens http://localhost:3000
```

## Features

- **Color Picker** — HEX input + visual picker
- **Pantone® Names** — nearest Pantone reference for any color
- **8 Harmony Types** — Complementary, Analogous, Triadic, Split-Complementary, Tetradic, Monochromatic, Pastel, Earth Tones
- **2–6 Colors** — choose palette size
- **3 View Modes** — Swatches / Strips / Grid
- **Copy All Formats** — HEX, RGB, HSL, CMYK
- **Random Palette** — instant aesthetic combination
- **Find Image** — Unsplash inspiration by palette mood
- **Export** — save palette as .txt

## Color Theory

Based on professional colorimetry:
- RYB color wheel harmonies
- Perceptual luminance weighting for Pantone matching
- HSL-space harmony generation for accurate hue relationships
