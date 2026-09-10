# Plan D Pragmatic Cloud PC Results

Historical evidence summary, not an operational queue. The detailed ledger and
qualification procedure are archived historical material; see
`docs/documentation-cleanup.md`. [Qualification boundaries](plan-d-pragmatic-cloud-pc-runbook.md)
remain paused. Nothing here authorizes a new update, repair, retry, security
change, publication, or cloud operation.

## Outcomes

- The September 4 private A-to-B1 transaction committed successfully, with matching
  packaged integrity, finalization ACK, Analyze and Options smoke. B1 was
  **disqualified** because its completion notice replayed permanently; the
  transaction itself was not a failed update.
- The September 7 normal B1-to-B2 trial **FAILED: Defender quarantine**.
  B1 rollback and installed integrity were reported. B2 completion lifecycle was
  not reached; Analyze and Options persistence smoke were not recorded.
- Interrupted recovery and same-package B2 installer repair were **NOT RUN**.
  Exhaustive cloud fault injection and both legacy mixed-install directions were
  also not run. Automated boundary tests are not cloud execution evidence.
- Later beta3 complete installation restored basic Cloud PC use. It did not pass
  the failed/unrun B2 scenarios or establish an antivirus remedy.

## Artifact Identity

| Artifact | Version | Recorded source | ZIP SHA-256 |
| --- | --- | --- | --- |
| A | `2.0.74-beta.4` | `c77bd3a722259b098a8b8f4a4d1c941cc714e0cd` | `f605720d22fdc18be37673ac19b843d063e929a8a46f1132f54014f830aff6b5` |
| B1, disqualified | `2.0.76-beta.1` | `5abe35ab2ab2262d5a7abdf1d21fefe81ebeacf0` | `77fbace3562e9052378ce025dbc6e2994fcb13989a391a5996abbc7856f06b54` |
| B2 | `2.0.76-beta.2` | `6413dbad9bd258bb04cf313610d602b68424e091` | `33958f963de94fc223cacf7bce313d74d3f29e5b7f0845168b0eb552fd2a5614` |
| Beta3 safe-installer candidate | `2.0.76-beta.3` | `f283e2d` plus uncommitted changes | `e07a6ee401b625284f429cfec5273677f3fa57951c929540c7380d32cc7678ec` |

B2 was built before commit and subsequently bound to matching committed packaging
inputs, not rebuilt afterward. Beta3's candidate record is not an immutable
source-build claim or an identity claim for every later same-version package.

## Local Verification Scope

B2's five local gates passed: Host 666/666 with frozen runtime enabled and no
skips; Extension 997/997; Extension build with five default-item checks and
source/dist identity; exact PyInstaller 6.22.2 build, frozen integration 1/1 and
final ZIP probe; static/reachability checks. ZIP validation recorded 57 files and
56 manifest hash entries. React act, stale Browserslist, missing `tzdata` hidden
import, and duplicate-ZIP fixture warnings were disclosed. These historical
results are neither rerun here nor proof of cloud runtime safety.

Earlier B1/source checkpoints included a frozen-runtime skip; that skip was not
a PASS. Temporary rollback guards reported 54 PowerShell and 75 JavaScript checks;
repair guards reported 27 mock checks and independent reviews. They were not
committed CI tests and did not establish real Windows ACL/reparse behavior or
atomic cleanup safety.

## Cloud Failure And Settlement Limits

The failed B2 transaction was `ed2ff2cbbb31e571d69fc361d83777e2`. User-supplied
screenshots/events recorded `Behavior:Win32/Persistence.A!ml`, Severe,
Quarantined, affecting main/recovery executables and RunOnce recovery state.
Progress reached preparing/activating/polling before Host errors. This was a
runtime detection, not a download/hash failure; no exact triggering operation,
false positive, or malware diagnosis was established.

Later user-mediated observations found B1 packaged/verified, 51 declared product
hashes consistent, matching rollback ACK bytes, absent active/cursor paths and
zero transaction/receipt entries. Expected main registration and absent recovery
registrations/processes were observed. These non-atomic observations did not
prove durable browser idle/no URL or full settlement.

An Allowed threats entry was observed; the user later reported changing Allow to
Block and visible threat-action IDs fell to zero. Complete override removal and
policy equivalence remained unverified. Detector-side changes were an
evidence-backed hypothesis, not a proven cause or approved remedy.

On September 8, separate maintenance encountered main-Host unavailability and a
reported `Trojan:Script/Wacatac.C!ml` quarantine. Its timeline preceded the later
candidate-state replacement. No normal update began; this was not B2 execution
or proof that a storage write triggered detection. The sample hash/trigger were
not established. Historical B2 FAIL remains unchanged.

## Beta3 And Local Repair

The beta3 milestone removed unverified startup Extension migration, excluded only
development-time Pydantic mypy plugins, and removed unsafe installer protection
bypass, forced termination, and Roaming-data overwrite behavior. These addressed
concrete bugs, not a demonstrated cause of either detection.

Recorded verification: 33/33 local product/build/Host-integrity tests ultimately
passed, 17/17 isolated installer safety tests, final frozen package probe and
controlled SDK/Pydantic imports passed. Wrapper corrections and a transient
staging rename denial remained disclosed. Controlled imports were not model
inference. The user reported Cloud PC installer exit 0, both beta3 versions,
successful model-list Refresh and working Analyze. Protected config was unchanged
and both editable prompts remained absent. No final Defender audit, long-term
compatibility, or successful beta3 automatic-update/recovery qualification was
established; the `tzdata` warning remained.

After later public beta3 publication, a separate LOCAL legacy overlay upgrade
produced a verified mixed-file installation: runtime 616 extras/18 hash
mismatches and Extension 44 extras. The user reported no Defender block for that
attempt. One authorized complete installer repair passed packaged/verified
(runtime 34/34, Extension 13/13), preserved all three config/prompt hashes, left
no owned processes, and removed the mismatch banner without browser-state reset.
That repair did not convert the failed legacy overlay into a successful
transactional upgrade or alter the earlier Cloud PC failure.

## Distribution Closure

The original private distribution and all three subsequent runs were
ownership-checked and deleted/closed; revoked access/absence was verified.
Beta3 Cloud PC installation used redirected-drive transfer, not a new live cloud
distribution. Private records and backups were retained. Distribution closure
does not establish product settlement and authorizes no deletion of recovery
evidence or unrelated resources.
