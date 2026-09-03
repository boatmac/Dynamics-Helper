# Plan D Pragmatic Delivery Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Qualify the current Plan D baseline and one immutable release candidate through automated gates and three pragmatic empty-cloud-PC scenarios, publish the exact qualified candidate, and make that cloud PC the primary environment while leaving the old beta1 workstation unchanged.

**Architecture:** First remove test fixtures that incorrectly couple current-product tests to `2.0.74-beta.4`. Then add documentation-only operator artifacts: one exact cloud-PC runbook and one concise result ledger. Build A from the current committed `2.0.74-beta.4` product without rewriting its version, commit B (`2.0.76-beta.1`) on the product branch, build B exactly once from a clean detached worktree, and identify both ZIPs by SHA-256. No product fault hook, alternate update endpoint, cloud-PC harness, mixed-state constructor, evidence collector, public release, tag, or old-workstation install is added or performed without its explicit gate.

**Tech Stack:** Python 3.13, unittest, React 19, TypeScript 5.9, Vitest 3, Chrome/Edge MV3 DevTools, PowerShell 7, PyInstaller 6.22.2, Git worktrees, an effectively empty Windows cloud PC, private Azure Blob HTTPS URL.

---

## Execution Rules

- Work only on `hardening/plan-d-runtime-installer` until a task explicitly creates an isolated worktree.
- Never run the `release_helper.py VERSION` CLI in this plan. Its CLI commits and tags before building.
- Never stage or commit `host/venv`, `build/`, `dist/`, `extension/dist/`, ZIP files, SAS URLs, cloud-PC screenshots, or unredacted logs.
- Never run an installer, change Native Messaging registration, mutate `%LOCALAPPDATA%\DynamicsHelper`, terminate production processes, create a tag, push, or publish before its explicit manual gate. Cloud-PC installation steps are allowed only while that machine remains free of the migrated workload. The old workstation is read-only except for disabling its beta preference or extension after a separate confirmation.
- Every Host process used by automated tests receives fresh existing `LOCALAPPDATA`, `APPDATA`, `USERPROFILE`, `HOME`, `TEMP`, and `TMP` directories.
- Run long Host partitions and the Extension suite sequentially. Do not run `npm run test:run` concurrently with `npm run build`; the FAB page-identity tests have a five-second timing budget.
- A is not republished. B may be published only as the exact qualified ZIP after explicit user approval.

## File Structure

### Product/Test Changes

- Modify: `host/test_update_support.py` - shared authoritative Extension manifest fixture bytes for current-product tests.
- Modify: `host/test_product_info.py` - version-carrier consistency and dynamic capability projection.
- Modify: `host/test_host_integrity_actions.py` - current Host envelope expectations use `VERSION`.
- Modify: `host/test_early_cli.py` - current package fixture uses the authoritative manifest helper.
- Modify: `host/test_install_integrity.py` - current live/probe fixtures use the authoritative manifest helper.
- Modify: `host/test_package_archive.py` - current package generation and assertions use `VERSION`.
- Modify: `host/test_package_manifest.py` - release-document generation tests use `VERSION` and the authoritative manifest helper.
- Modify: `host/test_release_helper.py` - release staging tests use the current version dynamically.
- Modify: `host/test_update_engine_host.py` - engine package fixture uses the authoritative manifest helper.
- Modify: `host/test_update_engine_resume.py` - resume matrix uses the authoritative manifest helper.
- Modify: `host/test_update_ownership.py` - ownership package fixture uses the authoritative manifest helper.
- Modify: `host/test_update_recovery.py` - real frozen package fixture uses the authoritative manifest helper.
- Modify: `host/test_update_actions.py` - candidate selection tests bind an explicit current version and cover equal-current rejection.
- Modify: `extension/package.json` - B effective version.
- Modify: `extension/manifest.json` - B numeric Chrome version and effective `version_name`.
- Modify: `host/product_info.py` - B Host version.

### Operator Documentation

- Create: `docs/plan-d-pragmatic-cloud-pc-runbook.md` - exact private-artifact, cloud-PC, DevTools, interruption, repair, and environment-handoff commands.
- Create: `docs/plan-d-pragmatic-cloud-pc-results.md` - sanitized A/B identity and three-scenario result ledger.
- Modify: `.superpowers/sdd/plan-d-reliable-update-progress.md` - ignored session recovery record; update after each gate, never stage it.
- Modify after successful qualification: `releases/notes-prompt-scope-cleanup-draft.md` - replace pre-qualification evidence with exact B evidence and the explicit reduced cloud-PC scope.

## Task 1: Make Current-Product Fixtures Version-Agnostic

**Files:**
- Modify: `host/test_update_support.py`
- Modify: `host/test_product_info.py`
- Modify: `host/test_host_integrity_actions.py`
- Modify: `host/test_early_cli.py`
- Modify: `host/test_install_integrity.py`
- Modify: `host/test_package_archive.py`
- Modify: `host/test_package_manifest.py`
- Modify: `host/test_release_helper.py`
- Modify: `host/test_update_engine_host.py`
- Modify: `host/test_update_engine_resume.py`
- Modify: `host/test_update_ownership.py`
- Modify: `host/test_update_recovery.py`
- Modify: `host/test_update_actions.py`

- [ ] **Step 1: Add RED tests for the shared manifest fixture and carrier agreement**

First add a temporary test-local helper in `host/test_product_info.py`. This
keeps RED as an assertion failure rather than an import error:

```python
import json


def _extension_versions() -> tuple[str, str]:
    package = json.loads(Path("extension/package.json").read_text(encoding="utf-8"))
    manifest = json.loads(Path("extension/manifest.json").read_text(encoding="utf-8"))
    return package["version"], manifest.get("version_name") or manifest["version"]


def _current_extension_manifest_bytes() -> bytes:
    return b'{}\n'


class TestProductInfo(unittest.TestCase):
    def test_current_extension_manifest_fixture_tracks_the_real_carrier(self):
        manifest = json.loads(
            Path("extension/manifest.json").read_text(encoding="utf-8")
        )
        expected = {"version": manifest["version"]}
        if "version_name" in manifest:
            expected["version_name"] = manifest["version_name"]
        self.assertEqual(
            json.loads(_current_extension_manifest_bytes()),
            expected,
        )

    def test_authoritative_version_carriers_agree(self):
        package_version, extension_version = _extension_versions()
        manifest = json.loads(
            Path("extension/manifest.json").read_text(encoding="utf-8")
        )
        self.assertEqual(package_version, VERSION)
        self.assertEqual(extension_version, VERSION)
        self.assertEqual(manifest["version"], VERSION.split("-", 1)[0])

    def test_release_helper_targets_all_authoritative_version_carriers(self):
        root = Path(release_helper.__file__).resolve().parent
        self.assertEqual(release_helper.PACKAGE_JSON.resolve(), root / "extension/package.json")
        self.assertEqual(release_helper.MANIFEST_JSON.resolve(), root / "extension/manifest.json")
        self.assertEqual(release_helper.HOST_FILE.resolve(), root / "host/product_info.py")
```

Remove only the obsolete assertion `VERSION == "2.0.74-beta.4"`. Change the
projection expectation to `HostCapabilities(host_version=VERSION,
required=("prompt-scope-v1",), provided=("prompt-scope-v1",
"transactional-update-v1"))`.

- [ ] **Step 2: Run the focused carrier tests and verify RED**

Run:

```powershell
$r=Join-Path 'C:\Users\zhaobo\AppData\Local\Temp\opencode' ('plan-d-task1-red-'+[guid]::NewGuid().ToString('N')); @('local','app','user','home','temp')|ForEach-Object{New-Item -ItemType Directory -Path (Join-Path $r $_)-Force|Out-Null}; $env:LOCALAPPDATA="$r\local"; $env:APPDATA="$r\app"; $env:USERPROFILE="$r\user"; $env:HOME="$r\home"; $env:TEMP="$r\temp"; $env:TMP="$r\temp"; $env:PYTHONPATH="$(Resolve-Path '.');$(Resolve-Path 'host')"; & "host/venv/Scripts/python.exe" -m unittest host.test_product_info -v
```

Expected: `test_current_extension_manifest_fixture_tracks_the_real_carrier`
fails because `{}` lacks the authoritative version fields. The two carrier tests
pass. Fix test syntax if needed, but do not implement the shared helper until
this expected assertion failure is observed.

- [ ] **Step 3: Add the shared current manifest helper**

Add to `host/test_update_support.py`:

```python
import json


_REPOSITORY_ROOT = Path(__file__).resolve().parent.parent


def current_extension_manifest_bytes() -> bytes:
    manifest = json.loads(
        (_REPOSITORY_ROOT / "extension" / "manifest.json").read_text(
            encoding="utf-8"
        )
    )
    projected = {"version": manifest["version"]}
    if "version_name" in manifest:
        projected["version_name"] = manifest["version_name"]
    return (
        json.dumps(projected, ensure_ascii=True, separators=(",", ":")) + "\n"
    ).encode("ascii")
```

This helper deliberately reads the independent Extension carrier. Do not derive manifest data from `product_info.VERSION`, because that would hide carrier drift.

Replace the temporary `_current_extension_manifest_bytes` definition in
`host/test_product_info.py` with:

```python
from test_update_support import current_extension_manifest_bytes
```

and change the test call to `current_extension_manifest_bytes()`.

- [ ] **Step 4: Replace only current-product fixture literals**

Import `current_extension_manifest_bytes` in the current-product fixture files and replace the literal:

```python
b'{"version":"2.0.74","version_name":"2.0.74-beta.4"}\n'
```

with:

```python
current_extension_manifest_bytes()
```

Apply this to:

- `host/test_early_cli.py`
- both current-product fixtures in `host/test_install_integrity.py`
- `host/test_package_archive.py::make_stage`
- `host/test_package_manifest.py::ReleaseDocumentGenerationTests._make_stage`
- both current-product fixtures in `host/test_release_helper.py`
- `host/test_update_engine_host.py::make_package`
- `host/test_update_ownership.py::make_package`
- `host/test_update_recovery.py::FrozenStagedProbeIntegrationTests.make_plan_a_package_from_built_onedir`

In `host/test_update_engine_resume.py::make_matrix_package`, replace the hand-built manifest JSON with:

```python
"extension/manifest.json": current_extension_manifest_bytes(),
```

Do not change parser schema fixtures in `valid_manifest_value()`, historical tests, or synthetic target/prior versions whose purpose is independent of the running product.

- [ ] **Step 5: Make current package generation and assertions use `VERSION`**

Import `VERSION` where necessary and replace current-product calls/expectations in these scopes only:

```python
generate_release_documents(stage, VERSION)
validate_staged_package(stage, expected_version=VERSION)
self.assertEqual(result.manifest.package_version, VERSION)
self.assertEqual(result.release_integrity.package_version, VERSION)
self.assertEqual(result.installed_product.package_version, VERSION)
release_helper.stage_release(source, stage, VERSION)
release_helper.create_zip(VERSION, source_root=source, output_dir=output)
self.assertEqual(archive.name, f"DynamicsHelper_v{VERSION}.zip")
```

Update:

- `host/test_package_archive.py::make_stage`, `test_valid_stage_returns_resolved_models`, and its round-trip expected-version assertion;
- all calls inside `host/test_package_manifest.py::ReleaseDocumentGenerationTests`;
- all current-product `stage_release`/`create_zip` calls and archive-name assertions in `host/test_release_helper.py`.

Also change only the current capability-envelope expectation at
`host/test_host_integrity_actions.py:31` to use `VERSION`. Keep its deliberately
synthetic serializer records at their fixed versions.

Keep deliberately mismatched versions and parser-only fixture values unchanged.

- [ ] **Step 6: Bind candidate-selection tests to their explicit prior version**

Change `host/test_update_actions.py` imports to include `patch`. In `UpdateCandidateSelectionTests`, wrap calls that expect `TARGET` to be newer:

```python
with patch("host.dh_native_host.VERSION", PRIOR):
    actual = _select_update_candidate([self.release(assets=[self.asset()])])
```

