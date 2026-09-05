# Plan D Pragmatic Cloud PC Runbook

## Safety Contract

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
  all five Automated Gates in the result ledger are `PASS`.
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

Task 4 changes documentation only. Task 5 fills the exact B2 artifact path,
commit, and hash, independently reviews this runbook, obtains the required
approval, and only then may execute any cloud-PC, DevTools, storage, process,
installer, or private-distribution step.

B2 must be the sole object in a private test-only HTTPS container. Use one
short-lived, read-only URL whose path ends in `.zip`. Treat the cloud PC as
credential-bearing while that URL is active.

## Qualification Entry Gate

Before connecting to or changing the cloud PC, run this read-only check from the
product worktree. It requires complete B1/B2 source-commit and ZIP identities and
all five Automated Gates to be exact current-B2 `PASS`. Artifact result and gate
evidence must be non-empty; `PENDING`, `Not recorded`, and `Not run` fail closed
wherever they occur in those fields.

The fenced command immediately below is historical A/B form and is deliberately
fail-closed against the revised ledger. Do not execute it. Task 5 replaces that
whole command with the exact reviewed B1/B2 entry gate after B2 identity exists.

```powershell
throw 'HISTORICAL A/B ENTRY GATE: Task 5 must replace this block with the reviewed B1/B2 gate before execution'
```

