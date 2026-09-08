#requires -Version 5.1
[CmdletBinding()]
param([switch]$ConfirmOriginalCloudPcAccount)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$phase = 'IDENTITY'
$report = [ordered]@{ result = 'NOT_CHECKED'; scope = 'POST_INSTALL_METADATA_AND_USER_FILE_OBSERVATION'; protectedFiles = @() }

function Read-PlainFile([string]$Path) {
    $full = [IO.Path]::GetFullPath($Path)
    $cursor = [IO.Path]::GetPathRoot($full)
    $item = Get-Item -LiteralPath $cursor -Force
    foreach ($part in $full.Substring($cursor.Length).Split('\', [StringSplitOptions]::RemoveEmptyEntries)) {
        if (-not $item.PSIsContainer) { throw 'invalid_parent' }
        $children = @(Get-ChildItem -LiteralPath $cursor -Force | Where-Object { $_.Name -ieq $part })
        if ($children.Count -eq 0) { return $null }
        if ($children.Count -ne 1 -or ($children[0].Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'unsafe_path' }
        $item = $children[0]
        $cursor = $item.FullName
    }
    if ($item.PSIsContainer) { throw 'not_file' }
    return $item
}

try {
    if (-not $ConfirmOriginalCloudPcAccount -or $env:OS -ne 'Windows_NT') { throw 'confirmation_required' }
    if ($env:LOCALAPPDATA -notmatch '^[A-Za-z]:\\' -or $env:TEMP -notmatch '^[A-Za-z]:\\') { throw 'invalid_profile' }
    $root = Join-Path $env:LOCALAPPDATA 'DynamicsHelper'
    $phase = 'PROTECTED_FILES'
    $baseline = Read-PlainFile (Join-Path $env:TEMP 'DH-beta3-safe-install-20260908\protected-files-before.json')
    if ($null -eq $baseline -or $baseline.Length -gt 8192) { throw 'baseline_missing_or_invalid' }
    $records = @([IO.File]::ReadAllText($baseline.FullName) | ConvertFrom-Json)
    $names = @('config.json', 'copilot-instructions.md', 'user_prompt.md')
    if ($records.Count -ne $names.Count) { throw 'baseline_invalid' }
    foreach ($name in $names) {
        $match = @($records | Where-Object { $_.name -ceq $name })
        if ($match.Count -ne 1 -or $match[0].present -isnot [bool]) { throw 'baseline_invalid' }
        $before = $match[0]
        $file = Read-PlainFile (Join-Path $root $name)
        if ($before.present) {
            if ($before.sha256 -isnot [string] -or $before.sha256 -notmatch '^[0-9a-fA-F]{64}$') { throw 'baseline_invalid' }
            $status = if ($null -eq $file) { 'MISSING_AFTER_INSTALL' } elseif ((Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash -ieq $before.sha256) { 'UNCHANGED' } else { 'CHANGED' }
        } else {
            $status = if ($null -eq $file) { 'REMAINS_ABSENT' } elseif ($name -eq 'config.json') { 'NEW_CONFIG_SEED_REVIEW' } else { 'UNEXPECTED_NEW_FILE' }
        }
        $report.protectedFiles += [ordered]@{ role = $name; status = $status }
    }

    $phase = 'METADATA_AND_EXE'
    $exe = Read-PlainFile (Join-Path $root 'dh_native_host.exe')
    $report['hostExePresent'] = $null -ne $exe
    foreach ($entry in @(@('installed-product.json', 'package_version', 'hostMetadataIsBeta3'), @('extension\manifest.json', 'version_name', 'extensionIsBeta3'))) {
        $file = Read-PlainFile (Join-Path $root $entry[0])
        if ($null -eq $file -or $file.Length -gt 262144) { throw 'metadata_missing_or_invalid' }
        $data = [IO.File]::ReadAllText($file.FullName) | ConvertFrom-Json
        $report[$entry[2]] = $data.($entry[1]) -ceq '2.0.76-beta.3'
    }
    $report['generatedManifestPresent'] = $null -ne (Read-PlainFile (Join-Path $root 'manifest.json'))
    $phase = 'PROCESS_OBSERVATION'
    $processes = @(Get-CimInstance Win32_Process -OperationTimeoutSec 15 -Filter "Name='dh_native_host.exe' OR Name='dh_update_runner.exe' OR Name='dh_update_status_host.exe'")
    $report['hostOrRecoveryProcessCount'] = $processes.Count
    $report['pids'] = @($processes | ForEach-Object { [int]$_.ProcessId })
    $report.result = 'OBSERVED_NOT_FULL_INTEGRITY_OR_DEFENDER_VERIFICATION'
} catch {
    $report.result = 'STOP'
    $report['stopPhase'] = $phase
    $report['error'] = 'READ_OR_VALIDATION_FAILED_DETAILS_REDACTED'
}
$report | ConvertTo-Json -Depth 5
