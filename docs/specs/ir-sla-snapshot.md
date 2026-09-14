# IR SLA Snapshot

## Scope And Status

The **first bounded milestone has historical offline/build PASS evidence, not
live qualification**: the observed terminal
`Succeeded` label and its scan capture time enter Case Context and outgoing
Analyze. This is partial field support, not a general IR status/countdown reader.
The earlier bounded source/offline milestone is **complete**, with confirmed
results recorded below. The earlier ownership source fix has **focused offline
checks and a local build PASS; compiled runtime preview remains unqualified**.
Read-only DOM source evidence and the actual-anchor fallback fix are complete.
This docs-only update records the user's confirmation and uses
static document checks only, with no new source review, tests, build, browser,
API, Host or model execution. No Host changes are part of this milestone. The
historical build awaited user Extension reload and D365 refresh for preview
verification, with no Analyze needed. Countdown, deadlines and other statuses need authoritative
source discovery.

Current canonical ownership hardening is complete in source with scoped offline
verification in the [capture hardening review](../capture-hardening-review.md).
Both explicit and fallback paths now require `expectedCase` and the same unique
visible main, outer record pane and matching canonical header. Earlier build and
source results below do not qualify this later change or the production runtime.

## Confirmed Verification

- `initial-green`: **297/297 passed across seven complete test files**.
- TypeScript `ir-sla`: **actual exit 0**, sources unchanged.
- RED: mutations disabling Succeeded capture and outgoing accepted-snapshot use
  produced **4 failed, 3 passed, 109 skipped**.
- `green-restored`: mutations removed; **7 passed, 109 skipped, actual exit 0**.
  Raw `FAB.tsx` and `irSla.ts` source bytes matched `initial-green`.
- Historical Extension build: user-confirmed **PASS**, version **2.0.77**, evidence
  `dh-local-extension-2077-ir-sla-20260913`; five default items,
  TypeScript/Vite/copy checks and 13 artifacts. The 407 source files and selected
  tooling were unchanged. Inventory SHA-256:
  `97493B28EECA5CFFB625F748ACBD04A65349AD6B80246FF6468BE616F9C7C219`.

`initial-green` and `green-restored` are the evidence directory names. The latter
is the focused restoration check, not another full 297-test run. The prior tests
were not rerun this turn. The confirmed offline and build results close the
bounded source/offline/build milestone only, not full IR support or browser/model
runtime qualification. This turn does not rerun the build or independently
requalify its artifacts.

Earlier record-pane ownership fix, as confirmed by the user:

- Initial seven-file run: **350 passed, 1 failed (351 total)**. The new slot
  fixture encountered jsdom's cached opacity. A fixture host attribute mutation
  invalidated that cache; production rendering/ownership checks were unchanged.
- Both affected complete files passed **187/187** after fixture correction.
- RED with case comparison disabled: **3 failed, 184 passed**. After restoring
  that mutation, **187/187 passed**, with hashes matching the same fixed source;
  reported `irSla.ts` SHA-256 prefix: `24D7`.
- Final TypeScript: **exit 0**, sources unchanged.
- Earlier local Extension **2.0.77** build: **PASS** for the five-item gate and
  TypeScript/Vite/copy checks; **13 artifacts**, **408 source files and selected
  tooling unchanged**. Evidence: `dh-local-extension-2077-ir-record-pane-20260913`.
  Manifest SHA-256:
  `CC88CAB04810FD826F17052DA11FAD9216B016213B64EA0B9BFD1C19939B40F1`.
  Content artifact: `index.tsx-B5TB3eTu`, reported SHA-256 prefix `B6369`.

These results are not a full 351-test GREEN rerun, do not replace the historical
297-test evidence or earlier source-version failure, and do not establish a
compiled runtime preview PASS. Hash prefixes above are abbreviated identities,
not full digests.

Implementation references:

- [irSla.ts](../../extension/src/utils/irSla.ts): synchronous terminal-label read.
- [pageReader.ts](../../extension/src/utils/pageReader.ts): full-record ownership
  around capture and optional scraped metadata.
- [pageIdentity.ts](../../extension/src/utils/pageIdentity.ts): strict pair parsing.
- [FAB.tsx](../../extension/src/components/FAB.tsx): accepted scan ownership,
  template formatting and outgoing invocation assembly.
- [analysisPrompt.ts](../../extension/src/utils/analysisPrompt.ts): reserved IR
  section formatting/replacement, separate from canonical User Prompt handling.

## Observed Source

