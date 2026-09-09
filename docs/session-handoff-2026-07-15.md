# Dynamics Helper Development Handoff

## Current Status

Updated: 2026-09-10.

- Canonical checkout: `C:\MyWorkbench\Repository\Dynamics-Helper`;
  branch `hardening/plan-d-runtime-installer`, verified HEAD
  `0d1c6ee346b95acd3e3607d63726387438d13040`. `master` remains at `bfedc9f`.
  Current uncommitted changes include Created On diagnostics in bridge/PageReader/
  FAB, assertions in three existing tests, this record, `DEVELOPER_GUIDE.md` and
  frontend entry clarifications in `docs/test-safety.md`.
- Current request: after authorized read-only Edge diagnosis, add minimal safe
  Created On diagnostics. Implementation, focused verification and the diagnostic
  Extension build are complete. The user confirmed switching Edge's unpacked
  extension source to canonical `extension/dist` and subsequently seeing diagnostic
  logs. Supplied screenshots now locate failure at the Worker sender gate before
  injection, then specifically `sender_document_format_rejected`. The overly
  strict hyphenated document UUID gate is now removed, regression-tested and
  rebuilt. The user has now confirmed successful Created On output with explicit
  UTC after the requested reload/verification. The reported local defect is resolved;
  this is not release/package or full product qualification.
  The user subsequently requested commit and push. Local checkpointing is authorized;
  public push scope is awaiting clarification because the remote branch is at
  `70fcdbd` and six additional local commits include previously local-only private
  session/security history. No release publication is requested.
- Remaining directory cleanup is COMPLETE. File Locksmith identified the Edge
  CDP proxy `node.exe` PID `31376` as the occupant. With explicit user approval,
  that exact process was stopped after command-line/creation-time verification;
  the source then moved successfully by same-volume rename, without copy/delete.
- Source is now under
  `C:\MyWorkbench\Repository\_archive\Dynamics-Helper-retired-checkouts\Dynamics-Helper-prompt-scope-spec`;
  its old path no longer exists. Source HEAD `0e86787` and alignment HEAD `fcc21f2`
  remain unchanged and both worktrees are clean. `git worktree repair` completed;
  both Git link directions and registered locations were verified. No full-tree
  byte certification is claimed. The external archive README was also updated.
- The preceding local build/package is COMPLETE following the user's request to
  start the stated environment-alignment/build-to-ZIP scope. SDK is now `1.0.5`,
  PyInstaller `6.22.2`, hooks `2026.7`; all four phases exited 0. Extension's five
  default-menu tests and byte-copy gate passed. No installer simulations reran.
- Validated package: `releases/local-20260909-0d1c6ee/DynamicsHelper_v2.0.76.zip`,
  14,010,577 bytes, SHA-256
  `92873a415d7bdecb07ebdf1e6227f6cccdd844ef37e5b166d7e4627354ff4320`.
  Existing archive validation passed 55 manifest entries; extracted verification
  tree and `build-record.json` remain beside the ZIP. Product version stays `2.0.76`.
- That ZIP predates the current diagnostic source changes and does NOT include
  them. Do not present it as a diagnostic or fixed Created On build.
- Stop point: local ZIP only. No frozen Host execution/probe, real installation,
  registration, browser reload, full suites, commit, tag, push or publication.
  Installation/runtime qualification is not established by this result and needs
  separate scope. No build processes or direct children matched the recorded IDs
  at final inspection; this is not general descendant confinement.

### Created On Diagnostic Continuation

The user reported that installed `2.0.76` still needs Details opened to obtain
Created On, then shows no timezone. Authorized read-only checks in the existing
Edge/D365 session found no Details container but a valid model Date, incident
identity and matching visible full record number. The compiled model function
returned success in 8ms with UTC shape and identity equality; no record value,
date, GUID or customer text was exported. Installed/local SW and bridge bundle
SHA-256 matched. This establishes model availability in that inspected scope, not
the browser's loaded isolated-context identity or successful message transport.
The existing proxy could not inspect isolated execution contexts; no reconnect
loop, record edit, Details opening, API network request or browser reload followed.

After the user approved source diagnostics, added fixed console.debug codes at
actual worker/content/scan/UI decisions. Page-side numeric generation correlates
request and application; it is not a cross-Worker wire ID. No wire/schema, MAIN
model, timeout, identity rule, edit protection, telemetry or storage behavior was
changed. `result_unavailable` intentionally does not guess a MAIN failure reason.
The developer guide documents Verbose console visibility and diagnostic meaning.

Verification used existing installed Vitest, explicit three-file/name selection,
file isolation and one worker. Reviewed project closure includes the complete
test files, setup/chrome mocks, imported utilities/components and runner configs;
MAIN model tests with dynamic execution were neither imported nor selected.
Third-party runner/fork/esbuild execution and cache writes remain trust boundaries,
not a sandbox or Python scanner qualification. Each run recorded full tracked-file
raw hashes before/after and explicit arguments under the approved Temp directory.

- Initial focused run: 81/81 passed, 100 unrelated cases filtered out, exit 0;
  initial TypeScript check passed. No installer tests or full suites ran.
- Break-and-fail: temporarily disabled only the diagnostic logger; three selected
  bridge/scan/UI diagnostic assertions failed as expected, exit 1. Mutation removed.
- Review added missing terminal/context-menu discard diagnostics. A misplaced
  context-menu patch was caught by TypeScript (out-of-scope `scan`), then corrected;
  the intermediate green test run alone did not certify type correctness.
