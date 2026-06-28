# Установка на ноутбук

## 1. Зависимости (один раз)
```bash
cd план/
pip install -r requirements.txt
```

## 2. Запуск сервера
```bash
python start.py
# Сервер запустится на http://localhost:5005
```

## 3. Иконка на рабочем столе

### Linux (GNOME / KDE)
```bash
# Скопировать ярлык на рабочий стол
cp Plan.desktop ~/Desktop/Plan.desktop
chmod +x ~/Desktop/Plan.desktop
# В GNOME: правой кнопкой → «Разрешить запуск»
```

### macOS
Создать `Plan.command`:
```bash
#!/bin/bash
cd "$(dirname "$0")"
python start.py &
sleep 2
open http://localhost:5005
```
```bash
chmod +x Plan.command
# Перетащить в папку «Программы» или на рабочий стол
```

### Windows
Создать `Plan.bat`:
```bat
@echo off
cd /d "%~dp0"
start python start.py
timeout /t 2
start http://localhost:5005
```

## 4. Установка как PWA (иконка в доке / панели задач)
1. Откройте http://localhost:5005 в Chrome или Edge
2. В адресной строке нажмите значок установки (⊕) 
3. «Установить» → приложение появится как отдельное окно без браузерного UI

## Данные
Хранятся в `data.db` (SQLite) рядом с приложением — можно бэкапить обычным копированием файла.
