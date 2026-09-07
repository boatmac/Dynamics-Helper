# Plan D Pragmatic Cloud PC Runbook

## Safety Contract

- NOT EXECUTION READY: all operational steps and fences below are retained for
  future review, not execution. Remaining execution barriers stay BLOCKED; documentation
  approval does not unlock any mutation or override a blocking `throw`.
- Run installer/process/registry steps only on the effectively empty cloud PC.
- Do not install A, B1, or B2 on the old beta1 workstation.
- Do not migrate the current workload to the cloud PC until all three scenarios
  pass.
- Formal roles are: historical A `2.0.74-beta.4` is retained evidence only and
  is not rerun; B1 `2.0.76-beta.1` is the installed cloud-PC baseline and
  rollback prior; B2 `2.0.76-beta.2` is the candidate, committed target, and
  matching-installer release.
- Keep **Receive beta updates** disabled on B1 so public release discovery
  cannot replace the manually controlled B2 candidate.
- Never paste the private B2 URL into this file, Git, screenshots, or results.
- Use only the designated non-customer Dynamics test case for Analyze smoke;
  record PASS/FAIL only, never its case ID, content, report, or screenshots.
- Never delete `%LOCALAPPDATA%\DynamicsHelper\updates` during recovery.
- Never publish, tag, push, or rebuild B2 while qualification is active. B1 is
  disqualified and must never be published.
- Do not perform any cloud-PC operation until B1/B2 identities are complete and
  all five **Current B2 Automated Gates** in the result ledger are `PASS`.
- Stop immediately if the observed starting version, ZIP SHA-256, Native Host
  registration target, or transaction ID differs from the result ledger.

## Scope And Evidence Rules

The cloud PC is effectively empty and has no snapshot or practical restore
point. A complete B1 installer run establishes `plan-d-b1` before every
scenario; no scenario relies on snapshot rollback. Historical A is not rerun.
Use the installed frozen Host only, never source mode.

Do not connect to or change the cloud PC until the **Qualification Entry Gate**
below passes. After it passes, install Chrome or Edge and the supported Copilot
CLI. Use Windows local-disk redirection only to copy B2 onto the cloud PC. Keep
the reviewed B1 installer locally available for rollback-prior repair, then work
only from `C:\DH-CloudPC`.
Never run an archive, script, or installer from a redirected drive.

The result ledger may contain only the fields it requests and short sanitized
notes. Do not record a URL, query string, customer data, case identity, prompt
content, access token, screenshot, or full log. For Analyze, record only
`PASS` or `FAIL`.

