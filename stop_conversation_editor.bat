@echo off
setlocal
cd /d "%~dp0"

set "BUNDLED_PYTHON=C:\Users\tmnak\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"

if exist "%BUNDLED_PYTHON%" (
  "%BUNDLED_PYTHON%" "%~dp0start_conversation_editor.py" --stop
) else (
  py -3 "%~dp0start_conversation_editor.py" --stop
)

if errorlevel 1 (
  echo Failed to stop the app.
  pause
  exit /b 1
)
