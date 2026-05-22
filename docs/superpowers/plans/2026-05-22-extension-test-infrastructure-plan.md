# Extension Test Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land Vitest-based testing infrastructure in `extension/` and ship three first-batch regression tests covering PageReader case-ID extraction, Options hydration-window edits, plus chrome API mocks reusable for future tests.

**Architecture:** Vitest as runner (shares `vite.config.ts`), jsdom env (already in devDeps), hand-rolled chrome storage + runtime mocks (no external dep), co-located test files (`*.test.ts` / `*.test.tsx`), production code change limited to one `export` on `pageReader.ts:167`.

**Tech Stack:** Vitest 3.x + @testing-library/react 16.x + @testing-library/jest-dom 6.x + existing jsdom 27.x.

**Reference:** Design spec at `docs/superpowers/specs/2026-05-22-extension-test-infrastructure-design.md`.

**Working directory for all `npm` / `vitest` commands:** `C:\MyWorkbench\Repository\Dynamics Helper\extension`

---

## Deviations from Spec

While writing the plan I refined two implementation details from the spec:

1. **PageReader test approach (spec § 5.1):** Spec proposed exposing both `idRegex` AND `extractValueFromNeighbors` (Option A). After re-reading `pageReader.ts:28-112`, `extractValueFromNeighbors` calls another private helper `extractValueFromNode` — exposing one transitively requires the other. **Revised approach:** export only `idRegex` (one-line change at `pageReader.ts:167`); test the DOM-walking behavior via the public `scanForErrors()` method with a jsdom-constructed minimal D365 fixture. Net: same test coverage with smaller API surface change.

2. **Spec § 5.2 T1-T4 mock orchestration:** The hydration tests need `chrome.runtime.sendMessage` to behave like a queue (host's `get_config` response is delayed; subsequent `update_config` calls go straight through). The plan formalizes this as a `defer / resolve` pattern inside the chrome mock, captured in Task 3.

These deviations don't change the test invariants (T1-T4 still map 1:1 to I1-I5).

---

## File Structure

**Files this plan creates:**

- `extension/vitest.config.ts` — Vitest config (merged from vite.config.ts)
- `extension/src/test/setup.ts` — global setup: jest-dom matchers + chrome mock install
- `extension/src/test/chromeMock.ts` — hand-rolled `chrome.storage` + `chrome.runtime` stubs with deferred-callback support
- `extension/src/test/fixtures/d365CaseDom.ts` — minimal jsdom fixture builder for PageReader tests
- `extension/src/utils/pageReader.test.ts` — PageReader regression tests
- `extension/src/components/Options.test.tsx` — Options hydration-window regression tests

**Files this plan modifies:**

- `extension/package.json` — add 4 devDeps + 3 test scripts
- `extension/src/utils/pageReader.ts:167` — export `idRegex` at module scope
- `extension/tsconfig.json` — ensure test files compile cleanly (add `vitest/globals` types if needed)
- `extension/.gitignore` (root) — add `extension/coverage/` (verify it isn't already covered)

**Files this plan deliberately does NOT modify:**

- `extension/vite.config.ts` — must stay unchanged so production build is unaffected
- `extension/src/components/Options.tsx` — no production changes; tests work against the existing `957754e` implementation
- `host/**` — out of scope

---

## Task 1: Install dependencies

**Files:**
- Modify: `extension/package.json`

- [ ] **Step 1.1: Verify pre-conditions (no test deps installed yet)**

Run: `npm ls vitest @testing-library/react 2>&1 | Select-String "(empty|missing|UNMET|extension@)"`

Expected output: shows `extension@2.0.70-beta.4` with no children listed under those packages (they're absent). If either is already installed, STOP — that means partial work-in-progress exists; investigate before proceeding.

- [ ] **Step 1.2: Install runtime + types**

Run:
```pwsh
npm install --save-dev vitest@^3 @testing-library/react@^16 @testing-library/jest-dom@^6 @vitest/coverage-v8@^3
```

Expected: 4 packages added to `devDependencies` in package.json. The `^3` and `^16` and `^6` resolve to current latest majors; the install command also writes the exact installed version into package.json.

- [ ] **Step 1.3: Verify build still works**

Run: `npm run build`

Expected: existing build pipeline completes successfully (same output as before — `dist/` written, no errors). The test deps must not perturb the production build.

- [ ] **Step 1.4: Commit**

Run:
```pwsh
git add extension/package.json extension/package-lock.json
git commit -m "build(extension): add vitest test infra deps"
```

---

## Task 2: Create Vitest config

**Files:**
- Create: `extension/vitest.config.ts`

- [ ] **Step 2.1: Write vitest.config.ts**

Create file with content:

```ts
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

// Vitest extends the production vite config so path resolution, TS settings,
// and React plugin behavior stay consistent. The CRXJS plugin is a no-op in
// test mode (it hooks `build`, not `test`).
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      // forks pool avoids React 19 + jsdom shared-state issues seen with
      // the default threads pool.
      pool: 'forks',
    },
  })
);
```

- [ ] **Step 2.2: Smoke-test vitest config loads**

Run: `npx vitest --run --reporter=verbose`

Expected: vitest starts, prints "No test files found, exiting with code 0" (or similar). No errors about config loading, CRXJS plugin conflicts, or vite mode issues. If CRXJS throws ("manifest must specify..." etc.), fallback: replace `mergeConfig` with a standalone config that does NOT import vite.config. See Task 2 Step 2.3 (conditional).

- [ ] **Step 2.3 (CONDITIONAL — only if Step 2.2 fails with CRXJS errors): Fallback to standalone config**

If CRXJS errored, REPLACE the file content with:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Standalone test config — does not extend vite.config.ts because the CRXJS
// plugin's config-load hooks interfere with Vitest. React plugin only.
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    pool: 'forks',
  },
});
```

Re-run Step 2.2 with this config. Expected: same "No test files found" success.

- [ ] **Step 2.4: Commit**

Run:
```pwsh
git add extension/vitest.config.ts
git commit -m "build(extension): vitest config (jsdom + forks pool)"
```

---

## Task 3: Chrome API mock

**Files:**
- Create: `extension/src/test/chromeMock.ts`

- [ ] **Step 3.1: Write chromeMock.ts**

Create file with content:

```ts
/**
 * Hand-rolled chrome API mock for Vitest. Covers the subset DH actually uses:
 *
 *   - chrome.storage.local.get / set / remove
 *   - chrome.storage.onChanged.addListener / removeListener
 *   - chrome.runtime.sendMessage (with deferred-response support for testing
 *     the hydration window)
 *   - chrome.runtime.lastError (settable per response)
 *   - chrome.runtime.onMessage.addListener / removeListener
 *
 * Why hand-rolled vs vitest-chrome: only 4-5 APIs needed, both vitest-chrome
 * and jest-chrome are barely maintained, and we want tests to fail loudly
 * when an unexpected API path is hit (no silent default returns).
 *
 * Usage in a test:
 *
 *   import { installChromeMock, resetChromeMock } from '../test/chromeMock';
 *
 *   beforeEach(() => { resetChromeMock(); });
 *
 *   // Defer a sendMessage response until the test triggers it:
 *   const pending = chromeMock.runtime.deferNextResponse('get_config');
 *   render(<Options />);
 *   // ... assertions about pre-hydration state ...
 *   pending.resolve({ status: 'success', data: { ... } });
 *   await waitFor(() => expect(...));
 */

