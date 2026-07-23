# Remote VM Development Handoff — 2026-07-15

## Purpose

This file is the durable continuation point for moving Dynamics Helper development to a remote Windows VM. Read it before making changes; do not rely on prior chat context.

## Repository State

- Repository: `boatmac/Dynamics-Helper`
- Prompt-scope implementation branch: `docs/prompt-scope-cleanup-design`
- Isolated worktree: `C:\Users\zhaobo\AppData\Local\Temp\opencode\Dynamics-Helper-prompt-scope-spec`
- Product implementation Tasks 1-6: approved through `0f57f8e`
- Implementation/documentation Tasks 1-7: approved through `90e6da3` (`docs(persistence): correct result lifecycle semantics`)
- Task 8 evidence: `9127546` plus `73b8adf`; first-review fixes/evidence are `907acd0` and `6b9631f`
- Second whole-branch Important-finding implementation: `cb760a4` plus comment-only follow-up `3e18244`
- Fifth whole-branch Important-finding product fix: `77df5ec` (`fix(review): preserve asynchronous intent ownership`)
- Sixth whole-branch review product fix: `adeb9ef` (`fix(review): make async commit truth durable`); evidence follows in `.superpowers/sdd/sixth-final-review-fix-report.md`
- Seventh whole-branch Important-finding product fix: `85355f8` (`fix(review): harden storage commit truth`); evidence is `a7513e5` plus the following metadata correction in `.superpowers/sdd/seventh-final-review-fix-report.md`
- Eighth whole-branch Important-finding product fixes: `0a23315` (`fix(review): preserve personal reset and retry truth`) and `fcc6467` (`fix(review): align reset cache status truth`); evidence follows in `.superpowers/sdd/eighth-final-review-fix-report.md`
- Ninth whole-branch Important-finding product fixes: `5596afa` (`fix(reset): require host commit before cleanup`), `9763b2e` (`fix(bookmarks): retain failed persistence intent`), `d88c206` (`fix(team): normalize no-team manifest identity`), and `f5d4acc` (`fix(native): restrict error fallbacks to strings`); evidence follows in `.superpowers/sdd/ninth-final-review-fix-report.md`
- Tenth whole-branch Important-finding product fixes: `257f282` (`fix(reset): preserve committed cleanup ownership`) and `7979279` (`fix(errors): share string-only fallback selection`); evidence follows in `.superpowers/sdd/tenth-final-review-fix-report.md`
- Controller broad whole-branch review: **pending rerun after the tenth fix wave**
- Accepted prompt-scope spec: `441d0db` (`docs(spec): define deterministic DH prompt scopes`)
- Accepted implementation plan: `21108d9` (`docs(plan): add DH prompt scope implementation plan`)
- Source version: `2.0.74-beta.4`
- Historical published baseline: `v2.0.74-beta.4`
- Release URL: <https://github.com/boatmac/Dynamics-Helper/releases/tag/v2.0.74-beta.4>
- Release asset: `DynamicsHelper_v2.0.74-beta.4.zip`
- Historical local-machine Native Messaging registry mode at the original handoff: **DEV** (machine-local state; it does not transfer through Git)

Historical beta.4/research baseline before prompt-scope implementation:

```text
0040b1d docs(handoff): persist remote VM continuation state
3241656 docs(research): add integrated Stage 0/1 pipeline and DH plan
d91c92a docs(research): DH x MyCasesKit Stage 0 instructions brief
88bdd0d chore: release v2.0.74-beta.4
0b0bb66 fix(session): bind Copilot sessions to configured workspace root
c5e282e chore: release v2.0.74-beta.3
```

Prompt-scope implementation commits after the accepted spec/plan:

```text
e6e3155 feat(prompt): add deterministic prompt source resolver
2601663 feat(session): isolate and refresh prompt sources
abc9d1f fix(session): repair prompt lifecycle transitions
ef257ec fix(session): invalidate exited active sessions
2428172 fix(config): surface prompt source health and clears
6da6120 fix(config): harden partial update failures
8d9561a fix(config): invalidate attempted durable writes
527851b feat(extension): preserve prompt source errors
916c4b6 feat(options): expose deterministic prompt source mode
55decd3 fix(options): hydrate skills by effective prompt mode
eacda76 fix(options): preserve skills across mode edits
6fdd22e fix(options): inspect prompt config persistence
378fffd fix(options): serialize config update intents
11cbed3 fix(options): order config mirror side effects
0f57f8e fix(options): guard passive hydration mirrors
ca65519 docs(prompt): document deterministic instruction scopes
6fdd8f5 docs(prompt): correct Task 7 review findings
90e6da3 docs(persistence): correct result lifecycle semantics
9127546 docs(verification): record prompt scope test evidence
73b8adf docs(verification): isolate prompt scope host evidence
907acd0 fix(prompt): close review race and secret gaps
6b9631f docs(verification): record final review fixes
cb760a4 fix(review): close remaining race and logging gaps
3e18244 docs(review): align stale-result comments
b39b46a docs(verification): record second review fixes
67fb4bb fix(review): serialize shared storage ownership
927d924 docs(verification): record third review fixes
e3ba1ca fix(review): harden request-scoped authority
e1fb39c docs(verification): record fourth review fixes
77df5ec fix(review): preserve asynchronous intent ownership
0faf649 docs(verification): record fifth review fixes
adeb9ef fix(review): make async commit truth durable
540283e docs(verification): record sixth review fixes
85355f8 fix(review): harden storage commit truth
a7513e5 docs(verification): record seventh review fixes
87278d5 docs(review): correct seventh verification metadata
0a23315 fix(review): preserve personal reset and retry truth
fcc6467 fix(review): align reset cache status truth
c7daa9d docs(verification): record eighth review fixes
cec901d docs(review): correct eighth verification metadata
5596afa fix(reset): require host commit before cleanup
9763b2e fix(bookmarks): retain failed persistence intent
d88c206 fix(team): normalize no-team manifest identity
f5d4acc fix(native): restrict error fallbacks to strings
b9cb024 docs(verification): record ninth review fixes
257f282 fix(reset): preserve committed cleanup ownership
7979279 fix(errors): share string-only fallback selection
HEAD docs(verification): record tenth review fixes
```

These commits do not change version fields, release tags, `host/system_prompt.md`, UUIDv5 identity, or MyCasesKit. They have not implemented MyCases integration. Tenth-wave starting head `b9cb024` was 47 commits ahead of `origin/master`; its two product commits make the clean product head `7979279`, 49 ahead and 0 behind. The evidence commit containing this handoff/report update will make the branch 50 ahead and 0 behind. The controller must still rerun its broad whole-branch review.

