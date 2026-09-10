param(
  [string]$RouteId = "RT00000003",
  [string]$VehicleId = "VH00000001",
  [int]$IntervalSeconds = 2
)

$ErrorActionPreference = "Stop"
$backendRoot = "C:\eGovFrameDev_DRT-4.3.1-64bit\workspace-egov\drt"
$dataSourcePath = Join-Path $backendRoot "src\main\resources\egovframework\spring\context-datasource.xml"
$psqlCandidates = @(
  "C:\Program Files\PostgreSQL\17\bin\psql.exe",
  "C:\Program Files\PostgreSQL\14\bin\psql.exe"
)
$psql = $psqlCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

if (-not $psql) { throw "PostgreSQL psql.exe was not found." }
if (-not (Test-Path -LiteralPath $dataSourcePath)) { throw "Database config was not found: $dataSourcePath" }
if ($IntervalSeconds -lt 1) { throw "IntervalSeconds must be 1 or greater." }
if ($RouteId -notmatch '^[A-Za-z0-9_-]+$' -or $VehicleId -notmatch '^[A-Za-z0-9_-]+$') {
  throw "RouteId or VehicleId contains invalid characters."
}

$configText = Get-Content -LiteralPath $dataSourcePath -Raw
$jdbcMatch = [regex]::Match($configText, 'jdbc:postgresql://([^:/]+):(\d+)/([^"<]+)')
$userMatch = [regex]::Match($configText, '<property name="username" value="([^"]+)"')
$passwordMatch = [regex]::Match($configText, '<property name="password" value="([^"]+)"')
if (-not ($jdbcMatch.Success -and $userMatch.Success -and $passwordMatch.Success)) {
  throw "PostgreSQL connection settings could not be read."
}

$dbHost = $jdbcMatch.Groups[1].Value
$dbPort = $jdbcMatch.Groups[2].Value
$dbName = $jdbcMatch.Groups[3].Value
$dbUser = $userMatch.Groups[1].Value
$env:PGPASSWORD = $passwordMatch.Groups[1].Value
$simulationStatePath = Join-Path ([IO.Path]::GetTempPath()) "drt-monitoring-$VehicleId.state"
$simulationToken = "$RouteId|$PID"

try {
  $routeSql = @"
COPY (
  SELECT M.POINT_SEQ, COALESCE(S.GPS_X, N.GPS_X), COALESCE(S.GPS_Y, N.GPS_Y)
  FROM DRT.CMM_ROUTE_NODE_MAP M
  LEFT JOIN DRT.CMM_STATION_INFO S ON M.POINT_ID = S.STN_ID
  LEFT JOIN DRT.CMM_NODE_INFO N ON M.POINT_ID = N.NODE_ID
  WHERE M.ROUTE_ID = '$RouteId'
    AND COALESCE(S.GPS_X, N.GPS_X) IS NOT NULL
    AND COALESCE(S.GPS_Y, N.GPS_Y) IS NOT NULL
  ORDER BY M.POINT_SEQ
) TO STDOUT WITH CSV
"@
  $csvLines = & $psql --host=$dbHost --port=$dbPort --username=$dbUser --dbname=$dbName --no-psqlrc --tuples-only --quiet --command=$routeSql
  if ($LASTEXITCODE -ne 0) { throw "Route coordinate query failed." }

  $points = @($csvLines | ConvertFrom-Csv -Header "seq", "lon", "lat")
  if ($points.Count -lt 2) { throw "Route $RouteId requires at least two coordinates." }

  # Only the most recently started simulator may publish logs for a vehicle.
  # Older simulator processes detect the changed token and stop themselves.
  [IO.File]::WriteAllText($simulationStatePath, $simulationToken, [Text.Encoding]::ASCII)

  Write-Host ""
  Write-Host "DRT monitoring simulation started" -ForegroundColor Green
  Write-Host "Route: $RouteId / Vehicle: $VehicleId / Interval: ${IntervalSeconds}s"
  Write-Host "Press Ctrl+C to stop." -ForegroundColor Yellow
  Write-Host ""

  $index = 0
  $direction = 1
  while ($true) {
    $activeToken = if (Test-Path -LiteralPath $simulationStatePath) {
      [IO.File]::ReadAllText($simulationStatePath).Trim()
    } else {
      ""
    }
    if ($activeToken -ne $simulationToken) {
      Write-Host "A newer simulation took over vehicle $VehicleId. Stopping this simulation." -ForegroundColor Yellow
      break
    }

    $current = $points[$index]
    $nextIndex = [Math]::Max(0, [Math]::Min($points.Count - 1, $index + $direction))
    $next = $points[$nextIndex]
    $deltaLon = [double]$next.lon - [double]$current.lon
    $deltaLat = [double]$next.lat - [double]$current.lat
    $heading = ([Math]::Atan2($deltaLon, $deltaLat) * 180 / [Math]::PI + 360) % 360
    $today = Get-Date -Format "yyyy-MM-dd"
    $insertSql = "INSERT INTO DRT.DRT_OPER_LOG (OPER_DTM, VEHICLE_ID, ROUTE_ID, DISPATCH_DT, GPS_X, GPS_Y, HEADING, SPEED) VALUES (CURRENT_TIMESTAMP, '$VehicleId', '$RouteId', TO_DATE('$today','YYYY-MM-DD'), $($current.lat), $($current.lon), $([Math]::Round($heading)), 8.3);"
    & $psql --host=$dbHost --port=$dbPort --username=$dbUser --dbname=$dbName --no-psqlrc --quiet --command=$insertSql | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Operation log insert failed." }

    Write-Host ("[{0}] seq={1} lon={2} lat={3}" -f (Get-Date -Format "HH:mm:ss"), $current.seq, $current.lon, $current.lat)
    Start-Sleep -Seconds $IntervalSeconds

    if ($index -eq $points.Count - 1) { $direction = -1 }
    elseif ($index -eq 0) { $direction = 1 }
    $index += $direction
  }
}
finally {
  if (Test-Path -LiteralPath $simulationStatePath) {
    $activeToken = [IO.File]::ReadAllText($simulationStatePath).Trim()
    if ($activeToken -eq $simulationToken) {
      Remove-Item -LiteralPath $simulationStatePath -Force
    }
  }
  $env:PGPASSWORD = ""
  Write-Host "Simulation stopped." -ForegroundColor Yellow
}