Authority for this documentation alignment is the approved
[qualification design](superpowers/specs/2026-09-07-pragmatic-visible-completion-qualification-design.md)
and its reviewed [documentation plan](superpowers/plans/2026-09-07-pragmatic-visible-completion-qualification.md).
Product semantics and the full terminal residue allowlist remain governed by
[Visible Update Completion](superpowers/specs/2026-09-05-visible-update-completion-design.md#cross-version-rollback-qualification).

NOT EXECUTION READY. This document aligns qualification rules only. B2 identity
and five current artifact gates remain PENDING. Every future artifact,
distribution, process, browser-cleanup, and installer mutation boundary requires
its own explicit approval and reviewed concrete guards. Historical `Task 5`
labels in retained text/throws confer no authority; the abandoned draft is not
authority either. Do not execute incomplete operational steps or their fences.

The two narrow guards are prepared, isolated checks passed, and independent
review passed; see the ledger's [Guard Preparation Evidence](plan-d-pragmatic-cloud-pc-results.md#guard-preparation-evidence).
This does not clear the six retained blocking throws: Qualification Entry Gate,
B2 Artifact-Hash Placeholder, Complete B2 Installer Placeholder, One-Shot
Original-Runner Interruption, Zero-Executor Checkpoint, and Recovery-Runner
Witness. Exact B1/B2 version/source/ZIP identity and installed frozen Host
requirements remain unchanged; neither guard review nor source tests qualify B2.

B2 must be the sole object in a private test-only HTTPS container. Use one
short-lived, read-only URL whose path ends in `.zip`. Treat the cloud PC as
credential-bearing while that URL is active.

## Qualification Entry Gate

Before connecting to or changing the cloud PC, run this read-only check from the
product worktree. It requires complete B1/B2 source-commit and ZIP identities and
all five **Current B2 Automated Gates** to be exact `PASS`. Artifact result and gate
evidence must be non-empty; `PENDING`, `Not recorded`, and `Not run` fail closed
wherever they occur in those fields.

The fenced command immediately below is historical A/B form and is deliberately
fail-closed against the revised ledger. Do not execute it. A separately approved
readiness change must replace the whole command with the exact reviewed B1/B2
entry gate after B2 identity exists; this documentation change leaves it blocked.

```powershell
throw 'HISTORICAL A/B ENTRY GATE: Task 5 must replace this block with the reviewed B1/B2 gate before execution'
```

Future artifact verification must replace the B2 source/hash placeholders and refresh all five gate
rows with exact B2 evidence before this entry gate can pass. Also inspect those
two ledger sections manually. Do not proceed if either
artifact identity is incomplete, an Artifact Result is empty or placeholder, an
Automated Gate is not exactly `PASS`, or its Evidence is empty or contains
`PENDING`, `Not recorded`, or `Not run`.

## Empty-Cloud-PC Marker

Only after confirming that this is the effectively empty cloud PC with no
customer workload, establish its fixed local marker. Never copy this marker to
another computer. An existing marker with different bytes fails closed.

```powershell
$root='C:\DH-CloudPC';if(-not(Test-Path -LiteralPath $root -PathType Container)){New-Item -ItemType Directory -Path $root -ErrorAction Stop|Out-Null};$marker=Join-Path $root 'PLAN_D_EMPTY_CLOUD_PC.marker';$expectedMarkerBytes=[Text.UTF8Encoding]::new($false).GetBytes('PLAN_D_EFFECTIVELY_EMPTY_CLOUD_PC_V1');if(Test-Path -LiteralPath $marker){if(-not(Test-Path -LiteralPath $marker -PathType Leaf)){throw 'Empty-cloud-PC marker is invalid'};$actualMarkerBytes=[IO.File]::ReadAllBytes($marker);if($actualMarkerBytes.Length -ne $expectedMarkerBytes.Length -or -not [System.Linq.Enumerable]::SequenceEqual[byte]($actualMarkerBytes,$expectedMarkerBytes)){throw 'Empty-cloud-PC marker is invalid'}}else{[IO.File]::WriteAllBytes($marker,$expectedMarkerBytes)};$actualMarkerBytes=[IO.File]::ReadAllBytes($marker);if($actualMarkerBytes.Length -ne $expectedMarkerBytes.Length -or -not [System.Linq.Enumerable]::SequenceEqual[byte]($actualMarkerBytes,$expectedMarkerBytes)){throw 'Empty-cloud-PC marker verification failed'}
```

Every command that can invoke installer process termination or explicitly kill
a browser, Host, or runner constructs the UTF-8 no-BOM expected bytes, then uses
`ReadAllBytes`, exact length, and `SequenceEqual[byte]` before any effect. Marker
validation must never call `ReadAllText` or decode file bytes. A missing or
changed marker stops the command.

## Artifact Identity

The artifact rows in `docs/plan-d-pragmatic-cloud-pc-results.md` must already
contain a source commit and lowercase 64-hex ZIP SHA-256 before cloud-PC work
starts. Compute each local copy's hash and compare it character-for-character
with the ledger. Stop if a ledger identity is missing or either value differs.

```powershell
(Get-FileHash -Algorithm SHA256 -LiteralPath "C:\DH-CloudPC\DynamicsHelper_v2.0.76-beta.1.zip").Hash.ToLowerInvariant()
```

```powershell
throw 'TASK 5 MUST REPLACE THE B2 ARTIFACT-HASH PLACEHOLDER BEFORE EXECUTION'
```

The B2 path and hash remain placeholders until a separately approved build and
independent operational review. Do not replace either ZIP
after hashing. B2 is built once; only those immutable bytes may later be
qualified, and rebuilding invalidates all B2 evidence.

## One-Time Private B1 Completion Cleanup

This is a one-time test-environment cleanup for the unpublished private B1
state, not a product migration or compatibility path. Task 5 may execute it only
after independent review and authorization, before any B2 transaction. Any
mismatch stops the procedure and preserves all evidence. Do not run an update,
installer, storage mutation, or process action between these guards.

First perform a read-only exact B1 disk, finalization-ACK, process, and residue
guard for
known committed transaction `b1c2ad5ad2c4aeb59765302402450840`:

```powershell
$ErrorActionPreference='Stop';$root=Join-Path $env:LOCALAPPDATA 'DynamicsHelper';$specs=@(@('dh_native_host.exe',(Join-Path $root 'dh_native_host.exe'),$false),@('dh_update_runner.exe',(Join-Path $root 'updates\recovery\dh_update_runner.exe'),$true),@('dh_update_status_host.exe',(Join-Path $root 'updates\recovery\dh_update_status_host.exe'),$true));$all=@(Get-CimInstance Win32_Process -ErrorAction Stop);$counts=[ordered]@{};foreach($spec in $specs){$name=[string]$spec[0];$expected=[IO.Path]::GetFullPath([string]$spec[1]);$mustBeAbsent=[bool]$spec[2];$matches=@($all|Where-Object{$_.Name -ieq $name});if(@($matches|Where-Object{-not [string]::Equals([string]$_.ExecutablePath,$expected,[StringComparison]::OrdinalIgnoreCase)}).Count){throw "Unexpected process path for $name; preserve evidence"};if($mustBeAbsent -and $matches.Count){throw "Process must be absent: $name"};$counts[$name]=$matches.Count};[pscustomobject]@{MainHostCount=$counts['dh_native_host.exe'];RunnerCount=$counts['dh_update_runner.exe'];StatusHostCount=$counts['dh_update_status_host.exe'];ExactPaths=$true}|ConvertTo-Json -Compress
```

Require `ExactPaths:true` and runner/status-Host counts `0`. An expected-path
main Host may be active for the Options runtime checks; any same-name foreign
process or process-query error preserves evidence and stops cleanup. Then run:

```powershell
$ErrorActionPreference='Stop';$expectedTx='b1c2ad5ad2c4aeb59765302402450840';$expectedVersion='2.0.76-beta.1';$root=Join-Path $env:LOCALAPPDATA 'DynamicsHelper';$updates=Join-Path $root 'updates';$installed=Join-Path $root 'installed-product.json';$extensionManifest=Join-Path $root 'extension\manifest.json';$ackPath=Join-Path $updates 'finalization-ack.json';foreach($path in @($installed,$extensionManifest,$ackPath)){if(-not(Test-Path -LiteralPath $path -PathType Leaf -ErrorAction Stop)){throw "Required terminal file is missing: $([IO.Path]::GetFileName($path))"}};$product=[IO.File]::ReadAllText($installed)|ConvertFrom-Json -ErrorAction Stop;$manifest=[IO.File]::ReadAllText($extensionManifest)|ConvertFrom-Json -ErrorAction Stop;$extensionVersion=if($manifest.version_name){[string]$manifest.version_name}else{[string]$manifest.version};if(([string]$product.package_version -cne $expectedVersion) -or ($extensionVersion -cne $expectedVersion) -or ([string]$manifest.version -cne '2.0.76')){throw 'Installed disk versions are not exact private beta1'};$expectedAckBytes=[Text.UTF8Encoding]::new($false).GetBytes('{"outcome":"committed","state":"finalized-awaiting-ack","terminal_version":{"fresh_install":false,"version":"'+$expectedVersion+'"},"transactionId":"'+$expectedTx+'"}' + "`n");$actualAckBytes=[IO.File]::ReadAllBytes($ackPath);if($actualAckBytes.Length -ne $expectedAckBytes.Length -or -not [System.Linq.Enumerable]::SequenceEqual[byte]($actualAckBytes,$expectedAckBytes)){throw 'Finalization acknowledgment does not exactly match beta1 transaction/outcome/version'};$activeAbsent=-not(Test-Path -LiteralPath (Join-Path $updates 'active.json') -ErrorAction Stop);$workspaceAbsent=-not(Test-Path -LiteralPath (Join-Path $updates "transactions\$expectedTx") -ErrorAction Stop);$cursorAbsent=-not(Test-Path -LiteralPath (Join-Path $updates 'finalization-cursor.json') -ErrorAction Stop);$receiptAbsent=-not(Test-Path -LiteralPath (Join-Path $updates "receipts\$expectedTx.json") -ErrorAction Stop);$receipts=Join-Path $updates 'receipts';$receiptCount=if(Test-Path -LiteralPath $receipts -PathType Container -ErrorAction Stop){@([IO.Directory]::EnumerateFileSystemEntries($receipts)).Count}else{0};$expectedRunner=[IO.Path]::GetFullPath((Join-Path $updates 'recovery\dh_update_runner.exe'));$runners=@(Get-CimInstance Win32_Process -Filter "Name='dh_update_runner.exe'" -ErrorAction Stop);$foreignRunners=@($runners|Where-Object{-not [string]::Equals([string]$_.ExecutablePath,$expectedRunner,[StringComparison]::OrdinalIgnoreCase)});if($foreignRunners.Count){throw 'Unexpected update runner path; preserve evidence'};$runnerCount=$runners.Count;$expectedStatus=[IO.Path]::GetFullPath((Join-Path $updates 'recovery\dh_update_status_host.exe'));$statusHosts=@(Get-CimInstance Win32_Process -Filter "Name='dh_update_status_host.exe'" -ErrorAction Stop);$foreignStatusHosts=@($statusHosts|Where-Object{-not [string]::Equals([string]$_.ExecutablePath,$expectedStatus,[StringComparison]::OrdinalIgnoreCase)});if($foreignStatusHosts.Count){throw 'Unexpected status Host path; preserve evidence'};$statusHostCount=$statusHosts.Count;$runOncePath='Registry::HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\RunOnce';$runOnce=$false;try{if(Test-Path -LiteralPath $runOncePath -ErrorAction Stop){$runOnceProperties=Get-ItemProperty -LiteralPath $runOncePath -ErrorAction Stop;$runOnce=($runOnceProperties.PSObject.Properties.Name -contains 'DynamicsHelperUpdateRecovery')}}catch{throw 'RunOnce registry residue check failed'};$statusName='com.dynamics.helper.update_status';$statusRegistered=$false;foreach($statusPath in @("Registry::HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts\$statusName","Registry::HKEY_CURRENT_USER\Software\Microsoft\Edge\NativeMessagingHosts\$statusName")){try{if(Test-Path -LiteralPath $statusPath -ErrorAction Stop){$statusRegistered=$true}}catch{throw 'Status Host registry residue check failed'}};if(-not $activeAbsent -or -not $workspaceAbsent -or -not $cursorAbsent -or -not $receiptAbsent -or $receiptCount -ne 0 -or $runnerCount -ne 0 -or $statusHostCount -ne 0 -or $runOnce -or $statusRegistered){throw 'B1 terminal residue guard failed; preserve evidence'};[pscustomobject]@{HostVersion=[string]$product.package_version;ExtensionVersion=$extensionVersion;AckTransactionId=$expectedTx;AckOutcome='committed';ActiveAbsent=$activeAbsent;WorkspaceAbsent=$workspaceAbsent;CursorAbsent=$cursorAbsent;ReceiptAbsent=$receiptAbsent;ReceiptCount=$receiptCount;RunnerCount=$runnerCount;StatusHostProcessCount=$statusHostCount;RunOnceArmed=$runOnce;StatusHostRegistered=$statusRegistered}|ConvertTo-Json -Compress
```

Require exact B1 Host/Extension versions and matching committed ACK fields;
every `*Absent` value is `true`, all counts are `0`, and RunOnce/status-Host
flags are `false`. Then run the additional read-only path, scratch, process, and
zero-residue guards:

```powershell
$ErrorActionPreference='Stop';$root=Join-Path $env:LOCALAPPDATA 'DynamicsHelper';$updates=Join-Path $root 'updates';$marker='C:\DH-CloudPC\PLAN_D_EMPTY_CLOUD_PC.marker';$expectedMarkerBytes=[Text.UTF8Encoding]::new($false).GetBytes('PLAN_D_EFFECTIVELY_EMPTY_CLOUD_PC_V1');if(-not(Test-Path -LiteralPath $marker -PathType Leaf -ErrorAction Stop)){throw 'Empty-cloud-PC marker is missing'};$actualMarkerBytes=[IO.File]::ReadAllBytes($marker);if($actualMarkerBytes.Length -ne $expectedMarkerBytes.Length -or -not [System.Linq.Enumerable]::SequenceEqual[byte]($actualMarkerBytes,$expectedMarkerBytes)){throw 'Empty-cloud-PC marker is invalid'};foreach($path in @($root,$updates)){if(-not(Test-Path -LiteralPath $path -PathType Container -ErrorAction Stop) -or ((Get-Item -LiteralPath $path -Force -ErrorAction Stop).Attributes -band [IO.FileAttributes]::ReparsePoint)){throw 'Installed/update root is missing or unsafe'}};foreach($path in @((Join-Path $root 'installed-product.json'),(Join-Path $root 'extension\manifest.json'),(Join-Path $updates 'finalization-ack.json'))){if(-not(Test-Path -LiteralPath $path -PathType Leaf -ErrorAction Stop) -or ((Get-Item -LiteralPath $path -Force -ErrorAction Stop).Attributes -band [IO.FileAttributes]::ReparsePoint)){throw 'Required terminal file is missing or unsafe'}};$scratch=@((Join-Path $updates '.finalization-cursor.json.tmp'),(Join-Path $updates '.finalization-ack.json.tmp'),(Join-Path $updates 'receipts\.b1c2ad5ad2c4aeb59765302402450840.json.tmp'));if($scratch|Where-Object{Test-Path -LiteralPath $_ -ErrorAction Stop}){throw 'Finalization scratch evidence remains'};$expectedStatus=[IO.Path]::GetFullPath((Join-Path $updates 'recovery\dh_update_status_host.exe'));$statusHosts=@(Get-CimInstance Win32_Process -Filter "Name='dh_update_status_host.exe'" -ErrorAction Stop);$foreignStatusHosts=@($statusHosts|Where-Object{-not [string]::Equals([string]$_.ExecutablePath,$expectedStatus,[StringComparison]::OrdinalIgnoreCase)});if($foreignStatusHosts.Count){throw 'Unexpected status Host path; preserve evidence'};$statusCount=$statusHosts.Count;if($statusCount -ne 0){throw 'Status Host process remains'};[pscustomobject]@{MarkerMatches=$true;PlainRoots=$true;PlainTerminalFiles=$true;FinalizationScratchAbsent=$true;StatusHostProcessCount=$statusCount}|ConvertTo-Json -Compress
```

```powershell
$ErrorActionPreference='Stop';$updates=Join-Path $env:LOCALAPPDATA 'DynamicsHelper\updates';$counts=[ordered]@{};foreach($name in @('transactions','receipts')){$path=Join-Path $updates $name;if(Test-Path -LiteralPath $path){$item=Get-Item -LiteralPath $path -Force -ErrorAction Stop;if(-not $item.PSIsContainer -or (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0)){throw "$name namespace is not a plain directory"};$entries=@([IO.Directory]::EnumerateFileSystemEntries($path));if($entries.Count -ne 0){throw "$name namespace is not empty; preserve evidence"};$counts[$name]=$entries.Count}else{$counts[$name]=0}};foreach($name in @('active.json','finalization-cursor.json','.finalization-cursor.json.tmp','.finalization-ack.json.tmp')){if(Test-Path -LiteralPath (Join-Path $updates $name)){throw "Unexpected update residue: $name"}};[pscustomobject]@{TransactionEntryCount=$counts.transactions;ReceiptEntryCount=$counts.receipts;KnownNamespacesPlainOrAbsent=$true}|ConvertTo-Json -Compress
```

Require every Boolean to be `true`, status-Host count `0`, both namespace counts
`0`, and `KnownNamespacesPlainOrAbsent:true`. A file, reparse point, or unknown
entry fails closed. With no intervening action, use the installed B1 Options
DevTools to revalidate runtime identity, exact old-shape keys
`{kind,update,outcome}`, no `transactionId`, committed beta1, and
`packaged/verified`; remove only `dh_update_state`. The reviewed command prints
no URL:

```javascript
await (async()=>{const expectedVersion='2.0.76-beta.1';const fail=label=>{throw new Error('Old-shape cleanup guard failed: '+label)};const exact=(value,keys,label)=>{try{if(typeof value!=='object'||value===null||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)throw 0;const descriptors=Object.getOwnPropertyDescriptors(value);if(Reflect.ownKeys(descriptors).length!==keys.length||keys.some(key=>{const descriptor=descriptors[key];return !descriptor||descriptor.enumerable!==true||!Object.hasOwn(descriptor,'value')}))throw 0;return Object.fromEntries(keys.map(key=>[key,descriptors[key].value]))}catch{fail(label)}};const manifest=chrome.runtime.getManifest();const extensionVersion=manifest.version_name||manifest.version;if(extensionVersion!==expectedVersion)fail('loaded Extension is not exact private beta1');let capabilityRaw,verificationRaw;try{capabilityRaw=await chrome.runtime.sendMessage({type:'NATIVE_MSG',payload:{action:'get_capabilities'}});verificationRaw=await chrome.runtime.sendMessage({type:'NATIVE_MSG',payload:{action:'verify_installation'}})}catch{fail('runtime Host checks unavailable')}const capabilityEnvelope=exact(capabilityRaw,['status','data'],'capability envelope');const capabilities=exact(capabilityEnvelope.data,['host_version','capabilities'],'capability data');if(capabilityEnvelope.status!=='success'||capabilities.host_version!==expectedVersion||!Array.isArray(capabilities.capabilities)||capabilities.capabilities.length!==2||capabilities.capabilities[0]!=='prompt-scope-v1'||capabilities.capabilities[1]!=='transactional-update-v1')fail('runtime Host identity/capabilities');const verificationEnvelope=exact(verificationRaw,['status','data'],'verification envelope');const verification=exact(verificationEnvelope.data,['mode','integrity','host_version','extension_version'],'verification data');if(verificationEnvelope.status!=='success'||verification.mode!=='packaged'||verification.integrity!=='verified'||verification.host_version!==expectedVersion||verification.extension_version!==expectedVersion)fail('runtime installation integrity');const stored=await chrome.storage.local.get(['dh_update_state','pending_update']);if(Object.hasOwn(stored,'pending_update'))fail('legacy pending state present');const state=exact(stored.dh_update_state,['kind','update','outcome'],'old-shape state');const update=exact(state.update,['version','url','isPrerelease'],'old-shape candidate');if(state.kind!=='complete'||state.outcome!=='committed'||Object.hasOwn(state,'transactionId')||update.version!==expectedVersion||update.isPrerelease!==true||typeof update.url!=='string')fail('old-shape committed beta1 state');let candidateUrl;try{candidateUrl=new URL(update.url)}catch{fail('old-shape candidate URL')}if(candidateUrl.protocol!=='https:'||candidateUrl.username!==''||candidateUrl.password!==''||candidateUrl.hash!==''||!candidateUrl.pathname.toLowerCase().endsWith('.zip'))fail('old-shape candidate URL');await chrome.storage.local.remove('dh_update_state');return {guard:'PASS',hostVersion:capabilities.host_version,extensionVersion,oldShape:true,transactionIdPresent:false,outcome:state.outcome,integrity:verification.mode+'/'+verification.integrity}})()
```

Require `guard:'PASS'`, exact beta1 versions, committed outcome, no transaction
ID, and `integrity:'packaged/verified'`. Then use normal Service Worker **Stop**,
not Extension Reload or Unregister, return to Options, and wake the Worker:

```javascript
await (async()=>{const raw=await chrome.runtime.sendMessage({type:'DH_UPDATE_GET_STATE'});if(raw?.handled!==true||raw?.state?.kind!=='idle'||Reflect.ownKeys(raw.state).length!==1)throw new Error('Fresh Worker is not idle');const stored=await chrome.storage.local.get(['dh_update_state','pending_update']);if(Object.hasOwn(stored,'pending_update'))throw new Error('Legacy pending state remains');if(Object.hasOwn(stored,'dh_update_state')&&(stored.dh_update_state?.kind!=='idle'||Reflect.ownKeys(stored.dh_update_state).length!==1))throw new Error('Stored coordinator state is not idle');return {handled:true,kind:'idle',storedKind:Object.hasOwn(stored,'dh_update_state')?'idle':'absent',hasUpdateUrl:false}})()
```

Require public `idle`, stored `idle` or absent, and `hasUpdateUrl:false`. The fixed
ACK slot represents only the latest acknowledgment, so this cleanup must precede
every B2 transaction.

## Installer Commands

Before any cross-scenario baseline installer, the previous transaction must
already be safely settled and browser state must be durable idle with no URL,
regardless of its disposition. An installer does not clear Chrome storage. If
this cannot be proved, stop; any necessary recovery installer is a separate,
explicitly approved settlement operation, not a next-scenario baseline. A failed
qualification stays stopped even if later settlement succeeds.

Before every B1 or B2 installer invocation, close all Chrome and Edge windows and
run this guard. It must produce no error. Then run the DH-process guard; the
direct installer commands repeat both checks in one fail-closed process snapshot.

```powershell
$expectedMarkerBytes=[Text.UTF8Encoding]::new($false).GetBytes('PLAN_D_EFFECTIVELY_EMPTY_CLOUD_PC_V1');$marker='C:\DH-CloudPC\PLAN_D_EMPTY_CLOUD_PC.marker';if(-not(Test-Path -LiteralPath $marker -PathType Leaf -ErrorAction Stop)){throw 'Empty-cloud-PC marker is missing or invalid'};$actualMarkerBytes=[IO.File]::ReadAllBytes($marker);if($actualMarkerBytes.Length -ne $expectedMarkerBytes.Length -or -not [System.Linq.Enumerable]::SequenceEqual[byte]($actualMarkerBytes,$expectedMarkerBytes)){throw 'Empty-cloud-PC marker is missing or invalid'};$b=@(Get-CimInstance Win32_Process -ErrorAction Stop|Where-Object{$_.Name -in @('chrome.exe','msedge.exe')});if($b.Count){throw 'Close all Chrome and Edge windows before running the installer'}
```

Then require all main Hosts, update runners, and status Hosts to have exited and
reject matching names at foreign paths. This prevents the installer's
compatibility stop path from selecting any process by name.

```powershell
$expectedMarkerBytes=[Text.UTF8Encoding]::new($false).GetBytes('PLAN_D_EFFECTIVELY_EMPTY_CLOUD_PC_V1');$marker='C:\DH-CloudPC\PLAN_D_EMPTY_CLOUD_PC.marker';if(-not(Test-Path -LiteralPath $marker -PathType Leaf -ErrorAction Stop)){throw 'Empty-cloud-PC marker is missing or invalid'};$actualMarkerBytes=[IO.File]::ReadAllBytes($marker);if($actualMarkerBytes.Length -ne $expectedMarkerBytes.Length -or -not [System.Linq.Enumerable]::SequenceEqual[byte]($actualMarkerBytes,$expectedMarkerBytes)){throw 'Empty-cloud-PC marker is missing or invalid'};$root=Join-Path $env:LOCALAPPDATA 'DynamicsHelper';$expectedHost=[IO.Path]::GetFullPath((Join-Path $root 'dh_native_host.exe'));$expectedRunner=[IO.Path]::GetFullPath((Join-Path $root 'updates\recovery\dh_update_runner.exe'));$expectedStatus=[IO.Path]::GetFullPath((Join-Path $root 'updates\recovery\dh_update_status_host.exe'));$all=@(Get-CimInstance Win32_Process -ErrorAction Stop);$hosts=@($all|Where-Object{$_.Name -ieq 'dh_native_host.exe'});$runners=@($all|Where-Object{$_.Name -ieq 'dh_update_runner.exe'});$statusHosts=@($all|Where-Object{$_.Name -ieq 'dh_update_status_host.exe'});if(@($hosts|Where-Object{-not [string]::Equals([string]$_.ExecutablePath,$expectedHost,[StringComparison]::OrdinalIgnoreCase)}).Count -or @($runners|Where-Object{-not [string]::Equals([string]$_.ExecutablePath,$expectedRunner,[StringComparison]::OrdinalIgnoreCase)}).Count -or @($statusHosts|Where-Object{-not [string]::Equals([string]$_.ExecutablePath,$expectedStatus,[StringComparison]::OrdinalIgnoreCase)}).Count){throw 'Unexpected matching-name DH process path; do not invoke the installer'};if($hosts.Count -or $runners.Count -or $statusHosts.Count){throw 'Main Host, update runner, or status Host is still active; do not invoke the installer'}
```

Extract B1 into a fresh local directory and invoke its complete installer only
after separate approval and independent review of the exact command:

```powershell
$ErrorActionPreference='Stop';$expectedMarkerBytes=[Text.UTF8Encoding]::new($false).GetBytes('PLAN_D_EFFECTIVELY_EMPTY_CLOUD_PC_V1');$marker='C:\DH-CloudPC\PLAN_D_EMPTY_CLOUD_PC.marker';if(-not(Test-Path -LiteralPath $marker -PathType Leaf -ErrorAction Stop)){throw 'Empty-cloud-PC marker is missing or invalid'};$actualMarkerBytes=[IO.File]::ReadAllBytes($marker);if($actualMarkerBytes.Length -ne $expectedMarkerBytes.Length -or -not [System.Linq.Enumerable]::SequenceEqual[byte]($actualMarkerBytes,$expectedMarkerBytes)){throw 'Empty-cloud-PC marker is missing or invalid'};$root=Join-Path $env:LOCALAPPDATA 'DynamicsHelper';$all=@(Get-CimInstance Win32_Process -ErrorAction Stop);$browsers=@($all|Where-Object{$_.Name -in @('chrome.exe','msedge.exe')});$expectedHost=[IO.Path]::GetFullPath((Join-Path $root 'dh_native_host.exe'));$hosts=@($all|Where-Object{$_.Name -ieq 'dh_native_host.exe'});$expectedRunner=[IO.Path]::GetFullPath((Join-Path $root 'updates\recovery\dh_update_runner.exe'));$runners=@($all|Where-Object{$_.Name -ieq 'dh_update_runner.exe'});$expectedStatus=[IO.Path]::GetFullPath((Join-Path $root 'updates\recovery\dh_update_status_host.exe'));$statusHosts=@($all|Where-Object{$_.Name -ieq 'dh_update_status_host.exe'});if(@($hosts|Where-Object{-not [string]::Equals([string]$_.ExecutablePath,$expectedHost,[StringComparison]::OrdinalIgnoreCase)}).Count -or @($runners|Where-Object{-not [string]::Equals([string]$_.ExecutablePath,$expectedRunner,[StringComparison]::OrdinalIgnoreCase)}).Count -or @($statusHosts|Where-Object{-not [string]::Equals([string]$_.ExecutablePath,$expectedStatus,[StringComparison]::OrdinalIgnoreCase)}).Count){throw 'Unexpected matching-name DH process path; do not invoke the installer'};if($browsers.Count -or $hosts.Count -or $runners.Count -or $statusHosts.Count){throw 'Browser, main Host, update runner, or status Host is active; do not invoke the installer'};$zip='C:\DH-CloudPC\DynamicsHelper_v2.0.76-beta.1.zip';$extract='C:\DH-CloudPC\B1-extracted';$expectedMarker=if(Test-Path -LiteralPath "$root\manifest.json" -PathType Leaf -ErrorAction Stop){'SUCCESS: Update Complete!'}else{'SUCCESS: Installation Complete!'};if(Test-Path -LiteralPath $extract -ErrorAction Stop){Remove-Item -LiteralPath $extract -Recurse -Force -ErrorAction Stop};Expand-Archive -LiteralPath $zip -DestinationPath $extract -ErrorAction Stop;$installer=Join-Path $extract 'installer_core.ps1';if(-not(Test-Path -LiteralPath $installer -PathType Leaf -ErrorAction Stop)){throw 'B1 installer_core.ps1 is missing'};$installOutput=@();& pwsh -NoProfile -ExecutionPolicy Bypass -File $installer 2>&1|Tee-Object -Variable installOutput;$installExit=$LASTEXITCODE;if($installExit -ne 0){throw "B1 installer failed with exit code $installExit"};$plainOutput=@($installOutput|ForEach-Object{([string]$_) -replace '\x1b\[[0-?]*[ -/]*[@-~]',''});if($plainOutput -cnotcontains $expectedMarker){throw "B1 installer success marker missing: $expectedMarker"}
```

Extract B2 into a fresh local directory when Scenario 3 or matching-installer
recovery calls for B2. This block is a pending placeholder and is
independently non-executable until a future readiness change replaces and reviews the complete
block after B2 exists:

```powershell
throw 'TASK 5 MUST REPLACE THE COMPLETE B2 INSTALLER PLACEHOLDER BEFORE EXECUTION'
```

The direct installer is interactive; press Enter only when its final prompt
appears. `Tee-Object` retains stdout while displaying it. Success requires both
native exit code `0` and the exact marker selected before invocation:
`SUCCESS: Installation Complete!` for a fresh installation or
`SUCCESS: Update Complete!` for an existing installation. A nonzero exit or
missing marker throws. Never invoke `install.bat`, and never copy installer
stdout into the ledger.

## Common Qualification Checklist

| Gate | Required evidence before proceeding |
| --- | --- |
| Authorization | Explicit approval for each next artifact, distribution, or cloud mutation boundary; approved design/docs plan is not execution approval |
| Artifact | Immutable B1/B2 source, version, and ZIP SHA-256 identities; exact verified complete locally copied packages only |
| B2 automated gates | Current Host full suite, Extension full suite, Extension production build, Frozen Host build/probe, Static/reachability checks, all exactly PASS |
| Environment | Disposable non-customer cloud PC, installed frozen Host, local complete installers, public beta discovery disabled; historical A evidence only and old PC unchanged |
| Baseline | Safely settled previous transaction and durable browser idle/no URL before each complete B1 baseline installer; exact historical initial cleanup and per-attempt rollback cleanup are separate guards |
| Product | Matching Host/Extension versions, registration, capabilities, packaged/verified integrity, exact terminal evidence and full allowed residue checks |
| Functionality | Non-customer Analyze and harmless Options persistence/restore smoke checks; record PASS/FAIL only |
| Completion | Shared visible observation order for committed B2, normal UI ACK, global disappearance, refreshed non-replay, durable public/stored idle/no URL |
| Closure | Record disposition and ownership-checked private distribution cleanup separately from product settlement on every outcome |

All nine gates apply with the scenario differences below. Passing qualification
does not authorize publication or workload migration.

## Establish `plan-d-b1`

Only after previous-transaction safe settlement and durable browser idle/no URL,
run the complete B1 installer before each scenario, including Scenario 3. Then
restart the browser, open the installed Dynamics Helper Options page, and keep
**Receive beta updates** disabled.

### Version And Registration

The installed-product and Extension versions must both be `2.0.76-beta.1`, and
integrity metadata must be present:

```powershell
$root="$env:LOCALAPPDATA\DynamicsHelper"; $p=Get-Content -LiteralPath "$root\installed-product.json" -Raw | ConvertFrom-Json; $m=Get-Content -LiteralPath "$root\extension\manifest.json" -Raw | ConvertFrom-Json; [pscustomobject]@{Host=$p.package_version;Extension=$(if($m.version_name){$m.version_name}else{$m.version});IntegrityMetadata=(Test-Path -LiteralPath "$root\release-integrity.json")}
```

Read the production Native Messaging registration:

```powershell
$ErrorActionPreference='Stop';$name='com.dynamics.helper.native';$chromePath="Registry::HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts\$name";$edgePath="Registry::HKEY_CURRENT_USER\Software\Microsoft\Edge\NativeMessagingHosts\$name";foreach($path in @($chromePath,$edgePath)){if(-not(Test-Path -LiteralPath $path -ErrorAction Stop)){throw 'Production Native Messaging registration key is missing'}};[pscustomobject]@{Chrome=(Get-ItemPropertyValue -LiteralPath $chromePath -Name '(default)' -ErrorAction Stop);Edge=(Get-ItemPropertyValue -LiteralPath $edgePath -Name '(default)' -ErrorAction Stop)}
```

For the browser under test, the displayed registration target must be exactly
`%LOCALAPPDATA%\DynamicsHelper\manifest.json`. That manifest must identify
`dh_native_host.exe` in the same installed root, not a source launcher or a
redirected-drive path. Stop on any disagreement.

### Capabilities And Integrity

Run these ordinary Native messages in the installed **Options page DevTools
console**, not the Service Worker console:

```javascript
await chrome.runtime.sendMessage({type:'NATIVE_MSG',payload:{action:'get_capabilities'}})
```

Require a successful envelope whose data reports Host `2.0.76-beta.1` and whose
capabilities include `transactional-update-v1`.

```javascript
await chrome.runtime.sendMessage({type:'NATIVE_MSG',payload:{action:'verify_installation'}})
```

Require `mode: 'packaged'`, `integrity: 'verified'`, and matching Host and
Extension versions `2.0.76-beta.1`.

### Coordinator And Runtime Baseline

Inspect only safe local-state fields after the browser reload:

```javascript
const {dh_update_state:s}=await chrome.storage.local.get('dh_update_state'); ({kind:s?.kind,hasUpdateUrl:typeof s?.update?.url==='string',transactionId:s?.transactionId,outcome:s?.outcome,code:s?.code,errorCode:s?.errorCode})
```

Before the first beta2 transaction, the initial committed B1 cleanup requires
the exact guard in **One-Time Private B1 Completion Cleanup**. A later rolled-back
attempt requires **Per-Attempt B1 Rollback Cleanup Contract**, currently BLOCKED;
never reuse or parameter-swap the historical committed-B1 guard. Never
clear a beta2 `complete`, or any `preparing`, `activating`, `polling`,
`reload-pending`, `ack-pending`, or `recovery-required` state manually. Reopen
Options and query the coordinator through its public message:

```javascript
const r=await chrome.runtime.sendMessage({type:'DH_UPDATE_GET_STATE'}); ({handled:r?.handled,kind:r?.state?.kind,version:r?.state?.update?.version,errorCode:r?.state?.errorCode})
```

Require `handled: true` and `kind: 'idle'`. The safe local-state inspection must
show no retained update URL.

Extension Reload and Unregister are never candidate-restart or completion-cleanup
mechanisms in this runbook.

Run this shared exact-path process guard immediately before every generic
baseline and post-transaction terminal guard. A main Host may be active at its
exact installed path; update runner and status Host counts must be zero. A
matching DH process name at any other path or any process-query error fails:

```powershell
$ErrorActionPreference='Stop';$root=Join-Path $env:LOCALAPPDATA 'DynamicsHelper';$specs=@(@('dh_native_host.exe',(Join-Path $root 'dh_native_host.exe'),$false),@('dh_update_runner.exe',(Join-Path $root 'updates\recovery\dh_update_runner.exe'),$true),@('dh_update_status_host.exe',(Join-Path $root 'updates\recovery\dh_update_status_host.exe'),$true));$counts=[ordered]@{};$all=@(Get-CimInstance Win32_Process -ErrorAction Stop);foreach($spec in $specs){$name=[string]$spec[0];$expected=[IO.Path]::GetFullPath([string]$spec[1]);$mustBeAbsent=[bool]$spec[2];$matches=@($all|Where-Object{$_.Name -ieq $name});$foreign=@($matches|Where-Object{-not [string]::Equals([string]$_.ExecutablePath,$expected,[StringComparison]::OrdinalIgnoreCase)});if($foreign.Count){throw "Unexpected process path for $name"};if($mustBeAbsent -and $matches.Count){throw "Process must be absent: $name"};$counts[$name]=$matches.Count};[pscustomobject]@{MainHostCount=$counts['dh_native_host.exe'];RunnerCount=$counts['dh_update_runner.exe'];StatusHostCount=$counts['dh_update_status_host.exe'];ExactPaths=$true}|ConvertTo-Json -Compress
```

Require `ExactPaths:true` and both runner/status-Host counts `0`. Then run the
disk/process baseline check:

```powershell
$ErrorActionPreference='Stop';$root=Join-Path $env:LOCALAPPDATA 'DynamicsHelper';$updates=Join-Path $root 'updates';foreach($path in @($root,$updates)){if(-not(Test-Path -LiteralPath $path -PathType Container -ErrorAction Stop)){throw 'Installed/update root is missing or not a directory'};$item=Get-Item -LiteralPath $path -Force -ErrorAction Stop;if(($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0){throw 'Installed/update root is a reparse point'}};$counts=[ordered]@{};foreach($name in @('transactions','receipts')){$path=Join-Path $updates $name;if(Test-Path -LiteralPath $path -ErrorAction Stop){$item=Get-Item -LiteralPath $path -Force -ErrorAction Stop;if(-not $item.PSIsContainer -or (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0)){throw "$name namespace is not a plain directory"};$entries=@([IO.Directory]::EnumerateFileSystemEntries($path));$counts[$name]=$entries.Count}else{$counts[$name]=0}};foreach($name in @('active.json','finalization-cursor.json','.finalization-cursor.json.tmp','.finalization-ack.json.tmp')){if(Test-Path -LiteralPath (Join-Path $updates $name) -ErrorAction Stop){throw "Baseline update residue exists: $name"}};$ackPath=Join-Path $updates 'finalization-ack.json';$ackPresent=Test-Path -LiteralPath $ackPath -ErrorAction Stop;if($ackPresent){if(-not(Test-Path -LiteralPath $ackPath -PathType Leaf -ErrorAction Stop)){throw 'Baseline finalization ACK is not a file'};$ackItem=Get-Item -LiteralPath $ackPath -Force -ErrorAction Stop;if(($ackItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0){throw 'Baseline finalization ACK is a reparse point'}};if($counts.transactions -ne 0 -or $counts.receipts -ne 0){throw 'Baseline transaction or receipt workspace residue exists'};$runnerCount=@(Get-CimInstance Win32_Process -Filter "Name='dh_update_runner.exe'" -ErrorAction Stop).Count;$statusHostCount=@(Get-CimInstance Win32_Process -Filter "Name='dh_update_status_host.exe'" -ErrorAction Stop).Count;$runOncePath='Registry::HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\RunOnce';$runOnceArmed=$false;try{if(Test-Path -LiteralPath $runOncePath -ErrorAction Stop){$runOnceProperties=Get-ItemProperty -LiteralPath $runOncePath -ErrorAction Stop;$runOnceArmed=($runOnceProperties.PSObject.Properties.Name -contains 'DynamicsHelperUpdateRecovery')}}catch{throw 'RunOnce registry baseline check failed'};$statusName='com.dynamics.helper.update_status';$statusRegistered=$false;foreach($statusPath in @("Registry::HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts\$statusName","Registry::HKEY_CURRENT_USER\Software\Microsoft\Edge\NativeMessagingHosts\$statusName")){try{if(Test-Path -LiteralPath $statusPath -ErrorAction Stop){$statusRegistered=$true}}catch{throw 'Status Host registry baseline check failed'}};if($runnerCount -ne 0 -or $statusHostCount -ne 0 -or $runOnceArmed -or $statusRegistered){throw 'Baseline process or registry residue exists'};[pscustomobject]@{ActiveAuthority=$false;TransactionEntryCount=$counts.transactions;ReceiptEntryCount=$counts.receipts;FinalizationCursor=$false;FinalizationScratch=$false;FinalizationAckPresent=$ackPresent;RunnerCount=$runnerCount;StatusHostProcessCount=$statusHostCount;RunOnceArmed=$runOnceArmed;StatusHostRegistered=$statusRegistered;NamespacesPlain=$true}|ConvertTo-Json -Compress
```

Require both namespace counts and both process counts to be `0`; all residue,
RunOnce, and status-registration fields must be `false`; and
`NamespacesPlain:true`. `FinalizationAckPresent` may be either Boolean value: a
present fixed `finalization-ack.json` must be a plain regular file but may
legitimately describe the last acknowledged transaction and is not content-
matched at this generic baseline. Empty or malformed registry values still count
as residue because existence, not truthiness, is authoritative. Any filesystem,
process-query, or registry read error fails closed. Finally, run Analyze only against the
designated non-customer test case and change then restore one harmless Options
preference.
Record only PASS/FAIL for each check. The baseline is valid only after all
version, registration, capability, integrity, coordinator, disk/process,
Analyze, and Options checks pass.

### Visible Completion Observation Order

After B2 reload, first observe the terminal FAB menu, close it before eight
visible seconds, then foreground Options for approximately eight continuous
visible seconds as the intended winning surface. Follow **Completion Lifecycle
Evidence** for global disappearance, refresh/non-replay, and read-only idle/no-URL
verification before any Options-based terminal inspection or smoke checks.
Do not require a cold-start bubble or enable, snapshot, restore, or reread the
Status bubble preference. Keep other qualifying surfaces from winning; a closed
red dot is not observation. ACK is UI-only, never manual or response-authoritative.

If `plan-d-b1` cannot be established safely, stop and preserve all update
evidence. Matching-installer settlement requires separate approval and reviewed
terminal/browser-state guards; it is not automatic rebaseline or another
qualification start. Failed settlement never permits a new start. Do not
improvise file copies, rebuild the cloud PC, or delete `updates/**`.

## Controlled Candidate Start

Do not begin until the complete `plan-d-b1` baseline has just returned public
`DH_UPDATE_GET_STATE` `idle`, with no active authority. Keep the installed B1
Options page and its DevTools console open throughout the candidate restart.
These commands run only in the installed B1 **Options page DevTools console**,
where `window.prompt()` is available. Keep the URL in a local variable, never
print it, and never print a complete storage or response object.

```javascript
const privateB2Url = window.prompt('Paste the short-lived private B2 ZIP URL'); if (!privateB2Url) throw new Error('Private B2 URL is required')
```

Inject the reviewed B2 candidate and inspect only non-secret fields:

```javascript
await chrome.storage.local.remove('pending_update'); await chrome.storage.local.set({dh_update_state:{kind:'available',update:{version:'2.0.76-beta.2',url:privateB2Url,isPrerelease:true}}}); const {dh_update_state:s}=await chrome.storage.local.get('dh_update_state'); ({kind:s?.kind,version:s?.update?.version,isPrerelease:s?.update?.isPrerelease,errorCode:s?.errorCode})
```

Require `available`, `2.0.76-beta.2`, and `true`. The exact next operation is a
normal Service Worker stop: open `edge://extensions` in another tab, open
**Dynamics Helper**, open its **Service Worker** inspector, then use the
**Application** pane's **Stop** control for that Worker. Do not click the
Extension **Reload** control and do not click **Unregister**. The order is
mandatory: seed `available` first, then Stop. Never Stop before the seed.

Return to the same already-open Options page and DevTools console. Send the
public state request below; it wakes a new normal Worker and verifies its
hydrated candidate:

```javascript
const r=await chrome.runtime.sendMessage({type:'DH_UPDATE_GET_STATE'}); ({handled:r?.handled,kind:r?.state?.kind,version:r?.state?.update?.version,errorCode:r?.state?.errorCode})
```

Require `handled: true`, `kind: 'available'`, and version `2.0.76-beta.2`.
If it returns `idle`, do not start an update. Re-establish a fresh
`plan-d-b1`/`idle` baseline, prompt for and re-enter the private URL, seed
`available` again, and only then Stop the Worker. Do not reuse the failed
attempt as candidate acceptance.

Never use `chrome.runtime.reload()` for this private candidate restart or
completion cleanup. An Extension reload
triggers `onInstalled`, which sends `check_updates`; a normal public
`update_not_available` response clears the manually seeded `available` state to
`idle`. Do not substitute dynamic `import()`, a debugger/minified alias, or a
product backdoor. Edge's normal Service Worker **Stop** is the only
candidate-restart procedure in this runbook.

Register this sanitized pre-reload listener before starting. It never prints
`update.url`. The required Extension reload destroys this context, so it is only
for capturing pre-reload transaction progress/identity and is not terminal
lifecycle evidence:

```javascript
globalThis.dhUpdateWatch=(changes,area)=>{const s=changes.dh_update_state?.newValue;if(area==='local'&&s)console.log({kind:s.kind,transactionId:s.transactionId,targetVersion:s.targetVersion,outcome:s.outcome,code:s.code,errorCode:s.errorCode})}; chrome.storage.onChanged.addListener(globalThis.dhUpdateWatch)
```

Start through the payload-free production coordinator request:

```javascript
void chrome.runtime.sendMessage({type:'DH_UPDATE_START'}).then(r=>{const s=r?.state;console.log({handled:r?.handled,kind:s?.kind,transactionId:s?.transactionId,targetVersion:s?.targetVersion,outcome:s?.outcome,code:s?.code,errorCode:s?.errorCode})}).catch(()=>console.error('Update start request disconnected'))
```

Capture the durably exposed transaction identity before reload. After start,
leave Options non-foreground before B2 terminal display; do not keep it foreground
through completion. After B2 reload, perform **Visible Completion Observation
Order** before reopening Options DevTools for terminal inspection. Assume the
pre-reload listener is gone and inspect only safe fields:

```javascript
const {dh_update_state:s}=await chrome.storage.local.get('dh_update_state'); ({kind:s?.kind,transactionId:s?.transactionId,targetVersion:s?.targetVersion,outcome:s?.outcome,code:s?.code,errorCode:s?.errorCode,version:s?.update?.version})
```

Copy only `kind`, `transactionId`, `targetVersion`, and `outcome` into the
ledger. Never copy `update.url`, a complete state object, console history, or a
full log.

## Terminal Verification And Cleanup

At B2 terminal `complete`, perform **Visible Completion Observation Order** first.
Use the transaction identity captured before reload and read-only disk evidence
without foregrounding Options prematurely. Only after that sequence run the
installed-version command, Options capabilities/integrity checks, safe
after-reload projection (including `errorCode`), and outcome-bound terminal guard.
For a B1 rollback, use version-specific settlement below, not B2 ACK semantics.
Require Host and
Extension to agree with the terminal outcome: B2 `2.0.76-beta.2` for
`committed`, or B1 `2.0.76-beta.1` for `rolled-back`. Integrity must be
`packaged/verified`.

### Completion Lifecycle Evidence

Completion timing has two separate evidence sources. Do not merge or overstate
them.

**Automated exact-timing evidence:** Before any cloud-PC scenario can pass, the
fresh B2 Extension automated gate must pass the FAB and Options tests that prove
no ACK at 7,999 ms, one exact same-transaction ACK at 8,000 ms, timer stability
under identity/state changes, no optimistic hide, no use of the ACK response as
live authority, and transition only from the authoritative broadcast. Visibility
epoch resets, stale callbacks, transport failures, StrictMode cleanup, duplicate
ACKs, and new-protocol rollback-to-Retry remain automated evidence, not a new
cloud timing framework. Future artifact verification records actual B2 test
counts in the ledger; this runbook does not hard-code
them as final artifact evidence.

**Cloud-PC integration evidence:** After B2 reloads, first open the FAB menu and
observe its terminal banner. Close the menu before it completes eight visible
seconds, then foreground Options for approximately eight continuous visible
seconds. Options is the intended winning surface. Return to FAB to verify global
disappearance; refresh FAB and Options and use the reviewed read-only projection
to verify non-replay, durable public/stored idle, and no candidate URL.

Do not open or foreground Options for terminal inspection, capabilities,
integrity, or smoke checks before this observation sequence: it can consume
completion first. Keep other qualifying surfaces from winning. If the intended
winning surface was missed, record that fact; never invent timing evidence or
seed fake completion. A closed red dot is not observation. Never send a manual
completion ACK or treat its response as live authority.

The reload destroys pre-reload contexts; neither their listeners nor timers are
cloud timing evidence. This is approximate integration observation, not an
independent exact-millisecond measurement. Do not edit B2 `dh_update_state`.

After both terminal UIs disappear, use this safe projection in Options. Repeat
it after refreshing the ordinary FAB page and after refreshing Options. It
reports URL presence only and never prints a full state or URL:

```javascript
const r=await chrome.runtime.sendMessage({type:'DH_UPDATE_GET_STATE'});const {dh_update_state:s}=await chrome.storage.local.get('dh_update_state');({handled:r?.handled,publicKind:r?.state?.kind,publicVersion:r?.state?.update?.version,publicHasUpdateUrl:typeof r?.state?.update?.url==='string',storedKind:s?.kind??'absent',storedVersion:s?.update?.version,storedHasUpdateUrl:typeof s?.update?.url==='string'})
```

For committed completion, the public state must be `idle` with no retained
candidate URL, and stored state must be `idle` or absent with no URL. After each
FAB and Options refresh, visually confirm that completion does not reappear.
A safe B1 rollback cannot prove this lifecycle: B1 lacks the new ACK protocol.
It is never B2 one-shot/rollback PASS evidence and need not become new-protocol
Retry; use the blocked per-attempt cleanup contract before any remaining attempt.
Record PASS/FAIL
only, with no screenshot, log, customer data, case identity, or prompt content.

A scenario cannot pass unless both the fresh automated exact-timing gate and
these real cloud integration checks pass. Do not record the ledger field yet.
First finish terminal residue verification and the Analyze/Options smoke checks.
The unrelated harmless Options persistence/restore smoke check remains required.

After final acknowledgment, verify that the captured transaction workspace is
gone and the entire transactions/receipts namespaces are empty. In the command,
`$transactionEntries` is populated by
`[IO.Directory]::EnumerateFileSystemEntries($transactions)` whenever the
namespace exists; future review must retain the explicit `Count -eq 0` acceptance check
when it performs its final independent runbook review. The captured transaction
and `<transaction>.preparing` path checks are additional assertions, not a
substitute for full enumeration:

Rerun the shared exact-path process guard immediately before this command and
require the same result. The terminal command's own runner/status queries are a
second absence check, not an identity substitute.

```powershell
$ErrorActionPreference='Stop';$tx=(Read-Host 'Paste the captured lowercase 32-hex transaction ID').Trim();$expectedOutcome=(Read-Host 'Expected outcome: committed or rolled-back').Trim();$expectedVersion=(Read-Host 'Expected terminal version').Trim();if($tx -cnotmatch '^[0-9a-f]{32}$'){throw 'Invalid transaction ID'};if(-not(($expectedOutcome -ceq 'committed' -and $expectedVersion -ceq '2.0.76-beta.2') -or ($expectedOutcome -ceq 'rolled-back' -and $expectedVersion -ceq '2.0.76-beta.1'))){throw 'Outcome and terminal version are not an accepted B1/B2 pair'};$root=Join-Path $env:LOCALAPPDATA 'DynamicsHelper';$updates=Join-Path $root 'updates';foreach($path in @($root,$updates)){if(-not(Test-Path -LiteralPath $path -PathType Container -ErrorAction Stop)){throw 'Installed/update root is missing or not a directory'};$item=Get-Item -LiteralPath $path -Force -ErrorAction Stop;if(($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0){throw 'Installed/update root is a reparse point'}};$ackPath=Join-Path $updates 'finalization-ack.json';if(-not(Test-Path -LiteralPath $ackPath -PathType Leaf -ErrorAction Stop)){throw 'Finalization ACK is missing or not a file'};$ackItem=Get-Item -LiteralPath $ackPath -Force -ErrorAction Stop;if(($ackItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0){throw 'Finalization ACK is a reparse point'};$expectedAckBytes=[Text.UTF8Encoding]::new($false).GetBytes('{"outcome":"'+$expectedOutcome+'","state":"finalized-awaiting-ack","terminal_version":{"fresh_install":false,"version":"'+$expectedVersion+'"},"transactionId":"'+$tx+'"}' + "`n");$actualAckBytes=[IO.File]::ReadAllBytes($ackPath);if($actualAckBytes.Length -ne $expectedAckBytes.Length -or -not [System.Linq.Enumerable]::SequenceEqual[byte]($actualAckBytes,$expectedAckBytes)){throw 'Finalization ACK bytes do not match transaction, outcome, and terminal version'};$transactions=Join-Path $updates 'transactions';$transactionEntries=@();if(Test-Path -LiteralPath $transactions -ErrorAction Stop){$transactionItem=Get-Item -LiteralPath $transactions -Force -ErrorAction Stop;if(-not $transactionItem.PSIsContainer -or (($transactionItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0)){throw 'Transactions namespace is not a plain directory'};$transactionEntries=@([IO.Directory]::EnumerateFileSystemEntries($transactions))};if($transactionEntries.Count -ne 0){throw 'Transaction namespace is not empty'};foreach($path in @((Join-Path $transactions $tx),(Join-Path $transactions "$tx.preparing"),(Join-Path $updates 'active.json'),(Join-Path $updates 'finalization-cursor.json'),(Join-Path $updates '.finalization-cursor.json.tmp'),(Join-Path $updates '.finalization-ack.json.tmp'))){if(Test-Path -LiteralPath $path -ErrorAction Stop){throw 'Transaction authority, workspace, cursor, or scratch residue remains'}};$receipts=Join-Path $updates 'receipts';$receiptCount=0;if(Test-Path -LiteralPath $receipts -ErrorAction Stop){$receiptItem=Get-Item -LiteralPath $receipts -Force -ErrorAction Stop;if(-not $receiptItem.PSIsContainer -or (($receiptItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0)){throw 'Receipts namespace is not a plain directory'};$receiptEntries=@([IO.Directory]::EnumerateFileSystemEntries($receipts));$receiptCount=$receiptEntries.Count;if($receiptCount -ne 0){throw 'Receipt or receipt-scratch residue remains'}};$runnerCount=@(Get-CimInstance Win32_Process -Filter "Name='dh_update_runner.exe'" -ErrorAction Stop).Count;$statusHostCount=@(Get-CimInstance Win32_Process -Filter "Name='dh_update_status_host.exe'" -ErrorAction Stop).Count;$runOncePath='Registry::HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\RunOnce';$runOnceArmed=$false;try{if(Test-Path -LiteralPath $runOncePath -ErrorAction Stop){$runOnceProperties=Get-ItemProperty -LiteralPath $runOncePath -ErrorAction Stop;$runOnceArmed=($runOnceProperties.PSObject.Properties.Name -contains 'DynamicsHelperUpdateRecovery')}}catch{throw 'RunOnce registry terminal check failed'};$statusName='com.dynamics.helper.update_status';$statusRegistered=$false;foreach($statusPath in @("Registry::HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts\$statusName","Registry::HKEY_CURRENT_USER\Software\Microsoft\Edge\NativeMessagingHosts\$statusName")){try{if(Test-Path -LiteralPath $statusPath -ErrorAction Stop){$statusRegistered=$true}}catch{throw 'Status Host registry terminal check failed'}};if($runnerCount -ne 0 -or $statusHostCount -ne 0 -or $runOnceArmed -or $statusRegistered){throw 'Terminal process or registry residue remains'};[pscustomobject]@{TransactionId=$tx;Outcome=$expectedOutcome;TerminalVersion=$expectedVersion;FinalizationAckMatches=$true;ActiveAbsent=$true;TransactionEntryCount=$transactionEntries.Count;WorkspaceAbsent=$true;PreparingWorkspaceAbsent=$true;CursorAndScratchAbsent=$true;ReceiptEntryCount=$receiptCount;RunnerCount=$runnerCount;StatusHostProcessCount=$statusHostCount;RunOnceArmed=$runOnceArmed;StatusHostRegistered=$statusRegistered}|ConvertTo-Json -Compress
```

Require the ACK to match and every `*Absent` field to be `true`; transaction,
receipt, runner, and status-Host counts must
be `0`; RunOnce/status registration must be `false`. The accepted outcome/version
pairs are committed B2 and rolled-back B1 only. Any path type, reparse point,
filesystem enumeration, process query, or registry read error fails closed. Do
not delete transaction evidence manually. Run the designated Analyze and Options
smoke checks in the terminal product; record results only afterward. Do not accept
displayed success when versions, integrity,
ACK bytes, or lifecycle evidence disagree.

The pre-reload listener normally no longer exists after Extension reload. Remove
it only if its old DevTools context still exists; absence is expected and is not
terminal evidence:

```javascript
if(globalThis.dhUpdateWatch){chrome.storage.onChanged.removeListener(globalThis.dhUpdateWatch);delete globalThis.dhUpdateWatch}
```

Before any next-scenario baseline installer, the previous transaction must
already be safely settled and browser state must be durable idle with no URL,
regardless of disposition. An installer does not clear Chrome storage. If this
cannot be proved, stop; any recovery installer is a separate, explicitly approved
settlement operation, not a next-scenario baseline. After FAIL, qualification
remains stopped even if settlement succeeds; failed settlement permits no new
qualification start. Only a permitted transition may re-establish `plan-d-b1`.
Never manually clear a beta2 terminal or nonterminal state. Never delete
transaction files, journals, backups, RunOnce, or any other recovery state
manually. Apply **Private Distribution Closure** separately on every outcome.

## Scenario 1: Uninterrupted B1 To B2

1. Before the baseline installer, require previous-transaction safe settlement
   and durable browser idle/no URL regardless of disposition. Otherwise stop;
   recovery installation needs separate approval and guards, not a scenario reset.
   Then re-establish and verify `plan-d-b1` with the complete B1 installer.
2. Apply the **Common Qualification Checklist** and prepare the FAB-first
   **Visible Completion Observation Order**, without changing bubble preferences.
3. Inject B2 and register the sanitized listener using **Controlled Candidate
   Start**.
4. Start the update and do not close the browser, stop a process, click Retry,
   edit storage, or run an installer while it progresses.
5. Require terminal `complete/committed`, B2 Host and Extension versions,
   verified integrity, matching finalization ACK, the full allowed terminal
   residue checks, and the complete visible UI/state checks in
   **Terminal Verification And Cleanup**.
6. After the visible sequence, run the designated Analyze and Options checks.
   Only afterward record their PASS/FAIL and completed lifecycle results.

Any other terminal outcome fails this uninterrupted scenario. Preserve evidence
and stop qualification; settlement is separately approved and guarded, never
permission for another qualification start. Apply private distribution closure.

## Scenario 2: Interrupted Recovery

First require previous-transaction safe settlement and durable browser idle/no
URL before the baseline installer, regardless of disposition. Otherwise stop;
any recovery installer is separately approved guarded settlement, not a scenario
reset. Then re-establish and verify `plan-d-b1` with the complete B1 installer
and apply the common checklist. Use three PowerShell 7 windows for
the timeline watcher, optional process-start watcher, and one-shot interrupter.
Watcher output is observational only; the one-shot interrupter, zero-executor
checkpoint, and recovery witness are the acceptance evidence. For committed B2,
perform the FAB-first visible sequence before Options terminal inspection/smoke.
Record lifecycle evidence without changing the Status bubble preference.

### Read-Only Watchers

Start this timeline watcher in its own window before injecting B2. It emits only
authority, transaction, phase, and process IDs. Its process queries fail closed;
any matching-name DH process outside the exact installed Host/recovery paths
stops the watcher. Stop it with Ctrl+C only after terminal verification:

```powershell
$ErrorActionPreference='Stop';$root=Join-Path $env:LOCALAPPDATA 'DynamicsHelper';$active=Join-Path $root 'updates\active.json';$expectedHost=[IO.Path]::GetFullPath((Join-Path $root 'dh_native_host.exe'));$expectedRunner=[IO.Path]::GetFullPath((Join-Path $root 'updates\recovery\dh_update_runner.exe'));$last='';while($true){$tx='';$phase='';$authority=$false;if(Test-Path -LiteralPath $active -ErrorAction Stop){try{$a=[IO.File]::ReadAllText($active)|ConvertFrom-Json -ErrorAction Stop;$tx=[string]$a.transaction_id;if(($tx -match '^[0-9a-f]{32}$') -and ([string]$a.journal_path -ceq "transactions/$tx/journal.json")){$j=[IO.File]::ReadAllText((Join-Path $root "updates\transactions\$tx\journal.json"))|ConvertFrom-Json -ErrorAction Stop;$phase=[string]$j.phase;$authority=$true}else{throw 'Timeline authority is invalid'}}catch{throw 'Timeline authority or journal read failed'}};$all=@(Get-CimInstance Win32_Process -ErrorAction Stop);$main=@($all|Where-Object{$_.Name -ieq 'dh_native_host.exe'});$runner=@($all|Where-Object{$_.Name -ieq 'dh_update_runner.exe'});if(@($main|Where-Object{-not [string]::Equals([string]$_.ExecutablePath,$expectedHost,[StringComparison]::OrdinalIgnoreCase)}).Count -or @($runner|Where-Object{-not [string]::Equals([string]$_.ExecutablePath,$expectedRunner,[StringComparison]::OrdinalIgnoreCase)}).Count){throw 'Unexpected matching-name DH process path'};if(@($runner|Where-Object{([string]$_.CommandLine -notmatch '(?i)(?:^|\s)--complete-update(?:\s|$)') -and ([string]$_.CommandLine -notmatch '(?i)(?:^|\s)--recover-active(?:\s|$)')}).Count){throw 'Unexpected update runner mode'};$key=@($authority,$tx,$phase,($main.ProcessId -join ','),($runner.ProcessId -join ','))-join '|';if($key -cne $last){[pscustomobject]@{At=(Get-Date).ToUniversalTime().ToString('o');Authority=$authority;TransactionId=$tx;JournalPhase=$phase;MainHostPids=@($main.ProcessId);RunnerPids=@($runner.ProcessId)}|ConvertTo-Json -Compress;$last=$key};Start-Sleep -Milliseconds 25}
```

The process-start watcher is optional and requires permission to subscribe to
CIM events. Start it in a second window if permitted. It classifies process mode
but never prints a complete command line. If registration fails with `Access Denied`,
do not elevate or treat that as a gate failure; the mandatory recovery
witness independently polls and validates the runner. If started, stop it with
Ctrl+C only after terminal verification; its `finally` block unregisters the
event subscription:

```powershell
$root=Join-Path $env:LOCALAPPDATA 'DynamicsHelper';$expectedHost=[IO.Path]::GetFullPath((Join-Path $root 'dh_native_host.exe'));$expectedRunner=[IO.Path]::GetFullPath((Join-Path $root 'updates\recovery\dh_update_runner.exe'));$id='DH.Update.ProcessStart.'+[guid]::NewGuid().ToString('N');$q="SELECT * FROM Win32_ProcessStartTrace WHERE ProcessName='dh_native_host.exe' OR ProcessName='dh_update_runner.exe'";try{Register-CimIndicationEvent -Query $q -SourceIdentifier $id -ErrorAction Stop|Out-Null}catch{[pscustomobject]@{Event='optional-process-watcher-unavailable';Reason='cim-event-access-denied-or-unavailable'}|ConvertTo-Json -Compress;return};try{while($true){$e=Wait-Event -SourceIdentifier $id;$n=$e.SourceEventArgs.NewEvent;try{$p=Get-CimInstance Win32_Process -Filter "ProcessId=$($n.ProcessID)" -ErrorAction Stop}catch{throw 'Process watcher detail query failed'};if($null -eq $p){throw 'Process watcher could not resolve started process'};$expectedPath=if($n.ProcessName -ieq 'dh_update_runner.exe'){$expectedRunner}else{$expectedHost};if(-not [string]::Equals([string]$p.ExecutablePath,$expectedPath,[StringComparison]::OrdinalIgnoreCase)){throw 'Process watcher observed a matching name at an unexpected path'};$cmd=[string]$p.CommandLine;$mode=if($n.ProcessName -ieq 'dh_update_runner.exe'){if($cmd -match '(?i)--recover-active(?:\s|$)'){'recover-active'}elseif($cmd -match '(?i)--complete-update(?:\s|$)'){'complete-update'}else{throw 'Process watcher observed an unexpected runner mode'}}else{'main-host'};[pscustomobject]@{At=(Get-Date).ToUniversalTime().ToString('o');Name=[string]$n.ProcessName;Pid=[int]$n.ProcessID;ParentPid=[int]$n.ParentProcessID;Mode=$mode}|ConvertTo-Json -Compress;Remove-Event -EventIdentifier $e.EventIdentifier}}finally{Unregister-Event -SourceIdentifier $id -ErrorAction Stop}
```

### One-Shot Original-Runner Interruption

Run the next command in a third PowerShell 7 window before `DH_UPDATE_START`.
Task 5 must replace its historical A/B version predicates with exact B1
`2.0.76-beta.1` and B2 `2.0.76-beta.2` predicates and independently review the
entire block before execution. Until then, the command is a non-executable
template and must fail qualification review. Its first executable statement is
an unconditional throw, so it cannot consume or create stale globals or reach
process control before Task 5 replaces the complete block. The replacement may
then leave this same window open for the independently replaced zero-executor and
recovery-witness commands. The replacement waits at
most ten minutes. Before `active.json` exists it polls. After authority first
appears, any read, JSON, authority, or journal validation error fails
immediately. It observes but never kills `prepared`, and terminal-before-kill is
a missed interruption.

The accepted runner must be the sole exact recovery executable running the
canonical `--complete-update` command for the same browser-owned B1-to-B2
transaction and initiating-process identity, with `--recover-active` excluded.
RunOnce must already be armed. Task 5's replacement must open the RunOnce key
with terminating errors, find `DynamicsHelperUpdateRecovery` by case-insensitive
value-name equality, and require exactly one match. It must read that value
without expanding environment variables, require registry kind
`REG_EXPAND_SZ` (`ExpandString`), and require exact content
`"%LOCALAPPDATA%\DynamicsHelper\updates\recovery\dh_update_runner.exe" --recover-active`.
Use `GetValueKind` and `GetValue` with
`DoNotExpandEnvironmentNames`; ordinary `Get-ItemProperty` expansion is not
acceptable evidence.
Truthiness or non-empty text is not evidence; any name/type/value/read mismatch
fails before process control. The command then captures the transaction and
runner PID, kills only that PID, waits for exit, and revalidates the same
nonterminal post-activation authority.

Every later checkpoint that requires RunOnce to remain present, including the
zero-executor checkpoint and recovery witness, must repeat this exact
case-insensitive name, `REG_EXPAND_SZ`, unexpanded command, and fail-closed read
validation. It may not substitute truthiness or a non-empty-value check.

```powershell
throw 'TASK 5 MUST REPLACE THIS HISTORICAL A/B INTERRUPTION TEMPLATE BEFORE EXECUTION'
```

Only after Task 5 replaces all three pending interruption blocks may the
operator inject B2 and send `DH_UPDATE_START`. The replacement procedure owns
its exact browser/Host stop commands and zero-executor timing. No destructive
interruption command remains active in this pre-Task-5 runbook.

### Zero-Executor Checkpoint

This is independently non-executable until Task 5 replaces and reviews the
complete block. It does not rely on predecessor globals being absent or valid.
The replacement must consume the interrupter's captured transaction, PID, and
UTC kill time; start within ten seconds; prove a five-second zero-executor
interval; revalidate the same B1-to-B2 transaction; and apply the exact RunOnce
name/type/unexpanded-value contract above.

```powershell
throw 'TASK 5 MUST REPLACE THE COMPLETE ZERO-EXECUTOR CHECKPOINT BEFORE EXECUTION'
```

### Recovery-Runner Witness

This is independently non-executable until Task 5 replaces and reviews the
complete block. It does not rely on predecessor globals being absent or valid.
The replacement first emits `recovery-witness-armed`, waits at most five
minutes, and applies the exact RunOnce contract above. Only after its armed event
may the operator reopen the same browser profile. Keep Options non-foreground
before B2 terminal display and follow the FAB-first visible sequence. Do not edit
storage, delete `updates/**`, send a manual ping, or start an installer.

The command accepts exactly one runner at the exact recovery path whose command
is only the executable plus `--recover-active`. It rejects the killed PID and
revalidates the original transaction before and after observing the process. It
prints only safe mode/path/transaction/phase/PID fields, never the complete
command line.

```powershell
throw 'TASK 5 MUST REPLACE THE COMPLETE RECOVERY-RUNNER WITNESS BEFORE EXECUTION'
```

`recovery-runner-witnessed` is mandatory PASS evidence. If it is missed, still
verify the captured transaction's safe terminal disposition without inventing a
witness. Only committed B2 with all three witnesses and every common B2 gate can
PASS. Safe verified B1 rollback is inconclusive, not one-shot rollback evidence;
B1 lacks the new ACK protocol. For B2, finish the shared visible sequence before
Options-dependent checks and require terminal integrity, residue, and smoke PASS.
Apply the following table with FAIL precedence over any missing witness.

### Retry Rules

Read `errorCode` only from the safe projections above, never a full state object.
While `activating`, `polling`, `reload-pending`, or `ack-pending` has no error,
wait for normal status/recovery; do not click Retry or start another transaction.
Errors never authorize an automatic rerun or unreviewed cleanup.

| Allocated transaction outcome | Disposition |
| --- | --- |
| Exact original-runner interruption, zero-executor proof, recovery witness, committed B2, every B2 gate passing | PASS; stop attempts |
| Safe verified B1 rollback with all three witnesses | SAFE_ROLLBACK_INCONCLUSIVE; guarded cleanup before any remaining attempt |
| Safe verified B1/B2 terminal with any witness missing, and no failed required gate | INTERRUPTION_EVIDENCE_INCONCLUSIVE; version-specific settlement before any remaining attempt |
| Preparing/activating error, post-allocation abort, recovery-required, mixed/integrity/residue failure, or B2 lifecycle/smoke failure | FAIL; stop qualification, no next transaction; separately approved guarded settlement only |

Count an attempt when DH_UPDATE_START allocates and durably exposes its
transaction identity. Every allocated transaction counts, including aborts. Fix
pre-allocation setup failures before start; they do not count. At most three
allocated transactions, never a fourth. Every mutation still needs its own approval.

After three inconclusive attempts, use `BLOCKED: SAFE_ROLLBACK_INCONCLUSIVE` only
if all three dispositions exactly match; otherwise use
`BLOCKED: INTERRUPTION_EVIDENCE_INCONCLUSIVE`. FAIL always takes precedence,
stops qualification immediately, and cannot be relabeled inconclusive.

A safe committed B2 with missing witnesses must complete normal visible UI ACK
and reach durable public/stored idle/no URL before any B1 reinstall. A failed
lifecycle is FAIL, never an inconclusive retry opportunity. For safe B1 rollback,
the per-attempt guard below is mandatory and prepared/reviewed, but not authorized
or verified in the real environment. Before any
remaining attempt or scenario reset, previous-transaction safe settlement and
durable browser idle/no URL are unconditional, regardless of disposition. If
settlement fails or cannot be proved, no qualification start is permitted.

The proof commands validate `active.json` path/transaction authority before
using its journal; require browser initiator, prior `2.0.76-beta.1`, target
`2.0.76-beta.2`, and a non-empty initiating process in every accepted
post-activation state; validate the original runner's exact executable,
canonical same-transaction `--complete-update` invocation, initiating identity,
and PID; exclude `--recover-active`; never kill `prepared`; require RunOnce
before kill and at zero executor; preserve the transaction, killed PID, and UTC
kill time in the same shell; begin the zero-executor checkpoint within ten
seconds before its stability wait; and require a different-PID exact-path `--recover-active`
witness. They never print a complete command line, URL, prompt content, or local
storage object, and never write a journal, storage record, RunOnce value, or
`updates/**` file.

### Per-Attempt B1 Rollback Cleanup Contract

GUARD PREPARED; ISOLATED CHECKS PASSED; INDEPENDENT REVIEW PASSED;
NOT EXECUTION READY. Reported evidence: PS 54 passed, JS 75 passed; the earlier
18 deferred-case RED checks were resolved by the 30-second deadline fix.
Code locations are the `DH-B1-ROLLBACK:PS` and `DH-B1-ROLLBACK:JS` BEGIN/END
markers below. Tests remain Temp files, not repeatable repository tests or a CI
gate. Real Windows PowerShell 5.1, reparse/ACL behavior, and the OS Known Folder
query remain unverified. The short quiescent interval is a procedural TOCTOU
constraint, not atomicity. All six blocking throws and separate operation
approvals remain; real cleanup is PENDING. Any failure preserves evidence and
blocks baseline/retry; settlement never converts FAIL into permission to retry.

Private setup for a future approved attempt: retain the allocated `capturedTx`
and its committed private B2 candidate URL together outside Git/logs. In PS,
`$capturedTx` must be that exact captured string, not a value read from the ACK.
In the post-rollback B1 Options console, bind `capturedTx` to the same capture and
`privateB2Url` to that originally committed URL, not the current storage value.
Re-establish these from the private attempt record after reload; no guessed
identity, trimmed input, or replacement URL. HTTPS syntax cannot prove private
ownership: the reviewed distribution identity/ZIP hash must already match.
Immediately before each PS guard obtain the OS Known Folder without creating it
(isolated tests inject this value instead of invoking the OS):

```powershell
$DhB1KnownLocalAppData = [Environment]::GetFolderPath('LocalApplicationData', 'DoNotVerify')
```

<!-- DH-B1-ROLLBACK:PS:BEGIN -->
```powershell
& {
    $ErrorActionPreference = 'Stop'
    function Get-DhB1Entry($Path) {
        try { Get-Item -LiteralPath $Path -Force -ErrorAction Stop }
        catch [System.Management.Automation.ItemNotFoundException] { return $null }
    }
    function Assert-DhB1Path($Path, [bool]$Directory) {
        $item = Get-DhB1Entry $Path
        if ($null -eq $item -or $item.PSIsContainer -ne $Directory -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -or
            -not [string]::Equals($item.FullName, $Path, [StringComparison]::OrdinalIgnoreCase)) { throw 'unsafe path' }
    }
    try {
        if ($capturedTx -isnot [string] -or $capturedTx -cnotmatch '\A[0-9a-f]{32}\z') { throw 'invalid capture' }
        $local = $env:LOCALAPPDATA
        $known = $DhB1KnownLocalAppData
        foreach ($value in @($local, $known)) {
            if ($value -isnot [string] -or $value -cnotmatch '\A[A-Za-z]:\\' -or
                $value -cne [IO.Path]::GetFullPath($value) -or $value.EndsWith('\')) { throw 'invalid root' }
            foreach ($part in $value.Substring(3).Split('\')) {
                if (-not $part -or $part.EndsWith('.') -or $part.EndsWith(' ') -or $part.Contains(':')) { throw 'invalid root' }
            }
        }
        if (-not [string]::Equals($local, $known, [StringComparison]::OrdinalIgnoreCase)) { throw 'wrong root' }
        $root = [IO.Path]::Combine($known, 'DynamicsHelper')
        $updates = [IO.Path]::Combine($root, 'updates')
        for ($path = $updates; $path; $path = [IO.Path]::GetDirectoryName($path)) { Assert-DhB1Path $path $true }
        Assert-DhB1Path "$root\extension" $true
        foreach ($path in @("$root\installed-product.json", "$root\extension\manifest.json", "$updates\finalization-ack.json")) {
            Assert-DhB1Path $path $false
        }
        $product = [IO.File]::ReadAllText("$root\installed-product.json") | ConvertFrom-Json -ErrorAction Stop
        $manifest = [IO.File]::ReadAllText("$root\extension\manifest.json") | ConvertFrom-Json -ErrorAction Stop
        if ($product.package_version -cne '2.0.76-beta.1' -or $manifest.version_name -cne '2.0.76-beta.1' -or $manifest.version -cne '2.0.76') { throw 'wrong disk version' }
        $expected = [Text.UTF8Encoding]::new($false).GetBytes('{"outcome":"rolled-back","state":"finalized-awaiting-ack","terminal_version":{"fresh_install":false,"version":"2.0.76-beta.1"},"transactionId":"'+$capturedTx+'"}'+"`n")
        $actual = [IO.File]::ReadAllBytes("$updates\finalization-ack.json")
        if ($actual.Length -ne $expected.Length -or -not [System.Linq.Enumerable]::SequenceEqual[byte]($actual, $expected)) { throw 'wrong ACK bytes' }
        foreach ($name in @('active.json','finalization-cursor.json','.finalization-cursor.json.tmp','.finalization-ack.json.tmp')) {
            if ($null -ne (Get-DhB1Entry "$updates\$name")) { throw 'terminal residue' }
        }
        foreach ($name in @('transactions','receipts')) {
            $path = "$updates\$name"
            if ($null -ne (Get-DhB1Entry $path)) {
                Assert-DhB1Path $path $true
                if (@([IO.Directory]::EnumerateFileSystemEntries($path)).Count -ne 0) { throw 'namespace not empty' }
            }
        }
        $runOnce = Get-DhB1Entry 'Registry::HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\RunOnce'
        if ($null -ne $runOnce -and @($runOnce.GetValueNames() | Where-Object { $_ -ieq 'DynamicsHelperUpdateRecovery' }).Count -ne 0) { throw 'RunOnce exists' }
        foreach ($vendor in @('Google\Chrome','Microsoft\Edge')) {
            if ($null -ne (Get-DhB1Entry "Registry::HKEY_CURRENT_USER\Software\$vendor\NativeMessagingHosts\com.dynamics.helper.update_status")) { throw 'status registration exists' }
        }
        $all = @(Get-CimInstance Win32_Process -ErrorAction Stop)
        foreach ($name in @('dh_native_host.exe','dh_update_runner.exe','dh_update_status_host.exe')) {
            $expectedPath = if ($name -eq 'dh_native_host.exe') { "$root\$name" } else { "$updates\recovery\$name" }
            $matches = @($all | Where-Object { $_.Name -ieq $name })
            foreach ($process in $matches) {
                if (-not [string]::Equals($process.ExecutablePath, $expectedPath, [StringComparison]::OrdinalIgnoreCase)) { throw 'foreign or unknown process path' }
            }
            if ($name -ne 'dh_native_host.exe' -and $matches.Count -ne 0) { throw 'executor remains' }
        }
        [pscustomobject]@{ guard='PASS'; transactionId=$capturedTx; outcome='rolled-back'; version='2.0.76-beta.1' }
    } catch { throw 'DH_B1_ROLLBACK_PS_GUARD_FAILED' }
}
```
<!-- DH-B1-ROLLBACK:PS:END -->

Require this invocation's PASS and exact captured ID, not a cached Boolean or
the generic terminal guard. PS and JS cannot be atomic: execute PS then the whole
JS fence consecutively in the same short quiescent interval, with no other
mutation, installer/update, writer/path replacement, or Worker lifecycle action.
Any context, transaction, or Worker change/uncertainty invalidates both checks:
stop and revalidate private capture plus the entire PS/JS sequence. There is no
nonce or persisted permission token. Do not display exceptions, `$Error`, URLs,
storage/response objects, or private setup values; only fixed codes/projections.
JS freezes the capture/URL at entry and has one non-renewable 30-second deadline.
PS completion to JS entry must still be consecutive and fresh; this deadline is
not evidence of PS freshness or an unchanged Worker. On STOP, abandon the pending
evaluation/context; never change bindings to resume it or retry automatically.

<!-- DH-B1-ROLLBACK:JS:BEGIN -->
```javascript
await (async () => {
  const fail = () => { throw new Error('DH_B1_ROLLBACK_JS_GUARD_FAILED'); };
  const tx = capturedTx, candidateUrl = privateB2Url, deadline = Date.now() + 30000;
  const check = () => {
    if (Date.now() >= deadline || capturedTx !== tx || privateB2Url !== candidateUrl) fail();
  };
  const exact = (value, keys, array = false) => {
    if (value === null || typeof value !== 'object' || Array.isArray(value) !== array || Object.getPrototypeOf(value) !== (array ? Array.prototype : Object.prototype)) fail();
    const d = Object.getOwnPropertyDescriptors(value);
    if (Reflect.ownKeys(d).length !== keys.length || keys.some(k => !Object.hasOwn(d, k) || !Object.hasOwn(d[k], 'value') || d[k].enumerable !== (k !== 'length'))) fail();
    return Object.fromEntries(keys.map(k => [k, d[k].value]));
  };
  const call = async fn => {
    check();
    let timer;
    try {
      const value = await new Promise((resolve, reject) => {
        const bad = () => reject(new Error('DH_B1_ROLLBACK_JS_GUARD_FAILED'));
        timer = setTimeout(bad, Math.max(0, deadline - Date.now()));
        try { fn(value => { try { check(); if (chrome.runtime.lastError) fail(); resolve(value); } catch { bad(); } }); }
        catch { bad(); }
      });
      check();
      return value;
    } finally { clearTimeout(timer); }
  };
  try {
    if (typeof tx !== 'string' || !/^[0-9a-f]{32}$/.test(tx) || tx.length !== 32) fail();
    if (typeof candidateUrl !== 'string' || !/^https:\/\/[^/?#@]+\//.test(candidateUrl) || /[\s\\#]/.test(candidateUrl)) fail();
    const url = new URL(candidateUrl);
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password || url.hash || !url.pathname.endsWith('.zip')) fail();
    const manifest = chrome.runtime.getManifest();
    const md = Object.getOwnPropertyDescriptors(manifest);
    if (md.version?.value !== '2.0.76' || md.version_name?.value !== '2.0.76-beta.1') fail();
    const cap = exact(await call(cb => chrome.runtime.sendMessage({type:'NATIVE_MSG',payload:{action:'get_capabilities'}}, cb)), ['status','data']);
    check();
    const data = exact(cap.data, ['host_version','capabilities']);
    const capabilities = exact(data.capabilities, ['0','1','length'], true);
    if (cap.status !== 'success' || data.host_version !== '2.0.76-beta.1' || capabilities.length !== 2 || capabilities[0] !== 'prompt-scope-v1' || capabilities[1] !== 'transactional-update-v1') fail();
    const v = exact(await call(cb => chrome.runtime.sendMessage({type:'NATIVE_MSG',payload:{action:'verify_installation'}}, cb)), ['status','data']);
    check();
    const verified = exact(v.data, ['mode','integrity','host_version','extension_version']);
    if (v.status !== 'success' || verified.mode !== 'packaged' || verified.integrity !== 'verified' || verified.host_version !== '2.0.76-beta.1' || verified.extension_version !== '2.0.76-beta.1') fail();
    const stored = exact(await call(cb => chrome.storage.local.get(['dh_update_state','pending_update'], cb)), ['dh_update_state']);
    check();
    const state = exact(stored.dh_update_state, ['kind','update','outcome']);
    const update = exact(state.update, ['version','url','isPrerelease']);
    if (state.kind !== 'complete' || state.outcome !== 'rolled-back' || update.version !== '2.0.76-beta.2' || update.isPrerelease !== true || update.url !== candidateUrl) fail();
    check();
    await call(cb => chrome.storage.local.remove('dh_update_state', cb));
    check();
    return {guard:'PASS',transactionId:tx,outcome:'rolled-back',version:'2.0.76-beta.1',integrity:'packaged/verified'};
  } catch { fail(); }
})()
```
<!-- DH-B1-ROLLBACK:JS:END -->

Only a successful remove permits the existing normal Service Worker **Stop** /
Options wake sequence and exact idle inspection in **One-Time Private B1
Completion Cleanup** (the fence beginning `const raw=await ...DH_UPDATE_GET_STATE`).
Reuse only that post-remove inspection, never its historical PS/cleanup guard.
Require public idle, stored idle or absent, no `pending_update`, and no URL before
any separately permitted baseline. No manual ACK, Reload, Unregister, bulk clear,
or recovery-file deletion. Failed remove means STOP, not a success/retry claim.
Timeout/callback errors cannot cancel a remove already submitted to Chrome or
prove it had zero effects. Mock failed-remove zero effects are not real storage
atomicity evidence; preserve uncertainty and STOP for independent inspection.
The historical committed-B1 guard remains unchanged and cannot be parameter-swapped
for this rolled-back attempt; neither guard substitutes for the other.

## Scenario 3: Matching-Installer Repair

GUARD PREPARED; ISOLATED CHECKS PASSED; INDEPENDENT STATIC REVIEW APPROVED.
Reported evidence: 27 mock tests passed. Code locations are the `DH-S3:HELPERS`,
`DH-S3:CAPTURE`, `DH-S3:CREATE`, `DH-S3:ABSENCE`, and `DH-S3:COMPARE` BEGIN/END
markers below. Tests remain Temp files, not repeatable repository tests or a CI
gate. Real Windows PowerShell 5.1, reparse/ACL behavior, and the OS Known Folder
query remain unverified; real repair is PENDING, not qualification PASS.
The global NOT EXECUTION READY status, all six blocking throws, existing
installer blocks, settlement gates, and separate operation approval remain
unchanged. Do not execute this scenario on a real installation. This banner
applies to every environment, helper, capture, sentinel, comparison, and cleanup
fence below; no assertion or local test result makes them execution-ready.

The fixed sentinel is `_internal/dh-cloud-pc-sentinel.txt`: require safe plain
parents and confirmed prior absence, never overwrite an existing entry. Validate
protected `config.json`, `copilot-instructions.md`, and `user_prompt.md`, including
absence, before and after repair; reject unsafe roots/files and unreadable paths.
Fingerprints stay private and in memory only. Guard preparation review passed;
real-environment verification and separate operation approval remain future
readiness gates. These are point-in-time
path checks, not handle-relative race-proof filesystem operations: require no
concurrent writer/path replacement during each guarded step. A race, failure, or
uncertain state stops the scenario; do not retry creation, delete residue, or
continue with an old baseline. Never display `$Error`, caught exceptions, paths,
snapshot objects, hashes, or contents; only fixed failure codes and counts are
safe to record. A failed write may leave a sentinel; preserve it for review.

In the dedicated window, a future approved execution would first capture the OS
Known Folder value without creating it, then load the three helpers. Never
override this value with a guessed path or an operator assertion. Isolated tests
inject this environment value and `LOCALAPPDATA` with disposable fixture paths
BEFORE loading the exact helper/snippet fences; they do not execute this OS lookup.

```powershell
$DhS3KnownLocalAppData = [Environment]::GetFolderPath('LocalApplicationData', 'DoNotVerify')
```

<!-- DH-S3:HELPERS:BEGIN -->
```powershell
function Get-DhS3Entry {
    param([string]$Path)
    try {
        Get-Item -LiteralPath $Path -Force -ErrorAction Stop
    } catch [System.Management.Automation.ItemNotFoundException] {
        # Only a definite missing entry is absence; permission/I/O errors stop.
        return $null
    } catch {
        throw 'DH_S3_PATH_UNREADABLE'
    }
}

function Get-DhS3Root {
    param([switch]$Internal)
    try {
        $local = $env:LOCALAPPDATA
        $known = $DhS3KnownLocalAppData
        foreach ($value in @($local, $known)) {
            if ([string]::IsNullOrWhiteSpace($value) -or $value -cnotmatch '^[A-Za-z]:\\') {
                throw 'invalid'
            }
            if ($value -cne [IO.Path]::GetFullPath($value) -or $value.EndsWith('\')) {
                throw 'invalid'
            }
            foreach ($part in $value.Substring(3).Split('\')) {
                if (-not $part -or $part.EndsWith('.') -or $part.EndsWith(' ') -or $part.Contains(':')) {
                    throw 'invalid'
                }
            }
        }
        if (-not [string]::Equals($local, $known, [StringComparison]::OrdinalIgnoreCase)) {
            throw 'invalid'
        }
        $root = [IO.Path]::Combine($known, 'DynamicsHelper')
        $target = if ($Internal) { [IO.Path]::Combine($root, '_internal') } else { $root }
        $chain = [Collections.Generic.List[string]]::new()
        for ($path = $target; $path; $path = [IO.Path]::GetDirectoryName($path)) {
            $chain.Insert(0, $path)
        }
    } catch {
        throw 'DH_S3_ROOT_INVALID'
    }
    # Check from drive root downward, before any child lookup can follow a link.
    foreach ($path in $chain) {
        $item = Get-DhS3Entry -Path $path
        if ($null -eq $item) { throw 'DH_S3_PARENT_MISSING' }
        if (-not $item.PSIsContainer -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
            throw 'DH_S3_PARENT_UNSAFE'
        }
        if (-not [string]::Equals($item.FullName, $path, [StringComparison]::OrdinalIgnoreCase)) {
            throw 'DH_S3_PARENT_UNSAFE'
        }
    }
    return $root
}

function Get-DhS3Snapshot {
    $root = Get-DhS3Root
    $files = @{}
    foreach ($name in @('config.json', 'copilot-instructions.md', 'user_prompt.md')) {
        $path = [IO.Path]::Combine($root, $name)
        $item = Get-DhS3Entry -Path $path
        $hash = $null
        if ($null -ne $item) {
            if ($item -isnot [IO.FileInfo] -or $item.PSIsContainer -or `
                ($item.Attributes -band ([IO.FileAttributes]::ReparsePoint -bor [IO.FileAttributes]::Device)) -or `
                -not [string]::Equals($item.FullName, $path, [StringComparison]::OrdinalIgnoreCase)) {
                throw 'DH_S3_FILE_UNSAFE'
            }
            try {
                $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $path -ErrorAction Stop).Hash
                if ($hash -notmatch '^[A-Fa-f0-9]{64}$') { throw 'invalid' }
            } catch {
                throw 'DH_S3_HASH_UNREADABLE'
            }
        }
        $files[$name] = $hash
    }
    # Exactly three root-only keys; null explicitly records absence.
    return @{ Root = $root; Files = $files }
}
```
<!-- DH-S3:HELPERS:END -->

1. Before the baseline installer, require previous-transaction safe settlement
   and durable browser idle/no URL regardless of disposition. Otherwise stop;
   a recovery installer is separately approved guarded settlement, not a scenario
   reset. Then re-establish and verify `plan-d-b1` with the complete B1 installer.
2. Before the first B2 installation, run the next command in a dedicated
   PowerShell window and keep that window open through the second B2 installation.
   It stores presence and SHA-256 for exactly the three protected root filenames
   in memory, bound to the verified root. It clears any stale snapshot first and
   publishes the complete local result only after every check/read succeeds.
   A capture failure leaves no usable baseline and forbids continuing. Output
   contains only the event and present-file count, never hashes or paths.

<!-- DH-S3:CAPTURE:BEGIN -->
```powershell
$global:DhUserOwnedBefore = $null
& {
    $snapshot = Get-DhS3Snapshot
    $count = @($snapshot.Files.Values | Where-Object { $null -ne $_ }).Count
    $global:DhUserOwnedBefore = $snapshot
    [pscustomobject]@{ Event = 'user-owned-baseline-captured'; FileCount = $count } | ConvertTo-Json -Compress
}
```
<!-- DH-S3:CAPTURE:END -->

3. Close all browser windows, run both installer guards, and use the complete B2
   installer command to establish known-good B2; require exit `0` and
   `SUCCESS: Update Complete!`.
4. Restart the browser on a FAB-bearing page first. If terminal completion
   exists, finish **Visible Completion Observation Order** before any Options
   inspection/smoke. Then require B2 versions, capability, verified integrity,
   Analyze PASS, Options PASS, and durable public/stored idle/no URL.
5. Close all browser windows and create this harmless unexpected sentinel under
   the installed `_internal` tree. Require `True`:

<!-- DH-S3:CREATE:BEGIN -->
```powershell
& {
    $root = Get-DhS3Root -Internal
    $sentinel = [IO.Path]::Combine($root, '_internal', 'dh-cloud-pc-sentinel.txt')
    if ($null -ne (Get-DhS3Entry -Path $sentinel)) { throw 'DH_S3_SENTINEL_EXISTS' }
    try {
        $stream = [IO.File]::Open($sentinel, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
        try {
            $bytes = [Text.Encoding]::ASCII.GetBytes('remove me')
            $stream.Write($bytes, 0, $bytes.Length)
        } finally {
            $stream.Dispose()
        }
    } catch {
        throw 'DH_S3_SENTINEL_CREATE_FAILED'
    }
    $null = Get-DhS3Root -Internal
    $item = Get-DhS3Entry -Path $sentinel
    if ($item -isnot [IO.FileInfo] -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
        throw 'DH_S3_SENTINEL_UNSAFE'
    }
    $true
}
```
<!-- DH-S3:CREATE:END -->

6. Run both installer guards, then run the exact same complete B2 installer
   command again and require exit `0` plus `SUCCESS: Update Complete!`.
7. Revalidate the complete parent chain, including an existing plain `_internal`,
   then verify definite sentinel absence. Require `False`; a missing/unsafe parent
   or unreadable entry is failure, not evidence of removal:

<!-- DH-S3:ABSENCE:BEGIN -->
```powershell
& {
    $root = Get-DhS3Root -Internal
    $sentinel = [IO.Path]::Combine($root, '_internal', 'dh-cloud-pc-sentinel.txt')
    if ($null -ne (Get-DhS3Entry -Path $sentinel)) { throw 'DH_S3_SENTINEL_REMAINS' }
    $false
}
```
<!-- DH-S3:ABSENCE:END -->

8. In the same PowerShell window that captured the map, strictly compare the
   post-repair set and hashes. Any added, removed, or changed user-owned file
   fails. Repeat safe-parent and sentinel-absence checks in this comparison so
   skipping step 7 cannot produce preservation evidence. Use the same captured
   snapshot, never recapture after repair. Output contains only event and count:

<!-- DH-S3:COMPARE:BEGIN -->
```powershell
& {
    $before = $global:DhUserOwnedBefore
    if ($before -isnot [hashtable] -or $before.Files -isnot [hashtable] -or $before.Files.Count -ne 3) {
        throw 'DH_S3_BASELINE_MISSING'
    }
    $root = Get-DhS3Root -Internal
    if (-not [string]::Equals($root, $before.Root, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'DH_S3_BASELINE_ROOT_CHANGED'
    }
    $sentinel = [IO.Path]::Combine($root, '_internal', 'dh-cloud-pc-sentinel.txt')
    if ($null -ne (Get-DhS3Entry -Path $sentinel)) { throw 'DH_S3_SENTINEL_REMAINS' }
    $after = Get-DhS3Snapshot
    foreach ($name in @('config.json', 'copilot-instructions.md', 'user_prompt.md')) {
        if (-not $before.Files.ContainsKey($name)) { throw 'DH_S3_BASELINE_MISSING' }
        if (($null -eq $before.Files[$name]) -ne ($null -eq $after.Files[$name])) {
            throw 'DH_S3_FILE_SET_CHANGED'
        }
        if ($before.Files[$name] -cne $after.Files[$name]) { throw 'DH_S3_FILE_BYTES_CHANGED' }
    }
    $count = @($after.Files.Values | Where-Object { $null -ne $_ }).Count
    [pscustomobject]@{ Event = 'user-owned-files-preserved'; FileCount = $count } | ConvertTo-Json -Compress
}
```
<!-- DH-S3:COMPARE:END -->

9. Restart the browser on a FAB-bearing page first. If completion exists, perform
   **Visible Completion Observation Order** before Options inspection/smoke.
   Then require B2 Host/Extension versions, packaged verified integrity, Analyze
   PASS, and Options PASS. Inspect only this safe storage projection:

```javascript
const {dh_update_state:s}=await chrome.storage.local.get('dh_update_state'); ({kind:s?.kind,hasUpdateUrl:typeof s?.update?.url==='string',transactionId:s?.transactionId,targetVersion:s?.targetVersion,outcome:s?.outcome,code:s?.code,errorCode:s?.errorCode})
```

Do not clear `complete` manually. If present, require the B2 terminal display,
foreground continuous-visible eight-second UI ACK, authoritative disappearance,
and refresh checks from
**Terminal Verification And Cleanup**. The safe local projection must then show
`hasUpdateUrl: false`, no `errorCode`, and `kind` either `idle` or absent. The
safe `DH_UPDATE_GET_STATE` projection must report `handled: true`, `kind: 'idle'`,
and no `errorCode`. Any other state fails the scenario without manual cleanup.
If no terminal completion notice is produced, record exactly
`N/A - no terminal completion notice` in the ledger's **Completion lifecycle**
field; do not use N/A for an update scenario or for a repair that did produce
`complete`.

Scenario 3 passes only as `installer-repaired B2`, with the sentinel removed,
the full B2 product verified, identical user-owned file set and bytes, safe idle
coordinator state with no retained URL, Analyze PASS, and Options PASS. It
intentionally does not corrupt executable bytes or construct an unrecoverable
mixed installation. Remove the in-memory map only after recording the result:

```powershell
Remove-Variable -Scope Global -Name DhUserOwnedBefore -ErrorAction SilentlyContinue
```

## Private Distribution Closure

On PASS, FAIL, abort, or BLOCKED, the distributing operator must verify privately
recorded ownership before revoking this run's access and removing only its
private object/container as applicable. Never delete shared resources or revoke
unrelated access. Cleanup failure or uncertain ownership means cleanup BLOCKED
and no operational closure; do not broaden retries. Distribution cleanup is
separate from product settlement and must preserve journals, backups,
finalization evidence, and browser state.

Record ownership privately at creation, never in the ledger. Record only
sanitized ownership-check, run-owned access-revocation, object/container cleanup,
and separate product-settlement results. Recovery installer or guarded browser
cleanup still needs separate approval; distribution cleanup never permits it.

## Environment Handoff

Future handoff only, outside this documentation task and not an instruction to
operate now. No release or migration is automatic, even after qualification PASS.

The old `v2.0.75-beta.1` workstation remains unchanged as the fallback. It is
not a Plan D test environment: do not click Update there and do not install A,
B1, or B2 there.

After all automated gates and all three cloud-PC scenarios pass, keep the cloud
PC on the exact qualified B2. Before B2 is published, obtain fresh confirmation
and either disable **Receive beta updates** in the old workstation's Options
page or disable its Dynamics Helper extension. Obtain separate explicit
approval before any tag, push, or publication, and publish only the
already-qualified B2 ZIP without rebuilding it. Verify the published asset hash
equals the qualified B2 hash. Qualification approval, publication approval, and
workload-handoff approval remain separate decisions.

Before marking any of the first three old-workstation handoff rows `PASS`, read
the displayed Extension version and require exactly `v2.0.75-beta.1`, then
confirm the explicitly selected control is disabled: either **Receive beta
updates** is off or the Dynamics Helper Extension itself is disabled. Do not
send an update request. A version mismatch or enabled selected control remains
`FAIL`/blocked.

Migrate the real workload only after the qualified cloud PC remains healthy on
exact B2 with matching versions, verified integrity, Analyze PASS, and Options
PASS. Keep the old beta1 workstation frozen as fallback rather than operating it
as a second active Plan D environment.
