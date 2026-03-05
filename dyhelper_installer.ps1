<#
.SYNOPSIS
    Dynamics Helper Distribution Wrapper
    Downloads the LATEST release ZIP from GitHub and launches the bundled installer.

.DESCRIPTION
    This script is a lightweight wrapper designed for distribution.
    1. Queries GitHub API for the latest release of boatmac/Dynamics-Helper.
    2. Downloads the release ZIP.
    3. Extracts it to a temporary location.
    4. Executes the version-specific `installer_core.ps1` contained within.
    5. Cleans up temporary files after installation.

.PARAMETER ZipUrl
    Optional: Provide a direct URL to override the GitHub lookup.
#>

param(
    [string]$RepoOwner = "boatmac",
    [string]$RepoName = "Dynamics-Helper",
    [string]$ZipUrl = ""
)

$ErrorActionPreference = "Stop"
$TempDir = Join-Path $env:TEMP ("DynamicsHelper_Install_" + (Get-Random))
$ZipPath = Join-Path $TempDir "DynamicsHelper_Release.zip"
$AppDir = "$env:LOCALAPPDATA\DynamicsHelper"

function Show-AVBlockHelp {
    param([string]$Stage, [string]$Detail, [string]$Dir)

    Write-Host ""
    Write-Host "!! ANTIVIRUS BLOCKED THE $Stage !!" -ForegroundColor Red
    Write-Host "==========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host $Detail -ForegroundColor Yellow
    Write-Host "This is a FALSE POSITIVE. The executable is built with PyInstaller, which" -ForegroundColor Yellow
    Write-Host "some antivirus engines mistakenly flag because of how it packages Python." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "TO FIX THIS:" -ForegroundColor Cyan
    Write-Host "  1. Open Windows Security (search 'Windows Security' in Start Menu)" -ForegroundColor White
    Write-Host "  2. Go to 'Virus & threat protection'" -ForegroundColor White
    Write-Host "  3. Under 'Virus & threat protection settings', click 'Manage settings'" -ForegroundColor White
    Write-Host "  4. Scroll down to 'Exclusions' and click 'Add or remove exclusions'" -ForegroundColor White
    Write-Host "  5. Click 'Add an exclusion' -> 'Folder' and add BOTH:" -ForegroundColor White
    Write-Host "       $Dir" -ForegroundColor Cyan
    Write-Host "       $AppDir" -ForegroundColor Cyan
    Write-Host "  6. If the file was quarantined, go to 'Protection history'" -ForegroundColor White
    Write-Host "     and click 'Actions' -> 'Allow' on the blocked item" -ForegroundColor White
    Write-Host "  7. Re-run this installer" -ForegroundColor White
    Write-Host ""

    # Attempt auto-exclusion if running elevated
    $IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator
    )
    if ($IsAdmin) {
        Write-Host "Attempting to add Windows Defender exclusions automatically..." -ForegroundColor Gray
        try {
            Add-MpPreference -ExclusionPath $Dir -ErrorAction Stop
            Add-MpPreference -ExclusionPath $AppDir -ErrorAction Stop
            Write-Host "    - Exclusions added. Please re-run this installer." -ForegroundColor Green
        } catch {
            Write-Host "    - Could not add exclusions automatically: $_" -ForegroundColor Yellow
            Write-Host "    - Please follow the manual steps above." -ForegroundColor Yellow
        }
    }

    Write-Host ""
    Read-Host "Press Enter to exit"
}

try {
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "   Dynamics Helper Downloader" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    
    # 0. Resolve URL if not provided
    if ([string]::IsNullOrWhiteSpace($ZipUrl)) {
        Write-Host "[*] Fetching latest release info from GitHub..." -ForegroundColor Yellow
        try {
            # TLS 1.2+ is required for GitHub API
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            
            $ApiUrl = "https://api.github.com/repos/$RepoOwner/$RepoName/releases/latest"
            $LatestRelease = Invoke-RestMethod -Uri $ApiUrl -ErrorAction Stop
            
            # Find the first asset that ends with .zip
            $Asset = $LatestRelease.assets | Where-Object { $_.name -like "*.zip" } | Select-Object -First 1
            
            if (-not $Asset) {
                throw "No .zip asset found in the latest GitHub release ($($LatestRelease.tag_name))."
            }
            
            $ZipUrl = $Asset.browser_download_url
            Write-Host "    Found Latest Version: $($LatestRelease.tag_name)" -ForegroundColor Green
        } catch {
            Write-Error "Failed to check GitHub for updates."
            Write-Host "Debug Info: $_" -ForegroundColor Gray
            throw "Could not retrieve latest release URL."
        }
    }

    # 1. Prepare Temp
    Write-Host "[*] Creating temporary workspace..."
    if (Test-Path $TempDir) { Remove-Item $TempDir -Recurse -Force }
    New-Item -ItemType Directory -Path $TempDir -Force | Out-Null
    
    # 2. Download
    Write-Host "[*] Downloading release..." -ForegroundColor Yellow
    Write-Host "    Source: $ZipUrl" -ForegroundColor Gray
    
    try {
        Invoke-WebRequest -Uri $ZipUrl -OutFile $ZipPath -ErrorAction Stop
    } catch {
        $dlErr = $_.Exception.Message
        if ($dlErr -match "virus|malware|potentially unwanted|threat|quarantine|blocked") {
            Show-AVBlockHelp -Stage "DOWNLOAD" -Detail "The release ZIP was blocked during download." -Dir $TempDir
            return
        }
        throw  # Re-throw non-AV errors
    }

    # Verify the download wasn't silently quarantined
    if (-not (Test-Path $ZipPath)) {
        Show-AVBlockHelp -Stage "DOWNLOAD" -Detail "The release ZIP was downloaded but immediately removed by your antivirus." -Dir $TempDir
        return
    }

    # 3. Extract
    Write-Host "[*] Extracting package..." -ForegroundColor Yellow
    try {
        Expand-Archive -Path $ZipPath -DestinationPath $TempDir -Force -ErrorAction Stop
    } catch {
        $exErr = $_.Exception.Message
        if ($exErr -match "virus|malware|potentially unwanted|threat|quarantine|blocked") {
            Show-AVBlockHelp -Stage "EXTRACTION" -Detail "The antivirus blocked files while extracting the ZIP." -Dir $TempDir
            return
        }
        throw  # Re-throw non-AV errors
    }
    
    # 4. Find Installer
    # We look for installer_core.ps1 recursively
    $Installer = Get-ChildItem -Path $TempDir -Filter "installer_core.ps1" -Recurse | Select-Object -First 1
    
    if (-not $Installer) {
        throw "Invalid Release Package: Could not find 'installer_core.ps1' inside the downloaded ZIP."
    }
    
    # 5. Execute Installer
    Write-Host "[*] Launching installer..." -ForegroundColor Green
    Write-Host "------------------------------------------"
    
    # Execute the core installer in the current scope
    & $Installer.FullName
    
} catch {
    Write-Host ""
    Write-Error "Installation Failed: $_"
    Read-Host "Press Enter to exit" # Pause so user sees the error
} finally {
    # 6. Cleanup
    if (Test-Path $TempDir) {
        Write-Host ""
        Write-Host "Cleaning up temporary files..." -ForegroundColor Gray
        Remove-Item -Path $TempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