- Final verification: 81/81 passed, 100 filtered out, exit 0; final `tsc --noEmit`
  passed. Final monitor PID `36820`, Node PID `74956`, start
  `2026-09-10T00:19:20.3576527+08:00`, 20.57 seconds, 180-second timeout unused;
  recorded tracked source bytes unchanged during the run.
- Evidence: `C:\Users\zhaobo\AppData\Local\Temp\opencode\dh-created-on-final-20260909`;
  sibling `focused`, `types`, `red`, `green` directories retain earlier results.
  The dated directory suffix is retained although execution crossed midnight.

The user subsequently approved continuing with diagnostic Extension build/load.
The existing Edge source was user-confirmed as
`C:\Users\zhaobo\AppData\Local\DynamicsHelper\extension`, ID
`fkemelmlolmdnldpofiahmnhngmhonno`. No installed product files were overwritten.
The Extension-only build passed menu 5/5, TypeScript/Vite and copy validation:
monitor PID `76416`, child `65996`, start `2026-09-10T00:23:03.4407409+08:00`,
61.34 seconds, exit 0, no timeout. Evidence:
`C:\Users\zhaobo\AppData\Local\Temp\opencode\dh-created-on-build-20260910`.
Bridge bundle is now `analyzeRequest-BBpn_jGd.js`, Worker
`serviceWorker.ts-D2INBmqX.js`, content `index.tsx-BF6dl4vv.js`; version remains
`2.0.76`. The user confirmed loading canonical `extension/dist` with the same ID.
Do not overwrite the installed product or assume its integrity inventory describes
this temporary developer source. No Host rebuild, installer, ZIP replacement or
publication was performed for diagnostics.

After instructions to refresh only without unsaved edits, keep Details closed and
open DH without Analyze, the user supplied screenshots: Worker `sender_rejected`
on three requests; page scan 1 was not requested/missing, scan 2 started content
transport, received `result_unavailable` in 83ms, had no Created On and applied the
remaining scan. This rules out content timeout or edit-protection suppression for
that observed scan. MAIN injection was never reached on the rejected requests;
do not infer which sender property failed from the combined code.

The sender gate now assigns fixed codes for extension, tab, top frame, origin,
URL, missing document and document-format checks, preserving every existing
predicate and outputting no values. Existing bridge tests: 62/62 pass, exit 0,
tracked sources unchanged. Evidence:
`C:\Users\zhaobo\AppData\Local\Temp\opencode\dh-created-on-sender-20260909`.
Refined Extension build passed menu 5/5, TypeScript/Vite/copy: monitor `51748`,
child `61172`, start `2026-09-10T00:37:58.9785989+08:00`, 47.3 seconds, exit 0.
Evidence: `C:\Users\zhaobo\AppData\Local\Temp\opencode\dh-created-on-sender-build-20260910`.
New bridge bundle: `analyzeRequest-DulmVHHr.js`. Await extension reload and safe
D365 refresh by the user, then only the refined Worker fixed-code lines. No
security guard has been relaxed, and no defect fix is claimed.

Subsequent screenshot showed `sender_document_format_rejected` on three requests.
The browser supplied a non-empty documentId that failed our hyphenated-UUID regex;
its actual token/format was not collected. Official runtime docs call documentId
an optional string/document UUID without promising hyphenated text; scripting
accepts documentIds as strings and returns documentId as a string. Removed only
the unsupported representation restriction. Continue requiring a browser sender
from this extension, allowed origin/URL, top frame, valid tab and non-empty string
documentId. Pass that token unchanged and require exact returned document equality;
no trim/case conversion/UUID conversion or frame-target fallback is used.

Two synthetic regressions (uppercase 32-hex and an opaque non-UUID-shaped token)
failed against the old gate, then passed with the correction, including rejecting
different returned tokens. Complete bridge selection: 64/64 passed, exit 0, raw
tracked hashes unchanged; evidence under Temp `dh-created-on-document-red-20260909`
and `dh-created-on-document-green-20260909`. No real token was added to fixtures.
Extension rebuild passed menu 5/5, TypeScript/Vite/copy, exit 0: monitor `70356`,
child `40308`, start `2026-09-10T01:14:57.2376617+08:00`, 104.32 seconds, no timeout.
Build evidence: `C:\Users\zhaobo\AppData\Local\Temp\opencode\dh-created-on-document-build-20260910`.
Current bridge bundle: `analyzeRequest-BmWFicff.js`. Following the request to reload
the repository extension, safely refresh D365 and leave Details closed, the user
confirmed success and supplied Created On output in ISO format with `Z (UTC)`.
The actual date is deliberately not retained in this record. This is user-reported
live confirmation of the local fix, not automated installation/full-product testing.
Existing ZIP and installed tree remain unchanged and do not contain this correction.
Edge remains on the repository extension unless the user changes it; no source
switch was performed during closeout. Switching back to the unchanged installed
extension would restore the faulty code, so do not do so automatically. A later
complete package/deployment and source restoration require their own agreed scope;
preserve extension configuration and never advise uninstalling it. Source changes
are being checkpointed under the user's commit/push request; nothing has yet been
pushed or published. Do not confuse that request with release authorization.

### Current Cleanup And Build Readiness Continuation

On 2026-09-09, the old `opencode.exe` PID `9316` and `powershell.exe` PID `67960`
were initially still alive. The current tool parent chain was `opencode.exe`
PID `12148` -> `powershell.exe` PID `25804` -> `herdr.exe` PID `25360`.
After the user said the old window could not be identified, further read-only
queries showed both old PIDs absent. The assistant terminated no process.

