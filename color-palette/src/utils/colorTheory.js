// Professional color theory algorithms

// Convert hex to HSL
export function hexToHSL(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

// Convert HSL to hex
export function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s));
  l = Math.max(0, Math.min(100, l));

  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }

  return '#' + [r + m, g + m, b + m]
    .map(v => Math.round(v * 255).toString(16).padStart(2, '0'))
    .join('');
}

// Get text color (black or white) based on background luminance
export function getContrastColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

// Convert hex to RGB object
export function hexToRGB(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

// Convert hex to CMYK (approximate)
export function hexToCMYK(hex) {
  let { r, g, b } = hexToRGB(hex);
  r /= 255; g /= 255; b /= 255;
  const k = 1 - Math.max(r, g, b);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  return {
    c: Math.round(((1 - r - k) / (1 - k)) * 100),
    m: Math.round(((1 - g - k) / (1 - k)) * 100),
    y: Math.round(((1 - b - k) / (1 - k)) * 100),
    k: Math.round(k * 100),
  };
}

// ═══════════════════════════════════════════════════════
// COLOR HARMONY ALGORITHMS
// ═══════════════════════════════════════════════════════

// 1. Complementary — opposite on wheel (180°)
export function complementary(hex, count = 2) {
  const { h, s, l } = hexToHSL(hex);
  if (count === 2) return [hex, hslToHex(h + 180, s, l)];
  // With more colors, blend in tints
  const comp = hslToHex(h + 180, s, l);
  const colors = [hex, comp];
  while (colors.length < count) {
    const idx = colors.length % 2 === 0 ? 0 : 1;
    const base = hexToHSL(colors[idx]);
    colors.push(hslToHex(base.h, base.s * 0.7, base.l + (colors.length % 2 === 0 ? 15 : -15)));
  }
  return colors.slice(0, count);
}

// 2. Analogous — adjacent colors (30° apart)
export function analogous(hex, count = 3) {
  const { h, s, l } = hexToHSL(hex);
  const step = count <= 3 ? 30 : 20;
  const half = Math.floor(count / 2);
  return Array.from({ length: count }, (_, i) =>
    hslToHex(h + (i - half) * step, s * (0.85 + (i % 2) * 0.15), l)
  );
}

// 3. Triadic — three equidistant (120° apart)
export function triadic(hex, count = 3) {
  const { h, s, l } = hexToHSL(hex);
  const base = [0, 120, 240].map(offset => hslToHex(h + offset, s, l));
  if (count <= 3) return base.slice(0, count);
  // Add tints for extra colors
  const extra = base.map(c => { const hsl = hexToHSL(c); return hslToHex(hsl.h, hsl.s * 0.6, Math.min(hsl.l + 20, 90)); });
  return [...base, ...extra].slice(0, count);
}

// 4. Split-Complementary — base + two adjacent to complement
export function splitComplementary(hex, count = 3) {
  const { h, s, l } = hexToHSL(hex);
  const base = [hex, hslToHex(h + 150, s, l), hslToHex(h + 210, s, l)];
  if (count <= 3) return base.slice(0, count);
  const extra = [
    hslToHex(h, s * 0.6, l + 20),
    hslToHex(h + 150, s * 0.6, l + 20),
    hslToHex(h + 210, s * 0.6, l + 20),
  ];
  return [...base, ...extra].slice(0, count);
}

// 5. Tetradic/Square — four colors at 90° intervals
export function tetradic(hex, count = 4) {
  const { h, s, l } = hexToHSL(hex);
  const base = [0, 90, 180, 270].map(offset => hslToHex(h + offset, s, l));
  if (count <= 4) return base.slice(0, count);
  const extra = [
    hslToHex(h + 45, s * 0.7, l + 15),
    hslToHex(h + 135, s * 0.7, l + 15),
  ];
  return [...base, ...extra].slice(0, count);
}

// 6. Double Split-Complementary
export function doubleSplitComplementary(hex, count = 4) {
  const { h, s, l } = hexToHSL(hex);
  const colors = [
    hex,
    hslToHex(h + 30, s, l),
    hslToHex(h + 180, s, l),
    hslToHex(h + 210, s, l),
    hslToHex(h - 30, s, l),
    hslToHex(h + 150, s, l),
  ];
  return colors.slice(0, count);
}

// 7. Monochromatic — same hue, varied saturation & lightness
export function monochromatic(hex, count = 4) {
  const { h, s, l } = hexToHSL(hex);
  if (count === 2) return [hex, hslToHex(h, s, l > 50 ? l - 30 : l + 30)];

  const lightSteps = Array.from({ length: count }, (_, i) => {
    const factor = i / (count - 1);
    return hslToHex(h, s * (0.5 + factor * 0.5), 20 + factor * 65);
  });
  return lightSteps;
}

// 8. Achromatic — neutral gray scale
export function achromatic(hex, count = 4) {
  const { l } = hexToHSL(hex);
  return Array.from({ length: count }, (_, i) =>
    hslToHex(0, 0, 10 + (i / (count - 1)) * 85)
  );
}

// 9. Warm tones
export function warmPalette(hex, count = 4) {
  const { h, s, l } = hexToHSL(hex);
  const warmH = ((h % 60) + 360) % 360; // Shift to warm range (0-60°)
  return Array.from({ length: count }, (_, i) =>
    hslToHex(warmH + i * 15, s * (0.7 + i * 0.1), l + (i - count / 2) * 10)
  );
}

// 10. Cool tones
export function coolPalette(hex, count = 4) {
  const { h, s, l } = hexToHSL(hex);
  const coolH = 180 + ((h + 180) % 180); // Shift to cool range (180-360°)
  return Array.from({ length: count }, (_, i) =>
    hslToHex(coolH + i * 20, s * (0.8 + i * 0.05), l + (i - count / 2) * 8)
  );
}

// 11. Natural/Earth tones palette
export function earthTones(hex, count = 4) {
  const { h, s, l } = hexToHSL(hex);
  // Earth tones: muted, warm, low saturation
  return Array.from({ length: count }, (_, i) =>
    hslToHex(
      (h + i * 25) % 80, // Stay in yellow-orange-red range
      Math.max(20, s * 0.6 - i * 5),
      Math.max(25, Math.min(70, l - 10 + i * 15))
    )
  );
}

// 12. Pastel palette
export function pastelPalette(hex, count = 4) {
  const { h, s, l } = hexToHSL(hex);
  return Array.from({ length: count }, (_, i) =>
    hslToHex(
      (h + i * (360 / count)) % 360,
      Math.min(40, s * 0.5),
      Math.max(75, l * 0.8 + 40)
    )
  );
}

// ═══════════════════════════════════════════════════════
// HARMONY TYPES REGISTRY
// ═══════════════════════════════════════════════════════

export const HARMONIES = [
  {
    id: 'complementary',
    name: 'Complementary',
    nameRu: 'Комплементарный',
    description: 'Two opposite colors on the wheel — maximum contrast, vibrant energy',
    minColors: 2,
    maxColors: 6,
    fn: complementary,
    icon: '⊕',
  },
  {
    id: 'analogous',
    name: 'Analogous',
    nameRu: 'Аналоговый',
    description: 'Adjacent colors — harmonious, natural, serene',
    minColors: 2,
    maxColors: 6,
    fn: analogous,
    icon: '≋',
  },
  {
    id: 'triadic',
    name: 'Triadic',
    nameRu: 'Триадный',
    description: 'Three equidistant colors — balanced, vibrant, versatile',
    minColors: 2,
    maxColors: 6,
    fn: triadic,
    icon: '△',
  },
  {
    id: 'split-complementary',
    name: 'Split-Complementary',
    nameRu: 'Раздельный',
    description: 'Softer contrast than complementary — sophisticated, less tension',
    minColors: 2,
    maxColors: 6,
    fn: splitComplementary,
    icon: '⋈',
  },
  {
    id: 'tetradic',
    name: 'Tetradic',
    nameRu: 'Тетрадный',
    description: 'Four balanced colors — rich variety, best for complex compositions',
    minColors: 2,
    maxColors: 6,
    fn: tetradic,
    icon: '□',
  },
  {
    id: 'monochromatic',
    name: 'Monochromatic',
    nameRu: 'Монохромный',
    description: 'One hue, varying lightness — elegant, cohesive, minimal',
    minColors: 2,
    maxColors: 6,
    fn: monochromatic,
    icon: '▓',
  },
  {
    id: 'pastel',
    name: 'Pastel Dream',
    nameRu: 'Пастельный',
    description: 'Soft, desaturated tones — gentle, dreamy, approachable',
    minColors: 2,
    maxColors: 6,
    fn: pastelPalette,
    icon: '✦',
  },
  {
    id: 'earth',
    name: 'Earth Tones',
    nameRu: 'Земляные тона',
    description: 'Warm, natural hues inspired by nature — grounded, organic',
    minColors: 2,
    maxColors: 6,
    fn: earthTones,
    icon: '◉',
  },
];

// ═══════════════════════════════════════════════════════
// RANDOM PALETTE GENERATOR
// ═══════════════════════════════════════════════════════

export function generateRandomPalette(count = 4) {
  const harmonyTypes = Object.values(HARMONIES);
  const randomHarmony = harmonyTypes[Math.floor(Math.random() * harmonyTypes.length)];

  // Generate aesthetically pleasing random base color
  const h = Math.random() * 360;
  const s = 30 + Math.random() * 60; // 30-90% saturation
  const l = 25 + Math.random() * 50; // 25-75% lightness
  const baseHex = hslToHex(h, s, l);

  return {
    colors: randomHarmony.fn(baseHex, count),
    harmony: randomHarmony,
    base: baseHex,
  };
}

// Generate palette from selected color
export function generatePalette(hex, harmonyId, count) {
  const harmony = HARMONIES.find(h => h.id === harmonyId) || HARMONIES[0];
  return harmony.fn(hex, count);
}