Task 5 must replace the B2 source/hash placeholders and refresh all five gate
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
(Get-FileHash -Algorithm SHA256 -LiteralPath "C:\DH-CloudPC\DynamicsHelper_v2.0.76-beta.2.zip").Hash.ToLowerInvariant()
```

The B2 path and hash remain placeholders until Task 5 builds the artifact and
independently reviews this runbook before execution. Do not replace either ZIP
after hashing. B2 is qualified once; rebuilding it invalidates all B2 evidence.

## One-Time Private B1 Completion Cleanup

This is a one-time test-environment cleanup for the unpublished private B1
state, not a product migration or compatibility path. Task 5 may execute it only
after independent review and authorization, before any B2 transaction. Any
mismatch stops the procedure and preserves all evidence. Do not run an update,
installer, storage mutation, or process action between these guards.

First perform a read-only exact B1 disk, finalization-ACK, and residue guard for
known committed transaction `b1c2ad5ad2c4aeb59765302402450840`:

```powershell
$ErrorActionPreference='Stop';$expectedTx='b1c2ad5ad2c4aeb59765302402450840';$expectedVersion='2.0.76-beta.1';$root=Join-Path $env:LOCALAPPDATA 'DynamicsHelper';$updates=Join-Path $root 'updates';$installed=Join-Path $root 'installed-product.json';$extensionManifest=Join-Path $root 'extension\manifest.json';$ackPath=Join-Path $updates 'finalization-ack.json';foreach($path in @($installed,$extensionManifest,$ackPath)){if(-not(Test-Path -LiteralPath $path -PathType Leaf)){throw "Required terminal file is missing: $([IO.Path]::GetFileName($path))"}};$product=[IO.File]::ReadAllText($installed)|ConvertFrom-Json -ErrorAction Stop;$manifest=[IO.File]::ReadAllText($extensionManifest)|ConvertFrom-Json -ErrorAction Stop;$extensionVersion=if($manifest.version_name){[string]$manifest.version_name}else{[string]$manifest.version};if(([string]$product.package_version -cne $expectedVersion) -or ($extensionVersion -cne $expectedVersion) -or ([string]$manifest.version -cne '2.0.76')){throw 'Installed disk versions are not exact private beta1'};$expectedAckBytes=[Text.UTF8Encoding]::new($false).GetBytes('{"outcome":"committed","state":"finalized-awaiting-ack","terminal_version":{"fresh_install":false,"version":"'+$expectedVersion+'"},"transactionId":"'+$expectedTx+'"}' + "`n");$actualAckBytes=[IO.File]::ReadAllBytes($ackPath);if($actualAckBytes.Length -ne $expectedAckBytes.Length -or -not [System.Linq.Enumerable]::SequenceEqual[byte]($actualAckBytes,$expectedAckBytes)){throw 'Finalization acknowledgment does not exactly match beta1 transaction/outcome/version'};$activeAbsent=-not(Test-Path -LiteralPath (Join-Path $updates 'active.json'));$workspaceAbsent=-not(Test-Path -LiteralPath (Join-Path $updates "transactions\$expectedTx"));$cursorAbsent=-not(Test-Path -LiteralPath (Join-Path $updates 'finalization-cursor.json'));$receiptAbsent=-not(Test-Path -LiteralPath (Join-Path $updates "receipts\$expectedTx.json"));$receipts=Join-Path $updates 'receipts';$receiptCount=if(Test-Path -LiteralPath $receipts -PathType Container){@([IO.Directory]::EnumerateFileSystemEntries($receipts)).Count}else{0};$runnerCount=@(Get-Process -Name dh_update_runner -ErrorAction SilentlyContinue).Count;$runOncePath='Registry::HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\RunOnce';$runOnce=if(Test-Path -LiteralPath $runOncePath){[bool](Get-ItemProperty -LiteralPath $runOncePath -Name 'DynamicsHelperUpdateRecovery' -ErrorAction SilentlyContinue).DynamicsHelperUpdateRecovery}else{$false};$statusName='com.dynamics.helper.update_status';$statusRegistered=[bool]((Get-ItemPropertyValue -LiteralPath "Registry::HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts\$statusName" -Name '(default)' -ErrorAction SilentlyContinue) -or (Get-ItemPropertyValue -LiteralPath "Registry::HKEY_CURRENT_USER\Software\Microsoft\Edge\NativeMessagingHosts\$statusName" -Name '(default)' -ErrorAction SilentlyContinue));if(-not $activeAbsent -or -not $workspaceAbsent -or -not $cursorAbsent -or -not $receiptAbsent -or $receiptCount -ne 0 -or $runnerCount -ne 0 -or $runOnce -or $statusRegistered){throw 'B1 terminal residue guard failed; preserve evidence'};[pscustomobject]@{HostVersion=[string]$product.package_version;ExtensionVersion=$extensionVersion;AckTransactionId=$expectedTx;AckOutcome='committed';ActiveAbsent=$activeAbsent;WorkspaceAbsent=$workspaceAbsent;CursorAbsent=$cursorAbsent;ReceiptAbsent=$receiptAbsent;ReceiptCount=$receiptCount;RunnerCount=$runnerCount;RunOnceArmed=$runOnce;StatusHostRegistered=$statusRegistered}|ConvertTo-Json -Compress
```

Require exact B1 Host/Extension versions and matching committed ACK fields;
every `*Absent` value is `true`, both counts are `0`, and RunOnce/status-Host
flags are `false`. Then run the additional read-only path, scratch, process, and
zero-residue guards:

```powershell
$ErrorActionPreference='Stop';$root=Join-Path $env:LOCALAPPDATA 'DynamicsHelper';$updates=Join-Path $root 'updates';$marker='C:\DH-CloudPC\PLAN_D_EMPTY_CLOUD_PC.marker';$expectedMarkerBytes=[Text.UTF8Encoding]::new($false).GetBytes('PLAN_D_EFFECTIVELY_EMPTY_CLOUD_PC_V1');if(-not(Test-Path -LiteralPath $marker -PathType Leaf)){throw 'Empty-cloud-PC marker is missing'};$actualMarkerBytes=[IO.File]::ReadAllBytes($marker);if($actualMarkerBytes.Length -ne $expectedMarkerBytes.Length -or -not [System.Linq.Enumerable]::SequenceEqual[byte]($actualMarkerBytes,$expectedMarkerBytes)){throw 'Empty-cloud-PC marker is invalid'};foreach($path in @($root,$updates)){if(-not(Test-Path -LiteralPath $path -PathType Container) -or ((Get-Item -LiteralPath $path -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)){throw 'Installed/update root is missing or unsafe'}};foreach($path in @((Join-Path $root 'installed-product.json'),(Join-Path $root 'extension\manifest.json'),(Join-Path $updates 'finalization-ack.json'))){if(-not(Test-Path -LiteralPath $path -PathType Leaf) -or ((Get-Item -LiteralPath $path -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)){throw 'Required terminal file is missing or unsafe'}};$scratch=@((Join-Path $updates '.finalization-cursor.json.tmp'),(Join-Path $updates '.finalization-ack.json.tmp'),(Join-Path $updates 'receipts\.b1c2ad5ad2c4aeb59765302402450840.json.tmp'));$statusCount=@(Get-Process -Name dh_update_status_host -ErrorAction SilentlyContinue).Count;if($scratch|Where-Object{Test-Path -LiteralPath $_}){throw 'Finalization scratch evidence remains'};if($statusCount -ne 0){throw 'Status Host process remains'};[pscustomobject]@{MarkerMatches=$true;PlainRoots=$true;PlainTerminalFiles=$true;FinalizationScratchAbsent=$true;StatusHostProcessCount=$statusCount}|ConvertTo-Json -Compress
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

Before every B1 or B2 installer invocation, close all Chrome and Edge windows and
run this guard. It must produce no error.

```powershell
$expectedMarkerBytes=[Text.UTF8Encoding]::new($false).GetBytes('PLAN_D_EFFECTIVELY_EMPTY_CLOUD_PC_V1');$marker='C:\DH-CloudPC\PLAN_D_EMPTY_CLOUD_PC.marker';if(-not(Test-Path -LiteralPath $marker -PathType Leaf)){throw 'Empty-cloud-PC marker is missing or invalid'};$actualMarkerBytes=[IO.File]::ReadAllBytes($marker);if($actualMarkerBytes.Length -ne $expectedMarkerBytes.Length -or -not [System.Linq.Enumerable]::SequenceEqual[byte]($actualMarkerBytes,$expectedMarkerBytes)){throw 'Empty-cloud-PC marker is missing or invalid'};$b=@(Get-Process -Name chrome,msedge -ErrorAction SilentlyContinue);if($b.Count){throw 'Close all Chrome and Edge windows before running the installer'}
```

Then require all main Hosts and update runners to have exited. This prevents the
installer's compatibility stop path from selecting any process by name.

```powershell
$expectedMarkerBytes=[Text.UTF8Encoding]::new($false).GetBytes('PLAN_D_EFFECTIVELY_EMPTY_CLOUD_PC_V1');$marker='C:\DH-CloudPC\PLAN_D_EMPTY_CLOUD_PC.marker';if(-not(Test-Path -LiteralPath $marker -PathType Leaf)){throw 'Empty-cloud-PC marker is missing or invalid'};$actualMarkerBytes=[IO.File]::ReadAllBytes($marker);if($actualMarkerBytes.Length -ne $expectedMarkerBytes.Length -or -not [System.Linq.Enumerable]::SequenceEqual[byte]($actualMarkerBytes,$expectedMarkerBytes)){throw 'Empty-cloud-PC marker is missing or invalid'};$hosts=@(Get-CimInstance Win32_Process -Filter "Name='dh_native_host.exe'" -ErrorAction Stop);$runners=@(Get-CimInstance Win32_Process -Filter "Name='dh_update_runner.exe'" -ErrorAction Stop);if($hosts.Count -or $runners.Count){throw 'Main Host or update runner is still active; do not invoke the installer'}
```

Extract B1 into a fresh local directory and invoke its complete installer. Task
5 independently reviews the exact command before execution:

```powershell
$expectedMarkerBytes=[Text.UTF8Encoding]::new($false).GetBytes('PLAN_D_EFFECTIVELY_EMPTY_CLOUD_PC_V1');$marker='C:\DH-CloudPC\PLAN_D_EMPTY_CLOUD_PC.marker';if(-not(Test-Path -LiteralPath $marker -PathType Leaf)){throw 'Empty-cloud-PC marker is missing or invalid'};$actualMarkerBytes=[IO.File]::ReadAllBytes($marker);if($actualMarkerBytes.Length -ne $expectedMarkerBytes.Length -or -not [System.Linq.Enumerable]::SequenceEqual[byte]($actualMarkerBytes,$expectedMarkerBytes)){throw 'Empty-cloud-PC marker is missing or invalid'};$ErrorActionPreference='Stop';$browsers=@(Get-Process -Name chrome,msedge -ErrorAction SilentlyContinue);$hosts=@(Get-CimInstance Win32_Process -Filter "Name='dh_native_host.exe'" -ErrorAction Stop);$runners=@(Get-CimInstance Win32_Process -Filter "Name='dh_update_runner.exe'" -ErrorAction Stop);if($browsers.Count -or $hosts.Count -or $runners.Count){throw 'Browser, main Host, or update runner is active; do not invoke the installer'};$zip='C:\DH-CloudPC\DynamicsHelper_v2.0.76-beta.1.zip';$extract='C:\DH-CloudPC\B1-extracted';$expectedMarker=if(Test-Path -LiteralPath "$env:LOCALAPPDATA\DynamicsHelper\manifest.json" -PathType Leaf){'SUCCESS: Update Complete!'}else{'SUCCESS: Installation Complete!'};if(Test-Path -LiteralPath $extract){Remove-Item -LiteralPath $extract -Recurse -Force -ErrorAction Stop};Expand-Archive -LiteralPath $zip -DestinationPath $extract -ErrorAction Stop;$installer=Join-Path $extract 'installer_core.ps1';if(-not(Test-Path -LiteralPath $installer -PathType Leaf)){throw 'B1 installer_core.ps1 is missing'};$installOutput=@();& pwsh -NoProfile -ExecutionPolicy Bypass -File $installer 2>&1|Tee-Object -Variable installOutput;$installExit=$LASTEXITCODE;if($installExit -ne 0){throw "B1 installer failed with exit code $installExit"};$plainOutput=@($installOutput|ForEach-Object{([string]$_) -replace '\x1b\[[0-?]*[ -/]*[@-~]',''});if($plainOutput -cnotcontains $expectedMarker){throw "B1 installer success marker missing: $expectedMarker"}
```

Extract B2 into a fresh local directory when Scenario 3 or matching-installer
recovery calls for B2. Task 5 must replace/review this artifact-specific command
after B2 exists and before execution:

```powershell
$expectedMarkerBytes=[Text.UTF8Encoding]::new($false).GetBytes('PLAN_D_EFFECTIVELY_EMPTY_CLOUD_PC_V1');$marker='C:\DH-CloudPC\PLAN_D_EMPTY_CLOUD_PC.marker';if(-not(Test-Path -LiteralPath $marker -PathType Leaf)){throw 'Empty-cloud-PC marker is missing or invalid'};$actualMarkerBytes=[IO.File]::ReadAllBytes($marker);if($actualMarkerBytes.Length -ne $expectedMarkerBytes.Length -or -not [System.Linq.Enumerable]::SequenceEqual[byte]($actualMarkerBytes,$expectedMarkerBytes)){throw 'Empty-cloud-PC marker is missing or invalid'};$ErrorActionPreference='Stop';$browsers=@(Get-Process -Name chrome,msedge -ErrorAction SilentlyContinue);$hosts=@(Get-CimInstance Win32_Process -Filter "Name='dh_native_host.exe'" -ErrorAction Stop);$runners=@(Get-CimInstance Win32_Process -Filter "Name='dh_update_runner.exe'" -ErrorAction Stop);if($browsers.Count -or $hosts.Count -or $runners.Count){throw 'Browser, main Host, or update runner is active; do not invoke the installer'};$zip='C:\DH-CloudPC\DynamicsHelper_v2.0.76-beta.2.zip';$extract='C:\DH-CloudPC\B2-extracted';$expectedMarker=if(Test-Path -LiteralPath "$env:LOCALAPPDATA\DynamicsHelper\manifest.json" -PathType Leaf){'SUCCESS: Update Complete!'}else{'SUCCESS: Installation Complete!'};if(Test-Path -LiteralPath $extract){Remove-Item -LiteralPath $extract -Recurse -Force -ErrorAction Stop};Expand-Archive -LiteralPath $zip -DestinationPath $extract -ErrorAction Stop;$installer=Join-Path $extract 'installer_core.ps1';if(-not(Test-Path -LiteralPath $installer -PathType Leaf)){throw 'B2 installer_core.ps1 is missing'};$installOutput=@();& pwsh -NoProfile -ExecutionPolicy Bypass -File $installer 2>&1|Tee-Object -Variable installOutput;$installExit=$LASTEXITCODE;if($installExit -ne 0){throw "B2 installer failed with exit code $installExit"};$plainOutput=@($installOutput|ForEach-Object{([string]$_) -replace '\x1b\[[0-?]*[ -/]*[@-~]',''});if($plainOutput -cnotcontains $expectedMarker){throw "B2 installer success marker missing: $expectedMarker"}
```

The direct installer is interactive; press Enter only when its final prompt
appears. `Tee-Object` retains stdout while displaying it. Success requires both
native exit code `0` and the exact marker selected before invocation:
`SUCCESS: Installation Complete!` for a fresh installation or
`SUCCESS: Update Complete!` for an existing installation. A nonzero exit or
missing marker throws. Never invoke `install.bat`, and never copy installer
stdout into the ledger.

## Establish `plan-d-b1`

Run the complete B1 installer before each scenario, including Scenario 3. Then
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
$name='com.dynamics.helper.native'; [pscustomobject]@{Chrome=(Get-ItemPropertyValue -LiteralPath "Registry::HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts\$name" -Name '(default)' -ErrorAction SilentlyContinue);Edge=(Get-ItemPropertyValue -LiteralPath "Registry::HKEY_CURRENT_USER\Software\Microsoft\Edge\NativeMessagingHosts\$name" -Name '(default)' -ErrorAction SilentlyContinue)}
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

Before beta2 qualification, the only permitted old-shape B1 terminal cleanup is
the exact guarded procedure in **One-Time Private B1 Completion Cleanup**. Never
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

Run the disk/process baseline check:

```powershell
$root=Join-Path $env:LOCALAPPDATA 'DynamicsHelper';[pscustomobject]@{ActiveAuthority=(Test-Path -LiteralPath (Join-Path $root 'updates\active.json'));RunnerCount=@(Get-Process -Name dh_update_runner -ErrorAction SilentlyContinue).Count;FinalizationCursor=(Test-Path -LiteralPath (Join-Path $root 'updates\finalization-cursor.json'));RunOnceArmed=[bool](Get-ItemProperty -LiteralPath 'Registry::HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\RunOnce' -Name 'DynamicsHelperUpdateRecovery' -ErrorAction SilentlyContinue).DynamicsHelperUpdateRecovery}|ConvertTo-Json -Compress
```

Require `ActiveAuthority`, `FinalizationCursor`, and `RunOnceArmed` to be
`false`, and `RunnerCount` to be `0`. Finally, run Analyze only against the
designated non-customer test case and change then restore one harmless Options
preference.
Record only PASS/FAIL for each check. The baseline is valid only after all
version, registration, capability, integrity, coordinator, disk/process,
Analyze, and Options checks pass.

If `plan-d-b1` cannot be established safely, preserve all update evidence. Run
the exact B2 complete installer first to settle the target; if that fails, run
the exact B1 complete installer to settle the prior version. Rebuild the still
empty cloud PC only if both matching complete installers fail. Do not improvise
file copies or delete `updates/**`.

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

Register this sanitized listener before starting. It never prints `update.url`:

```javascript
globalThis.dhUpdateWatch=(changes,area)=>{const s=changes.dh_update_state?.newValue;if(area==='local'&&s)console.log({kind:s.kind,transactionId:s.transactionId,targetVersion:s.targetVersion,outcome:s.outcome,code:s.code,errorCode:s.errorCode})}; chrome.storage.onChanged.addListener(globalThis.dhUpdateWatch)
```

Start through the payload-free production coordinator request:

```javascript
void chrome.runtime.sendMessage({type:'DH_UPDATE_START'}).then(r=>{const s=r?.state;console.log({handled:r?.handled,kind:s?.kind,transactionId:s?.transactionId,targetVersion:s?.targetVersion,outcome:s?.outcome,code:s?.code,errorCode:s?.errorCode})}).catch(()=>console.error('Update start request disconnected'))
```

After any reload, reopen Options DevTools and inspect only safe fields:

```javascript
const {dh_update_state:s}=await chrome.storage.local.get('dh_update_state'); ({kind:s?.kind,transactionId:s?.transactionId,targetVersion:s?.targetVersion,outcome:s?.outcome,code:s?.code,errorCode:s?.errorCode,version:s?.update?.version})
```

Copy only `kind`, `transactionId`, `targetVersion`, and `outcome` into the
ledger. Never copy `update.url`, a complete state object, console history, or a
full log.

## Terminal Verification And Cleanup

At terminal `complete`, run the installed-version command, capabilities check,
integrity check, safe after-reload state projection (including `errorCode`), and
disk/process baseline check again. Require Host and
Extension to agree with the terminal outcome: B2 `2.0.76-beta.2` for
`committed`, or B1 `2.0.76-beta.1` for `rolled-back`. Integrity must be
`packaged/verified`, `updates\active.json` and the finalization cursor must be
absent, no runner may remain, and RunOnce must be unarmed.

Keep a FAB-bearing page and Options open for the completion lifecycle check.
Before 8000 milliseconds of mounted time, require the Options terminal banner
and FAB completion bubble to remain visible. After the first matching
`DH_UPDATE_ACK_COMPLETE` is durably applied and its authoritative
`DH_UPDATE_STATE` broadcast arrives, require both to disappear globally. Refresh
FAB and Options and require the terminal result to remain absent. Do not infer
the transition from the ACK response and do not edit storage.

For committed completion, the public state must be `idle` with no retained
candidate URL. For rolled-back completion, it must be `available` for exact B2,
with the ordinary **Retry** action and no replayed rollback notice. Multiple
views may race; duplicate ACKs must not change the authoritative result.

After final acknowledgment, verify that the captured transaction workspace is
gone:

```powershell
$tx = Read-Host 'Paste the captured 32-hex transaction ID';if($tx -cnotmatch '^[0-9a-f]{32}$'){throw 'Invalid transaction ID'};$root=Join-Path $env:LOCALAPPDATA 'DynamicsHelper';[pscustomobject]@{ActiveAuthority=(Test-Path -LiteralPath (Join-Path $root 'updates\active.json'));TransactionWorkspacePresent=(Test-Path -LiteralPath (Join-Path $root "updates\transactions\$tx"));FinalizationCursor=(Test-Path -LiteralPath (Join-Path $root 'updates\finalization-cursor.json'))}|ConvertTo-Json -Compress
```

Require all three values to be `false`. Run the designated Analyze smoke and
change then restore one harmless Options preference in the terminal product;
record PASS/FAIL only. Do not accept a displayed success when versions or
integrity disagree.

After the safe terminal fields have been recorded, remove the listener if its
DevTools context still exists:

```javascript
if(globalThis.dhUpdateWatch){chrome.storage.onChanged.removeListener(globalThis.dhUpdateWatch);delete globalThis.dhUpdateWatch}
```

Before the next scenario, re-establish `plan-d-b1` with the full B1 installer.
Never manually clear a beta2 terminal or nonterminal state. Never delete
transaction files, journals, backups, RunOnce, or any other recovery state
manually. At the end of qualification, revoke the short-lived private access and
remove the private object; do not record either value or associated logs.

## Scenario 1: Uninterrupted B1 To B2

1. Re-establish and verify `plan-d-b1` with the complete B1 installer.
2. Inject B2 and register the sanitized listener using **Controlled Candidate
   Start**.
3. Start the update and do not close the browser, stop a process, click Retry,
   edit storage, or run an installer while it progresses.
4. Require terminal `complete/committed`, B2 Host and Extension versions,
   verified integrity, absent active authority/workspace/finalization cursor,
   zero runners, unarmed RunOnce, and the complete one-shot UI/state checks in
   **Terminal Verification And Cleanup**.
5. Run the designated Analyze and Options checks and record only their
   PASS/FAIL results.

Any other terminal outcome fails this uninterrupted scenario. Preserve evidence
and follow the matching-installer recovery order before trying to re-establish
B1.

## Scenario 2: Interrupted Recovery

Re-establish and verify `plan-d-b1` with the complete B1 installer. Use three
PowerShell 7 windows for the timeline watcher, optional process-start watcher,
and one-shot interrupter. Watcher output is observational only; the one-shot
interrupter, zero-executor checkpoint, and recovery witness are the acceptance
evidence.

### Read-Only Watchers

Start this timeline watcher in its own window before injecting B2. It emits only
authority, transaction, phase, and process IDs. Stop it with Ctrl+C only after
terminal verification:

```powershell
$root=Join-Path $env:LOCALAPPDATA 'DynamicsHelper';$active=Join-Path $root 'updates\active.json';$last='';while($true){$tx='';$phase='';$authority=$false;if(Test-Path -LiteralPath $active){try{$a=[IO.File]::ReadAllText($active)|ConvertFrom-Json;$tx=[string]$a.transaction_id;if(($tx -match '^[0-9a-f]{32}$') -and ([string]$a.journal_path -ceq "transactions/$tx/journal.json")){$j=[IO.File]::ReadAllText((Join-Path $root "updates\transactions\$tx\journal.json"))|ConvertFrom-Json;$phase=[string]$j.phase;$authority=$true}}catch{$tx='';$phase='';$authority=$false}};$main=@(Get-Process -Name dh_native_host -ErrorAction SilentlyContinue);$runner=@(Get-Process -Name dh_update_runner -ErrorAction SilentlyContinue);$key=@($authority,$tx,$phase,($main.Id -join ','),($runner.Id -join ','))-join '|';if($key -cne $last){[pscustomobject]@{At=(Get-Date).ToUniversalTime().ToString('o');Authority=$authority;TransactionId=$tx;JournalPhase=$phase;MainHostPids=@($main.Id);RunnerPids=@($runner.Id)}|ConvertTo-Json -Compress;$last=$key};Start-Sleep -Milliseconds 25}
```

The process-start watcher is optional and requires permission to subscribe to
CIM events. Start it in a second window if permitted. It classifies process mode
but never prints a complete command line. If registration fails with `Access Denied`,
do not elevate or treat that as a gate failure; the mandatory recovery
witness independently polls and validates the runner. If started, stop it with
Ctrl+C only after terminal verification; its `finally` block unregisters the
event subscription:

```powershell
$id='DH.Update.ProcessStart.'+[guid]::NewGuid().ToString('N');$q="SELECT * FROM Win32_ProcessStartTrace WHERE ProcessName='dh_native_host.exe' OR ProcessName='dh_update_runner.exe'";try{Register-CimIndicationEvent -Query $q -SourceIdentifier $id -ErrorAction Stop|Out-Null}catch{[pscustomobject]@{Event='optional-process-watcher-unavailable';Reason='cim-event-access-denied-or-unavailable'}|ConvertTo-Json -Compress;return};try{while($true){$e=Wait-Event -SourceIdentifier $id;$n=$e.SourceEventArgs.NewEvent;$p=Get-CimInstance Win32_Process -Filter "ProcessId=$($n.ProcessID)" -ErrorAction SilentlyContinue;$cmd=[string]$p.CommandLine;$mode=if($n.ProcessName -ieq 'dh_update_runner.exe'){if($cmd -match '(?i)--recover-active(?:\s|$)'){'recover-active'}elseif($cmd -match '(?i)--complete-update(?:\s|$)'){'complete-update'}else{'unknown-runner'}}else{'main-host'};[pscustomobject]@{At=(Get-Date).ToUniversalTime().ToString('o');Name=[string]$n.ProcessName;Pid=[int]$n.ProcessID;ParentPid=[int]$n.ParentProcessID;Mode=$mode}|ConvertTo-Json -Compress;Remove-Event -EventIdentifier $e.EventIdentifier}}finally{Unregister-Event -SourceIdentifier $id -ErrorAction SilentlyContinue}
```

### One-Shot Original-Runner Interruption

Run the next command in a third PowerShell 7 window before `DH_UPDATE_START`.
Task 5 must replace its historical A/B version predicates with exact B1
`2.0.76-beta.1` and B2 `2.0.76-beta.2` predicates and independently review the
entire block before execution. Until then, the command is a non-executable
template and must fail qualification review. The first statement intentionally
throws so it cannot reach process control before Task 5 replaces the block.
Leave this same window open for the zero-executor and recovery-witness commands;
they consume its global transaction and PID variables. The command waits at
most ten minutes. Before `active.json` exists it polls. After authority first
appears, any read, JSON, authority, or journal validation error fails
immediately. It observes but never kills `prepared`, and terminal-before-kill is
a missed interruption.

The accepted runner must be the sole exact recovery executable running the
canonical `--complete-update` command for the same browser-owned B1-to-B2
transaction and initiating-process identity, with `--recover-active` excluded.
RunOnce must already be armed. The command captures the transaction and runner
PID, kills only that PID, waits for exit, and revalidates the same nonterminal
post-activation authority.

```powershell
throw 'TASK 5 MUST REPLACE THIS HISTORICAL A/B INTERRUPTION TEMPLATE BEFORE EXECUTION';$expectedMarkerBytes=[Text.UTF8Encoding]::new($false).GetBytes('PLAN_D_EFFECTIVELY_EMPTY_CLOUD_PC_V1');$marker='C:\DH-CloudPC\PLAN_D_EMPTY_CLOUD_PC.marker';if(-not(Test-Path -LiteralPath $marker -PathType Leaf)){throw 'Empty-cloud-PC marker is missing or invalid'};$actualMarkerBytes=[IO.File]::ReadAllBytes($marker);if($actualMarkerBytes.Length -ne $expectedMarkerBytes.Length -or -not [System.Linq.Enumerable]::SequenceEqual[byte]($actualMarkerBytes,$expectedMarkerBytes)){throw 'Empty-cloud-PC marker is missing or invalid'};$ErrorActionPreference='Stop';Remove-Variable -Scope Global -Name DhExpectedTransactionId,DhKilledRunnerPid,DhRecoveryRunnerPid,DhKilledAtUtc -ErrorAction SilentlyContinue;$root=Join-Path $env:LOCALAPPDATA 'DynamicsHelper';$active=Join-Path $root 'updates\active.json';$runnerPath=[IO.Path]::GetFullPath((Join-Path $root 'updates\recovery\dh_update_runner.exe'));$runOnceKey='Registry::HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\RunOnce';$post=@('waiting-for-host-exit','host-backed-up','host-installed','extension-backed-up','extension-installed','metadata-installed','probing','rolling-back');$terminal=@('committed','rolled-back','recovery-required');if(Test-Path -LiteralPath $active){throw 'Baseline invalid: active.json already exists'};if(@(Get-CimInstance Win32_Process -Filter "Name='dh_update_runner.exe'" -ErrorAction Stop).Count){throw 'Baseline invalid: update runner already exists'};$authoritySeen=$false;$interrupted=$false;$deadline=[DateTime]::UtcNow.AddMinutes(10);while([DateTime]::UtcNow -lt $deadline){if(-not(Test-Path -LiteralPath $active)){if($authoritySeen){throw 'Active authority disappeared before interruption'};Start-Sleep -Milliseconds 25;continue};$authoritySeen=$true;try{$a=[IO.File]::ReadAllText($active)|ConvertFrom-Json -ErrorAction Stop}catch{throw 'Malformed or unreadable active authority'};if(($a.transaction_id -isnot [string]) -or ($a.transaction_id -cnotmatch '^[0-9a-f]{32}$')){throw 'Active transaction ID is not lowercase 32-hex'};$tx=$a.transaction_id;$expectedJournal="transactions/$tx/journal.json";if(($a.journal_path -isnot [string]) -or ($a.journal_path -cne $expectedJournal)){throw 'Active journal authority mismatch'};$journalPath=Join-Path $root "updates\transactions\$tx\journal.json";try{$j=[IO.File]::ReadAllText($journalPath)|ConvertFrom-Json -ErrorAction Stop}catch{throw 'Malformed or unreadable transaction journal'};if(($j.transaction_id -isnot [string]) -or ($j.transaction_id -cne $tx) -or ($j.initiator -isnot [string]) -or ($j.initiator -cne 'browser') -or ($j.prior_version -isnot [string]) -or ($j.prior_version -cne '2.0.74-beta.4') -or ($j.target_version -isnot [string]) -or ($j.target_version -cne '2.0.76-beta.1') -or ($j.phase -isnot [string])){throw 'Transaction journal authority mismatch'};$phase=$j.phase;if($phase -ceq 'prepared'){Start-Sleep -Milliseconds 25;continue};if($terminal -ccontains $phase){throw "Interruption missed: transaction reached terminal phase $phase"};if($post -cnotcontains $phase){throw "Unexpected nonterminal journal phase: $phase"};$ip=$j.initiating_process;if(($null -eq $ip) -or ($ip.pid -isnot [long]) -or ($ip.pid -le 0) -or ($ip.creation_token -isnot [string]) -or ($ip.creation_token -cnotmatch '^win-create-time-[1-9][0-9]*$')){throw 'Post-activation initiating process is missing or invalid'};try{$runOnce=[string](Get-ItemPropertyValue -LiteralPath $runOnceKey -Name 'DynamicsHelperUpdateRecovery' -ErrorAction Stop)}catch{throw 'RunOnce recovery is not armed before interruption'};if([string]::IsNullOrWhiteSpace($runOnce)){throw 'RunOnce recovery is not armed before interruption'};$allRunners=@(Get-CimInstance Win32_Process -Filter "Name='dh_update_runner.exe'" -ErrorAction Stop);if($allRunners.Count -ne 1){throw "Expected exactly one update runner; found $($allRunners.Count)"};$runner=$allRunners[0];$cmd=[string]$runner.CommandLine;$completePattern='(?i)^\s*(?:"[^"]+"|\S+)\s+--complete-update\s+'+[regex]::Escape($tx)+'\s+'+[regex]::Escape([string]$ip.pid)+'\s+'+[regex]::Escape($ip.creation_token)+'\s*$';$recoverPattern='(?i)(?:^|\s)--recover-active(?:\s|$)';if(-not [string]::Equals([string]$runner.ExecutablePath,$runnerPath,[StringComparison]::OrdinalIgnoreCase)){throw 'Original runner executable path mismatch'};if([string]::IsNullOrWhiteSpace($cmd) -or ($cmd -notmatch $completePattern) -or ($cmd -match $recoverPattern)){throw 'Original runner invocation is not the expected complete-update command'};$global:DhExpectedTransactionId=$tx;$global:DhKilledRunnerPid=[int]$runner.ProcessId;$phaseAtKill=$phase;$runnerProcess=Get-Process -Id $global:DhKilledRunnerPid -ErrorAction Stop;try{Stop-Process -Id $global:DhKilledRunnerPid -Force -ErrorAction Stop;if(-not $runnerProcess.WaitForExit(10000)){throw 'Killed runner did not exit within ten seconds'}}finally{$runnerProcess.Dispose()};$global:DhKilledAtUtc=[DateTime]::UtcNow;if(-not(Test-Path -LiteralPath $active)){throw 'Active authority disappeared after runner exit'};try{$a2=[IO.File]::ReadAllText($active)|ConvertFrom-Json -ErrorAction Stop}catch{throw 'Malformed or unreadable active authority after runner exit'};if(($a2.transaction_id -isnot [string]) -or ($a2.transaction_id -cne $global:DhExpectedTransactionId) -or ($a2.journal_path -isnot [string]) -or ($a2.journal_path -cne "transactions/$($global:DhExpectedTransactionId)/journal.json")){throw 'Active authority changed after runner exit'};try{$j2=[IO.File]::ReadAllText($journalPath)|ConvertFrom-Json -ErrorAction Stop}catch{throw 'Malformed or unreadable transaction journal after runner exit'};$ip2=$j2.initiating_process;if(($j2.transaction_id -isnot [string]) -or ($j2.transaction_id -cne $global:DhExpectedTransactionId) -or ($j2.initiator -isnot [string]) -or ($j2.initiator -cne 'browser') -or ($j2.prior_version -isnot [string]) -or ($j2.prior_version -cne '2.0.74-beta.4') -or ($j2.target_version -isnot [string]) -or ($j2.target_version -cne '2.0.76-beta.1') -or ($null -eq $ip2) -or ($ip2.pid -isnot [long]) -or ($ip2.pid -ne $ip.pid) -or ($ip2.creation_token -isnot [string]) -or ($ip2.creation_token -cne $ip.creation_token) -or ($j2.phase -isnot [string]) -or ($post -cnotcontains $j2.phase)){throw 'Journal is not the same post-activation nonterminal transaction after runner exit'};[pscustomobject]@{Event='original-runner-killed';TransactionId=$global:DhExpectedTransactionId;PhaseAtKill=$phaseAtKill;PhaseAfterKill=$j2.phase;RunnerPid=$global:DhKilledRunnerPid;RunOnceArmedBeforeKill=$true}|ConvertTo-Json -Compress;$interrupted=$true;break};if(-not $interrupted){throw 'Interrupter timed out after ten minutes without a valid post-activation runner'}
```

With the interrupter waiting, inject B2, register the sanitized listener, and
send `DH_UPDATE_START` from Options DevTools. After the command prints
`original-runner-killed`, close every browser window and start the zero-executor
checkpoint before ten seconds have elapsed from the captured kill time. Run the
two stop commands immediately, then the checkpoint. If its pre-wait deadline
guard fails, this attempt is not recovery evidence; re-establish B1 and rerun.
Each command independently verifies the cloud-PC marker. The Host command
selects only CIM records whose `ExecutablePath` exactly
matches `%LOCALAPPDATA%\DynamicsHelper\dh_native_host.exe` and stops those PIDs:

```powershell
$expectedMarkerBytes=[Text.UTF8Encoding]::new($false).GetBytes('PLAN_D_EFFECTIVELY_EMPTY_CLOUD_PC_V1');$marker='C:\DH-CloudPC\PLAN_D_EMPTY_CLOUD_PC.marker';if(-not(Test-Path -LiteralPath $marker -PathType Leaf)){throw 'Empty-cloud-PC marker is missing or invalid'};$actualMarkerBytes=[IO.File]::ReadAllBytes($marker);if($actualMarkerBytes.Length -ne $expectedMarkerBytes.Length -or -not [System.Linq.Enumerable]::SequenceEqual[byte]($actualMarkerBytes,$expectedMarkerBytes)){throw 'Empty-cloud-PC marker is missing or invalid'};Get-Process -Name chrome,msedge -ErrorAction SilentlyContinue|Stop-Process -Force -ErrorAction Stop
```

```powershell
$expectedMarkerBytes=[Text.UTF8Encoding]::new($false).GetBytes('PLAN_D_EFFECTIVELY_EMPTY_CLOUD_PC_V1');$marker='C:\DH-CloudPC\PLAN_D_EMPTY_CLOUD_PC.marker';if(-not(Test-Path -LiteralPath $marker -PathType Leaf)){throw 'Empty-cloud-PC marker is missing or invalid'};$actualMarkerBytes=[IO.File]::ReadAllBytes($marker);if($actualMarkerBytes.Length -ne $expectedMarkerBytes.Length -or -not [System.Linq.Enumerable]::SequenceEqual[byte]($actualMarkerBytes,$expectedMarkerBytes)){throw 'Empty-cloud-PC marker is missing or invalid'};$expected=[IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'DynamicsHelper\dh_native_host.exe'));$all=@(Get-CimInstance Win32_Process -Filter "Name='dh_native_host.exe'" -ErrorAction Stop);$targets=@($all|Where-Object{[string]::Equals([string]$_.ExecutablePath,$expected,[StringComparison]::OrdinalIgnoreCase)});$foreign=@($all|Where-Object{-not [string]::Equals([string]$_.ExecutablePath,$expected,[StringComparison]::OrdinalIgnoreCase)});if($foreign.Count){throw 'Refusing to stop a main Host outside the exact installed path'};foreach($target in $targets){Stop-Process -Id ([int]$target.ProcessId) -Force -ErrorAction Stop}
```

### Zero-Executor Checkpoint

In the same PowerShell window as the one-shot interrupter, run this command. It
is likewise a Task 5 template until every embedded prior/target assertion is
independently reviewed for B1/B2. Do not execute this block before Task 5 replaces
it; the required interruption variables cannot exist because the preceding
template fails closed.
consumes, and never replaces, `$global:DhExpectedTransactionId` and
`$global:DhKilledRunnerPid`. Before any five-second stability wait, it validates
`$global:DhKilledAtUtc` and proves the checkpoint began no more than ten seconds
after the runner kill. It then waits five seconds, proves the killed PID and all
browser/Host/runner executors are absent, strictly revalidates the same
post-activation transaction, requires RunOnce to remain armed, and reports only
safe elapsed time.

```powershell
$ErrorActionPreference='Stop';$expectedMarkerBytes=[Text.UTF8Encoding]::new($false).GetBytes('PLAN_D_EFFECTIVELY_EMPTY_CLOUD_PC_V1');$marker='C:\DH-CloudPC\PLAN_D_EMPTY_CLOUD_PC.marker';if(-not(Test-Path -LiteralPath $marker -PathType Leaf)){throw 'Empty-cloud-PC marker is missing or invalid'};$actualMarkerBytes=[IO.File]::ReadAllBytes($marker);if($actualMarkerBytes.Length -ne $expectedMarkerBytes.Length -or -not [System.Linq.Enumerable]::SequenceEqual[byte]($actualMarkerBytes,$expectedMarkerBytes)){throw 'Empty-cloud-PC marker is missing or invalid'};if(($global:DhExpectedTransactionId -isnot [string]) -or ($global:DhExpectedTransactionId -cnotmatch '^[0-9a-f]{32}$')){throw 'Missing captured transaction ID; rerun the interrupter'};if(($global:DhKilledRunnerPid -isnot [int]) -or ($global:DhKilledRunnerPid -le 0)){throw 'Missing captured killed-runner PID; rerun the interrupter'};if(($global:DhKilledAtUtc -isnot [DateTime]) -or $global:DhKilledAtUtc.Kind -ne [DateTimeKind]::Utc){throw 'Missing captured UTC kill time; rerun the interrupter'};$elapsedBeforeWait=([DateTime]::UtcNow-$global:DhKilledAtUtc).TotalSeconds;if($elapsedBeforeWait -lt 0 -or $elapsedBeforeWait -gt 10){throw 'Zero-executor checkpoint did not begin within ten seconds of the runner kill'};$expectedTx=$global:DhExpectedTransactionId;$killedPid=$global:DhKilledRunnerPid;Start-Sleep -Seconds 5;$root=Join-Path $env:LOCALAPPDATA 'DynamicsHelper';$active=Join-Path $root 'updates\active.json';$b=@(Get-Process -Name chrome,msedge -ErrorAction SilentlyContinue);$expectedHostPath=[IO.Path]::GetFullPath((Join-Path $root 'dh_native_host.exe'));$allHosts=@(Get-CimInstance Win32_Process -Filter "Name='dh_native_host.exe'" -ErrorAction Stop);$m=@($allHosts|Where-Object{[string]::Equals([string]$_.ExecutablePath,$expectedHostPath,[StringComparison]::OrdinalIgnoreCase)});$foreignHosts=@($allHosts|Where-Object{-not [string]::Equals([string]$_.ExecutablePath,$expectedHostPath,[StringComparison]::OrdinalIgnoreCase)});if($foreignHosts.Count){throw 'Unexpected main Host path at zero-executor checkpoint'};$r=@(Get-CimInstance Win32_Process -Filter "Name='dh_update_runner.exe'" -ErrorAction Stop);$killedPidRecords=@(Get-CimInstance Win32_Process -Filter "ProcessId=$killedPid" -ErrorAction Stop);if($b.Count -or $m.Count -or $r.Count -or $killedPidRecords.Count){throw 'Zero-executor checkpoint failed: browser, main Host, runner, or killed PID is still alive'};if(-not(Test-Path -LiteralPath $active)){throw 'Active authority disappeared before recovery witness'};try{$a=[IO.File]::ReadAllText($active)|ConvertFrom-Json -ErrorAction Stop}catch{throw 'Malformed or unreadable active authority at zero-executor checkpoint'};if(($a.transaction_id -isnot [string]) -or ($a.transaction_id -cne $expectedTx) -or ($a.journal_path -isnot [string]) -or ($a.journal_path -cne "transactions/$expectedTx/journal.json")){throw 'Zero-executor active authority does not match the interrupted transaction'};$journalPath=Join-Path $root "updates\transactions\$expectedTx\journal.json";try{$j=[IO.File]::ReadAllText($journalPath)|ConvertFrom-Json -ErrorAction Stop}catch{throw 'Malformed or unreadable transaction journal at zero-executor checkpoint'};$post=@('waiting-for-host-exit','host-backed-up','host-installed','extension-backed-up','extension-installed','metadata-installed','probing','rolling-back');$checkpointIp=$j.initiating_process;if(($j.transaction_id -isnot [string]) -or ($j.transaction_id -cne $expectedTx) -or ($j.initiator -isnot [string]) -or ($j.initiator -cne 'browser') -or ($j.prior_version -isnot [string]) -or ($j.prior_version -cne '2.0.74-beta.4') -or ($j.target_version -isnot [string]) -or ($j.target_version -cne '2.0.76-beta.1') -or ($null -eq $checkpointIp) -or ($checkpointIp.pid -isnot [long]) -or ($checkpointIp.pid -le 0) -or ($checkpointIp.creation_token -isnot [string]) -or ($checkpointIp.creation_token -cnotmatch '^win-create-time-[1-9][0-9]*$') -or ($j.phase -isnot [string]) -or ($post -cnotcontains $j.phase)){throw 'Zero-executor journal is not the interrupted post-activation transaction'};try{$runOnce=[string](Get-ItemPropertyValue -LiteralPath 'Registry::HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\RunOnce' -Name 'DynamicsHelperUpdateRecovery' -ErrorAction Stop)}catch{throw 'RunOnce recovery is not armed at zero-executor checkpoint'};if([string]::IsNullOrWhiteSpace($runOnce)){throw 'RunOnce recovery is not armed at zero-executor checkpoint'};$elapsedSeconds=[Math]::Round(([DateTime]::UtcNow-$global:DhKilledAtUtc).TotalSeconds,3);[pscustomobject]@{Event='zero-executor-checkpoint';TransactionId=$expectedTx;JournalPhase=$j.phase;KilledRunnerPid=$killedPid;ElapsedSeconds=$elapsedSeconds;NoBrowser=$true;NoMainHost=$true;NoRunner=$true;RunOnceArmed=$true}|ConvertTo-Json -Compress
```

### Recovery-Runner Witness

Before reopening the browser, run this command in that same PowerShell window.
It is likewise a Task 5 template until every embedded prior/target assertion is
independently reviewed for B1/B2. Do not execute this block before Task 5 replaces
it; the required interruption variables cannot exist because the preceding
template fails closed.
It first emits `recovery-witness-armed` and then waits at most five minutes.
Immediately after the armed event appears, reopen the same browser profile and
Options page. Do not edit storage, delete `updates/**`, send a manual ping, or
start an installer.

The command accepts exactly one runner at the exact recovery path whose command
is only the executable plus `--recover-active`. It rejects the killed PID and
revalidates the original transaction before and after observing the process. It
prints only safe mode/path/transaction/phase/PID fields, never the complete
command line.

```powershell
$ErrorActionPreference='Stop';$expectedMarkerBytes=[Text.UTF8Encoding]::new($false).GetBytes('PLAN_D_EFFECTIVELY_EMPTY_CLOUD_PC_V1');$marker='C:\DH-CloudPC\PLAN_D_EMPTY_CLOUD_PC.marker';if(-not(Test-Path -LiteralPath $marker -PathType Leaf)){throw 'Empty-cloud-PC marker is missing or invalid'};$actualMarkerBytes=[IO.File]::ReadAllBytes($marker);if($actualMarkerBytes.Length -ne $expectedMarkerBytes.Length -or -not [System.Linq.Enumerable]::SequenceEqual[byte]($actualMarkerBytes,$expectedMarkerBytes)){throw 'Empty-cloud-PC marker is missing or invalid'};if(($global:DhExpectedTransactionId -isnot [string]) -or ($global:DhExpectedTransactionId -cnotmatch '^[0-9a-f]{32}$')){throw 'Missing captured transaction ID; rerun the interrupter'};if(($global:DhKilledRunnerPid -isnot [int]) -or ($global:DhKilledRunnerPid -le 0)){throw 'Missing captured killed-runner PID; rerun the interrupter'};$expectedTx=$global:DhExpectedTransactionId;$killedPid=$global:DhKilledRunnerPid;$root=Join-Path $env:LOCALAPPDATA 'DynamicsHelper';$active=Join-Path $root 'updates\active.json';$runnerPath=[IO.Path]::GetFullPath((Join-Path $root 'updates\recovery\dh_update_runner.exe'));$journalPath=Join-Path $root "updates\transactions\$expectedTx\journal.json";$post=@('waiting-for-host-exit','host-backed-up','host-installed','extension-backed-up','extension-installed','metadata-installed','probing','rolling-back');$readExpectedState={if(-not(Test-Path -LiteralPath $active)){throw 'Recovery witness lost active authority'};try{$authority=[IO.File]::ReadAllText($active)|ConvertFrom-Json -ErrorAction Stop}catch{throw 'Malformed or unreadable active authority during recovery witness'};if(($authority.transaction_id -isnot [string]) -or ($authority.transaction_id -cne $expectedTx) -or ($authority.journal_path -isnot [string]) -or ($authority.journal_path -cne "transactions/$expectedTx/journal.json")){throw 'Recovery witness active authority does not match the interrupted transaction'};try{$journal=[IO.File]::ReadAllText($journalPath)|ConvertFrom-Json -ErrorAction Stop}catch{throw 'Malformed or unreadable transaction journal during recovery witness'};$witnessIp=$journal.initiating_process;if(($journal.transaction_id -isnot [string]) -or ($journal.transaction_id -cne $expectedTx) -or ($journal.initiator -isnot [string]) -or ($journal.initiator -cne 'browser') -or ($journal.prior_version -isnot [string]) -or ($journal.prior_version -cne '2.0.74-beta.4') -or ($journal.target_version -isnot [string]) -or ($journal.target_version -cne '2.0.76-beta.1') -or ($null -eq $witnessIp) -or ($witnessIp.pid -isnot [long]) -or ($witnessIp.pid -le 0) -or ($witnessIp.creation_token -isnot [string]) -or ($witnessIp.creation_token -cnotmatch '^win-create-time-[1-9][0-9]*$') -or ($journal.phase -isnot [string]) -or ($post -cnotcontains $journal.phase)){throw 'Recovery witness journal is not the interrupted post-activation transaction'};return $journal};$state=& $readExpectedState;if(@(Get-CimInstance Win32_Process -Filter "Name='dh_update_runner.exe'" -ErrorAction Stop).Count){throw 'Recovery witness must start with zero runners'};[pscustomobject]@{Event='recovery-witness-armed';TransactionId=$expectedTx;KilledRunnerPid=$killedPid;TimeoutSeconds=300}|ConvertTo-Json -Compress;$witnessed=$false;$deadline=[DateTime]::UtcNow.AddMinutes(5);while([DateTime]::UtcNow -lt $deadline){$state=& $readExpectedState;$runners=@(Get-CimInstance Win32_Process -Filter "Name='dh_update_runner.exe'" -ErrorAction Stop);if($runners.Count -eq 0){Start-Sleep -Milliseconds 25;continue};if($runners.Count -ne 1){throw "Recovery witness expected exactly one runner; found $($runners.Count)"};$runner=$runners[0];$cmd=[string]$runner.CommandLine;$recoverPattern='(?i)^\s*(?:"[^"]+"|\S+)\s+--recover-active\s*$';$completePattern='(?i)(?:^|\s)--complete-update(?:\s|$)';if(-not [string]::Equals([string]$runner.ExecutablePath,$runnerPath,[StringComparison]::OrdinalIgnoreCase)){throw 'Recovery runner executable path mismatch'};if([string]::IsNullOrWhiteSpace($cmd) -or ($cmd -notmatch $recoverPattern) -or ($cmd -match $completePattern)){throw 'Recovery runner invocation is not exact recover-active mode'};$recoveryPid=[int]$runner.ProcessId;if($recoveryPid -eq $killedPid){throw 'Recovery runner reused the killed runner PID'};$state=& $readExpectedState;$global:DhRecoveryRunnerPid=$recoveryPid;[pscustomobject]@{Event='recovery-runner-witnessed';TransactionId=$expectedTx;JournalPhase=$state.phase;ExecutablePath=$runnerPath;Mode='recover-active';RunnerPid=$recoveryPid;KilledRunnerPid=$killedPid}|ConvertTo-Json -Compress;$witnessed=$true;break};if(-not $witnessed){throw 'Recovery witness timed out after five minutes without an exact recover-active runner'}
```

Only after `recovery-runner-witnessed` may the attempt continue to terminal
verification. Failure to capture that event fails the recovery-proof attempt.
The accepted terminal is complete B2 with `committed` or complete B1 with
`rolled-back`, always under the captured transaction, with matching Host and
Extension versions and verified integrity. Require the one-shot completion
checks in **Terminal Verification And Cleanup**; a rolled-back result must become
ordinary B2 Retry. A failed update must never be recorded as successful. Run the
terminal Analyze and Options smoke checks.

### Retry Rules

Read `errorCode` only from the safe projections above and use it with `kind` to
select the following action; never inspect or print the full state object.

| State | Action |
|---|---|
| `activating` or `polling`, no `errorCode` | Wait for status polling and recovery kick. |
| `reload-pending` or `ack-pending`, no `errorCode` | Wait; do not click Retry. |
| `reload-pending` or `ack-pending` with `errorCode` | Click Retry cleanup once. |
| `activating` with `errorCode` and journal post-`prepared` | Click Retry once; it must query status before activation. |
| `preparing` with `errorCode` or journal still `prepared` | This is not durable-recovery evidence; re-establish B1 and rerun. |
| `recovery-required` | Gate failure; preserve evidence and use matching installer recovery. |

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

## Scenario 3: Matching-Installer Repair

1. Re-establish and verify `plan-d-b1` with the complete B1 installer.
2. Before the first B2 installation, run the next command in a dedicated
   PowerShell window and keep that window open through the second B2 installation.
   It stores only the SHA-256 of each currently existing user-owned file in an
   in-memory map; it prints only the count and never writes hashes to disk or the
   ledger.

```powershell
$root=Join-Path $env:LOCALAPPDATA 'DynamicsHelper';$global:DhUserOwnedBefore=@{};foreach($name in @('config.json','copilot-instructions.md','user_prompt.md')){$path=Join-Path $root $name;if(Test-Path -LiteralPath $path -PathType Leaf){$global:DhUserOwnedBefore[$name]=(Get-FileHash -Algorithm SHA256 -LiteralPath $path -ErrorAction Stop).Hash.ToLowerInvariant()}elseif(Test-Path -LiteralPath $path){throw 'User-owned path is not a regular file'}};[pscustomobject]@{Event='user-owned-baseline-captured';FileCount=$global:DhUserOwnedBefore.Count}|ConvertTo-Json -Compress
```

3. Close all browser windows, run both installer guards, and use the complete B2
   installer command to establish known-good B2.
4. Restart the browser and require B2 versions, capability, verified integrity,
   Analyze PASS, and Options PASS.
5. Close all browser windows and create this harmless unexpected sentinel under
   the installed `_internal` tree. Require `True`:

```powershell
$sentinel="$env:LOCALAPPDATA\DynamicsHelper\_internal\dh-cloud-pc-sentinel.txt"; [System.IO.File]::WriteAllText($sentinel,'remove me'); Test-Path -LiteralPath $sentinel
```

6. Run both installer guards, then run the exact same complete B2 installer
   command again and require exit `0` plus `SUCCESS: Update Complete!`.
7. Verify sentinel removal. Require `False`:

```powershell
Test-Path -LiteralPath "$env:LOCALAPPDATA\DynamicsHelper\_internal\dh-cloud-pc-sentinel.txt"
```

8. In the same PowerShell window that captured the map, strictly compare the
   post-repair set and hashes. Any added, removed, or changed user-owned file
   fails. The command prints only the count:

```powershell
if($global:DhUserOwnedBefore -isnot [hashtable]){throw 'Missing in-memory user-owned baseline'};$root=Join-Path $env:LOCALAPPDATA 'DynamicsHelper';$after=@{};foreach($name in @('config.json','copilot-instructions.md','user_prompt.md')){$path=Join-Path $root $name;if(Test-Path -LiteralPath $path -PathType Leaf){$after[$name]=(Get-FileHash -Algorithm SHA256 -LiteralPath $path -ErrorAction Stop).Hash.ToLowerInvariant()}elseif(Test-Path -LiteralPath $path){throw 'User-owned path is not a regular file'}};$beforeNames=@($global:DhUserOwnedBefore.Keys|Sort-Object);$afterNames=@($after.Keys|Sort-Object);if(($beforeNames -join "`n") -cne ($afterNames -join "`n")){throw 'User-owned file set changed during matching-installer repair'};foreach($name in $beforeNames){if($after[$name] -cne $global:DhUserOwnedBefore[$name]){throw 'User-owned file bytes changed during matching-installer repair'}};[pscustomobject]@{Event='user-owned-files-preserved';FileCount=$after.Count}|ConvertTo-Json -Compress
```

9. Restart the browser and require B2 Host/Extension versions, packaged verified
   integrity, Analyze PASS, and Options PASS. Inspect only this safe storage
   projection:

```javascript
const {dh_update_state:s}=await chrome.storage.local.get('dh_update_state'); ({kind:s?.kind,hasUpdateUrl:typeof s?.update?.url==='string',transactionId:s?.transactionId,targetVersion:s?.targetVersion,outcome:s?.outcome,code:s?.code,errorCode:s?.errorCode})
```

Do not clear `complete` manually. If present, require the B2 terminal display,
mounted eight-second ACK, authoritative disappearance, and refresh checks from
**Terminal Verification And Cleanup**. The safe local projection must then show
`hasUpdateUrl: false`, no `errorCode`, and `kind` either `idle` or absent. The
safe `DH_UPDATE_GET_STATE` projection must report `handled: true`, `kind: 'idle'`,
and no `errorCode`. Any other state fails the scenario without manual cleanup.

Scenario 3 passes only as `installer-repaired B2`, with the sentinel removed,
the full B2 product verified, identical user-owned file set and bytes, safe idle
coordinator state with no retained URL, Analyze PASS, and Options PASS. It
intentionally does not corrupt executable bytes or construct an unrecoverable
mixed installation. Remove the in-memory map only after recording the result:

```powershell
Remove-Variable -Scope Global -Name DhUserOwnedBefore -ErrorAction SilentlyContinue
```

## Environment Handoff

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