One `Move-Item` from the source to
`C:\MyWorkbench\Repository\_archive\Dynamics-Helper-retired-checkouts\Dynamics-Helper-prompt-scope-spec`
then failed: `The process cannot access the file because it is being used by another process.`
Source/destination existence and Git state were rechecked afterward. Common tool
locations had no existing Handle/Process Explorer utility; nothing was downloaded.
The user reported no Resource Monitor match for the source directory name.
Neither observation identifies the cause or proves the absence of a directory lock.
At that pause, no copy/delete workaround, permission change, Git metadata rewrite
or archive content change had been made.

The user subsequently supplied a File Locksmith screenshot identifying `node.exe`
PID `31376`. Read-only inspection found the exact command
`"C:\Program Files\nodejs\node.exe" C:\Users\zhaobo\.config\opencode\skills\web-access\scripts\cdp-proxy.mjs --browser edge`,
created `2026-09-03T09:56:32.6485490+08:00`; its parent was absent and no direct
children were found. The user explicitly approved terminating this proxy and
continuing cleanup, without building. The initial stop guard refused because
the earlier displayed timestamp omitted fractional seconds; it stopped nothing.
After reading and verifying the full timestamp and exact command, only that
process was stopped and its exit confirmed. Edge itself was not terminated.

The subsequent same-volume source move succeeded. `git worktree repair` from the
archived source repaired alignment's `.git` pointer; the source's backlink and
`git worktree list --porcelain` both resolve the archived paths correctly. Both
HEADs remain unchanged and both worktrees are clean. Only Git link metadata and
the external archive README were intentionally edited in the archived area;
no full-tree content hashing was performed. Canonical HEAD and master are unchanged.

Initial read-only readiness below is the pre-build observation at canonical HEAD
`0d1c6ee`, not the final environment/artifacts or the old source's environment:

- Host and Extension source versions match `2.0.76`. Canonical root `dist` is absent,
  `releases` contains no ZIP, and existing Extension dist is stale `2.0.74`.
- All 14 pinned Host packages have installed metadata: 13 match; only
  `github-copilot-sdk` differs (`1.0.8` installed, `1.0.5` required). PyInstaller is
  separately missing. Metadata inspection is not interpreter/runtime validation.
- `host/venv/pyvenv.cfg` records Python `3.13.15` and the retired canonical-staging
  creation path. The venv was not launched or certified relocatable.
- Actual `node --version` / `npm --version`: `v24.11.0` / `11.6.1`. Node satisfies
  the locked Vite engine range; complete node_modules/lock agreement is unverified.
  The lockfile root version still says `2.0.70-beta.5`; that alone does not establish
  dependency invalidity and was not changed.
- `host/config.json` is tracked, unchanged from HEAD and reviewed as product seed,
  with no private paths, identities, URLs or credentials found. Do not substitute
  the unclassified private backup in the archive.

The bounded execution proposed before the user's start instruction: preserve
version `2.0.76`, run the existing Extension build (including its default-items
test and source/dist copy check, not installer simulations or full suites), then
`release_helper.build_host()`, then `create_zip()` with a fresh independent output
directory. Use existing manifest/archive validation and record source identity,
tool versions and final ZIP SHA-256. Stop at the ZIP; do not execute the frozen
Host, probe, register, reload a browser or run either installer. Do not invoke the
normal release CLI, clean historical releases, bump versions, commit or tag.

The proposed environment scope was to align the build environment
to the existing SDK `1.0.5` pin and required PyInstaller `6.22.2`, not an SDK upgrade
or a change to requirements. The user's subsequent start instruction authorized
this stated scope; execution and its limits are recorded below.

### Local Build And Package Result

The user said to start after the cleanup closeout proposed restoring SDK `1.0.5`,
adding PyInstaller `6.22.2`, then building/packaging locally to ZIP without product
installation or publication. No product source, dependency pin or version changed.
The Node build gate was clarified in `docs/test-safety.md` after reviewing the
five menu tests, public input and copy check; this is not a Python named-profile
pass or permission for broad test discovery. All 32 direct frontend dependencies
matched lockfile versions/declarations; no npm install was needed.

Canonical venv Python `3.13.15` was verified runnable. Wheel-only pip installation
used the existing configured package feed, aligned SDK to the existing pin and
installed PyInstaller plus its dependencies; `pip check` passed. Installed
distribution versions are captured in the package's `build-record.json`.

Execution used a plain physical PowerShell launcher with `Start-Process`, separate
stdout/stderr, PID/start-time records, bounded waits and cancellation limited to
the owned phase tree. It adapted the existing simple build mechanism, not a test
framework. The first launcher invocation (PID `40892`) failed at an unfilled
placeholder because an edit had not landed; it never started pip or a build.
The corrected on-disk script passed parsing before use. That failure log remains.
Terminal transport reported its own 10-second timeout on subsequent asynchronous
launches; inspection confirmed the monitors continued and recorded real exits.
No phase was restarted because of a transport timeout and no cancellation ran.

| Phase | Monitor / child PID | Start (+08:00) | Seconds | Result |
| --- | --- | --- | --- | --- |
| Dependency alignment | 41244 / 27684 | 23:03:08 | 77.62 | Exit 0; pip check passed |
| Extension | 56572 / 40012 | 23:07:05 | 101.07 | Exit 0; menu 5/5, type/build/copy PASS |
| Frozen Host | 60136 / 59424 | 23:09:22 | 50.48 | Exit 0; PyInstaller onedir complete |
| Package and extraction validation | 37156 / 49288 | 23:12:59 | 10.34 | Exit 0; 55 manifest entries verified |

