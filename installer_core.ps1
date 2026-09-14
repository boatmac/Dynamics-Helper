# Dynamics Helper - One-Click Installer/Updater
# Dot-sourcing defines functions only; -File keeps the normal installation entry.

function New-InstallerOperations {
    return @{
        TestPath = { param($Phase, $Path) Test-Path -LiteralPath $Path }
        RunningHost = { Get-Process -Name "dh_native_host" -ErrorAction SilentlyContinue }
        CreateDirectory = {
            param($Phase, $Path)
            New-Item -ItemType Directory -Path $Path -ErrorAction Stop | Out-Null
        }
        CopyFiles = {
            param($Phase, $Source, $Destination, [bool]$Recurse)
            if ($Recurse) {
                Copy-Item -Path "$Source\*" -Destination $Destination -Recurse -Force -ErrorAction Stop
            } else {
                Copy-Item -LiteralPath $Source -Destination $Destination -Force -ErrorAction Stop
            }
        }
        Enumerate = {
            param($Phase, $Root)
            Get-ChildItem -LiteralPath $Root -Recurse -ErrorAction Stop | ForEach-Object {
                [pscustomobject]@{
                    RelativePath = $_.FullName.Substring($Root.Length + 1)
                    IsDirectory = $_.PSIsContainer
                }
            }
        }
        RemoveTree = {
            param($Phase, $Path)
            Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction Stop
        }
        InvokeHost = {
            param($Phase, $Executable, [string[]]$Arguments)
            $Output = & $Executable @Arguments 2>&1
            [pscustomobject]@{ ExitCode = $LASTEXITCODE; Output = $Output }
        }
        Emit = {
            param($Phase, $Message, $Color = 'White')
            Write-Host $Message -ForegroundColor $Color
        }
        Prompt = { param($Message) Read-Host $Message | Out-Null }
    }
}

