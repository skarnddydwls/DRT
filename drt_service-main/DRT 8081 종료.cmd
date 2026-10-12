@echo off
setlocal
title Stop DRT backend - 8081
powershell.exe -NoProfile -Command "$ErrorActionPreference='Stop'; try { $connections=@(Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue); if ($connections.Count -eq 0) { Write-Host 'Port 8081 is already stopped.'; exit 0 }; $owners=@($connections.OwningProcess | Sort-Object -Unique); foreach ($owner in $owners) { $server=Get-CimInstance Win32_Process -Filter ('ProcessId=' + $owner); if ($null -eq $server -or $server.Name -notmatch '^javaw?\.exe$' -or $server.CommandLine -notmatch 'org\.apache\.catalina\.startup\.Bootstrap' -or -not $server.CommandLine.Contains('-Dcatalina.base=C:\eGovFrameDev_DRT-4.3.1-64bit\workspace-egov\.metadata\.plugins\org.eclipse.wst.server.core\tmp0')) { throw ('Port 8081 is not the expected DRT Tomcat. Refusing to stop PID ' + $owner) } }; foreach ($owner in $owners) { Stop-Process -Id ([int]$owner) -Force; Write-Host ('Stopped DRT Tomcat PID ' + $owner) }; Start-Sleep -Milliseconds 500; if (Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue) { throw 'Port 8081 is still listening. Please check the server.' }; Write-Host 'DRT backend on port 8081 has stopped.'; exit 0 } catch { Write-Host ('Failed: ' + $_.Exception.Message); Write-Host 'If access is denied, run this CMD as administrator.'; exit 1 }"
set "RESULT=%ERRORLEVEL%"
echo.
pause
exit /b %RESULT%