Evidence: `C:\Users\zhaobo\AppData\Local\Temp\opencode\dh-local-build-20260909`
contains each phase's process/result JSON and logs, plus `source-before.json`.
The plain build/package invocation scripts remain in its approved Temp parent.
Timeouts were 600 seconds per phase except Host at 1200 seconds. Final process
inspection found no recorded monitor/phase PID or direct child still present.

The package record binds HEAD `0d1c6ee346b95acd3e3607d63726387438d13040` plus raw
hashes of tracked working files, including the then-uncommitted documentation.
All recorded tracked bytes were unchanged between pre-install capture and
packaging; this handoff was updated afterward for closeout. Full ZIP extraction
through `stage_and_validate_archive` passed version, file-set, metadata and hash
checks. Packaged installer scripts, EXE and menu also matched current inputs by
byte comparison; the final ZIP SHA-256 was independently rechecked.

Residual warnings: Browserslist data is old and was not updated. PyInstaller
reported missing optional `tzdata`; no direct product `ZoneInfo` use was found,
but named-IANA-zone availability is not qualified. Analysis contains all 17
required product hidden imports and SDK modules, and no collected setuptools or
Pydantic mypy plugins. Other missing-module warnings were platform/optional/dynamic
imports. Static inspection and successful packaging do not prove frozen runtime,
optional dependency features, real installation or security-product compatibility.

## Historical Session Record

Everything below preserves earlier session facts, permissions, procedures, and
proposals. Statements inside this section are historical records, not operating
instructions. References to current or active authority, next actions, approval,
or supersession describe their original session context.

Historical record updated: 2026-09-09.
Read [AGENTS.md](../AGENTS.md) for evergreen rules and
[test safety](test-safety.md) for execution policy. Historical permissions below
are evidence only; the current user instruction and its limits control this work.

### Historical Repository Identity

- Canonical development entry: `C:\MyWorkbench\Repository\Dynamics-Helper`.
- Migration source/reference: `C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec`.
- Branch: `hardening/plan-d-runtime-installer`.
- Pre-checkpoint baseline: `70fcdbd`. Local checkpoint commits follow that baseline;
  use `git log` and `git status` for exact current identity, not this baseline hash.
- The source checkout is retained as a reference and owns the alignment worktree;
  do not continue parallel development there after the canonical import.
- Installed product state is independent of source state; development remains local.

### Historical Canonical Entry Migration

The user approved the local import/switch plan and confirmed no other session is
operating these repositories. At that time, this section superseded earlier
checkout/next-step directions below. Product builds and qualification were paused
for this migration.

Execution sequence: save the source handoff in a local commit, fetch only the
hardening branch from the local source into the canonical repository, verify the
tip, then switch normally without force. Preserve canonical `master` at `bfedc9f`,
its origin, tags and Git directory; preserve all sibling directories, ignored files
and the source/alignment worktree relationship. No network fetch, push or deletion.
The source was at `7280454` before saving the 27-line product-readiness follow-up.

Migration completed: source handoff saved as `0e86787`, that exact branch tip
imported using a local-only fetch with no tag auto-follow, and canonical switched
normally to `hardening/plan-d-runtime-installer`. No merge/rebase or directory rename.
Canonical `master` remains at `bfedc9f`. The source checkout stays at `0e86787` as a
clean reference; alignment remains attached to its original Git store. Canonical
was designated the development entry, with this file as its status record.

Source adoption does not refresh either repository's virtual environment, node
dependencies or built artifacts. Installed Chrome/Edge native-host registration
was observed pointing to the LocalAppData installed executable, not either checkout.
No registry/browser/runtime cutover is included. The checked-in development manifest
now points to canonical `host/launch_host.bat`; no registry key was changed. The
dedicated installer supervisor's fixed root was updated to canonical, retaining
its exact-location checks. Its earlier qualification hashes remain evidence of
the original executed bytes, not qualification of the relocated entry. No installer
test rerun is part of this migration.

No upstream was assigned to the imported local branch: canonical's remote-tracking
refs were deliberately not refreshed from the network and remain older snapshots.
Do not interpret them as current GitHub state. Original tags and origin are retained.
Ignored dependencies, compiled outputs and old local data remain in their original
directories and are not certified compatible with the adopted source. No cleanup
or dependency installation was performed.

Next directory task, if requested, is grouping historical staging/evidence folders
outside the project-root listing while preserving contents and Git worktree links.
Do not resume product builds automatically or run historical migration scripts.

#### Historical Parent Directory Cleanup

User-approved cleanup removed the two redundant canonical-staging checkouts.
The 106 lineage/helper/status entries were moved under
`C:\MyWorkbench\Repository\_archive\Dynamics-Helper-lineage-20260804`;
all 1,213 original file SHA-256 values matched before/after. Five related Python
cache files subsequently moved into its `python-cache` subdirectory, hash-verified.

Six source/legacy branches are now retained locally under `archive/prompt-scope/*`
and `archive/legacy/*`, plus five previously missing annotated tags. Existing refs
were preserved; no merge or push. Legacy and alignment checkouts moved under
`C:\MyWorkbench\Repository\_archive\Dynamics-Helper-retired-checkouts`.
The old ZIP and unclassified private config moved into `loose-files`, hash-verified.

Partial relocation: Windows refused to move `Dynamics-Helper-prompt-scope-spec`
because it was in use. It remains at its original path and still owns alignment's
Git store. The initial hashing command timed out before moving anything; a later
same-volume move command continued after that one rename failed and moved the other
two directories. Its full metadata comparison did not finish. The alignment link
was then repaired against the still-original source location; both moved checkouts
retain original HEADs and clean Git status. Do not claim complete byte verification
for those moved trees. No processes were forcibly ended or permissions changed.

