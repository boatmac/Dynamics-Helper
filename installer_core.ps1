# Dynamics Helper - One-Click Installer/Updater
# Run this script with PowerShell to Install or Update

$ErrorActionPreference = "Stop"
$AppName = "DynamicsHelper"

# CRITICAL FIX: The user's legacy install and standard Windows app behavior prefer LOCAL AppData.
# We default to LOCALAPPDATA to match the legacy behavior.
$DestDir = "$env:LOCALAPPDATA\$AppName"

# CRITICAL FIX: Must match the Host ID defined in extension/background/serviceWorker.ts
$HostName = "com.dynamics.helper.native"
$HostSrc = "$PSScriptRoot\host"
$ExtSrc = "$PSScriptRoot\extension"
$PackageManifest = "$PSScriptRoot\update-manifest.json"

try {
# Refuse ambiguous user state and active Hosts before any filesystem mutation.
Write-Host "[*] Checking for running processes..."
$Process = Get-Process -Name "dh_native_host" -ErrorAction SilentlyContinue
if ($Process) {
    Write-Host "Installation stopped: dh_native_host is running. Close Dynamics Helper and its browser normally before retrying. No files or processes were changed." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}
$LegacyDir = "$env:APPDATA\$AppName"
if (Test-Path $LegacyDir) {
    Write-Host "Installation stopped: a legacy Roaming directory exists at '$LegacyDir'. Local and Roaming data are preserved; resolve the legacy installation with your administrator before retrying. No automatic migration was performed." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Validate the complete packaged product before changing user state.
# The probe expects the installed layout, so materialize a
# temporary combined Host/Extension view from the extracted release.
foreach ($RequiredPath in @(
    "$HostSrc\dh_native_host.exe",
    "$HostSrc\_internal",
    "$HostSrc\release-integrity.json",
    "$HostSrc\installed-product.json",
    "$ExtSrc\manifest.json",
    $PackageManifest
)) {
    if (-not (Test-Path $RequiredPath)) {
        Write-Error "The installer package is incomplete: '$RequiredPath' is missing."
    }
}
$PreflightRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("DynamicsHelper-preflight-" + [guid]::NewGuid().ToString("N"))
try {
    New-Item -ItemType Directory -Path $PreflightRoot | Out-Null
    Copy-Item "$HostSrc\*" -Destination $PreflightRoot -Recurse -Force
    New-Item -ItemType Directory -Path "$PreflightRoot\extension" | Out-Null
    Copy-Item "$ExtSrc\*" -Destination "$PreflightRoot\extension" -Recurse -Force
    $PreflightOutput = & "$PreflightRoot\dh_native_host.exe" --update-probe $PackageManifest $PSScriptRoot 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "The installer package failed integrity validation. Output: $PreflightOutput"
    }
} finally {
    if (Test-Path $PreflightRoot) {
        Remove-Item $PreflightRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   Dynamics Helper Installer / Updater" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Target Installation Directory: $DestDir" -ForegroundColor Gray

# 2. Prepare Destination
if (-not (Test-Path $DestDir)) {
    Write-Host "[*] Creating installation directory: $DestDir"
    New-Item -ItemType Directory -Path $DestDir | Out-Null
}

# 3. Copy Host Files
Write-Host "[*] Installing Host files..."

# The packaged runtime is one exact product tree. Remove the old runtime first
# so a matching full installer can repair stale or mixed _internal bytes.
if (Test-Path "$DestDir\_internal") {
    Remove-Item "$DestDir\_internal" -Recurse -Force
}

# Copy all host files (exe + DLLs from --onedir build + config files)
# This overwrites existing files but preserves user config (checked below)
Get-ChildItem -Path $HostSrc -Recurse | ForEach-Object {
    $RelPath = $_.FullName.Substring($HostSrc.Length + 1)
    $DestPath = Join-Path $DestDir $RelPath

    if ($_.PSIsContainer) {
        if (-not (Test-Path $DestPath)) {
            New-Item -ItemType Directory -Path $DestPath | Out-Null
        }
    } else {
        # Skip config.json if user already has one (preserve user settings)
        if ($RelPath -eq "config.json" -and (Test-Path "$DestDir\config.json")) {
            return
        }
        Copy-Item $_.FullName -Destination $DestPath -Force
    }
}
Write-Host "    - Host files copied (exe + runtime libraries)."

# Force update system_prompt.md (already copied above, but ensure it's there)
if (Test-Path "$HostSrc\system_prompt.md") {
    Copy-Item "$HostSrc\system_prompt.md" -Destination "$DestDir\" -Force
    Write-Host "    - system_prompt.md updated."
}

# 4. Copy Extension Files
Write-Host "[*] Installing Extension files..."
$ExtDest = "$DestDir\extension"
# Clean old extension files to remove stale files
if (Test-Path $ExtDest) {
    Remove-Item $ExtDest -Recurse -Force
}
New-Item -ItemType Directory -Path $ExtDest | Out-Null
Copy-Item "$ExtSrc\*" -Destination $ExtDest -Recurse

# VERIFY Extension Copy
$FileCount = (Get-ChildItem $ExtDest -Recurse).Count
if ($FileCount -eq 0) {
    Write-Error "Extension copy failed! Destination '$ExtDest' is empty. Check permissions or disk space."
}
Write-Host "    - Extension files copied to: $ExtDest ($FileCount files)"

# Verify the exact installed product and settle any preserved transaction to the
# matching target/prior terminal state before registration can report success.
$ExePath = "$DestDir\dh_native_host.exe"
$LiveProbeOutput = & $ExePath --update-probe $PackageManifest 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "The installed product failed integrity validation. Output: $LiveProbeOutput"
}
$SettlementOutput = & $ExePath --settle-installer-repair 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "The preserved update transaction could not be settled. Output: $SettlementOutput"
}

# 5. Registry Update
$ManifestPath = "$DestDir\manifest.json"
$IsUpdate = Test-Path $ManifestPath


# --- COMMON: Generate Manifest & Register ---

Write-Host "Configuring Native Host Manifest..." -ForegroundColor Gray

# CRITICAL FIX (v2.0.39): Delegate registration to the Python Executable.
# PowerShell has proven unreliable for generating JSON without BOM or encoding issues across different Windows locales.
# The executable now has a '--register' flag that uses Python's standard library to:
# 1. Generate 'manifest.json' (Strict UTF-8, No BOM)
# 2. Update the Windows Registry for Chrome and Edge
# This ensures perfect consistency regardless of the user's shell environment.

if (-not (Test-Path $ExePath)) {
    throw "The installed Host executable is missing."
}

Write-Host "    Running registration command..."
$RegisterOutput = & $ExePath --register 2>&1
if ($LASTEXITCODE -ne 0) {
    throw "Registration failed."
}
Write-Host "    $RegisterOutput" -ForegroundColor Gray
Write-Host "    - Registration successful."

if ($IsUpdate) {
    Write-Host ""
    Write-Host "SUCCESS: Update Complete!" -ForegroundColor Green
    Write-Host "-------------------------"
    Write-Host "The Native Host manifest has been updated with the latest Allowed Origins." -ForegroundColor Yellow
    Write-Host "Please restart your browser (Edge/Chrome) for changes to take effect." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "IMPORTANT: Ensure your browser is loading the extension from:" -ForegroundColor Yellow
    Write-Host "   $ExtDest" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "SUCCESS: Installation Complete!" -ForegroundColor Green
    Write-Host "-------------------------"
    Write-Host "1. Go to chrome://extensions (or edge://extensions)"
    Write-Host "2. Enable 'Developer mode'"
    Write-Host "3. Click 'Load unpacked'"
    Write-Host "4. Select this folder:"
    Write-Host "   $ExtDest" -ForegroundColor Cyan
    Write-Host ""
}
} catch {
    Write-Host "Installation failed. A required file or operation is unavailable or blocked. Keep security protections unchanged; preserve any security detection details and contact your administrator or the project maintainer." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Read-Host "Press Enter to exit"
exit 0
