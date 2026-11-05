param(
  [ValidateSet('actual', 'always')][string]$ReserveMode = 'actual',
  [string]$VehicleId = 'ALL',
  [double]$Speed = 1,
  [string]$StartTime = '',
  [string]$BackendRoot = '',
  [switch]$Check,
  [switch]$Interactive
)
$ErrorActionPreference = 'Stop'
if ($Interactive) {
  Write-Host 'Daily dispatch simulator' -ForegroundColor Green
  Write-Host 'Reservation sections: 1 = Actual bookings (default), 2 = Always run / ON'
  $modeAnswer = Read-Host 'Mode [1/2]'
  if ($modeAnswer -eq '2') { $ReserveMode = 'always' }
  elseif ($modeAnswer -notin @('', '1')) { throw 'Select 1 or 2.' }
  $vehicleAnswer = Read-Host 'Vehicles [Enter/ALL = buses 1+2 together, 1 = bus 1 only, 2 = bus 2 only]'
  if ($vehicleAnswer -eq '1') { $VehicleId = 'VH00000001' }
  elseif ($vehicleAnswer -eq '2') { $VehicleId = 'VH00000002' }
  elseif ($vehicleAnswer) { $VehicleId = $vehicleAnswer }
  $speedAnswer = Read-Host 'Time multiplier [1] (example: 10)'
  if ($speedAnswer) { $Speed = [double]::Parse($speedAnswer, [Globalization.CultureInfo]::InvariantCulture) }
  $StartTime = Read-Host 'Start HH:MM [Enter = current Korea time]'
}
if ($VehicleId -notmatch '^[A-Za-z0-9_-]+$') { throw 'Invalid vehicle ID.' }
if ($StartTime -and $StartTime -notmatch '^([01][0-9]|2[0-3]):[0-5][0-9]$') { throw 'Start time must be HH:MM.' }
if ([double]::IsNaN($Speed) -or [double]::IsInfinity($Speed) -or $Speed -le 0) { throw 'Speed must be positive.' }
if (-not $BackendRoot) {
  $BackendRoot = @(
    'C:\eGovFrameDev_DRT-4.3.1-64bit\workspace-egov\drt',
    'C:\DRT\eGovFrameDev_DRT\workspace-egov\drt'
  ) | Where-Object { Test-Path -LiteralPath (Join-Path $_ 'src\main\resources\egovframework\spring\context-datasource.xml') } | Select-Object -First 1
}
if (-not $BackendRoot) { throw 'Backend datasource not found. Pass -BackendRoot.' }
$pythonCommand = Get-Command python.exe -ErrorAction SilentlyContinue
$pythonCandidates = @(
  (Join-Path (Split-Path $BackendRoot) '.venv-mtis-server\Scripts\python.exe'),
  (Join-Path (Split-Path $BackendRoot) '.venv-mtis\Scripts\python.exe')
)
if ($pythonCommand) { $pythonCandidates += $pythonCommand.Source }
$pythonExe = $null
foreach ($candidate in $pythonCandidates) {
  if (-not (Test-Path -LiteralPath $candidate)) { continue }
  try {
    & $candidate -c 'import sys; assert sys.version_info >= (3, 10)' 2>$null
    if ($LASTEXITCODE -eq 0) { $pythonExe = $candidate; break }
  } catch { continue }
}
if (-not $pythonExe) { throw 'Working Python 3.10+ was not found. Install Python on this PC.' }
$simArgs = @((Join-Path $PSScriptRoot 'dispatch-simulator.py'), '--vehicle', $VehicleId,
  '--reserve', $ReserveMode, '--speed', $Speed.ToString([Globalization.CultureInfo]::InvariantCulture), '--backend', $BackendRoot)
if ($StartTime) { $simArgs += @('--start', $StartTime) }
if ($Check) { $simArgs += '--check' }
$env:PYTHONUTF8 = '1'
& $pythonExe @simArgs
if ($LASTEXITCODE -ne 0) { throw 'Simulation failed. Check the message above.' }