Remaining cleanup is only the occupied source checkout. Identify/release the lock
before moving it, then repair the archived alignment worktree again. Do not retry
blindly, copy/delete as a workaround, or delete the source's Git directory. Other
projects and the shared parent `__pycache__` directory were not removed.

The user confirmed no other window is using the old directory; only this session
remains. Read-only process inspection on 2026-09-09 found the tool-shell parent
chain `opencode.exe` PID 9316 -> `powershell.exe` PID 67960 -> `herdr.exe` PID 25360.
No separate process command line named the old directory. This is not an open-handle
or process-cwd inspection and does not prove which process holds the lock. No process
was terminated. Normal exit of this OpenCode instance and its launching shell, then
opening canonical anew, is the smallest next release attempt; no need to investigate
imagined other windows or forcibly stop generic Python/PowerShell processes.

Canonical verification: `safety-core` passed 55/55 with zero failures/errors/skips
using base Python and the imported reviewed hashes. Evidence:
`C:\Users\zhaobo\AppData\Local\Temp\opencode\dh-safe-tests-wgqrhv4s`.
Runner exit 0, sources unchanged, no capture/cleanup errors, no pending reader or
unreaped worker. This verifies the gate from the canonical path, not old dependency
environments, installed product behavior or the relocated installer supervisor.
The manifest target and all four supervisor source paths were checked for existence;
only their path edits were statically reviewed. No installer was run.

### Historical Test-Safety Task

Implement the user's explicit stages 1-3 for test-safety source/tooling and docs,
with only the agreed pure-Python verification. Keep one bounded work package.
Documentation cleanup separates evergreen policy from temporary session state.
Source integration, limited Python validation and the subsequent user-requested
`safety-core` review/binding/gated execution are complete. Results and remaining
qualification gaps are recorded below.

### Historical Authorization Record

- Approved: scoped source/docs changes and the parent's agreed pure-Python checks.
- Subsequent continuation: focused `safety-core` source/dependency review, hash
  binding after review, and gated Python verification; no process-test opt-in.
- Consumed docs exception: byte-identical archival copy using a new plain helper
  under the approved Temp root. This is not permission to repeat the operation.
- User clarification: the user did not prohibit new PowerShell processes. The
  earlier blanket prohibition was an assistant summary error, not user authority.
  PowerShell terminal transport alone does not require separate reapproval for
  already agreed Python checks. This clarification does not expand task scope.
- Corrected harness attempts, Host/SDK runs, browser operations, product suites,
  builds, installation and dependency provisioning were outside the original package.
  The user's subsequent continuation approved one corrected success harness attempt;
  that attempt is now consumed and passed as recorded below. Other scopes remain out.
- User approved local staging and logically split commits for this checkpoint.
  No amend, tag, push or publication is authorized.
- No payload decoding/execution, security-policy changes or original-incident
  Temp access/cleanup. Preserve original evidence and failed results unchanged.
- Earlier once-only process approvals are consumed; this package does not renew them.
- Approved tooling fixes and agreed tests do not need per-command reapproval.
  New effects or expanded scope do. Follow higher-priority instructions throughout.

### Historical Milestone Summary

- Published stable product: `v2.0.76`; project/runtime SDK remains `1.0.5`.
- Isolated SDK `1.0.13` qualification executed 27 mock cases: 25 passed, 2 failed.
  This is not an upgrade qualification PASS. Further SDK work remains paused.
- Final limited Python checks: 55/55 mocked cases, 17 Python syntax checks and
  manifest JSON parsing; seven synthetic runner scenarios met expected outcomes.
  These replace neither product qualification nor the historical baseline records.
- One plain PowerShell success harness passed workflow assertions but FAILED its
  overall empty-profile postcondition. Empty AppData/Roaming appeared in USERPROFILE.
- One separate minimal PowerShell startup baseline reproduced exactly that empty
  directory shape without installer loading. This is environment-specific evidence.
- The shared exact-directory rule and pure mocked regressions are implemented.
  It rejects files, extra/partial paths, aliases, links/reparse points and changes
  in other roots; observed changes remain distinct from allowed baseline deltas.
- One corrected PowerShell success harness attempt has now passed. This is a new
  result with the exact directory allowance; the earlier overall FAIL stays failed.
- Manifest v2 `safety-core` now has three test files, 55 exact test IDs and three
  dependencies, with all six source hashes reviewed and bound. Its gated run passes.
  `pii-core` still uses whole-module selection and has pending test/helper hashes;
  it is not qualified. Full inventory review remains incomplete.

### Historical Documentation Delivery

- Evergreen policy: `AGENTS.md`, `DEVELOPER_GUIDE.md`, `docs/test-safety.md`.
- Workflow integration: `docs/edge-d365-debugging-workflow.md`.
- Dated technical evidence: `docs/sdk-1.0.13-upgrade-assessment.md`; no live schedule.
- This handoff was designated the authorization/status record for that work.
- Preserve pre-existing dirty changes outside this assigned documentation scope.

### Historical Archive

The full pre-cleanup handoff is preserved byte-identically at
[Historical handoff through test safety](history/session-handoff-through-test-safety-2026-09-09.md).
That archive is historical evidence, NOT current instructions or authorization.
Its original header and superseded instructions remain unchanged for byte identity.

- Original/archive size: 99,058 bytes; 1,450 lines.
- SHA-256 before copy, source after copy, and archive all matched:
  `88371ce071c5301601d262b6424ff5c3ede56da83054e518eec180a0e31c6d12`.
- No archive header was prepended and no newline normalization was performed.
- Path-specific `.gitattributes` entries now disable text conversion for the archive
  and new safety inputs. No global line-ending normalization or Git config change.