The supported `TimercontrolState` observation is specifically the terminal label
with `data-id="IR_SLA_Timer.fieldControl-SucceededLabelId"` and trimmed text
exactly `Succeeded`. It does not establish a numeric enum mapping, a supported
API, other terminal states, or an active timer/duration source. The implementation
reads this DOM label, not an internal `TimercontrolState` property.
Read-only inspection in the confirmed **TSEWork / Profile 1** context established
a selected Summary `li` with `aria-label="Summary"`, direct text `Summary`, extra
aggregate text and no `aria-controls`. A unique main contained a unique outer
record tabpanel with the canonical header and selected Summary tab (nearest pane:
outer), plus a Summary tabpanel whose parent's nearest pane was that outer pane.
The exact `Performance indicators` section inside Summary owned the IR root and
rendered `Succeeded` label. Requiring explicit controls rejected this observed
structure in the earlier source version; that failure remains historical evidence.
That source fix added the absent-attribute fallback below, not runtime PASS.
Later hardening applies canonical record ownership to the explicit path as well.

Recognition requires all of the following:

1. Exactly one document-DOM root matching both
   `[data-id="IR_SLA_Timer"][data-control-name="IR_SLA_Timer"]`.
2. Exactly one rendered selected Summary tab, identified by exact accessible/
   direct text rather than requiring aggregate descendant text to equal `Summary`.
3. Both panel paths require the exact full 16/19-digit `expectedCase`, a unique
   visible main containing a unique outer record pane with its matching canonical
   header, and the selected tab's nearest pane equal to that outer pane. The
   Summary panel's parent's nearest pane must be the same outer pane. A task's
   parent number cannot authorize either path.
   If present, that tab's nonempty, whitespace-free `aria-controls` identifies exactly one
   element by ID. The target matches `[role="tabpanel"]` or
   `section[aria-label="Summary"]`, is rendered, and is not itself
   `aria-hidden="true"`. Empty, malformed, unresolved or otherwise invalid present
   controls reject; they never fall through to inferred ownership.
   Only when the attribute is absent may the observed Summary-panel structure
   establish fallback linkage within that same record ownership. The exact
   `Performance indicators` section inside Summary must own the IR root and label
   on this fallback path.
4. The timer root's nearest matching panel is that target, not a foreign or nested
   inactive panel. A globally unique timer or lone Summary section is insufficient.
5. Exactly one matching Succeeded label exists inside the timer root, belongs to
   that same nearest panel, has the exact trimmed text, and is rendered.

Rendering checks require a connected element, computed `visibility: visible`,
and a finite positive-width/height client rectangle. Up to 64 ancestor elements
are checked for `display: none` or zero opacity, following CSS/`assignedSlot`
ancestry; an unresolved deeper ancestry
fails closed. The label's own visibility may override inherited hidden visibility.
Offscreen geometry is allowed; viewport intersection is not required. The observed
label's `aria-hidden="true"` alone is not CSS hiding and does not reject the
label; this differs from the explicit panel-authority check above. The helper
checks tab, panel and label rendering, not a separate root rectangle. Document
selectors do not traverse shadow roots, switch tabs or discover another frame.

## Metadata And Ownership

The reader's `expectedCase` argument remains syntactically optional, but both the
explicit-controls and fallback paths require the exact full 16/19-digit expected
identity and matching canonical header in the unique visible main/outer record
pane. Missing identity cannot grant either path ownership or authorize `Succeeded`.
The earlier explicit-path exception is historical behavior, not the current contract.

`IrSlaSnapshot` returns readonly `status: 'Succeeded' | 'unknown'` and
`capturedAt: string`. Its timestamp is created once at read time using
`new Date().toISOString()` when at least one supported root exists.

| Read outcome | Scraped metadata | Template output |
| --- | --- | --- |
| No supported root | Both fields omitted | `Status: Unknown`, capture `unavailable` |
| Root exists, but ownership/rendering/label evidence fails or is ambiguous | `irSlaStatus: 'unknown'` plus capture time | `Status: Unknown`, ISO UTC capture |
| All Succeeded checks pass | `irSlaStatus: 'Succeeded'` plus capture time | `Status: Succeeded`, ISO UTC capture |

PageReader requires exact live record ownership before and after capture using
the full 16/19-digit number. It rechecks the strict live identity captured before
the optional Created On await and performs no await after IR capture. A change
discards the scan; title/legacy fallback and a task's parent number cannot grant
IR ownership. Without exact live ownership, it does not attach the IR pair.

