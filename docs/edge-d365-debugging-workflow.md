# Edge D365 Field Debugging Workflow

## Scope And Authority

Use this guide for a future, explicitly authorized investigation of a new D365
field or a missing extraction result. It is a workflow, not permission to execute.
Read `AGENTS.md` and the current handoff's Current Milestone Summary and Next
Single Action first. Verify the development checkout, not just the repository name.
Keep every read, edit, verification, and later command in that approved checkout.
Installed extension state is separate from source state; do not silently switch it.

- Define one field, the approved browser tab, and the intended output semantics.
- Respect current pauses and narrower user instructions over this procedure.
- Browser access, configuration changes, dependency installation, tests, builds,
  deployment, and Git writes each require authorization applicable to that work.
- No automatic commit, release, plugin installation, or workflow replacement.
- This is developer tooling, not a Dynamics Helper runtime/product dependency.
- Never copy private temporary probes into the repository: they may contain global
  paths, endpoint identifiers, customer data, or credentials.
- Stop on user refusal or policy denial. Do not bypass policy or guess field values.

## Prepare Existing Edge Access

1. Start with Microsoft's official Edge DevTools MCP article linked below.
2. Check the selected package's official requirements and help before setup.
   Node compatibility is version-dependent; do not reuse a historical minimum.
3. Have the user enable remote debugging through `edge://inspect` if permitted.
   The user owns browser approval prompts; never auto-accept them or alter policy.
4. Prefer Windows `--autoConnect` with `--user-data-dir` pointing to the user's
   existing Edge User Data directory. Resolve it locally with permission; never
   publish a machine-specific path or put the real profile directory in this repo.
5. `--executablePath` selects a browser executable for launch; it does not select
   the signed-in existing session. A newly launched profile may lack that session.
6. If endpoint discovery is needed, read only the known local `DevToolsActivePort`
   file with permission. Treat its contents as private, transient connection data.
   File existence does not prove attachment or permission; approval may still appear.
7. Opening DevTools, or using an `openDevTools` option, does not establish an endpoint.
   Do not scan ports, profile directories, or other users' browser state.

OpenCode uses an `mcp` wrapper, a named entry with `type: "local"`, and a `command`
array containing the executable and individual arguments. Do not paste VS Code's
`servers` configuration or split executable/arguments into its different schema.
An optional pinned package argument is `chrome-devtools-mcp@1.8.0`, the tested
version in this investigation. An approved `npx` invocation can use that argument;
neither a global package install nor any coding-agent plugin is required.
`npx` may download a package, so its use is not exempt from installation approval.

Use these privacy/category arguments when supported by the selected version:

- `--no-usage-statistics`
- `--no-performance-crux`
- `--no-category-network`
- `--no-category-performance`
- `--no-category-emulation`

Keep existing MCP entries intact. After an approved OpenCode configuration change,
restart OpenCode into a new session and reopen the correct development checkout.
Keep the user's Edge session intact; do not restart or replace their browser.
Tool initialization and tool listing prove registration, not successful attachment.

## Tool Boundary

The permitted discovery/read subset, within the user's scope, is:

- MCP initialization and tools-list: check version and available capabilities.
- `list_pages`: only if discovery is necessary and enumeration is approved.
  Its raw output can expose unrelated titles and URLs; prefer a locally filtered
  discovery path if available. Never reproduce unrelated entries in reports.
- `select_page`: only a verified allowed target, without bringing it to front.
- `evaluate_script`: bounded, read-only structural inspection in that target.
- Local `Read`: the known endpoint file or approved, sanitized evidence only.
- Direct CDP fallback: the restricted methods and lifecycle in the next section.

Do not take broad snapshots, screenshots, heap dumps, console dumps, or request
captures. Do not use click, fill, navigation, reload, upload, or dialog-accept tools
without specific additional approval. A tool being available is not permission.
Never collect cookies, authorization headers, query payloads, or network bodies.

## Diagnose Attachment Once

`Network.enable` timeouts occurred even after the user approved remote debugging.
They are not proof of an authentication failure. Record the failing operation,
elapsed time, and sanitized error category; ask whether approval or a paused-script
indicator is visible if needed. Do not prescribe repeated sign-ins or Allow clicks.

- `--no-category-network` hides network tools; it does not guarantee that the MCP
  engine skips network initialization while attaching to a page.
- `--slim` is not an attachment fix. Do not claim an untested flag resolves this.
- Do not invent a `--protocolTimeout` CLI flag from an internal library option.
- A successful minimal CDP evaluation proves that connection works, not that MCP
  attachment or every frame is usable. An absent result is not a successful scan.

If authorized, use exactly one maintained direct CDP connection for the fallback:

1. Record the owned helper PID, start time, cancellation method, and total budget.
   Choose explicit limits before launch, for example 10 seconds per operation and
   90 seconds overall; these are helper deadlines, not claimed MCP CLI options.
2. Discover/filter targets locally with `Target.getTargets`; retain only approved
   host/schema matches. Do not output raw target metadata, titles, or full URLs.
3. Attach only selected targets via `Target.attachToTarget`. Use `Page.enable`,
   `Page.getFrameTree`, `Runtime.enable`, and `Runtime.evaluate` only as needed.
   Never enable `Network` or add a general event/payload logger.
4. Map approved frame execution contexts, then batch bounded structural questions
   over that same connection. Avoid one process/connection per question: repeated
   new helper processes caused repeated browser authorization prompts.
5. Enforce both operation deadlines and the total budget, including connection
   setup. Record the exact timed-out method rather than guessing its cause.
