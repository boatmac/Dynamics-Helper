# Extension Test Infrastructure — Design

**Date:** 2026-05-22
**Status:** Draft (pending user approval before plan)
**Author:** AI agent (brainstorming session with user)
**Scope:** Introduce Vitest-based testing infrastructure to `extension/` and ship three first-batch regression tests covering PageReader case-ID extraction, Options hydration-window edits, and (deferred) FAB rootPathOverride.

## 1. Background and Motivation

The Chrome extension half of Dynamics Helper has **zero unit tests** today. The host side has 7 test files and 50 passing tests (`python -m unittest discover host`), but `extension/src` has only `node_modules` test fixtures from third-party packages.

Three bugs that shipped to users would have been caught by basic unit tests:

1. **Session-name pollution by D365 task-ID + SKU concatenation** in `pageReader.idRegex` (called out in `2026-05-11-beta-channel-toggle.md` line 878). The polluted-text variant slipped through manual review undetected.
2. **Hydration-window edits silently lost** in `Options.tsx` (`957754e`, smoke-tested 2026-05-22). The bug was subtle enough that even a careful review of the original `prefsHydratedRef` guard would have passed — only running the actual `mount → fast user click → host get_config` timeline revealed the issue.
3. **FAB `rootPathOverride` regression risk** — the merged `effectivePrefs` pattern in `FAB.tsx` is documented but unprotected; a future refactor could collapse it.

The blocker so far has been **infrastructure setup**: no test runner, no jsdom env, no chrome API mocks, no `@testing-library/react` install. This spec lands the infrastructure and three first-batch tests in one pass.

### Constraints carried in

- **Vite 7 + React 19 + TS 5.9** stack must be respected. The toolchain choice falls out of this.
- **Single-developer project**; tests must be runnable locally with one command and not require CI to be set up. CI integration is out of scope but the test command must be CI-shaped (exits non-zero on failure, produces JUnit XML if requested).
- **No test means no safety net for the next refactor**. The `PrefsContext` strategic refactor (separate spec, `2026-05-21-prefs-context-refactor-plan.md`) becomes much safer once hydration logic is test-covered.

## 2. Decisions Already Made (User-Approved)

Captured here so the plan and reviewer don't relitigate.

| Decision | Choice | Rationale |
|---|---|---|
| Runner | **Vitest** | Shares `vite.config.ts`, native TS/ESM, React 19 first-class. Jest 30 was the alternative — rejected because it requires duplicating Vite's path resolution, CSS handling, and `@crxjs/vite-plugin` interop. |
| First batch scope | **(d) Infra + PageReader + Options hydration + (defer FAB)** | Hits both the highest-risk bug (Options hydration, just shipped) and the documented regression risk (PageReader). FAB is documented as follow-up; first batch keeps net diff to a reviewable size. |
| PageReader test depth | **(a) Pure function level** | `idRegex` is a pure regex; `extractValueFromNeighbors` is a DOM-walking pure function. Integration-level testing of full `PageReader.read()` is out of scope for first batch. |
| Options hydration test depth | **(a) Full component level** | The bug is fundamentally a setState batching + ref + useEffect interaction. Pure-function extraction would mis-shape the test against the bug class. Cost (~200 lines, chrome mock complexity) is paid once. |
| FAB rootPathOverride | **Deferred to follow-up** | FAB.tsx is large and mock-heavy; testing one specific ref pattern in isolation is poor ROI until infrastructure proves stable. Already tracked in `2026-05-11-beta-channel-toggle.md` line 893. |
| Chrome API mock | **(a) Hand-rolled stub** | Project only uses `chrome.storage.local`, `chrome.runtime.sendMessage`, `chrome.runtime.lastError`. ~50 lines of `vi.fn()` stubs avoids the `vitest-chrome` / `jest-chrome` dead-dep risk. |

## 3. Goals and Non-Goals

### Goals

