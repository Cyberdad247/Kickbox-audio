<#
.SYNOPSIS
  Stable laptop server for the full KickBox backend.

  Builds and supervises mcp-query + Bifrost (node dist), exposes Bifrost via a
  free cloudflared tunnel, and keeps all three alive. Bifrost's REMOTE_MCP_URL is
  auto-derived from this machine's Tailscale IP (so the zero-trust gate passes and
  the wiring survives reboots). If the public tunnel URL changes, it auto-rewires
  the Vercel NEXT_PUBLIC_BIFROST_URL env and redeploys production.

.PARAMETER Port        Local port for Bifrost (default 3001).
.PARAMETER McpPort     Local port for mcp-query (default 7800).
.PARAMETER SkipVercel  Do not touch Vercel env / redeploy on URL change.
.PARAMETER Rebuild     Force a clean rebuild even if dist/ already exists.

.EXAMPLE
  ./start-bifrost.ps1
  $env:MULTIVOICE_URL = 'http://localhost:8790'; ./start-bifrost.ps1
#>
[CmdletBinding()]
param(
  [int]$Port = 3001,
  [int]$McpPort = 7800,
  [switch]$SkipVercel,
  [switch]$Rebuild
)

$ErrorActionPreference = 'Stop'
$RepoRoot    = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$PwaDir      = Join-Path $RepoRoot 'apps\pwa'
$BifrostDir  = Join-Path $RepoRoot 'apps\bifrost'
$McpDir      = Join-Path $RepoRoot 'apps\mcp-query'
$BinDir      = Join-Path $PSScriptRoot 'bin'
$LogDir      = Join-Path $PSScriptRoot 'logs'
$Cloudflared = Join-Path $BinDir 'cloudflared.exe'
$StateFile   = Join-Path $LogDir 'last-tunnel-url.txt'
$TunnelLog   = Join-Path $LogDir 'cloudflared.log'
$BifrostLog  = Join-Path $LogDir 'bifrost.log'
$McpLog      = Join-Path $LogDir 'mcp-query.log'

New-Item -ItemType Directory -Force -Path $BinDir, $LogDir | Out-Null

function Log($msg) {
  $line = "{0}  {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
  Write-Host $line
  Add-Content -Path (Join-Path $LogDir 'supervisor.log') -Value $line
}

# This machine's Tailscale IP (Bifrost's REMOTE_MCP gate requires a tailnet host).
function Get-TailnetIp {
  try {
    $ip = (& tailscale ip -4 2>$null | Select-Object -First 1)
    if ($ip) { return $ip.Trim() }
  } catch {}
  return $null
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

# Build mcp-query + Bifrost to JS (node dist)
function Ensure-Build {
  $bifrostJs = Join-Path $BifrostDir 'dist\server.js'
  $mcpJs = Join-Path $McpDir 'dist\server.js'
  if ((Test-Path $bifrostJs) -and (Test-Path $mcpJs) -and -not $Rebuild) { return }
  Log "Building backend (db generate + turbo build bifrost + mcp-query)..."
  Push-Location $RepoRoot
  try {
    if (-not $env:DATABASE_URL) {
      $env:DATABASE_URL = 'postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public'
    }
    & npm run db:generate | Out-Null
    & npx turbo run build --filter=bifrost... --filter=mcp-query | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "build failed (exit $LASTEXITCODE)" }
  } finally { Pop-Location }
  Log "Build complete."
}

# Process launchers
function Start-Mcp {
  $env:PORT = "$McpPort"
  $mv = if ($env:MULTIVOICE_URL) { $env:MULTIVOICE_URL } else { 'off' }
  Log "Starting mcp-query on port $McpPort (multivoice=$mv)..."
  return Start-Process -FilePath 'node' -ArgumentList 'dist\server.js' `
    -WorkingDirectory $McpDir -PassThru -WindowStyle Hidden `
    -RedirectStandardOutput $McpLog -RedirectStandardError ($McpLog + '.err')
}

function Start-Bifrost {
  if (-not $env:DATABASE_URL) {
    $env:DATABASE_URL = 'postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public'
  }
  $tip = Get-TailnetIp
  if ($tip) { $env:REMOTE_MCP_URL = "http://${tip}:$McpPort" }
  $env:PORT = "$Port"
  Log "Starting Bifrost on port $Port (REMOTE_MCP_URL=$env:REMOTE_MCP_URL)..."
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

  Log "Tunnel URL changed -> $wss. Rewiring Vercel env + redeploying production..."
  # Local 'Continue' so a native command's stderr can never terminate the
  # supervisor (the global 'Stop' would otherwise kill the whole loop here).
  $ErrorActionPreference = 'Continue'
  $pushed = $false
  try {
    # 1) update the env (env commands are unaffected by Root Directory).
    Push-Location $PwaDir; $pushed = $true
    & vercel env rm NEXT_PUBLIC_BIFROST_URL production --yes *> $null
    $wss | & vercel env add NEXT_PUBLIC_BIFROST_URL production *> $null
    Pop-Location; $pushed = $false

    # 2) trigger a git production deploy via the API (`vercel deploy` double-paths
    #    with Root Directory = apps/pwa, so use the deployments API instead).
    $authPath = Join-Path $env:APPDATA 'com.vercel.cli\Data\auth.json'
    $token = (Get-Content $authPath -Raw | ConvertFrom-Json).token
    $body = @{
      name      = 'kickbox-audio'
      project   = 'prj_VhkLdfphdOiRMrh3HrFGxx33YVfA'
      target    = 'production'
      gitSource = @{ type = 'github'; repoId = 1271672586; ref = 'main' }
    } | ConvertTo-Json -Depth 5
    $uri = 'https://api.vercel.com/v13/deployments?teamId=team_78LOik19M2ajsb756UF0aOGr&forceNew=1'
    $resp = Invoke-RestMethod -Method Post -Uri $uri -Headers @{ Authorization = "Bearer $token" } -ContentType 'application/json' -Body $body
    Set-Content -Path $StateFile -Value $wss
    Log "Vercel git deploy triggered: $($resp.id) -> $wss"
  } catch {
    Log "WARNING: Vercel rewire failed: $($_.Exception.Message)"
  } finally {
    if ($pushed) { Pop-Location }
  }
}

# Supervisor loop
Ensure-Cloudflared
Ensure-Build

$mcp     = Start-Mcp
$bifrost = Start-Bifrost
$tunnel  = Start-Tunnel
$url     = Get-TunnelUrl
if ($url) { Log "Public tunnel: $url"; Update-Vercel $url }
else { Log "WARNING: could not detect tunnel URL yet." }

Log "Supervisor running. mcp=$($mcp.Id) bifrost=$($bifrost.Id) tunnel=$($tunnel.Id). Ctrl+C to stop."
try {
  while ($true) {
    Start-Sleep -Seconds 5
    if ($mcp.HasExited) {
      Log "mcp-query exited (code $($mcp.ExitCode)) -- restarting..."
      $mcp = Start-Mcp
    }
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
  foreach ($p in @($mcp, $bifrost, $tunnel)) {
    if ($p -and -not $p.HasExited) { try { $p.Kill() } catch {} }
  }
}
