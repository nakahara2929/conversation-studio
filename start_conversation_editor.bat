@echo off
setlocal
cd /d "%~dp0"

set "BUNDLED_PYTHON=C:\Users\tmnak\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"

if not exist "dist\index.html" (
  echo dist folder is missing.
  echo Build the app first.
  pause
  exit /b 1
)

if exist "%BUNDLED_PYTHON%" (
  "%BUNDLED_PYTHON%" "%~dp0start_conversation_editor.py"
) else (
  py -3 "%~dp0start_conversation_editor.py"
)

if errorlevel 1 (
  echo Failed to start the app.
  pause
  exit /b 1
)
