$ErrorActionPreference = 'Stop'

function Stop-PortProcess {
  param([int]$Port)

  $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if (-not $connections) {
    return
  }

  $connections |
    Select-Object -ExpandProperty OwningProcess -Unique |
    ForEach-Object {
      try {
        Stop-Process -Id $_ -Force -ErrorAction Stop
      } catch {
        Write-Host ("Skipping PID {0} on port {1}: {2}" -f $_, $Port, $_.Exception.Message)
      }
    }
}

function Wait-ForHttpOk {
  param(
    [string]$Url,
    [int]$TimeoutSeconds = 60
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
      if ($response.StatusCode -eq 200) {
        return
      }
    } catch {
      Start-Sleep -Seconds 2
    }
  }

  throw "Timed out waiting for $Url"
}

function Wait-ForLogMatch {
  param(
    [string]$Pattern,
    [int]$TimeoutSeconds = 60
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    $logs = adb logcat -d 2>$null
    if ($logs -match $Pattern) {
      return
    }
    Start-Sleep -Seconds 2
  }

  throw "Timed out waiting for Android log pattern: $Pattern"
}

function Export-UiDump {
  param([string]$OutputPath)

  New-Item -ItemType Directory -Path (Split-Path -Parent $OutputPath) -Force | Out-Null
  adb shell uiautomator dump /sdcard/window_dump.xml | Out-Null
  adb pull /sdcard/window_dump.xml $OutputPath | Out-Null
  return Get-Content $OutputPath -Raw
}

function Get-ElementCenter {
  param(
    [string]$UiDump,
    [string]$Pattern
  )

  $match = [regex]::Match($UiDump, $Pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)
  if (-not $match.Success) {
    return $null
  }

  $bounds = $match.Groups['bounds'].Value
  $coords = [regex]::Match($bounds, '\[(\d+),(\d+)\]\[(\d+),(\d+)\]')
  if (-not $coords.Success) {
    return $null
  }

  $x = [int](($coords.Groups[1].Value -as [int]) + ($coords.Groups[3].Value -as [int])) / 2
  $y = [int](($coords.Groups[2].Value -as [int]) + ($coords.Groups[4].Value -as [int])) / 2

  return @{ X = $x; Y = $y }
}

function Tap-UiElement {
  param(
    [string]$UiDump,
    [string]$Pattern
  )

  $point = Get-ElementCenter -UiDump $UiDump -Pattern $Pattern
  if ($null -eq $point) {
    return $false
  }

  adb shell input tap $point.X $point.Y | Out-Null
  Start-Sleep -Seconds 2
  return $true
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$javaHome = 'C:\Program Files\Android\Android Studio\jbr'

if (-not (Test-Path $javaHome)) {
  throw "JAVA_HOME not found at $javaHome"
}

$device = (adb devices | Select-String "`tdevice$" | Select-Object -First 1)
if (-not $device) {
  throw 'No Android emulator/device detected via adb.'
}

Write-Host 'Preparing Android dev-client smoke test...'
Stop-PortProcess -Port 8081
adb reverse tcp:8081 tcp:8081 | Out-Null
adb logcat -c

$env:JAVA_HOME = $javaHome
$env:PATH = "$javaHome\bin;$env:PATH"

$metro = Start-Process -FilePath 'powershell' `
  -ArgumentList '-NoExit', '-Command', 'npm run start:dev-client' `
  -WorkingDirectory $repoRoot `
  -PassThru

Wait-ForHttpOk -Url 'http://127.0.0.1:8081/status' -TimeoutSeconds 90

Write-Host 'Building and installing Android debug app...'
cmd /c "set JAVA_HOME=$javaHome&& set PATH=%JAVA_HOME%\bin;%PATH%&& npx expo prebuild --platform android --no-install" | Out-Host
if ($LASTEXITCODE -ne 0) {
  throw "expo prebuild failed with exit code $LASTEXITCODE"
}

cmd /c "set JAVA_HOME=$javaHome&& set PATH=%JAVA_HOME%\bin;%PATH%&& npx expo run:android --variant debug --port 8081" | Out-Host
if ($LASTEXITCODE -ne 0) {
  throw "expo run:android failed with exit code $LASTEXITCODE"
}

adb shell am force-stop com.tradeconnect.app | Out-Null
adb shell monkey -p com.tradeconnect.app -c android.intent.category.LAUNCHER 1 | Out-Null

Wait-ForLogMatch -Pattern 'ReactNativeJS: Running "main"|ReactNativeJS: Running "HomeMenu"' -TimeoutSeconds 120

$uiDumpPath = Join-Path $repoRoot '.codex-temp\android-smoke-ui.xml'
$uiDump = Export-UiDump -OutputPath $uiDumpPath

if ($uiDump -match 'content-desc="Continue"|text="Continue"') {
  Write-Host 'Dismissing Expo dev-menu onboarding...'
  $continuePattern = '(<node[^>]+(?:content-desc|text)="Continue"[^>]+bounds="(?<bounds>\[[^"]+\]\[[^"]+\])")'
  [void](Tap-UiElement -UiDump $uiDump -Pattern $continuePattern)
  $uiDump = Export-UiDump -OutputPath $uiDumpPath
}

if ($uiDump -match 'content-desc="Go home"|text="Go home"') {
  Write-Host 'Returning from Expo dev menu to app...'
  $goHomePattern = '(<node[^>]+(?:content-desc|text)="Go home"[^>]+bounds="(?<bounds>\[[^"]+\]\[[^"]+\])")'
  [void](Tap-UiElement -UiDump $uiDump -Pattern $goHomePattern)
  $uiDump = Export-UiDump -OutputPath $uiDumpPath
}

if ($uiDump -notmatch 'TradeConnect|Get Started|Log In') {
  throw 'Android UI dump did not contain expected welcome-screen text.'
}

Write-Host 'Android smoke test passed.'
Write-Host "Metro PID: $($metro.Id)"
