#!/bin/bash

set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
RESET='\033[0m'
BOLD='\033[1m'

echo ""
echo -e "${CYAN}${BOLD}  ▓▓▓  CHROMIA — Color Palette Studio  ▓▓▓${RESET}"
echo -e "  ${YELLOW}Pantone® Referenced${RESET}  ·  ${GREEN}2026 Trends${RESET}"
echo ""

# ── Check Node.js ─────────────────────────────────────────
echo -e "${BOLD}Checking prerequisites...${RESET}"

if ! command -v node >/dev/null 2>&1; then
  echo -e "${YELLOW}Node.js not found. Installing via Homebrew...${RESET}"
  if ! command -v brew >/dev/null 2>&1; then
    echo -e "${RED}Homebrew not found. Installing Homebrew...${RESET}"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    if [ -f /opt/homebrew/bin/brew ]; then
      eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
  fi
  brew install node
fi

echo -e "  ${GREEN}✓${RESET} Node.js $(node --version)"
echo -e "  ${GREEN}✓${RESET} npm $(npm --version)"

# ── Install dependencies ──────────────────────────────────
echo ""
echo -e "${BOLD}Installing dependencies...${RESET}"
npm install --silent
echo -e "  ${GREEN}✓${RESET} All packages installed"

# ── Get script directory ──────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Create launcher script ────────────────────────────────
echo ""
echo -e "${BOLD}Creating launcher...${RESET}"

LAUNCHER="$SCRIPT_DIR/chromia.sh"
printf '#!/bin/bash\n' > "$LAUNCHER"
printf 'cd "%s"\n' "$SCRIPT_DIR" >> "$LAUNCHER"
printf 'echo "Starting CHROMIA..."\n' >> "$LAUNCHER"
printf 'npm run dev -- --open\n' >> "$LAUNCHER"
chmod +x "$LAUNCHER"
echo -e "  ${GREEN}✓${RESET} Launcher: $LAUNCHER"

# ── macOS App Bundle ──────────────────────────────────────
if [[ "$(uname)" == "Darwin" ]]; then
  echo ""
  echo -e "${BOLD}Creating macOS app bundle...${RESET}"

  APP_DIR="$HOME/Applications/Chromia.app"
  MACOS_DIR="$APP_DIR/Contents/MacOS"
  mkdir -p "$MACOS_DIR"

  # Info.plist
  PLIST="$APP_DIR/Contents/Info.plist"
  printf '<?xml version="1.0" encoding="UTF-8"?>\n' > "$PLIST"
  printf '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n' >> "$PLIST"
  printf '<plist version="1.0"><dict>\n' >> "$PLIST"
  printf '  <key>CFBundleExecutable</key><string>chromia</string>\n' >> "$PLIST"
  printf '  <key>CFBundleIdentifier</key><string>studio.chromia.palette</string>\n' >> "$PLIST"
  printf '  <key>CFBundleName</key><string>Chromia</string>\n' >> "$PLIST"
  printf '  <key>CFBundleDisplayName</key><string>Chromia</string>\n' >> "$PLIST"
  printf '  <key>CFBundleVersion</key><string>1.0.0</string>\n' >> "$PLIST"
  printf '  <key>CFBundleShortVersionString</key><string>1.0</string>\n' >> "$PLIST"
  printf '  <key>CFBundlePackageType</key><string>APPL</string>\n' >> "$PLIST"
  printf '  <key>NSHighResolutionCapable</key><true/>\n' >> "$PLIST"
  printf '</dict></plist>\n' >> "$PLIST"

  # Executable
  APP_BIN="$MACOS_DIR/chromia"
  printf '#!/bin/bash\n' > "$APP_BIN"
  printf 'cd "%s"\n' "$SCRIPT_DIR" >> "$APP_BIN"
  printf 'npm run dev >/tmp/chromia.log 2>&1 &\n' >> "$APP_BIN"
  printf 'SERVER_PID=$!\n' >> "$APP_BIN"
  printf 'sleep 2\n' >> "$APP_BIN"
  printf 'for i in $(seq 1 20); do\n' >> "$APP_BIN"
  printf '  curl -s http://localhost:3000 >/dev/null 2>&1 && break\n' >> "$APP_BIN"
  printf '  sleep 0.5\n' >> "$APP_BIN"
  printf 'done\n' >> "$APP_BIN"
  printf 'open http://localhost:3000\n' >> "$APP_BIN"
  printf 'wait $SERVER_PID\n' >> "$APP_BIN"
  chmod +x "$APP_BIN"

  echo -e "  ${GREEN}✓${RESET} App bundle: $APP_DIR"
fi

# ── Done ──────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}Installation complete!${RESET}"
echo ""
echo -e "  To launch CHROMIA:"
echo -e "    ${CYAN}./chromia.sh${RESET}"
if [[ "$(uname)" == "Darwin" ]]; then
  echo -e "    ${CYAN}open ~/Applications/Chromia.app${RESET}"
fi
echo -e "    ${CYAN}npm start${RESET}"
echo ""
