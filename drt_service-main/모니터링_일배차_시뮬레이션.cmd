@echo off
setlocal
title DRT Daily Dispatch Simulator
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\dispatch-simulator.ps1" -Interactive
if errorlevel 1 echo Simulator failed. Check the error message above.
pause
endlocal
