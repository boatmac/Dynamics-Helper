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

# Validate the complete packaged product before changing user state or stopping
# the live Host. The probe expects the installed layout, so materialize a
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
    Get-ChildItem -Path $PreflightRoot -Recurse -File | Unblock-File -ErrorAction SilentlyContinue
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

# Remove "Mark of the Web" (Zone.Identifier) from all host files.
# When the user downloads the zip from GitHub, Windows tags every extracted file
# with ZoneId=3 (Internet). This causes the exe to hang or be blocked by
# SmartScreen/Defender. Unblock-File strips the alternate data stream.
Get-ChildItem -Path $DestDir -Recurse -File | Unblock-File -ErrorAction SilentlyContinue
Write-Host "    - Files unblocked (Mark of the Web removed)."

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
    Write-Host ""
    Write-Host "!! Executable not found at: $ExePath !!" -ForegroundColor Red
    Write-Host "The file was copied but is now missing. This usually means your antivirus" -ForegroundColor Yellow
    Write-Host "quarantined it. See the steps below to whitelist the folder and re-run." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  1. Open Windows Security -> 'Virus & threat protection'" -ForegroundColor White
    Write-Host "  2. Go to 'Protection history' and restore the blocked file" -ForegroundColor White
    Write-Host "  3. Add an exclusion for: $DestDir" -ForegroundColor Cyan
    Write-Host "  4. Re-run this installer" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

$RegistrationFailed = $false

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
    $ErrorMsg = $_.Exception.Message
    $IsAVBlock = $ErrorMsg -match "virus|malware|potentially unwanted|threat|quarantine|blocked" -or
                 $ErrorMsg -match "Operation did not complete successfully because the file contains"

    if ($IsAVBlock) {
        $RegistrationFailed = $true
        Write-Host ""
        Write-Host "!! ANTIVIRUS BLOCKED THE REGISTRATION !!" -ForegroundColor Red
        Write-Host "==========================================" -ForegroundColor Red
        Write-Host ""
        Write-Host "Windows Defender (or your antivirus) blocked dh_native_host.exe from running." -ForegroundColor Yellow
        Write-Host "This is a FALSE POSITIVE. The executable is built with PyInstaller, which" -ForegroundColor Yellow
        Write-Host "some antivirus engines mistakenly flag because of how it packages Python." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "All files have been copied successfully, but the Native Host could not" -ForegroundColor Yellow
        Write-Host "register itself with Chrome/Edge." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "TO FIX THIS:" -ForegroundColor Cyan
        Write-Host "  1. Open Windows Security (search 'Windows Security' in Start Menu)" -ForegroundColor White
        Write-Host "  2. Go to 'Virus & threat protection'" -ForegroundColor White
        Write-Host "  3. Under 'Virus & threat protection settings', click 'Manage settings'" -ForegroundColor White
        Write-Host "  4. Scroll down to 'Exclusions' and click 'Add or remove exclusions'" -ForegroundColor White
        Write-Host "  5. Click 'Add an exclusion' -> 'Folder'" -ForegroundColor White
        Write-Host "  6. Select: $DestDir" -ForegroundColor Cyan
        Write-Host "  7. Re-run this installer" -ForegroundColor White
        Write-Host ""
        Write-Host "If the file was quarantined, you may also need to restore it:" -ForegroundColor Yellow
        Write-Host "  - In Windows Security -> 'Protection history'" -ForegroundColor White
        Write-Host "  - Find the blocked item and click 'Actions' -> 'Allow'" -ForegroundColor White
        Write-Host ""

        # Attempt to add exclusion automatically if running elevated
        $IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
            [Security.Principal.WindowsBuiltInRole]::Administrator
        )
        if ($IsAdmin) {
            Write-Host "Attempting to add Windows Defender exclusion automatically..." -ForegroundColor Gray
            try {
                Add-MpPreference -ExclusionPath $DestDir -ErrorAction Stop
                Write-Host "    - Exclusion added for: $DestDir" -ForegroundColor Green
                Write-Host "    - Please re-run this installer to complete registration." -ForegroundColor Cyan
            } catch {
                Write-Host "    - Could not add exclusion automatically: $_" -ForegroundColor Yellow
                Write-Host "    - Please follow the manual steps above." -ForegroundColor Yellow
            }
        }
    } else {
        Write-Error "Failed to execute registration command: $ErrorMsg"
    }
}

if ($RegistrationFailed) {
    # Skip the success message — the user needs to fix the AV issue first
    Write-Host ""
    Write-Host "Installation is INCOMPLETE. Registration could not finish." -ForegroundColor Yellow
    Write-Host "After whitelisting the folder, re-run this installer." -ForegroundColor Yellow
} elseif ($IsUpdate) {
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