Apply the same patch around the unsafe candidate table so every rejection is evaluated relative to `PRIOR`, not whichever release version the repository currently has.

Add this regression test:

```python
def test_equal_current_candidate_is_not_selected(self):
    with patch("host.dh_native_host.VERSION", TARGET):
        self.assertIsNone(
            _select_update_candidate([self.release(assets=[self.asset()])])
        )
```

- [ ] **Step 7: Run focused Host tests**

Run:

```powershell
$r=Join-Path 'C:\Users\zhaobo\AppData\Local\Temp\opencode' ('plan-d-task1-focused-'+[guid]::NewGuid().ToString('N')); @('local','app','user','home','temp')|ForEach-Object{New-Item -ItemType Directory -Path (Join-Path $r $_)-Force|Out-Null}; $env:LOCALAPPDATA="$r\local"; $env:APPDATA="$r\app"; $env:USERPROFILE="$r\user"; $env:HOME="$r\home"; $env:TEMP="$r\temp"; $env:TMP="$r\temp"; $env:PYTHONPATH="$(Resolve-Path '.');$(Resolve-Path 'host')"; & "host/venv/Scripts/python.exe" -m unittest host.test_product_info host.test_host_integrity_actions host.test_early_cli host.test_install_integrity host.test_package_manifest host.test_package_archive host.test_release_helper host.test_update_actions host.test_update_engine_host host.test_update_ownership host.test_update_recovery.FrozenStagedProbeIntegrationTests -v
```

Expected: all tests pass; `FrozenStagedProbeIntegrationTests` has one expected skip because `DH_PLAN_C_FROZEN_ONEDIR` is not set.

- [ ] **Step 8: Prove the new candidate test catches a regression**

Temporarily change the equal-current test patch from `TARGET` to `PRIOR`, run only that test, and confirm it fails because the candidate is selected. Restore `TARGET` and rerun; it must pass.

```powershell
$r=Join-Path 'C:\Users\zhaobo\AppData\Local\Temp\opencode' ('plan-d-task1-break-'+[guid]::NewGuid().ToString('N')); @('local','app','user','home','temp')|ForEach-Object{New-Item -ItemType Directory -Path (Join-Path $r $_)-Force|Out-Null}; $env:LOCALAPPDATA="$r\local"; $env:APPDATA="$r\app"; $env:USERPROFILE="$r\user"; $env:HOME="$r\home"; $env:TEMP="$r\temp"; $env:TMP="$r\temp"; $env:PYTHONPATH="$(Resolve-Path '.');$(Resolve-Path 'host')"; & "host/venv/Scripts/python.exe" -m unittest host.test_update_actions.UpdateCandidateSelectionTests.test_equal_current_candidate_is_not_selected -v
```

- [ ] **Step 9: Verify and commit the version-test decoupling**

Run:

```powershell
& "host/venv/Scripts/python.exe" -m compileall -q host
```

```powershell
git diff --check
```

Review `git diff` and stage only the test files listed in this task:

```powershell
git add -- "host/test_update_support.py" "host/test_product_info.py" "host/test_host_integrity_actions.py" "host/test_early_cli.py" "host/test_install_integrity.py" "host/test_package_archive.py" "host/test_package_manifest.py" "host/test_release_helper.py" "host/test_update_engine_host.py" "host/test_update_engine_resume.py" "host/test_update_ownership.py" "host/test_update_recovery.py" "host/test_update_actions.py"
```

Commit:

```powershell
git commit -m "test(release): decouple fixtures from product version"
```

## Task 2: Add The Minimal Cloud PC Runbook And Result Ledger

**Files:**
- Create: `docs/plan-d-pragmatic-cloud-pc-runbook.md`
- Create: `docs/plan-d-pragmatic-cloud-pc-results.md`
- Modify: `.superpowers/sdd/plan-d-reliable-update-progress.md` (ignored, do not stage)

- [ ] **Step 1: Write the runbook preconditions and safety stop**

Create `docs/plan-d-pragmatic-cloud-pc-runbook.md` with this opening contract:

```markdown
# Plan D Pragmatic Cloud PC Runbook

## Safety Contract

- Run installer/process/registry steps only on the effectively empty cloud PC.
- Do not install A or B on the old beta1 workstation.
- Do not migrate the current workload to the cloud PC until all three scenarios
  pass.
- A is current Plan D `2.0.74-beta.4`; B is candidate `2.0.76-beta.1`.
- Keep **Receive beta updates** disabled on A so public `v2.0.75-beta.1`
  cannot replace the manually controlled B candidate.
- Never paste the private B URL into this file, Git, screenshots, or results.
- Use only the designated non-customer Dynamics test case for Analyze smoke;
  record PASS/FAIL only, never its case ID, content, report, or screenshots.
- Never delete `%LOCALAPPDATA%\DynamicsHelper\updates` during recovery.
- Never publish, tag, push, or rebuild B while qualification is active.
- Stop immediately if the observed starting version, ZIP SHA-256, Native Host
  registration target, or transaction ID differs from the result ledger.
```

- [ ] **Step 2: Document exact artifact identity commands**

Add commands that are each physically one line and independently copyable:

```powershell
(Get-FileHash -Algorithm SHA256 -LiteralPath "C:\DH-CloudPC\DynamicsHelper_v2.0.74-beta.4.zip").Hash.ToLowerInvariant()
```

```powershell
(Get-FileHash -Algorithm SHA256 -LiteralPath "C:\DH-CloudPC\DynamicsHelper_v2.0.76-beta.1.zip").Hash.ToLowerInvariant()
```

Add the installed version check:

```powershell
$root="$env:LOCALAPPDATA\DynamicsHelper"; $p=Get-Content -LiteralPath "$root\installed-product.json" -Raw | ConvertFrom-Json; $m=Get-Content -LiteralPath "$root\extension\manifest.json" -Raw | ConvertFrom-Json; [pscustomobject]@{Host=$p.package_version;Extension=$(if($m.version_name){$m.version_name}else{$m.version});IntegrityMetadata=(Test-Path -LiteralPath "$root\release-integrity.json")}
```

Add the production registration check:

```powershell
$name='com.dynamics.helper.native'; [pscustomobject]@{Chrome=(Get-ItemPropertyValue -LiteralPath "Registry::HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts\$name" -Name '(default)' -ErrorAction SilentlyContinue);Edge=(Get-ItemPropertyValue -LiteralPath "Registry::HKEY_CURRENT_USER\Software\Microsoft\Edge\NativeMessagingHosts\$name" -Name '(default)' -ErrorAction SilentlyContinue)}
```

Add the safe baseline check. It prints no URL:

```powershell
$root=Join-Path $env:LOCALAPPDATA 'DynamicsHelper';[pscustomobject]@{ActiveAuthority=(Test-Path -LiteralPath (Join-Path $root 'updates\active.json'));RunnerCount=@(Get-Process -Name dh_update_runner -ErrorAction SilentlyContinue).Count;FinalizationCursor=(Test-Path -LiteralPath (Join-Path $root 'updates\finalization-cursor.json'));RunOnceArmed=[bool](Get-ItemProperty -LiteralPath 'Registry::HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\RunOnce' -Name 'DynamicsHelperUpdateRecovery' -ErrorAction SilentlyContinue).DynamicsHelperUpdateRecovery}|ConvertTo-Json -Compress
```

Expected before each scenario: all booleans `false` and `RunnerCount` `0`.

- [ ] **Step 3: Document exact DevTools update commands**

State that these commands run in the installed A **Options page DevTools
console**, where `window.prompt()` is available. Use a local variable for the
secret URL and never print the complete state object:

```javascript
const privateBUrl = window.prompt('Paste the short-lived private B ZIP URL'); if (!privateBUrl) throw new Error('Private B URL is required')
```

```javascript
await chrome.storage.local.remove('pending_update'); await chrome.storage.local.set({dh_update_state:{kind:'available',update:{version:'2.0.76-beta.1',url:privateBUrl,isPrerelease:true}}}); const {dh_update_state:s}=await chrome.storage.local.get('dh_update_state'); ({kind:s?.kind,version:s?.update?.version,isPrerelease:s?.update?.isPrerelease})
```

```javascript
chrome.runtime.reload()
```

After reopening the Options page and its DevTools, document:

```javascript
const r=await chrome.runtime.sendMessage({type:'DH_UPDATE_GET_STATE'}); ({handled:r?.handled,kind:r?.state?.kind,version:r?.state?.update?.version})
```

Register a sanitized storage listener before starting so the transaction ID is
captured without printing `update.url`:

```javascript
globalThis.dhUpdateWatch=(changes,area)=>{const s=changes.dh_update_state?.newValue;if(area==='local'&&s)console.log({kind:s.kind,transactionId:s.transactionId,targetVersion:s.targetVersion,outcome:s.outcome,code:s.code})}; chrome.storage.onChanged.addListener(globalThis.dhUpdateWatch)
```

```javascript
void chrome.runtime.sendMessage({type:'DH_UPDATE_START'}).then(r=>{const s=r?.state;console.log({handled:r?.handled,kind:s?.kind,transactionId:s?.transactionId,targetVersion:s?.targetVersion,outcome:s?.outcome,code:s?.code})}).catch(e=>console.error(typeof e?.message==='string'?e.message:'Update start request disconnected'))
```

After any reload, reopen Options DevTools and inspect only safe fields:

```javascript
const {dh_update_state:s}=await chrome.storage.local.get('dh_update_state'); ({kind:s?.kind,transactionId:s?.transactionId,targetVersion:s?.targetVersion,outcome:s?.outcome,code:s?.code,version:s?.update?.version})
```

Require the operator to copy only `kind`, `transactionId`, `targetVersion`, and `outcome` into the ledger; never copy `update.url`.

- [ ] **Step 4: Document the three cloud-PC scenarios exactly**

For each scenario, require the `plan-d-a` baseline defined in the runbook,
actions, stop conditions, installer recovery order, and pass criteria:

1. Establish `plan-d-a` with the complete A installer, then run uninterrupted
   A-to-B to terminal `complete/committed` B.
2. Re-establish `plan-d-a` with the complete A installer. Start the runbook's
   one-shot post-activation interrupter before starting the update. The
   interrupter waits for a validated browser-owned A-to-B journal in
   `waiting-for-host-exit` or a later nonterminal phase, then kills only the
   original `--complete-update` runner carrying the same 32-hex transaction ID whose executable is
   exactly `%LOCALAPPDATA%\DynamicsHelper\updates\recovery\dh_update_runner.exe`.
   Within ten seconds, exit all browser windows, terminate only any remaining
   main Host, and verify that browser/Host/runner counts are zero while the same
   authority and armed RunOnce remain. Start the bounded recovery witness, then
   reopen the browser/Options without editing state or deleting `updates/**`.
   Require the witness to capture an exact-path `--recover-active` runner under
   the same transaction with a PID different from the killed runner. Accept only
   complete B (`committed`) or complete A (`rolled-back`) with matching versions
   and verified integrity.
3. Re-establish `plan-d-a`, install B, create a sentinel, reinstall the exact B
   ZIP, and verify removal:

```powershell
$sentinel="$env:LOCALAPPDATA\DynamicsHelper\_internal\dh-cloud-pc-sentinel.txt"; [System.IO.File]::WriteAllText($sentinel,'remove me'); Test-Path -LiteralPath $sentinel
```

```powershell
Test-Path -LiteralPath "$env:LOCALAPPDATA\DynamicsHelper\_internal\dh-cloud-pc-sentinel.txt"
```

Expected before reinstall: `True`; after reinstall: `False`.

For integrity/capability inspection, document sending ordinary Native messages from the **Options page DevTools console**, not the Service Worker console:

```javascript
await chrome.runtime.sendMessage({type:'NATIVE_MSG',payload:{action:'get_capabilities'}})
```

```javascript
await chrome.runtime.sendMessage({type:'NATIVE_MSG',payload:{action:'verify_installation'}})
```

Add these exact interruption commands and rules to the runbook.

First add a read-only timeline watcher. It emits only authority, transaction,
phase, and process IDs:

