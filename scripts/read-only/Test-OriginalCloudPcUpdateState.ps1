#requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$ConfirmOriginalCloudPcAccount,
    [switch]$SkipDefender,
    [switch]$EvidenceOnly,
    [ValidatePattern('^[a-f0-9]{32}$')]
    [string]$TransactionId = 'ed2ff2cbbb31e571d69fc361d83777e2'
)

# Observation only. Do not run the Host, repair evidence, or infer retry permission.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
if (-not $ConfirmOriginalCloudPcAccount) { throw 'Confirm the original Cloud PC and original installing account first.' }
if ($env:OS -ne 'Windows_NT') { throw 'Windows is required.' }

function Get-PlainItem([string]$Path) {
    $full = [IO.Path]::GetFullPath($Path)
    $cursor = [IO.Path]::GetPathRoot($full)
    $item = Get-Item -LiteralPath $cursor -Force
    foreach ($part in $full.Substring($cursor.Length).Split('\', [StringSplitOptions]::RemoveEmptyEntries)) {
        if (-not $item.PSIsContainer) { throw 'unexpected_parent' }
        # Enumeration distinguishes readable absence from inaccessible parents.
        $matches = @(Get-ChildItem -LiteralPath $cursor -Force | Where-Object { $_.Name -ieq $part })
        if ($matches.Count -eq 0) { return $null }
        if ($matches.Count -ne 1) { throw 'ambiguous_path' }
        $item = $matches[0]
        if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'reparse_path' }
        $cursor = $item.FullName
    }
    return $item
}

function Read-SmallJson([string]$Path) {
    $item = Get-PlainItem $Path
    if ($null -eq $item -or $item.PSIsContainer -or $item.Length -gt 262144) { throw 'unreadable_metadata' }
    $text = [IO.File]::ReadAllText($item.FullName, (New-Object Text.UTF8Encoding($false, $true)))
    return ($text | ConvertFrom-Json)
}

function Get-SafeVersion($Value) {
    if ($Value -is [string] -and $Value -cmatch '^\d{1,5}\.\d{1,5}\.\d{1,5}(-beta\.\d{1,5})?$') { return $Value }
    return 'UNKNOWN'
}

function Get-ProcessObservation {
    try {
        $processes = @(Get-CimInstance -ClassName Win32_Process -OperationTimeoutSec 15 -Filter "Name='dh_native_host.exe' OR Name='dh_update_runner.exe' OR Name='dh_update_status_host.exe'")
        $mainCount = @($processes | Where-Object { $_.Name -ieq 'dh_native_host.exe' }).Count
        return [ordered]@{
            status = 'OBSERVED'; count = $processes.Count
            mainCount = $mainCount; recoveryCount = $processes.Count - $mainCount
            pids = @($processes | ForEach-Object { [int]$_.ProcessId })
        }
    } catch { return [ordered]@{ status = 'UNKNOWN'; count = $null; mainCount = $null; recoveryCount = $null; pids = @() } }
}

$report = [ordered]@{
    schema = 1
    observedAtUtc = [DateTime]::UtcNow.ToString('o')
    decision = 'NO_RETRY_AUTHORIZATION'
    defender = [ordered]@{ status = 'UNKNOWN'; currentAllowState = 'UNKNOWN'; policyEquivalence = 'NOT_ESTABLISHED' }
    processes = $null
    registry = @()
    evidence = [ordered]@{ status = 'NOT_CHECKED' }
    inventory = [ordered]@{ status = 'NOT_CHECKED'; scope = 'DECLARED_FILES_ONLY_NOT_HOST_VERIFICATION' }
    browser = 'NOT_READ_DO_NOT_WAKE_WORKER'
}

