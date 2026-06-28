#!/bin/bash

# CHROMIA — Color Palette Studio
# Installation script for macOS

set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
RESET='\033[0m'
BOLD='\033[1m'

echo ""
echo -e "${CYAN}${BOLD}"
echo "  ██████╗██╗  ██╗██████╗  ██████╗ ███╗   ███╗██╗ █████╗ "
echo " ██╔════╝██║  ██║██╔══██╗██╔═══██╗████╗ ████║██║██╔══██╗"
echo " ██║     ███████║██████╔╝██║   ██║██╔████╔██║██║███████║"
echo " ██║     ██╔══██║██╔══██╗██║   ██║██║╚██╔╝██║██║██╔══██║"
echo " ╚██████╗██║  ██║██║  ██║╚██████╔╝██║ ╚═╝ ██║██║██║  ██║"
echo "  ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝╚═╝╚═╝  ╚═╝"
echo -e "${RESET}"
echo -e "  ${CYAN}Color Palette Studio${RESET}  ·  ${YELLOW}Pantone® Referenced${RESET}  ·  ${GREEN}2026 Trends${RESET}"
echo ""

# ── Check Node.js ──────────────────────────────────────────────
echo -e "${BOLD}Checking prerequisites...${RESET}"

if ! command -v node &>/dev/null; then
  echo -e "${YELLOW}Node.js not found. Installing via Homebrew...${RESET}"

  if ! command -v brew &>/dev/null; then
    echo -e "${RED}Homebrew not found. Installing Homebrew first...${RESET}"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    # Add to PATH for Apple Silicon
    if [ -f /opt/homebrew/bin/brew ]; then
      eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
  fi

  brew install node
fi

NODE_VERSION=$(node --version)
echo -e "  ${GREEN}✓${RESET} Node.js ${NODE_VERSION}"

# ── Check npm ──────────────────────────────────────────────────
if ! command -v npm &>/dev/null; then
  echo -e "${RED}npm not found. Please install Node.js from https://nodejs.org${RESET}"
  exit 1
fi
echo -e "  ${GREEN}✓${RESET} npm $(npm --version)"

# ── Install dependencies ───────────────────────────────────────
echo ""
echo -e "${BOLD}Installing dependencies...${RESET}"
npm install --silent

echo -e "  ${GREEN}✓${RESET} All packages installed"

# ── Create launcher script ────────────────────────────────────
echo ""
echo -e "${BOLD}Creating launcher...${RESET}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cat > "$SCRIPT_DIR/chromia.sh" <<LAUNCHER
#!/bin/bash
cd "$SCRIPT_DIR"
echo ""
echo "  Starting CHROMIA Color Palette Studio..."
echo "  Opening at http://localhost:3000"
echo ""
npm run dev -- --open 2>/dev/null
LAUNCHER

chmod +x "$SCRIPT_DIR/chromia.sh"
echo -e "  ${GREEN}✓${RESET} Launcher created: chromia.sh"

# ── macOS App Bundle (optional) ───────────────────────────────
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo ""
  echo -e "${BOLD}Creating macOS app bundle...${RESET}"

  APP_DIR="$HOME/Applications/Chromia.app"
  CONTENTS="$APP_DIR/Contents"
  mkdir -p "$CONTENTS/MacOS" "$CONTENTS/Resources"

  # Info.plist
  cat > "$CONTENTS/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>chromia</string>
  <key>CFBundleIconFile</key>
  <string>AppIcon</string>
  <key>CFBundleIdentifier</key>
  <string>studio.chromia.palette</string>
  <key>CFBundleName</key>
  <string>Chromia</string>
  <key>CFBundleDisplayName</key>
  <string>Chromia</string>
  <key>CFBundleVersion</key>
  <string>1.0.0</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>LSMinimumSystemVersion</key>
  <string>12.0</string>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
PLIST

  # Executable
  cat > "$CONTENTS/MacOS/chromia" <<APP
#!/bin/bash
cd "$SCRIPT_DIR"
# Start dev server in background
npm run dev &>/tmp/chromia.log &
SERVER_PID=\$!

# Wait for server to be ready
sleep 2
for i in {1..20}; do
  if curl -s http://localhost:3000 &>/dev/null; then
    break
  fi
  sleep 0.5
done

# Open in default browser
open http://localhost:3000

# Keep running until window closes
wait \$SERVER_PID
APP

  chmod +x "$CONTENTS/MacOS/chromia"

  echo -e "  ${GREEN}✓${RESET} App bundle: ~/Applications/Chromia.app"

  # ── Dock alias ────────────────────────────────────────────
  echo ""
  read -p "  Add Chromia to Dock? (y/n): " ADD_DOCK
  if [[ "$ADD_DOCK" =~ ^[Yy]$ ]]; then
    # Add to Dock via defaults
    DOCK_DB=$(defaults read com.apple.dock persistent-apps 2>/dev/null || echo "()")
    defaults write com.apple.dock persistent-apps -array-add \
      "<dict><key>tile-data</key><dict><key>file-data</key><dict><key>_CFURLString</key><string>$APP_DIR</string><key>_CFURLStringType</key><integer>0</integer></dict></dict></dict>"
    killall Dock
    echo -e "  ${GREEN}✓${RESET} Added to Dock"
  fi
fi

# ── Done ──────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}Installation complete!${RESET}"
echo ""
echo -e "  To start CHROMIA:"
echo -e "    ${CYAN}./chromia.sh${RESET}         — run from terminal"
if [[ "$OSTYPE" == "darwin"* ]]; then
echo -e "    ${CYAN}~/Applications/Chromia.app${RESET} — double-click"
fi
echo ""
echo -e "  Or simply: ${CYAN}npm start${RESET}"
echo ""
