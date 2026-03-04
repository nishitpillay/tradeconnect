$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $repoRoot 'backend'

if (-not (Test-Path $backendRoot)) {
  throw "Backend repo not found at $backendRoot."
}

Write-Host "Starting TradeConnect services from $repoRoot ..."
& powershell -ExecutionPolicy Bypass -File (Join-Path $backendRoot 'scripts\dev-stack.ps1') -IncludeExpo