function Invoke-InstallerWorkflow {
    param(
        [Parameter(Mandatory = $true)][hashtable]$Ops,
        [Parameter(Mandatory = $true)][string]$PackageRoot,
        [Parameter(Mandatory = $true)][string]$DestDir,
        [Parameter(Mandatory = $true)][string]$LegacyDir,
        [Parameter(Mandatory = $true)][string]$TempDir
    )
    # Validate the entire dependency boundary before even emitting or prompting.
    $RequiredOps = @('TestPath', 'RunningHost', 'CreateDirectory', 'CopyFiles',
        'Enumerate', 'RemoveTree', 'InvokeHost', 'Emit', 'Prompt')
    if ($Ops.Count -ne $RequiredOps.Count) { throw 'Invalid installer operations.' }
    foreach ($Name in $RequiredOps) {
        if (-not $Ops.ContainsKey($Name) -or $Ops[$Name] -isnot [scriptblock]) {
            throw 'Invalid installer operations.'
        }
    }

    $ErrorActionPreference = 'Stop'
    $HostSrc = "$PackageRoot\host"
    $ExtSrc = "$PackageRoot\extension"
    $PackageManifest = "$PackageRoot\update-manifest.json"
    $IsUpdate = $false
    try {
        & $Ops.Emit 'refusal' "[*] Checking for running processes..."
        if (& $Ops.RunningHost) {
            & $Ops.Emit 'refusal' "Installation stopped: dh_native_host is running. Close Dynamics Helper and its browser normally before retrying. No files or processes were changed." 'Yellow'
            return [pscustomobject]@{ ExitCode = 1; IsUpdate = $IsUpdate }
        }
        if (& $Ops.TestPath 'refusal' $LegacyDir) {
            & $Ops.Emit 'refusal' "Installation stopped: a legacy Roaming directory exists at '$LegacyDir'. Local and Roaming data are preserved; resolve the legacy installation with your administrator before retrying. No automatic migration was performed." 'Yellow'
            return [pscustomobject]@{ ExitCode = 1; IsUpdate = $IsUpdate }
        }

        foreach ($RequiredPath in @(
            "$HostSrc\dh_native_host.exe", "$HostSrc\_internal",
            "$HostSrc\release-integrity.json", "$HostSrc\installed-product.json",
            "$ExtSrc\manifest.json", $PackageManifest
        )) {
            if (-not (& $Ops.TestPath 'preflight' $RequiredPath)) {
                throw 'The installer package is incomplete.'
            }
        }
        $PreflightRoot = "$TempDir\DynamicsHelper-preflight-$([guid]::NewGuid().ToString('N'))"
        $PreflightOwned = $false
        try {
            & $Ops.CreateDirectory 'preflight' $PreflightRoot
            $PreflightOwned = $true
            & $Ops.CopyFiles 'preflight' $HostSrc $PreflightRoot $true
            & $Ops.CreateDirectory 'preflight' "$PreflightRoot\extension"
            & $Ops.CopyFiles 'preflight' $ExtSrc "$PreflightRoot\extension" $true
            $Probe = & $Ops.InvokeHost 'preflight' "$PreflightRoot\dh_native_host.exe" @('--update-probe', $PackageManifest, $PackageRoot)
            if ($null -eq $Probe -or $Probe.ExitCode -ne 0) {
                throw 'The installer package failed integrity validation.'
            }
        } finally {
            # Only the root created by this invocation is eligible for cleanup.
            if ($PreflightOwned -and (& $Ops.TestPath 'preflight-cleanup' $PreflightRoot)) {
                & $Ops.RemoveTree 'preflight-cleanup' $PreflightRoot
            }
        }

        & $Ops.Emit 'copy' "==========================================" 'Cyan'
        & $Ops.Emit 'copy' "   Dynamics Helper Installer / Updater" 'Cyan'
        & $Ops.Emit 'copy' "==========================================" 'Cyan'
        & $Ops.Emit 'copy' ""
        & $Ops.Emit 'copy' "Target Installation Directory: $DestDir" 'Gray'
        if (-not (& $Ops.TestPath 'copy' $DestDir)) {
            & $Ops.Emit 'copy' "[*] Creating installation directory: $DestDir"
            & $Ops.CreateDirectory 'copy' $DestDir
        }
        & $Ops.Emit 'host-copy' "[*] Installing Host files..."
        # Replace the exact runtime tree, never overlay stale runtime files.
        if (& $Ops.TestPath 'host-copy' "$DestDir\_internal") {
            & $Ops.RemoveTree 'host-copy' "$DestDir\_internal"
        }
        foreach ($Entry in (& $Ops.Enumerate 'host-copy' $HostSrc)) {
            $RelPath = $Entry.RelativePath
            $DestPath = "$DestDir\$RelPath"
            if ($Entry.IsDirectory) {
                if (-not (& $Ops.TestPath 'host-copy' $DestPath)) {
                    & $Ops.CreateDirectory 'host-copy' $DestPath
                }
            } else {
                if ($RelPath -in @('config.json', 'copilot-instructions.md', 'user_prompt.md') -and
                    (& $Ops.TestPath 'host-copy' $DestPath)) {
                    continue
                }
                & $Ops.CopyFiles 'host-copy' "$HostSrc\$RelPath" $DestPath $false
            }
        }
        & $Ops.Emit 'host-copy' "    - Host files copied (exe + runtime libraries)."
        if (& $Ops.TestPath 'host-copy' "$HostSrc\system_prompt.md") {
            & $Ops.CopyFiles 'host-copy' "$HostSrc\system_prompt.md" "$DestDir\system_prompt.md" $false
            & $Ops.Emit 'host-copy' "    - system_prompt.md updated."
        }

        & $Ops.Emit 'extension-copy' "[*] Installing Extension files..."
        $ExtDest = "$DestDir\extension"
        if (& $Ops.TestPath 'extension-copy' $ExtDest) {
            & $Ops.RemoveTree 'extension-copy' $ExtDest
        }
        & $Ops.CreateDirectory 'extension-copy' $ExtDest
        & $Ops.CopyFiles 'extension-copy' $ExtSrc $ExtDest $true
        $FileCount = @(& $Ops.Enumerate 'extension-copy' $ExtDest).Count
        if ($FileCount -eq 0) { throw 'Extension copy failed.' }
        & $Ops.Emit 'extension-copy' "    - Extension files copied to: $ExtDest ($FileCount files)"

        $ExePath = "$DestDir\dh_native_host.exe"
        $Probe = & $Ops.InvokeHost 'live' $ExePath @('--update-probe', $PackageManifest)
        if ($null -eq $Probe -or $Probe.ExitCode -ne 0) {
            throw 'The installed product failed integrity validation.'
        }
        $Settlement = & $Ops.InvokeHost 'settle' $ExePath @('--settle-installer-repair')
        if ($null -eq $Settlement -or $Settlement.ExitCode -ne 0) {
            throw 'The preserved update transaction could not be settled.'
        }
        $IsUpdate = & $Ops.TestPath 'register' "$DestDir\manifest.json"
        & $Ops.Emit 'register' "Configuring Native Host Manifest..." 'Gray'
        if (-not (& $Ops.TestPath 'register' $ExePath)) {
            throw 'The installed Host executable is missing.'
        }
        # The Host owns strict UTF-8 manifest generation and browser registration.
        & $Ops.Emit 'register' "    Running registration command..."
        $Registration = & $Ops.InvokeHost 'register' $ExePath @('--register')
        if ($null -eq $Registration -or $Registration.ExitCode -ne 0) {
            throw 'Registration failed.'
        }
        # Native output is deliberately never forwarded, even on success.
        & $Ops.Emit 'register' "    - Registration successful."
        if ($IsUpdate) {
            & $Ops.Emit 'success' ""
            & $Ops.Emit 'success' "SUCCESS: Update Complete!" 'Green'
            & $Ops.Emit 'success' "-------------------------"
            & $Ops.Emit 'success' "The Native Host manifest has been updated with the latest Allowed Origins." 'Yellow'
            & $Ops.Emit 'success' "Please restart your browser (Edge/Chrome) for changes to take effect." 'Cyan'
            & $Ops.Emit 'success' ""
            & $Ops.Emit 'success' "IMPORTANT: Ensure your browser is loading the extension from:" 'Yellow'
            & $Ops.Emit 'success' "   $ExtDest" 'Cyan'
            & $Ops.Emit 'success' ""
        } else {
            & $Ops.Emit 'success' ""
            & $Ops.Emit 'success' "SUCCESS: Installation Complete!" 'Green'
            & $Ops.Emit 'success' "-------------------------"
            & $Ops.Emit 'success' "1. Go to chrome://extensions (or edge://extensions)"
            & $Ops.Emit 'success' "2. Enable 'Developer mode'"
            & $Ops.Emit 'success' "3. Click 'Load unpacked'"
            & $Ops.Emit 'success' "4. Select this folder:"
            & $Ops.Emit 'success' "   $ExtDest" 'Cyan'
            & $Ops.Emit 'success' ""
        }
        & $Ops.Emit 'success' ""
        return [pscustomobject]@{ ExitCode = 0; IsUpdate = $IsUpdate }
    } catch {
        & $Ops.Emit 'error' "Installation failed. A required file or operation is unavailable or blocked. Keep security protections unchanged; preserve any security detection details and contact your administrator or the project maintainer." 'Red'
        return [pscustomobject]@{ ExitCode = 1; IsUpdate = $IsUpdate }
    } finally {
        & $Ops.Prompt "Press Enter to exit"
    }
}

if ($MyInvocation.InvocationName -eq '.') { return }

$ErrorActionPreference = 'Stop'
try {
    $DefaultOps = New-InstallerOperations
    $Result = Invoke-InstallerWorkflow -Ops $DefaultOps -PackageRoot $PSScriptRoot -DestDir "$env:LOCALAPPDATA\DynamicsHelper" -LegacyDir "$env:APPDATA\DynamicsHelper" -TempDir ([System.IO.Path]::GetTempPath().TrimEnd('\'))
    exit $Result.ExitCode
} catch {
    Write-Host "Installation failed. A required file or operation is unavailable or blocked. Keep security protections unchanged; preserve any security detection details and contact your administrator or the project maintainer." -ForegroundColor Red
    Read-Host "Press Enter to exit" | Out-Null
    exit 1
}
