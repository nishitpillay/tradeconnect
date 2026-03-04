$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$workspaceRoot = if ($env:TRADECONNECT_WORKSPACE_ROOT) {
  $env:TRADECONNECT_WORKSPACE_ROOT
} else {
  Join-Path (Split-Path -Parent $repoRoot) 'tradeconnect'
}

$backendRoot = Join-Path $workspaceRoot 'backend'
$webRoot = Join-Path $workspaceRoot 'web'
$mobileRoot = Join-Path $workspaceRoot 'mobile'

foreach ($path in @($backendRoot, $webRoot, $mobileRoot)) {
  if (-not (Test-Path $path)) {
    throw "Expected repo not found at $path. Set TRADECONNECT_WORKSPACE_ROOT to your local workspace root."
  }
}

Write-Host 'Running backend/web smoke verification...'
& powershell -ExecutionPolicy Bypass -File (Join-Path $backendRoot 'scripts\smoke-stack.ps1')
if ($LASTEXITCODE -ne 0) {
  throw "Backend/web smoke failed with exit code $LASTEXITCODE"
}

Write-Host 'Running web type-check...'
Push-Location $webRoot
npm run type-check
if ($LASTEXITCODE -ne 0) {
  Pop-Location
  throw "Web type-check failed with exit code $LASTEXITCODE"
}
Pop-Location

Write-Host 'Running mobile Android smoke verification...'
Push-Location $mobileRoot
npm run android:smoke
if ($LASTEXITCODE -ne 0) {
  Pop-Location
  throw "Mobile Android smoke failed with exit code $LASTEXITCODE"
}
Pop-Location

Write-Host 'Workspace smoke verification passed.'
