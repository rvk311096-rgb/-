@echo off
chcp 65001 >nul
echo.
echo   ╔═══════════════════════════════╗
echo   ║   Plan — установка           ║
echo   ╚═══════════════════════════════╝
echo.

set DIR=%~dp0
set PORT=5005

:: ── 1. Виртуальное окружение ─────────────────────────────────────────────
echo ► Создаю виртуальное окружение...
python -m venv "%DIR%.venv"
call "%DIR%.venv\Scripts\activate.bat"

:: ── 2. Зависимости ───────────────────────────────────────────────────────
echo ► Устанавливаю зависимости...
pip install -q -r "%DIR%requirements.txt"

:: ── 3. Ярлык на рабочем столе ────────────────────────────────────────────
echo ► Создаю ярлык на рабочем столе...
set DESKTOP=%USERPROFILE%\Desktop

:: Создаём .bat для запуска
set LAUNCHER=%DESKTOP%\Plan.bat
(
echo @echo off
echo cd /d "%DIR%"
echo call "%DIR%.venv\Scripts\activate.bat"
echo taskkill /f /im python.exe /fi "WINDOWTITLE eq plan*" 2^>nul
echo start /b python -m uvicorn app.main:app --host 127.0.0.1 --port %PORT%
echo timeout /t 2 /nobreak ^>nul
echo start http://localhost:%PORT%
) > "%LAUNCHER%"

:: Создаём .vbs обёртку для запуска без консоли
set VBS=%DESKTOP%\Plan.vbs
(
echo Set WshShell = CreateObject^("WScript.Shell"^)
echo WshShell.Run "%LAUNCHER%", 0, False
) > "%VBS%"

echo   Ярлык создан: %DESKTOP%\Plan.vbs

:: ── 4. Автозапуск (реестр) ───────────────────────────────────────────────
set RUNBAT=%DIR%run_silent.bat
(
echo @echo off
echo cd /d "%DIR%"
echo call "%DIR%.venv\Scripts\activate.bat"
echo start /b python -m uvicorn app.main:app --host 127.0.0.1 --port %PORT%
) > "%RUNBAT%"

reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" ^
  /v "Plan" /t REG_SZ /d "wscript //B \"%RUNBAT%\"" /f >nul 2>&1
echo ► Автозапуск зарегистрирован

:: ── 5. Первый запуск ─────────────────────────────────────────────────────
echo ► Запускаю приложение...
start /b python -m uvicorn app.main:app --host 127.0.0.1 --port %PORT%
timeout /t 3 /nobreak >nul

echo.
echo   ✓ Открываю в браузере: http://localhost:%PORT%
echo.
echo   Совет: в Chrome нажмите ⊕ в адресной строке
echo   чтобы установить приложение с иконкой в панели задач
echo.
start http://localhost:%PORT%
pause
