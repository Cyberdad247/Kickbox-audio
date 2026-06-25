<#
.SYNOPSIS
  Stable laptop server for the Bifrost gateway.

  Builds Bifrost (node dist), starts it, exposes it via a free cloudflared
  tunnel, and keeps both alive. If the public tunnel URL changes (TryCloudflare
  mints a new one on each restart), it auto-rewires the Vercel
  NEXT_PUBLIC_BIFROST_URL env and redeploys production -- so the live PWA always
  points at this laptop with zero paid hosting.

.PARAMETER Port        Local port for Bifrost (default 3001).
.PARAMETER SkipVercel  Do not touch Vercel env / redeploy on URL change.
.PARAMETER Rebuild     Force a clean rebuild even if dist/ already exists.

.EXAMPLE
  ./start-bifrost.ps1
  ./start-bifrost.ps1 -Port 3001 -SkipVercel
#>
[CmdletBinding()]
param(
  [int]$Port = 3001,
  [switch]$SkipVercel,
  [switch]$Rebuild
)

$ErrorActionPreference = 'Stop'
$RepoRoot    = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$PwaDir      = Join-Path $RepoRoot 'apps\pwa'
$BifrostDir  = Join-Path $RepoRoot 'apps\bifrost'
$BinDir      = Join-Path $PSScriptRoot 'bin'
$LogDir      = Join-Path $PSScriptRoot 'logs'
$Cloudflared = Join-Path $BinDir 'cloudflared.exe'
$StateFile   = Join-Path $LogDir 'last-tunnel-url.txt'
$TunnelLog   = Join-Path $LogDir 'cloudflared.log'
$BifrostLog  = Join-Path $LogDir 'bifrost.log'

New-Item -ItemType Directory -Force -Path $BinDir, $LogDir | Out-Null

function Log($msg) {
  $line = "{0}  {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
  Write-Host $line
  Add-Content -Path (Join-Path $LogDir 'supervisor.log') -Value $line
}

# Ensure cloudflared (portable, no account)
function Ensure-Cloudflared {
  if (Get-Command cloudflared -ErrorAction SilentlyContinue) {
    $script:Cloudflared = (Get-Command cloudflared).Source
    return
  }
  if (-not (Test-Path $Cloudflared)) {
    Log "cloudflared not found -- downloading portable binary..."
    $url = 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe'
    Invoke-WebRequest -Uri $url -OutFile $Cloudflared -UseBasicParsing
    Log "cloudflared downloaded to $Cloudflared"
  }
}

# Build Bifrost to JS (node dist)
function Ensure-Build {
  $serverJs = Join-Path $BifrostDir 'dist\server.js'
  if ((Test-Path $serverJs) -and -not $Rebuild) { return }
  Log "Building Bifrost (db generate + turbo build)..."
  Push-Location $RepoRoot
  try {
    if (-not $env:DATABASE_URL) {
      $env:DATABASE_URL = 'postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public'
    }
    & npm run db:generate | Out-Null
    & npx turbo run build --filter=bifrost... | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Bifrost build failed (exit $LASTEXITCODE)" }
  } finally { Pop-Location }
  Log "Build complete."
}

# Process launchers
function Start-Bifrost {
  if (-not $env:DATABASE_URL) {
    $env:DATABASE_URL = 'postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public'
  }
  $env:PORT = "$Port"
  Log "Starting Bifrost on port $Port (node dist/server.js)..."
  return Start-Process -FilePath 'node' -ArgumentList 'dist\server.js' `
    -WorkingDirectory $BifrostDir -PassThru -WindowStyle Hidden `
    -RedirectStandardOutput $BifrostLog -RedirectStandardError ($BifrostLog + '.err')
}

function Start-Tunnel {
  if (Test-Path $TunnelLog) { Remove-Item $TunnelLog -Force }
  Log "Starting cloudflared tunnel -> http://localhost:$Port ..."
  return Start-Process -FilePath $Cloudflared `
    -ArgumentList @('tunnel', '--no-autoupdate', '--url', "http://localhost:$Port") `
    -PassThru -WindowStyle Hidden -RedirectStandardError $TunnelLog `
    -RedirectStandardOutput ($TunnelLog + '.out')
}

function Get-TunnelUrl {
  for ($i = 0; $i -lt 30; $i++) {
    if (Test-Path $TunnelLog) {
      $m = Select-String -Path $TunnelLog -Pattern 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' -ErrorAction SilentlyContinue | Select-Object -First 1
      if ($m) { return $m.Matches[0].Value }
    }
    Start-Sleep -Seconds 1
  }
  return $null
}

# Rewire Vercel when the public URL changes
function Update-Vercel($httpsUrl) {
  $wss = $httpsUrl -replace '^https://', 'wss://'
  $last = if (Test-Path $StateFile) { (Get-Content $StateFile -Raw).Trim() } else { '' }
  if ($wss -eq $last) { Log "Tunnel URL unchanged -- no redeploy needed."; return }

  if ($SkipVercel) {
    Log "URL changed to $wss (Vercel rewire skipped via -SkipVercel)."
    Set-Content -Path $StateFile -Value $wss
    return
  }

  Log "Tunnel URL changed -> $wss. Rewiring Vercel + redeploying production..."
  Push-Location $PwaDir
  try {
    & vercel env rm NEXT_PUBLIC_BIFROST_URL production --yes 2>$null | Out-Null
    $wss | & vercel env add NEXT_PUBLIC_BIFROST_URL production | Out-Null
    & vercel deploy --prod --yes | Out-Null
    if ($LASTEXITCODE -eq 0) {
      Set-Content -Path $StateFile -Value $wss
      Log "Vercel production redeployed with $wss"
    } else {
      Log "WARNING: vercel deploy returned exit $LASTEXITCODE"
    }
  } catch {
    Log "WARNING: Vercel rewire failed: $($_.Exception.Message)"
  } finally { Pop-Location }
}

# Supervisor loop
Ensure-Cloudflared
Ensure-Build

$bifrost = Start-Bifrost
$tunnel  = Start-Tunnel
$url     = Get-TunnelUrl
if ($url) { Log "Public tunnel: $url"; Update-Vercel $url }
else { Log "WARNING: could not detect tunnel URL yet." }

Log "Supervisor running. Bifrost pid=$($bifrost.Id), tunnel pid=$($tunnel.Id). Ctrl+C to stop."
try {
  while ($true) {
    Start-Sleep -Seconds 5
    if ($bifrost.HasExited) {
      Log "Bifrost exited (code $($bifrost.ExitCode)) -- restarting..."
      $bifrost = Start-Bifrost
    }
    if ($tunnel.HasExited) {
      Log "Tunnel exited (code $($tunnel.ExitCode)) -- restarting..."
      $tunnel = Start-Tunnel
      $newUrl = Get-TunnelUrl
      if ($newUrl) { Log "New tunnel: $newUrl"; Update-Vercel $newUrl }
    }
  }
} finally {
  Log "Stopping supervisor -- terminating child processes."
  foreach ($p in @($bifrost, $tunnel)) {
    if ($p -and -not $p.HasExited) { try { $p.Kill() } catch {} }
  }
}
