#!/bin/bash
# ╔══════════════════════════════════════════════════════════════════════╗
# ║  Plan — установщик для macOS                                        ║
# ║  Запуск из любого места: bash install.sh                            ║
# ╚══════════════════════════════════════════════════════════════════════╝

set -e

REPO="https://github.com/rvk311096-rgb/-"
BRANCH="claude/strategic-planning-app-d60w29"
INSTALL_DIR="$HOME/Plan"
APP_DIR="$INSTALL_DIR/plan"
PLIST="$HOME/Library/LaunchAgents/com.plan.server.plist"

BOLD='\033[1m'; RED='\033[0;31m'; RESET='\033[0m'

echo ""
echo -e "${BOLD}  Plan — установка${RESET}"
echo "  ───────────────────────────────────────────"

# ── 1. Node.js ────────────────────────────────────────────────────────
echo ""
echo "  [1/5] Проверяю Node.js…"
NODE_PATH=$(which node 2>/dev/null || true)
if [ -z "$NODE_PATH" ]; then
  echo ""
  echo -e "  ${RED}✗ Node.js не найден.${RESET}"
  echo ""
  echo "  Установи одним из способов и запусти install.sh снова:"
  echo ""
  echo "    Homebrew (рекомендуется):"
  echo "      /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
  echo "      brew install node"
  echo ""
  echo "    Или скачай установщик: https://nodejs.org  (кнопка LTS)"
  echo ""
  exit 1
fi
echo -e "  ${BOLD}✓${RESET} Node.js $(node --version) → $NODE_PATH"

# ── 2. Git ────────────────────────────────────────────────────────────
echo ""
echo "  [2/5] Проверяю Git…"
if ! command -v git &>/dev/null; then
  echo -e "  ${RED}✗ Git не найден.${RESET} Запусти: xcode-select --install"
  exit 1
fi
echo -e "  ${BOLD}✓${RESET} Git $(git --version | awk '{print $3}')"

# ── 3. Код ────────────────────────────────────────────────────────────
echo ""
echo "  [3/5] Загружаю приложение…"
if [ -d "$INSTALL_DIR/.git" ]; then
  echo "  Уже скачано — обновляю…"
  git -C "$INSTALL_DIR" fetch origin
  git -C "$INSTALL_DIR" checkout "$BRANCH" 2>/dev/null || true
  git -C "$INSTALL_DIR" pull origin "$BRANCH"
else
  git clone --branch "$BRANCH" "$REPO" "$INSTALL_DIR"
fi
echo -e "  ${BOLD}✓${RESET} $INSTALL_DIR"

# ── 4. Иконка ─────────────────────────────────────────────────────────
echo ""
echo "  [4/5] Создаю иконку на рабочем столе…"
if command -v python3 &>/dev/null; then
  python3 "$APP_DIR/make_icon.py"
else
  echo "  ⚠  python3 не найден — иконка пропущена."
  echo "     Позже запусти: python3 $APP_DIR/make_icon.py"
fi

# ── 5. Автозапуск ─────────────────────────────────────────────────────
echo ""
echo "  [5/5] Настраиваю автозапуск…"
mkdir -p "$HOME/Library/LaunchAgents"

cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.plan.server</string>
  <key>ProgramArguments</key>
  <array>
    <string>${NODE_PATH}</string>
    <string>${APP_DIR}/server.js</string>
  </array>
  <key>WorkingDirectory</key><string>${APP_DIR}</string>
  <key>StandardOutPath</key><string>${APP_DIR}/plan.log</string>
  <key>StandardErrorPath</key><string>${APP_DIR}/plan.log</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
</dict>
</plist>
PLIST

launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"

# ── Готово ─────────────────────────────────────────────────────────────
echo ""
echo "  ───────────────────────────────────────────"
echo -e "  ${BOLD}✓ Plan установлен${RESET}"
echo ""
echo "  Приложение: http://localhost:5005"
echo "  Иконка на рабочем столе — двойной клик для запуска"
echo ""
echo "  Сервер работает в фоне и стартует автоматически при входе в систему."
echo "  Терминал держать открытым не нужно."
echo ""
echo "  Управление:"
echo "    Остановить  →  launchctl unload  $PLIST"
echo "    Запустить   →  launchctl load    $PLIST"
echo "    Логи        →  tail -f $APP_DIR/plan.log"
echo ""