6. Detach selected sessions, close the socket, cancel pending work/timers, and exit
   the owned helper process on completion or timeout. Do not call `Browser.close`
   or kill Edge. If cleanup fails, report only the owned surviving process.

## Locate The Actual Field

1. Ask the user to identify the active internal case tab and whether Details or
   Summary is visible. A D365 browser page can contain multiple internal case tabs.
2. Distinguish the case application target from `D365Connector` and embedded frames.
   Map allowed page/frame contexts by approved host and structural schema markers,
   not customer-bearing case titles. Keep raw origins and target IDs local.
3. Inspect the current document and permitted same-origin frames first. Cross-origin
   frames may need their own approved execution context; page DOM cannot inspect
   them merely because an iframe element is visible.
4. Record document/frame root, accessible scope, node count, and whether a bound was
   reached. An empty page-DOM query cannot establish that a cross-origin root or
   inactive panel is unloaded. Report "not found in inspected scope" instead.
5. Do not switch internal tabs, open Details, expand panels, or trigger lazy loading
   automatically. Ask the user to expose the panel or approve that specific action.
6. Locate the fixed field label and its owning container. Prefer an observed exact
   structural `data-id` over nearby text, broad ancestor text, or fuzzy matching.

Created On provides a concrete regression model, not a universal D365 schema:

- Proven container: `[data-id="createdon.fieldControl-datetime-description_container"]`.
- Its readonly text inputs had no `id`/`data-id`, with observed nesting depths of
  nine and five levels. The label's `for` did not reference either input.
- Inspect bounded descendants inside the exact container, not only siblings or
  direct children. Read input `.value` for extraction; `textContent` is insufficient.
- Preserve structural DOM order for date/time controls. Exclude nested foreign
  field containers, especially Modified On; fail closed on ambiguous candidates.
- Do not export live `.value` while diagnosing structure. Return only presence,
  input type, readonly state, and reviewed structural relationships.

Header fields can instead use known custom-element hosts with open shadow roots
and direct `slot="label"` / `slot="value"` children, including nested open roots.
Traverse only a known host's relevant open `ShadowRoot` and scoped slot structure.
Do not recursively sweep all shadow trees, inspect closed roots, intercept
prototypes/`attachShadow`, or inject hooks to capture future application payloads.

Keep the existing page reader asynchronous. Bound nodes, depth, result count, and
time; yield with the existing `yieldToMain()` during long loops. Distinguish limit
reached from field absent. Never fall back to whole-page text or whole-form dumps.

## Evidence And Meaning

Export only fixed field labels, structural attribute names, reviewed/sanitized
structural tokens, input types, booleans, and bounded counts. Attribute values and
DOM names are not automatically safe: IDs, `name`, classes, ARIA text, and slots
may contain customer content. Allowlist known tokens and replace dynamic portions.
Do not export names, case numbers, raw values, URLs, tokens, or endpoint contents.
Keep evidence minimal enough to reconstruct structure without reconstructing a case.

For each new field, define source ownership and source age before implementation:

- Identify whether an authorized UI control, documented API, or Audit history owns
  the meaning. API exploration needs separate approval; DOM access does not grant it.
- Current owner/current metadata is not historical assignment or ownership history.
  Audit events are history, not automatically the current authoritative field value.
- Distinguish observation time, business creation time, and the age of cached data.
- Preserve displayed date/time and known timezone context. Never guess UTC or an
  offset from a local-looking string; document unknown timezone explicitly.
- A displayed customer name is not proof of the true customer entity. Never infer
  TPID from a name, nearby identifier, or unrelated account field.
- If provenance or semantics remain unresolved, mark the field unsupported/unknown
  and ask a scoped question instead of substituting a plausible value.

## Implement Only When Authorized

1. Read the current page reader and relevant tests before editing; retain existing
   async, ambiguity, field-isolation, and identity protections.
2. Build a minimal synthetic fixture with invented values. Reproduce exact relevant
   container/slot order, nesting, readonly controls, and misleading label linkage.
   Include only the competing field needed to prove separation, not a page dump.
3. Run the focused regression RED against the old behavior, implement the smallest
   scoped fix, and run GREEN. For new invariants, temporarily break the matching
   rule, verify failure, restore only your mutation, and confirm GREEN again.
4. Verify same-case user edits survive background rescans and identity changes
   cannot apply stale results to another case. Do not introduce cross-case caching;
   this workflow does not implement a cache or imply one already exists.
5. Record exact test scope and skipped checks. Build, reload, installation, and
   release are separate authorized steps, not automatic consequences of GREEN.

## Completion Checklist

- [ ] Correct checkout and one approved task; pauses and unrelated edits preserved.
- [ ] User consent/policy respected; one connection closed and owned helper exited.
- [ ] Target/frame/panel scope and scan limits recorded without customer data.
- [ ] Evidence uses sanitized structure; fixtures contain invented values only.
- [ ] Source ownership, age, timezone, and unresolved semantics stated explicitly.
- [ ] Capabilities labeled proven, observed failure, or untested, with versions.
- [ ] Historical `1.8.0` initialization and direct-CDP DOM success are not reported
  as MCP attachment success or as a guarantee for newer Edge/package versions.
- [ ] Any authorized RED/GREEN/break-fail results recorded; no automatic Git writes.

## Official References

- [Microsoft Edge DevTools MCP server](https://learn.microsoft.com/en-us/microsoft-edge/web-platform/devtools-mcp-server)
- [Chrome DevTools MCP package and options](https://github.com/ChromeDevTools/chrome-devtools-mcp)
- [OpenCode MCP configuration](https://opencode.ai/docs/mcp-servers/)
- [Chrome DevTools Protocol domains](https://chromedevtools.github.io/devtools-protocol/)
