$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$workspaceRoot = if ($env:TRADECONNECT_WORKSPACE_ROOT) {
  $env:TRADECONNECT_WORKSPACE_ROOT
} else {
  Join-Path (Split-Path -Parent $repoRoot) 'tradeconnect'
}

$backendRoot = Join-Path $workspaceRoot 'backend'

if (-not (Test-Path $backendRoot)) {
  throw "Backend repo not found at $backendRoot. Set TRADECONNECT_WORKSPACE_ROOT to your local workspace root."
}

Write-Host "Starting TradeConnect services from $workspaceRoot ..."
& powershell -ExecutionPolicy Bypass -File (Join-Path $backendRoot 'scripts\dev-stack.ps1') -IncludeExpo
