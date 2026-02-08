# Dynamics Helper - One-Click Installer/Updater
# Run this script with PowerShell to Install or Update

$ErrorActionPreference = "Stop"
$AppName = "DynamicsHelper"

# CRITICAL FIX: The user's legacy install and standard Windows app behavior prefer LOCAL AppData.
# We default to LOCALAPPDATA to match the legacy behavior.
$DestDir = "$env:LOCALAPPDATA\$AppName"

# CRITICAL FIX: Must match the Host ID defined in extension/background/serviceWorker.ts
$HostName = "com.dynamics.helper.native"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   Dynamics Helper Installer / Updater" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Target Installation Directory: $DestDir" -ForegroundColor Gray

# 0. Cleanup from previous "Roaming" mistake
# If the user ran the "bad" installer, they might have config in Roaming. Move it back.
$MistakeDir = "$env:APPDATA\$AppName"
if (Test-Path $MistakeDir) {
    Write-Host "[*] Found installation in Roaming AppData (from previous script). Migrating back to Local..." -ForegroundColor Yellow
    
    # Ensure Dest exists
    if (-not (Test-Path $DestDir)) {
        New-Item -ItemType Directory -Path $DestDir | Out-Null
    }

    # Rescue Config
    if (Test-Path "$MistakeDir\config.json") {
        Copy-Item "$MistakeDir\config.json" -Destination "$DestDir\" -Force
        Write-Host "    - config.json rescued from Roaming."
    }
    # Rescue Instructions
    if (Test-Path "$MistakeDir\copilot-instructions.md") {
        Copy-Item "$MistakeDir\copilot-instructions.md" -Destination "$DestDir\" -Force
    } elseif (Test-Path "$MistakeDir\user-instructions.md") {
        # Rescue Legacy Name -> New Name
        Copy-Item "$MistakeDir\user-instructions.md" -Destination "$DestDir\copilot-instructions.md" -Force
        Write-Host "    - user-instructions.md rescued and renamed to copilot-instructions.md."
    }
    
    # Nuke the Roaming folder to prevent split-brain
    try {
        Remove-Item $MistakeDir -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "    - Cleaned up Roaming folder."
    } catch {
        Write-Warning "Could not fully delete '$MistakeDir'. Please delete it manually."
    }
}

# 1. Stop Running Process
Write-Host "[*] Checking for running processes..."
$Process = Get-Process -Name "dh_native_host" -ErrorAction SilentlyContinue
if ($Process) {
    Write-Host "    Stopping dh_native_host.exe..." -ForegroundColor Yellow
    Stop-Process -Name "dh_native_host" -Force
    Start-Sleep -Seconds 1
}

# 2. Prepare Destination
if (-not (Test-Path $DestDir)) {
    Write-Host "[*] Creating installation directory: $DestDir"
    New-Item -ItemType Directory -Path $DestDir | Out-Null
}

# 3. Copy Host Files
Write-Host "[*] Installing Host files..."
$HostSrc = "$PSScriptRoot\host"
if (-not (Test-Path $HostSrc)) {
    Write-Error "Could not find 'host' folder in '$PSScriptRoot'. Please extract the zip file completely before running."
}

Copy-Item "$HostSrc\dh_native_host.exe" -Destination "$DestDir\" -Force
Write-Host "    - dh_native_host.exe copied."

# Copy config if not exists
if (-not (Test-Path "$DestDir\config.json")) {
    if (Test-Path "$HostSrc\config.json") {
        Copy-Item "$HostSrc\config.json" -Destination "$DestDir\"
        Write-Host "    - Default config.json copied."
    }
}

# Force update instructions
if (Test-Path "$HostSrc\system_prompt.md") {
    Copy-Item "$HostSrc\system_prompt.md" -Destination "$DestDir\" -Force
    Write-Host "    - system_prompt.md updated."
}

# 4. Copy Extension Files
Write-Host "[*] Installing Extension files..."
$ExtDest = "$DestDir\extension"
$ExtSrc = "$PSScriptRoot\extension"

if (-not (Test-Path $ExtSrc)) {
    Write-Error "Could not find 'extension' folder in '$PSScriptRoot'. Please extract the zip file completely."
}

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

$ExePath = "$DestDir\dh_native_host.exe"
if (-not (Test-Path $ExePath)) {
    Write-Error "Executable not found at '$ExePath'. Cannot register."
}

try {
    Write-Host "    Running registration command..."
    # Execute the host with --register. 
    # We pipe to Write-Host to show output, but in a way that doesn't break the script if it writes to stdout (which it does).
    $RegisterOutput = & $ExePath --register 2>&1
    
    # Check for success pattern in output or exit code
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    $RegisterOutput" -ForegroundColor Gray
        Write-Host "    - Registration successful."
    } else {
        Write-Error "Registration failed with exit code $LASTEXITCODE. Output: $RegisterOutput"
    }
} catch {
    Write-Error "Failed to execute registration command: $_"
}



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







Write-Host ""
Read-Host "Press Enter to exit"

