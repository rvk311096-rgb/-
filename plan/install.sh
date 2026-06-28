#!/usr/bin/env bash
# Установка Plan — запустите один раз: bash install.sh
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT=5005
PYTHON=$(command -v python3 || command -v python)

echo ""
echo "  ╔═══════════════════════════════╗"
echo "  ║   Plan — установка           ║"
echo "  ╚═══════════════════════════════╝"
echo ""

# ── 1. Виртуальное окружение ──────────────────────────────────────────────
echo "▸ Создаю виртуальное окружение…"
"$PYTHON" -m venv "$DIR/.venv"
source "$DIR/.venv/bin/activate"

# ── 2. Зависимости ───────────────────────────────────────────────────────
echo "▸ Устанавливаю зависимости…"
pip install -q -r "$DIR/requirements.txt"

# ── 3. Ярлык на рабочем столе ────────────────────────────────────────────
DESKTOP="$HOME/Desktop"
[ -d "$HOME/Рабочий стол" ] && DESKTOP="$HOME/Рабочий стол"
[ -d "$HOME/Рабочий_стол" ] && DESKTOP="$HOME/Рабочий_стол"

OS="$(uname -s)"

if [ "$OS" = "Darwin" ]; then
  # macOS — создаём .command (двойной клик запускает)
  APP_FILE="$DESKTOP/Plan.command"
  cat > "$APP_FILE" <<EOF
#!/bin/bash
DIR="$DIR"
source "\$DIR/.venv/bin/activate"
# Убиваем старый процесс если был
pkill -f "plan.*uvicorn" 2>/dev/null || true
cd "\$DIR"
python -m uvicorn app.main:app --host 127.0.0.1 --port $PORT &
sleep 2
open http://localhost:$PORT
EOF
  chmod +x "$APP_FILE"
  echo "▸ Создан ярлык: $APP_FILE"

elif [ "$OS" = "Linux" ]; then
  # Linux — .desktop файл
  ICON="$DIR/static/icons/icon.svg"
  APP_FILE="$DESKTOP/Plan.desktop"
  cat > "$APP_FILE" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Plan
Comment=Стратегическое планирование
Exec=bash -c "source $DIR/.venv/bin/activate && pkill -f 'plan.*uvicorn' 2>/dev/null; cd $DIR && python -m uvicorn app.main:app --host 127.0.0.1 --port $PORT & sleep 2 && xdg-open http://localhost:$PORT"
Icon=$ICON
Terminal=false
Categories=Office;
StartupNotify=true
EOF
  chmod +x "$APP_FILE"
  # Разрешить запуск (GNOME)
  gio set "$APP_FILE" metadata::trusted true 2>/dev/null || true
  echo "▸ Создан ярлык: $APP_FILE"
fi

# ── 4. Systemd / LaunchAgent (автозапуск — опционально) ──────────────────
if [ "$OS" = "Linux" ] && command -v systemctl &>/dev/null; then
  SVCDIR="$HOME/.config/systemd/user"
  mkdir -p "$SVCDIR"
  cat > "$SVCDIR/plan.service" <<EOF
[Unit]
Description=Plan — стратегическое планирование
After=network.target

[Service]
WorkingDirectory=$DIR
ExecStart=$DIR/.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port $PORT
Restart=on-failure
RestartSec=3

[Install]
WantedBy=default.target
EOF
  systemctl --user daemon-reload
  systemctl --user enable plan.service
  systemctl --user start plan.service
  echo "▸ Сервис запущен (systemd user service)"

elif [ "$OS" = "Darwin" ]; then
  PLIST="$HOME/Library/LaunchAgents/com.plan.app.plist"
  cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.plan.app</string>
  <key>ProgramArguments</key>
  <array>
    <string>$DIR/.venv/bin/python</string>
    <string>-m</string><string>uvicorn</string>
    <string>app.main:app</string>
    <string>--host</string><string>127.0.0.1</string>
    <string>--port</string><string>$PORT</string>
  </array>
  <key>WorkingDirectory</key><string>$DIR</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$DIR/plan.log</string>
  <key>StandardErrorPath</key><string>$DIR/plan.log</string>
</dict>
</plist>
EOF
  launchctl load "$PLIST" 2>/dev/null || true
  echo "▸ LaunchAgent зарегистрирован (автозапуск при входе в систему)"
fi

# ── 5. Первый запуск ─────────────────────────────────────────────────────
echo ""
echo "▸ Запускаю приложение…"
pkill -f "plan.*uvicorn" 2>/dev/null || true
sleep 1
cd "$DIR"
source "$DIR/.venv/bin/activate"
python -m uvicorn app.main:app --host 127.0.0.1 --port $PORT &
sleep 3

if curl -s "http://localhost:$PORT/api/sections" &>/dev/null; then
  echo ""
  echo "  ✓ Приложение работает: http://localhost:$PORT"
  echo ""
  echo "  Для иконки на рабочем столе:"
  if [ "$OS" = "Darwin" ]; then
    echo "  Откройте Chrome → http://localhost:$PORT → ⊕ Установить"
  else
    echo "  Откройте Chrome → http://localhost:$PORT → ⊕ Установить"
    echo "  или двойной клик на Plan.desktop на рабочем столе"
  fi
  echo ""
  # открываем браузер
  if [ "$OS" = "Darwin" ]; then
    open "http://localhost:$PORT"
  elif command -v xdg-open &>/dev/null; then
    xdg-open "http://localhost:$PORT" &
  fi
else
  echo "  ✗ Сервер не ответил, проверьте план.log"
fi