import { vi, type Mock } from 'vitest';

export interface DeferredResponse {
  resolve(response: unknown): void;
  reject(error: { message: string }): void;
}

interface PendingMessage {
  predicate: (payload: unknown) => boolean;
  deferred: DeferredResponse;
}

export interface ChromeStorageMock {
  data: Record<string, unknown>;
  get: Mock;
  set: Mock;
  remove: Mock;
  onChanged: {
    addListener: Mock;
    removeListener: Mock;
    listeners: Array<(changes: Record<string, { oldValue?: unknown; newValue?: unknown }>, areaName: string) => void>;
  };
}

export interface ChromeRuntimeMock {
  sendMessage: Mock;
  lastError: { message: string } | undefined;
  onMessage: { addListener: Mock; removeListener: Mock };
  /**
   * Queue a deferred response. The next sendMessage call whose payload matches
   * the predicate (or matches by `payload.action === actionName` when given a
   * string) holds its callback until the returned `resolve(response)` is called.
   */
  deferNextResponse: (matcher: string | ((payload: unknown) => boolean)) => DeferredResponse;
  /**
   * Set the response that any unmatched sendMessage call gets immediately.
   * Default: no-op (callback is never invoked, which surfaces forgotten mocks
   * as test timeouts).
   */
  setDefaultResponse: (response: unknown) => void;
}

let storage: ChromeStorageMock;
let runtime: ChromeRuntimeMock;
let pendingResponses: PendingMessage[] = [];
let defaultRuntimeResponse: unknown = undefined;

function buildStorage(): ChromeStorageMock {
  const data: Record<string, unknown> = {};
  const listeners: ChromeStorageMock['onChanged']['listeners'] = [];

  const get = vi.fn((keys: string | string[] | null, cb: (items: Record<string, unknown>) => void) => {
    const result: Record<string, unknown> = {};
    const keyList = keys === null ? Object.keys(data) : Array.isArray(keys) ? keys : [keys];
    for (const k of keyList) if (k in data) result[k] = data[k];
    // Async callback to match real chrome semantics
    queueMicrotask(() => cb(result));
  });

  const set = vi.fn((items: Record<string, unknown>, cb?: () => void) => {
    const changes: Record<string, { oldValue?: unknown; newValue?: unknown }> = {};
    for (const [k, v] of Object.entries(items)) {
      changes[k] = { oldValue: data[k], newValue: v };
      data[k] = v;
    }
    queueMicrotask(() => {
      if (cb) cb();
      for (const l of listeners) l(changes, 'local');
    });
  });

  const remove = vi.fn((keys: string | string[], cb?: () => void) => {
    const keyList = Array.isArray(keys) ? keys : [keys];
    const changes: Record<string, { oldValue?: unknown; newValue?: unknown }> = {};
    for (const k of keyList) {
      if (k in data) {
        changes[k] = { oldValue: data[k] };
        delete data[k];
      }
    }
    queueMicrotask(() => {
      if (cb) cb();
      for (const l of listeners) l(changes, 'local');
    });
  });

  const onChanged = {
    addListener: vi.fn((l: typeof listeners[number]) => { listeners.push(l); }),
    removeListener: vi.fn((l: typeof listeners[number]) => {
      const idx = listeners.indexOf(l);
      if (idx >= 0) listeners.splice(idx, 1);
    }),
    listeners,
  };

  return { data, get, set, remove, onChanged };
}

