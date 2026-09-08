#requires -Version 5.1
[CmdletBinding()]
param([Parameter(Mandatory = $true)][ValidateSet('SaveBackup', 'CopyReplacement')][string]$Mode)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = '\\tsclient\C\Users\zhaobo\AppData\Local\Temp\opencode\dh-b2-third-20260908'
$backupPath = $root + '\failed-state-backup.json'
$handoffPath = $root + '\sas-handoff.txt'
$b1 = '2.0.76-beta.1'
$b2 = '2.0.76-beta.2'

function Assert-Keys($Value, [string[]]$Keys) {
    if ($Value -isnot [pscustomobject]) { throw 'STOP' }
    $names = @($Value.PSObject.Properties.Name)
    if ($names.Count -ne $Keys.Count) { throw 'STOP' }
    foreach ($key in $Keys) { if ($names -cnotcontains $key) { throw 'STOP' } }
}

function Get-BlobUri([string]$Text) {
    if ($Text -cnotmatch '^https://[^\s\\]+$') { throw 'STOP' }
    $uri = [uri]$Text
    if (-not $uri.IsAbsoluteUri -or $uri.Scheme -cne 'https' -or $uri.Port -ne 443 -or
        $uri.UserInfo -or $uri.Fragment -or $uri.DnsSafeHost -cnotmatch '^[a-z0-9]{3,24}\.blob\.core\.windows\.net$') { throw 'STOP' }
    return $uri
}

