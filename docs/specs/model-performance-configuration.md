# Model and Performance Configuration

Status: Implemented. Current DH session preference and model-catalog contract.

## 1. Problem

DH can select a model, reasoning effort, and context tier independently of the
interactive CLI's global defaults. An empty DH preference still means inherit;
DH does not rewrite the user's `~/.copilot/settings.json`.

## 2. Decisions

- Model choices come dynamically from the Host's SDK `list_models()` result,
  not a hardcoded catalog or free-text-only field.
- Options loads its catalog on page mount, using a non-empty cache younger than
  24 hours when usable; Refresh forces a new request. Switching sidebar tabs
  does not remount the page-level preference owner.
- Empty `model`, `reasoningEffort`, and `contextTier` default to inheritance.
- Known supported efforts belong to the selected model, not the union of all
  models' capabilities. A known empty effort list means no explicit effort.
- Fetch failure is visible and is not a successful empty catalog (§5).
- These are global DH preferences, not per-case selections or custom-provider
  configuration.

## 3. SDK surface

The source uses the SDK through `host/sdk_client.py`. This specification describes
DH's consumed contract; [SDK integration](../sdk-integration.md) defines the
current dependency boundary.

| Value | Supported DH representation |
|---|---|
| Model | Non-empty model ID, or empty for inheritance |
| Reasoning effort | `low`, `medium`, `high`, `xhigh`, or empty |
| Context tier | `default`, `long_context`, or empty |
| Catalog row | `id`, `name`, optional `supported_reasoning_efforts`, optional `default_reasoning_effort` |

The CLI-interactive `max` alias is not a DH effort value. SDK create/resume
receive explicit non-empty settings through the shared session kwargs; omitted
settings inherit CLI defaults. Configuring these preferences does not bypass
the headless permission handler or prompt-source isolation.

## 4. Components

### 4.1 Host (`dh_native_host.py`)

`handle_list_models` requires a started client and returns either:

```json
{"status":"success","data":{"models":[{"id":"example-model","name":"Example"}]}}
```

or an error with `errorKind: "auth" | "unavailable" | "unknown"` and safe error
text. No client is `unavailable`. A genuine empty SDK result can be successful;
an exception cannot be converted to successful `models: []`.

Rows without IDs are skipped. Known effort arrays are filtered to the four legal
values, and a default effort is retained only when in that supported array.
Missing/malformed capability data is not synthesized as a known empty array.

`_get_session_config` reads `extension_preferences.model`, `reasoning_effort`,
and `context_tier`. Illegal effort/tier values are treated as empty. Session
refresh conditionally adds non-empty settings to shared kwargs for both create
and resume; an empty preference must not become an explicit unsupported value.

### 4.2 Extension preferences (`prefs.ts`)

| Preference | Host key | Default |
|---|---|---|
| `model` | `model` | Empty |
| `reasoningEffort` | `reasoning_effort` | Empty |
| `contextTier` | `context_tier` | Empty |

`buildHostConfigPayload` mirrors these under `extension_preferences`.
Instant persistence applies: all three selects use `updatePref` on change.
Hydration protects touched fields, and the single-flight mirror queue must
successfully commit the latest intent before its inspected Host update.

### 4.3 Options UI: Model & Performance

This section is the separate `model` sidebar tab, not a subsection inside Copilot.

- Model shows an inherit option plus catalog names/IDs. A persisted model absent
  from the catalog remains represented rather than silently cleared.
- Effort offers inherit plus the selected model's known supported array. A known
  empty array offers only inherit and an unsupported-effort hint. If capability
  data is unknown, including an inherited CLI model, the existing UI fallback
  offers all four reviewed effort values; unknown is not a claim of support.
- Context tier offers inherit, `default`, and `long_context`.
- Refresh shows loading state and bypasses catalog staleness.

The cache uses `dh_model_list` and `dh_model_list_fetched_at`. Options sends
`NATIVE_MSG` with `payload.action: 'list_models'`; there is no separate
`LIST_MODELS` message contract. Callback/request ownership prevents an older
response from replacing newer catalog state.

Automatic effort repair requires completed preference hydration and authoritative
catalog capability data. If the current explicit effort is unsupported by the
selected model's known list, it is cleared through normal preference persistence.
Changing models uses the same support check. Stale/failed catalog data must not
authorize destructive preference repair.

## 5. Failure handling (surface, never silent)

This section retains the Host source's §5 reference.

- Classify authentication failures as `auth`, readiness/connectivity failures as
  `unavailable` where identified, and other failures as `unknown`.
- Keep last-known-good catalog data and the selected model on fetch failure.
  Show a localized authentication-specific or generic failure message.
- A genuine successful empty catalog is not an exception; never fabricate empty
  success to hide an RPC, malformed-response, or transport failure.
- Do not advance successful cache state from a stale response. A cache write
  failure is visible even if fresh rows are available in current memory.
- Diagnostics use safe errors, not raw SDK event/content/object logging.

## 6. Provider boundary

BYOK, Azure OpenAI/custom providers, API-key fields, and provider migration are
not implemented by this contract. No future provider schema or development
queue is defined here.

## 7. Test plan

Relevant assertions cover config validation, omission/inheritance, shared
create/resume kwargs, catalog response classification, cache age and ownership,
known-empty versus unknown effort support, preserved model selection, and
hydration-gated effort repair. A source-level check is not runtime SDK evidence.

Verification uses the applicable reviewed entry in `docs/test-safety.md` and the
SDK workflow when that scope is requested. This document contains no automatic
full-suite, live model, dependency-install, or build instruction.

## 8. Compatibility

Absent settings preserve inheritance. Persisted model IDs remain user intent even
if temporarily absent from the fetched list. Catalog refresh is not permission
to change the CLI's global settings or silently select another model.

## 9. Out of scope

No custom providers, `max` alias, per-case models, or release operation. This
documentation update makes no new test or product-runtime verification claim.
