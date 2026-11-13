@echo off
setlocal
cd /d "%~dp0"
node -e "const [major,minor]=process.versions.node.split('.').map(Number); if(major<20 || (major===20 && minor<9)){console.error('Node.js 20.9 or newer is required.');process.exit(1)}"
if errorlevel 1 goto fail
call npm ci --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000 --fetch-timeout=300000
if errorlevel 1 goto fail
call npm run build:server
if errorlevel 1 goto fail
echo Production build completed. Run the production start CMD.
pause
exit /b 0
:fail
echo Production build failed. Check the message above.
pause
exit /b 1
