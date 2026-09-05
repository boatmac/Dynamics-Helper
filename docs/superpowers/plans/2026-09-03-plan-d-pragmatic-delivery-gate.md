# Plan D Pragmatic Delivery Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Historical goal:** Qualify one immutable candidate through automated gates and
three pragmatic empty-cloud-PC scenarios. The beta1 publication portion is
superseded; only a separately qualified and approved B2 may proceed to any later
publication or environment handoff.

**Superseding qualification note (2026-09-05):** The private
`2.0.76-beta.1` transaction committed successfully, but that candidate is
DISQUALIFIED because its completion notice replayed permanently. It remains
unpublished historical evidence and must never be tagged or published. Formal
qualification now runs B1 `2.0.76-beta.1` -> B2 `2.0.76-beta.2`; historical A
`2.0.74-beta.4` is retained evidence only and is not rerun. Task 5 supplies the
exact B2 artifact commands after its immutable build. Where this historical plan
still names A/B or beta1 commands, this note and the committed runbook's B1/B2
contract govern; do not execute obsolete candidate commands.

The corrected completion acceptance requires the terminal banner and FAB bubble
to remain visible before 8000 milliseconds, then disappear only after the
Service Worker's authoritative ACK transition and stay absent across FAB/Options
refresh. Committed state must become idle with no private URL; rolled-back state
must become available with ordinary Retry. Qualification, tag/push/publication,
and workload handoff each require separate explicit approval.

**Architecture:** First remove test fixtures that incorrectly couple current-product tests to `2.0.74-beta.4`. Then add documentation-only operator artifacts: one exact cloud-PC runbook and one concise result ledger. Build A from the current committed `2.0.74-beta.4` product without rewriting its version, commit B (`2.0.76-beta.1`) on the product branch, build B exactly once from a clean detached worktree, and identify both ZIPs by SHA-256. No product fault hook, alternate update endpoint, cloud-PC harness, mixed-state constructor, evidence collector, public release, tag, or old-workstation install is added or performed without its explicit gate.

The preceding architecture paragraph is historical provenance only. It does not
authorize rebuilding A/B1 or using beta1 as the current candidate; B2 artifact
construction and execution are delegated to Task 5.

**Tech Stack:** Python 3.13, unittest, React 19, TypeScript 5.9, Vitest 3, Chrome/Edge MV3 DevTools, PowerShell 7, PyInstaller 6.22.2, Git worktrees, an effectively empty Windows cloud PC, private Azure Blob HTTPS URL.

---

## Execution Rules

- Work only on `hardening/plan-d-runtime-installer` until a task explicitly creates an isolated worktree.
- Never run the `release_helper.py VERSION` CLI in this plan. Its CLI commits and tags before building.
- Never stage or commit `host/venv`, `build/`, `dist/`, `extension/dist/`, ZIP files, SAS URLs, cloud-PC screenshots, or unredacted logs.
- Never run an installer, change Native Messaging registration, mutate `%LOCALAPPDATA%\DynamicsHelper`, terminate production processes, create a tag, push, or publish before its explicit manual gate. Cloud-PC installation steps are allowed only while that machine remains free of the migrated workload. The old workstation is read-only except for disabling its beta preference or extension after a separate confirmation.
- Every Host process used by automated tests receives fresh existing `LOCALAPPDATA`, `APPDATA`, `USERPROFILE`, `HOME`, `TEMP`, and `TMP` directories.
- Run long Host partitions and the Extension suite sequentially. Do not run `npm run test:run` concurrently with `npm run build`; the FAB page-identity tests have a five-second timing budget.
- A is not republished. B1 must not be published. B2 may be published only as
  exact qualified bytes after separate explicit tag/push/publication approval;
  qualification and workload handoff are separate approvals.

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

Tasks 1-4 below are completed historical records. Their commands document how
that evidence was produced; they are not current instructions and must not be
rerun for B2 qualification. Any preserved unchecked boxes are archival text, not
outstanding work.

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

Create `docs/plan-d-pragmatic-cloud-pc-runbook.md`. It must use these section
names so later tasks have stable operator references:

