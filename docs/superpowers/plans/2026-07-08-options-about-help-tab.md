# Options "About & Help" Tab — Implementation Plan

> **Execution note:** No workflow plugin is required. Execute only currently authorized scope in bounded steps, with observable progress and scope-appropriate verification. Historical checkboxes do not authorize work; read `AGENTS.md` and the current handoff first.

**Goal:** Add a read-only 7th Options sidebar tab, "About & Help", surfacing version/update, external links (User Guide / GitHub releases / report a bug), a copyable log-path helper, brief troubleshooting, and a privacy line.

**Architecture:** Pure frontend addition to `extension/src/components/Options.tsx`. Extend the `SectionId` union, add one nav entry, and add one gated content block. Reuse existing handlers (`handleCheckUpdates`, `handleUpdate`) and the `showSuccess` toast. All strings via `t()` with new keys in `translations.ts`. No prefs, no persistence, no host RPC — the hydration guard and the 6-invariant test model are untouched.

**Tech Stack:** React 19 + TypeScript, Tailwind, lucide-react icons, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-07-08-options-about-help-tab-design.md` (scope B).

---

### Task 1: Add i18n keys

**Files:**
- Modify: `extension/src/utils/translations.ts` (after the `menuEditor:` entry)

- [ ] **Step 1: Add the new translation keys**

Find the line:

```ts
    menuEditor: { en: "Bookmark Manager", zh: "书签管理器" },
```

Insert immediately AFTER it:

```ts
    // About & Help tab (spec 2026-07-08-options-about-help-tab)
    aboutHelp: { en: "About & Help", zh: "关于与帮助" },
    aboutTagline: { en: "AI-assisted case analysis for Dynamics 365 support.", zh: "面向 Dynamics 365 支持的 AI 辅助案例分析。" },
    checkForUpdates: { en: "Check for Updates", zh: "检查更新" },
    openUserGuide: { en: "User Guide", zh: "用户指南" },
    viewOnGitHub: { en: "GitHub & Releases", zh: "GitHub 与发布" },
    reportABug: { en: "Report a Bug", zh: "报告问题" },
    helpTroubleshooting: { en: "Help & Troubleshooting", zh: "帮助与排查" },
    issueTimeout: { en: "Analysis timed out? Increase the budget under General → Analyze Timeout.", zh: "分析超时?到 通用 → 分析超时 调大预算。" },
    issueDisconnected: { en: "\"Native host disconnected\"? Restart the browser, or reinstall if it persists.", zh: "出现「本机宿主已断开」?重启浏览器,若仍然如此请重新安装。" },
    collectLogs: { en: "Collect logs for support", zh: "为支持收集日志" },
    collectLogsDesc: { en: "Open this folder and attach native_host.log to your report:", zh: "打开此文件夹,将 native_host.log 附到你的反馈:" },
    copyPath: { en: "Copy path", zh: "复制路径" },
    copied: { en: "Copied!", zh: "已复制!" },
    privacyNote: { en: "Your data is PII-scrubbed locally before it is analyzed.", zh: "你的数据在本地经 PII 脱敏后才会被分析。" },
```

- [ ] **Step 2: Verify build**

Run: `npm run build` (in `extension/`)
Expected: build succeeds (no TS errors).

- [ ] **Step 3: Commit**

```bash
git add extension/src/utils/translations.ts
git commit -m "feat(options): add i18n keys for About & Help tab"
```

---

### Task 2: Register the `about` section (type + nav + empty block)

**Files:**
- Modify: `extension/src/components/Options.tsx` — `SectionId` (L641), nav array (~L1892), content-pane insertion point (~L2648)

- [ ] **Step 1: Extend the SectionId union**

Find:

```ts
type SectionId = 'general' | 'appearance' | 'copilot' | 'model' | 'team' | 'bookmarks';
```

Replace with:

```ts
type SectionId = 'general' | 'appearance' | 'copilot' | 'model' | 'team' | 'bookmarks' | 'about';
```

- [ ] **Step 2: Add the nav entry (separator + About)**

Find:

```tsx
                                ['team', <Building2 size={16} />, t('teamCatalog')],
                                ['bookmarks', <Folder size={16} />, t('menuEditor')],
                            ] as [string, React.ReactNode, string][]).map(([id, icon, label]) => id === '__sep__'
```

Replace with:

```tsx
                                ['team', <Building2 size={16} />, t('teamCatalog')],
                                ['bookmarks', <Folder size={16} />, t('menuEditor')],
                                ['__sep__', null, ''],
                                ['about', <Info size={16} />, t('aboutHelp')],
                            ] as [string, React.ReactNode, string][]).map(([id, icon, label]) => id === '__sep__'
```

- [ ] **Step 3: Add an empty gated block at the insertion point**

Find (end of the bookmarks block, before the content-pane close):

```tsx
                        )}

                        </div>{/* content pane */}
