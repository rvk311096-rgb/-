# Plan — личное стратегическое планирование

Локальное веб-приложение для Mac. Работает как сервер на твоём ноутбуке, открывается в браузере.

## Установка (с нуля, один раз)

```bash
curl -fsSL https://raw.githubusercontent.com/rvk311096-rgb/-/claude/strategic-planning-app-d60w29/plan/install.sh | bash
```

Или скачать вручную и запустить:

```bash
git clone --branch claude/strategic-planning-app-d60w29 https://github.com/rvk311096-rgb/- ~/Plan
bash ~/Plan/plan/install.sh
```

### Что делает install.sh

| Шаг | Действие |
|-----|---------|
| 1 | Проверяет Node.js (≥ 18). Если нет — показывает как установить |
| 2 | Проверяет Git |
| 3 | Клонирует репозиторий в `~/Plan` (или обновляет если уже есть) |
| 4 | Создаёт иконку на рабочем столе через `make_icon.py` |
| 5 | Регистрирует LaunchAgent — сервер стартует автоматически при входе в macOS |

### Требования

- macOS 12+
- Node.js 18+ ([nodejs.org](https://nodejs.org), кнопка LTS)
- Git (входит в Xcode CLT: `xcode-select --install`)
- Python 3 (для иконки, уже встроен в macOS 12+)

---

## Ежедневное использование

После установки терминал не нужен.

- **Открыть приложение** — двойной клик по иконке на рабочем столе
- **Или в браузере** — `http://localhost:5005`

---

## Обновление приложения

```bash
cd ~/Plan && git pull
```

Перезапуск сервера не нужен — LaunchAgent перезапустит его автоматически (KeepAlive).

---

## Управление сервером

```bash
# Остановить
launchctl unload ~/Library/LaunchAgents/com.plan.server.plist

# Запустить
launchctl load ~/Library/LaunchAgents/com.plan.server.plist

# Посмотреть логи
tail -f ~/Plan/plan/plan.log

# Статус
launchctl list | grep com.plan
```

---

## Удаление

```bash
launchctl unload ~/Library/LaunchAgents/com.plan.server.plist
rm ~/Library/LaunchAgents/com.plan.server.plist
rm -rf ~/Plan
# Удали иконку с рабочего стола вручную
```

---

## Структура

```
plan/
├── server.js          # HTTP-сервер (Node.js stdlib, без зависимостей)
├── data.json          # База данных (создаётся при первом запуске)
├── templates/
│   └── index.html     # Единственная HTML-страница
├── static/
│   ├── css/app.css
│   ├── js/app.js
│   └── icons/
├── make_icon.py       # Генератор иконки (pure Python)
├── install.sh         # Установщик
└── setup_autostart.sh # Только автозапуск (если установка уже есть)
```

---

## Безопасность

- Сервер слушает только `127.0.0.1:5005` — **недоступен из сети**, только с твоего Mac
- Нет внешних зависимостей (npm пакетов нет — нет supply chain рисков)
- Пароли разделов хранятся как SHA-256 хэши в `data.json`
- `data.json` в `.gitignore` — данные не попадают в репозиторий
- Весь код в двух читаемых файлах: `server.js` (200 строк) и `app.js`
