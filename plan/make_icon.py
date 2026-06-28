"""
Генерирует Plan.app с красивой иконкой и кладёт на рабочий стол.
Запуск: python3 make_icon.py
"""
import os, sys, math, struct, zlib, subprocess, shutil

HOME    = os.path.expanduser('~')
PLAN    = os.path.join(HOME, 'Plan', 'plan')
DESKTOP = os.path.join(HOME, 'Desktop')
APP     = os.path.join(DESKTOP, 'Plan.app')

# ── PNG writer (stdlib only) ──────────────────────────────────────────────
def png(pixels, size):
    def chunk(tag, data):
        c = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', c)
    raw = b''.join(b'\x00' + bytes(pixels[y]) for y in range(size))
    return (b'\x89PNG\r\n\x1a\n'
            + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(raw, 9))
            + chunk(b'IEND', b''))

def clamp(v): return max(0, min(255, int(v)))

def render(size):
    S   = size
    cx  = cy = S / 2
    r   = S * 0.46          # радиус скругления фона
    out = []

    for y in range(S):
        row = []
        for x in range(S):
            # ── Rounded rect mask ──────────────────────────────────────
            dx = abs(x - cx) - (cx - r)
            dy = abs(y - cy) - (cy - r)
            if dx > 0 and dy > 0:
                dist = math.sqrt(dx*dx + dy*dy)
                if dist > r:
                    row += [0, 0, 0]; continue
                aa = clamp(255 * (r - dist))
            else:
                aa = 255

            # ── Background gradient ────────────────────────────────────
            # base: очень тёмный, чуть синий
            bg = [8, 6, 18]

            # ── Crimson glow (верх-лево) ───────────────────────────────
            gx, gy = S * 0.3, S * 0.28
            gdist  = math.sqrt((x-gx)**2 + (y-gy)**2) / (S * 0.65)
            gi     = max(0.0, 1.0 - gdist)
            gi     = gi ** 1.8
            bg[0]  = clamp(bg[0] + 175 * gi)
            bg[1]  = clamp(bg[1] +  10 * gi)
            bg[2]  = clamp(bg[2] +  22 * gi)

            # ── Blue glow (низ-право) ──────────────────────────────────
            bx, by = S * 0.72, S * 0.72
            bdist  = math.sqrt((x-bx)**2 + (y-by)**2) / (S * 0.55)
            bi     = max(0.0, 1.0 - bdist)
            bi     = bi ** 2.0
            bg[0]  = clamp(bg[0] +  12 * bi)
            bg[1]  = clamp(bg[1] +  22 * bi)
            bg[2]  = clamp(bg[2] + 100 * bi)

            # ── Letter P ───────────────────────────────────────────────
            # Вертикальная штанга
            px0 = S * 0.295; px1 = S * 0.395
            py0 = S * 0.235; py1 = S * 0.765
            # Полукруг (bump) справа от штанги
            bumpCX = S * 0.395; bumpCY = S * 0.38
            bumpR  = S * 0.168
            bumpT  = S * 0.235; bumpB  = S * 0.525
            # толщина bump
            bumpW  = S * 0.10

            in_stem  = (px0 <= x <= px1 and py0 <= y <= py1)
            bump_dist = math.sqrt((x - bumpCX)**2 + (y - bumpCY)**2)
            in_bump  = (bumpT <= y <= bumpB
                        and bump_dist >= bumpR - bumpW
                        and bump_dist <= bumpR + bumpW
                        and x >= bumpCX - 4)
            # горизонтальные перемычки
            in_top  = (px0 <= x <= px1 + bumpR + bumpW and
                       py0 <= y <= py0 + bumpW * 0.9)
            in_mid  = (px0 <= x <= px1 + bumpR * 0.35 and
                       bumpB - bumpW * 0.5 <= y <= bumpB + bumpW * 0.5)

            letter = in_stem or in_bump or in_top or in_mid

            if letter:
                # белый с лёгким свечением
                edge = min(
                    abs(x - px0), abs(x - px1),
                    abs(y - py0), abs(y - py1),
                    bump_dist - (bumpR - bumpW) if in_bump else 999,
                    (bumpR + bumpW) - bump_dist if in_bump else 999,
                )
                glow  = clamp(220 + min(edge * 6, 35))
                alpha = min(1.0, edge * 0.6 + 0.7)
                bg[0] = clamp(bg[0] * (1-alpha) + glow * alpha)
                bg[1] = clamp(bg[1] * (1-alpha) + glow * alpha)
                bg[2] = clamp(bg[2] * (1-alpha) + glow * alpha)

            # apply aa mask
            if aa < 255:
                t = aa / 255
                row += [clamp(bg[0]*t), clamp(bg[1]*t), clamp(bg[2]*t)]
            else:
                row += bg

        out.append(row)
    return out

