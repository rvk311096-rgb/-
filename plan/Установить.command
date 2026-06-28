#!/bin/bash
# Двойной клик — установит и запустит Plan
cd "$(dirname "$0")"

echo ""
echo "  Устанавливаю Plan..."
echo ""

# Проверяем node
if ! command -v node &>/dev/null; then
  echo "  Устанавливаю Node.js..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  brew install node
fi

# Устанавливаем зависимости
npm install

# Убиваем старый процесс
pkill -f "node server.js" 2>/dev/null || true
sleep 1

# Запускаем
node server.js
