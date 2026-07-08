# Configurable Model + Performance (decouple DH from CLI settings.json)

> Author date: 2026-07-03. Design spec for letting the user pick the
> Copilot model + reasoning effort + context tier for DH's analyze sessions,
> independent of the Copilot CLI's global `~/.copilot/settings.json`.

## 1. Problem

DH's analyze sessions inherit the Copilot CLI's global model/effort config
because `_refresh_session` passes **no** `model` / `reasoning_effort` /
`context_tier` to `create_session()`. The user's `settings.json` is set to
`claude-opus-4.8` + `effortLevel: max` + `contextTier: long_context` — the
slowest possible combination, chosen intentionally for *interactive* CLI
use. DH silently rode that config, making analyses slow. There is no way to
give DH a different (faster) model without changing the CLI's global
settings, which the user does not want (it would slow their interactive CLI).

**Goal:** DH owns its own model/performance config, decoupled from
`settings.json`, user-configurable in Options.

## 2. Decisions (settled during brainstorming)

- **Model list source:** dynamic via SDK `list_models()` — the dropdown
  shows exactly the models the user's GitHub account offers, matching the
  CLI. Not a hardcoded list (goes stale) or free-text (typo-prone).
- **Fetch timing:** on Options "Copilot Configuration" mount, fetch if the
  cached list is empty or older than 24h; cache in `chrome.storage.local`;
  a **Refresh models** button forces a re-fetch.
- **Default = inherit.** Empty model/effort/tier → DH passes nothing →
  session inherits `settings.json` (current behaviour, backward compatible).
  The user opts into a faster model explicitly. DH does **not** ship an
  opinionated default that would silently switch existing users' model.
- **context_tier included** this release (`default` | `long_context`).
- **Failure must surface, never silent** (see § 5).
- **Provider-ready structure** for future Azure OpenAI / BYOK (see § 6).

## 3. SDK surface (measured on 1.0.5)

- `create_session(model: str|None, reasoning_effort: ReasoningEffort|None,
  context_tier: ContextTier|None, ...)`
- `ReasoningEffort = 'low' | 'medium' | 'high' | 'xhigh'` (note: the SDK has
  **no** `"max"` — that is a CLI-interactive alias; DH uses these 4)
- `ContextTier = 'default' | 'long_context'`
- `list_models() -> list[ModelInfo]`, `ModelInfo` fields: `id`, `name`,
  `capabilities`, `policy`, `billing`, `supported_reasoning_efforts`,
  `default_reasoning_effort`. Per-model `supported_reasoning_efforts` lets
  the effort dropdown filter to what the chosen model actually supports.

## 4. Components

### 4.1 Host (`dh_native_host.py`)

**New RPC action `list_models`** (in the message handler):
- Calls `await self.client.list_models()`; the client must be started
  (it is, after `initialize_sdk`).
- Returns `{status: "success", data: {models: [{id, name,
  supported_reasoning_efforts, default_reasoning_effort}, ...]}}`.
- On exception → `{status: "error", error: <msg>, errorKind: "auth" |
  "unavailable" | "unknown"}` (classify GitHub-auth failures where
  detectable). **Never** return an empty list as success (§ 5).

**Session kwargs** (`_refresh_session`, the `sdk_kwargs` block): after the
existing keys, conditionally add — only when the value is a non-empty string:
```python
if full_config.get("model"):
    sdk_kwargs["model"] = full_config["model"]
if full_config.get("reasoning_effort"):
    sdk_kwargs["reasoning_effort"] = full_config["reasoning_effort"]
if full_config.get("context_tier"):
    sdk_kwargs["context_tier"] = full_config["context_tier"]
```
Empty/absent → not passed → CLI default inherited. Applies to BOTH
`create_session` and `resume_session` (they share `sdk_kwargs`).

**Config read** (`_get_session_config`): surface
`extension_preferences.model` / `reasoning_effort` / `context_tier` into
`full_config`. Validate `reasoning_effort` ∈ the 4 legal values and
`context_tier` ∈ the 2 legal values; drop (treat as empty) if illegal, with
a `logger.warning` — defensive against a hand-edited config.json.

### 4.2 Extension preferences (`prefs.ts`)

Add to `Preferences`: `model?: string`, `reasoningEffort?: string`,
`contextTier?: string`. `DEFAULT_PREFS`: all empty string (= inherit).

