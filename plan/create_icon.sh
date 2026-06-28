#!/bin/bash
# Создаёт иконку Plan.app на рабочем столе
DIR="$(cd "$(dirname "$0")" && pwd)"
DESKTOP="$HOME/Desktop"
APP="$DESKTOP/Plan.app"

echo "Создаю иконку на рабочем столе..."

# ── 1. Собираем .app bundle ───────────────────────────────────────────────
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS"
mkdir -p "$APP/Contents/Resources"

# ── 2. Исполняемый скрипт внутри .app ────────────────────────────────────
cat > "$APP/Contents/MacOS/plan" <<SCRIPT
#!/bin/bash
DIR="$DIR"
LOG="\$DIR/plan.log"

# Убиваем старый процесс
pkill -f "node \$DIR/server.js" 2>/dev/null
sleep 0.5

# Запускаем сервер
cd "\$DIR"
nohup node server.js > "\$LOG" 2>&1 &

# Ждём пока поднимется
for i in \$(seq 1 20); do
  curl -s http://localhost:5005 > /dev/null 2>&1 && break
  sleep 0.3
done

open http://localhost:5005
SCRIPT
chmod +x "$APP/Contents/MacOS/plan"

# ── 3. Info.plist ─────────────────────────────────────────────────────────
cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>Plan</string>
  <key>CFBundleDisplayName</key><string>Plan</string>
  <key>CFBundleIdentifier</key><string>com.plan.app</string>
  <key>CFBundleVersion</key><string>1.0</string>
  <key>CFBundleExecutable</key><string>plan</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>LSUIElement</key><false/>
</dict>
</plist>
PLIST

# ── 4. Иконка из SVG → PNG → icns ────────────────────────────────────────
SVG="$DIR/static/icons/icon.svg"
ICONSET="$DIR/static/icons/AppIcon.iconset"
mkdir -p "$ICONSET"

# Рендерим PNG через qlmanage (встроен в macOS)
for SIZE in 16 32 64 128 256 512; do
  qlmanage -t -s $SIZE -o "$ICONSET" "$SVG" 2>/dev/null
  # qlmanage добавляет .png к имени файла
  RENDERED="$ICONSET/icon.svg.png"
  [ -f "$RENDERED" ] && mv "$RENDERED" "$ICONSET/icon_${SIZE}x${SIZE}.png"
done

# Альтернатива если qlmanage не отработал — рисуем простую PNG через Python
if [ ! -f "$ICONSET/icon_512x512.png" ]; then
python3 - <<'PYEOF'
import struct, zlib, os

def make_png(size, r=192, g=21, b=42):
    def chunk(tag, data):
        c = zlib.crc32(tag + data) & 0xffffffff
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', c)
    ihdr = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    raw = b''
    for y in range(size):
        row = b'\x00'
        for x in range(size):
            # rounded rect
            cx, cy = size/2, size/2
            rx = abs(x - cx) / (size/2)
            ry = abs(y - cy) / (size/2)
            corner = size * 0.22
            dx, dy = abs(x - cx), abs(y - cy)
            lim = size/2 - corner
            in_shape = True
            if dx > lim and dy > lim:
                dist = ((dx - lim)**2 + (dy - lim)**2)**0.5
                in_shape = dist < corner
            if in_shape:
                # gradient: dark at edges, lighter center
                d = ((x-cx)**2+(y-cy)**2)**0.5 / (size*0.7)
                pr = min(255, int(r + (255-r)*d*0.3))
                pg = min(255, int(g + d*20))
                pb = min(255, int(b + d*60))
                row += bytes([pr, pg, pb])
            else:
                row += b'\x00\x00\x00'
        raw += row
    idat = zlib.compress(raw)
    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', ihdr)
    png += chunk(b'IDAT', idat)
    png += chunk(b'IEND', b'')
    return png

iconset = os.path.expanduser('~/Plan/plan/static/icons/AppIcon.iconset')
os.makedirs(iconset, exist_ok=True)
for sz in [16, 32, 64, 128, 256, 512, 1024]:
    with open(f'{iconset}/icon_{sz}x{sz}.png', 'wb') as f:
        f.write(make_png(sz))
    if sz <= 512:
        with open(f'{iconset}/icon_{sz}x{sz}@2x.png', 'wb') as f:
            f.write(make_png(sz*2))
print('PNG готовы')
PYEOF
fi

# Конвертируем iconset → icns
if [ -d "$ICONSET" ] && ls "$ICONSET"/*.png &>/dev/null; then
  iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/AppIcon.icns" 2>/dev/null && \
    echo "Иконка создана" || echo "icns пропущен, используется системная иконка"
fi

rm -rf "$ICONSET"

# ── 5. Разрешаем запуск (убираем карантин) ───────────────────────────────
xattr -cr "$APP" 2>/dev/null

echo ""
echo "  ✓ Иконка Plan появилась на рабочем столе"
echo "  Двойной клик — запускает приложение"
echo ""
