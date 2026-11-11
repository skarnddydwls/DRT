@echo off
setlocal
cd /d "%~dp0"
node -e "const [major,minor]=process.versions.node.split('.').map(Number); if(major<20 || (major===20 && minor<9)){console.error('Node.js 20.9 or newer is required.');process.exit(1)}"
if errorlevel 1 (
  pause
  exit /b 1
)
if not exist ".next-production\BUILD_ID" (
  echo Run the production build CMD first.
  pause
  exit /b 1
)
call npm run start:server
set "DRT_EXIT=%ERRORLEVEL%"
if not "%DRT_EXIT%"=="0" pause
exit /b %DRT_EXIT%