```powershell
$root=Join-Path $env:LOCALAPPDATA 'DynamicsHelper';$active=Join-Path $root 'updates\active.json';$last='';while($true){$tx='';$phase='';$authority=$false;if(Test-Path -LiteralPath $active){try{$a=[IO.File]::ReadAllText($active)|ConvertFrom-Json;$tx=[string]$a.transaction_id;if(($tx -match '^[0-9a-f]{32}$') -and ([string]$a.journal_path -ceq "transactions/$tx/journal.json")){$j=[IO.File]::ReadAllText((Join-Path $root "updates\transactions\$tx\journal.json"))|ConvertFrom-Json;$phase=[string]$j.phase;$authority=$true}}catch{$tx='';$phase='';$authority=$false}};$main=@(Get-Process -Name dh_native_host -ErrorAction SilentlyContinue);$runner=@(Get-Process -Name dh_update_runner -ErrorAction SilentlyContinue);$key=@($authority,$tx,$phase,($main.Id -join ','),($runner.Id -join ','))-join '|';if($key -cne $last){[pscustomobject]@{At=(Get-Date).ToUniversalTime().ToString('o');Authority=$authority;TransactionId=$tx;JournalPhase=$phase;MainHostPids=@($main.Id);RunnerPids=@($runner.Id)}|ConvertTo-Json -Compress;$last=$key};Start-Sleep -Milliseconds 25}
```

Add a process-start watcher. It inspects but never prints the complete command
line:

```powershell
$id='DH.Update.ProcessStart.'+[guid]::NewGuid().ToString('N');$q="SELECT * FROM Win32_ProcessStartTrace WHERE ProcessName='dh_native_host.exe' OR ProcessName='dh_update_runner.exe'";Register-CimIndicationEvent -Query $q -SourceIdentifier $id|Out-Null;try{while($true){$e=Wait-Event -SourceIdentifier $id;$n=$e.SourceEventArgs.NewEvent;$p=Get-CimInstance Win32_Process -Filter "ProcessId=$($n.ProcessID)" -ErrorAction SilentlyContinue;$cmd=[string]$p.CommandLine;$mode=if($n.ProcessName -ieq 'dh_update_runner.exe'){if($cmd -match '(?i)--recover-active(?:\s|$)'){'recover-active'}elseif($cmd -match '(?i)--complete-update(?:\s|$)'){'complete-update'}else{'unknown-runner'}}else{'main-host'};[pscustomobject]@{At=(Get-Date).ToUniversalTime().ToString('o');Name=[string]$n.ProcessName;Pid=[int]$n.ProcessID;ParentPid=[int]$n.ParentProcessID;Mode=$mode}|ConvertTo-Json -Compress;Remove-Event -EventIdentifier $e.EventIdentifier}}finally{Unregister-Event -SourceIdentifier $id -ErrorAction SilentlyContinue}
```

Add the one-shot interrupter. Run it in a PowerShell 7 window before
`DH_UPDATE_START`, leave that window open for all subsequent interruption
commands, and start the update from Options DevTools. It waits at most ten
minutes. Before `active.json` exists it polls; after the file first appears, any
read, JSON, authority, or journal validation error fails immediately. A
`prepared` journal is observed but never killed. A terminal journal means the
interruption was missed. The command validates the exact A-to-B browser journal,
requires RunOnce before the kill, proves that the sole runner has the exact
recovery executable path and canonical `--complete-update` command for the same
transaction and initiating-process identity, explicitly excludes
`--recover-active`, captures the transaction and killed PID in global variables,
kills by PID, waits for exit, and then revalidates the same nonterminal
post-activation authority:

```powershell
$ErrorActionPreference='Stop';Remove-Variable -Scope Global -Name DhExpectedTransactionId,DhKilledRunnerPid,DhRecoveryRunnerPid -ErrorAction SilentlyContinue;$root=Join-Path $env:LOCALAPPDATA 'DynamicsHelper';$active=Join-Path $root 'updates\active.json';$runnerPath=[IO.Path]::GetFullPath((Join-Path $root 'updates\recovery\dh_update_runner.exe'));$runOnceKey='Registry::HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\RunOnce';$post=@('waiting-for-host-exit','host-backed-up','host-installed','extension-backed-up','extension-installed','metadata-installed','probing','rolling-back');$terminal=@('committed','rolled-back','recovery-required');if(Test-Path -LiteralPath $active){throw 'Baseline invalid: active.json already exists'};if(@(Get-CimInstance Win32_Process -Filter "Name='dh_update_runner.exe'" -ErrorAction Stop).Count){throw 'Baseline invalid: update runner already exists'};$authoritySeen=$false;$interrupted=$false;$deadline=[DateTime]::UtcNow.AddMinutes(10);while([DateTime]::UtcNow -lt $deadline){if(-not(Test-Path -LiteralPath $active)){if($authoritySeen){throw 'Active authority disappeared before interruption'};Start-Sleep -Milliseconds 25;continue};$authoritySeen=$true;try{$a=[IO.File]::ReadAllText($active)|ConvertFrom-Json -ErrorAction Stop}catch{throw 'Malformed or unreadable active authority'};if(($a.transaction_id -isnot [string]) -or ($a.transaction_id -cnotmatch '^[0-9a-f]{32}$')){throw 'Active transaction ID is not lowercase 32-hex'};$tx=$a.transaction_id;$expectedJournal="transactions/$tx/journal.json";if(($a.journal_path -isnot [string]) -or ($a.journal_path -cne $expectedJournal)){throw 'Active journal authority mismatch'};$journalPath=Join-Path $root "updates\transactions\$tx\journal.json";try{$j=[IO.File]::ReadAllText($journalPath)|ConvertFrom-Json -ErrorAction Stop}catch{throw 'Malformed or unreadable transaction journal'};if(($j.transaction_id -isnot [string]) -or ($j.transaction_id -cne $tx) -or ($j.initiator -isnot [string]) -or ($j.initiator -cne 'browser') -or ($j.prior_version -isnot [string]) -or ($j.prior_version -cne '2.0.74-beta.4') -or ($j.target_version -isnot [string]) -or ($j.target_version -cne '2.0.76-beta.1') -or ($j.phase -isnot [string])){throw 'Transaction journal authority mismatch'};$phase=$j.phase;if($phase -ceq 'prepared'){Start-Sleep -Milliseconds 25;continue};if($terminal -ccontains $phase){throw "Interruption missed: transaction reached terminal phase $phase"};if($post -cnotcontains $phase){throw "Unexpected nonterminal journal phase: $phase"};$ip=$j.initiating_process;if(($null -eq $ip) -or ($ip.pid -isnot [long]) -or ($ip.pid -le 0) -or ($ip.creation_token -isnot [string]) -or ($ip.creation_token -cnotmatch '^win-create-time-[1-9][0-9]*$')){throw 'Post-activation initiating process is missing or invalid'};try{$runOnce=[string](Get-ItemPropertyValue -LiteralPath $runOnceKey -Name 'DynamicsHelperUpdateRecovery' -ErrorAction Stop)}catch{throw 'RunOnce recovery is not armed before interruption'};if([string]::IsNullOrWhiteSpace($runOnce)){throw 'RunOnce recovery is not armed before interruption'};$allRunners=@(Get-CimInstance Win32_Process -Filter "Name='dh_update_runner.exe'" -ErrorAction Stop);if($allRunners.Count -ne 1){throw "Expected exactly one update runner; found $($allRunners.Count)"};$runner=$allRunners[0];$cmd=[string]$runner.CommandLine;$completePattern='(?i)^\s*(?:"[^"]+"|\S+)\s+--complete-update\s+'+[regex]::Escape($tx)+'\s+'+[regex]::Escape([string]$ip.pid)+'\s+'+[regex]::Escape($ip.creation_token)+'\s*$';$recoverPattern='(?i)(?:^|\s)--recover-active(?:\s|$)';if(-not [string]::Equals([string]$runner.ExecutablePath,$runnerPath,[StringComparison]::OrdinalIgnoreCase)){throw 'Original runner executable path mismatch'};if([string]::IsNullOrWhiteSpace($cmd) -or ($cmd -notmatch $completePattern) -or ($cmd -match $recoverPattern)){throw 'Original runner invocation is not the expected complete-update command'};$global:DhExpectedTransactionId=$tx;$global:DhKilledRunnerPid=[int]$runner.ProcessId;$phaseAtKill=$phase;$runnerProcess=Get-Process -Id $global:DhKilledRunnerPid -ErrorAction Stop;try{Stop-Process -Id $global:DhKilledRunnerPid -Force -ErrorAction Stop;if(-not $runnerProcess.WaitForExit(10000)){throw 'Killed runner did not exit within ten seconds'}}finally{$runnerProcess.Dispose()};if(-not(Test-Path -LiteralPath $active)){throw 'Active authority disappeared after runner exit'};try{$a2=[IO.File]::ReadAllText($active)|ConvertFrom-Json -ErrorAction Stop}catch{throw 'Malformed or unreadable active authority after runner exit'};if(($a2.transaction_id -isnot [string]) -or ($a2.transaction_id -cne $global:DhExpectedTransactionId) -or ($a2.journal_path -isnot [string]) -or ($a2.journal_path -cne "transactions/$($global:DhExpectedTransactionId)/journal.json")){throw 'Active authority changed after runner exit'};try{$j2=[IO.File]::ReadAllText($journalPath)|ConvertFrom-Json -ErrorAction Stop}catch{throw 'Malformed or unreadable transaction journal after runner exit'};$ip2=$j2.initiating_process;if(($j2.transaction_id -isnot [string]) -or ($j2.transaction_id -cne $global:DhExpectedTransactionId) -or ($j2.initiator -isnot [string]) -or ($j2.initiator -cne 'browser') -or ($j2.prior_version -isnot [string]) -or ($j2.prior_version -cne '2.0.74-beta.4') -or ($j2.target_version -isnot [string]) -or ($j2.target_version -cne '2.0.76-beta.1') -or ($null -eq $ip2) -or ($ip2.pid -isnot [long]) -or ($ip2.pid -ne $ip.pid) -or ($ip2.creation_token -isnot [string]) -or ($ip2.creation_token -cne $ip.creation_token) -or ($j2.phase -isnot [string]) -or ($post -cnotcontains $j2.phase)){throw 'Journal is not the same post-activation nonterminal transaction after runner exit'};[pscustomobject]@{Event='original-runner-killed';TransactionId=$global:DhExpectedTransactionId;PhaseAtKill=$phaseAtKill;PhaseAfterKill=$j2.phase;RunnerPid=$global:DhKilledRunnerPid;RunOnceArmedBeforeKill=$true}|ConvertTo-Json -Compress;$interrupted=$true;break};if(-not $interrupted){throw 'Interrupter timed out after ten minutes without a valid post-activation runner'}
```

After it prints `original-runner-killed`, close all browser windows within ten
seconds, then run:

```powershell
Get-Process -Name chrome,msedge -ErrorAction SilentlyContinue | Stop-Process -Force
```

```powershell
Get-Process -Name dh_native_host -ErrorAction SilentlyContinue | Stop-Process -Force
```

In the same PowerShell window, run the zero-executor checkpoint. It must consume,
not replace, `$global:DhExpectedTransactionId` and
`$global:DhKilledRunnerPid`; strictly compare the active transaction with the
captured transaction; prove the killed PID, all browsers, all main Hosts, and all
runners are absent; and revalidate the same post-activation journal and armed
RunOnce:

