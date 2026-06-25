<#
.SYNOPSIS
  Install (or remove) the Bifrost laptop server as a per-user logon auto-start.

  Drops a hidden launcher into the current user's Startup folder so the
  supervisor (start-bifrost.ps1) runs at every logon and keeps Bifrost + the
  cloudflared tunnel alive. No administrator rights required.

.PARAMETER Uninstall  Remove the auto-start launcher instead of installing it.
.PARAMETER Port       Port to pass through to the supervisor (default 3001).
.PARAMETER SkipVercel Pass -SkipVercel through to the supervisor.

.EXAMPLE
  ./install-autostart.ps1
  ./install-autostart.ps1 -Uninstall
#>
[CmdletBinding()]
param(
  [switch]$Uninstall,
  [int]$Port = 3001,
  [switch]$SkipVercel
)

$ErrorActionPreference = 'Stop'
$Supervisor  = Join-Path $PSScriptRoot 'start-bifrost.ps1'
$StartupDir  = [Environment]::GetFolderPath('Startup')
$LauncherCmd = Join-Path $StartupDir 'KickBox-Bifrost-Server.cmd'

if ($Uninstall) {
  if (Test-Path $LauncherCmd) {
    Remove-Item $LauncherCmd -Force
    Write-Host "Removed auto-start launcher: $LauncherCmd"
  } else {
    Write-Host "No auto-start launcher found."
  }
  return
}

if (-not (Test-Path $Supervisor)) { throw "Supervisor not found at $Supervisor" }

$extra = if ($SkipVercel) { ' -SkipVercel' } else { '' }
# Hidden, no-profile PowerShell launching the supervisor at logon.
$cmd = @"
@echo off
start "" /min powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "$Supervisor" -Port $Port$extra
"@
Set-Content -Path $LauncherCmd -Value $cmd -Encoding ASCII

Write-Host "Installed auto-start launcher:"
Write-Host "  $LauncherCmd"
Write-Host ""
Write-Host "Bifrost + tunnel will start on next logon. To start now without"
Write-Host "rebooting, run:  powershell -ExecutionPolicy Bypass -File `"$Supervisor`""
Write-Host "To remove:        ./install-autostart.ps1 -Uninstall"