- `Safety Contract`
- `Scope And Evidence Rules`
- `Qualification Entry Gate`
- `Empty-Cloud-PC Marker`
- `Artifact Identity`
- `Installer Commands`
- `Establish plan-d-a`
- `Controlled Candidate Start`
- `Terminal Verification And Cleanup`
- `Scenario 1: Uninterrupted A To B`
- `Scenario 2: Interrupted Recovery`, with `Read-Only Watchers`, `One-Shot
  Original-Runner Interruption`, `Zero-Executor Checkpoint`, `Recovery-Runner
  Witness`, and `Retry Rules`
- `Scenario 3: Matching-Installer Repair`
- `Environment Handoff`

Open with this contract:

```markdown
# Plan D Pragmatic Cloud PC Runbook

## Safety Contract

- Run installer/process/registry steps only on the effectively empty cloud PC.
- Do not install A or B on the old beta1 workstation.
- Do not migrate the current workload to the cloud PC until all three scenarios
  pass.
- Historical A is `2.0.74-beta.4` and is not rerun; B1
  `2.0.76-beta.1` is the installed baseline/rollback prior; B2
  `2.0.76-beta.2` is the qualification target.
- Keep **Receive beta updates** disabled on A so public `v2.0.75-beta.1`
  cannot replace the manually controlled B candidate.
- Never paste the private B URL into this file, Git, screenshots, or results.
- Use only the designated non-customer Dynamics test case for Analyze smoke;
  record PASS/FAIL only, never its case ID, content, report, or screenshots.
- Never delete `%LOCALAPPDATA%\DynamicsHelper\updates` during recovery.
- Historical instruction superseded: never publish B1; never publish, tag,
  push, or rebuild B2 while qualification is active.
- Do not perform any cloud-PC operation until A/B identities are complete and
  all five Automated Gates in the result ledger are `PASS`.
- Stop immediately if the observed starting version, ZIP SHA-256, Native Host
  registration target, or transaction ID differs from the result ledger.
```

State that the cloud PC is effectively empty and has no snapshot. Every
scenario re-establishes `plan-d-a` with the complete A installer; no scenario
uses snapshot rollback. Copy A and B through local-drive redirection into
`C:\DH-CloudPC`, and never execute an archive, script, or installer from a
redirected drive. The old workstation remains unchanged and must never receive
A or B.

In `Qualification Entry Gate`, require a read-only fail-closed check before
connecting to or changing the cloud PC. A/B version cells must exactly match the
reviewed versions, source commits must be lowercase 7-40 hex, ZIP SHA-256 values
must be lowercase 64-hex, and artifact Result must be non-empty and contain none
of `PENDING`, `Not recorded`, or `Not run`. Each of these five rows must have
Result exactly `PASS` and non-empty Evidence containing none of those three
phrases: Host full suite, Extension full suite, Extension production build,
Frozen Host build/probe, and Static/reachability checks.

In `Empty-Cloud-PC Marker`, require explicit operator confirmation that the
machine is still effectively empty and contains no customer workload before
creating `C:\DH-CloudPC\PLAN_D_EMPTY_CLOUD_PC.marker`. Its exact no-BOM content
is the UTF-8 no-BOM bytes of `PLAN_D_EFFECTIVELY_EMPTY_CLOUD_PC_V1`. Creation
must use those raw bytes. Establishment and every marker guard must use
`ReadAllBytes` plus exact length and byte-sequence equality; text decoding or
`ReadAllText` is forbidden. Existing different bytes, a missing marker, or a
non-file marker fail closed. Every installer invocation and every command that
can terminate a browser, Host, or runner must validate those exact bytes before
any other effect.

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
The runbook must additionally require a successful `get_capabilities` response
containing `transactional-update-v1`, a packaged/verified
`verify_installation` response, exact matching Host/Extension versions, and a
production Native Messaging registration rooted at
`%LOCALAPPDATA%\DynamicsHelper`.

- [ ] **Step 3: Document exact DevTools update commands**

State that these commands run in the installed A **Options page DevTools
console**, where `window.prompt()` is available, only after the complete
`plan-d-a` baseline has returned public `DH_UPDATE_GET_STATE` `idle`. Keep that
Options page and console open. Use a local variable for the secret URL and never
print the complete state object:

```javascript
const privateBUrl = window.prompt('Paste the short-lived private B ZIP URL'); if (!privateBUrl) throw new Error('Private B URL is required')
```

