# v2.0.73-beta.2

Single focused change on top of beta.1: **Copilot session IDs are now deterministic UUIDs**, shared byte-for-byte with MyCasesKit. Everything from beta.1 (SDK 1.0.5 upgrade + i18n fix) is included.

## 🔧 Session ID → deterministic UUID v5

Since v2.0.72, DH named each Copilot session `dhco-<case>` (21 chars) — a custom string forced to that length by Microsoft Entra AAD, which consumes the session ID as its OAuth `client_session` parameter (20–50 chars required). That fixed the immediate `AADSTS901001` error, but left a structural risk: **a custom-format name is exposed to whatever validation any future layer imposes** (MCP OAuth, new CLI versions, other AAD-protected tools). AAD was the first such constraint; nothing guaranteed it was the last.

This release removes that entire class of risk by deriving the session ID as a **deterministic UUID v5** from the case number:

```
uuid5(NAMESPACE_MYCASE, "<bare-case-number>")
NAMESPACE_MYCASE = 816bee4e-8eee-4c0b-ae69-70879d032f4d
```

**Why this is strictly better:**

- **Future-proof.** A 36-char hex UUID is the format every validation layer is built and tested against. It's always AAD-legal regardless of case-number length — the length is fixed at 36, no longer coupled to the case number.
- **Still deterministic → resume still works.** UUID v5 hashes (namespace, name), so the same case always produces the same ID. DH re-derives it on any device with no stored map; `resume_session` finds the existing session exactly as before.
- **Cross-repo synced.** MyCasesKit computes the *identical* value independently from the same namespace + bare case number. The two repos agree with zero handshake. Verified byte-for-byte: case `2601190030003106` → `ce0ec286-26e6-5095-8b30-46143e9f437f` in both.

**What you'll notice:** the resume command in `dh_case_report.md` now reads `copilot --resume <uuid>` instead of `copilot --resume dhco-<case>`. The case number is still human-readable in the report and in MyCasesKit's `context.md` `case_number:` field — the UUID is just the resume handle.

**Trade-off:** you can no longer type the resume command from memory (a UUID isn't memorable). Copy it from the report, which you open to read the analysis anyway.

## Included from beta.1

- **Copilot SDK 0.3.0 → 1.0.5** (RuntimeConnection, typed permission approval, PingResponse shim deleted, infinite-sessions adopted with observability).
- **i18n fix**: "You are up to date!" now shows in Chinese.

## Installation

1. Download `DynamicsHelper_v2.0.73-beta.2.zip` below
2. Unzip
3. Run `install.bat` (Windows; admin not required, installs to `%LOCALAPPDATA%`)
4. Reload the extension in `chrome://extensions`. Existing D365 tabs need F5.

## Upgrading from v2.0.73-beta.1 (or v2.0.72)

Zero migration. Existing `dhco-<case>` sessions simply stop being re-derived — they orphan harmlessly (analysis reports and case data persist independently of the session). The next analyze on a case creates its UUID-named session. MyCasesKit's `context.md` migration forward-upgrades legacy `dhco-` values, so DH and MyCasesKit can land independently — no lockstep deploy.

## Known issues / follow-ups

- **Frozen-build analyze**: validated on beta.1's packaged build; this beta's only delta is the session-ID string, exercised by the same path.
- **SDK 1.0.5 new capabilities deferred** (`on_mcp_auth_request`, etc. — spec § 8).
- **Team folder collapse state still ephemeral** (B1, carried).