`buildHostConfigPayload` mirrors to `extension_preferences` (snake_case):
`model`, `reasoning_effort`, `context_tier`.

### 4.3 Options UI — new "Model & Performance" section

Placed under **Copilot Configuration**. Contains:
- **Model** `<select>`: first option `(使用 CLI 默认)` = empty; then one
  option per cached `ModelInfo` (`name` shown, `id` as value). Persists on
  change (`updatePref`).
- **Reasoning effort** `<select>`: `(使用 CLI 默认)` + `low/medium/high/xhigh`.
  When a model is selected and its `supported_reasoning_efforts` is known,
  filter the options to that set (fall back to all 4 if unknown).
- **Context tier** `<select>`: `(使用 CLI 默认)` + `default` + `long_context`.
- **Refresh models** button: force re-fetch; shows a spinner while fetching.
- **Error banner** (red text) below the model dropdown when the last fetch
  failed (§ 5).

Model-list fetch (`useEffect` on section mount / tab open):
- Read `dh_model_list` + `dh_model_list_fetched_at` from `chrome.storage.local`.
- If missing or `> 24h` old → send `{type: "LIST_MODELS"}` to the SW /
  host RPC. On success, cache `{models, fetchedAt: now}`. On error, keep the
  old cache and set the error-banner state.
- Refresh button bypasses the staleness check.

The SW forwards `LIST_MODELS` to the host `list_models` action (fire an RPC,
return the classified result), mirroring the existing NATIVE_MSG plumbing.

## 5. Failure handling (surface, never silent)

Mirrors the team-catalog manifest-error fix (`docs/...2026-07-03` era). The
`list_models` path returns a **discriminated result**:
- Host classifies: GitHub-auth failure → `errorKind: "auth"`; client not
  ready / RPC failure → `"unavailable"`; else `"unknown"`.
- Extension on error:
  - **Keeps the cached model list** so the dropdown still works with the
    last-known-good data (graceful degradation).
  - **Shows a red banner**: for `auth`, "无法获取模型列表:GitHub 登录可能已
    过期,请在终端运行 `copilot` 重新登录后点刷新"; for others, a generic
    "无法获取模型列表,请稍后点刷新重试" with the raw message in console.
  - Does **not** wipe the user's currently-selected model (a fetch failure
    must not reset config).
- An empty list from a *successful* call (no models available) is shown as a
  distinct info state, not an error.

## 6. Future extensibility (Azure OpenAI / BYOK) — out of scope, structured for

The SDK's `create_session(provider=ProviderConfig)` supports BYOK
(`type: "openai"|"azure"|"anthropic"`, `base_url`, `api_key`,
`bearer_token`, `wire_api`, `azure.api_version`). This release does **not**
implement it, but the design leaves room:
- The Options section is named "Model & Performance" (not "Model") so a
  "Custom Provider (BYOK)" subsection can be added below without renaming.
- Config schema: today `extension_preferences.{model,reasoning_effort,
  context_tier}`. A future `extension_preferences.provider` object slots in
  alongside; `_refresh_session` would add `provider` to `sdk_kwargs` with the
  same empty-means-inherit rule.
- When a custom provider is set, `model` becomes required (SDK rule) — a
  future concern, flagged here so the UI validation can enforce it later.

## 7. Test plan

- **Host** (`host/test_*.py`): unit-test the config validation — legal
  `reasoning_effort`/`context_tier` pass through; illegal values are dropped
  (treated as empty) with no exception. Test that empty values are NOT added
  to `sdk_kwargs` (inherit path). `list_models` classification: mock the
  client to raise → assert `errorKind` mapping; return models → assert shape.
  (Source-inspection or light mock, matching existing host test style.)
- **Extension** (`*.test.ts`): the model-list cache/staleness logic if
  extracted to a pure helper (fetch decision given `fetchedAt` + now); the
  effort-filtering given a `ModelInfo.supported_reasoning_efforts`.
- **Break-and-fail** on any new spec-invariant test.
- Build green (host `unittest discover`, extension `test:run` + `build`).

## 8. Rollback

Additive feature. `git revert` of the implementation commits restores the
inherit-only behaviour. Config keys default empty, so a rollback leaves
`config.json` with harmless unused keys. No migration.

## 9. Out of scope

- BYOK / custom provider (§ 6 — future).
- The `"max"` effort alias (CLI-only; SDK caps at `xhigh`).
- Per-case or per-product model selection (single global DH model for now).
