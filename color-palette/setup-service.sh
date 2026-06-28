#!/bin/bash

# CHROMIA — install as macOS background service (LaunchAgent)
# After this: server starts on login, no terminal needed ever

set -e
GREEN='\033[0;32m'; CYAN='\033[0;36m'; RESET='\033[0m'; BOLD='\033[1m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="$SCRIPT_DIR/dist"
PLIST_ID="studio.chromia.palette"
PLIST_PATH="$HOME/Library/LaunchAgents/${PLIST_ID}.plist"
APP_DIR="$HOME/Applications/Chromia.app"

echo ""
echo -e "${BOLD}  CHROMIA — Background Service Setup${RESET}"
echo ""

# ── 1. Build static files ─────────────────────────────────
echo -e "${BOLD}Building static app...${RESET}"
cd "$SCRIPT_DIR"
npm run build --silent
echo -e "  ${GREEN}✓${RESET} Static build ready: $DIST_DIR"

# ── 2. Create LaunchAgent plist ───────────────────────────
echo -e "${BOLD}Creating LaunchAgent...${RESET}"
mkdir -p "$HOME/Library/LaunchAgents"

printf '<?xml version="1.0" encoding="UTF-8"?>\n' > "$PLIST_PATH"
printf '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n' >> "$PLIST_PATH"
printf '<plist version="1.0"><dict>\n' >> "$PLIST_PATH"
printf '  <key>Label</key><string>%s</string>\n' "$PLIST_ID" >> "$PLIST_PATH"
printf '  <key>ProgramArguments</key><array>\n' >> "$PLIST_PATH"
printf '    <string>/usr/bin/python3</string>\n' >> "$PLIST_PATH"
printf '    <string>-m</string>\n' >> "$PLIST_PATH"
printf '    <string>http.server</string>\n' >> "$PLIST_PATH"
printf '    <string>3000</string>\n' >> "$PLIST_PATH"
printf '    <string>--directory</string>\n' >> "$PLIST_PATH"
printf '    <string>%s</string>\n' "$DIST_DIR" >> "$PLIST_PATH"
printf '  </array>\n' >> "$PLIST_PATH"
printf '  <key>WorkingDirectory</key><string>%s</string>\n' "$DIST_DIR" >> "$PLIST_PATH"
printf '  <key>RunAtLoad</key><true/>\n' >> "$PLIST_PATH"
printf '  <key>KeepAlive</key><true/>\n' >> "$PLIST_PATH"
printf '  <key>StandardOutPath</key><string>/tmp/chromia.log</string>\n' >> "$PLIST_PATH"
printf '  <key>StandardErrorPath</key><string>/tmp/chromia.log</string>\n' >> "$PLIST_PATH"
printf '</dict></plist>\n' >> "$PLIST_PATH"

echo -e "  ${GREEN}✓${RESET} LaunchAgent created"

# ── 3. Load service (start now + on every login) ──────────
launchctl unload "$PLIST_PATH" 2>/dev/null || true
launchctl load "$PLIST_PATH"
sleep 1
echo -e "  ${GREEN}✓${RESET} Service running (starts automatically on login)"

# ── 4. Update .app bundle — just opens browser ────────────
if [ -d "$APP_DIR" ]; then
  APP_BIN="$APP_DIR/Contents/MacOS/chromia"
  printf '#!/bin/bash\n' > "$APP_BIN"
  printf '# Wait for server if not yet ready\n' >> "$APP_BIN"
  printf 'for i in $(seq 1 10); do\n' >> "$APP_BIN"
  printf '  curl -s http://localhost:3000 >/dev/null 2>&1 && break\n' >> "$APP_BIN"
  printf '  sleep 0.5\n' >> "$APP_BIN"
  printf 'done\n' >> "$APP_BIN"
  printf 'open http://localhost:3000\n' >> "$APP_BIN"
  chmod +x "$APP_BIN"
  echo -e "  ${GREEN}✓${RESET} Desktop app updated (opens browser only)"
fi

# ── 5. Desktop shortcut ───────────────────────────────────
INVISIBLE=$(printf '\xc2\xa0')
rm -f "$HOME/Desktop/Chromia.app" "$HOME/Desktop/${INVISIBLE}.app" 2>/dev/null || true
ln -sf "$APP_DIR" "$HOME/Desktop/${INVISIBLE}.app"
echo -e "  ${GREEN}✓${RESET} Desktop icon ready (no label)"

# ── Done ──────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}Done!${RESET}"
echo ""
echo -e "  ${CYAN}http://localhost:3000${RESET} — приложение уже работает"
echo -e "  Двойной клик на иконке рабочего стола — откроет браузер"
echo -e "  Сервер стартует автоматически при каждом входе в систему"
echo -e "  RAM: ~15 MB (python3 http.server)"
echo ""

# Open immediately
open http://localhost:3000