## Remote VM Bootstrap

After `git pull`, verify/install dependencies as needed:

```powershell
npm install --prefix extension
```

```powershell
python -m venv host\venv
```

```powershell
& "host\venv\Scripts\python.exe" -m pip install -r host\requirements.txt
```

Run baseline verification:

```powershell
& "host\venv\Scripts\python.exe" -m unittest discover host
```

```powershell
npm run test:run --prefix extension
```

```powershell
npm run build --prefix extension
```

For browser integration on the VM, inspect registry mode before changing it:

```powershell
python dev_switch.py status
```

Switch to source/DEV only when ready to test the local Host:

```powershell
python dev_switch.py dev
```

The VM must have GitHub Copilot CLI installed and authenticated. The host venv must use `github-copilot-sdk==1.0.5` (see `host/requirements.txt`).

## v2.0.74 Beta Line Delivered

### beta.1 — Options layout

- Reorganized Options into a left sidebar + content pane.
- Sections: General, Appearance, Copilot Configuration, Model & Performance, Team Catalog, Bookmark Manager.
- Fixed Bookmark Manager label.
- Made instruction preview/edit panes resizable.
- Made Bookmark Manager resizable; default height reduced to 900px.
- Fixed duplicated `v` in update messages.

### beta.2 — About & Help

- Added seventh Options tab: About & Help.
- Shows Extension/Host versions and update controls.
- Links to User Guide, releases, and bug reporting.
- Adds troubleshooting guidance and copyable log path.
- Added privacy link and localization.
- `Copied!` confirmation auto-dismisses after 2 seconds.

### beta.3 — i18n audit

- Localized remaining high-confidence hardcoded UI strings in Options, FAB, MarkdownPreview, native dialogs, placeholders, tooltips, and error prefixes.
- Added/updated English + Chinese translation keys and full-width Chinese punctuation.
- Deliberately retained technical enum values, brand names, log-level names, and other agreed technical labels.

### beta.4 — workspace-root session persistence

Fixed the root cause of Copilot CLI `/resume` restoring a DH session into the Native Host/extension directory instead of the configured Root Path.

Historical beta.4 behavior at release:

- Config loads before `CopilotClient` construction.
- Client, `create_session`, and `resume_session` receive the same explicit `working_directory`.
- Root changes restart the CLI client.
- Startup initializes only the client; it does not create a generic session.
- Options updates preserve deterministic UUIDv5 case-session identity.
- Desired config root, client process root, and active-session root are tracked separately.
- Empty/missing Analyze `rootPath` falls back to canonical Host config (protects the extension pre-hydration window).
- Runtime Root overrides drove cwd, Skills, MCP, and the then-current workspace-instruction behavior consistently.
- Relative roots are rejected.
- Corrupt config fails closed instead of silently persisting Host cwd.
- Refresh/retry/broken-pipe/timeout failure paths invalidate stale state.
- Reports print a root-bound command:

```powershell
copilot -C '<root>' --resume=<uuid>
```

At the beta.4 baseline, this applied the Root before CLI workspace discovery and overrode stale cwd metadata from old sessions. Current DH SDK instruction selection is the explicit, discovery-disabled architecture documented below; the report command still establishes the correct Root for interactive CLI continuation.

## Historical Verification Baseline

The following is historical evidence for the published beta.4 workspace-root session fix, not final verification of the prompt-scope implementation:

- Host: **109/109** tests passed.
- Extension: **43/43** tests passed.
- Extension production build passed.
- `py_compile` passed for modified Host/test files.
- `git diff --check` passed.
- Final static gate: READY.

Real SDK smoke (no prompt/model call):

- Created a temporary random-UUID SDK session with the configured root.
- Verified persisted `workspace.yaml.cwd` equals the configured root.
- Resumed with explicit root successfully.
- Deleted the temporary session successfully.

Workspace regression coverage lives in:

`host/test_session_workspace.py`

Durable implementation evidence is the accepted spec `441d0db`, plan `21108d9`, Host range `e6e3155..8d9561a`, Extension error commit `527851b`, Options range `916c4b6..0f57f8e`, and Task 7 documentation/correction range `ca65519..90e6da3`. Do not turn task-level historical counts into a final release claim.

## Prompt-Scope Final Verification - 2026-07-16

Task 8 ran against approved pre-verification head `90e6da3a03050ef53526d253ec0cf7989efa8e47` in the isolated worktree on `docs/prompt-scope-cleanup-design`. The Host environment was Python **3.13.13** with `github-copilot-sdk` **1.0.5**. Native Messaging remained in the provided **PROD** mode; no registry switch was performed.

Safety correction: the Host commands recorded by `9127546` launched without overriding `LOCALAPPDATA`. Host import creates `%LOCALAPPDATA%\DynamicsHelper`, opens `native_host.log`, and conditionally reads startup `config.json`, so those runs could access real VM-local product state at import time. They are superseded and are not relied on as final Host evidence. No product AppData content was intentionally inspected or modified during Task 8, but the earlier claim that AppData was never read or written was too strong.

The correcting run set `LOCALAPPDATA`, `TEMP`, and `TMP` to a new empty scratch root before each Python process started and restored the parent environment afterward. An import probe confirmed `USER_DATA_DIR`, `LOG_FILE`, startup `config.json`, and the emergency log all resolved only beneath:

```text
C:\Users\zhaobo\AppData\Local\Temp\opencode\Dynamics-Helper-task8-isolated-b9b617e4e295434ab94d89da075ee996
```

Accepted isolated Host commands:

```powershell
$env:LOCALAPPDATA = $isolatedRoot
$env:TEMP = Join-Path $isolatedRoot "Temp"
$env:TMP = Join-Path $isolatedRoot "Temp"
& "host\venv\Scripts\python.exe" -m compileall -q host
$env:PYTHONPATH = "host"
& "host\venv\Scripts\python.exe" -m unittest host.test_prompt_sources host.test_prompt_session host.test_session_workspace host.test_sdk_compat -v
Remove-Item Env:PYTHONPATH -ErrorAction SilentlyContinue
& "host\venv\Scripts\python.exe" -m unittest discover host
```

Each command was launched inside a `try`/`finally` wrapper that restored or removed all four environment variables after Python exited. The accepted focused gate is the explicit discovery-equivalent four-module command with `PYTHONPATH=host`. The package-style focused command without `PYTHONPATH` remains a diagnosed pre-existing unsupported invocation; it is not a passed gate. This is an execution correction, not a waived failure.

Fresh gate results:

- Isolated Python `compileall`: **passed** with exit 0 and no diagnostics.
- Isolated focused Host: **108/108** passed in 2.933s: `host.test_prompt_sources` 46, `host.test_prompt_session` 22, `host.test_session_workspace` 26, and `host.test_sdk_compat` 14.
- Isolated full Host discovery: **178/178** passed in 2.097s.
- Focused Extension: **88/88** passed across 4 files in 11.17s using `--reporter=dot`.
- Full Extension: **118/118** passed across 9 files in 11.90s using `--reporter=dot`.
- Extension production build: **passed** in 7.16s; TypeScript and Vite completed, 2,215 modules were transformed, and 14 output artifacts were listed.
- Pre-commit static Git checks: `git diff --check` reported **0** whitespace errors, only `docs/session-handoff-2026-07-15.md` was modified, the release draft was unchanged, and the stale-marker scan over the handoff and release draft reported **0** matches.

The fresh isolated totals are unchanged from `9127546`, but only the isolated reruns are final Host evidence. After the runs, the scratch tree contained only expected import-generated files: `DynamicsHelper/native_host.log` and `Temp/dh_startup.log`. No scratch `config.json`, instruction, prompt, session, or other default artifact existed. The scratch root was then deleted successfully.

Fresh Extension commands recorded verbatim:

```powershell
npm run test:run --prefix extension -- src/utils/promptSourceErrors.test.ts src/background/analyzeBridge.test.ts src/hooks/useAnalysisHydration.test.ts src/components/Options.test.tsx --reporter=dot
npm run test:run --prefix extension -- --reporter=dot
npm run build --prefix extension
```

Optional authenticated marker smoke: **not run**. Proving all three source modes would require changing the DH-specific AppData instruction file and the CLI-global home instruction file. Task 8 explicitly prohibits modifying those VM-local files, and no verified isolated user-data/root/session arrangement was available that both preserves authentication and guarantees production prompt/session state cannot be read or written. The smoke is optional and is not a completion gate.

The release prose exists only as the concise unversioned draft `releases/notes-prompt-scope-cleanup-draft.md`. No release version was selected; no version field, tag, package, registry value, MyCases canonical file, or publication target was changed. The later final whole-branch review and fixes are recorded below.

## Final Review Fix Addendum - 2026-07-17

Starting head: `73b8adfbe013e4f2b0277193d55c1e019b436c6c`. Reviewed product/test/documentation fix head: `907acd0` (`fix(prompt): close review race and secret gaps`). The subsequent evidence-only commit is the branch `HEAD`; inspect `git rev-parse HEAD` for its exact identity. Full commands, totals, and mutation evidence are recorded in `.superpowers/sdd/final-review-fix-report.md`; the release draft carries only concise release-facing behavior.

The coordinated fix wave adds these boundaries without changing version fields, release/tag/package/registry state, `host/system_prompt.md`, UUIDv5 identity, or MyCases scope:

- Team Catalog warnings expose only classified kind/numeric status and fixed diagnostics, never credential-bearing URLs, status text, or thrown values.
- FAB replaces/removes a trailing `## User Prompt` section using the current value immediately before every send, including preformatted context; Host PII scrubbing remains unchanged.
- Initial Chrome storage hydration preserves every touched/reset/default-valued field and cannot send stale storage values back to Host.
- Manifest-only fetch commits re-read current preferences and skip stale Reset/URL-change responses.
- Latest acknowledged config writes run a generation-gated health-only `get_config` that cannot rehydrate Options or create an update loop.
- Analysis results persist optional `requestId`; seen acknowledgment re-reads and matches request identity, or exact legacy case/timestamp, before writing.

The optional authenticated marker smoke remains **not run**. Safe model-backed isolation still was not available without risking authenticated user/session state, and the accepted design treats this smoke as non-gating.

Fresh gates run from committed product head `907acd0`:

- Isolated focused Host with `PYTHONPATH=host`: **109/109** passed (the prior four prompt modules plus the debug-script AST isolation test).
- Isolated full Host discovery: **179/179** passed.
- Focused Extension review suite: **105/105** passed across 8 files.
- Full Extension: **144/144** passed across 13 files.
- Extension production build: **passed**, TypeScript and Vite exit 0, 2,217 modules transformed, 14 artifacts listed.
- Isolated Python `compileall -q host`: **passed** with no diagnostics.
- `git diff --check` and review static scans: **passed**.

## Second Review Important-Fix Addendum - 2026-07-17

Starting head: `6b9631f0a42e7934913831c989214aea59a1ade0`. Product/test/documentation fix commit: `cb760a4` (`fix(review): close remaining race and logging gaps`), followed by comment-only `3e18244`. Full commands, RED/GREEN and mutation evidence, file mapping, and concerns are recorded in `.superpowers/sdd/second-final-review-fix-report.md`.

The coordinated TDD wave closes the six remaining Important findings:

- Full selected-team sync rechecks current enabled/URL/team preferences before manifest, 304 timestamp, and changed bookmark commits; stale results are discriminated and ignored by Options and Service Worker consumers.
- Analysis consumption writes separate identity-only `dh_seen_analysis:*` acknowledgments and never read-modify-writes `dh_last_analysis`; the singleton acknowledgment, legacy `last.seen`, and exact case/timestamp identities remain supported for compatibility.
- `usePrefs` registers `storage.onChanged` before its initial get and generation-gates a delayed stale snapshot, including reset-empty/default values.
- Custom User Prompt truncation starts at the first authoritative line-level marker, so duplicate stale sections cannot survive.
- Bookmark telemetry contains label/source/type but no URL, and related catch logs avoid thrown URL text.
- Host SDK response logs and no-content reports use metadata only: event type, data type, content presence, and content length.

Fresh gates run from product head `cb760a4` with every Host process using an isolated `LOCALAPPDATA`:

- Focused Host with `PYTHONPATH=host`: **111/111** passed in 5.963s.
- Full Host discovery: **181/181** passed in 5.146s.
- Focused Extension review suite: **127/127** passed across 10 files in 18.80s.
- Full Extension: **166/166** passed across 15 files in 18.95s.
- Extension production build: **passed**, TypeScript and Vite exit 0, 2,217 modules transformed, 14 artifacts listed in 7.50s.
- Isolated Python `compileall -q host` and `git diff --check 6b9631f..cb760a4`: **passed** with no diagnostics.

The optional authenticated marker smoke remains skipped because safe isolation of authenticated user/session state was not guaranteed. The controller broad whole-branch review remains pending and must not be inferred from these focused/self-review results.

## Third Review Fix Addendum - 2026-07-17

