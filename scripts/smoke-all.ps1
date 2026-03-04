$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $repoRoot 'backend'
$webRoot = Join-Path $repoRoot 'web'
$mobileRoot = Join-Path $repoRoot 'mobile'

foreach ($path in @($backendRoot, $webRoot, $mobileRoot)) {
  if (-not (Test-Path $path)) {
    throw "Expected repo not found at $path."
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
