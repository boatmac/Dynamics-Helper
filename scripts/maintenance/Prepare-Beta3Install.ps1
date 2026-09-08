#requires -Version 5.1
[CmdletBinding()]
param([switch]$ConfirmOriginalCloudPcAccount, [switch]$ProcessCheckOnly)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$expected = 'e07a6ee401b625284f429cfec5273677f3fa57951c929540c7380d32cc7678ec'
$source = '\\tsclient\C\Users\zhaobo\AppData\Local\Temp\opencode\dh-beta3-candidate-safe-installer-20260908\DynamicsHelper_v2.0.76-beta.3.zip'
$phase = 'IDENTITY'
$script:observedProcesses = @()

function Get-BlockingProcesses {
    $names = @('chrome.exe', 'msedge.exe', 'dh_native_host.exe', 'dh_update_runner.exe', 'dh_update_status_host.exe')
    $filter = ($names | ForEach-Object { "Name='$_'" }) -join ' OR '
    try {
        @(Get-CimInstance Win32_Process -Filter $filter -OperationTimeoutSec 15 -ErrorAction Stop | ForEach-Object {
            [pscustomobject]@{
                name = $(if ($_.Name -in $names) { $_.Name.ToLowerInvariant() } else { 'UNEXPECTED_NAME' })
                pid = [int]$_.ProcessId
                sessionId = [int]$_.SessionId
            }
        })
    } catch { throw 'process_query_failed' }
}

