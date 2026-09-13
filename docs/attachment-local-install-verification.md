# Attachment Local Installation Verification

## Dev Registration Applied

After the new user-defined testing route superseded local installation, read-only
checks confirmed both browser registrations still pointed to Prod, the installed
executable was absent, and no DH Host process was found. The source manifest,
launcher and Python executables existed. `dev_switch.py dev` was then executed
from the repository root; its status output and independent read-only registry
checks confirmed Chrome and Edge now reference this checkout's
`host/host_manifest.json`. No quarantined executable was restored or launched.
Registration does not qualify source Host runtime. The next browser step is
loading this checkout's `extension/dist/`, not the independent download harness
or the staged full installer. No automatic switch back to Prod is planned.

## Current Disposition

**The pending complete-installer plan is superseded by the user's testing-route
rule. No installation or live Analyze has been performed in this recorded attempt.**
Do not resume that plan after browser/Host shutdown. The build results below are
historical evidence, not installed-runtime qualification or authority to install;
this documentation-only update does not reverify artifacts or operate the product.

## Historical Approved Scope

The earlier user approval covered a complete local build and installation using version 2.0.77,
including current uncommitted product changes, without commit, tag or publication.
The planned subsequent live check was one Analyze on the previously approved case and
image, using current DH model settings. Raw attachment input is approved; no
automatic repeat Analyze is authorized by a failure. Customer identifiers and
attachment contents are not recorded here.

## Build Results

- Fixed SDK offline entry: 25/25 passed, exit 0, source and dependency bytes
  unchanged. SDK 1.0.13, all fourteen requirement pins and twenty-two installed
  distributions verified. Evidence: `dh-sdk-tests-4qm46lwu` under the approved
  local temp parent. An earlier supervisor log-sharing failure was corrected;
  the interrupted process was reaped before the cause-specific retry.
- Extension: default-items 5/5, TypeScript, Vite and source/dist items byte check
  passed. Thirteen output files verified, source and selected toolchain bytes
  unchanged. Evidence: `dh-local-extension-2077-20260911`.
- Host: PyInstaller 6.22.2 frozen build passed, followed by complete package
  staging and validation. The PYZ graph includes `analysis_attachments`,
  `analyze_progress` and `repository_instructions`. Fifty-six packaged files
  were inventoried. Source, dependencies and Extension artifacts were unchanged.
  The build warning about missing optional `tzdata` remains; frozen runtime
  behavior has not been qualified by the build result.

Complete package:
`C:\Users\zhaobo\AppData\Local\Temp\opencode\dh-local-package-2077-20260911\package`

| Artifact | SHA-256 |
|---|---|
| `update-manifest.json` | `bba00082bf3092f927185809175853a7594ab65e03a5a57e3b11e54b61b4d165` |
| `host/dh_native_host.exe` | `96a6113156338b069516025eb716e7d22366b031da10d9d4c08875b540d9e791` |
| `host/release-integrity.json` | `092e6e65336a16eef7c9bec41c8285614ba112c9f27e89475518699bb4e5c05e` |
| `host/installed-product.json` | `555ed5e9ed8e8808618830dc07a4b20618a793ce993e9d964078b682e61036fe` |

## Historical Pre-Install Observation

Installation has not run. After the user reported closing browser windows, the
September 12 pre-install check still found background Edge processes and one
`dh_native_host.exe`. The installer refuses a running Host; no installation was
attempted and no process was forcibly terminated. The earlier observation of no
running Host was superseded by this check; neither observation establishes current
process state or a root cause. Waiting for shutdown and retrying the installer is
no longer a pending step. Preserve the observations and build evidence.

## Replacement Verification Route

Follow [AGENTS.md's authoritative Testing Cycle](../AGENTS.md#native-host-mode-selection)
and the [test-safety entry](test-safety.md#live-feature-test-entry). These unreleased
changes affect both components: use the approved local Extension build at this
checkout's `extension/dist/` via browser **Load unpacked**, combined with source
Dev Host selection through `python dev_switch.py dev`. The user's `switch_prod`
means the existing `dev_switch.py`; no rename or alias is needed. Do not install
the staged package or copy its files into the production installation.

Before any runtime work, confirm that the applicable work package covers this
replacement route and its browser/HKCU/live effects. Read-only registration status
and target-manifest/Host-path validation precede any authorized switch. Switching
does not terminate the old Host; source Dev shares user configuration and is not
a sandbox. No automatic return-to-Prod step is added. Retain the prior one-Analyze
limit; this change neither performs that Analyze nor renews its attempt budget.

After a separately authorized GitHub Release, upgrade testing uses only the
Extension's own real production upgrade feature. Publication is not authorized by
this route. Full-installer repair remains separate explicitly approved user
maintenance, not this feature test; recovery/fault qualification retains its
separate disposable-VM gate and agreed environment. Build success does not
establish installed runtime success, recovery qualification, attachment content
verification or model receipt.