- The archive contains local account paths, conversation metadata and security
  incident history. This checkpoint is local only; public disclosure needs separate
  review. A later sanitized revision would not remove the original from Git history.
- Detailed validation chronology, process IDs, private evidence pointers and older
  release/incident decisions remain there; do not run its retired procedures.
- Original incident scripts/logs were not changed or used for this archival copy.

### Historical Verification And Remaining Gaps

- `tests/validate_test_safety.py`: 26 checker, 12 profile and 17 runner mocked tests
  passed, zero failures/errors/skips. It also parsed 17 Python sources and the
  manifest. Final console result: 55/55. Earlier intermediate run: 53/53.
- Review found missing post-wait input revalidation. Runner now rechecks manifest
  and recorded source hashes before success; mutation/read-failure regressions pass.
- `tests/validate_safe_runner.py`: 7/7 expected outcomes for repository rejection,
  passing, intentional failure, manifest rejection, selection rejection, timeout
  and stdout limit. These are synthetic cases, not product tests.
- New evidence: `C:\Users\zhaobo\AppData\Local\Temp\opencode\dh-runner-validation-2wiao9eo`.
  Summary records `source_unchanged=true` for its ten monitored inputs, not the
  whole checkout. Four nested worker records also report `sources_unchanged=true`.
- Seven direct children and four nested workers have recorded non-null exits,
  no unreaped child, no pending reader and no capture/cleanup errors. These are
  historical completion records, not current PID checks or descendant confinement.
- Authorization-record correction: the final Python checks used `functions.bash`
  with PowerShell transport, not a direct-process executor. The user explicitly
  clarified that they never prohibited new PowerShell processes. The assistant's
  earlier claim that these launches violated that user restriction is withdrawn;
  it relied on an inaccurate summary. No corrected installer harness was invoked.
- The general runner and synthetic supervisor do not compare post-run profile
  contents. Do not claim unchanged profiles or absence of external side effects.
  Exact baseline checking belongs to the dedicated harness supervisors.
- Long-term docs were checked for temporary status and stale runner instructions;
  direct unittest/Plan B PYTHONPATH recipes were replaced with reviewed-profile
  guidance, and the baseline-check limitation is explicit in `docs/test-safety.md`.
- Before the focused follow-up below, no production review hashes were filled.
  No full-inventory audit approval, product suite/build, SDK qualification,
  corrected PowerShell harness, installer production-path qualification or release
  was performed. No Git writes occurred.

### Historical Safety-Core Gated Qualification

- Source review corrected the earlier summary: the initial profile had 38 tests,
  no explicit IDs, and omitted runner mocks. It now selects exactly 26 checker,
  12 profile-state and 17 runner tests. The profile-contract assertion was updated.
- Reviewed all six source files including checker/runner bootstrap effects. Bound
  their raw-byte hashes and 31 exact `unknown_execution` callsite records. These
  cover fixed stat-attribute access, lexical paths, in-memory hashes/JSON and test
  list operations; scanner policy was not weakened. Other inventory remains pending.
- Read-only selected-profile checker passed with no diagnostics. The maintained
  runner then passed 55/55, zero failures/errors/skips, with process tests disabled.
- Initial passing evidence: `C:\Users\zhaobo\AppData\Local\Temp\opencode\dh-safe-tests-i_3y2rsw`.
  After changing only manifest status to refer to this handoff, repeated the scoped
  run to bind the final manifest rather than claim verification of changed bytes.
- Final evidence: `C:\Users\zhaobo\AppData\Local\Temp\opencode\dh-safe-tests-_740087k`.
  Final manifest SHA-256:
  `0e40f79364f982cb97814e9a931ac3efdd7d85f5aa7d74ba05778a35d38c2aec`.
  `result.json` binds all six sources and all 55 IDs; exit 0, sources unchanged,
  no capture/cleanup errors, no pending reader, child reaped. Worker PID 53408 is
  historical evidence, not a claim about current PID identity. Parent elapsed 2.46s.
- Real effects: retained Temp evidence/profile directories and one owned Python
  worker per run. Tests mock process/filesystem integration seams. No profile-tree
  postcondition, OS sandbox, arbitrary descendant containment or alert-free claim.
- `git diff --check` passed for tracked changes, with existing LF/CRLF warnings;
  it does not cover untracked files. No source changes followed the bound run.
  Keep archive raw-byte preservation in mind before any future authorized commit.

### Historical Local Checkpoint

- User requested logically split local commits and a clean handoff for a new session.
  Code/tooling and documentation are separate checkpoint units, not a release.
- Code/tooling commit: `4e8d0c0` (`fix: replace encoded installer tests with reviewed
  safety tooling`). This handoff and the evergreen rules form the following docs
  commit. No push, tag or release was performed.
- Before the code commit, all 19 new safety inputs matched their staged Git blobs
  byte-for-byte using raw hash-object comparison; staged whitespace checks passed.
- Precommit source inspection corrected one stale installer static assertion to
  match the checked-in `Join-Path` dot-source statement. The installer test module
  remains unqualified; no installer test or real PowerShell harness was run here.
- Manifest pending-review wording now points to execution evidence. The earlier
  manifest hash above identifies the earlier run, not the changed checkpoint bytes.
- Checkpoint verification: gated `safety-core` passed 55/55, no failures/errors/skips,
  exit 0, unchanged inputs and no capture/cleanup errors or unreaped worker.
  Evidence: `C:\Users\zhaobo\AppData\Local\Temp\opencode\dh-safe-tests-d5gpllcl`.
  Checkpoint manifest SHA-256:
  `eb82ce23143f52a3940a761f2bccf47d08c7f5a44eae1dd811d5935cdf0cc020`.
