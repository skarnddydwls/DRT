@echo off
setlocal
title DRT Monitoring Simulator - RT6 / VH1

set "ROUTE_ID=RT00000006"
set "VEHICLE_ID=VH00000001"

set "INTERVAL=%~1"
if not defined INTERVAL set "INTERVAL=2"

"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\monitoring-simulator.ps1" -RouteId "%ROUTE_ID%" -VehicleId "%VEHICLE_ID%" -IntervalSeconds "%INTERVAL%"

if errorlevel 1 echo Simulator failed. Check the error message above.
if errorlevel 1 pause
endlocal