if (-not $SkipDefender) {
try {
    $s = Get-MpComputerStatus
    $report.defender.status = 'OBSERVED'
    foreach ($name in @('AMServiceEnabled', 'AntivirusEnabled', 'RealTimeProtectionEnabled', 'BehaviorMonitorEnabled', 'IsTamperProtected')) {
        $p = $s.PSObject.Properties[$name]
        $report.defender[$name] = if ($null -ne $p -and $p.Value -is [bool]) { $p.Value } else { 'UNKNOWN' }
    }
    foreach ($name in @('AMEngineVersion', 'AMProductVersion', 'AntivirusSignatureVersion')) {
        $p = $s.PSObject.Properties[$name]
        $report.defender[$name] = if ($null -ne $p -and $p.Value -is [string] -and $p.Value -cmatch '^\d{1,5}(\.\d{1,5}){1,3}$') { $p.Value } else { 'UNKNOWN' }
    }
    $mode = $s.PSObject.Properties['AMRunningMode']
    $report.defender['normalRunningMode'] = if ($null -ne $mode) { $mode.Value -ceq 'Normal' } else { 'UNKNOWN' }
} catch { $report.defender.status = 'UNKNOWN' }

try {
    $p = Get-MpPreference
    foreach ($name in @('DisableRealtimeMonitoring', 'DisableBehaviorMonitoring', 'DisableBlockAtFirstSeen')) {
        $field = $p.PSObject.Properties[$name]
        $report.defender[$name] = if ($null -ne $field -and $field.Value -is [bool]) { $field.Value } else { 'UNKNOWN' }
    }
    $maps = $p.PSObject.Properties['MAPSReporting']
    $report.defender['cloudReportingConfigured'] = if ($null -ne $maps -and $null -ne $maps.Value) { [int]$maps.Value -gt 0 } else { 'UNKNOWN' }
    foreach ($name in @('ExclusionPath', 'ExclusionProcess', 'ExclusionExtension', 'ThreatIDDefaultAction_Ids')) {
        $field = $p.PSObject.Properties[$name]
        $report.defender["${name}VisibleCount"] = if ($null -ne $field) { @($field.Value | Where-Object { $null -ne $_ }).Count } else { 'UNKNOWN' }
    }
    # Company policy can hide exclusions. Zero visible entries never proves none.
    $report.defender['preferenceVisibility'] = 'PARTIAL_ALLOW_STATE_UNKNOWN'
} catch { $report.defender['preferenceVisibility'] = 'UNKNOWN' }
} else { $report.defender.status = 'NOT_QUERIED_THIS_RUN' }