```javascript
await chrome.storage.local.remove('pending_update'); await chrome.storage.local.set({dh_update_state:{kind:'available',update:{version:'2.0.76-beta.1',url:privateBUrl,isPrerelease:true}}}); const {dh_update_state:s}=await chrome.storage.local.get('dh_update_state'); ({kind:s?.kind,version:s?.update?.version,isPrerelease:s?.update?.isPrerelease,errorCode:s?.errorCode})
```

Require the seed projection to be `available` at `2.0.76-beta.1`. Immediately
open `edge://extensions` in another tab, open **Dynamics Helper**, open its
**Service Worker** inspector, and use the **Application** pane's **Stop**
control. The mandatory order is seed first, then Stop; never Stop before the
seed. Do not use the Extension **Reload** control or **Unregister**.

Return to the same already-open Options page and DevTools console. Document that
the following public request wakes a new normal Worker and verifies the hydrated
candidate:

```javascript
const r=await chrome.runtime.sendMessage({type:'DH_UPDATE_GET_STATE'}); ({handled:r?.handled,kind:r?.state?.kind,version:r?.state?.update?.version,errorCode:r?.state?.errorCode})
```

Require `handled: true`, `kind: 'available'`, and version `2.0.76-beta.1`. If
the result is `idle`, do not start: re-establish a fresh `plan-d-a`/`idle`
baseline, prompt for and re-enter the SAS URL, seed again, and only then Stop
the Worker. Explain that `chrome.runtime.reload()` is forbidden for private
candidate acceptance because Extension reload triggers `onInstalled`, which
sends `check_updates`, and a public `update_not_available` response clears the
manual `available` state. Dynamic `import()`, debugger/minified aliases, and
product backdoors are also forbidden; use only Edge's normal Worker Stop.

Register a sanitized storage listener before starting so the transaction ID is
captured without printing `update.url`:

```javascript
globalThis.dhUpdateWatch=(changes,area)=>{const s=changes.dh_update_state?.newValue;if(area==='local'&&s)console.log({kind:s.kind,transactionId:s.transactionId,targetVersion:s.targetVersion,outcome:s.outcome,code:s.code,errorCode:s.errorCode})}; chrome.storage.onChanged.addListener(globalThis.dhUpdateWatch)
```

```javascript
void chrome.runtime.sendMessage({type:'DH_UPDATE_START'}).then(r=>{const s=r?.state;console.log({handled:r?.handled,kind:s?.kind,transactionId:s?.transactionId,targetVersion:s?.targetVersion,outcome:s?.outcome,code:s?.code,errorCode:s?.errorCode})}).catch(()=>console.error('Update start request disconnected'))
```

After any transaction-driven terminal reload, reopen Options DevTools and
inspect only safe fields:

```javascript
const {dh_update_state:s}=await chrome.storage.local.get('dh_update_state'); ({kind:s?.kind,transactionId:s?.transactionId,targetVersion:s?.targetVersion,outcome:s?.outcome,code:s?.code,errorCode:s?.errorCode,version:s?.update?.version})
```

Every safe `dh_update_state` projection in candidate seeding, baseline,
`DH_UPDATE_GET_STATE`, storage watching, `DH_UPDATE_START`, transaction-driven
terminal reload, terminal verification, and Scenario 3 cleanup must include
`errorCode`. It may include
`hasUpdateUrl`, but must never print `update.url`, a complete state object, or a
thrown message that could contain the URL. Require the operator to copy only
reviewed safe fields into the ledger.

- [ ] **Step 4: Document the three cloud-PC scenarios exactly**

For every scenario, require the complete `plan-d-a` baseline, the installer
recovery order, explicit stop conditions, matching Host/Extension versions,
verified integrity, Analyze `PASS`, and Options `PASS`.

`Scenario 1: Uninterrupted A To B` must accept only
`complete/committed B` at `2.0.76-beta.1`. It must preserve the transaction ID
before reload removes transient state, prove final authority/workspace/cursor
cleanup, and reject rollback, `recovery-required`, version disagreement,
integrity failure, or premature success UI.

`Scenario 2: Interrupted Recovery` must require:

- a mandatory read-only timeline watcher that emits only authority,
  transaction, phase, and PIDs;
- an optional process-start watcher that prints only safe process mode/PIDs,
  requires CIM event permission, and exits with a fixed safe diagnostic on
  Access Denied or unavailable CIM events; watcher unavailability is not a gate
  failure because the mandatory recovery witness polls independently;