- G1: One command (`npm test` in `extension/`) runs all extension tests and exits non-zero on failure.
- G2: jsdom env auto-loaded; `@testing-library/react` queries work for React 19 components.
- G3: Chrome storage and runtime APIs are mock-able at file scope with sensible defaults.
- G4: PageReader case-ID regex regression test exists and would catch the pollution variant.
- G5: Options hydration-window regression test exists and would catch removal of the touched ref, removal of the storage-always-write rule, or removal of the catch-up RPC.
- G6: Existing build (`npm run build`) is not affected. Test files compile without polluting the production bundle.
- G7: Test suite runs in under 5 seconds locally on the first batch (target; measure on actual run).

### Non-Goals

- **CI pipeline configuration.** This spec writes a test command; the user wires it into GitHub Actions or any other CI later.
- **Snapshot tests.** Out of scope for first batch — high maintenance, low signal for this codebase.
- **e2e or browser-real tests.** No Playwright, no Chrome extension launching. jsdom-level only.
- **FAB.tsx tests.** Deferred. Tracked in backlog.
- **Coverage targets / coverage gates.** First batch is regression-targeted, not coverage-targeted.
- **Host-side tests.** Host already has its own test infrastructure (`python -m unittest`).
- **Refactoring production code to be more testable** beyond the minimum needed for first batch (specifically: PageReader needs minimal surface area changes to expose two internals — see § 5.2).

## 4. Architecture

### 4.1 Toolchain

```
extension/
├── vite.config.ts            (unchanged)
├── vitest.config.ts          (NEW — extends vite.config; sets jsdom env; points at setup file)
├── package.json              (modified — devDeps + scripts)
├── src/
│   ├── test/                 (NEW directory)
│   │   ├── setup.ts          (NEW — imports jest-dom matchers; installs chrome mock)
│   │   └── chromeMock.ts     (NEW — hand-rolled chrome.storage + chrome.runtime stubs)
│   ├── utils/
│   │   ├── pageReader.ts     (MODIFIED — minimal exports for testability; see § 5.2)
│   │   └── pageReader.test.ts (NEW — PageReader regression tests)
│   └── components/
│       └── Options.test.tsx  (NEW — hydration-window regression tests)
└── tsconfig.json             (modified — include "src/**/*.test.ts*" in test compile, but ensure vite.config excludes them from production build)
```

### 4.2 Vitest config

`vitest.config.ts` extends `vite.config.ts` (Vitest natively supports this via `mergeConfig` or just letting Vitest auto-pick up `vite.config.ts`). Key settings:

```ts
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(viteConfig, defineConfig({
  test: {
    globals: true,                    // describe/it/expect global, like Jest
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    pool: 'forks',                    // safer with React 19 act() + jsdom
  },
}));
```

Vite's production build (`npm run build` → `tsc && vite build`) is unaffected because Vite's `build.rollupOptions.input` already targets `index.html` / manifest entry points, not test files.

### 4.3 Chrome API mock surface

`chromeMock.ts` exposes:

```ts
export interface ChromeStorageMock {
  data: Record<string, unknown>;        // internal state, inspectable from tests
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  onChanged: { addListener: ReturnType<typeof vi.fn>; removeListener: ReturnType<typeof vi.fn> };
}

export interface ChromeRuntimeMock {
  sendMessage: ReturnType<typeof vi.fn>;
  lastError: { message: string } | undefined;
  onMessage: { addListener: ReturnType<typeof vi.fn>; removeListener: ReturnType<typeof vi.fn> };
}

export function installChromeMock(): { storage: ChromeStorageMock; runtime: ChromeRuntimeMock };
export function resetChromeMock(): void;
```

**Critical behavioral choices:**