Starting head: `b39b46a01de5c6a00176a89f084e61a50a7ce196`. Product/test/documentation fix commit: `67fb4bb` (`fix(review): serialize shared storage ownership`). The third coordinated TDD wave makes the Service Worker the serialized owner of Team Catalog cache/clear/reset state, preserves full selected-team sync status and identity, generation-gates every Options callback branch, and stamps/rejects mismatched cache identities. Analysis state now uses one mutation queue, one coherent hydration snapshot, and deterministic per-identity seen keys with legacy singleton compatibility. Host SDK/CLI exception paths log and return safe operation/type summaries only while preserving transport invalidation. Full commands, mutations, files, and concerns are recorded in `.superpowers/sdd/third-final-review-fix-report.md`; the subsequent evidence commit is the branch `HEAD`.

Fresh gates from committed product head `67fb4bb`, with every Host process using isolated `LOCALAPPDATA` and focused Host using `PYTHONPATH=host`:

- Focused Host: **123/123 passed** across prompt/config/session/workspace/SDK/debug modules.
- Full Host discovery: **187/187 passed**.
- Focused Extension review suite: **143/143 passed across 6 files**.
- Full Extension: **198/198 passed across 16 files**.
- Extension production build: **passed**, TypeScript and Vite exit 0, **2,216 modules transformed**, **13 artifacts listed**.
- Isolated Python `compileall -q host`, `git diff --check b39b46a..HEAD`, mutation proofs, and static ownership/secrecy scans: **passed**.

The optional authenticated marker smoke remains skipped unless safe authenticated isolation can be guaranteed. The controller broad whole-branch review remains pending after this wave; no focused/self-review result substitutes for it.

## Fourth Review Fix Addendum - 2026-07-17

Starting head: `927d92497d59aeea44ff2346fc7db976574d4d95`. Product/test/documentation fix commit: `e3ba1ca` (`fix(review): harden request-scoped authority`); the evidence commit containing this addendum follows it. The fourth coordinated TDD wave adds captured Team Catalog request identity/generation before every clear/fetch, synchronous generation invalidation, request-scoped analysis pending keys, independent hydrated/local spinner ownership, Host-authoritative per-Analyze `user_prompt.md` canonicalization before PII scrubbing, permission-log redaction, and one safe SDK exception boundary. It also corrects the Options post-render immutable-intent documentation. Exact implementation/evidence commit IDs, mutation proof, and concerns are recorded in `.superpowers/sdd/fourth-final-review-fix-report.md`.

Fresh committed-tree gates, with every Host process using isolated `LOCALAPPDATA` and focused Host using `PYTHONPATH=host`: **134/134 focused Host**, **198/198 full Host**, **180/180 focused Extension across 7 files**, and **224/224 full Extension across 17 files**. Production build passed with **2,216 modules transformed** and **13 artifacts listed**. Isolated `compileall -q host`, `git diff --check 927d924..HEAD`, static scans, and temporary break-and-fail mutations passed. Including the evidence commit, the branch is **31 ahead, 0 behind `origin/master`** at handoff time.

The branch remains unversioned and unpublished. No push, tag, package, registry, real `%LOCALAPPDATA%\DynamicsHelper`, or MyCases operation was performed. The controller broad review remains pending after this wave.

## Fifth Review Fix Addendum - 2026-07-17

Starting head: `e1fb39c0ef81fbb873e0e653f3d37661cc3300b3`.
Product/test/spec commit: `77df5ec7fe04e39c8d31d1537572a2672b201f71`
(`fix(review): preserve asynchronous intent ownership`). The fifth coordinated
TDD wave adds soft `user_prompt_unreadable` health with sparse omission,
immutable Custom User Prompt revision/value intents, ordered mirror actions that
survive compatible newer commits, generation-gated Options/Menu team reads, and
request-ID-owned FAB spinner/timers. Exact RED/GREEN and mutation evidence is in
`.superpowers/sdd/fifth-final-review-fix-report.md`; the evidence commit follows
the product commit.

Fresh committed-tree gates, with every Host process using isolated
`LOCALAPPDATA` and focused Host using `PYTHONPATH=host`: **132/132 focused
Host**, **204/204 full Host**, **158/158 focused Extension across 7 files**, and
**248/248 full Extension across 17 files**. Production build passed with
**2,216 modules transformed** and **13 artifacts listed**. Isolated
`compileall -q host`, `git diff --check`, sparse/action/ownership static scans,
and temporary break-and-fail mutations passed.

No push, tag, publish, version, package, registry, real AppData, or MyCases
operation occurred. The optional authenticated smoke remains safely skipped.
After the evidence commit, the branch is **33 ahead, 0 behind `origin/master`**;
the controller broad review remains pending after this fifth wave.

## Sixth Review Fix Addendum - 2026-07-17

Starting head: `0faf6493df81d7aaad70da63ac05eb25e8b57257`. This
coordinated TDD wave serializes/coalesces Options preference mirrors with Chrome
storage error handling, makes Reset responses tokenized and truthful, retains
FAB request ownership through asynchronous hashing, removes Custom User Prompt
reads from session-refresh config, and rejects explicit-null DH-specific
Instructions before all writes. Stale/failed/transport/superseded Reset keeps
current UI values, performs no local cleanup, and shows a persistent incomplete
warning instead of success.

Exact RED/GREEN, mutation proof, committed-tree verification totals, commit IDs,
and safety constraints are recorded in
`.superpowers/sdd/sixth-final-review-fix-report.md`. The optional authenticated
smoke remains safely skipped. No version, tag, push, package, registry, real
AppData, or MyCases operation is part of this wave. Controller broad whole-branch
review remains pending after the sixth fixes.

Fresh committed-product gates: **135/135 focused Host**, **207/207 full Host**,
**114/114 focused Extension across 3 files**, and **261/261 full Extension
across 18 files**. Production build passed with **2,217 modules transformed**
and **13 artifacts listed**. Corrected isolated source-only compileall, diff,
version, stale-mutation, and generated-dist checks passed. Including the
evidence commit, the branch is expected to be **35 ahead, 0 behind
`origin/master`**.

## Seventh Review Important-Fix Addendum - 2026-07-17

Starting head: `540283edcd03b64189a64368fe8fe984622e2033`.
Product/test/documentation commit: `85355f81ec01c75a1c26e49b391ba1d4911b768d`
(`fix(review): harden storage commit truth`). Hydration catch-up now captures an
immutable preference/config intent and enters the same single-flight mirror
queue as ordinary saves. Its suppressed-warning Host update runs only from the
successful latest-commit callback; failed storage retains the intent and sends
nothing, while a newer successful edit sends only its latest payload.