# ── Generate all sizes ────────────────────────────────────────────────────
SIZES    = [16, 32, 128, 256, 512, 1024]
ICONSET  = '/tmp/Plan.iconset'
os.makedirs(ICONSET, exist_ok=True)

print('Рисую иконку…')
base = render(512)
base_png = png(base, 512)

# save 512 and use sips to resize others (sips встроен в macOS)
base_path = os.path.join(ICONSET, 'base_512.png')
with open(base_path, 'wb') as f:
    f.write(base_png)

pairs = [
    ('icon_16x16.png',     16),
    ('icon_16x16@2x.png',  32),
    ('icon_32x32.png',     32),
    ('icon_32x32@2x.png',  64),
    ('icon_128x128.png',  128),
    ('icon_128x128@2x.png',256),
    ('icon_256x256.png',  256),
    ('icon_256x256@2x.png',512),
    ('icon_512x512.png',  512),
    ('icon_512x512@2x.png',1024),
]

for fname, sz in pairs:
    dst = os.path.join(ICONSET, fname)
    if sz == 512:
        with open(dst, 'wb') as f: f.write(base_png)
    elif sz == 1024:
        big = render(1024)
        with open(dst, 'wb') as f: f.write(png(big, 1024))
    else:
        subprocess.run(['sips', '-z', str(sz), str(sz), base_path,
                        '--out', dst], capture_output=True)

# ── Build .icns ───────────────────────────────────────────────────────────
icns_path = '/tmp/Plan.icns'
subprocess.run(['iconutil', '-c', 'icns', ICONSET, '-o', icns_path], check=True)
print('Иконка готова')

# ── Build .app bundle ─────────────────────────────────────────────────────
shutil.rmtree(APP, ignore_errors=True)
os.makedirs(f'{APP}/Contents/MacOS')
os.makedirs(f'{APP}/Contents/Resources')

# Исполняемый файл
exe = f'{APP}/Contents/MacOS/plan'
with open(exe, 'w') as f:
    f.write(f'''#!/bin/bash
DIR="{PLAN}"
pkill -f "node $DIR/server.js" 2>/dev/null
sleep 0.3
cd "$DIR"
nohup node server.js > "$DIR/plan.log" 2>&1 &
for i in $(seq 1 25); do
  curl -s http://localhost:5005 > /dev/null 2>&1 && break
  sleep 0.3
done
open http://localhost:5005
''')
os.chmod(exe, 0o755)

# Info.plist
with open(f'{APP}/Contents/Info.plist', 'w') as f:
    f.write('''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>Plan</string>
  <key>CFBundleDisplayName</key><string>Plan</string>
  <key>CFBundleIdentifier</key><string>com.plan.app</string>
  <key>CFBundleVersion</key><string>1.0</string>
  <key>CFBundleExecutable</key><string>plan</string>
  <key>CFBundleIconFile</key><string>Plan</string>
  <key>CFBundlePackageType</key><string>APPL</string>
</dict></plist>''')

# Иконка
shutil.copy(icns_path, f'{APP}/Contents/Resources/Plan.icns')

# Убираем карантин
subprocess.run(['xattr', '-cr', APP], capture_output=True)

shutil.rmtree(ICONSET, ignore_errors=True)
os.remove(icns_path)

print(f'\n  ✓ Plan.app появился на рабочем столе\n  Двойной клик — запускает приложение\n')