```powershell
$ErrorActionPreference='Stop';if(($global:DhExpectedTransactionId -isnot [string]) -or ($global:DhExpectedTransactionId -cnotmatch '^[0-9a-f]{32}$')){throw 'Missing captured transaction ID; rerun the interrupter'};if(($global:DhKilledRunnerPid -isnot [int]) -or ($global:DhKilledRunnerPid -le 0)){throw 'Missing captured killed-runner PID; rerun the interrupter'};$expectedTx=$global:DhExpectedTransactionId;$killedPid=$global:DhKilledRunnerPid;Start-Sleep -Seconds 5;$root=Join-Path $env:LOCALAPPDATA 'DynamicsHelper';$active=Join-Path $root 'updates\active.json';$b=@(Get-Process -Name chrome,msedge -ErrorAction SilentlyContinue);$m=@(Get-Process -Name dh_native_host -ErrorAction SilentlyContinue);$r=@(Get-CimInstance Win32_Process -Filter "Name='dh_update_runner.exe'" -ErrorAction Stop);$killedPidRecords=@(Get-CimInstance Win32_Process -Filter "ProcessId=$killedPid" -ErrorAction Stop);if($b.Count -or $m.Count -or $r.Count -or $killedPidRecords.Count){throw 'Zero-executor checkpoint failed: browser, main Host, runner, or killed PID is still alive'};if(-not(Test-Path -LiteralPath $active)){throw 'Active authority disappeared before recovery witness'};try{$a=[IO.File]::ReadAllText($active)|ConvertFrom-Json -ErrorAction Stop}catch{throw 'Malformed or unreadable active authority at zero-executor checkpoint'};if(($a.transaction_id -isnot [string]) -or ($a.transaction_id -cne $expectedTx) -or ($a.journal_path -isnot [string]) -or ($a.journal_path -cne "transactions/$expectedTx/journal.json")){throw 'Zero-executor active authority does not match the interrupted transaction'};$journalPath=Join-Path $root "updates\transactions\$expectedTx\journal.json";try{$j=[IO.File]::ReadAllText($journalPath)|ConvertFrom-Json -ErrorAction Stop}catch{throw 'Malformed or unreadable transaction journal at zero-executor checkpoint'};$post=@('waiting-for-host-exit','host-backed-up','host-installed','extension-backed-up','extension-installed','metadata-installed','probing','rolling-back');$checkpointIp=$j.initiating_process;if(($j.transaction_id -isnot [string]) -or ($j.transaction_id -cne $expectedTx) -or ($j.initiator -isnot [string]) -or ($j.initiator -cne 'browser') -or ($j.prior_version -isnot [string]) -or ($j.prior_version -cne '2.0.74-beta.4') -or ($j.target_version -isnot [string]) -or ($j.target_version -cne '2.0.76-beta.1') -or ($null -eq $checkpointIp) -or ($checkpointIp.pid -isnot [long]) -or ($checkpointIp.pid -le 0) -or ($checkpointIp.creation_token -isnot [string]) -or ($checkpointIp.creation_token -cnotmatch '^win-create-time-[1-9][0-9]*$') -or ($j.phase -isnot [string]) -or ($post -cnotcontains $j.phase)){throw 'Zero-executor journal is not the interrupted post-activation transaction'};try{$runOnce=[string](Get-ItemPropertyValue -LiteralPath 'Registry::HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\RunOnce' -Name 'DynamicsHelperUpdateRecovery' -ErrorAction Stop)}catch{throw 'RunOnce recovery is not armed at zero-executor checkpoint'};if([string]::IsNullOrWhiteSpace($runOnce)){throw 'RunOnce recovery is not armed at zero-executor checkpoint'};[pscustomobject]@{Event='zero-executor-checkpoint';TransactionId=$expectedTx;JournalPhase=$j.phase;KilledRunnerPid=$killedPid;NoBrowser=$true;NoMainHost=$true;NoRunner=$true;RunOnceArmed=$true}|ConvertTo-Json -Compress
```

Before reopening the browser, start this recovery witness in the same PowerShell
window. It first emits `recovery-witness-armed`, then waits at most five minutes.
Immediately after that armed event appears, reopen the same browser profile and
Options without editing state or sending a manual ping. The command fails if it
cannot capture exactly one runner at the exact recovery path with a command line
consisting of the executable plus `--recover-active`, if the PID equals the
killed runner PID, or if the active authority is no longer the captured
transaction. It reports only the safe mode, exact executable path, transaction,
phase, and PIDs, never the complete command line:

```powershell
$ErrorActionPreference='Stop';if(($global:DhExpectedTransactionId -isnot [string]) -or ($global:DhExpectedTransactionId -cnotmatch '^[0-9a-f]{32}$')){throw 'Missing captured transaction ID; rerun the interrupter'};if(($global:DhKilledRunnerPid -isnot [int]) -or ($global:DhKilledRunnerPid -le 0)){throw 'Missing captured killed-runner PID; rerun the interrupter'};$expectedTx=$global:DhExpectedTransactionId;$killedPid=$global:DhKilledRunnerPid;$root=Join-Path $env:LOCALAPPDATA 'DynamicsHelper';$active=Join-Path $root 'updates\active.json';$runnerPath=[IO.Path]::GetFullPath((Join-Path $root 'updates\recovery\dh_update_runner.exe'));$journalPath=Join-Path $root "updates\transactions\$expectedTx\journal.json";$post=@('waiting-for-host-exit','host-backed-up','host-installed','extension-backed-up','extension-installed','metadata-installed','probing','rolling-back');$readExpectedState={if(-not(Test-Path -LiteralPath $active)){throw 'Recovery witness lost active authority'};try{$authority=[IO.File]::ReadAllText($active)|ConvertFrom-Json -ErrorAction Stop}catch{throw 'Malformed or unreadable active authority during recovery witness'};if(($authority.transaction_id -isnot [string]) -or ($authority.transaction_id -cne $expectedTx) -or ($authority.journal_path -isnot [string]) -or ($authority.journal_path -cne "transactions/$expectedTx/journal.json")){throw 'Recovery witness active authority does not match the interrupted transaction'};try{$journal=[IO.File]::ReadAllText($journalPath)|ConvertFrom-Json -ErrorAction Stop}catch{throw 'Malformed or unreadable transaction journal during recovery witness'};$witnessIp=$journal.initiating_process;if(($journal.transaction_id -isnot [string]) -or ($journal.transaction_id -cne $expectedTx) -or ($journal.initiator -isnot [string]) -or ($journal.initiator -cne 'browser') -or ($journal.prior_version -isnot [string]) -or ($journal.prior_version -cne '2.0.74-beta.4') -or ($journal.target_version -isnot [string]) -or ($journal.target_version -cne '2.0.76-beta.1') -or ($null -eq $witnessIp) -or ($witnessIp.pid -isnot [long]) -or ($witnessIp.pid -le 0) -or ($witnessIp.creation_token -isnot [string]) -or ($witnessIp.creation_token -cnotmatch '^win-create-time-[1-9][0-9]*$') -or ($journal.phase -isnot [string]) -or ($post -cnotcontains $journal.phase)){throw 'Recovery witness journal is not the interrupted post-activation transaction'};return $journal};$state=& $readExpectedState;if(@(Get-CimInstance Win32_Process -Filter "Name='dh_update_runner.exe'" -ErrorAction Stop).Count){throw 'Recovery witness must start with zero runners'};[pscustomobject]@{Event='recovery-witness-armed';TransactionId=$expectedTx;KilledRunnerPid=$killedPid;TimeoutSeconds=300}|ConvertTo-Json -Compress;$witnessed=$false;$deadline=[DateTime]::UtcNow.AddMinutes(5);while([DateTime]::UtcNow -lt $deadline){$state=& $readExpectedState;$runners=@(Get-CimInstance Win32_Process -Filter "Name='dh_update_runner.exe'" -ErrorAction Stop);if($runners.Count -eq 0){Start-Sleep -Milliseconds 25;continue};if($runners.Count -ne 1){throw "Recovery witness expected exactly one runner; found $($runners.Count)"};$runner=$runners[0];$cmd=[string]$runner.CommandLine;$recoverPattern='(?i)^\s*(?:"[^"]+"|\S+)\s+--recover-active\s*$';$completePattern='(?i)(?:^|\s)--complete-update(?:\s|$)';if(-not [string]::Equals([string]$runner.ExecutablePath,$runnerPath,[StringComparison]::OrdinalIgnoreCase)){throw 'Recovery runner executable path mismatch'};if([string]::IsNullOrWhiteSpace($cmd) -or ($cmd -notmatch $recoverPattern) -or ($cmd -match $completePattern)){throw 'Recovery runner invocation is not exact recover-active mode'};$recoveryPid=[int]$runner.ProcessId;if($recoveryPid -eq $killedPid){throw 'Recovery runner reused the killed runner PID'};$state=& $readExpectedState;$global:DhRecoveryRunnerPid=$recoveryPid;[pscustomobject]@{Event='recovery-runner-witnessed';TransactionId=$expectedTx;JournalPhase=$state.phase;ExecutablePath=$runnerPath;Mode='recover-active';RunnerPid=$recoveryPid;KilledRunnerPid=$killedPid}|ConvertTo-Json -Compress;$witnessed=$true;break};if(-not $witnessed){throw 'Recovery witness timed out after five minutes without an exact recover-active runner'}
```

Only after `recovery-runner-witnessed` may this attempt continue to terminal
verification. Failure to capture that event is a failed recovery-proof attempt.

Document this Retry table:

| State | Action |
|---|---|
| `activating` or `polling`, no error | Wait for status polling and recovery kick. |
| `reload-pending` or `ack-pending`, no error | Wait; do not click Retry. |
| `reload-pending` or `ack-pending` with `errorCode` | Click Retry cleanup once. |
| `activating` with error and journal post-`prepared` | Click Retry once; it must query status before activation. |
| `preparing` with error or journal still `prepared` | This is not durable-recovery evidence; re-establish A and rerun. |
| `recovery-required` | Gate failure; preserve evidence and use matching installer recovery. |

Every interruption command must:

- validate `active.json` transaction/path authority before reading the journal;
- require journal initiator `browser`, prior `2.0.74-beta.4`, target
  `2.0.76-beta.1`, and a non-empty initiating process in every accepted
  post-activation state;
- prove the sole original runner by exact executable path, exact
  `--complete-update` invocation carrying the same 32-hex transaction ID, exclusion of
  `--recover-active`, and PID, then kill and wait by that PID;
- never kill `prepared`, and classify terminal-before-kill as a missed
  interruption rather than evidence;
- require RunOnce before the kill and at the zero-executor checkpoint;
- preserve the captured transaction/PID across the same PowerShell window and
  require an exact-path `--recover-active` witness with a different PID before
  accepting resumed execution;
- print no complete command line, URL, prompt content, or local storage object;
  and
- never write journal, storage, RunOnce, or any `updates/**` file.

- [ ] **Step 5: Document A installation and environment-handoff gates**

In the cloud-PC setup section, require extracting A and running its `install.bat`.
The `plan-d-a` baseline is valid only after version, capabilities, integrity,
absence of `updates/active.json`, coordinator state exactly `idle`, Analyze, and
Options checks pass. A complete A installer re-establishes the product before
each scenario; it is not a snapshot rollback.

After A installation and browser reload, inspect only safe state fields:

```javascript
const {dh_update_state:s}=await chrome.storage.local.get('dh_update_state'); ({kind:s?.kind,hasUpdateUrl:typeof s?.update?.url==='string',transactionId:s?.transactionId,outcome:s?.outcome,code:s?.code})
```

If the state is `complete`, record its safe fields and confirm
`updates/active.json` is absent. Then remove only that terminal coordinator
record and reload:

```javascript
const {dh_update_state:s}=await chrome.storage.local.get('dh_update_state');if(s?.kind!=='complete')throw new Error('Only a terminal complete state may be cleared');await chrome.storage.local.remove('dh_update_state');chrome.runtime.reload()
```

Reopen Options and require `DH_UPDATE_GET_STATE` to return `idle`. Never clear
`preparing`, `activating`, `polling`, `reload-pending`, `ack-pending`, or
`recovery-required` to force a baseline.

Before every A or B installer invocation, close all Chrome/Edge windows and run:

```powershell
$b=@(Get-Process -Name chrome,msedge -ErrorAction SilentlyContinue);if($b.Count){throw 'Close all Chrome and Edge windows before running the installer'}
```

Extract A into a fresh directory and invoke it:

```powershell
$zip='C:\DH-CloudPC\DynamicsHelper_v2.0.74-beta.4.zip';$extract='C:\DH-CloudPC\A-extracted';if(Test-Path -LiteralPath $extract){Remove-Item -LiteralPath $extract -Recurse -Force};Expand-Archive -LiteralPath $zip -DestinationPath $extract; & "$extract\install.bat"
```