```

Replace with:

```tsx
                        )}

                        {activeSection === 'about' && (
                        <div>{/* About & Help — content added in Task 3 */}</div>
                        )}

                        </div>{/* content pane */}
```

- [ ] **Step 4: Add the `Info` icon import**

Find:

```tsx
    Pencil,
    Sparkles
} from 'lucide-react';
```

Replace with:

```tsx
    Pencil,
    Sparkles,
    Info,
    BookOpen,
    Github,
    Bug,
    Copy,
    Shield
} from 'lucide-react';
```

(All six new icons are added now so Task 3 needs no import edit.)

- [ ] **Step 5: Verify build + existing tests**

Run: `npm run build && npm run test:run` (in `extension/`)
Expected: build succeeds; **42 tests pass** (nav change is section-agnostic; `findLanguageSelect` still clicks `data-section="appearance"`).

- [ ] **Step 6: Commit**

```bash
git add extension/src/components/Options.tsx
git commit -m "feat(options): register About & Help section (type + nav + icons)"
```

---

### Task 3: About & Help content (TDD)

**Files:**
- Test: `extension/src/components/Options.test.tsx` (append new describe block)
- Modify: `extension/src/components/Options.tsx` — add `handleCopyLogPath` handler + fill the About block

- [ ] **Step 1: Write the failing test**

Append to `extension/src/components/Options.test.tsx`:

```tsx
// ---------- About & Help tab (spec 2026-07-08) ----------

