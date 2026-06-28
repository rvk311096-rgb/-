#!/bin/bash

# Generate beautiful .icns icon for CHROMIA macOS app bundle
set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
RESET='\033[0m'
BOLD='\033[1m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$HOME/Applications/Chromia.app"
ICONSET="/tmp/Chromia.iconset"
SVG_SRC="$SCRIPT_DIR/public/icon.svg"
TMP_PNG="/tmp/chromia-src-1024.png"

echo ""
echo -e "${BOLD}Generating CHROMIA icon...${RESET}"

# ── Step 1: SVG → 1024px PNG ──────────────────────────────
# Try sips (macOS native, works on Ventura+)
if sips --help 2>&1 | grep -q "format"; then
  sips -s format png "$SVG_SRC" --out "$TMP_PNG" --resampleHeightWidth 1024 1024 >/dev/null 2>&1 && SVG_OK=1
fi

# Fallback: qlmanage (QuickLook renderer, always available)
if [ -z "$SVG_OK" ]; then
  QL_DIR="/tmp/chromia-ql"
  mkdir -p "$QL_DIR"
  qlmanage -t -s 1024 -o "$QL_DIR" "$SVG_SRC" >/dev/null 2>&1
  QLFILE=$(find "$QL_DIR" -name "*.png" | head -1)
  if [ -n "$QLFILE" ]; then
    cp "$QLFILE" "$TMP_PNG"
    SVG_OK=1
  fi
fi

# Fallback: Python draw (stdlib only, minimal but works)
if [ -z "$SVG_OK" ]; then
  python3 - "$TMP_PNG" <<'PYEOF'
import sys, struct, zlib, math

def make_png(size=1024):
    data = []
    cx = cy = size / 2
    r = size / 2

    for y in range(size):
        row = []
        for x in range(size):
            dx, dy = x - cx, y - cy
            dist = math.sqrt(dx*dx + dy*dy)
            angle = math.atan2(dy, dx)  # -pi to pi

            # Outside circle
            if dist > r:
                row += [10, 10, 15, 0]; continue

            # Inner circle (center logo area)
            if dist < r * 0.31:
                row += [17, 17, 30, 255]; continue

            # Quadrant colors
            if angle < -math.pi/2:    # top-left: pink
                base = (255, 107, 157)
            elif angle < 0:            # top-right: blue
                base = (77, 150, 255)
            elif angle < math.pi/2:   # bottom-right: green
                base = (107, 203, 119)
            else:                      # bottom-left: yellow
                base = (248, 181, 0)

            # Fade to dark at edges
            fade = max(0, min(1, (r - dist) / (r * 0.15)))
            col = [int(c * (0.7 + 0.3 * fade)) for c in base]
            row += col + [255]

        data.append(bytes(row))

    # Build PNG
    def chunk(name, d):
        c = zlib.crc32(name + d) & 0xffffffff
        return struct.pack('>I', len(d)) + name + d + struct.pack('>I', c)

    raw = b''
    for row in data:
        raw += b'\x04' + row  # filter type 4

    ihdr = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    idat = zlib.compress(raw, 9)

    return (b'\x89PNG\r\n\x1a\n' +
            chunk(b'IHDR', ihdr) +
            chunk(b'IDAT', idat) +
            chunk(b'IEND', b''))

with open(sys.argv[1], 'wb') as f:
    f.write(make_png(512))
PYEOF
  SVG_OK=1
fi

if [ -z "$SVG_OK" ] || [ ! -f "$TMP_PNG" ]; then
  echo "Could not generate source PNG. Please install librsvg: brew install librsvg"
  exit 1
fi

echo -e "  ${GREEN}✓${RESET} Source PNG generated"

# ── Step 2: Create .iconset with all required sizes ────────
rm -rf "$ICONSET"
mkdir -p "$ICONSET"

declare -a SIZES=(16 32 64 128 256 512)

for SIZE in "${SIZES[@]}"; do
  sips -z $SIZE $SIZE "$TMP_PNG" --out "$ICONSET/icon_${SIZE}x${SIZE}.png" >/dev/null 2>&1
  DOUBLE=$((SIZE * 2))
  sips -z $DOUBLE $DOUBLE "$TMP_PNG" --out "$ICONSET/icon_${SIZE}x${SIZE}@2x.png" >/dev/null 2>&1
done

echo -e "  ${GREEN}✓${RESET} Icon sizes generated (16–1024px)"

# ── Step 3: iconutil → .icns ───────────────────────────────
ICNS_OUT="$SCRIPT_DIR/public/AppIcon.icns"
iconutil -c icns "$ICONSET" -o "$ICNS_OUT"
echo -e "  ${GREEN}✓${RESET} AppIcon.icns created"

# ── Step 4: Install into app bundle ───────────────────────
if [ -d "$APP_DIR" ]; then
  RES_DIR="$APP_DIR/Contents/Resources"
  mkdir -p "$RES_DIR"
  cp "$ICNS_OUT" "$RES_DIR/AppIcon.icns"

  # Update Info.plist to reference the icon
  PLIST="$APP_DIR/Contents/Info.plist"
  if [ -f "$PLIST" ]; then
    # Add/replace CFBundleIconFile entry
    python3 - "$PLIST" <<'PYEOF'
import sys, re
path = sys.argv[1]
with open(path) as f: content = f.read()
# Remove existing icon key if present
content = re.sub(r'\s*<key>CFBundleIconFile</key>\s*<string>[^<]*</string>', '', content)
# Insert before closing </dict>
content = content.replace('</dict></plist>',
    '  <key>CFBundleIconFile</key><string>AppIcon</string>\n</dict></plist>')
with open(path, 'w') as f: f.write(content)
PYEOF
  fi

  # Force Finder to refresh icon cache
  touch "$APP_DIR"
  killall Finder 2>/dev/null || true
  echo -e "  ${GREEN}✓${RESET} Icon installed to app bundle"
fi

# ── Step 5: Desktop shortcut ───────────────────────────────
DESKTOP_LINK="$HOME/Desktop/Chromia.app"
if [ ! -e "$DESKTOP_LINK" ]; then
  ln -s "$APP_DIR" "$DESKTOP_LINK"
  echo -e "  ${GREEN}✓${RESET} Desktop shortcut created"
fi

echo ""
echo -e "${GREEN}${BOLD}Done!${RESET} CHROMIA icon is ready."
echo -e "  Look for it on your Desktop and in ${CYAN}~/Applications${RESET}"
echo ""