Extract B into a fresh directory for matching-installer Scenario 3:

```powershell
$zip='C:\DH-CloudPC\DynamicsHelper_v2.0.76-beta.1.zip';$extract='C:\DH-CloudPC\B-extracted';if(Test-Path -LiteralPath $extract){Remove-Item -LiteralPath $extract -Recurse -Force};Expand-Archive -LiteralPath $zip -DestinationPath $extract; & "$extract\install.bat"
```

The installer is interactive. Wait for its terminal success or failure message;
do not infer success from files merely appearing.

In a final separately marked section, state that after cloud-PC qualification the
old beta1 workstation remains unchanged as a fallback. Before B is published,
obtain fresh confirmation and either turn off **Receive beta updates** in its
Options page or disable its Dynamics Helper extension. Do not click Update and do
not install A or B there. Migrate the real workload to the cloud PC only after
the qualified B environment remains healthy.

- [ ] **Step 6: Create the sanitized result ledger**

Create `docs/plan-d-pragmatic-cloud-pc-results.md` with this exact structure:

```markdown
# Plan D Pragmatic Cloud PC Results

## Scope

This is a single-user pragmatic gate. Exhaustive cloud-PC fault injection and both
legacy mixed-install directions were not run; existing automated tests cover
those boundaries.

## Artifact Identity

| Artifact | Version | Source commit | ZIP SHA-256 | Result |
|---|---|---|---|---|
| A | `2.0.74-beta.4` | Not recorded | Not recorded | PENDING |
| B | `2.0.76-beta.1` | Not recorded | Not recorded | PENDING |

## Automated Gates

| Gate | Result | Evidence |
|---|---|---|
| Host full suite | PENDING | Not run against B |
| Extension full suite | PENDING | Not run against B |
| Extension production build | PENDING | Not run against B |
| Frozen Host build/probe | PENDING | Not run against B |
| Static/reachability checks | PENDING | Not run against B |

## Cloud PC Scenarios

| Scenario | Baseline | Transaction ID | Terminal state | Versions/integrity | Smoke | Result |
|---|---|---|---|---|---|---|
| Uninterrupted A to B | `plan-d-a` | Not recorded | Not recorded | Not recorded | Not recorded | PENDING |
| Interrupted recovery | `plan-d-a` | Not recorded | Not recorded | Not recorded | Not recorded | PENDING |
| Matching-installer repair | `plan-d-a` | N/A | Not recorded | Not recorded | Not recorded | PENDING |

## Environment Handoff

| Step | Result |
|---|---|
| Keep old beta1 workstation unchanged | PENDING |
| Disable beta updates or extension on old workstation | PENDING |
| Explicit publish approval | PENDING |
| Verify published B asset hash | PENDING |
| Migrate workload to qualified cloud PC | PENDING |

No private URL, query string, customer content, prompt content, token, or full
log belongs in this file.
```

- [ ] **Step 7: Validate and commit operator documentation**

Run:

```powershell
$matches=Select-String -Path "docs/plan-d-pragmatic-cloud-pc-runbook.md","docs/plan-d-pragmatic-cloud-pc-results.md" -Pattern 'https://.*\?|sig=|se=|sp=|sv='; if($matches){$matches;exit 1}
```

Expected: no matches.

Run:

```powershell
git diff --check
```

Review the two files and stage only them:

```powershell
git add -- "docs/plan-d-pragmatic-cloud-pc-runbook.md" "docs/plan-d-pragmatic-cloud-pc-results.md"
```

Commit:

```powershell
git commit -m "docs(update): add pragmatic cloud PC runbook"
```

Update `.superpowers/sdd/plan-d-reliable-update-progress.md` with the new commit and leave it ignored.

## Task 3: Build And Record Current Artifact A

**Files:**
- No tracked files in the product worktree
- Modify: `docs/plan-d-pragmatic-cloud-pc-results.md` only after A has been built and identified
- Modify: `.superpowers/sdd/plan-d-reliable-update-progress.md` (ignored, do not stage)

- [ ] **Step 1: Verify the product worktree is clean**

Run:

```powershell
git status --short
```

Expected: empty output. If not empty, stop; do not build A.

Require the A output path to be absent:

```powershell
$aZip="C:\Users\zhaobo\AppData\Local\Temp\opencode\plan-d-qualified-artifacts\DynamicsHelper_v2.0.74-beta.4.zip"; if(Test-Path -LiteralPath $aZip){throw "Refusing to overwrite existing A artifact: $aZip"}
```

- [ ] **Step 2: Create a temporary A worktree without a branch**

Run from the product worktree:

```powershell
$aRoot="C:\Users\zhaobo\AppData\Local\Temp\opencode\Dynamics-Helper-plan-d-a"; if(Test-Path -LiteralPath $aRoot){throw "A worktree already exists: $aRoot"}; git worktree add --detach $aRoot HEAD
```

Expected: Git creates a detached worktree at the exact reviewed HEAD.

- [ ] **Step 3: Reuse dependencies without copying them into Git**

Run:

```powershell
$aRoot="C:\Users\zhaobo\AppData\Local\Temp\opencode\Dynamics-Helper-plan-d-a"; New-Item -ItemType Junction -Path "$aRoot\host\venv" -Target (Resolve-Path "host/venv") | Out-Null; New-Item -ItemType Junction -Path "$aRoot\extension\node_modules" -Target (Resolve-Path "extension/node_modules") | Out-Null
```

Expected: ignored junctions exist only in the detached A worktree. Do not run `npm install` or `pip install` as part of A qualification.

- [ ] **Step 4: Verify A retains the current committed product identity**

Run:

```powershell
$aRoot="C:\Users\zhaobo\AppData\Local\Temp\opencode\Dynamics-Helper-plan-d-a";git -C $aRoot status --short;$env:PYTHONPATH="$aRoot;$aRoot\host";& "$aRoot\host\venv\Scripts\python.exe" -c "import json;from pathlib import Path;from product_info import VERSION;r=Path(r'$aRoot');p=json.loads((r/'extension/package.json').read_text(encoding='utf-8'));m=json.loads((r/'extension/manifest.json').read_text(encoding='utf-8'));assert VERSION==p['version']==(m.get('version_name') or m['version'])=='2.0.74-beta.4';assert m['version']=='2.0.74';print(VERSION)"
```

Expected: `2.0.74-beta.4` and empty `git status` output. Do not modify or commit A.

- [ ] **Step 5: Run A's focused version and packaging tests**

Run:

```powershell
$aRoot="C:\Users\zhaobo\AppData\Local\Temp\opencode\Dynamics-Helper-plan-d-a";$r=Join-Path 'C:\Users\zhaobo\AppData\Local\Temp\opencode' ('plan-d-a-focused-'+[guid]::NewGuid().ToString('N'));@('local','app','user','home','temp')|ForEach-Object{New-Item -ItemType Directory -Path (Join-Path $r $_)-Force|Out-Null};$env:LOCALAPPDATA="$r\local";$env:APPDATA="$r\app";$env:USERPROFILE="$r\user";$env:HOME="$r\home";$env:TEMP="$r\temp";$env:TMP="$r\temp";Push-Location -LiteralPath $aRoot -ErrorAction Stop;try{$env:PYTHONPATH="$(Resolve-Path '.');$(Resolve-Path 'host')";& "host/venv/Scripts/python.exe" -m unittest host.test_product_info host.test_host_integrity_actions host.test_early_cli host.test_install_integrity host.test_package_manifest host.test_package_archive host.test_release_helper host.test_update_actions;if($LASTEXITCODE -ne 0){throw 'A focused tests failed'}}finally{Pop-Location}
```

Expected: all pass with A's effective version.

- [ ] **Step 6: Build A and create its deterministic ZIP without Git operations**

Run sequentially:

```powershell
$aRoot="C:\Users\zhaobo\AppData\Local\Temp\opencode\Dynamics-Helper-plan-d-a";Push-Location -LiteralPath $aRoot -ErrorAction Stop;try{npm --prefix extension run build;if($LASTEXITCODE -ne 0){throw 'A Extension build failed'}}finally{Pop-Location}
```

```powershell
$aRoot="C:\Users\zhaobo\AppData\Local\Temp\opencode\Dynamics-Helper-plan-d-a";Push-Location -LiteralPath $aRoot -ErrorAction Stop;try{$env:PYTHONPATH="$(Resolve-Path '.');$(Resolve-Path 'host')";& "host/venv/Scripts/python.exe" -c "import release_helper; release_helper.build_host()";if($LASTEXITCODE -ne 0){throw 'A Host build failed'}}finally{Pop-Location}
```

Run the real frozen staged probe against A's exact onedir:

```powershell
$aRoot="C:\Users\zhaobo\AppData\Local\Temp\opencode\Dynamics-Helper-plan-d-a";$r=Join-Path 'C:\Users\zhaobo\AppData\Local\Temp\opencode' ('plan-d-a-frozen-'+[guid]::NewGuid().ToString('N'));@('local','app','user','home','temp')|ForEach-Object{New-Item -ItemType Directory -Path (Join-Path $r $_)-Force|Out-Null};$env:LOCALAPPDATA="$r\local";$env:APPDATA="$r\app";$env:USERPROFILE="$r\user";$env:HOME="$r\home";$env:TEMP="$r\temp";$env:TMP="$r\temp";Push-Location -LiteralPath $aRoot -ErrorAction Stop;try{$env:DH_PLAN_C_FROZEN_ONEDIR=(Resolve-Path 'dist/dh_native_host').Path;$env:PYTHONPATH="$(Resolve-Path '.');$(Resolve-Path 'host')";& "host/venv/Scripts/python.exe" -m unittest host.test_update_recovery.FrozenStagedProbeIntegrationTests.test_complete_built_runtime_starts_and_matches_target_without_live_mutation -v;if($LASTEXITCODE -ne 0){throw 'A frozen probe failed'}}finally{Pop-Location}
```

Expected: `Ran 1 test`, `OK`, no skip.

```powershell
$aRoot="C:\Users\zhaobo\AppData\Local\Temp\opencode\Dynamics-Helper-plan-d-a";$out="C:\Users\zhaobo\AppData\Local\Temp\opencode\plan-d-qualified-artifacts";if(-not(Test-Path -LiteralPath $out)){New-Item -ItemType Directory -Path $out -ErrorAction Stop|Out-Null};Push-Location -LiteralPath $aRoot -ErrorAction Stop;try{$env:PYTHONPATH="$(Resolve-Path '.');$(Resolve-Path 'host')";& "host/venv/Scripts/python.exe" -c "from pathlib import Path; import release_helper; print(release_helper.create_zip('2.0.74-beta.4',source_root=Path.cwd(),output_dir=Path(r'$out')))";if($LASTEXITCODE -ne 0){throw 'A packaging failed'}}finally{Pop-Location}
```

- [ ] **Step 7: Validate A's archive and record its identity**

Run:

```powershell
$aZip="C:\Users\zhaobo\AppData\Local\Temp\opencode\plan-d-qualified-artifacts\DynamicsHelper_v2.0.74-beta.4.zip";$stage="C:\Users\zhaobo\AppData\Local\Temp\opencode\plan-d-a-validated";if(Test-Path -LiteralPath $stage){Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction Stop};$env:PYTHONPATH="$(Resolve-Path '.');$(Resolve-Path 'host')";& "host/venv/Scripts/python.exe" -c "from pathlib import Path; from package_archive import stage_and_validate_archive; p=stage_and_validate_archive(Path(r'$aZip'),Path(r'$stage'),expected_version='2.0.74-beta.4'); assert 'transactional-update-v1' in p.manifest.provided_capabilities; print(p.manifest.package_version)";if($LASTEXITCODE -ne 0){throw 'A archive validation failed'}
```

Only after validation succeeds, compute its identity:

```powershell
$aZip="C:\Users\zhaobo\AppData\Local\Temp\opencode\plan-d-qualified-artifacts\DynamicsHelper_v2.0.74-beta.4.zip";(Get-FileHash -Algorithm SHA256 -LiteralPath $aZip -ErrorAction Stop).Hash.ToLowerInvariant()
```

