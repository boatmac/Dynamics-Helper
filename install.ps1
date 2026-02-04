# Dynamics Helper - One-Click Installer/Updater
# Run this script with PowerShell to Install or Update

$ErrorActionPreference = "Stop"
$AppName = "DynamicsHelper"
# Use LOCALAPPDATA for binaries/installation (Standard practice and matches previous installer)
$DestDir = "$env:LOCALAPPDATA\$AppName"
$HostName = "com.microsoft.dynamics.helper"
$RoamingDir = "$env:APPDATA\$AppName"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   Dynamics Helper Installer / Updater" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Stop Running Process
Write-Host "[*] Checking for running processes..."
$Process = Get-Process -Name "dh_native_host" -ErrorAction SilentlyContinue
if ($Process) {
    Write-Host "    Stopping dh_native_host.exe..." -ForegroundColor Yellow
    Stop-Process -Name "dh_native_host" -Force
    Start-Sleep -Seconds 1
}

# 1.5 Cleanup Roaming if it exists (Fix for previous version inconsistency)
if (Test-Path $RoamingDir) {
    Write-Host "[*] Cleaning up old Roaming installation..." -ForegroundColor Yellow
    try {
        Remove-Item $RoamingDir -Recurse -Force -ErrorAction SilentlyContinue
    } catch {
        Write-Warning "Could not fully remove $RoamingDir. You may need to delete it manually."
    }
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
    Write-Error "Could not find 'host' folder in current directory. Please extract the zip file completely."
}

Copy-Item "$HostSrc\dh_native_host.exe" -Destination "$DestDir\" -Force
Write-Host "    - dh_native_host.exe copied."

# Copy config/instructions only if they don't exist (preserve user settings)
if (-not (Test-Path "$DestDir\config.json")) {
    if (Test-Path "$HostSrc\config.json") {
        Copy-Item "$HostSrc\config.json" -Destination "$DestDir\"
        Write-Host "    - Default config.json copied."
    }
}
# Always update instructions? Or preserve? Let's preserve if exists, or maybe overwrite if we want to push updates?
# AGENTS.md says we respect user instructions. Let's overwrite the DEFAULT one, but the code looks for user one first.
# Actually, the code looks for 'copilot-instructions.md' in User Data.
# Let's force update the instructions so users get new prompts.
if (Test-Path "$HostSrc\copilot-instructions.md") {
    Copy-Item "$HostSrc\copilot-instructions.md" -Destination "$DestDir\" -Force
    Write-Host "    - copilot-instructions.md updated."
}

# 4. Copy Extension Files
Write-Host "[*] Installing Extension files..."
$ExtDest = "$DestDir\extension"
$ExtSrc = "$PSScriptRoot\extension"

if (-not (Test-Path $ExtSrc)) {
    Write-Error "Could not find 'extension' folder. Please extract the zip file completely."
}

# Clean old extension files to remove stale files
if (Test-Path $ExtDest) {
    Remove-Item $ExtDest -Recurse -Force
}
New-Item -ItemType Directory -Path $ExtDest | Out-Null
Copy-Item "$ExtSrc\*" -Destination $ExtDest -Recurse
Write-Host "    - Extension files copied to: $ExtDest"

# 5. Check Registration
$ManifestPath = "$DestDir\manifest.json"
$IsUpdate = Test-Path $ManifestPath

if ($IsUpdate) {
    Write-Host ""
    Write-Host "SUCCESS: Update Complete!" -ForegroundColor Green
    Write-Host "Please reload the extension in Chrome (chrome://extensions)."
} else {
    Write-Host ""
    Write-Host "NEW INSTALLATION DETECTED" -ForegroundColor Yellow
    Write-Host "-------------------------"
    Write-Host "1. Open Google Chrome (or Edge)."
    Write-Host "2. Go to extensions page (chrome://extensions)."
    Write-Host "3. Enable 'Developer mode' (top right)."
    Write-Host "4. Click 'Load unpacked'."
    Write-Host "5. Select this folder:"
    Write-Host "   $ExtDest" -ForegroundColor Cyan
    Write-Host ""
    
    $ExtId = Read-Host "Paste the 'ID' of the extension here (e.g. abcdef...)"
    
    if ([string]::IsNullOrWhiteSpace($ExtId)) {
        Write-Error "Extension ID is required to complete installation."
    }
    
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
    
    # Register in Registry
    $RegPathChrome = "HKCU\Software\Google\Chrome\NativeMessagingHosts\$HostName"
    $RegPathEdge = "HKCU\Software\Microsoft\Edge\NativeMessagingHosts\$HostName"
    
    New-Item -Path $RegPathChrome -Force | Out-Null
    Set-ItemProperty -Path $RegPathChrome -Name "(default)" -Value $ManifestPath
    
    New-Item -Path $RegPathEdge -Force | Out-Null
    Set-ItemProperty -Path $RegPathEdge -Name "(default)" -Value $ManifestPath
    
    Write-Host "    - Registry keys updated."
    
    Write-Host ""
    Write-Host "SUCCESS: Installation Complete!" -ForegroundColor Green
    Write-Host "You can now use Dynamics Helper."
}

Write-Host ""
Read-Host "Press Enter to exit"