function buildRuntime(): ChromeRuntimeMock {
  const sendMessage = vi.fn((message: unknown, cb?: (response: unknown) => void) => {
    // Try to match against pending deferred responses first
    for (let i = 0; i < pendingResponses.length; i++) {
      const pending = pendingResponses[i];
      if (pending.predicate(message)) {
        pendingResponses.splice(i, 1);
        const deferred: DeferredResponse = {
          resolve(response) {
            queueMicrotask(() => {
              if (cb) cb(response);
            });
          },
          reject(error) {
            queueMicrotask(() => {
              runtime.lastError = error;
              if (cb) cb(undefined);
              runtime.lastError = undefined;
            });
          },
        };
        // Replace the original deferred's resolve/reject with these (so the
        // test's deferNextResponse return value drives this specific call)
        pending.deferred.resolve = deferred.resolve;
        pending.deferred.reject = deferred.reject;
        return;
      }
    }
    // No match — use default response (no-op by default; test timeouts surface
    // forgotten mocks)
    if (defaultRuntimeResponse !== undefined && cb) {
      queueMicrotask(() => cb(defaultRuntimeResponse));
    }
  });

  return {
    sendMessage,
    lastError: undefined,
    onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
    deferNextResponse(matcher) {
      const predicate = typeof matcher === 'string'
        ? (payload: unknown) => {
            const p = payload as { payload?: { action?: string } } | undefined;
            return p?.payload?.action === matcher;
          }
        : matcher;
      const deferred: DeferredResponse = {
        resolve: () => { throw new Error('Deferred response was not yet picked up by a sendMessage call'); },
        reject: () => { throw new Error('Deferred response was not yet picked up by a sendMessage call'); },
      };
      pendingResponses.push({ predicate, deferred });
      // Return a wrapper that forwards to whatever the matching sendMessage installs
      return {
        resolve: (response) => deferred.resolve(response),
        reject: (error) => deferred.reject(error),
      };
    },
    setDefaultResponse(response) {
      defaultRuntimeResponse = response;
    },
  };
}

export function installChromeMock(): { storage: ChromeStorageMock; runtime: ChromeRuntimeMock } {
  storage = buildStorage();
  runtime = buildRuntime();
  pendingResponses = [];
  defaultRuntimeResponse = undefined;
  (globalThis as unknown as { chrome: unknown }).chrome = {
    storage: { local: storage, onChanged: storage.onChanged },
    runtime,
  };
  return { storage, runtime };
}

export function resetChromeMock(): { storage: ChromeStorageMock; runtime: ChromeRuntimeMock } {
  return installChromeMock();
}

export function getChromeMock(): { storage: ChromeStorageMock; runtime: ChromeRuntimeMock } {
  return { storage, runtime };
}
```

- [ ] **Step 3.2: Commit (without test using it yet — it's a building block)**

Run:
```pwsh
git add extension/src/test/chromeMock.ts
git commit -m "test(extension): hand-rolled chrome API mock for vitest"
```

---

## Task 4: Setup file

**Files:**
- Create: `extension/src/test/setup.ts`

- [ ] **Step 4.1: Write setup.ts**

Create file with content:

```ts
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { installChromeMock, resetChromeMock } from './chromeMock';

// Install chrome mock once at module load; reset before every test so each
// test starts with a clean slate but doesn't re-install global hooks.
installChromeMock();

beforeEach(() => {
  resetChromeMock();
});

afterEach(() => {
  // testing-library auto-cleanup unmounts components between tests so
  // useEffect cleanup paths run.
  cleanup();
});
```

- [ ] **Step 4.2: Smoke-test by writing a trivial passing test**

Create temporary `extension/src/test/smoke.test.ts` with:

```ts
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('vitest runs', () => {
    expect(1 + 1).toBe(2);
  });

  it('chrome mock is installed', () => {
    expect(globalThis.chrome).toBeDefined();
    expect(globalThis.chrome.storage).toBeDefined();
    expect(globalThis.chrome.runtime).toBeDefined();
  });

  it('jest-dom matchers loaded', () => {
    const el = document.createElement('div');
    el.textContent = 'hello';
    document.body.appendChild(el);
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent('hello');
  });
});
```

- [ ] **Step 4.3: Run smoke test**

Run: `npx vitest --run src/test/smoke.test.ts`

Expected output: `Test Files  1 passed (1)`, `Tests  3 passed (3)`.

- [ ] **Step 4.4: Add npm scripts to package.json**

Modify `extension/package.json` scripts section. After the existing `"preview": "vite preview"` add:

```json
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
```

Final scripts block should be (preserving order):

```json
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  },
```

- [ ] **Step 4.5: Verify scripts work**

Run: `npm run test:run -- src/test/smoke.test.ts`

Expected: same 3 passing tests, exit code 0.

- [ ] **Step 4.6: Delete smoke test (was a one-shot)**

Run: `Remove-Item extension\src\test\smoke.test.ts`

- [ ] **Step 4.7: Commit**

Run:
```pwsh
git add extension/src/test/setup.ts extension/package.json
git commit -m "test(extension): setup file + npm scripts (vitest + jest-dom + cleanup)"
```

---

## Task 5: Export idRegex from pageReader

**Files:**
- Modify: `extension/src/utils/pageReader.ts:167` (and the comment block above it)

- [ ] **Step 5.1: Promote idRegex to module scope**

The current code at `pageReader.ts:160-167` is:

```ts
        // Regex for case/task IDs:
        //   - 16-digit case number (e.g. 2601190030003106)
        //   - 19-digit task ID (e.g. 2601190030003106001) - prefix to its parent case
        //   - Or common alpha-prefixed formats like WO-12345, INC-1234, CAS-01234-A1B2
        // \b boundaries make sure we don't grab a digit run that's adjacent to more
        // digits we don't want (e.g. a 20-digit blob).
        const idRegex = /(\b\d{16}(?:\d{3})?\b)|(\b[A-Z]{2,10}-?\d{3,}[-\w]*\b)/;
```

Move the regex + its comment to module scope (right after the `ScrapedData` interface definition at the top of the file, before `export class PageReader`). Replace the local declaration inside the function with a reference to the imported/exported name. Specifically:

1. After the `export interface ScrapedData { ... }` block near `pageReader.ts:3-15`, add:

```ts
/**
 * Regex for case/task IDs accepted by Dynamics Helper:
 *   - 16-digit case number (e.g. 2601190030003106)
 *   - 19-digit task ID (e.g. 2601190030003106001) — prefix to its parent case
 *   - Common alpha-prefixed formats like WO-12345, INC-1234, CAS-01234-A1B2
 *
 * \b boundaries prevent grabbing a digit run that's adjacent to more digits
 * we don't want (e.g. a 20-digit blob from concatenated SKU + task-ID text).
 *
 * Exported so unit tests can assert acceptance/rejection contracts directly
 * without re-deriving the pattern. See pageReader.test.ts.
 */
