#!/bin/bash
# Настраивает автозапуск Plan при входе в macOS (без терминала)
DIR="$(cd "$(dirname "$0")" && pwd)"
PLIST="$HOME/Library/LaunchAgents/com.plan.server.plist"

cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.plan.server</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>${DIR}/server.js</string>
  </array>
  <key>WorkingDirectory</key><string>${DIR}</string>
  <key>StandardOutPath</key><string>${DIR}/plan.log</string>
  <key>StandardErrorPath</key><string>${DIR}/plan.log</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
</dict>
</plist>
PLIST

# Найти node (homebrew или nvm)
NODE_PATH=$(which node 2>/dev/null)
if [ -z "$NODE_PATH" ]; then
  echo "❌ node не найден. Убедись, что Node.js установлен."
  exit 1
fi

# Подставить реальный путь к node
sed -i '' "s|/usr/local/bin/node|${NODE_PATH}|g" "$PLIST"

# Остановить если уже запущен
launchctl unload "$PLIST" 2>/dev/null

# Загрузить
launchctl load "$PLIST"

echo ""
echo "  ✓ Автозапуск настроен"
echo "  Сервер запустится автоматически при каждом входе в систему"
echo "  Терминал держать открытым не нужно"
echo ""