Expected: `2.0.74-beta.4` and one lowercase 64-hex SHA-256.

Return the command working directory to the product worktree. Update A's row in
`docs/plan-d-pragmatic-cloud-pc-results.md` with source commit, SHA-256, and
`BUILT`; do not record local paths. Stage only the ledger:

```powershell
git add -- "docs/plan-d-pragmatic-cloud-pc-results.md"
```

Commit:

```powershell
git commit -m "docs(update): record current Plan D baseline"
```

- [ ] **Step 8: Remove the detached A worktree**

Run from the product worktree:

```powershell
$aRoot="C:\Users\zhaobo\AppData\Local\Temp\opencode\Dynamics-Helper-plan-d-a"; Remove-Item -LiteralPath "$aRoot\host\venv" -Force; Remove-Item -LiteralPath "$aRoot\extension\node_modules" -Force; git worktree remove --force $aRoot; git worktree prune
```

Keep the ignored A ZIP. Do not republish it.

## Task 4: Create The Traceable B Version Commit

**Files:**
- Modify: `extension/package.json:3`
- Modify: `extension/manifest.json:4,49`
- Modify: `host/product_info.py:11`

- [ ] **Step 1: Obtain explicit B versioning approval**

Present the clean branch state, current A identity, proposed B identity, and the
three files that will change. Use the `question` tool to obtain explicit approval
before changing any product version. Approval to execute earlier tasks is not
approval to version B.

- [ ] **Step 2: Write RED expectations for B's exact product identity**

The carrier-consistency test from Task 1 already proves the carriers agree but intentionally does not pin a release number. Before editing production carriers, run this one-off assertion and confirm it fails:

```powershell
$env:PYTHONPATH="$(Resolve-Path '.');$(Resolve-Path 'host')"; & "host/venv/Scripts/python.exe" -c "import json; from pathlib import Path; from product_info import VERSION; p=json.loads(Path('extension/package.json').read_text(encoding='utf-8')); m=json.loads(Path('extension/manifest.json').read_text(encoding='utf-8')); assert VERSION == p['version'] == (m.get('version_name') or m['version']) == '2.0.76-beta.1'; assert m['version'] == '2.0.76'"
```

Expected: `AssertionError` because the branch still carries `2.0.74-beta.4`.

- [ ] **Step 3: Update only the three B carriers**

Run the reviewed helper functions directly; do not invoke `release_helper.main()`:

```powershell
& "host/venv/Scripts/python.exe" -c "import release_helper as r; r.update_json_version(r.PACKAGE_JSON,'2.0.76-beta.1'); r.update_chrome_manifest_version(r.MANIFEST_JSON,'2.0.76-beta.1'); r.update_python_version(r.HOST_FILE,'2.0.76-beta.1')"
```

- [ ] **Step 4: Verify B identity and exact diff scope**

Run the assertion from Step 1 again. Expected: exit `0`.

Run:

```powershell
git diff --name-only
```

Expected names only:

```text
extension/manifest.json
extension/package.json
host/product_info.py
```

Run focused tests:

```powershell
$r=Join-Path 'C:\Users\zhaobo\AppData\Local\Temp\opencode' ('plan-d-b-focused-'+[guid]::NewGuid().ToString('N')); @('local','app','user','home','temp')|ForEach-Object{New-Item -ItemType Directory -Path (Join-Path $r $_)-Force|Out-Null}; $env:LOCALAPPDATA="$r\local"; $env:APPDATA="$r\app"; $env:USERPROFILE="$r\user"; $env:HOME="$r\home"; $env:TEMP="$r\temp"; $env:TMP="$r\temp"; $env:PYTHONPATH="$(Resolve-Path '.');$(Resolve-Path 'host')"; & "host/venv/Scripts/python.exe" -m unittest host.test_product_info host.test_host_integrity_actions host.test_early_cli host.test_install_integrity host.test_package_manifest host.test_package_archive host.test_release_helper host.test_update_actions
```

- [ ] **Step 5: Commit the version-only B identity**

Inspect `git status`, `git diff`, and `git log --oneline -10`; stage only the
three carrier files:

```powershell
git add -- "extension/package.json" "extension/manifest.json" "host/product_info.py"
```

Commit:

```powershell
git commit -m "chore: prepare v2.0.76-beta.1 candidate"
```

Do not tag or push.

## Task 5: Run Exact-B Automated Gates And Build B Once

**Files:**
- Modify: `docs/plan-d-pragmatic-cloud-pc-results.md`
- Modify: `.superpowers/sdd/plan-d-reliable-update-progress.md` (ignored, do not stage)

- [ ] **Step 1: Create isolated test roots**

Each command in Step 2 creates a unique root containing `local`, `app`, `user`,
`home`, and `temp`, then sets all six environment variables. Never point them at
the real profile.

- [ ] **Step 2: Run the complete Host suite in five disjoint partitions**

For every command below, first set `PYTHONPATH` to the repository root plus
`host`, and set all six profile/temp variables to that partition's fresh
directories from Step 1.

Partition 1:

```powershell
$r=Join-Path 'C:\Users\zhaobo\AppData\Local\Temp\opencode' ('plan-d-b-host1-'+[guid]::NewGuid().ToString('N')); @('local','app','user','home','temp')|ForEach-Object{New-Item -ItemType Directory -Path (Join-Path $r $_)-Force|Out-Null}; $env:LOCALAPPDATA="$r\local"; $env:APPDATA="$r\app"; $env:USERPROFILE="$r\user"; $env:HOME="$r\home"; $env:TEMP="$r\temp"; $env:TMP="$r\temp"; $env:PYTHONPATH="$(Resolve-Path '.');$(Resolve-Path 'host')"; & "host/venv/Scripts/python.exe" -m unittest host.test_analyze_timeout host.test_analyze_full host.test_analyze_flow host.test_analyzer host.test_case_id host.test_config_secrets host.test_debug_prompt_isolation host.test_early_cli host.test_host_integrity_actions host.test_install_integrity host.test_model_config host.test_native_messaging host.test_native_registration host.test_package_archive host.test_package_manifest host.test_pii_scrubber host.test_product_info host.test_prompt_session host.test_prompt_sources host.test_release_helper host.test_sdk_compat host.test_secret_store host.test_session_workspace host.test_version_parse
```

Partition 2:

```powershell
$r=Join-Path 'C:\Users\zhaobo\AppData\Local\Temp\opencode' ('plan-d-b-host2-'+[guid]::NewGuid().ToString('N')); @('local','app','user','home','temp')|ForEach-Object{New-Item -ItemType Directory -Path (Join-Path $r $_)-Force|Out-Null}; $env:LOCALAPPDATA="$r\local"; $env:APPDATA="$r\app"; $env:USERPROFILE="$r\user"; $env:HOME="$r\home"; $env:TEMP="$r\temp"; $env:TMP="$r\temp"; $env:PYTHONPATH="$(Resolve-Path '.');$(Resolve-Path 'host')"; & "host/venv/Scripts/python.exe" -m unittest host.test_early_update_dispatch host.test_update_actions host.test_update_engine_extension host.test_update_engine_host host.test_update_engine_rollback host.test_update_entrypoint host.test_update_journal host.test_update_mutex host.test_update_operation host.test_update_ownership host.test_update_platform host.test_update_status_host host.test_update_support
```

Partition 3:

```powershell
$r=Join-Path 'C:\Users\zhaobo\AppData\Local\Temp\opencode' ('plan-d-b-host3-'+[guid]::NewGuid().ToString('N')); @('local','app','user','home','temp')|ForEach-Object{New-Item -ItemType Directory -Path (Join-Path $r $_)-Force|Out-Null}; $env:LOCALAPPDATA="$r\local"; $env:APPDATA="$r\app"; $env:USERPROFILE="$r\user"; $env:HOME="$r\home"; $env:TEMP="$r\temp"; $env:TMP="$r\temp"; $env:PYTHONPATH="$(Resolve-Path '.');$(Resolve-Path 'host')"; & "host/venv/Scripts/python.exe" -m unittest host.test_update_service
```

Partition 4:

```powershell
$r=Join-Path 'C:\Users\zhaobo\AppData\Local\Temp\opencode' ('plan-d-b-host4-'+[guid]::NewGuid().ToString('N')); @('local','app','user','home','temp')|ForEach-Object{New-Item -ItemType Directory -Path (Join-Path $r $_)-Force|Out-Null}; $env:LOCALAPPDATA="$r\local"; $env:APPDATA="$r\app"; $env:USERPROFILE="$r\user"; $env:HOME="$r\home"; $env:TEMP="$r\temp"; $env:TMP="$r\temp"; $env:PYTHONPATH="$(Resolve-Path '.');$(Resolve-Path 'host')"; & "host/venv/Scripts/python.exe" -m unittest host.test_update_recovery
```

Partition 5, with a 30-minute command timeout:

```powershell
$r=Join-Path 'C:\Users\zhaobo\AppData\Local\Temp\opencode' ('plan-d-b-host5-'+[guid]::NewGuid().ToString('N')); @('local','app','user','home','temp')|ForEach-Object{New-Item -ItemType Directory -Path (Join-Path $r $_)-Force|Out-Null}; $env:LOCALAPPDATA="$r\local"; $env:APPDATA="$r\app"; $env:USERPROFILE="$r\user"; $env:HOME="$r\home"; $env:TEMP="$r\temp"; $env:TMP="$r\temp"; $env:PYTHONPATH="$(Resolve-Path '.');$(Resolve-Path 'host')"; & "host/venv/Scripts/python.exe" -m unittest host.test_update_engine_resume
```

Expected total: all discovered tests pass; the environment-gated frozen selector is the only allowed skip. Record actual counts, not historical expected counts.

- [ ] **Step 3: Run the Extension suite without building candidate bytes**

Run:

```powershell
npm --prefix extension run test:run
```

Expected: all tests and default-item checks pass. The one accepted B production
build occurs in Step 6; do not build candidate bytes in the product worktree.

- [ ] **Step 4: Verify the frozen toolchain before the final B build**

Run:

```powershell
& "host/venv/Scripts/python.exe" -m PyInstaller --version
```

Expected exactly: `6.22.2`.

Do not build the Host in the product worktree. The final detached B build in Step
6 is the only frozen B build accepted for qualification.

- [ ] **Step 5: Run static and reachability checks**

Run:

```powershell
& "host/venv/Scripts/python.exe" -m compileall -q host release_helper.py
```

```powershell
& "extension/node_modules/.bin/tsc.cmd" -p "extension/tsconfig.json" --noEmit
```

```powershell
$tokens=$null; $errors=$null; [System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path -LiteralPath 'installer_core.ps1'),[ref]$tokens,[ref]$errors)|Out-Null; if($errors.Count){$errors|ForEach-Object{$_.ToString()};exit 1}
```

```powershell
git grep -n -E "Updater\(|apply_update\(" -- "*.py"
```

Expected reachability matches only `host/updater.py` and legacy-specific tests; no production call site.

```powershell
git diff --check
```

- [ ] **Step 6: Create B exactly once in an isolated detached worktree**

The product worktree must be clean and at the version commit. Create the detached
B worktree and dependency junctions:

```powershell
$bZip="C:\Users\zhaobo\AppData\Local\Temp\opencode\plan-d-qualified-artifacts\DynamicsHelper_v2.0.76-beta.1.zip"; if(Test-Path -LiteralPath $bZip){throw "Refusing to overwrite existing B artifact: $bZip"}
```

```powershell
$bRoot="C:\Users\zhaobo\AppData\Local\Temp\opencode\Dynamics-Helper-plan-d-b"; if(Test-Path -LiteralPath $bRoot){throw "B worktree already exists: $bRoot"}; git worktree add --detach $bRoot HEAD
```

```powershell
$bRoot="C:\Users\zhaobo\AppData\Local\Temp\opencode\Dynamics-Helper-plan-d-b"; New-Item -ItemType Junction -Path "$bRoot\host\venv" -Target (Resolve-Path "host/venv") | Out-Null; New-Item -ItemType Junction -Path "$bRoot\extension\node_modules" -Target (Resolve-Path "extension/node_modules") | Out-Null
```