describe('Options About & Help tab', () => {
  beforeEach(() => {
    resetChromeMock()
    installChromeMock()
  })

  it('shows the extension version and a User Guide link when the About tab is active', async () => {
    // Hydration is irrelevant to this tab — defer get_config and never resolve.
    deferNextResponse('get_config')
    render(<Options />)

    const aboutNav = await waitFor(() => {
      const el = document.querySelector('[data-section="about"]') as HTMLButtonElement | null
      if (!el) throw new Error('about nav not yet rendered')
      return el
    })
    fireEvent.click(aboutNav)

    // getExtensionVersion is mocked to '2.0.70-beta.5-test' (top of file).
    await waitFor(() => {
      if (!document.body.textContent?.includes('2.0.70-beta.5-test')) {
        throw new Error('extension version not shown in About tab')
      }
    })

    const guideLink = document.querySelector(
      'a[href="https://github.com/boatmac/Dynamics-Helper/blob/master/USER_GUIDE.md"]',
    ) as HTMLAnchorElement | null
    expect(guideLink).not.toBeNull()
    expect(guideLink!.target).toBe('_blank')
    expect(guideLink!.rel).toContain('noopener')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- Options.test.tsx` (in `extension/`)
Expected: FAIL — the new test errors on "extension version not shown in About tab" (the About block is still the empty stub) or the guide link is null.

- [ ] **Step 3: Add the `handleCopyLogPath` handler**

Find the update handler (near `const handleCheckUpdates = () => {`):

```tsx
    const handleCheckUpdates = () => {
```

Insert ABOVE it:

```tsx
    // About & Help: copy the log folder path (Explorer expands %LOCALAPPDATA%).
    const handleCopyLogPath = () => {
        navigator.clipboard?.writeText('%LOCALAPPDATA%\\DynamicsHelper')
            .then(() => showSuccess(t('copied')))
            .catch(() => {/* clipboard blocked; no-op */});
    };

```

- [ ] **Step 4: Fill the About block**

Find the stub added in Task 2:

```tsx
                        {activeSection === 'about' && (
                        <div>{/* About & Help — content added in Task 3 */}</div>
                        )}
```

Replace with:

```tsx
                        {activeSection === 'about' && (
                        <div>
                            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Info size={14} /> {t('aboutHelp')}
                            </h2>

                            {/* About / version */}
                            <div className="mb-6">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
                                        {prefs.buttonText.slice(0, 2)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">{t('appName')}</p>
                                        <p className="text-xs text-slate-500">{t('aboutTagline')}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-slate-500">
                                    <span>Extension v{getExtensionVersion()}</span>
                                    {hostVersion && <span>• {t('hostVersion')} v{hostVersion}</span>}
                                </div>
                                <div className="flex items-center gap-2 mt-3">
                                    <button
                                        onClick={handleCheckUpdates}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-lg border border-slate-200 transition-colors shadow-sm"
                                    >
                                        <RefreshCw size={12} /> {t('checkForUpdates')}
                                    </button>
                                    {updateAvailable && (
                                        <button
                                            onClick={handleUpdate}
                                            disabled={isUpdating}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-medium transition-colors"
                                        >
                                            {isUpdating ? <RotateCcw size={12} className="animate-spin" /> : <Download size={12} />}
                                            {isUpdating ? t('updating') : t('updateNow')}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Links */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6">
                                <a href="https://github.com/boatmac/Dynamics-Helper/blob/master/USER_GUIDE.md" target="_blank" rel="noopener noreferrer"
                                   className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg border border-slate-200 transition-colors shadow-sm">
                                    <BookOpen size={14} className="text-teal-600" /> {t('openUserGuide')}
                                </a>
                                <a href="https://github.com/boatmac/Dynamics-Helper/releases" target="_blank" rel="noopener noreferrer"
                                   className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg border border-slate-200 transition-colors shadow-sm">
                                    <Github size={14} className="text-teal-600" /> {t('viewOnGitHub')}
                                </a>
                                <a href="https://github.com/boatmac/Dynamics-Helper/issues/new" target="_blank" rel="noopener noreferrer"
                                   className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg border border-slate-200 transition-colors shadow-sm">
                                    <Bug size={14} className="text-teal-600" /> {t('reportABug')}
                                </a>
                            </div>

                            {/* Help & Troubleshooting */}
                            <div className="mb-6">
                                <h3 className="text-xs font-bold text-slate-700 mb-2">{t('helpTroubleshooting')}</h3>
                                <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 mb-3">
                                    <li>{t('issueTimeout')}</li>
                                    <li>{t('issueDisconnected')}</li>
                                </ul>
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                                    <p className="text-xs font-semibold text-slate-700 mb-1">{t('collectLogs')}</p>
                                    <p className="text-[10px] text-slate-500 mb-2">{t('collectLogsDesc')}</p>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 text-xs font-mono bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 truncate">%LOCALAPPDATA%\DynamicsHelper</code>
                                        <button
                                            onClick={handleCopyLogPath}
                                            className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-lg border border-slate-200 transition-colors shrink-0"
                                        >
                                            <Copy size={12} /> {t('copyPath')}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Privacy */}
                            <p className="text-[10px] text-slate-500 flex items-start gap-1.5">
                                <Shield size={12} className="text-slate-400 mt-px shrink-0" />
                                <span>{t('privacyNote')}{' '}
                                    <a href="https://github.com/boatmac/Dynamics-Helper/blob/master/USER_GUIDE.md#security--privacy" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">Security &amp; Privacy</a>
                                </span>
                            </p>
                        </div>
                        )}
```

- [ ] **Step 5: Run the new test to verify it passes**

Run: `npm run test:run -- Options.test.tsx` (in `extension/`)
Expected: PASS — About tab renders `Extension v2.0.70-beta.5-test` and the User Guide anchor.

- [ ] **Step 6: Run the full suite + build**

Run: `npm run test:run && npm run build` (in `extension/`)
Expected: **43 tests pass** (was 42 + 1 new); build succeeds.

- [ ] **Step 7: Commit**

```bash
git add extension/src/components/Options.tsx extension/src/components/Options.test.tsx
git commit -m "feat(options): About & Help tab content + render test"
```

---

### Task 4: Docs — extend the Options tab list (6 → 7)

**Files:**
- Modify: `USER_GUIDE.md` ("The Options Page" tab list)

- [ ] **Step 1: Add the About & Help bullet**

Find:

```markdown
* **Bookmark Manager** — your personal bookmark menu editor.
```

Replace with:

```markdown
* **Bookmark Manager** — your personal bookmark menu editor.
* **About & Help** — version info, links (User Guide, GitHub, report a bug), a log-collection helper, and troubleshooting tips.
```

- [ ] **Step 2: Commit**

```bash
git add USER_GUIDE.md
git commit -m "docs(user-guide): add About & Help to the Options tab list"
```

---

## Self-Review

**Spec coverage:**
- Nav entry (§4.1) → Task 2 Steps 1-2. ✓
- About/version/update block (§4.2.1) → Task 3 Step 4. ✓
- Links (§4.2.2) → Task 3 Step 4 (three anchors, exact URLs). ✓
- Help/troubleshooting + copyable log path (§4.2.3) → Task 3 Steps 3-4. ✓
- Privacy line (§4.2.4) → Task 3 Step 4. ✓
- No persistence (§4.3) → confirmed: no prefs/storage/RPC touched. ✓
- i18n reuse + new keys (§4.4) → Task 1 (new) + Task 3 reuses `hostVersion`/`updateAvailable`/`updateNow`/`updating`. ✓
- Testing (§5) → Task 3 additive test; 42→43. ✓
- Docs (§6) → Task 4. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code. ✓

**Type consistency:** `SectionId` gains `'about'` (Task 2) and is the only type change; `handleCopyLogPath`, `handleCheckUpdates`, `handleUpdate`, `showSuccess`, `getExtensionVersion`, `hostVersion`, `updateAvailable`, `isUpdating` all pre-exist or are defined before use. Icons `Info/BookOpen/Github/Bug/Copy/Shield` imported in Task 2 Step 4 before Task 3 uses them. ✓
