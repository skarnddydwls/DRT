@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
if errorlevel 1 goto fail
where node >nul 2>&1
if errorlevel 1 (
  if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
)
where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js was not found. Install Node.js 20.9 or newer.
  goto fail
)
node -e "const [major,minor]=process.versions.node.split('.').map(Number); if(major<20 || (major===20 && minor<9)){console.error('Node.js 20.9 or newer is required.');process.exit(1)}"
if errorlevel 1 goto fail
if not exist "node_modules\next\dist\bin\next" (
  echo ERROR: Dependencies are missing. Run the production build CMD first.
  goto fail
)
if not exist ".next-production\BUILD_ID" (
  echo ERROR: Production build is missing. Run the production build CMD first.
  goto fail
)
if not defined CENTER_HOST set "CENTER_HOST=0.0.0.0"
if not defined PORT set "PORT=3000"
echo DRT Center - bind address: "%CENTER_HOST%:%PORT%"
if /I "%~1"=="--check" (
  echo Configuration checks passed. The center was NOT started.
  exit /b 0
)
echo Keep this window open. Press Ctrl+C to stop the center.
node "scripts\center-production.cjs" start
set "DRT_EXIT=%ERRORLEVEL%"
if not "%DRT_EXIT%"=="0" goto fail
exit /b %DRT_EXIT%
:fail
echo Center startup failed. Check the error above.
echo If the port is in use, stop the existing PowerShell center first.
pause
exit /b 1