1. `storage.set` updates `data` synchronously AND fires the callback asynchronously (microtask) to match real Chrome semantics. Tests that depend on "storage write completes before next event loop tick" must `await Promise.resolve()` between actions.
2. `storage.get` reads from `data` and fires the callback asynchronously the same way.
3. `runtime.sendMessage` is `vi.fn()` with **no default response** — each test must call `mockImplementation` or `mockImplementationOnce` to define how the host responds. Forgetting to mock = the callback is never called = test times out (signals "you missed a path").
4. `runtime.lastError` defaults to `undefined`. Tests force it by setting it inside the `sendMessage` mock implementation BEFORE invoking the callback, then clearing it after.
5. `onChanged.addListener` records the listener; tests can manually call the listener with `[change object, 'local']` to simulate cross-tab storage events.

`setup.ts` calls `installChromeMock()` once and assigns to `globalThis.chrome`. Each test file's `beforeEach` calls `resetChromeMock()` to clear state and `vi.fn` history.

### 4.4 React 19 + Testing Library notes

- `@testing-library/react` v16 GA is the React-19-compatible major. v15 and earlier don't work.
- `act()` warnings: jsdom + React 19 + `useEffect` chains will produce console warnings if state updates leak outside `act()`. The shape of these tests (mount Options, fire chrome events, wait for state to settle) requires `await waitFor(...)` and `await act(async () => {...})` rather than the synchronous helpers v15 sometimes allowed. Options test must use the async forms.
- `@testing-library/jest-dom` is imported once in `setup.ts` via `import '@testing-library/jest-dom/vitest'` to register matchers.

## 5. First-Batch Test Designs

### 5.1 PageReader regression test

**File:** `extension/src/utils/pageReader.test.ts`

**Scope:** Two assertions:

1. **`idRegex` accepts the canonical case-ID forms and rejects polluted text.**
   - Accepts: 16-digit case ID (`2026010100123456`), 19-digit task ID (`2026010100123456789`).
   - Rejects (returns no match or returns only the leading 16-digit prefix, depending on which contract we choose to enforce): D365 task-ID + SKU concatenation like `2026010100123456SKU2024` or `2026010100123456789TASK_LABEL`.
   - **Open question for spec review:** the bug history says regex returned a corrupted match. The fix landed in commit history; we should pin which exact strings the regex must accept and which it must reject. Plan step 1 will inspect the regex source and pin a 5-row truth table.

2. **`extractValueFromNeighbors` returns the validated value when DOM siblings contain a matching string, and returns undefined when the matching string fails the validator.**
   - Fixture: jsdom builds a `<div><label>Case Number</label><input value="..."/></div>` minimal DOM.
   - Case A: input value = valid 16-digit ID, validator = `idRegex` → returns the ID.
   - Case B: input value = polluted text, validator = `idRegex` → returns undefined (or returns only the matched substring, per regex semantics — same open question).
   - Case C: input value = valid 16-digit ID, no validator → returns the raw value.

**Production code change required (minimal):**

`pageReader.ts` currently has both `extractValueFromNeighbors` (private static) and `idRegex` (function-scope const inside `scanForErrors`) hidden from the module's export surface. Two options:

- **Option A: export `idRegex` and `extractValueFromNeighbors` as named exports adjacent to the class.** Lift `idRegex` from function scope to module scope (it's already a stable const). Change `extractValueFromNeighbors` from `private static` to either `public static` or a free function. Cost: ~5 lines. **Recommended.**
- **Option B: add a `__testing__` named export object** containing references to internal symbols. Common pattern for "test-only internals". Cost: ~3 lines + slightly uglier.

Recommend Option A because `idRegex` deserves to be a module-level export anyway (other future code may want to validate IDs at the boundary), and `extractValueFromNeighbors` being callable from outside is harmless — it's a pure DOM function with no class state.

**Estimated test file size:** ~60 lines.

### 5.2 Options hydration-window regression test

**File:** `extension/src/components/Options.test.tsx`

**Scope:** Four observable assertions covering invariants I1-I5 from the hydration-window spec (`2026-05-21-options-hydration-window-edits-design.md` § 2). I3 (touched ref marked at edit time) is implementation detail with no direct observable; it is enforced indirectly by I4 (if touched ref were not set, the merge would overwrite and T4 would fail).

| # | Invariants covered | Test |
|---|---|---|
| T1 | I1: storage write unconditional | Mount Options with host RPC stubbed to *never call back* (simulates pre-hydration window). Fire `updatePref('language', 'en')`. Assert `chrome.storage.local.set` was called with `{ dh_prefs: { ..., language: 'en' } }`. |
| T2 | I2: host RPC gated on hydration | Same as T1. Assert `chrome.runtime.sendMessage` for `update_config` was NOT called (only the initial `get_config` was called, with no `update_config`). |
| T3 | I3 + I4: touched ref guards merge | Mount Options. Fire `updatePref('language', 'en')` while `get_config` is pending. Resolve `get_config` with `{ language: 'zh', ... }` (host says zh). Assert post-resolution: `chrome.storage.local.set` was called with `language: 'en'` (not overwritten by host's zh). This failing implies either the touched ref was not set OR the merge ignored it — both branches are protected. |
| T4 | I5: catch-up RPC fires on hydration COMPLETE | Same setup as T3. Assert: after `get_config` resolves, `chrome.runtime.sendMessage` was called with payload `{ action: 'update_config', extension_preferences: { language: 'en', ... } }` (the catch-up RPC pushed the window-edit to host). |

**Mock orchestration:**

Each test installs `chromeMock`, then:

1. Configure `chrome.runtime.sendMessage` to deferred-respond to `get_config`. Tests hold a `resolveGetConfig` function that, when called, invokes the `sendMessage` callback with the host's mock response.
2. Mount `<Options />` with `render()` from testing-library.
3. Fire user actions via either `fireEvent.change(...)` on form inputs OR by triggering the relevant `updatePref` path via the rendered component's interactive elements (language select, etc).
4. Call `resolveGetConfig(hostResponse)` to simulate hydration completing.
5. `await waitFor(() => expect(...))` for the post-hydration state.

**Risk:** Options.tsx has ~2300 lines and complex mount-time orchestration (telemetry init, manifest fetch, team catalog sync). The test must mock or no-op the team catalog sync RPC (`SYNC_TEAM_CATALOG`) and telemetry init or both will throw in jsdom. Mocks default to `vi.fn()` returning `undefined`; absent any callback invocation, the team sync just hangs harmlessly (the test doesn't await it).

**Estimated test file size:** ~200 lines.

### 5.3 FAB rootPathOverride (deferred)

Not in first batch. Backlog entry stays open at `2026-05-11-beta-channel-toggle.md` line 893. When implemented (post first-batch infrastructure proves stable), it lives in `extension/src/components/FAB.test.tsx`.

## 6. Test File Layout and Naming

Co-locate tests next to source files:

```
src/utils/pageReader.ts          → src/utils/pageReader.test.ts
src/components/Options.tsx       → src/components/Options.test.tsx
src/components/FAB.tsx           → src/components/FAB.test.tsx        (future)
```

Reasoning: Vitest pattern `src/**/*.test.{ts,tsx}` picks them up automatically; co-location makes the test discoverable when reading the source. No `__tests__/` directory.

## 7. Package Changes

`extension/package.json` additions:

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  },
  "devDependencies": {
    "vitest": "^3.x",
    "@testing-library/react": "^16.x",
    "@testing-library/jest-dom": "^6.x",
    "@vitest/coverage-v8": "^3.x"
  }
}
```

(Exact pinning happens in the plan step. `jsdom` and `@types/jsdom` are already present.)

`@vitest/coverage-v8` is bundled but coverage is **not run by default** in CI gates; it's available via `npm run test:coverage` for the developer to inspect. Coverage targets are explicitly out of scope (§ 3 non-goal).

## 8. Open Questions Resolved Inline

| Question | Resolution |
|---|---|
| Can Vitest re-use `vite.config.ts`? | Yes, via `mergeConfig` (Vitest's recommended pattern). § 4.2. |
| Does `@crxjs/vite-plugin` interfere with Vitest? | Vitest's vite mode loads the same config but doesn't run the build pipeline. The CRX plugin's manifest transforms apply only during `vite build`, not test mode. Confirmed by reading @crxjs docs (plugin hooks into `build`, not `test`). |
| Should `idRegex` truth table be in the spec or the plan? | Plan. The spec sets the principle; the truth table is implementation detail to be derived after re-reading `pageReader.ts` line by line in plan step 1. |
| What about FAB.tsx user-edit ref protection (the canonical pattern per AGENTS.md § 3)? | Out of scope for first batch. The FAB test backlog entry covers this when activated. |

## 9. Success Criteria

The first-batch landing is successful when:

1. `npm install` in `extension/` adds the new devDeps without breaking the existing build.
2. `npm run build` in `extension/` still produces a working `dist/` (no test code in production bundle).
3. `npm test` in `extension/` runs all tests and prints PASS.
4. Manually breaking the production code in any of these ways causes the relevant test to FAIL:
   - Remove `idRegex` validator from `extractValueFromNeighbors` → PageReader assertion #2 fails.
   - Re-add the early-return in `persistPrefs` that the hydration fix removed → T1 fails.
   - Remove the touched-ref guard in the hydration merge → T3 fails.
   - Remove the catch-up RPC → T4 fails.

These four "break-and-fail" checks are the acceptance verification step in the plan.

## 10. Out-of-Scope Follow-ups (capture for future)

- FAB rootPathOverride test (already in backlog).
- PageReader integration test using a real D365-shaped HTML fixture.
- Snapshot tests for visual components.
- Coverage gates in CI.
- Host-side test infrastructure improvements (unrelated, not regressed by this work).
- Service Worker telemetry init bug fix verification test (added 2026-05-22 to backlog as separate item).

## 11. Risk and Mitigations

| Risk | Mitigation |
|---|---|
| jsdom missing browser API used by some imported module (e.g., `IntersectionObserver`, `matchMedia`) | Add minimal polyfills in `setup.ts` if encountered. Most modern testing-library setups need 1-2 of these. |
| `@crxjs/vite-plugin` errors when Vitest loads the merged config | If `mergeConfig` triggers the plugin, switch to a Vitest-specific config that does NOT extend vite.config but redeclares only the bits Vitest needs (path alias if any, postcss). |
| React 19 `act()` warnings as noisy console output | Suppress via `setup.ts` console filter ONLY for the specific known-safe warnings; never blanket-suppress. |
| `Options.tsx` mount-time effects (team catalog sync, telemetry, update check) make the test brittle | Mock all three at the `chrome.runtime.sendMessage` level — defaults return `undefined`, so they no-op silently. Document the required mocks in the test file's header comment. |
| `pool: 'forks'` slower than threads | Threads is faster but has known issues with React 19 + jsdom shared state. Forks is the safer default; revisit only if speed becomes a problem. |

## 12. Estimated Effort

Reading and pinning regex truth table: 30 min.
Vitest config + setup.ts + chromeMock.ts: 90 min.
PageReader.test.ts: 45 min (writing + minor pageReader.ts export changes).
Options.test.tsx: 3-4 hours (mock orchestration, React 19 act handling, debugging the first inevitable jsdom mismatch).
Documentation updates (AGENTS.md, DEVELOPER_GUIDE.md): 30 min.

**Total estimate: ~6-7 hours of focused work.**

## 13. References

- `2026-05-11-beta-channel-toggle.md` — backlog anchor, follow-up items #2 (PageReader) and FAB rootPathOverride.
- `2026-05-21-options-hydration-window-edits-design.md` — invariants I1-I5 referenced in § 5.2.
- `957754e` — production fix that this test batch protects.
- `AGENTS.md` § 3 — "User Edit Protection (Critical Pattern)", which T4 indirectly enforces.
- Vitest docs: https://vitest.dev/guide/
- Testing Library React v16: https://testing-library.com/docs/react-testing-library/intro/