- Archive SHA-256 was independently recomputed before staging and matches the
  preserved value above. The archive was not edited. Tracked diff whitespace checks
  passed with line-ending warnings for existing text files.

### Historical Installer Qualification And Follow-Up

#### Historical Failure-Scenario Authorization And Results

The next user continuation approves the 14 remaining fake refusal/failure scenarios,
once each, stopping at the first unexpected outcome without automatic retry. The
existing supervisor now accepts exactly `--scenario <known name>`; no arguments
still select success. Only supervisor assertions/selection changed, not installer
or harness operations. Expected child exit is 1; supervisor exit 0 means the expected
failure and all safety postconditions passed. No real installation or new framework.

Reviewed supervisor SHA-256:
`3c1444e3ad618d12395bc18687fcd2015b4b2fdadc6086c726cc512b9029f0f6`.
The other three reviewed raw-byte hashes remain as in the success table below.
Names: running, roaming, preflight-throw, preflight-nonzero, live-throw, live-nonzero,
settle-throw, settle-nonzero, register-throw, register-nonzero,
register-generic-throw, missing-exe, missing-package, copy-throw.

Each launch retains its Python process handle, emits cumulative progress/PID/start
and log paths, uses a 40-second outer wait plus 5-second owned-handle cleanup, and
retains separate new stdout/stderr under `dh-installer-failure-20260909-<scenario>-1`.
Before each launch all four review hashes are rechecked. Existing output files stop
the package rather than overwrite evidence. The supervisor creates its own fresh
inner evidence and retains its existing profile/capture/PowerShell cleanup checks.
Outcome: **14/14 expected outcomes**, one launch each, no retries. All outer Python
processes exited 0; all PowerShell children returned expected exit 1. Each result
was read independently: correct scenario/arguments, passed assertions, four source
hashes matching the reviewed before/after identities, zero stderr/capture errors,
no pending readers, output cap or cleanup/finalization errors. All profiles started
empty; only the same two empty USERPROFILE directories appeared afterwards, with
`profiles_empty=false` and `profile_delta_allowed=true` in every case. The 27
invalid-table checks per invocation remain inferred, not separately reported tests.

Evidence directories under `C:\Users\zhaobo\AppData\Local\Temp\opencode`:

| Scenario | Inner evidence directory | Python PID | PowerShell PID |
| --- | --- | --- | --- |
| running | `dh-installer-validation-23wrv107` | 68660 | 62744 |
| roaming | `dh-installer-validation-fi32i2zt` | 46716 | 22972 |
| preflight-throw | `dh-installer-validation-c38xjkbn` | 46076 | 59748 |
| preflight-nonzero | `dh-installer-validation-yow3d9pf` | 59084 | 69048 |
| live-throw | `dh-installer-validation-lig0lg8v` | 27684 | 76760 |
| live-nonzero | `dh-installer-validation-653r9062` | 43660 | 2660 |
| settle-throw | `dh-installer-validation-2wt19ps6` | 29056 | 25708 |
| settle-nonzero | `dh-installer-validation-mypve_ar` | 73520 | 68124 |
| register-throw | `dh-installer-validation-e_2onmty` | 69996 | 52336 |
| register-nonzero | `dh-installer-validation-y5repbvv` | 27812 | 67256 |
| register-generic-throw | `dh-installer-validation-7z2biksu` | 77048 | 64572 |
| missing-exe | `dh-installer-validation-5nweyg0p` | 59596 | 3776 |
| missing-package | `dh-installer-validation-ceblxgen` | 31084 | 61384 |
| copy-throw | `dh-installer-validation-273_xy_x` | 67816 | 38840 |

PIDs are historical owned-process completion evidence, not current PID checks or
descendant enumeration. The launch window started `2026-09-09T12:58:28.6155644Z`;
last Python launch was `2026-09-09T12:58:46.4114242Z`. Success was not rerun.
Supervisor execution behavior and bytes remain at the reviewed hash above;
post-validation documentation describes its scenario interface separately.

#### Historical Success-Attempt Authorization And Results

The user's subsequent "continue" authorized one corrected success attempt via the
existing dedicated supervisor. It completed and passed; authorization is consumed.
No automatic retry or real installation. Reviewed
source identities before launch (SHA-256 of raw bytes):

| Source | SHA-256 |
| --- | --- |
| `tests/validate_installer_harness.py` | `6462b11ccfa729e83ae797a04929fde1e6c6eef53fd46c98bd1b2b78354775a0` |
| `scripts/test_profile_state.py` | `edcafb19545cb734f0508b3ef68807f5a01e421369667f9055623bb41dcb1152` |
| `tests/harnesses/installer_safety.ps1` | `fab6cd5af754b7f427765d09900924a59de8777f8bfdfda4c6e8d71174632c0f` |
| `installer_core.ps1` | `0c80c0218c6ed49dfa67d55c17ff09427afa4cac8dc7740b5b1ce45174d880d8` |

Launch uses absolute base Python 3.13 with `-I -B -S`; the supervisor selects
`C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`. The caller retains
the Python process object, reports its PID/start time and redirected log paths,
waits up to 40 seconds, and on timeout terminates only that owned Python handle
with a further 5-second wait. This is not descendant-tree cleanup. Inner supervisor
owns its PowerShell handle and has its existing 20-second capture budget.

Outer logs are new files under the approved Temp root with prefix
`dh-installer-supervisor-20260909-success-1`; do not overwrite an existing file.
The supervisor reports its separate fresh `dh-installer-validation-*` evidence
directory. No retry or additional scenario is implied by this attempt.