function Get-PlainPath([string]$Path) {
    $full = [IO.Path]::GetFullPath($Path)
    $cursor = [IO.Path]::GetPathRoot($full)
    $item = Get-Item -LiteralPath $cursor -Force
    foreach ($part in $full.Substring($cursor.Length).Split('\', [StringSplitOptions]::RemoveEmptyEntries)) {
        if (-not $item.PSIsContainer) { throw 'invalid_parent' }
        $items = @(Get-ChildItem -LiteralPath $cursor -Force | Where-Object { $_.Name -ieq $part })
        if ($items.Count -eq 0) { return $null }
        if ($items.Count -ne 1 -or ($items[0].Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'unsafe_path' }
        $item = $items[0]
        $cursor = $item.FullName
    }
    return $item
}

try {
    if (-not $ConfirmOriginalCloudPcAccount -or $env:OS -ne 'Windows_NT') { throw 'confirmation_required' }
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    if ($principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'do_not_elevate' }
    if ([IO.Path]::GetFullPath($env:LOCALAPPDATA).TrimEnd('\') -ine [Environment]::GetFolderPath('LocalApplicationData').TrimEnd('\') -or
        [IO.Path]::GetFullPath($env:APPDATA).TrimEnd('\') -ine [Environment]::GetFolderPath('ApplicationData').TrimEnd('\')) { throw 'profile_mismatch' }
    foreach ($path in @($env:LOCALAPPDATA, $env:APPDATA, $env:TEMP)) {
        if ($path -notmatch '^[A-Za-z]:\\' -or $null -eq (Get-PlainPath $path)) { throw 'invalid_profile' }
    }
    $phase = 'BROWSER_HOST_EXIT'
    $script:observedProcesses = @(Get-BlockingProcesses)
    if ($ProcessCheckOnly) {
        [pscustomobject]@{ result = 'PROCESS_OBSERVATION_ONLY'; currentSessionId = [Diagnostics.Process]::GetCurrentProcess().SessionId; processes = $script:observedProcesses; filesChanged = $false } | ConvertTo-Json -Depth 4
        return
    }
    if ($script:observedProcesses.Count -ne 0) { throw 'process_present' }

    $phase = 'LEGACY_OR_PENDING_STATE'
    if ($null -ne (Get-PlainPath (Join-Path $env:APPDATA 'DynamicsHelper'))) { throw 'legacy_present' }
    $install = Join-Path $env:LOCALAPPDATA 'DynamicsHelper'
    if ($null -eq (Get-PlainPath $install)) { throw 'original_install_missing' }
    $tempRoot = [IO.Path]::GetFullPath($env:TEMP).TrimEnd('\')
    if ($tempRoot -ieq $install -or $tempRoot.StartsWith($install + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'temp_inside_install' }
    foreach ($relative in @('updates\active.json', 'updates\finalization-cursor.json', 'updates\.finalization-cursor.json.tmp', 'updates\.finalization-ack.json.tmp')) {
        if ($null -ne (Get-PlainPath (Join-Path $install $relative))) { throw 'pending_evidence' }
    }
    foreach ($relative in @('updates\transactions', 'updates\receipts')) {
        $item = Get-PlainPath (Join-Path $install $relative)
        if ($null -ne $item -and (-not $item.PSIsContainer -or @(Get-ChildItem -LiteralPath $item.FullName -Force).Count -ne 0)) { throw 'pending_evidence' }
    }

    $phase = 'SOURCE_PACKAGE'
    $file = Get-Item -LiteralPath $source -Force
    if ($file.PSIsContainer -or $file.Length -ne 14003512 -or (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant() -cne $expected) { throw 'source_mismatch' }
    $phase = 'LOCAL_COPY'
    $destination = Join-Path $env:TEMP 'DH-beta3-safe-install-20260908'
    if ($null -ne (Get-PlainPath $destination)) { throw 'destination_exists_do_not_repeat' }
    $protected = @()
    foreach ($name in @('config.json', 'copilot-instructions.md', 'user_prompt.md')) {
        $item = Get-PlainPath (Join-Path $install $name)
        if ($null -ne $item -and $item.PSIsContainer) { throw 'invalid_user_file' }
        $protected += [pscustomobject]@{ name = $name; present = ($null -ne $item); sha256 = $(if ($null -ne $item) { (Get-FileHash -LiteralPath $item.FullName -Algorithm SHA256).Hash } else { $null }) }
    }
    $null = New-Item -ItemType Directory -Path $destination
    # Retain only hashes/presence privately for post-install comparison, never file contents.
    [IO.File]::WriteAllText((Join-Path $destination 'protected-files-before.json'), ($protected | ConvertTo-Json), [Text.UTF8Encoding]::new($false))
    $zip = Join-Path $destination 'DynamicsHelper_v2.0.76-beta.3.zip'
    Copy-Item -LiteralPath $source -Destination $zip
    if ((Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant() -cne $expected) { throw 'copied_hash_mismatch' }
    $phase = 'EXTRACTION'
    $package = Join-Path $destination 'package'
    # Only the exact locally verified archive is extracted, into a new directory.
    Expand-Archive -LiteralPath $zip -DestinationPath $package
    foreach ($relative in @('installer_core.ps1', 'install.bat', 'update-manifest.json', 'host\dh_native_host.exe', 'extension\manifest.json')) {
        $item = Get-PlainPath (Join-Path $package $relative)
        if ($null -eq $item -or $item.PSIsContainer) { throw 'extracted_file_missing' }
    }
    $phase = 'POST_EXTRACTION_PROCESS_CHECK'
    $script:observedProcesses = @(Get-BlockingProcesses)
    if ($script:observedProcesses.Count -ne 0) { throw 'process_started_stop' }
    [pscustomobject]@{ result = 'PACKAGE_READY_NOT_INSTALLED'; version = '2.0.76-beta.3'; packageHashMatched = $true; installedProductChanged = $false } | ConvertTo-Json
} catch {
    $codes = @('confirmation_required', 'do_not_elevate', 'profile_mismatch', 'invalid_profile', 'process_query_failed', 'process_present', 'legacy_present', 'original_install_missing', 'temp_inside_install', 'pending_evidence', 'source_mismatch', 'destination_exists_do_not_repeat', 'invalid_user_file', 'copied_hash_mismatch', 'extracted_file_missing', 'process_started_stop', 'invalid_parent', 'unsafe_path')
    $code = if ($codes -ccontains $_.Exception.Message) { $_.Exception.Message } else { 'read_or_operation_failed' }
    [pscustomobject]@{ result = 'STOP'; phase = $phase; errorCode = $code; processes = $script:observedProcesses; rawError = 'REDACTED'; action = 'PRESERVE_FILES_DO_NOT_RETRY_OR_BYPASS' } | ConvertTo-Json -Depth 4
    exit 1
}
