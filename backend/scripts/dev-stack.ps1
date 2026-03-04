param(
  [switch]$IncludeExpo
)

$ErrorActionPreference = 'Stop'

$backendRoot = Split-Path $PSScriptRoot -Parent
$workspaceRoot = Split-Path $backendRoot -Parent
$webRoot = Join-Path $workspaceRoot 'web'
$mobileRoot = Join-Path $workspaceRoot 'mobile'

function Stop-PortProcess($Port) {
  $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  foreach ($connection in $connections) {
    try {
      Stop-Process -Id $connection.OwningProcess -Force -ErrorAction Stop
      Write-Host "Stopped process on port $Port (PID $($connection.OwningProcess))"
    } catch {
      Write-Warning "Unable to stop PID $($connection.OwningProcess) on port $Port: $($_.Exception.Message)"
    }
  }
}

function Wait-ForHttp($Url, $TimeoutSeconds = 120) {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -UseBasicParsing $Url -TimeoutSec 10
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
        Write-Host "Ready: $Url ($($response.StatusCode))"
        return
      }
    } catch {
      Start-Sleep -Seconds 2
    }
  }
  throw "Timed out waiting for $Url"
}

Write-Host 'Restarting local TradeConnect stack...'

Stop-PortProcess 3000
Stop-PortProcess 3001
Stop-PortProcess 8081

Push-Location $workspaceRoot
docker compose up -d postgres redis | Out-Null
Pop-Location

Start-Sleep -Seconds 4

Start-Process powershell -ArgumentList '-NoProfile', '-Command', 'npm run dev' -WorkingDirectory $backendRoot | Out-Null
Start-Process powershell -ArgumentList '-NoProfile', '-Command', 'npm run dev -- --port 3001' -WorkingDirectory $webRoot | Out-Null

if ($IncludeExpo) {
  Start-Process powershell -ArgumentList '-NoProfile', '-Command', 'npx expo start --port 8081 --android --clear' -WorkingDirectory $mobileRoot | Out-Null
}

Wait-ForHttp 'http://localhost:3000/health'
Wait-ForHttp 'http://localhost:3001/'

if ($IncludeExpo) {
  Wait-ForHttp 'http://localhost:8081'
}

Write-Host 'TradeConnect stack restarted successfully.'