`parseScrapedDataSnapshot` copies whitelisted own string data properties without
invoking accessors. If either IR field is defined, both must be present with a
supported status and a valid timestamp whose `toISOString()` exactly equals the
input; malformed or partial pairs reject the snapshot. `ScrapedData` declares
optional strings, while this parser enforces the accepted pair's runtime contract.
These fields are internal scan metadata, not new Host/API payload fields.

FAB accepts only its current snapshot identity/generation with no newer pending
scan. Same-case accepted scans may advance IR metadata while user edits retain
the editable context. Analyze reads the pair from `invocation.accepted.data`,
not the possibly stale IR values or section in editable data. It copies those
values into outgoing assembly; later scans do not alter an already-frozen Analyze.

## Reserved Section

`formatIrSlaSnapshot` emits the exact heading `## IR SLA Snapshot`, status, UTC
capture time, `Countdown: unknown`, `Deadline (UTC): unknown`, and the fixed
statement `Captured observation, not a live timer or execution budget.`

For constructed or recognized preformatted Case Context, FAB first removes the
canonical User Prompt tail, then applies the current accepted IR snapshot, then
appends the current Custom User Prompt. This replaces stale or edited reserved
IR sections in outgoing text without writing the replacement back to the editor.
Other sections are retained subject to the existing User Prompt boundary and
section-boundary whitespace handling, not a byte-for-byte preservation promise.
An omitted current pair replaces stale Succeeded evidence with Unknown/unavailable;
old edited evidence is never a fallback. Capture time is never refreshed to the
send clock, even though the existing payload has a separate send timestamp.

`applyIrSlaSnapshot` recognizes only the exact unindented IR heading (optional
trailing spaces/tabs) outside its supported backtick/tilde fences. The section
ends at the next recognized level-one/two heading or end of body; repeated
reserved sections are removed before one current section is inserted. Fence
handling supports up to three leading spaces and a matching closing delimiter
at least as long as its opener. It is not a full Markdown parser and promises
neither all Markdown forms nor arbitrary malformed-fence recovery.

This fence handling is distinct from `applyCurrentUserPrompt`: the first exact
line-level `## User Prompt` remains canonical **even inside fenced text**.
FAB strips that tail before IR insertion. The Host's existing canonical
Analyze-time prompt-file read/replacement is unchanged; the IR helper does not
relax or redefine it.

## Limits And Follow-Up

- Countdown, deadline, active status and duration extraction remain unsupported.
  Do not infer them from Severity, Created On, static text or elapsed send time.
- `Paused` and `Expired` are not recognized states in this milestone; future
  support requires observed authoritative evidence rather than guessed mappings.
- A snapshot is not a live clock, model/tool execution budget, ETA or percentage.
- Future active-countdown discovery needs a separately scoped user-provided
  running case. Obtaining one is not required or authorized by this docs-only turn.
- The earlier ownership fix has focused offline and local build PASS evidence;
  current hardening has only the scoped offline evidence in the linked review.
  Compiled runtime preview awaits user Extension reload and D365 refresh. The Case
  Context preview should show `Succeeded` if all confirmed structure and rendering
  checks match; otherwise it returns `unknown`. This expectation is not runtime
  qualification. Preview verification needs no Analyze or model call.
- Main research/MCP work remains separately scoped and is not duplicated here.

## Environment And Privacy

The user's prior verification identified the actual Edge profile as **TSEWork /
Profile 1** using `edge://version` plus the same browser context. Endpoint-file
existence or a profile display name alone is not equivalent verification. This
documentation task did not reconnect or reverify that browser. Retain no private
endpoint/target identifiers, emails, case numbers or customer content in these
documents. Regression fixtures must be synthetic; structural tokens above are
the supported generic control evidence, not a captured customer page. The user
confirmed cleanup of the new direct CDP connections used for read-only evidence;
that evidence gathering did not execute a model.

The reported current Host mode is source Dev, which shares real DH configuration
with Prod and is not a sandbox. No registration check or mutation was performed
here; the user confirmed Host and registry remained unchanged. The production
entry is quarantined; do not assume the installed production Host is usable or
that the historical local build contains current hardening. Eventual runtime
verification needs an explicitly approved entry. Preserve current registration;
no automatic return to Prod, restoration or installation is authorized.
No full installer, copied production files, new tests, product/build-tool edits,
build, browser load/test, Analyze, Host restart, registry mutation or publication
is part of this documentation update. The documentation commit/push is now
authorized; a Release version still requires user confirmation.

See [TODO](../../TODO.md#ir-sla-snapshot),
[Native Host mode selection](../../DEVELOPER_GUIDE.md#2-native-host-mode-selection)
and the [Edge D365 workflow](../edge-d365-debugging-workflow.md).