Outcome: **PASS**, one invocation, no retry. Python supervisor PID 57120 started at
`2026-09-09T12:51:02.2503579Z` and exited 0 within the outer wait. Its stderr is empty.
The fresh inner evidence is
`C:\Users\zhaobo\AppData\Local\Temp\opencode\dh-installer-validation-bjwkx785`.
`result.json` records PowerShell PID 43288, exit 0, `passed=true`, elapsed 1.58s,
`source_unchanged=true`, empty capture errors, no pending readers, no output-cap hit,
and no cleanup/finalization error fields. All four before/after hashes match the
reviewed values above. Output: 8,106 stdout bytes, zero stderr bytes.

All six profile roots started empty. Afterwards only USERPROFILE contained the
two empty directories `AppData` and `AppData/Roaming`; the other roots stayed empty.
Thus `profiles_empty=false`, `profile_delta_allowed=true`. This is an allowed
observed filesystem change, not absence of change. The 27 invalid-table calls are
inferred completed before the success report, not 27 separately reported test cases.
Only owned process completion is established; descendants were not enumerated and
absence of endpoint alerts is not established. Earlier failed evidence is untouched.

Continue in `C:\MyWorkbench\Repository\Dynamics-Helper-prompt-scope-spec` on
`hardening/plan-d-runtime-installer`; a new session is not required. Local checkpoint
HEAD is `87bc044`; it follows code commit `4e8d0c0`. Neither was pushed.

The user started step 1 (static review) of installer test-safety qualification.
Review covered `installer_core.ps1`, `tests/harnesses/installer_safety.ps1`,
`tests/validate_installer_harness.py`, `scripts/test_profile_state.py`, and related
assertions/policy. No definite static blocker for one mocked success attempt was
found. No harness was executed and no attempt was consumed during this review.

- Dot-source defines functions and returns before the real operation factory or
  production entry. All nine supplied operations record events or mutate in-memory
  state. The harness performs invalid-table checks then one update-success workflow.
- The existing dedicated supervisor checks workflow assertions and the corrected
  exact profile allowance. It distinguishes `profiles_empty` from
  `profile_delta_allowed`; allowed empty AppData/Roaming is not unchanged state.
- A run would create fresh Temp evidence and six profile directories, start one
  real PowerShell child from base Python, and capture output with two reader threads.
  No real Host, copy/delete installation operation, registry or network call is
  reachable in the reviewed fake path. This is not an OS sandbox or alert guarantee.
- Supervisor interface: base Python `-I -B -S` plus the absolute existing
  `tests/validate_installer_harness.py` path. No script arguments select success;
  `--scenario <known name>` selects one case. Do not invent an installer profile or bypass
  the gate with broad discovery; this is the separately reviewed maintained entry.
- Before execution, explicitly establish the one-attempt scope, bind the four source
  files' raw-byte review hashes, verify absolute executable/evidence paths, and own
  the supervisor process with observable PID/progress and outer cancellation.
- Child capture budget is 20 seconds and 1 MiB per stream, plus cleanup/finalization;
  this is not a whole-supervisor deadline. Evidence finalization can itself fail,
  reader threads can remain pending, and descendants are not confined. Retain and
  report failures without automatic retry or a new wrapper/framework project.

The fake installer qualification now covers all 15 declared harness scenarios:
one success with the earlier supervisor and 14 expected refusal/failure outcomes
with scenario-aware assertions. Installer core/harness bytes were unchanged across
both packages. This is not a full Host test suite or production qualification.
No more scenario retries or new framework work is needed for this bounded milestone.
The user explicitly requested committing this supervisor/documentation follow-up
and proceeding to the next step. After the local commit, inspect the existing
product-qualification procedure and artifact readiness without running a build,
installer or live product. Real installation, packaged runtime and product
integration execution remain separate scopes; no push or release is authorized.
No real installation has been performed.

#### Historical Post-Commit Product Readiness

The follow-up was committed as `7280454` (`test: qualify plain installer refusal and
failure scenarios`); the worktree was clean immediately after that commit. No push.
The installer test-safety remediation milestone can close with the 15 fake scenarios;
real installation qualification is a separate, optional continuation, not another
prerequisite for that completed milestone.

Read-only readiness inspection found an existing frozen Host output and Extension
dist version `2.0.76`, but neither is bound to current source. The only local ZIP
found is `releases/DynamicsHelper_v2.0.76-beta.2.zip`; its historical ledger binds
source `6413dba`, predating changes to both installer scripts. Do not reuse it as a
current-installer qualification candidate. No binaries or installers were executed.

Existing prerequisites and matching-installer repair scenario are in
`docs/superpowers/specs/2026-09-07-pragmatic-visible-completion-qualification-design.md`
(prerequisite checklist and Scenario 3). The old commands in
`docs/plan-d-pragmatic-cloud-pc-runbook.md` are retired, not execution authority.

Next bounded proposal: explicitly approve a local-only build/package work package
using existing build/staging functions, bind current source and package hashes,
then stop before installation. Do not run the normal `release_helper.py` CLI: it
cleans release outputs, changes versions and commits/tags even without publication.
No dependency installation, SDK upgrade, push or release is implied. Actual repair
qualification later requires an approved disposable environment and separate scope.
This readiness inspection did not build, probe, install, or mutate the product.

Do not expand into `pii-core`, SDK upgrade or new testing frameworks as prerequisites.
PowerShell terminal transport is not a separate authorization blocker. Existing
process-attempt budgets do not renew automatically. No product build, installation,
push or release follows from the checkpoint. Preserve the archive and original
incident evidence unchanged.