$report.processes = Get-ProcessObservation
$root = $null
$registryClear = $true
try {
    if ([string]::IsNullOrWhiteSpace($env:LOCALAPPDATA) -or $env:LOCALAPPDATA -notmatch '^[A-Za-z]:\\') { throw 'invalid_root' }
    $root = Join-Path $env:LOCALAPPDATA 'DynamicsHelper'
    $rootItem = Get-PlainItem $root
    if ($null -eq $rootItem -or -not $rootItem.PSIsContainer) { throw 'root_unavailable' }
    $views = @([Microsoft.Win32.RegistryView]::Registry32)
    if ([Environment]::Is64BitOperatingSystem) { $views += [Microsoft.Win32.RegistryView]::Registry64 }
    foreach ($view in $views) {
        $base = $null
        try {
            $base = [Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::CurrentUser, $view)
            $entries = @(
                @{ label = 'RunOnce'; key = 'Software\Microsoft\Windows\CurrentVersion\RunOnce'; value = 'DynamicsHelperUpdateRecovery'; expected = $null },
                @{ label = 'ChromeMain'; key = 'Software\Google\Chrome\NativeMessagingHosts\com.dynamics.helper.native'; value = ''; expected = (Join-Path $root 'manifest.json') },
                @{ label = 'ChromeStatus'; key = 'Software\Google\Chrome\NativeMessagingHosts\com.dynamics.helper.update_status'; value = ''; expected = $null },
                @{ label = 'EdgeMain'; key = 'Software\Microsoft\Edge\NativeMessagingHosts\com.dynamics.helper.native'; value = ''; expected = (Join-Path $root 'manifest.json') },
                @{ label = 'EdgeStatus'; key = 'Software\Microsoft\Edge\NativeMessagingHosts\com.dynamics.helper.update_status'; value = ''; expected = $null }
            )
            foreach ($entry in $entries) {
                $key = $null
                $state = 'UNKNOWN'
                try {
                    $key = $base.OpenSubKey($entry.key, $false)
                    if ($null -eq $key) { $state = 'NONE' }
                    elseif ($key.GetValueNames() -notcontains $entry.value) {
                        $state = if ($entry.label -eq 'RunOnce') { 'NONE' } else { 'KEY_WITHOUT_VALUE' }
                    }
                    else {
                        $state = 'PRESENT'
                        if ($null -ne $entry.expected) {
                            $value = $key.GetValue($entry.value, $null, [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
                            $state = if ($key.GetValueKind($entry.value) -eq [Microsoft.Win32.RegistryValueKind]::String -and $value -is [string] -and $value -ieq $entry.expected) { 'EXPECTED_TARGET' } else { 'UNEXPECTED_TARGET_OR_TYPE' }
                        }
                    }
                } catch { $state = 'UNKNOWN' }
                finally { if ($null -ne $key) { $key.Dispose() } }
                $report.registry += [ordered]@{ view = $view.ToString(); role = $entry.label; status = $state }
                if ($entry.label -in @('RunOnce', 'ChromeStatus', 'EdgeStatus') -and $state -ne 'NONE') { $registryClear = $false }
            }
        } finally { if ($null -ne $base) { $base.Dispose() } }
    }
} catch { $registryClear = $false; $report.registry += @{ status = 'UNKNOWN' } }

$phase = 'PROCESS_REGISTRY_GATE'
$role = 'NONE'
$report.inventory['checkedFiles'] = 0
try {
    if ($null -eq $root -or $report.processes.status -ne 'OBSERVED' -or $report.processes.recoveryCount -ne 0 -or -not $registryClear) { throw 'not_quiescent' }
    $phase = 'TRANSACTION_PRESENCE'
    $tx = $TransactionId
    $report.evidence['transactionId'] = $tx
    $paths = [ordered]@{
        active = 'updates\active.json'; cursor = 'updates\finalization-cursor.json'
        workspace = "updates\transactions\$tx"; preparing = "updates\transactions\$tx.preparing"
        receipt = "updates\receipts\$tx.json"; cursorTemp = 'updates\.finalization-cursor.json.tmp'
        receiptTemp = "updates\receipts\.$tx.json.tmp"; ackTemp = 'updates\.finalization-ack.json.tmp'
    }
    $clear = $true
    foreach ($name in $paths.Keys) {
        $item = Get-PlainItem (Join-Path $root $paths[$name])
        $report.evidence[$name] = if ($null -eq $item) { 'NONE' } else { 'PRESENT_STOP' }
        if ($null -ne $item) { $clear = $false }
    }
    foreach ($name in @('transactions', 'receipts')) {
        $item = Get-PlainItem (Join-Path $root "updates\$name")
        if ($null -ne $item -and -not $item.PSIsContainer) { throw 'invalid_directory' }
        $count = if ($null -eq $item) { 0 } else { @(Get-ChildItem -LiteralPath $item.FullName -Force).Count }
        $report.evidence["${name}Count"] = $count
        if ($count -ne 0) { $clear = $false }
    }
    $report.evidence.status = if ($clear) { 'NO_PENDING_AT_OBSERVATION' } else { 'PRESENT_STOP' }
    if (-not $clear) { throw 'pending_evidence' }
    $phase = 'ACK_BYTES'
    $ack = Get-PlainItem (Join-Path $root 'updates\finalization-ack.json')
    $expectedAck = '{"outcome":"rolled-back","state":"finalized-awaiting-ack","terminal_version":{"fresh_install":false,"version":"2.0.76-beta.1"},"transactionId":"ed2ff2cbbb31e571d69fc361d83777e2"}' + "`n"
    $report.evidence['ack'] = if ($null -eq $ack) { 'NONE' } else { 'UNKNOWN_OR_UNEXPECTED_STOP' }
    if ($null -ne $ack) {
        if ($ack.PSIsContainer -or $ack.Length -gt 4096) { throw 'invalid_ack' }
        $report.evidence.ack = if ([Convert]::ToBase64String([IO.File]::ReadAllBytes($ack.FullName)) -ceq [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($expectedAck))) { 'MATCHING_REPORTED_B1_ROLLBACK' } else { 'UNEXPECTED_BYTES_OR_ID' }
    }

    if ($EvidenceOnly) {
        $report.inventory.status = 'NOT_QUERIED_EVIDENCE_ONLY'
    } else {
    $phase = 'METADATA_READ'
    $role = 'INSTALLED_PRODUCT_METADATA'
    $metadata = Read-SmallJson (Join-Path $root 'installed-product.json')
    $inventoryPath = Join-Path $root 'release-integrity.json'
    $role = 'RELEASE_INTEGRITY_METADATA'
    $inventory = Read-SmallJson $inventoryPath
    $role = 'EXTENSION_MANIFEST'
    $manifest = Read-SmallJson (Join-Path $root 'extension\manifest.json')
    $phase = 'VERSION_SCHEMA'
    $version = Get-SafeVersion $metadata.package_version
    $report.inventory['packageVersion'] = $version
    $report.inventory['extensionVersion'] = Get-SafeVersion $manifest.version_name
    if ($version -ne '2.0.76-beta.1' -or $inventory.package_version -cne $version -or $manifest.version_name -cne $version -or $manifest.version -cne '2.0.76') { throw 'unexpected_version' }
    if ($metadata.schema_version -ne 1 -or $inventory.schema_version -ne 1) { throw 'unexpected_schema' }
    $phase = 'INVENTORY_LINK'
    $role = 'RELEASE_INTEGRITY_METADATA'
    if ($metadata.release_integrity_sha256 -isnot [string] -or $metadata.release_integrity_sha256 -cnotmatch '^[a-f0-9]{64}$') { throw 'invalid_hash' }
    if ((Get-FileHash -LiteralPath $inventoryPath -Algorithm SHA256).Hash.ToLowerInvariant() -cne $metadata.release_integrity_sha256) { throw 'inventory_link_mismatch' }
    $checked = 0
    $totalBytes = 0L
    foreach ($group in @('host_files', 'extension_files')) {
        $phase = 'INVENTORY_RECORDS'
        $role = if ($group -eq 'host_files') { 'HOST_PRODUCT_FILE' } else { 'EXTENSION_PRODUCT_FILE' }
        $basePath = if ($group -eq 'host_files') { $root } else { Join-Path $root 'extension' }
        $records = @($inventory.$group)
        if ($records.Count -eq 0 -or $records.Count -gt 256) { throw 'inventory_limit' }
        $seen = @{}
        foreach ($record in $records) {
            $phase = 'RECORD_VALIDATION'
            $relative = $record.path
            if ($relative -isnot [string] -or $relative.Length -gt 240 -or $relative -cnotmatch '^[A-Za-z0-9_./ -]+$') { throw 'invalid_path' }
            foreach ($part in $relative.Split('/')) {
                if ($part -in @('', '.', '..') -or $part.EndsWith('.') -or $part.EndsWith(' ') -or $part -match '^(CON|PRN|AUX|NUL|COM[0-9]|LPT[0-9])(\.|$)') { throw 'invalid_path' }
            }
            if ($seen.ContainsKey($relative)) { throw 'duplicate_path' }
            $seen[$relative] = $true
            if ($group -eq 'host_files' -and $relative -cnotmatch '^(_internal/.+|dh_native_host\.exe|register\.py|system_prompt\.md)$') { throw 'unsupported_host_entry' }
            $role = if ($group -eq 'extension_files') { 'EXTENSION_PRODUCT_FILE' } elseif ($relative.StartsWith('_internal/')) { 'HOST_RUNTIME_FILE' } else { 'HOST_TOP_LEVEL_PRODUCT_FILE' }
            if ($record.sha256 -isnot [string] -or $record.sha256 -cnotmatch '^[a-f0-9]{64}$') { throw 'invalid_hash' }
            $phase = 'PRODUCT_FILE_READ'
            $file = Get-PlainItem (Join-Path $basePath $relative)
            if ($null -eq $file -or $file.PSIsContainer -or $file.Length -gt 536870912) { throw 'invalid_product_file' }
            $totalBytes += $file.Length
            if ($totalBytes -gt 1073741824) { throw 'byte_limit' }
            $phase = 'PRODUCT_FILE_HASH'
            if ((Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant() -cne $record.sha256) { throw 'file_hash_mismatch' }
            $checked++
            $report.inventory.checkedFiles = $checked
        }
    }
    $report.inventory['checkedFiles'] = $checked
    $report.inventory.status = 'DECLARED_HASHES_MATCH_UNTRUSTED_INVENTORY'
    }
} catch {
    # Only fixed local codes may leave the script; OS/JSON errors can contain paths.
    $codes = @('not_quiescent', 'pending_evidence', 'invalid_directory', 'invalid_ack', 'unreadable_metadata', 'unexpected_version', 'unexpected_schema', 'invalid_hash', 'inventory_link_mismatch', 'inventory_limit', 'invalid_path', 'duplicate_path', 'unsupported_host_entry', 'invalid_product_file', 'byte_limit', 'file_hash_mismatch', 'unexpected_parent', 'ambiguous_path', 'reparse_path')
    $report.inventory['stopPhase'] = $phase
    $report.inventory['fileRole'] = $role
    $report.inventory['errorCode'] = if ($codes -ccontains $_.Exception.Message) { $_.Exception.Message } else { 'read_or_parse_failed' }
    if ($report.evidence.status -eq 'NOT_CHECKED') { $report.evidence.status = 'UNKNOWN_OR_NOT_QUIESCENT_STOP' }
    $report.inventory.status = 'UNKNOWN_OR_UNEXPECTED_STOP'
}
$report['processesAfter'] = Get-ProcessObservation
if ($report.processes.status -ne 'OBSERVED' -or $report.processesAfter.status -ne 'OBSERVED' -or $report.processes.recoveryCount -ne 0 -or $report.processesAfter.recoveryCount -ne 0) { $report['snapshot'] = 'RECOVERY_PRESENT_OR_PROCESS_UNKNOWN_STOP' }
elseif ($report.processes.mainCount -gt 0 -or $report.processesAfter.mainCount -gt 0) { $report['snapshot'] = 'MAIN_HOST_PRESENT_NON_ATOMIC_OBSERVATION_ONLY' }
else { $report['snapshot'] = 'NON_ATOMIC_OBSERVATION_ONLY' }
$report | ConvertTo-Json -Depth 6