Team Catalog callback-style set/remove wrappers now reject on callback-scoped
`chrome.runtime.lastError`. Manifest, changed bookmark, 304 timestamp, clear,
and Reset failures return failed truth, never committed; failed selected-sync
responses expose no items or timestamp. The mutation queue remains recoverable
for later operations. Exact RED/GREEN and restored break proof is in
`.superpowers/sdd/seventh-final-review-fix-report.md`.

Fresh gates: **135/135 focused Host**, **207/207 full Host**, **159/159 focused
Extension across 4 files**, and **272/272 full Extension across 18 files**.
Production build passed with **2,217 modules transformed** and **13 artifacts
listed**. Isolated source-only compileall, TypeScript/static, diff/version, and
restored-mutation checks passed. Optional authenticated smoke remains skipped;
controller broad whole-branch review remains pending. No push, tag, publish,
version, package, registry, real AppData, or MyCases operation occurred. Version
fields remain package/Host `2.0.74-beta.4` and Chrome manifest `2.0.74`.

## Eighth Review Important-Fix Addendum - 2026-07-17

Starting head: `87278d54bc4f75a24250e011e2a5322f8b805c46`.
Product/test/documentation commits: `0a23315fd9dcc3893e14c5343383722214b23b01`
(`fix(review): preserve personal reset and retry truth`) and
`fcc6467b5788ccb896a448b4ce58f5146b1311c8` (`fix(review): align reset
cache status truth`).

Every personal bookmark add/edit/delete/move/import/collapse and Reset intent now
increments one generation through `mutatePersonalItems`; all `dh_items`
writes/removes share one queue. A newer mutation cancels personal Reset cleanup
without undoing committed shared Service Worker cleanup, survives delayed
response/removal in storage and UI, and shows a partial-reset warning. Stored
empty menus remain authoritative in Options and FAB; normal Reset reloads
collapsed packaged defaults.

Native Host error normalization now allowlists string `errorKind` and finite
numeric `httpStatus` while preserving success `data` unchanged and dropping
arbitrary fields. Host-shaped auth/unavailable/unknown model-list failures reach
Options with their classification, and auth selects re-auth guidance.

Manifest blur state now separates last successful URL from a tokenized in-flight
URL. Same-URL concurrent requests coalesce; only current identity-matching
`committed`/`unchanged` responses mark success. Auth/network/transport/failed/
stale/skipped and first-time no-team paths retry. Old A callbacks cannot release
or complete B, Reset invalidates success after cache clear, and a failed B after
resetting A's cache permits A to refetch.

Fresh clean-product-head gates: **143/143 focused Host**, **207/207 full Host**,
**207/207 focused Extension across 6 files**, and **303/303 full Extension
across 18 files**. Production build passed with **2,217 modules transformed**
and **13 artifacts listed**. Source-only compileall, TypeScript, diff, version,
generated-dist, mutation-restoration, and static ownership/allowlist/ref scans
passed. Exact RED/GREEN, commands, concerns, and constraints are in
`.superpowers/sdd/eighth-final-review-fix-report.md`.

Optional authenticated marker smoke remained skipped because safe model-backed
user/session isolation was unavailable. No push, tag, publish, version, package,
registry, real `%LOCALAPPDATA%\DynamicsHelper`, or MyCases operation occurred.
Controller broad whole-branch review remains pending.

## Ninth Review Important-Fix Addendum - 2026-07-17

Starting head: `cec901dc28074091e533be764cf2dbc4ba7c49fd`.
Product/test commits:

- `5596afa0bbc2635e517428878c98b65cbd2b983d` (`fix(reset): require host commit before cleanup`)
- `9763b2e32af3805fb6ae998663e8bc2e532e37bc` (`fix(bookmarks): retain failed persistence intent`)
- `d88c206f2484cde7824c3c3b48473a3ea3c729a7` (`fix(team): normalize no-team manifest identity`)
- `f5d4acca883acf8b9ea0d0db76cc01f37f8fa994` (`fix(native): restrict error fallbacks to strings`)

At the ninth product head, Reset added one token and a Host-before-SW durability
gate. Unsaved/transport Host failure performed no SW destruction, and
`config_saved: true` refresh failure could continue to SW. However, the intended
post-Host retry still lived in a supersedable preference-mirror action. The
tenth review found that newer preference identity could drop that ownership;
the phased transaction in the following addendum supersedes the ninth retry
claim.

Personal bookmark set/remove callbacks no longer disappear into the queue tail.
The newest complete snapshot/removal intent remains pending after failure, the
Options page shows localized persistent bookmark-save truth, Reset cannot claim
completion, and the next bookmark mutation coalesces and retries the newest UI
snapshot. Normal success clears only the bookmark warning; simultaneous partial
Reset/config warnings remain visible.

Every Options team current/response comparison now normalizes omitted team
identity to `''`. No-team `committed`/`unchanged` manifest responses mark URL
success and deduplicate; auth/network/failed/stale/skipped outcomes display and
retry; a callback captured before team selection is ignored afterward.

The ninth string-only change applied to `normalizeNativeHostResponse`: its outer
error envelope accepts only string `error`/`message` fallback values and retains
the existing metadata allowlist. It did not yet cover direct inner Analyze,
config-update, prompt-health, or FAB extraction; the shared selector in the
tenth addendum closes that gap.

Fresh gates at product head `f5d4acc`: **143/143 focused Host**, **207/207 full
Host**, **231/231 focused Extension across 6 files**, and **327/327 full
Extension across 18 files**. Production build passed with **2,217 modules
transformed** and **13 artifacts listed**. Isolated source-only compileall,
TypeScript, diff/version/generated-output checks, static identity/ownership/
allowlist scans, and one restored mutation per finding passed. Exact RED/GREEN,
commands, concerns, and safety constraints are in
`.superpowers/sdd/ninth-final-review-fix-report.md`.

Optional authenticated marker smoke remained skipped because safe model-backed
user/session isolation was unavailable. No push, tag, publish, version, package,
registry, real `%LOCALAPPDATA%\DynamicsHelper`, or MyCases operation occurred.
Controller broad whole-branch review remains pending.

## Tenth Review Important-Fix Addendum - 2026-07-17

Starting head: `b9cb0246a4e4e04c23580850150c6df03680edcc`.
Product/test commits:

- `257f28245f7bd089304aa20a20ea67b4bfe22785` (`fix(reset): preserve committed cleanup ownership`)
- `7979279d347f57ca5bcd684abe71b4db78283e37` (`fix(errors): share string-only fallback selection`)