Run the final Extension and Host builds:

```powershell
$bRoot="C:\Users\zhaobo\AppData\Local\Temp\opencode\Dynamics-Helper-plan-d-b";Push-Location -LiteralPath $bRoot -ErrorAction Stop;try{npm --prefix extension run build;if($LASTEXITCODE -ne 0){throw 'B Extension build failed'}}finally{Pop-Location}
```

```powershell
$bRoot="C:\Users\zhaobo\AppData\Local\Temp\opencode\Dynamics-Helper-plan-d-b";Push-Location -LiteralPath $bRoot -ErrorAction Stop;try{$env:PYTHONPATH="$(Resolve-Path '.');$(Resolve-Path 'host')";& "host/venv/Scripts/python.exe" -c "import release_helper; release_helper.build_host()";if($LASTEXITCODE -ne 0){throw 'B Host build failed'}}finally{Pop-Location}
```

Before packaging, run the real frozen staged probe against this exact onedir with
fresh isolated profile/temp roots:

```powershell
$bRoot="C:\Users\zhaobo\AppData\Local\Temp\opencode\Dynamics-Helper-plan-d-b";$r=Join-Path 'C:\Users\zhaobo\AppData\Local\Temp\opencode' ('plan-d-b-frozen-'+[guid]::NewGuid().ToString('N'));@('local','app','user','home','temp')|ForEach-Object{New-Item -ItemType Directory -Path (Join-Path $r $_)-Force|Out-Null};$env:LOCALAPPDATA="$r\local";$env:APPDATA="$r\app";$env:USERPROFILE="$r\user";$env:HOME="$r\home";$env:TEMP="$r\temp";$env:TMP="$r\temp";Push-Location -LiteralPath $bRoot -ErrorAction Stop;try{$env:DH_PLAN_C_FROZEN_ONEDIR=(Resolve-Path 'dist/dh_native_host').Path;$env:PYTHONPATH="$(Resolve-Path '.');$(Resolve-Path 'host')";& "host/venv/Scripts/python.exe" -m unittest host.test_update_recovery.FrozenStagedProbeIntegrationTests.test_complete_built_runtime_starts_and_matches_target_without_live_mutation -v;if($LASTEXITCODE -ne 0){throw 'B frozen probe failed'}}finally{Pop-Location}
```

Expected: `Ran 1 test`, `OK`, no skip.

Verify all reviewed hidden imports are present in this exact build graph:

```powershell
$bRoot="C:\Users\zhaobo\AppData\Local\Temp\opencode\Dynamics-Helper-plan-d-b";Push-Location -LiteralPath $bRoot -ErrorAction Stop;try{$env:PYTHONPATH="$(Resolve-Path '.');$(Resolve-Path 'host')";& "host/venv/Scripts/python.exe" -c "import release_helper; from pathlib import Path; text=Path('build/dh_native_host/xref-dh_native_host.html').read_text(encoding='utf-8'); missing=[name for name in release_helper.PYINSTALLER_HIDDEN_IMPORTS if name not in text]; assert not missing,missing; print(f'{len(release_helper.PYINSTALLER_HIDDEN_IMPORTS)}/{len(release_helper.PYINSTALLER_HIDDEN_IMPORTS)}')";if($LASTEXITCODE -ne 0){throw 'B hidden-import graph check failed'}}finally{Pop-Location}
```

Expected: `17/17`.

Verify the exact onedir inventory:

```powershell
$bRoot="C:\Users\zhaobo\AppData\Local\Temp\opencode\Dynamics-Helper-plan-d-b";Push-Location -LiteralPath $bRoot -ErrorAction Stop;try{$env:PYTHONPATH="$(Resolve-Path 'host')";& "host/venv/Scripts/python.exe" -c "from pathlib import Path; from update_recovery import inventory_onedir; i=inventory_onedir(Path('dist/dh_native_host').resolve(strict=True)); print(f'files={len(i.internal_files)} dirs={len(i.internal_directories)}')";if($LASTEXITCODE -ne 0){throw 'B onedir inventory check failed'}}finally{Pop-Location}
```

Record the actual inventory counts.

Package B exactly once:

```powershell
$bRoot="C:\Users\zhaobo\AppData\Local\Temp\opencode\Dynamics-Helper-plan-d-b";$out="C:\Users\zhaobo\AppData\Local\Temp\opencode\plan-d-qualified-artifacts";if(-not(Test-Path -LiteralPath $out)){New-Item -ItemType Directory -Path $out -ErrorAction Stop|Out-Null};Push-Location -LiteralPath $bRoot -ErrorAction Stop;try{$env:PYTHONPATH="$(Resolve-Path '.');$(Resolve-Path 'host')";& "host/venv/Scripts/python.exe" -c "from pathlib import Path; import release_helper; print(release_helper.create_zip('2.0.76-beta.1',source_root=Path.cwd(),output_dir=Path(r'$out')))";if($LASTEXITCODE -ne 0){throw 'B packaging failed'}}finally{Pop-Location}
```

Do not call `create_zip` a second time after identity is recorded.

- [ ] **Step 7: Validate and record B identity**

Run:

```powershell
$bZip="C:\Users\zhaobo\AppData\Local\Temp\opencode\plan-d-qualified-artifacts\DynamicsHelper_v2.0.76-beta.1.zip";$stage="C:\Users\zhaobo\AppData\Local\Temp\opencode\plan-d-b-validated";if(Test-Path -LiteralPath $stage){Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction Stop};$env:PYTHONPATH="$(Resolve-Path '.');$(Resolve-Path 'host')";& "host/venv/Scripts/python.exe" -c "from pathlib import Path; from package_archive import stage_and_validate_archive; p=stage_and_validate_archive(Path(r'$bZip'),Path(r'$stage'),expected_version='2.0.76-beta.1'); assert 'transactional-update-v1' in p.manifest.provided_capabilities; print(p.manifest.package_version)";if($LASTEXITCODE -ne 0){throw 'B archive validation failed'}
```

Only after validation succeeds, compute its identity:

```powershell
$bZip="C:\Users\zhaobo\AppData\Local\Temp\opencode\plan-d-qualified-artifacts\DynamicsHelper_v2.0.76-beta.1.zip";(Get-FileHash -Algorithm SHA256 -LiteralPath $bZip -ErrorAction Stop).Hash.ToLowerInvariant()
```

Expected: `2.0.76-beta.1` and one lowercase 64-hex SHA-256. Record the exact B
commit and hash in `docs/plan-d-pragmatic-cloud-pc-results.md`.

Also record actual automated gate counts. Commit only the ledger:

```powershell
git add -- "docs/plan-d-pragmatic-cloud-pc-results.md"
```

```powershell
git commit -m "docs(update): record Plan D candidate gates"
```

Remove the dependency junctions and detached B worktree, but preserve the ignored
B ZIP unchanged:

```powershell
$bRoot="C:\Users\zhaobo\AppData\Local\Temp\opencode\Dynamics-Helper-plan-d-b"; Remove-Item -LiteralPath "$bRoot\host\venv" -Force; Remove-Item -LiteralPath "$bRoot\extension\node_modules" -Force; git worktree remove --force $bRoot; git worktree prune
```

## Task 6: Privately Host B And Prepare The Empty Cloud PC

**Files:**
- Modify: `docs/plan-d-pragmatic-cloud-pc-results.md` only with non-secret outcomes
- Modify: `.superpowers/sdd/plan-d-reliable-update-progress.md` (ignored, do not stage)

- [ ] **Step 1: Obtain explicit Azure Storage target approval**

Before any cloud mutation, use the `question` tool to ask the user to select an
existing test-only Storage account and private container, or explicitly approve
creating disposable resources. Do not infer a subscription, resource group,
account, or container.

- [ ] **Step 2: Confirm Azure identity and target names**

After the user supplies `$subscriptionId`, `$accountName`, and `$containerName`,
run read-only checks:

```powershell
$subscriptionId=Read-Host 'Azure subscription ID';$accountName=Read-Host 'Existing test-only Storage account name';$containerName=Read-Host 'Existing private test-only container name';$blobName='DynamicsHelper_v2.0.76-beta.1.zip';if(-not $subscriptionId -or -not $accountName -or -not $containerName){throw 'Azure target values are required'}
```

```powershell
az account show --subscription $subscriptionId --output table
```

```powershell
az storage container show --subscription $subscriptionId --account-name $accountName --name $containerName --auth-mode login --query "{name:name,publicAccess:properties.publicAccess}" --output json
```

Expected: the selected container name and `publicAccess: null`. Stop if the
container is not private and test-only.

- [ ] **Step 3: Upload only B and create a short-lived read-only URL**

Use Azure CLI with Entra authentication. `$blobName` is already fixed to
`DynamicsHelper_v2.0.76-beta.1.zip`. Upload with overwrite disabled:

```powershell
az storage blob upload --subscription $subscriptionId --account-name $accountName --container-name $containerName --name $blobName --file "C:\Users\zhaobo\AppData\Local\Temp\opencode\plan-d-qualified-artifacts\DynamicsHelper_v2.0.76-beta.1.zip" --auth-mode login --overwrite false --output none
```

Generate a blob-scoped, read-only user-delegation SAS ending four hours from now:

```powershell
$expiry=(Get-Date).ToUniversalTime().AddHours(4).ToString('yyyy-MM-ddTHH:mmZ'); $sas=az storage blob generate-sas --subscription $subscriptionId --account-name $accountName --container-name $containerName --name $blobName --permissions r --expiry $expiry --https-only --auth-mode login --as-user --output tsv; if(-not $sas){throw 'SAS generation failed'}; $privateBUrl="https://$accountName.blob.core.windows.net/$containerName/$blobName`?$sas"
```

Do not echo the resulting full URL into chat, shell history, source files, or the
result ledger. Store it only in a process environment variable or paste it
directly into the cloud-PC prompt.

- [ ] **Step 4: Confirm the cloud PC is still safe to use**

Require the user to confirm immediately before transfer that the cloud PC is
still effectively empty and that no current workload or customer data has been
migrated. If that is no longer true, stop and use a separate disposable test
machine.

Use the `question` tool to obtain explicit approval to copy artifacts, run A/B
installers, change cloud-PC Native Messaging registration, and terminate its
test update processes. Earlier design or plan approval is not installation
approval.

- [ ] **Step 5: Transfer A/B and establish `cloud-clean`**

Connect to the cloud PC with local-drive redirection enabled. In File Explorer,
copy A and B from the redirected build-workstation drive into
`C:\DH-CloudPC`. Do not run either installer directly from the redirected drive.
B's local copy is used only for matching-installer Scenario 3; transactional
Scenarios 1-2 must download B through the private HTTPS URL.

On the cloud PC, run the two artifact identity commands from the runbook and
compare them character-for-character with the ledger. Stop on any mismatch.
Install browser/Copilot prerequisites and record `cloud-clean`.

- [ ] **Step 6: Install A and establish `plan-d-a`**

Follow `docs/plan-d-pragmatic-cloud-pc-runbook.md`. Run A's complete installer,
verify production registration, versions, capabilities, integrity, synthetic
Analyze, and Options persistence. Verify `updates/active.json` is absent and
coordinator state is exactly `idle` with no retained update URL before recording
`plan-d-a`. Record no private URL.

For every Analyze smoke check, use only the designated non-customer Dynamics
test case. Record only PASS/FAIL; do not copy its identifier, input, output,
generated report, telemetry, or screenshot into Git or chat.

Update the ledger's A setup note without changing its artifact hash.

## Task 7: Execute The Three Cloud PC Scenarios

**Files:**
- Modify: `docs/plan-d-pragmatic-cloud-pc-results.md`
- Modify: `.superpowers/sdd/plan-d-reliable-update-progress.md` (ignored, do not stage)

- [ ] **Step 1: Run uninterrupted A-to-B**

Start from verified `plan-d-a`. Follow the runbook's private candidate injection
and payload-free start commands. Record the transaction ID before
activation/reload removes transient state. Wait for `complete/committed`, verify
exact B versions/integrity, and perform Analyze/Options smoke checks.

If state becomes `recovery-required`, Host/Extension versions disagree, integrity
fails, or UI reports success before terminal verification, mark FAIL and stop.
Preserve `%LOCALAPPDATA%\DynamicsHelper\updates`; do not try to force the next
scenario.

- [ ] **Step 2: Run interrupted recovery**

After Scenario 1, run the complete A installer and verify the full `plan-d-a`
baseline contract. Start the runbook's process/timeline watchers and one-shot
post-activation interrupter, then start a fresh A-to-B transaction. Accept the
interruption only when it reports `original-runner-killed` after proving the
sole exact-path runner is the original `--complete-update` process carrying the
same 32-hex transaction ID, not `--recover-active`, and the journal is
post-activation nonterminal.
Within ten seconds, exit all browser windows and terminate a remaining main
Host. In the same PowerShell window, verify the zero-executor checkpoint using
the captured transaction ID and killed runner PID: browser, main Host, runner,
and killed-PID counts are zero; the same active authority and post-activation
journal remain; and RunOnce is still armed.

Before reopening the browser, start the runbook's five-minute recovery witness.
Only after it reports `recovery-witness-armed`, reopen the same browser profile
and Options without changing state or sending a manual ping. Require
`recovery-runner-witnessed` for the same transaction: exact recovery executable
path, exact `--recover-active` mode, and a runner PID different from the killed
runner PID. Failure to capture this witness is a failed recovery-proof attempt;
process-name or timeline output alone is not sufficient.

Pass only if the same transaction ID reaches complete B/committed or complete
A/rolled-back, versions match, integrity verifies, and Analyze/Options smoke
checks pass. A failed update must not display success. If the interrupter sees
only `prepared`, misses the original runner, or observes a terminal journal
before the kill, mark the attempt inconclusive, re-establish A with the complete
installer, and rerun; none of those outcomes is a pass or recovery evidence.

- [ ] **Step 3: Run matching-installer repair**

After Scenario 2 reaches a terminal verified product, run the complete A
installer and verify the full `plan-d-a` baseline contract. Install the exact B
ZIP locally, verify B, create the `_internal` sentinel, rerun the same B
installer, and confirm the sentinel is gone. Compare backups of `config.json`,
`copilot-instructions.md`, and `user_prompt.md` byte-for-byte when each file
exists. Run final B integrity and smoke checks.

Inspect a sanitized storage projection and require that no update URL is retained
after this installer-established B state:

```javascript
const {dh_update_state:s}=await chrome.storage.local.get('dh_update_state'); ({kind:s?.kind,hasUpdateUrl:typeof s?.update?.url==='string',transactionId:s?.transactionId,outcome:s?.outcome})
```

Expected: `hasUpdateUrl` is `false`. If it is `true`, do not print the value;
remove only the already-terminal coordinator record, reload the extension, and
verify a safe idle state:

```javascript
await chrome.storage.local.remove('dh_update_state'); chrome.runtime.reload()
```

This cleanup is allowed only after the transaction has finalized and the exact B
installer has established a verified product. It is forbidden during a
nonterminal or recovery-required state.

- [ ] **Step 4: Finalize the cloud-PC ledger**

Fill every cloud-PC result row with PASS/FAIL and sanitized evidence. Run:

```powershell
$matches=Select-String -Path "docs/plan-d-pragmatic-cloud-pc-results.md" -Pattern 'https://.*\?|[?&](sig|se|sp|sv)='; if($matches){$matches;exit 1}
```

Expected: no URL with a query string or SAS parameter. Manually inspect the
entire short ledger for customer content, prompt content, tokens, and full logs.

Commit the result ledger only if all three scenarios pass:

```powershell
git add -- "docs/plan-d-pragmatic-cloud-pc-results.md"
```

```powershell
git commit -m "docs(update): record pragmatic cloud PC qualification"
```

If any scenario fails, leave publication blocked, record a sanitized failure, and do not proceed to Task 8.

- [ ] **Step 5: Revoke private distribution and remove cloud test data**

User-delegation SAS tokens cannot be individually revoked without revoking the
delegation key; their four-hour expiry is the normal boundary. Immediately delete
the B blob:

```powershell
az storage blob delete --subscription $subscriptionId --account-name $accountName --container-name $containerName --name $blobName --auth-mode login --output none
```

Confirm the blob no longer exists:

```powershell
$exists=az storage blob exists --subscription $subscriptionId --account-name $accountName --container-name $containerName --name $blobName --auth-mode login --query exists --output tsv; if($exists -ne 'false'){throw 'Private B blob still exists'}
```

Do not delete the local qualified B ZIP.

## Task 8: Freeze The Old Workstation And Approve Environment Handoff

**Files:**
- Modify: `docs/plan-d-pragmatic-cloud-pc-results.md`
- Modify: `.superpowers/sdd/plan-d-reliable-update-progress.md` (ignored, do not stage)

- [ ] **Step 1: Ask for explicit old-workstation freeze approval**

Present the passed cloud-PC evidence and A/B hashes. Ask whether to disable
**Receive beta updates** in Options or disable the old workstation's Dynamics
Helper extension. Do not treat approval of this implementation plan as approval
to change that workstation.

- [ ] **Step 2: Freeze the old beta1 workstation**

After approval, perform only the selected UI action. Do not click Update, run an
installer, edit Native Messaging registration, or delete any installation data.

- [ ] **Step 3: Verify the fallback remains beta1**

Read the old workstation's displayed Extension version and confirm it remains
`v2.0.75-beta.1`. Confirm the selected beta/extension setting is disabled. Do not
send an update request.

- [ ] **Step 4: Record the environment handoff readiness**

Record PASS/FAIL in the ledger. Stage only the ledger:

```powershell
git add -- "docs/plan-d-pragmatic-cloud-pc-results.md"
```

```powershell
git commit -m "docs(update): record environment handoff readiness"
```

## Task 9: Publication And Primary-Environment Handoff

**Files:**
- Modify: `docs/plan-d-pragmatic-cloud-pc-results.md`
- Modify: `releases/notes-prompt-scope-cleanup-draft.md`
- Modify: `.superpowers/sdd/plan-d-reliable-update-progress.md` (ignored, do not stage)

- [ ] **Step 1: Run the publication preflight without rebuilding B**

Verify:

- branch and candidate commit are the recorded B lineage;
- worktree is clean;
- all ledger gates are PASS;
- local B ZIP SHA-256 equals the qualified hash;
- A is not republished as a release;
- `v2.0.76-beta.1` does not already exist locally or remotely; and
- release notes state the pragmatic cloud-PC scope and residual automated-only coverage.

Do not run `release_helper.py`; it would rebuild and invalidate B's identity.

- [ ] **Step 2: Finalize and commit release notes before publication**

Replace the entire existing `## Verification` section, through the line before
`## Upgrade notes`, with this exact text. Do not retain historical count bullets
or the obsolete statement that disposable-VM recovery remains unrun:

```markdown
## Verification

Final B candidate verification passed the complete Host and Extension suites,
the production Extension build, TypeScript/Python/PowerShell static checks,
exact PyInstaller 6.22.2 frozen build, all 17 reviewed hidden imports, and the
real frozen staged-probe integration.

Plan D pragmatic qualification covered an uninterrupted controlled A-to-B update,
an exact original-runner interruption followed by same-transaction recovery, and
a matching-installer `_internal` repair on an effectively empty cloud PC.
Exhaustive copy-fault, rollback-failure, unsafe-package, state-machine, and both
legacy mixed-install boundaries remained automated-test-only coverage.
```

Run the release-note and ledger secret scans plus `git diff --check`. Stage only
the release notes and commit:

```powershell
git add -- "releases/notes-prompt-scope-cleanup-draft.md"
```

```powershell
git commit -m "docs(release): finalize v2.0.76-beta.1 notes"
```

- [ ] **Step 3: Ask for explicit tag/push/publish approval**

Present the exact commit, B ZIP path/hash, release-note path, and proposed GitHub commands. Wait for explicit approval. This is mandatory even if the user approved every earlier task.

- [ ] **Step 4: Tag and publish the already-qualified B bytes**

After approval only, let `$candidateCommit` be the exact commit recorded in the
ledger. Load and verify it:

```powershell
$candidateCommit=(Read-Host 'Paste the exact B candidate commit from the ledger').Trim();git cat-file -e "$candidateCommit`^{commit}";if($LASTEXITCODE -ne 0){throw 'Invalid candidate commit'}
```

Run these independently:

```powershell
git tag "v2.0.76-beta.1" $candidateCommit
```

```powershell
git push -u origin hardening/plan-d-runtime-installer
```

```powershell
git push origin "v2.0.76-beta.1"
```

```powershell
gh release create "v2.0.76-beta.1" "C:\Users\zhaobo\AppData\Local\Temp\opencode\plan-d-qualified-artifacts\DynamicsHelper_v2.0.76-beta.1.zip" --title "v2.0.76-beta.1" --notes-file "releases/notes-prompt-scope-cleanup-draft.md" --prerelease --verify-tag
```

Do not invoke any command that rebuilds B.

- [ ] **Step 5: Verify the published asset and keep the cloud PC on qualified B**

Download the published GitHub asset to a new temporary path:

```powershell
$download="C:\Users\zhaobo\AppData\Local\Temp\opencode\plan-d-published-b";if(Test-Path -LiteralPath $download){throw "Published-asset verification directory already exists: $download"};New-Item -ItemType Directory -Path $download|Out-Null;gh release download "v2.0.76-beta.1" --pattern "DynamicsHelper_v2.0.76-beta.1.zip" --dir $download
```

Verify its SHA-256 equals the qualified B hash recorded in the ledger:

```powershell
$qualifiedHash=(Read-Host 'Paste the qualified B SHA-256 from the ledger').Trim().ToLowerInvariant();$publishedHash=(Get-FileHash -Algorithm SHA256 -LiteralPath "C:\Users\zhaobo\AppData\Local\Temp\opencode\plan-d-published-b\DynamicsHelper_v2.0.76-beta.1.zip").Hash.ToLowerInvariant();if($qualifiedHash -notmatch '^[0-9a-f]{64}$' -or $publishedHash -cne $qualifiedHash){throw "Published B hash mismatch"};$publishedHash
```

Do not update or reinstall the cloud PC; it already runs the exact qualified B
bytes. Re-run cloud-PC B version, integrity, Analyze, and Options checks.

- [ ] **Step 6: Obtain workload-handoff approval and record final delivery status**

Only after the cloud PC remains healthy on B, present that evidence and use the
`question` tool to obtain explicit approval for workload handoff. Workload
migration itself is user-operated unless its exact scope is separately designed
and approved. After the user confirms migration is complete, update the result
ledger and ignored progress log. Do not rewrite the already published release
notes. Run final secret scans and `git diff --check`, then commit the tracked
ledger:

```powershell
git add -- "docs/plan-d-pragmatic-cloud-pc-results.md"
```

```powershell
git commit -m "docs(update): record first Plan D delivery"
```

Do not claim the final delivery gate complete unless the published asset hash
matches qualified B, the cloud PC remains healthy, the old workstation remains
frozen at beta1, and all evidence is sanitized.

## Plan Self-Review

- **Spec coverage:** Tasks 3-5 establish immutable A/B artifacts and automated evidence; Tasks 6-7 cover the three approved cloud-PC scenarios; Task 8 freezes the old beta1 fallback; Task 9 publishes exact B bytes, verifies their public identity, and hands the workload to qualified B.
- **Scope:** No production endpoint override, fault hook, cloud-PC harness, mixed-state constructor, or evidence collector is introduced.
- **Safety:** Azure Storage mutation, cloud-PC installation, old-workstation preference/extension change, publication, and workload migration each have separate explicit approval gates.
- **Artifact identity:** B is built once, identified by SHA-256, and never rebuilt between qualification and publication.
- **Residual risk:** Exhaustive cloud-PC fault and mixed-state coverage is explicitly excluded and remains backed by automated tests.