- a one-shot PowerShell 7 interrupter started before `DH_UPDATE_START`, with a
  ten-minute deadline and the strict empty-cloud-PC marker guard as its first
  guard;
- strict `active.json` lowercase 32-hex transaction/path authority validation
  before every journal read, and a browser-owned journal with prior
  `2.0.74-beta.4`, target `2.0.76-beta.1`, a non-empty initiating-process
  identity, and a post-`prepared` nonterminal phase;
- no kill while the journal is `prepared`; terminal-before-kill is a missed
  interruption, not evidence;
- RunOnce armed before the kill; exactly one runner whose executable is exactly
  `%LOCALAPPDATA%\DynamicsHelper\updates\recovery\dh_update_runner.exe`, whose
  command is canonical `--complete-update` with the same transaction and
  initiating-process identity, and which does not contain `--recover-active`;
- PID-only termination of that proven runner, wait-for-exit, and preservation
  in the same PowerShell window of transaction ID, killed PID, and
  `$global:DhKilledAtUtc=[DateTime]::UtcNow`;
- marker-guarded browser termination and marker-guarded main-Host termination;
  main Host selection must use `Win32_Process`/CIM and an exact
  `%LOCALAPPDATA%\DynamicsHelper\dh_native_host.exe` `ExecutablePath`, then stop
  only the selected PID; no name-only Host kill is allowed;
- a zero-executor checkpoint in the same PowerShell window that validates the
  strict marker first, then the captured transaction, PID, and UTC kill time
  before any five-second stability wait; its pre-wait UTC delta must be `0..10`
  seconds, then it must prove no browser, exact-path main Host, runner, or killed
  PID remains while the same active/journal authority and armed RunOnce persist;
  output only safe elapsed seconds and reviewed identifiers;
- a five-minute recovery witness started before reopening the browser; it must
  validate the strict marker first, revalidate the same active/journal authority,
  and capture exactly one runner at the exact recovery path with an
  executable-plus-`--recover-active` command, excluding `--complete-update`, and
  a PID different from the killed PID; and
- acceptance only of `complete/committed B` or `complete/rolled-back A` under
  the same transaction, with matching versions and verified integrity.

Every command that terminates a browser, Host, or runner must begin with the
strict marker guard. Interruption commands must print no full command line, URL,
prompt content, complete local-storage object, or unreviewed error message, and
must never write a journal, storage record, RunOnce value, or `updates/**` file.
The Retry table must select actions from `kind` plus the safe `errorCode` field:
wait for `activating`/`polling` and error-free reload/ack phases; retry cleanup
once for reload/ack with `errorCode`; retry activation once only for
post-`prepared` activation with `errorCode`; classify preparing error or
`prepared` as not recovery evidence; and fail the gate on `recovery-required`.

`Scenario 3: Matching-Installer Repair` must re-establish A, then before the
first B installer compute an in-memory map for each existing user-owned
`config.json`, `copilot-instructions.md`, and `user_prompt.md`. Store only the
file-name set and lowercase SHA-256 values in that PowerShell session; print
only a file count and never persist or record names, content, or hashes. Install
B, create the sentinel, run the exact B installer again, and verify sentinel
removal:

```powershell
$sentinel="$env:LOCALAPPDATA\DynamicsHelper\_internal\dh-cloud-pc-sentinel.txt"; [System.IO.File]::WriteAllText($sentinel,'remove me'); Test-Path -LiteralPath $sentinel
```

```powershell
Test-Path -LiteralPath "$env:LOCALAPPDATA\DynamicsHelper\_internal\dh-cloud-pc-sentinel.txt"
```

Expected before reinstall: `True`; after reinstall: `False`.

After the second B installer, recompute the same three-file map and require the
same set and hashes. Then require B versions/integrity, Analyze/Options `PASS`,
and a safe storage projection containing `errorCode` and boolean
`hasUpdateUrl`. Final state must have `hasUpdateUrl: false`, no `errorCode`, and
public `DH_UPDATE_GET_STATE` `idle`. A terminal `complete` record may be cleared
only after `updates/active.json` is absent, using a guard that rechecks
`kind === 'complete'`; any nonterminal or `recovery-required` state must not be
cleared. Record Scenario 3 terminal state as `installer-repaired B`.