The ninth Reset report overclaimed ownership after a newer preference edit. The
actual retry was still stored as a preference-mirror action and could be
superseded. Options now keeps an explicit transaction with token, default Team
identity, request/bookmark generations, retry action, and phases
`host-pending|host-committed|sw-pending|local-cleanup-pending|complete`. Durable
Host acknowledgment is stored before callback supersession checks. Retry
cleanup uses the original token and only pending SW/local cleanup; it never
resends Host or rewrites defaults. A normal Reset remains an intentional fresh
transaction. SW and local cleanup use separate identity/generation gates so a
newer language or bookmark edit survives.

The ninth string-only change covered only the outer Native response normalizer.
`safeErrorText` now provides one no-coercion selector for inner/outer Analyze,
config updates, Options prompt health/immediate warnings, FAB nested/outer/catch
display, and Service Worker immediate normalization. Throwing secret-bearing
objects/arrays/functions/symbols are ignored; valid strings and existing
`error_code`/`errorKind`/`httpStatus` allowlists remain intact.

Fresh committed-product gates used isolated Host AppData roots: **143/143
focused Host**, **207/207 full Host**, **210/210 focused Extension across 7
files**, and **340/340 full Extension across 19 files**. Production build passed
with **2,218 modules transformed** and **13 artifacts listed**. Source-only
compileall, version/generated-output checks, diff/static scans, and restored
phase/coercion mutations passed. Exact RED/GREEN, rejected-command notes,
concerns, and constraints are in
`.superpowers/sdd/tenth-final-review-fix-report.md`.

Optional authenticated smoke remained skipped because safe model-backed
user/session isolation was unavailable. No push, tag, publish, version, package,
registry, real `%LOCALAPPDATA%\DynamicsHelper`, or MyCases operation occurred.
Controller broad whole-branch review remains pending.

## Plan B Journal Engine Addendum - 2026-07-23

Implementation base after reviewed Plan A: `00fff06741f3c8a575fd3c6eba45c4d7cd1b1a62`.
Plan B product/test commits:

- `3bfb1faa65ec049cfece1a6378f0ba143566be41` (`feat(update): add strict transaction journal`)
- `b1158a4` (`feat(update): persist exact product ownership`)
- `1f26277` (`feat(update): serialize installation mutation`)
- `0fce143` (`feat(update): prepare and replace host under mutex`)
- `d91698c` (`feat(update): install extension metadata and fresh seed`)
- `41d7ccf` (`fix(update): verify installed ownership before mutation`)
- `2e41229` (`feat(update): preserve rollback failure lineage`)
- `9ca3fadfb6edabad2285bad42ea95e5fab7a4f73` (`test(update): exhaust journal fault matrix`)

Plan B now provides strict transaction IDs/journals, stable
`updates/active.json`, exact Plan A-linked ownership, one installation mutation
mutex, atomic `<id>.preparing` promotion, idempotent Host/Extension/metadata
phases, exact live probe, evidence-preserving rollback/retry, and terminal
cleanup. Browser activation uses immutable `{pid, creation_token}`; installer
activation uses null identity and skips waiting. Current `reason_code` is
separate from immutable `original_failure_code`/`rollback_from`. Fresh seed
receipts preserve transaction-installed and user-created/edited config.

The literal matrix covers installed, legacy-v1, fresh-seeded,
fresh-preexisting, and fresh-post-plan-user-creation modes. It freezes 216
operation labels across three axes (648 cases), 65 phase-transition crashes, and
2 seed-receipt transition crashes. The final candidate gates passed **76/76
focused Plan B in 528.913s** and **349/349 full Host in 543.192s**, with no
skips. Compileall, stale-contract/scope scans, Plan A signature/field probe,
transaction-writer ownership, and diff checks passed.

This engine remains dormant. The legacy updater is still the production route;
`transactional-update-v1` remains unadvertised until Plan D cutover. Plan C must
consume Plan B's exact readers/paths/API, use `probe_manifest`, retry recovery
with `original_failure_code`, write its terminal receipt before calling
`finalize_terminal_evidence`, and serialize terminal identity via
`terminal_version` (including null version for fresh rollback). No real update,
installer, registry, AppData installation, network, release, version, tag, push,
or publish operation occurred.

## Session Identity Contract

- Case session ID is deterministic UUIDv5 derived from the bare 16-digit case number.
- Namespace: `816bee4e-8eee-4c0b-ae69-70879d032f4d`.
- DH and MyCasesKit must compute the identical value; do not add a salt or change input format.
- Golden example is locked in `host/test_case_id.py`.
- SDK/internal name: `session_id` / `current_session_id`.
- DH external/report/frontmatter contract currently calls the opaque resume handle `session_name`.
- `context.md` is not written directly by DH Host. Duplicate `session_name` + `session_id` observed in legacy MyCases files was traced to an old MyCases template/agent plus DH instructions, not the current Host response.

## Implemented Prompt Architecture

The accepted 2026-07-15 design replaces the older mixed/manual-plus-automatic proposal with deterministic DH-owned selection:

1. Every DH SDK `create_session` and `resume_session` path sets `skip_custom_instructions=True`.
   - CLI-global `~/.copilot/copilot-instructions.md`, Root/ancestor `AGENTS.md`, path-specific instructions, agent files, and other CLI automatic custom-instruction sources do not enter DH sessions.
2. DH always injects product-managed **DH Core System Prompt** as system content.
3. DH injects exactly one editable system source:
   - Root empty, regardless of stored Repository ONLY: `%LOCALAPPDATA%\DynamicsHelper\copilot-instructions.md` (**DH-specific Instructions**).
   - Root non-empty and Repository ONLY off: DH-specific Instructions.
   - Root non-empty and Repository ONLY on: only `<Root>/.github/copilot-instructions.md` (**Repository Instructions**).
4. **Custom User Prompt** remains PII-scrubbed user content on every Analyze and is never moved into system content.
5. Session Info remains the final DH system section and carries the unchanged deterministic UUIDv5 session name.

Only the Root-level `.github/copilot-instructions.md` is supported. DH-specific and Repository Instructions never coexist. DH Core and Custom User Prompt remain active in Repository ONLY mode.

Each Analyze resolves exact Core and selected-source bytes once, decodes strict UTF-8, and uses one frozen `PromptSnapshot` for text assembly and a versioned, length-framed SHA-256 fingerprint. A source-mode or byte change refreshes the same UUIDv5 session. Failed source resolution/refresh sends no model turn and clears stale session/fingerprint state; all active-session invalidation clears `current_prompt_fingerprint`.

Source failures are fail-closed. Missing DH-specific Instructions is valid empty content; an existing empty Repository Instructions file is also valid. Missing/unreadable Core, unreadable selected DH-specific content, or missing/unreadable selected Repository content blocks Analyze without fallback. `get_config` exposes soft `prompt_source_status` so Options remains usable for repair.

