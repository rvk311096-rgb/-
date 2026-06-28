# Plan — полное руководство

---

## Установка (с нуля, одна команда)

```bash
launchctl unload ~/Library/LaunchAgents/com.plan.server.plist 2>/dev/null; cd ~/Plan && git fetch origin && git checkout claude/strategic-planning-app-d60w29 && git pull && bash plan/install.sh
```

Или если папки `~/Plan` ещё нет:

```bash
git clone --branch claude/strategic-planning-app-d60w29 https://github.com/rvk311096-rgb/- ~/Plan && bash ~/Plan/plan/install.sh
```

### Что нужно заранее

| Инструмент | Проверить | Установить если нет |
|-----------|-----------|---------------------|
| Node.js 18+ | `node --version` | [nodejs.org](https://nodejs.org) → кнопка LTS |
| Git | `git --version` | `xcode-select --install` |
| Python 3 | `python3 --version` | встроен в macOS 12+, иначе [python.org](https://python.org) |

### Что делает install.sh шаг за шагом

1. Проверяет Node.js и Git — если нет, объясняет как установить
2. Клонирует репозиторий в `~/Plan` (или обновляет если уже есть)
3. Создаёт иконку на рабочем столе (без подписи, мишень в цветах приложения)
4. Регистрирует LaunchAgent — сервер стартует автоматически при каждом входе в macOS

---

## Ежедневное использование

После установки **терминал не нужен**.

- Двойной клик по иконке на рабочем столе → открывает приложение в браузере
- Или вручную: `http://localhost:5005`

Сервер работает в фоне постоянно и перезапускается сам после перезагрузки Mac.

---

## Обновление

```bash
cd ~/Plan && git pull
```

Перезапускать сервер не нужно — он подхватит изменения при следующем запросе.

---

## Реанимация (если что-то сломалось)

Одна команда на все случаи:

```bash
launchctl unload ~/Library/LaunchAgents/com.plan.server.plist 2>/dev/null; cd ~/Plan && git fetch origin && git checkout claude/strategic-planning-app-d60w29 && git pull && bash plan/install.sh
```

---

## Управление сервером вручную

```bash
# Остановить
launchctl unload ~/Library/LaunchAgents/com.plan.server.plist

# Запустить
launchctl load ~/Library/LaunchAgents/com.plan.server.plist

# Статус (PID и время работы)
launchctl list | grep com.plan

# Логи в реальном времени
tail -f ~/Plan/plan/plan.log
```

---

## Сколько ресурсов занимает приложение

### Проверить прямо сейчас

```bash
# RAM и CPU одной строкой
ps -o pid,etime,rss,pcpu -p $(pgrep -f "node server.js")
```

```bash
# RAM в мегабайтах
ps -o rss= -p $(pgrep -f "node server.js") | awk '{printf "RAM: %.1f MB\n", $1/1024}'
```

```bash
# Подробный мониторинг в реальном времени
top -pid $(pgrep -f "node server.js")
# выйти: q
```

### Ожидаемые значения

| Метрика | Значение |
|---------|---------|
| RAM в покое | 15–30 MB |
| CPU в покое | ~0% |
| CPU при открытии страницы | < 1%, пик на долю секунды |
| Место на диске (код) | ~200 KB |
| Место на диске (данные) | размер `data.json` — растёт с контентом |

Для сравнения: одна вкладка Safari занимает 100–300 MB. Приложение на фоне macOS практически незаметно.

---

## Безопасность

### Ключевые факты

**Сервер доступен только с твоего Mac — не из интернета, не из локальной сети.**

В коде зафиксировано: `server.listen(5005, '127.0.0.1')` — `127.0.0.1` означает только localhost.

### Проверить самостоятельно

```bash
# Убедиться что сервер слушает только localhost, не 0.0.0.0
lsof -i :5005
# В колонке NAME должно быть localhost:5005, не *:5005
```

```bash
# Убедиться что нет внешних соединений
sudo lsof -i -P | grep node
# Должна быть только одна строка: localhost:5005
```

```bash
# Убедиться что нет npm-зависимостей (нет чужого кода)
cat ~/Plan/plan/package.json
# "dependencies": {} — пусто
```

```bash
# Убедиться что данные не утекают в репозиторий
cat ~/Plan/plan/.gitignore | grep data
# data.json должна быть в игноре
```

```bash
# Посмотреть как хранятся пароли разделов
grep password_hash ~/Plan/plan/data.json
# Хэши SHA-256, не сами пароли
```

### Итоговая оценка

| Риск | Статус |
|------|--------|
| Доступ из интернета | ✅ Невозможен — только 127.0.0.1 |
| Сторонний код (npm) | ✅ Нет зависимостей |
| Утечка данных в репозиторий | ✅ data.json в .gitignore |
| Пароли в открытом виде | ✅ Хранятся как SHA-256 хэши |
| Физический доступ к Mac | ⚠️ data.json можно прочитать напрямую — стандартный риск любого локального приложения |

Единственный реальный вектор — физический доступ к ноутбуку. Если нужна шифровка файла данных, это можно добавить отдельно.

### Весь код в двух читаемых файлах

- `~/Plan/plan/server.js` — 200 строк, весь backend
- `~/Plan/plan/static/js/app.js` — весь frontend

Можно открыть и прочитать самостоятельно — никаких бандлов и обфускации.

---

## Удаление

```bash
launchctl unload ~/Library/LaunchAgents/com.plan.server.plist
rm ~/Library/LaunchAgents/com.plan.server.plist
rm -rf ~/Plan
# Иконку на рабочем столе удалить вручную
```