For integrity/capability inspection, document sending ordinary Native messages from the **Options page DevTools console**, not the Service Worker console:

```javascript
await chrome.runtime.sendMessage({type:'NATIVE_MSG',payload:{action:'get_capabilities'}})
```

```javascript
await chrome.runtime.sendMessage({type:'NATIVE_MSG',payload:{action:'verify_installation'}})
```

- [ ] **Step 5: Document A installation and environment-handoff gates**

In `Installer Commands`, require both A and B commands to begin with the strict
cloud-PC marker guard and independently prove Chrome/Edge, every main Host, and
every update runner are absent before invocation. Delete an existing extraction
directory with `Remove-Item ... -ErrorAction Stop`, expand the recorded ZIP into
a fresh local directory with `Expand-Archive ... -ErrorAction Stop`, require
`installer_core.ps1` to exist, and run it directly through
`pwsh -NoProfile -ExecutionPolicy Bypass -File`. Capture/display stdout, capture
the native exit code immediately, and fail unless it is `0` and normalized
stdout contains the exact preselected existing marker: `SUCCESS: Installation
Complete!` for a fresh install or `SUCCESS: Update Complete!` when the installed
manifest existed before invocation. Explicitly forbid `install.bat`; its pause
wrapper does not provide the fail-closed exit/marker contract.

The `plan-d-a` baseline is valid only after exact A `2.0.74-beta.4` versions,
capabilities, packaged integrity, production registration, absence of
`updates/active.json`, no runner/finalization cursor/RunOnce, coordinator state
exactly `idle` with no retained URL or `errorCode`, Analyze `PASS`, and Options
`PASS`. A complete A installer re-establishes the product before every scenario;
it is not a snapshot rollback.

After A installation and browser reload, inspect only safe state fields:

```javascript
const {dh_update_state:s}=await chrome.storage.local.get('dh_update_state'); ({kind:s?.kind,hasUpdateUrl:typeof s?.update?.url==='string',transactionId:s?.transactionId,outcome:s?.outcome,code:s?.code,errorCode:s?.errorCode})
```

If the state is `complete`, record its safe fields and confirm
`updates/active.json` is absent. Then remove only that terminal coordinator
record and reload:

```javascript
const {dh_update_state:s}=await chrome.storage.local.get('dh_update_state');if(s?.kind!=='complete')throw new Error('Only a terminal complete state may be cleared');await chrome.storage.local.remove('dh_update_state');chrome.runtime.reload()
```

Reopen Options and require the safe `DH_UPDATE_GET_STATE` projection, including
`errorCode`, to return `idle` without a retained URL. Never clear `preparing`,
`activating`, `polling`, `reload-pending`, `ack-pending`, or
`recovery-required` to force a baseline. Installer invocation is exclusively the
fail-closed direct `installer_core.ps1` flow defined above; no Task 2 command or
later task may invoke `install.bat`.

In `Environment Handoff`, state that after cloud-PC qualification the old beta1
workstation remains unchanged as a fallback. Before any old-workstation row is
`PASS`, read its displayed Extension version and require exactly
`v2.0.75-beta.1`, then verify the explicitly selected freeze action is disabled:
either **Receive beta updates** is off or the Dynamics Helper Extension is
disabled. Do not click Update, send an update request, or install A/B there.
Migrate the real workload only after qualified B remains healthy.

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

Cloud-PC work is blocked until both artifact rows have complete source commits
and ZIP SHA-256 values and all five rows below are exactly `PASS`. `PENDING` or
`Not recorded` fails the runbook's entry gate.

| Gate | Result | Evidence |
|---|---|---|
| Host full suite | PENDING | Not run against B |
| Extension full suite | PENDING | Not run against B |
| Extension production build | PENDING | Not run against B |
| Frozen Host build/probe | PENDING | Not run against B |
| Static/reachability checks | PENDING | Not run against B |

## Cloud PC Scenarios

Set `Result` to `PASS` only when every other field in that row is complete,
`Analyze` and `Options` are each `PASS`, and the terminal state is one of these
exact outcomes. A row containing `PENDING` or `Not recorded` cannot be `PASS`.

- Uninterrupted A to B: `complete/committed B`.
- Interrupted recovery: `complete/committed B` or `complete/rolled-back A`.
- Matching-installer repair: `installer-repaired B`.

