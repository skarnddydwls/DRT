@echo off
setlocal
title DRT Service

cd /d "%~dp0"

set "NODE_EXE=C:\Users\soul0\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
set "NEXT_CLI=%~dp0node_modules\next\dist\bin\next"

if not exist "%NODE_EXE%" (
  echo [ERROR] Node.js 20 or newer is required.
  echo Install Node.js 20 LTS or newer, then try again.
  pause
  exit /b 1
)

if not exist "%NEXT_CLI%" (
  echo [ERROR] Dependencies are not installed.
  echo Run npm install in this folder, then try again.
  pause
  exit /b 1
)

powershell.exe -NoProfile -Command "$client = New-Object Net.Sockets.TcpClient; try { $client.Connect('127.0.0.1', 3000); exit 0 } catch { exit 1 } finally { $client.Dispose() }" >nul 2>&1
if not errorlevel 1 (
  echo DRT Service is already running at http://127.0.0.1:3000
  start "" "http://127.0.0.1:3000"
  exit /b 0
)

echo Starting DRT Service...
echo URL: http://127.0.0.1:3000
echo Close this window or press Ctrl+C to stop the server.
echo.

start "" powershell.exe -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 7; Start-Process 'http://127.0.0.1:3000'"
"%NODE_EXE%" "%NEXT_CLI%" dev -H 127.0.0.1 -p 3000

echo.
echo DRT Service has stopped.
pause
