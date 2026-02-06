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

function Set-RegistryKeys {
    param ($ManifestPath)
    $RegPathChrome = "HKCU\Software\Google\Chrome\NativeMessagingHosts\$HostName"
    $RegPathEdge = "HKCU\Software\Microsoft\Edge\NativeMessagingHosts\$HostName"
    
    # Chrome
    if (-not (Test-Path $RegPathChrome)) { 
        New-Item -Path $RegPathChrome -Force | Out-Null 
    }
    # Use Set-Item for Default Value (Robust Method)
    Set-Item -Path "Registry::$RegPathChrome" -Value $ManifestPath
    
    # Edge
    if (-not (Test-Path $RegPathEdge)) { 
        New-Item -Path $RegPathEdge -Force | Out-Null 
    }
    Set-Item -Path "Registry::$RegPathEdge" -Value $ManifestPath
    
    Write-Host "    - Registry keys updated to point to: $DestDir"
}

if ($IsUpdate) {
    Write-Host "[*] Updating existing installation..."
    
    # Always update registry in case of path migration
    try {
        Set-RegistryKeys -ManifestPath $ManifestPath
    } catch {
        Write-Warning "Failed to update registry keys: $_"
    }

    Write-Host "SUCCESS: Installation/Update Complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "IMPORTANT: Ensure your browser is loading the extension from:" -ForegroundColor Yellow
    Write-Host "   $ExtDest" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "If you don't see the new version:"
    Write-Host "1. Go to chrome://extensions"
    Write-Host "2. Click 'Remove' on Dynamics Helper"
    Write-Host "3. Click 'Load unpacked' and select the folder above."
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "NEW INSTALLATION DETECTED" -ForegroundColor Yellow
    Write-Host "-------------------------"
    Write-Host "1. Go to chrome://extensions"
    Write-Host "2. Enable 'Developer mode'"
    Write-Host "3. Click 'Load unpacked'"
    Write-Host "4. Select this folder:"
    Write-Host "   $ExtDest" -ForegroundColor Cyan
    Write-Host ""
    
    # Auto-configure with fixed ID
    $ExtId = "fkemelmlolmdnldpofiahmnhngmhonno"
    Write-Host "Auto-configuring for Extension ID: $ExtId" -ForegroundColor Gray
    
    # Create Manifest
    $ManifestContent = @{
        name = $HostName
        description = "Dynamics Helper Native Host"
        path = "dh_native_host.exe"
        type = "stdio"
        allowed_origins = @(
            "chrome-extension://$ExtId/",
            "extension://$ExtId/"
        )
    } | ConvertTo-Json
    
    $ManifestContent | Out-File -FilePath $ManifestPath -Encoding ascii
    Write-Host "    - Manifest created."
    
    # Register
    Set-RegistryKeys -ManifestPath $ManifestPath
    
    Write-Host ""
    Write-Host "SUCCESS: Installation Complete!" -ForegroundColor Green
}

Write-Host ""
Read-Host "Press Enter to exit"