`Versions/integrity` must record matching Host/Extension `2.0.76-beta.1` and
verified integrity for B, or matching `2.0.74-beta.4` and verified integrity for
Scenario 2's allowed A rollback.

| Scenario | Baseline | Transaction ID | Terminal state | Versions/integrity | Analyze | Options | Result |
|---|---|---|---|---|---|---|---|
| Uninterrupted A to B | `plan-d-a` | Not recorded | Not recorded | Not recorded | Not recorded | Not recorded | PENDING |
| Interrupted recovery | `plan-d-a` | Not recorded | Not recorded | Not recorded | Not recorded | Not recorded | PENDING |
| Matching-installer repair | `plan-d-a` | N/A | Not recorded | Not recorded | Not recorded | Not recorded | PENDING |

## Environment Handoff

| Step | Result |
|---|---|
| Keep old beta1 workstation unchanged | PENDING |
| Confirm displayed `v2.0.75-beta.1` on old workstation | PENDING |
| Confirm selected beta-updates or Extension control is disabled | PENDING |
| Explicit B2 tag/push/publish approval | PENDING |
| Verify published B2 asset hash | PENDING |
| Migrate workload to qualified cloud PC | PENDING |

No private URL, query string, customer content, prompt content, token, or full
log belongs in this file.
```

- [ ] **Step 7: Validate and commit operator documentation**

Run:

```powershell
if(Select-String -Path "docs/plan-d-pragmatic-cloud-pc-runbook.md","docs/plan-d-pragmatic-cloud-pc-results.md" -Pattern 'https://[^\s''"<>]*\?|(?:[?&](?:sig|se|sp|sv)=)[^\s''"<>]*' -Quiet){throw 'Sensitive URL pattern found'}
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

## Archived Tasks 5-9: B1 Qualification Attempt

The original Tasks 5-9 are retired historical provenance, not an execution
plan. No command from that phase may be run or reconstructed from this document.
In particular, do not rebuild or upload B1, rerun legacy beta1 qualification,
delete terminal browser state manually, or tag, push, publish, install, or
migrate from this archived phase.

B1 was built once and its private transaction committed successfully, but the
candidate is DISQUALIFIED and remains unpublished because its completion notice
replayed permanently. The sanitized historical test counts, source commit, ZIP
SHA-256, transaction outcome, and disqualification are recorded only in
`docs/plan-d-pragmatic-cloud-pc-results.md`; they are not B2 qualification.

Current execution authority is `docs/superpowers/plans/2026-09-04-one-shot-update-completion.md`
Task 5 together with `docs/plan-d-pragmatic-cloud-pc-runbook.md`, after Task 5
fills the exact B2 identity and independently reviews every remaining template.
The result ledger must still fail closed while B2 artifact, automated-gate, or
scenario evidence is `PENDING` or not recorded.

Authorization remains split: B2 artifact/private-distribution preparation,
cloud-PC mutation and scenario execution, old-workstation changes, tag/push/
publication, and workload handoff each require their own explicit approval.
Cloud-PC scenario authorization must explicitly include temporarily enabling the
Status bubble preference and restoring its captured prior value after each
terminal product. Approval of this archived plan authorizes none of them.

## Verification

Tasks 1-4 were completed historically and remain provenance for fixture
correction, operator-document creation, A evidence, and B1 version identity. The
archived Tasks 5-9 provide no
current command or qualification authority. B1 technical success and candidate
disqualification are retained in the results ledger; every formal B2 gate and
scenario remains pending until the current Task 5 authority records fresh
evidence.

## Plan Self-Review

- **Current authority:** Only the 2026-09-04 one-shot plan Task 5 and the reviewed
  B1/B2 runbook may direct future qualification work.
- **Safety:** This archive contains no executable B1 build, upload, legacy
  qualification, terminal-deletion, tag, push, publication, installer, or
  migration step.
- **Evidence:** Historical B1 counts and identities are referenced from the
  sanitized ledger rather than duplicated as runnable commands.
- **Approvals:** Artifact preparation, private distribution, cloud-PC mutation,
  old-workstation change, publication, and workload handoff remain separate.
- **Status:** B1 is DISQUALIFIED and unpublished; B2 qualification is pending.
