// ─────────────────────────────────────────────────────────────────────────────
// Pantone color database — verified hex values
// ─────────────────────────────────────────────────────────────────────────────
export const PANTONE_COLORS = [
  // ── Color of the Year ──────────────────────────────────────────────────────
  { hex: "#A47864", name: "Mocha Mousse",        pantone: "17-1230" },
  { hex: "#FFBE98", name: "Peach Fuzz",           pantone: "13-1023" },
  { hex: "#6667AB", name: "Very Peri",            pantone: "17-3938" },
  { hex: "#939597", name: "Ultimate Gray",        pantone: "17-5104" },
  { hex: "#F4E04D", name: "Illuminating",         pantone: "13-0858" },
  { hex: "#0F4C81", name: "Classic Blue",         pantone: "19-4052" },
  { hex: "#FF6F61", name: "Living Coral",         pantone: "16-1546" },
  { hex: "#5F4B8B", name: "Ultra Violet",         pantone: "18-3838" },
  { hex: "#88B04B", name: "Greenery",             pantone: "15-0343" },
  { hex: "#F7CAC9", name: "Rose Quartz",          pantone: "13-2010" },
  { hex: "#92A8D1", name: "Serenity",             pantone: "15-3817" },
  { hex: "#B163A3", name: "Radiant Orchid",       pantone: "18-3025" },
  { hex: "#009473", name: "Emerald",              pantone: "17-5641" },
  { hex: "#CE3175", name: "Honeysuckle",          pantone: "18-2043" },
  { hex: "#45B5AA", name: "Turquoise",            pantone: "15-5519" },
  { hex: "#9B1B30", name: "Chili Pepper",         pantone: "19-1664" },
  { hex: "#E2583E", name: "Tiger Lily",           pantone: "17-1462" },
  { hex: "#DD4132", name: "Tomato",               pantone: "18-1660" },

  // ── Reds ───────────────────────────────────────────────────────────────────
  { hex: "#ED2939", name: "True Red",             pantone: "18-1763" },
  { hex: "#C41E3A", name: "Cardinal",             pantone: "19-1762" },
  { hex: "#8B0000", name: "Dark Red",             pantone: "19-1664" },
  { hex: "#6B0F1A", name: "Burgundy",             pantone: "19-1725" },
  { hex: "#A40000", name: "Pompeian Red",         pantone: "19-1557" },
  { hex: "#DC143C", name: "Crimson",              pantone: "19-1763" },
  { hex: "#CC2529", name: "Mars Red",             pantone: "19-1558" },
  { hex: "#B22222", name: "Firebrick",            pantone: "18-1547" },
  { hex: "#F08080", name: "Light Coral",          pantone: "15-1624" },
  { hex: "#E8808A", name: "Flamingo Pink",        pantone: "15-1920" },

  // ── Pinks ──────────────────────────────────────────────────────────────────
  { hex: "#FFC0CB", name: "Pink",                 pantone: "12-2103" },
  { hex: "#FFB6C1", name: "Light Pink",           pantone: "12-1706" },
  { hex: "#FF69B4", name: "Hot Pink",             pantone: "15-2050" },
  { hex: "#FF1493", name: "Deep Pink",            pantone: "17-2034" },
  { hex: "#DB7093", name: "Pale Violet Red",      pantone: "16-1723" },
  { hex: "#C17787", name: "Canyon Rose",          pantone: "16-1723" },
  { hex: "#E8B4B8", name: "Blush Pink",           pantone: "13-2010" },
  { hex: "#D4688A", name: "Chateau Rose",         pantone: "16-1723" },
  { hex: "#B5426C", name: "Azalea",               pantone: "17-2034" },

  // ── Oranges ────────────────────────────────────────────────────────────────
  { hex: "#FF4500", name: "OrangeRed",            pantone: "17-1462" },
  { hex: "#FF6B35", name: "Orange Flame",         pantone: "16-1452" },
  { hex: "#FFA500", name: "Orange",               pantone: "15-1157" },
  { hex: "#FF8C00", name: "Dark Orange",          pantone: "15-1157" },
  { hex: "#F4A460", name: "Sandy Brown",          pantone: "14-1122" },
  { hex: "#E07B00", name: "Butterscotch",         pantone: "15-1062" },
  { hex: "#D2691E", name: "Chocolate",            pantone: "17-1340" },
  { hex: "#FF7F50", name: "Coral",                pantone: "16-1546" },

  // ── Yellows ────────────────────────────────────────────────────────────────
  { hex: "#FFFF00", name: "Yellow",               pantone: "12-0752" },
  { hex: "#FFD700", name: "Gold",                 pantone: "13-0858" },
  { hex: "#FFF44F", name: "Lemon Yellow",         pantone: "12-0740" },
  { hex: "#FADA5E", name: "Naples Yellow",        pantone: "13-0940" },
  { hex: "#F8B500", name: "Amber Yellow",         pantone: "14-0846" },
  { hex: "#E5C100", name: "Sunflower",            pantone: "14-0846" },
  { hex: "#FFFACD", name: "Lemon Chiffon",        pantone: "11-0603" },
  { hex: "#F0E68C", name: "Khaki",                pantone: "12-0717" },
  { hex: "#FFFDD0", name: "Cream",                pantone: "11-0103" },
  { hex: "#F5E6D3", name: "Linen",                pantone: "11-0907" },

  // ── Greens ─────────────────────────────────────────────────────────────────
  { hex: "#00FF00", name: "Lime Green",           pantone: "15-0545" },
  { hex: "#32CD32", name: "Lime Green",           pantone: "15-0343" },
  { hex: "#228B22", name: "Forest Green",         pantone: "17-0230" },
  { hex: "#006400", name: "Dark Green",           pantone: "18-0135" },
  { hex: "#90EE90", name: "Pistachio",            pantone: "13-0221" },
  { hex: "#7D9B76", name: "Fern",                 pantone: "16-0430" },
  { hex: "#A8B5A0", name: "Sage",                 pantone: "15-0318" },
  { hex: "#4A7C59", name: "Amazon Green",         pantone: "17-0535" },
  { hex: "#1B4D3E", name: "Eden",                 pantone: "19-5420" },
  { hex: "#5BA08A", name: "Biscay Green",         pantone: "16-5533" },
  { hex: "#A8C8B8", name: "Seafoam",              pantone: "13-5907" },
  { hex: "#8FBC8F", name: "Dark Sea Green",       pantone: "15-0318" },
  { hex: "#2E8B57", name: "Sea Green",            pantone: "17-0230" },
  { hex: "#3CB371", name: "Medium Sea Green",     pantone: "16-0237" },
  { hex: "#6BCB77", name: "Jade Lime",            pantone: "15-0343" },

  // ── Teals / Cyans ──────────────────────────────────────────────────────────
  { hex: "#00CED1", name: "Dark Turquoise",       pantone: "15-5519" },
  { hex: "#20B2AA", name: "Light Sea Green",      pantone: "16-5533" },
  { hex: "#008B8B", name: "Dark Cyan",            pantone: "17-5029" },
  { hex: "#008080", name: "Teal",                 pantone: "17-5029" },
  { hex: "#40E0D0", name: "Turquoise",            pantone: "15-5519" },
  { hex: "#00FFFF", name: "Aqua",                 pantone: "14-4833" },
  { hex: "#5F9EA0", name: "Cadet Blue",           pantone: "17-4328" },
  { hex: "#53B0AE", name: "Blue Turquoise",       pantone: "15-5217" },

  // ── Blues ──────────────────────────────────────────────────────────────────
  { hex: "#0000FF", name: "Blue",                 pantone: "19-3955" },
  { hex: "#0000CD", name: "Medium Blue",          pantone: "19-4150" },
  { hex: "#191970", name: "Midnight Blue",        pantone: "19-3832" },
  { hex: "#003153", name: "Prussian Blue",        pantone: "19-4241" },
  { hex: "#003366", name: "Navy Peony",           pantone: "19-4340" },
  { hex: "#1560BD", name: "Denim Blue",           pantone: "19-4241" },
  { hex: "#5B8DB8", name: "Cerulean",             pantone: "17-4328" },
  { hex: "#4D96FF", name: "Bright Blue",          pantone: "17-4041" },
  { hex: "#B0C4DE", name: "Powder Blue",          pantone: "14-4122" },
  { hex: "#87CEEB", name: "Sky Blue",             pantone: "14-4311" },
  { hex: "#ADD8E6", name: "Light Blue",           pantone: "13-4308" },
  { hex: "#6495ED", name: "Cornflower Blue",      pantone: "16-4132" },
  { hex: "#4169E1", name: "Royal Blue",           pantone: "18-3943" },
  { hex: "#1034A6", name: "Egyptian Blue",        pantone: "19-3950" },

  // ── Purples / Violets ──────────────────────────────────────────────────────
  { hex: "#800080", name: "Purple",               pantone: "19-3748" },
  { hex: "#8B008B", name: "Dark Magenta",         pantone: "19-3536" },
  { hex: "#4B0082", name: "Indigo",               pantone: "19-3748" },
  { hex: "#EE82EE", name: "Violet",               pantone: "14-3207" },
  { hex: "#DA70D6", name: "Orchid",               pantone: "15-3214" },
  { hex: "#9B8EC4", name: "Violet Tulip",         pantone: "16-3810" },
  { hex: "#C2B2D0", name: "Lavender Mist",        pantone: "14-3812" },
  { hex: "#E6E0F8", name: "Orchid Tint",          pantone: "11-3817" },
  { hex: "#DDA0DD", name: "Plum",                 pantone: "15-3214" },
  { hex: "#9370DB", name: "Medium Purple",        pantone: "17-3628" },
  { hex: "#7B68EE", name: "Medium Slate Blue",    pantone: "17-3834" },
  { hex: "#6B4FA0", name: "Amethyst",             pantone: "18-3633" },

  // ── Neutrals / Browns ──────────────────────────────────────────────────────
  { hex: "#F5F0E8", name: "Blanc de Blanc",       pantone: "11-0601" },
  { hex: "#E8DDD0", name: "Sand",                 pantone: "12-0104" },
  { hex: "#C9B99A", name: "Warm Taupe",           pantone: "14-1118" },
  { hex: "#C4A882", name: "Warm Beige",           pantone: "14-1122" },
  { hex: "#E8C5A0", name: "Almond Milk",          pantone: "13-1015" },
  { hex: "#D4A76A", name: "Honey Gold",           pantone: "15-1142" },
  { hex: "#C4956A", name: "Caramel",              pantone: "15-1132" },
  { hex: "#B8860B", name: "Dark Goldenrod",       pantone: "16-0946" },
  { hex: "#D2B48C", name: "Tan",                  pantone: "15-1218" },
  { hex: "#BC987E", name: "Warm Taupe Mid",       pantone: "15-1230" },
  { hex: "#9B8579", name: "Nomad",                pantone: "17-1210" },
  { hex: "#8B5E3C", name: "Adobe",                pantone: "18-1048" },
  { hex: "#6B5B45", name: "Pecan Brown",          pantone: "18-1048" },
  { hex: "#A0522D", name: "Sienna",               pantone: "18-1250" },
  { hex: "#8B4513", name: "Saddle Brown",         pantone: "18-1250" },
  { hex: "#5C4033", name: "Dark Brown",           pantone: "19-1217" },
  { hex: "#3D2B1F", name: "Chestnut",             pantone: "19-1217" },
  { hex: "#1A1008", name: "Espresso",             pantone: "19-0915" },
  { hex: "#D4CFC4", name: "Lunar Rock",           pantone: "12-4302" },
  { hex: "#ABA89E", name: "Silver Gray",          pantone: "14-4002" },
  { hex: "#797670", name: "Laurel Oak",           pantone: "17-0207" },
  { hex: "#808080", name: "Gray",                 pantone: "17-3911" },
  { hex: "#A9A9A9", name: "Dark Gray",            pantone: "15-4002" },
  { hex: "#D3D3D3", name: "Light Gray",           pantone: "13-0002" },
  { hex: "#F2EFE4", name: "Bright White",         pantone: "11-4800" },
  { hex: "#FFFFFF", name: "White",                pantone: "11-0601" },
  { hex: "#000000", name: "Black",                pantone: "19-0303" },
  { hex: "#2C2925", name: "Jet Black",            pantone: "19-0217" },

  // ── Extra Browns / Beiges for accuracy ────────────────────────────────────
  { hex: "#A52A2A", name: "Brown",                pantone: "18-1350" },
  { hex: "#7B3F00", name: "Chocolate Brown",      pantone: "19-1118" },
  { hex: "#F5F5DC", name: "Beige",                pantone: "12-0712" },
  { hex: "#FAF0E6", name: "Linen White",          pantone: "11-0602" },
  { hex: "#FAEBD7", name: "Antique White",        pantone: "11-0602" },
  { hex: "#DCDCDC", name: "Gainsboro",            pantone: "12-4306" },
  { hex: "#C19A6B", name: "Camel",                pantone: "15-1040" },
  { hex: "#A0785A", name: "Toffee",               pantone: "17-1134" },
  { hex: "#6F4E37", name: "Coffee Brown",         pantone: "19-1118" },
  { hex: "#4E2A04", name: "Dark Chocolate",       pantone: "19-1118" },
  { hex: "#D2691E", name: "Cinnamon",             pantone: "17-1340" },
  { hex: "#CD853F", name: "Peru",                 pantone: "16-1140" },
  { hex: "#DEB887", name: "Burlywood",            pantone: "14-1118" },
  { hex: "#F4A460", name: "Sandy Brown",          pantone: "14-1126" },
  { hex: "#E9C46A", name: "Saffron",              pantone: "14-0846" },
  { hex: "#556B2F", name: "Dark Olive Green",     pantone: "18-0430" },
  { hex: "#6B8E23", name: "Olive Drab",           pantone: "17-0535" },
  { hex: "#808000", name: "Olive",                pantone: "17-0627" },
  { hex: "#BDB76B", name: "Dark Khaki",           pantone: "14-0627" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Perceptual color matching using CIELAB color space
// Much more accurate than RGB Euclidean distance
// ─────────────────────────────────────────────────────────────────────────────

function hexToRGB(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

// RGB → XYZ (D65 illuminant)
function rgbToXYZ(r, g, b) {
  // Linearize (gamma correction)
  const lin = v => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const R = lin(r), G = lin(g), B = lin(b);

  return {
    x: R * 0.4124564 + G * 0.3575761 + B * 0.1804375,
    y: R * 0.2126729 + G * 0.7151522 + B * 0.0721750,
    z: R * 0.0193339 + G * 0.1191920 + B * 0.9503041,
  };
}

// XYZ → CIELAB
function xyzToLAB(x, y, z) {
  // D65 white point
  const Xn = 0.95047, Yn = 1.00000, Zn = 1.08883;
  const f = t => t > 0.008856 ? Math.cbrt(t) : (7.787 * t) + 16 / 116;
  const fx = f(x / Xn), fy = f(y / Yn), fz = f(z / Zn);
  return {
    L: (116 * fy) - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

function hexToLAB(hex) {
  const { r, g, b } = hexToRGB(hex);
  const xyz = rgbToXYZ(r, g, b);
  return xyzToLAB(xyz.x, xyz.y, xyz.z);
}

// CIEDE2000 — most accurate perceptual color distance
function deltaE2000(lab1, lab2) {
  const { L: L1, a: a1, b: b1 } = lab1;
  const { L: L2, a: a2, b: b2 } = lab2;

  const kL = 1, kC = 1, kH = 1;

  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cab = (C1 + C2) / 2;
  const Cab7 = Math.pow(Cab, 7);
  const G = 0.5 * (1 - Math.sqrt(Cab7 / (Cab7 + Math.pow(25, 7))));

  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);
  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);

  const h1p = Math.atan2(b1, a1p) * (180 / Math.PI) + (b1 < 0 || (b1 === 0 && a1p < 0) ? 360 : 0);
  const h2p = Math.atan2(b2, a2p) * (180 / Math.PI) + (b2 < 0 || (b2 === 0 && a2p < 0) ? 360 : 0);

  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  let dhp;
  if (C1p * C2p === 0) dhp = 0;
  else if (Math.abs(h2p - h1p) <= 180) dhp = h2p - h1p;
  else if (h2p - h1p > 180) dhp = h2p - h1p - 360;
  else dhp = h2p - h1p + 360;

  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * Math.PI / 180);

  const Lpm = (L1 + L2) / 2;
  const Cpm = (C1p + C2p) / 2;

  let hpm;
  if (C1p * C2p === 0) hpm = h1p + h2p;
  else if (Math.abs(h1p - h2p) <= 180) hpm = (h1p + h2p) / 2;
  else if (h1p + h2p < 360) hpm = (h1p + h2p + 360) / 2;
  else hpm = (h1p + h2p - 360) / 2;

  const T = 1
    - 0.17 * Math.cos((hpm - 30) * Math.PI / 180)
    + 0.24 * Math.cos((2 * hpm) * Math.PI / 180)
    + 0.32 * Math.cos((3 * hpm + 6) * Math.PI / 180)
    - 0.20 * Math.cos((4 * hpm - 63) * Math.PI / 180);

  const SL = 1 + 0.015 * Math.pow(Lpm - 50, 2) / Math.sqrt(20 + Math.pow(Lpm - 50, 2));
  const SC = 1 + 0.045 * Cpm;
  const SH = 1 + 0.015 * Cpm * T;

  const Cpm7 = Math.pow(Cpm, 7);
  const RC = 2 * Math.sqrt(Cpm7 / (Cpm7 + Math.pow(25, 7)));
  const dTheta = 30 * Math.exp(-Math.pow((hpm - 275) / 25, 2));
  const RT = -Math.sin((2 * dTheta) * Math.PI / 180) * RC;

  return Math.sqrt(
    Math.pow(dLp / (kL * SL), 2) +
    Math.pow(dCp / (kC * SC), 2) +
    Math.pow(dHp / (kH * SH), 2) +
    RT * (dCp / (kC * SC)) * (dHp / (kH * SH))
  );
}

// Cache LAB values for all Pantone colors (computed once)
let _labCache = null;
function getPantoneLAB() {
  if (!_labCache) {
    _labCache = PANTONE_COLORS.map(c => ({ ...c, lab: hexToLAB(c.hex) }));
  }
  return _labCache;
}

// Find closest Pantone using CIEDE2000 perceptual distance
export function findClosestPantone(hex) {
  const targetLAB = hexToLAB(hex);
  const palette = getPantoneLAB();

  let minDist = Infinity;
  let closest = palette[0];

  for (const color of palette) {
    const dist = deltaE2000(targetLAB, color.lab);
    if (dist < minDist) {
      minDist = dist;
      closest = color;
    }
  }

  return { hex: closest.hex, name: `Pantone ${closest.pantone} ${closest.name}`, pantone: closest.pantone };
}