try {
    # Check the existing redirected-drive chain; never create directories or change ACLs.
    $dir = Get-Item -LiteralPath $root -Force
    while ($null -ne $dir) {
        if ($dir -isnot [System.IO.DirectoryInfo] -or
            ($dir.Attributes -band [System.IO.FileAttributes]::ReparsePoint)) { throw 'STOP' }
        $dir = $dir.Parent
    }
    $file = Get-Item -LiteralPath $handoffPath -Force
    if ($file -isnot [System.IO.FileInfo] -or $file.Length -gt 16384 -or
        ($file.Attributes -band [System.IO.FileAttributes]::ReparsePoint)) { throw 'STOP' }
    $url = [System.IO.File]::ReadAllText($handoffPath).Trim()
    $uri = Get-BlobUri $url
    if (-not $uri.AbsolutePath.EndsWith('/b2.zip', [StringComparison]::Ordinal)) { throw 'STOP' }
    $query = New-Object 'System.Collections.Generic.Dictionary[string,string]' ([StringComparer]::Ordinal)
    foreach ($part in $uri.Query.TrimStart('?').Split('&')) {
        $pair = $part.Split(@('='), 2)
        if ($pair.Count -ne 2) { throw 'STOP' }
        $key = [uri]::UnescapeDataString($pair[0])
        $value = [uri]::UnescapeDataString($pair[1])
        if ($query.ContainsKey($key)) { throw 'STOP' }
        $query.Add($key, $value)
    }
    foreach ($key in @('sp', 'sr', 'spr', 'se', 'sig', 'sv')) {
        if (-not $query.ContainsKey($key) -or -not $query[$key]) { throw 'STOP' }
    }
    if ($query['sp'] -cne 'r' -or $query['sr'] -cne 'b' -or $query['spr'] -cne 'https' -or
        $query['se'] -cnotmatch '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,7})?)?Z$') { throw 'STOP' }
    $expiry = [DateTimeOffset]::Parse($query['se'], [Globalization.CultureInfo]::InvariantCulture)
    if ($expiry -le [DateTimeOffset]::UtcNow.AddMinutes(10)) { throw 'STOP' }

    if ($Mode -ceq 'SaveBackup') {
        if (Test-Path -LiteralPath $backupPath) { throw 'STOP' }
        $raw = Get-Clipboard -Raw
    } else {
        $file = Get-Item -LiteralPath $backupPath -Force
        if ($file -isnot [System.IO.FileInfo] -or $file.Length -gt 1048576 -or
            ($file.Attributes -band [System.IO.FileAttributes]::ReparsePoint)) { throw 'STOP' }
        $raw = [System.IO.File]::ReadAllText($backupPath)
    }
    if ($raw -isnot [string] -or $raw.Length -gt 1048576) { throw 'STOP' }
    $backup = ConvertFrom-Json -InputObject $raw
    Assert-Keys $backup @('state', 'workerVersion', 'workerInstance', 'legacyPresent')
    Assert-Keys $backup.state @('kind', 'errorCode', 'transactionId', 'targetVersion', 'priorVersion', 'update')
    Assert-Keys $backup.state.update @('version', 'url', 'isPrerelease')
    $s = $backup.state
    foreach ($value in @($backup.workerVersion, $s.kind, $s.errorCode, $s.transactionId, $s.priorVersion, $s.targetVersion, $s.update.version)) {
        if ($value -isnot [string]) { throw 'STOP' }
    }
    if ($backup.workerVersion -cne $b1 -or $backup.workerInstance -isnot [string] -or
        $backup.workerInstance -cnotmatch '^[a-f0-9]{32}$' -or $backup.legacyPresent -isnot [bool] -or
        $backup.legacyPresent -or $s.kind -cne 'preparing' -or $s.errorCode -cne 'update_prepare_failed' -or
        $s.transactionId -cne '404ded6a59bbcc86fb681c28c9827b6c' -or $s.priorVersion -cne $b1 -or
        $s.targetVersion -cne $b2 -or $s.update.version -cne $b2 -or
        $s.update.isPrerelease -isnot [bool] -or -not $s.update.isPrerelease -or $s.update.url -isnot [string]) { throw 'STOP' }
    $oldUri = Get-BlobUri $s.update.url
    if ($oldUri.DnsSafeHost -cne $uri.DnsSafeHost -or $oldUri.AbsolutePath -ceq $uri.AbsolutePath) { throw 'STOP' }
    if ($Mode -ceq 'SaveBackup') {
        $bytes = [System.Text.UTF8Encoding]::new($false, $true).GetBytes($raw)
        $stream = [System.IO.File]::Open($backupPath, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
        try { $stream.Write($bytes, 0, $bytes.Length); $stream.Flush($true) } finally { $stream.Dispose() }
        'BACKUP_SAVED'
    } else {
        # Base64 is transport encoding, NOT encryption. No secret script is written to disk.
        $backup64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($raw))
        $url64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($url))
        $js = @'
(() => {
  const stop = () => console.log('B2_MAINTENANCE_STOP');
  try {
    const decode = s => new TextDecoder('utf-8', {fatal: true}).decode(Uint8Array.from(atob(s), c => c.charCodeAt(0)));
    const backup = JSON.parse(decode('__BACKUP64__'));
    const url = decode('__URL64__');
    const canonical = v => JSON.stringify(v === null || typeof v !== 'object' ? v : Array.isArray(v) ? v.map(x => JSON.parse(canonical(x))) : Object.fromEntries(Object.keys(v).sort().map(k => [k, JSON.parse(canonical(v[k]))])));
    const validUrl = () => {
      const u = new URL(url), old = new URL(backup.state.update.url), q = u.searchParams;
      const keys = [...q.keys()], expiry = Date.parse(q.get('se'));
      return u.protocol === 'https:' && !u.username && !u.password && !u.hash && (!u.port || u.port === '443') &&
        /^[a-z0-9]{3,24}\.blob\.core\.windows\.net$/.test(u.hostname) && u.hostname === old.hostname &&
        u.pathname !== old.pathname && u.pathname.endsWith('/b2.zip') && new Set(keys).size === keys.length &&
        q.get('sp') === 'r' && q.get('sr') === 'b' && q.get('spr') === 'https' && !!q.get('sig') && !!q.get('sv') &&
        Number.isFinite(expiry) && expiry > Date.now() + 600000;
    };
    if (globalThis.__dhB2MaintenanceAttempted || !validUrl()) { stop(); return; }
    chrome.storage.local.get(['dh_update_state', 'pending_update', 'dh_update_worker_version', 'dh_update_worker_instance'], r => {
      try {
        const manifest = chrome.runtime.getManifest();
        if (chrome.runtime.lastError || globalThis.__dhB2MaintenanceAttempted || !validUrl() ||
            (manifest.version_name || manifest.version) !== '2.0.76-beta.1' || backup.workerVersion !== '2.0.76-beta.1' ||
            r.dh_update_worker_version !== backup.workerVersion || !/^[a-f0-9]{32}$/.test(backup.workerInstance) ||
            r.dh_update_worker_instance !== backup.workerInstance || backup.legacyPresent !== false ||
            Object.prototype.hasOwnProperty.call(r, 'pending_update') || canonical(r.dh_update_state) !== canonical(backup.state)) { stop(); return; }
        globalThis.__dhB2MaintenanceAttempted = true;
        chrome.storage.local.set({dh_update_state: {kind: 'available', update: {version: '2.0.76-beta.2', url, isPrerelease: true}}}, () => {
          try {
            if (chrome.runtime.lastError) { stop(); return; }
            chrome.runtime.reload();
          } catch { stop(); }
        });
      } catch { stop(); }
    });
  } catch { stop(); }
})();
'@
        $js = $js.Replace('__BACKUP64__', $backup64).Replace('__URL64__', $url64)
        Set-Clipboard -Value $js
        'REPLACEMENT_CLIPBOARD_READY'
    }
} catch {
    # Preserve even a partial create-new backup. Never echo raw exceptions or private values.
    [Console]::Error.WriteLine('B2_MAINTENANCE_STOP')
    exit 1
}
