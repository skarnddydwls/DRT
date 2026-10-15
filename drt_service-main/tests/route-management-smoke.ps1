param([string]$Backend = 'http://localhost:8081/drt')
$ErrorActionPreference = 'Stop'
$psql = 'C:\Program Files\PostgreSQL\17\bin\psql.exe'
$testName = '[TEST] route-management'
$created = Invoke-RestMethod -Uri "$Backend/insertRoute.do" -Method POST -ContentType 'application/json' -TimeoutSec 20 -Body (@{
    ROUTE_NM=$testName; O_STN_ID=''; D_STN_ID=''; START_DT='2026-10-13'; END_DT='9999-12-31'; USE_YN='N'; REMARK='Temporary implementation verification'
} | ConvertTo-Json)
$testRouteId = $created.route_id
if (!$created.success -or $testRouteId -notmatch '^RT[0-9]{8}$') { throw 'Test route creation failed' }
try {
    Write-Output "Created temporary route: $testRouteId"
    & $psql -h 192.168.111.8 -U postgres -d drt -v ON_ERROR_STOP=1 -c "INSERT INTO drt.cmm_route_node_map(route_id,point_id,point_seq,point_type,required_min,created_at) SELECT R.route_id,S.stn_id,1,'STN',0,now() FROM drt.cmm_route_info R CROSS JOIN (SELECT stn_id FROM drt.cmm_station_info ORDER BY stn_id LIMIT 1) S WHERE R.route_id='$testRouteId' AND R.route_nm='$testName';"
    if ($LASTEXITCODE -ne 0) { throw 'Test node creation failed' }
    $blocked = $false
    try {
        Invoke-RestMethod -Uri "$Backend/deleteRoute.do" -Method POST -ContentType 'application/json' -TimeoutSec 20 -Body (@{ROUTE_ID=$testRouteId}|ConvertTo-Json) | Out-Null
    } catch {
        if ([int]$_.Exception.Response.StatusCode -ne 409) { throw }
        $blocked = $true
    }
    if (!$blocked) { throw 'Deletion was not blocked for temporary route containing nodes' }
    Write-Output 'PASS: route containing nodes returned HTTP 409'
} finally {
    & $psql -h 192.168.111.8 -U postgres -d drt -v ON_ERROR_STOP=1 -c "DELETE FROM drt.cmm_route_node_map M USING drt.cmm_route_info R WHERE M.route_id=R.route_id AND R.route_id='$testRouteId' AND R.route_nm='$testName';"
    if ($LASTEXITCODE -ne 0) { throw "Remove temporary test data for $testRouteId" }
    $result = Invoke-RestMethod -Uri "$Backend/deleteRoute.do" -Method POST -ContentType 'application/json' -TimeoutSec 20 -Body (@{ROUTE_ID=$testRouteId}|ConvertTo-Json)
    if (!$result.success) { throw "Test route cleanup failed: $testRouteId" }
    Write-Output 'PASS: empty temporary route deleted; test data cleaned up'
}