Options now distinguishes omitted and explicit-empty instruction writes, inspects structured `update_config` results including `config_saved`, and preserves optional prompt `error_code` through Service Worker persistence/hydration. Known prompt-source codes are localized only at immediate/rehydrated display time; raw safe Host fallback text remains stored for unknown codes.

### Existing Preference Migration

No instruction prose is moved or repartitioned. Existing files and internal preference keys remain in place. Existing `use_workspace_only=true` immediately selects Root Repository Instructions when Root is non-empty. A Root without `.github/copilot-instructions.md` therefore blocks Analyze until the file is added or Repository ONLY is disabled.

The July 14 recommendation to remove DH's manual append and rely on CLI automatic workspace discovery is superseded. The accepted implementation instead disables all CLI custom-instruction discovery and explicitly injects the one selected Root file. The July 14 Stage 0/1 contract research remains research and is not altered by this prompt foundation.

## MyCasesKit Response State

Primary documents:

- `docs/superpowers/research/2026-07-14-dh-mycaseskit-stage0-instructions-brief.md`
- `docs/superpowers/research/2026-07-14-dh-extension-stage0-integration-plan.md`

The two July 14 documents above remain historical research. The latest
user-provided MyCasesKit response is external commit `675006a`.

Accepted decisions in that response:

- Form ③, a deterministic `New-Case` coordinator, is accepted.
- The Stage 1 deterministic persistence gate model is accepted: DH/LLM produces
  a structured analysis proposal and a MyCases-owned deterministic gate
  validates and writes canonical state.
- A 19-digit collaboration task folds to its 16-digit main case. The
  coordinator owns normalization, records `collaboration_task[]`, and creates
  the main-case folder with `origin: collaboration-task` when needed.
- `session_name` is creator-written at initialization and read-only to the AI
  model during the session. DH continues to compute and provide the same
  deterministic UUIDv5 handle; when the coordinator initializes canonical
  files, the coordinator is the canonical writer.

Artifacts and freeze status:

- Five shared JSON fixtures plus a README exist as build/test examples.
- They are not proof that every interface is formally frozen; the README still
  labels six items tentative.
- Coordinator invocation and the error enum must freeze before DH implements a
  coordinator adapter.
- Required/optional/null semantics, field limits, and `session_name` envelope
  transport remain gaps for a separate **Contract Primitives** spec.
- No DH MyCases integration code has been implemented.

### Accepted Integrated Direction (Not Implemented)

Integrated mode must not reduce DH to a passive importer. Target architecture:

```text
DH Extract
  → MyCases New-Case Coordinator (Stage 0 deterministic scaffold)
  → DH Automatic Initial Triage (Stage 1 analysis)
  → MyCases Deterministic Persistence
```

Form ③ replaces AI-improvised schema/file writes; it does **not** replace DH automatic analysis.

### File Ownership Direction

- `case.md`
  - Stage 0 coordinator creates source-backed facts and `status: open`.
  - Stage 1 persister applies only source-backed fact patches.
  - Lifecycle owner transitions status (normally to `investigating` after a real triage entry).

- `dh_case_report.md`
  - Immutable D365/source snapshot written/placed by Stage 0 coordinator.
  - Read-only during Stage 1+.

- `troubleshooting.md`
  - Canonical evolving investigation record.
  - Stage 1 persistence creates/appends initial assessment.

- `context.md`
  - Stage 0 skeleton.
  - The creator writes deterministic `session_name` at initialization; the AI
    model treats it as read-only mid-session. In a coordinator-created case,
    the coordinator is the canonical file writer while DH supplies the same
    UUIDv5 handle.
  - Stage 1 persistence updates concise summary/findings/questions/tasks/next steps.

- `root-cause.md`
  - Not created during normal Stage 1 triage; Stage 3 only when evidence supports RCA.

### Accepted Stage 1 Gate Direction

DH analysis should return a proposal rather than freely editing canonical files:

```text
case_fact_patch
troubleshooting_entry
context_patch
requested_status_transition
```

A MyCases-owned deterministic persistence gate validates/idempotently writes
these outputs. Exact field semantics remain subject to the Contract Primitives
spec.

## Contract Primitives Required Before DH Integrated Implementation

The accepted architecture does not make every fixture or interface frozen. DH
must not build the coordinator adapter until a separate Contract Primitives spec
resolves at least:

1. The coordinator invocation mechanism and request/response boundary.
2. The frozen error enum, version negotiation, and retryability semantics.
3. Required, optional, and nullable fields plus size/value limits.
4. How `session_name` is transported in the envelope while preserving creator
   write ownership and the shared UUIDv5 contract.
5. Which of the README's six tentative items become normative.

The five shared fixtures and README should be consumed as examples for building
and testing that spec, not treated as a complete frozen adapter API.

## DH Conditional Work Plan

### Workstream A — independent cleanup

Implemented under accepted spec `441d0db` and plan `21108d9`, through product commit `0f57f8e`:

- disabled CLI automatic custom-instruction discovery for all DH create/resume paths;
- explicitly selected DH Core plus exactly one editable source;
- fixed explicit-empty DH-specific instruction clearing;
- exposed prompt-source health/errors and deterministic refresh fingerprints;
- renamed/documented DH-specific Instructions and expanded Repository ONLY semantics;
- added Host/Extension invariant coverage and inspected Options persistence.

Task 8 final whole-branch verification is recorded above. The optional authenticated SDK smoke was not run for the documented isolation reason; do not infer smoke evidence from task-level unit tests.

### Workstream B — MyCasesKit contracts

MyCasesKit response `675006a` accepted Form ③ and the Stage 1 persistence-gate
model. The remaining work is the separate Contract Primitives spec described
above; fixture existence alone does not unblock a DH coordinator adapter.

### Workstream C — integrated DH implementation

Blocked until the Contract Primitives spec freezes the adapter boundary:

- `Auto / Standalone / MyCases-integrated` preference;
- strong workspace health detection;
- pure `Stage0Envelope` builder;
- coordinator adapter;
- mode-specific prompt assembly;
- automatic Stage 1 triage;
- structured analysis parser;
- persistence adapter;
- clear UI status for initialization/analysis/persistence outcomes;
- standalone/integrated report behavior;
- cross-repo contract/E2E tests.

### Workstream D — migration

- manually classify existing DH instruction prose into DH-specific / MyCases / global buckets;
- migrate/repair legacy MyCases workspace before trusting Auto mode;
- remove legacy MyCases `session_id` templates/agents only under MyCasesKit migration policy;
- preserve shared UUIDv5 identity.

## Current Decision State