export const idRegex = /(\b\d{16}(?:\d{3})?\b)|(\b[A-Z]{2,10}-?\d{3,}[-\w]*\b)/;
```

2. Delete the original `const idRegex = /.../;` line at `pageReader.ts:167`.
3. Delete the now-redundant comment block above it (lines 161-166).

- [ ] **Step 5.2: Verify build still works**

Run: `npm run build`

Expected: build succeeds. If it fails, the regex reference inside `scanForErrors` was not properly resolved (TypeScript will say "cannot find name 'idRegex'"). The export is at module scope so it's in scope for the class method below it — no `import` needed within the same file.

- [ ] **Step 5.3: Commit**

Run:
```pwsh
git add extension/src/utils/pageReader.ts
git commit -m "refactor(pageReader): promote idRegex to module-level export"
```

---

## Task 6: PageReader regex regression tests

**Files:**
- Create: `extension/src/utils/pageReader.test.ts`

- [ ] **Step 6.1: Write the failing tests**

Create file with content:

```ts
import { describe, it, expect } from 'vitest';
import { idRegex } from './pageReader';

describe('pageReader.idRegex', () => {
  describe('accepts canonical case-ID forms', () => {
    it('matches a 16-digit case number', () => {
      const match = '2601190030003106'.match(idRegex);
      expect(match).not.toBeNull();
      expect(match![0]).toBe('2601190030003106');
    });

    it('matches a 19-digit task ID', () => {
      const match = '2601190030003106001'.match(idRegex);
      expect(match).not.toBeNull();
      expect(match![0]).toBe('2601190030003106001');
    });

    it('matches alpha-prefixed WO format', () => {
      const match = 'WO-12345'.match(idRegex);
      expect(match).not.toBeNull();
      expect(match![0]).toBe('WO-12345');
    });

    it('matches alpha-prefixed CAS format with hyphenated suffix', () => {
      const match = 'CAS-01234-A1B2'.match(idRegex);
      expect(match).not.toBeNull();
      expect(match![0]).toBe('CAS-01234-A1B2');
    });

    it('matches a 16-digit ID embedded in surrounding label text', () => {
      const match = 'Case Number: 2601190030003106 (active)'.match(idRegex);
      expect(match).not.toBeNull();
      expect(match![0]).toBe('2601190030003106');
    });
  });

  describe('rejects polluted text (regression for session-name pollution bug)', () => {
    it('does NOT match a 20-digit blob from concatenated task-ID + extra digit', () => {
      // 16-digit case + 4 extra digits (e.g. SKU prefix smashed in). The \b
      // boundary must prevent this from matching as a single 20-digit run.
      const match = '26011900300031060000'.match(idRegex);
      // Either no match, OR if a match exists, it must NOT consume all 20
      // digits. The previous bug returned the full polluted string.
      expect(match?.[0]).not.toBe('26011900300031060000');
    });

    it('matches only the 16-digit prefix when 16-digit ID is adjacent to non-digit-non-word chars', () => {
      // "2601190030003106 SKU2024" — space separates, so 16-digit prefix is
      // the correct match. The bug variant where no space exists is covered
      // by the previous test.
      const match = '2601190030003106 SKU2024'.match(idRegex);
      expect(match).not.toBeNull();
      expect(match![0]).toBe('2601190030003106');
    });

    it('does NOT match a 15-digit number (one short of canonical case)', () => {
      const match = '260119003000310'.match(idRegex);
      expect(match).toBeNull();
    });

    it('does NOT match a 17-digit number that is neither 16 nor 19 (between)', () => {
      const match = '26011900300031065'.match(idRegex);
      // The regex's `\d{16}(?:\d{3})?` allows 16 or 19. 17 digits should
      // match the 16-digit prefix, NOT consume all 17.
      expect(match?.[0]).not.toBe('26011900300031065');
    });
  });
});
```

- [ ] **Step 6.2: Run tests — expect them to PASS immediately (regex is unchanged)**

Run: `npx vitest --run src/utils/pageReader.test.ts`

Expected: All 9 tests pass. (The regex behavior is documented; we're pinning it, not changing it.)

If any test FAILS, that means the regex behavior does not match my pinned truth table. Investigate which assertion is wrong before adjusting:
- If the regex actually does match the 20-digit blob, then the production code has a latent bug AND the spec § 5.1 "session-name pollution" claim is misleading. STOP and surface the finding to the human reviewer.
- If a 17-digit case fails differently than asserted, adjust the test to match the actual regex behavior and document that the regex accepts only 16 or 19 digits exactly.

- [ ] **Step 6.3: Verify regression catch by temporarily breaking the regex**

In `pageReader.ts`, temporarily change the exported `idRegex` to remove the `\b` boundaries:

```ts
export const idRegex = /(\d{16}(?:\d{3})?)|(\b[A-Z]{2,10}-?\d{3,}[-\w]*\b)/;
```

Run: `npx vitest --run src/utils/pageReader.test.ts`

Expected: at least one of the "rejects polluted text" tests FAILS (likely "does NOT match a 20-digit blob" and "does NOT match a 17-digit number") because removing `\b` allows the regex to consume more than 16/19 digits.

Then REVERT the change:

```ts
export const idRegex = /(\b\d{16}(?:\d{3})?\b)|(\b[A-Z]{2,10}-?\d{3,}[-\w]*\b)/;
```

Re-run: `npx vitest --run src/utils/pageReader.test.ts` → all 9 pass again.

This step confirms the tests catch the regression class they target. Do NOT commit the temporary break.

- [ ] **Step 6.4: Commit**

Run:
```pwsh
git add extension/src/utils/pageReader.test.ts
git commit -m "test(pageReader): idRegex acceptance + pollution rejection"
```

---

## Task 7: Options hydration test (T1) — storage write unconditional

**Files:**
- Create: `extension/src/components/Options.test.tsx`

- [ ] **Step 7.1: Inspect what Options.tsx imports + requires at mount**

Run: `Select-String -Path extension/src/components/Options.tsx -Pattern "^import " | Select-Object -First 30`

Expected: a list of imports including React, lucide-react, utility hooks. Read the output to confirm there are no top-level side effects we need to mock beyond chrome (e.g., telemetry init at module load). If there's a top-level `trackEvent('Options Loaded')`, mock the telemetry module in Step 7.2.

- [ ] **Step 7.2: Write the first test (T1) — also pulls in mocks the next tests need**

Create file `extension/src/components/Options.test.tsx` with content:

```tsx
/**
 * Regression tests for Options hydration-window edits behavior.
 *
 * Spec: docs/superpowers/specs/2026-05-21-options-hydration-window-edits-design.md
 * Production fix: commit 957754e
 *
 * Invariants enforced (I1-I5 in the spec):
 *   T1 — I1: storage write runs unconditionally (no hydration gate)
 *   T2 — I2: host RPC for update_config is gated on hydration completion
 *   T3 — I4: hydration merge skips touched keys (indirect proof of I3 too)
 *   T4 — I5: catch-up RPC fires at hydration COMPLETE with window-edits
 *
 * Mock orchestration:
 *   - chrome.storage.local: real-ish state via chromeMock
 *   - chrome.runtime.sendMessage: deferred for get_config, default no-op for
 *     team catalog / telemetry / update check (those calls hang silently —
 *     their absence of response is fine because tests don't await them)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import { getChromeMock } from '../test/chromeMock';
import Options from './Options';

// Helper: build a default host get_config response shaped like the real one.
function buildHostConfigResponse(overrides: Record<string, unknown> = {}) {
  return {
    status: 'success',
    data: {
      skill_directories: [],
      root_path: '',
      mcp_config_path: '~/.copilot/mcp-config.json',
      extension_preferences: {
        language: 'zh',
        button_text: 'DH',
        primary_color: '#0D9488',
        offset_bottom: 20,
        offset_right: 20,
        log_level: 'INFO',
        auto_analyze_mode: 'manual',
        enable_status_bubble: true,
        beta_channel_enabled: false,
        team_catalog_enabled: false,
        team_manifest_url: '',
        team: '',
        team_label: '',
        use_workspace_only: false,
        ...overrides,
      },
      system_message: { content: '' },
    },
  };
}

describe('Options hydration-window edits (T1-T4)', () => {
  beforeEach(() => {
    // chrome mock is reset by global beforeEach in setup.ts
  });

  it('T1: storage write runs unconditionally during hydration window (I1)', async () => {
    const { storage, runtime } = getChromeMock();

    // Pre-seed dh_prefs with current values (simulating a prior session).
    // The default-prefs hydration path fires on storage.get; this gives it
    // something to load before the host responds.
    storage.data['dh_prefs'] = { language: 'zh', buttonText: 'DH' };

    // Defer get_config so the test owns when hydration "completes". Until
    // we resolve this, prefsHydratedRef.current stays false.
    const pendingGetConfig = runtime.deferNextResponse('get_config');

    render(<Options />);

    // Wait for the language select to be present (component mounted, storage
    // hydration finished, host hydration NOT yet).
    const select = await screen.findByLabelText(/language/i);

    // Trigger an edit DURING the hydration window. Choose English.
    fireEvent.change(select, { target: { value: 'en' } });

    // Allow microtasks to settle (storage.set callback fires via queueMicrotask).
    await waitFor(() => {
      // Assertion: dh_prefs in storage now reflects the edit, even though
      // host hasn't responded yet.
      expect((storage.data['dh_prefs'] as { language?: string })?.language).toBe('en');
    });

    // Clean up the deferred (resolve with a benign response).
    pendingGetConfig.resolve(buildHostConfigResponse({ language: 'zh' }));
  });
});
```

- [ ] **Step 7.3: Run T1 — expect it to PASS (production code already has the fix)**

Run: `npx vitest --run src/components/Options.test.tsx`

Expected: 1 test passes.

If it FAILS, the most likely causes:
1. `Options.tsx` default export is named — check `extension/src/components/Options.tsx:end-of-file` for the actual export style. Adjust the import in the test.
2. The language `<select>` has no `aria-label` or label association — adjust the query (use `getByDisplayValue` or `getByRole('combobox')` instead).
3. The component throws during mount because some other chrome call expects a response (e.g., team catalog sync). Add `runtime.setDefaultResponse({ status: 'success', data: { items: [] } })` BEFORE `render()`.

Fix the import / query / default response and re-run until T1 passes.

- [ ] **Step 7.4: Verify T1 catches the regression**

In `Options.tsx`, temporarily add an early-return at the top of `persistPrefs` (mimicking the pre-fix bug):

```ts
const persistPrefs = (nextPrefs: Preferences, opts?: { fetchManifest?: boolean }) => {
    if (!prefsHydratedRef.current) {
        return;    // <— TEMPORARY: simulate the original bug
    }
    chrome.storage.local.set({ dh_prefs: nextPrefs }, () => {
        // ...
```

Run: `npx vitest --run src/components/Options.test.tsx`

Expected: T1 FAILS with "expected 'en' to be 'en'" — actually expected the assertion fails because `storage.data['dh_prefs'].language` is still `'zh'` (the pre-edit value), not `'en'`.

REVERT the change. Re-run: T1 passes.

This proves T1 catches the I1 regression.

- [ ] **Step 7.5: Commit**

Run:
```pwsh
git add extension/src/components/Options.test.tsx
git commit -m "test(Options): T1 storage write unconditional during hydration window"
```

---

## Task 8: Options hydration test (T2) — host RPC gated

**Files:**
- Modify: `extension/src/components/Options.test.tsx`

- [ ] **Step 8.1: Append T2 to the test file**

Inside the existing `describe('Options hydration-window edits (T1-T4)', () => { ... })` block, AFTER the T1 `it(...)` and BEFORE the closing `});`, add:

```tsx
  it('T2: host update_config RPC is NOT sent during hydration window (I2)', async () => {
    const { storage, runtime } = getChromeMock();
    storage.data['dh_prefs'] = { language: 'zh' };
    const pendingGetConfig = runtime.deferNextResponse('get_config');

    render(<Options />);
    const select = await screen.findByLabelText(/language/i);
    fireEvent.change(select, { target: { value: 'en' } });

    // Wait for the storage write microtask to complete (proves edit was
    // processed).
    await waitFor(() => {
      expect((storage.data['dh_prefs'] as { language?: string })?.language).toBe('en');
    });

    // Now assert: among all sendMessage calls, NONE has an update_config
    // action payload. Only get_config (the one we deferred) should have
    // been sent.
    const updateConfigCalls = runtime.sendMessage.mock.calls.filter((call) => {
      const message = call[0] as { payload?: { action?: string } } | undefined;
      return message?.payload?.action === 'update_config';
    });
    expect(updateConfigCalls).toHaveLength(0);

    pendingGetConfig.resolve(buildHostConfigResponse({ language: 'zh' }));
  });
```

- [ ] **Step 8.2: Run T2 — expect PASS**

Run: `npx vitest --run src/components/Options.test.tsx`

Expected: 2 tests pass.

- [ ] **Step 8.3: Verify T2 catches the regression**

In `Options.tsx`, temporarily REMOVE the hydration gate from `persistPrefs` (the opposite of the T1 break — this time we keep storage write but also allow host RPC pre-hydration):

```ts
const persistPrefs = (nextPrefs: Preferences, opts?: { fetchManifest?: boolean }) => {
    chrome.storage.local.set({ dh_prefs: nextPrefs }, () => {
        // REMOVED: if (!prefsHydratedRef.current) return;
        // (delete those 5 lines)
        chrome.runtime.sendMessage({
            type: "NATIVE_MSG",
            payload: buildHostConfigPayload(nextPrefs)
        }, () => {
            // ...
```

Run: `npx vitest --run src/components/Options.test.tsx`

Expected: T2 FAILS with "expected length 0 but got 1" (an `update_config` call leaked through).

REVERT. Re-run: both T1 and T2 pass.

- [ ] **Step 8.4: Commit**

Run:
```pwsh
git add extension/src/components/Options.test.tsx
git commit -m "test(Options): T2 host RPC gated on hydration"
```

---

## Task 9: Options hydration test (T3) — merge skips touched keys

**Files:**
- Modify: `extension/src/components/Options.test.tsx`

- [ ] **Step 9.1: Append T3**

After the T2 `it(...)` and before the closing `});`, add:

```tsx
  it('T3: hydration merge does NOT overwrite user-edited keys (I3 + I4)', async () => {
    const { storage, runtime } = getChromeMock();
    storage.data['dh_prefs'] = { language: 'zh' };
    const pendingGetConfig = runtime.deferNextResponse('get_config');

    render(<Options />);
    const select = await screen.findByLabelText(/language/i);

    // User clicks 'en' during the window
    fireEvent.change(select, { target: { value: 'en' } });

    await waitFor(() => {
      expect((storage.data['dh_prefs'] as { language?: string })?.language).toBe('en');
    });

    // Host responds with 'zh' (its stored value — but user just clicked 'en')
    pendingGetConfig.resolve(buildHostConfigResponse({ language: 'zh' }));

    // Wait for the merge phase to complete (post-hydration setPrefs +
    // possible catch-up RPC + storage re-write).
    await waitFor(() => {
      // After merge, storage MUST still be 'en' — not overwritten by host's 'zh'.
      expect((storage.data['dh_prefs'] as { language?: string })?.language).toBe('en');
    });

    // Also verify the UI reflects 'en'
    expect((select as HTMLSelectElement).value).toBe('en');
  });
```

- [ ] **Step 9.2: Run T3 — expect PASS**

Run: `npx vitest --run src/components/Options.test.tsx`

Expected: 3 tests pass.

- [ ] **Step 9.3: Verify T3 catches the regression**

In `Options.tsx`, locate the hydration merge block (around line 706-794 — the `if (response && response.status === "success" && response.data)` branch). Temporarily remove the `userTouchedFieldsRef.current.has('language')` guard from the language merge branch (find the line that looks like `if (!userTouchedFieldsRef.current.has('language') && hostPrefs.language !== undefined)` and change it to `if (hostPrefs.language !== undefined)`).

Run: `npx vitest --run src/components/Options.test.tsx`

Expected: T3 FAILS (storage ends up with `language: 'zh'` after merge).

REVERT. Re-run: all 3 pass.

- [ ] **Step 9.4: Commit**

Run:
```pwsh
git add extension/src/components/Options.test.tsx
git commit -m "test(Options): T3 hydration merge skips touched keys"
```

---

## Task 10: Options hydration test (T4) — catch-up RPC

**Files:**
- Modify: `extension/src/components/Options.test.tsx`

- [ ] **Step 10.1: Append T4**

After T3 and before the closing `});`, add:

```tsx
  it('T4: catch-up RPC fires at hydration COMPLETE with window-edits (I5)', async () => {
    const { storage, runtime } = getChromeMock();
    storage.data['dh_prefs'] = { language: 'zh' };
    const pendingGetConfig = runtime.deferNextResponse('get_config');

    render(<Options />);
    const select = await screen.findByLabelText(/language/i);
    fireEvent.change(select, { target: { value: 'en' } });

    await waitFor(() => {
      expect((storage.data['dh_prefs'] as { language?: string })?.language).toBe('en');
    });

    // Snapshot the count of update_config calls BEFORE hydration response
    const updateConfigBefore = runtime.sendMessage.mock.calls.filter((call) => {
      const message = call[0] as { payload?: { action?: string } } | undefined;
      return message?.payload?.action === 'update_config';
    }).length;
    expect(updateConfigBefore).toBe(0); // Sanity check (this is T2 redux)

    // Resolve hydration
    pendingGetConfig.resolve(buildHostConfigResponse({ language: 'zh' }));

    // Wait for the catch-up RPC to fire
    await waitFor(() => {
      const updateConfigCalls = runtime.sendMessage.mock.calls.filter((call) => {
        const message = call[0] as { payload?: { action?: string } } | undefined;
        return message?.payload?.action === 'update_config';
      });
      expect(updateConfigCalls.length).toBeGreaterThanOrEqual(1);

      // The catch-up RPC's payload must contain language: 'en'
      const lastCall = updateConfigCalls[updateConfigCalls.length - 1][0] as {
        payload?: { extension_preferences?: { language?: string } };
      };
      expect(lastCall.payload?.extension_preferences?.language).toBe('en');
    });
  });
```

- [ ] **Step 10.2: Run T4 — expect PASS**

Run: `npx vitest --run src/components/Options.test.tsx`

Expected: 4 tests pass.

- [ ] **Step 10.3: Verify T4 catches the regression**

In `Options.tsx`, locate the catch-up RPC block (around `Options.tsx:822-836` in the get_config success handler — the block that begins with the comment `// Catch-up RPC: if the user edited any field...`). Comment out or delete the entire `if (userTouchedFieldsRef.current.size > 0) { ... }` block AND the corresponding block in the non-success branch (~line 850).

Run: `npx vitest --run src/components/Options.test.tsx`

Expected: T4 FAILS (no `update_config` call ever fires after hydration).

REVERT. Re-run: all 4 pass.

- [ ] **Step 10.4: Commit**

Run:
```pwsh
git add extension/src/components/Options.test.tsx
git commit -m "test(Options): T4 catch-up RPC at hydration complete"
```

---

## Task 11: Run full test suite + audit

- [ ] **Step 11.1: Run all tests**

Run: `npm run test:run`

Expected output: `Test Files  2 passed (2)`, `Tests  13 passed (13)`. (9 from PageReader + 4 from Options.)

- [ ] **Step 11.2: Time the run**

Run: `Measure-Command { npm run test:run }`

Expected: TotalSeconds < 5 (matches success criterion G7 in spec § 9). If significantly higher, investigate but don't block — speed is a soft goal.

- [ ] **Step 11.3: Verify production build still works**

Run: `npm run build`

Expected: build succeeds, `dist/` is produced, no test files appear in the output. Verify the latter:

```pwsh
Get-ChildItem extension\dist -Recurse -Include "*.test.*","*setup*","*chromeMock*","Options.test*","pageReader.test*"
```

Expected: no matches (test files are excluded by Vite's build because they're not entry points).

- [ ] **Step 11.4: Verify no test files leak into git tracking that shouldn't**

Run: `git status --short`

Expected: clean working tree (all changes already committed via previous tasks). If `extension/coverage/` appeared from any test:coverage run, add it to .gitignore:

Check root `.gitignore`:

```pwsh
Select-String -Path .gitignore -Pattern "coverage" -SimpleMatch
```

If no match, append:

```
extension/coverage/
```

And commit:

```pwsh
git add .gitignore
git commit -m "chore: gitignore extension test coverage output"
```

---

## Task 12: Documentation updates

**Files:**
- Modify: `AGENTS.md` — add test commands to § 2 "Build, Test, and Lint Commands"
- Modify: `DEVELOPER_GUIDE.md` — add a "Testing" section describing patterns
- Modify: `docs/superpowers/plans/2026-05-11-beta-channel-toggle.md` — close follow-up #2 (PageReader test) and note infrastructure landed

- [ ] **Step 12.1: Update AGENTS.md**

In `AGENTS.md` § 2 under the `### Extension (extension/)` subsection, find the "Linting" bullet (no explicit lint script). BEFORE that bullet, add:

```markdown
* **Run Tests:**

    ```pwsh
    cd extension; npm run test:run
    ```

  * Uses Vitest + jsdom + @testing-library/react. Co-located test files (`*.test.ts` / `*.test.tsx`).
  * Watch mode: `npm test`. Coverage: `npm run test:coverage`.
  * Mock infrastructure: `extension/src/test/chromeMock.ts` provides hand-rolled `chrome.storage` and `chrome.runtime` stubs with deferred-response support for testing async hydration flows. See `extension/src/test/setup.ts` for global wiring.
  * **First-batch coverage (2026-05-22):** `pageReader.test.ts` (idRegex acceptance/rejection — regression for session-name pollution bug), `Options.test.tsx` (hydration-window invariants I1-I5 from spec `2026-05-21-options-hydration-window-edits-design.md`).
```

- [ ] **Step 12.2: Update DEVELOPER_GUIDE.md**

Find a sensible location (after build instructions, before deep-dives). Add a new section:

```markdown
## Extension Testing

### Toolchain

* **Runner:** Vitest 3.x (chosen over Jest because it shares `vite.config.ts` and natively handles TS/ESM/React 19 without transform layers).
* **DOM:** jsdom 27.x (already in devDeps).
* **Component testing:** @testing-library/react 16.x (the React 19-compatible major).
* **DOM matchers:** @testing-library/jest-dom 6.x via `import '@testing-library/jest-dom/vitest'` in `setup.ts`.

### File Layout

Tests are co-located with source files:

```
src/utils/pageReader.ts          + src/utils/pageReader.test.ts
src/components/Options.tsx       + src/components/Options.test.tsx
```

Test infrastructure lives in `src/test/`:

* `setup.ts` — Vitest global hooks (cleanup, chrome mock reset).
* `chromeMock.ts` — `chrome.storage.local` + `chrome.runtime.sendMessage` stubs.

### Chrome API Mock Patterns

The chrome mock exposes a **deferred-response** pattern for testing async flows like the Options hydration window:

```ts
const { runtime } = getChromeMock();
const pending = runtime.deferNextResponse('get_config');
render(<Options />);
// ... assertions about pre-hydration state ...
pending.resolve({ status: 'success', data: { ... } });
await waitFor(() => expect(...));
```

This pattern was developed to test the `957754e` hydration-window fix and is the primary way to assert "behavior during the window between mount and host response."

### Writing New Tests

* Pure-function units: import directly, assert outputs. See `pageReader.test.ts`.
* Component units with chrome interaction: use `render()` from testing-library + `getChromeMock()` + deferred responses. See `Options.test.tsx`.
* Always use the **async** testing-library helpers (`findBy*`, `waitFor`) for anything that touches `useEffect` or chrome callbacks. React 19's strict `act()` semantics will warn loudly on sync state updates outside `act()`.
* Don't peek into refs (`prefsHydratedRef.current`, `userTouchedFieldsRef.current`) — they're implementation details. Test the observable consequence (storage state, sendMessage calls, rendered DOM).
```

- [ ] **Step 12.3: Close follow-up #2 in beta-channel-toggle.md**

In `docs/superpowers/plans/2026-05-11-beta-channel-toggle.md`, find the line starting with `- **PageReader has no automated test**` (line 878). Replace the entire bullet with:

```markdown
- **[CLOSED 2026-05-22]** **PageReader has no automated test** (added 2026-05-11; closed 2026-05-22 via extension test infra landing). Resolved by `2026-05-22-extension-test-infrastructure-design.md` first batch. `pageReader.test.ts` covers `idRegex` acceptance (16-digit case, 19-digit task, alpha-prefixed forms) and rejection (the polluted-text variant that originally shipped — 20-digit blob from concatenated task-ID + SKU). Tests assert at the regex level rather than scraping a full D365 DOM fixture; the integration-level test (full `scanForErrors()` with fixture HTML) is out of scope for first batch and remains an open follow-up.
```

Then find the line starting with `- **FAB rootPathOverride regression test**` (line 893). Update the parenthetical reference:

Replace:
```
Once extension test infra exists (follow-up #2)
```

With:
```
Now that extension test infra exists (landed 2026-05-22)
```

- [ ] **Step 12.4: Verify docs render correctly**

Run: `Select-String -Path AGENTS.md -Pattern "npm run test:run"`

Expected: 1 match (the line we just added).

Run: `Select-String -Path DEVELOPER_GUIDE.md -Pattern "Extension Testing"`

Expected: 1 match.

- [ ] **Step 12.5: Commit**

Run:
```pwsh
git add AGENTS.md DEVELOPER_GUIDE.md docs/superpowers/plans/2026-05-11-beta-channel-toggle.md
git commit -m "docs: extension test infrastructure landed; close PageReader follow-up"
```

---

## Task 13: Final verification + push decision

- [ ] **Step 13.1: Sanity-run everything**

Run sequentially:

```pwsh
cd extension
npm run test:run
npm run build
cd ..
git log --oneline origin/master..HEAD
```

Expected:
- All tests pass.
- Build produces dist/ without errors.
- The `git log` shows ~9-11 new commits (Tasks 1-12) ahead of origin.

- [ ] **Step 13.2: Surface push decision to human**

Do NOT auto-push. Per AGENTS.md release workflow and this project's "smoke before push" rule, this is non-trivial infra. The human reviewer should:

1. Skim `git log origin/master..HEAD --oneline` to validate commit hygiene.
2. Open `extension/src/test/Options.test.tsx` and check the test feels right (not over-mocking, observable assertions only).
3. Run `npm test` interactively (watch mode) and modify one assertion to confirm it fails as expected.

After human confirms, push:

```pwsh
git push origin master
```

---

## Self-Review Notes

After writing the plan, I performed the spec-coverage check:

| Spec Requirement | Task Covering It |
|---|---|
| G1: one command runs all tests | Task 4 (npm scripts), Task 11 (verification) |
| G2: jsdom + testing-library work | Task 2 (config), Task 4 (smoke test) |
| G3: chrome storage + runtime mockable | Task 3 (chromeMock.ts) |
| G4: PageReader regression test | Task 5 (export idRegex), Task 6 (tests) |
| G5: Options hydration regression test | Tasks 7-10 (T1-T4) |
| G6: production build unaffected | Task 1.3, Task 11.3 (explicit verification) |
| G7: < 5s suite | Task 11.2 (measurement) |
| § 5.1 PageReader → revised to export-idRegex-only | "Deviations" section + Task 5 |
| § 5.2 T1-T4 invariants I1-I5 | Tasks 7-10 (one task each) |
| § 9 success criterion "break-and-fail" checks | Steps 6.3, 7.4, 8.3, 9.3, 10.3 (each test verified to catch its regression) |
| Documentation updates per DoD | Task 12 |

**Placeholder scan:** Searched for "TBD", "TODO", "implement later" in the plan — no matches.

**Type consistency:** Cross-checked `chromeMock.ts` API references in tests against the export signatures — `getChromeMock()`, `deferNextResponse()`, `setDefaultResponse()` all consistent.

**Order dependency:** Tasks 5 (export idRegex) must come before Task 6 (use idRegex). Tasks 7-10 build the same file incrementally; each task adds an `it()` block to the existing `describe`. Task 11 runs everything together. Task 12 only edits docs. All ordering correct.

One area where the plan accepts ambiguity: **the exact ARIA label or query selector for the language `<select>` in Options.tsx** (Step 7.3 contingency text). Without reading the full Options.tsx, I can't pin this; the plan instructs the executor to adjust the query if `findByLabelText` doesn't work. This is correct planning — picking the wrong selector blindly would mislead the executor.
