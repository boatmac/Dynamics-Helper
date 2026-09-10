# SDK 1.0.13 Upgrade Record

## Scope

This record contains the version-specific adaptation and verification for SDK
1.0.13. The reusable procedure and execution boundaries are maintained separately
in [SDK upgrade workflow](sdk-upgrade-workflow.md). Historical 1.0.5 and initial
1.0.13 assessments remain evidence, not instructions to rerun old temporary scripts.

The 1.0.13 source change retains the existing thirteen transitive dependency pins.
Use the existing external CLI via `RuntimeConnection.for_stdio(path=...)`; the
SDK release's runtime baseline 1.0.83 is not a promised minimum for all external
CLI features. A protocol handshake alone cannot establish field-level compatibility.

## Product Adapter

`host/sdk_client.py` exports DH's `CopilotClient` subclass and permission handler.
It narrowly adapts SDK 1.0.13's private `_apply_post_create_options_patch`:

- Check the result of the first actual `session.options.update` RPC. Only literal
  `success is True` confirms the patch. No second confirmation RPC is sent.
- Keep SDK parameter construction, session unregistration and disconnect cleanup.
  Temporarily wrap only the current session's methods, restoring them in finally.
- Negative/malformed acknowledgment and RPC exceptions become the fixed
  `SessionOptionsPatchError`, never a transport retry or resume-to-create fallback.
- Host invalidates active session/client and prompt fingerprint before attempting
  client stop. Cleanup failures are explicitly unconfirmed. Cancellation clears
  Host availability and propagates; it is not converted into successful cleanup.
- Disconnect/stop use ten-second cooperative asyncio cancellation budgets. This
  is not an OS deadline, sandbox or proof that an unresponsive process has exited.

Ordinary permission requests with `managed_approval_required` exactly False/None
return approve-once. True, invalid or unreadable fields return user-not-available;
the headless host must not wait for another approval client. The unconditional
pre-tool allow hook is removed. All session paths retain the permission handler.

Remove the private adapter only after an upstream release confirms first-patch
negative acknowledgments fail and the focused regressions pass without it. Do not
paper over a private API change with an extra RPC or unconditional tool approval.

## Verification Record

Final result: the separately authorized one-turn synthetic live check passed
9/9 against SDK 1.0.13 and CLI 1.0.83 (protocol 3). Process and session auth,
create/first options ACK, one response matching OK, disconnect, persisted-session
resume/options ACK and resumed auth all passed. No tools or case content were
used. The owned session was deleted, CLI exited normally, and source/dependency/
CLI byte identity was retained. This qualifies that bounded live scenario, not
all models/tools, frozen runtime execution or installed-product behavior.

The chronology below preserves earlier failures and limitations; they are not
reclassified as successful by the final result.

The final 25-case SDK 1.0.13 offline run passed with zero failures/errors/skips,
using real SDK session/options/permission/auth/model/event serializers. It retained
source and dependency identity and reported successful process cleanup. Entry
rejection/guard assertions passed in the same fixed selection. The local frozen
Host build also passed using PyInstaller 6.22.2; its EXE was not executed and no
installed product was replaced. Exact evidence and artifact identity are recorded
in the current task handoff. A subsequent authorized no-turn live probe completed
startup/handshake and status/auth RPCs against CLI 1.0.83, protocol 3. Authentication
returned false in two separately approved probes, first isolated and then with
existing CLI profiles. Both incorrectly passed `--no-auto-login`, which disables
automatic stored/gh credential use; these are not evidence of missing user login.
Both stopped without session creation or model calls and their owned CLIs exited
normally. Authenticated create/resume compatibility remains unverified; this is
not a complete live PASS. A third authorized attempt removed the flag and used
existing profiles, but still returned auth=false and stopped normally at 3/6.
That attempt's restricted PATH excluded installed gh.exe. After the user confirmed
ordinary terminal Copilot works, the probe was corrected to preserve the launching
PATH for CLI in existing-profile mode only. One corrected-PATH attempt timed out
during incomplete evidence finalization, so its auth outcome is unknown. After
immediate runtime result recording and sufficient hash-verification time were
added, the next run again returned auth=false immediately, with clean CLI exit
and unchanged source/dependency bytes. A filtered gh check confirmed an active
successful keyring account. Headless authentication behavior remains unresolved;
no authenticated session/model operation occurred. Do not infer invalid user
credentials, a required warm-up turn or SDK incompatibility from these results.

Later targeted verification resolved authentication by preserving ordinary Windows
environment metadata in the CLI child, in addition to the existing profile/PATH.
Both process and session auth returned true; synthetic create, first options ACK
and disconnect passed. No individual environment variable was isolated as causal.
Resume failed with RPC -32603 and missing session-event-file diagnostics: the owned
session directory existed but events.jsonl did not. This is observed no-turn
persistence behavior, not proof of failure for sessions with conversation history.

The owned session was deleted and CLI exited 0. The supervisor timed out during
post-run hashing after runtime results were saved. A separate read-only comparison
then confirmed all 4,847 recorded unique files and the site file set unchanged;
no recorded process/direct child or owned session directory remained. Preserve
the timeout and partial live result: successful populated-session resume and model
operation were unverified at that point. Neither fabricated history nor a model
turn was part of that no-turn scope. The later one-turn approval and successful
result above closed the populated-session verification gap.

The original 27-case assessment remains 25 PASS / 2 FAIL. The new tests explicitly
cover options negative acknowledgment and managed denial. The historical stop
fixture had no actual reader thread/owned process; the new fixture cancels and
awaits its own outstanding task and does not claim production stop semantics.

## Official References

- [SDK release](https://github.com/github/copilot-sdk/releases/tag/v1.0.13)
- [Python client patch boundary](https://github.com/github/copilot-sdk/blob/v1.0.13/python/copilot/client.py#L4755-L4814)
- [Python permission reference](https://github.com/github/copilot-sdk/blob/v1.0.13/python/README.md#L847-L907)
- [External CLI setup](https://github.com/github/copilot-sdk/blob/v1.0.13/docs/setup/local-cli.md)
- [Initial DH assessment](sdk-1.0.13-upgrade-assessment.md)
- [Test execution safety](test-safety.md)