- Prompt-scope implementation/documentation Tasks 1-7 are approved through `90e6da3`; Task 8 and ten review-fix waves are recorded through the tenth report, and the concise unversioned release draft exists.
- Accepted design and plan are `441d0db` and `21108d9`.
- Optional marker smoke was skipped because safe model-backed isolation could not be guaranteed; the controller broad whole-branch review remains pending after the tenth fix wave.
- No MyCases integration code, mode preference, workspace detector, coordinator adapter, persistence adapter, or MyCases canonical-file write has been implemented.
- MyCasesKit response `675006a` accepts Form ③ and the Stage 1 deterministic persistence-gate model.
- Five shared JSON fixtures and a README exist as examples, but six README items remain tentative; not every interface is frozen.
- A separate DH Contract Primitives spec remains pending before any coordinator adapter or integration implementation.

## Release Discipline

- Historical published baseline for this development line is beta.4; do not publish stable `v2.0.74` without explicit approval.
- Do not run release helper with `--publish` without explicit user confirmation.
- Prefer a beta release for any prompt/integration architecture change.
- User preference in this development line: do not push feature code until smoke passes, unless the user explicitly asks to push.

## Local-Only State That Does Not Transfer Through Git

- Native Messaging registry mode (DEV/PROD).
- `%LOCALAPPDATA%\DynamicsHelper\config.json` and instruction/prompt files.
- Chrome extension storage (`dh_prefs`, model cache, bookmarks).
- Copilot CLI auth/settings/session-state.
- MyCases workspace and its legacy/partial migration state.

Reconfigure and inspect these on the remote VM instead of assuming they match the source machine.

## Remote VM New-Session Prompt

Use the following for continuation; update the exact HEAD and status from Git rather than treating embedded counts as current:

```text
我们在远程 Windows VM 上继续 Dynamics Helper 的 prompt-scope cleanup。请先不要修改代码。

1. 读取并遵守仓库根目录 AGENTS.md。
2. 读取 docs/session-handoff-2026-07-15.md，作为本次会话的唯一进度来源；不要依赖旧聊天记忆。
3. 读取：
   - docs/superpowers/specs/2026-07-15-dh-prompt-scope-cleanup-design.md
   - docs/superpowers/plans/2026-07-15-dh-prompt-scope-cleanup.md
   - docs/superpowers/plans/2026-07-17-fifth-review-important-fixes.md
   - docs/superpowers/plans/2026-07-17-seventh-review-important-fixes.md
   - .superpowers/sdd/tenth-final-review-fix-report.md
   - docs/superpowers/research/2026-07-14-dh-mycaseskit-stage0-instructions-brief.md
   - docs/superpowers/research/2026-07-14-dh-extension-stage0-integration-plan.md
4. 运行并报告：git status --short、当前分支、origin/master...HEAD ahead/behind、最近 8 个提交、当前版本字段。
5. 检查 VM 本地前置条件：host/venv、Copilot CLI 版本/认证、python dev_switch.py status。不要假设源机器的 DEV/PROD 注册表、AppData 配置、Chrome storage、Copilot session 或 MyCases workspace 会随 Git 迁移。

历史发布基线是 v2.0.74-beta.4；prompt-scope 分支是 docs/prompt-scope-cleanup-design，已接受 spec 441d0db、plan 21108d9。第十轮从 b9cb024 开始，产品提交是 257f282 和 7979279：Reset 现在使用独立于 preference mirror action 的显式事务，保存 token/default identity/request+bookmark generation/retry action 和 host-pending|host-committed|sw-pending|local-cleanup-pending|complete phase；Host 一旦 durable commit，同一事务的 Retry cleanup 只重试安全的 SW/local cleanup，不再发送 Host 或 DEFAULT_PREFS，普通 Reset 则明确启动新事务。扩展错误回退统一使用 safeErrorText，覆盖 Analyze、update_config、prompt health、Options、FAB 和 Service Worker reviewed paths，非字符串值不发生 coercion。隔离 Host focused 143/143、full 207/207，Extension focused 210/210（7 files）、full 340/340（19 files），build 2,218 modules / 13 artifacts，compileall/static/mutation 通过；证据见 tenth-final-review-fix-report.md。可选 marker smoke 因无法保证 authenticated model-backed user/session state 完全隔离而跳过；release draft 未选择版本。下一步仍是 controller 重新运行 broad whole-branch review；不要把本轮 focused/self-review 当作 broad review 已通过。

已实现行为：所有 DH create/resume 都设置 skip_custom_instructions=True；CLI global、AGENTS、path instructions 等自动发现源全部排除。DH 显式注入 Core + 恰好一个可编辑源：Root 为空或 Repository ONLY 关闭时使用 DH-specific Instructions；Root 非空且 Repository ONLY 开启时只使用 <Root>/.github/copilot-instructions.md。Custom User Prompt 仍是每次 Analyze 的 PII-scrubbed user content。使用严格 UTF-8 immutable byte snapshot、framed fingerprint、same-UUID refresh 和 fail-closed errors。Options 区分 explicit empty（清空文件）与 omitted（不写），检查 update_config/config_saved，并保留可选 errorCode 到持久化和本地化显示。

Integrated 目标不是取消 DH 自动分析。目标流水线是：
DH Extract → MyCases New-Case（Stage 0 deterministic scaffold）→ DH Automatic Initial Triage（Stage 1）→ MyCases Deterministic Persistence。

MyCasesKit response commit 675006a 已接受 Form ③ New-Case coordinator 和 Stage 1 deterministic persistence gate。19 位 collaboration task 归一到 16 位 main case，由 coordinator 记录 collaboration_task[]，必要时以 origin: collaboration-task 创建主 case 目录。session_name 由 creator 在初始化时写入，AI model 在 session 中只读；DH 继续计算并提供相同 UUIDv5，coordinator 是 canonical file writer。已有 5 个共享 JSON fixtures 和 README 作为 build/test examples，但 README 仍标记 6 项 tentative，不能声称所有接口已冻结。当前没有实现任何 MyCases integration；在 coordinator invocation、error enum、required/optional/null/limits、session_name envelope transport 由独立 Contract Primitives spec 冻结前，不实现 coordinator adapter。

2026-07-14 research 中“依赖 CLI 自动 workspace instruction discovery”的建议已被 2026-07-15 accepted spec supersede；不要恢复该方案。在正式 MyCases 契约返回前，不要猜测 MyCases 接口，也不要让 DH 直接写 MyCases canonical 文件。

请先简要总结你读取到的状态与 VM 环境差异，然后等待或执行 controller 明确指定的 broad code review；不要重做 Task 8。不要未经明确批准 push 或 publish；任何 release --publish 都必须再次获得我的明确确认。
```
