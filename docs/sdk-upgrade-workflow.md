# SDK Upgrade Workflow

## Scope

SDK upgrades reuse a fixed offline contract entry, not a fresh test framework or
one-time testing exemption. Source pinning, offline checks, frozen builds, live
CLI checks and installed product qualification are distinct results. Maintain the
current contracts and workarounds in [SDK integration](sdk-integration.md), and
current limitations and planned work in [TODO.md](../TODO.md).

## Upgrade Steps

1. Review the target SDK's official release/API changes against DH's actual calls.
   Establish the target version and compatibility questions for the approved work.
   A bundled runtime baseline is not necessarily an external CLI minimum, and a
   protocol handshake alone does not prove field-level compatibility.
2. Approve dependency alignment, acquire the pinned distribution from the intended
   source and verify its digest. Package RECORD hashes prove consistency, not
   publisher authenticity; retain source/digest evidence separately. Do not update
   unrelated dependencies or introduce additional product features implicitly.
3. Review `host/test_sdk_compat.py`, the adapter, Host integration and fixed runner.
   Bind complete raw source bytes, explicit unittest IDs and the complete allowed
   distribution-version set in `tests/sdk-test-review.json`. Do not mechanically
   refresh hashes before reviewing changed inputs. Check existing workarounds
   against upstream fixes and remove them only with regression evidence.
4. Run the fixed offline entry with actual base Python `-I -B -S`, not a venv
   redirector. The runner checks canonical venv dependencies without executing
   `.pth`, rejects changed/missing payloads, and snapshots actual installed bytes.
5. Require successful test completion, no runner cleanup/capture error and unchanged
   dependency/source bytes. Inspect `sdk-result.json` as well as `result.json`.
6. Only then run an approved frozen build. A separately scoped live CLI check may
   validate auth/handshake/create/resume; model calls and actual installation need
   their own applicable scope. Neither is implied by an offline PASS.
7. Record exact source/artifact identity, SDK/dependency/CLI versions, test selection,
   results and remaining limitations in the verification evidence. Update the
   current integration contract; keep installed state separate from local results.

## Execution Entry

Use `scripts/run_sdk_tests.py` from the repository root with the reviewed base
interpreter. Pass `--temp-base` with an existing approved evidence directory
outside the repository and `--timeout` with the agreed worker budget. Do not use
a checkout subdirectory for profiles or evidence. Choose the interpreter path
for the machine; do not assume a specific Python installation version or user directory.

Dependency-only verification uses the same entry with `--check-dependencies`,
without `--temp-base`; it does not import SDK or execute tests. Fixed selections
and source hashes live in the review file; the entry accepts no arbitrary test
module or shell command. A reviewed test-count change updates both the fixed
entry and review selection, not an unbounded discovery flag.

## Verification Boundary

The entry reuses `run_safe_tests.py`'s worker result/progress and supervisor rather
than altering its named-profile scanner. The offline entry is explicitly NOT a
Python scanner PASS. Its worker has fresh existing profile directories, finite
runtime/output budgets and cumulative N/total results. Before SDK imports, it
prepares standard-library asyncio loops and installs process/network/registry/
native-runtime guards; dateutil receives only fixed synthetic registry handles.
Real SDK parsing/serialization runs against in-memory transport responses.

Third-party Python and native modules remain a declared trust boundary; Python
guards cannot confine arbitrary native code. Installed distributions (including
build-tool extras) must match the reviewed version set and are verified against
RECORD and before/after raw snapshots. Cache bytecode is never used as test code;
absent unhashed cache files are allowed, while missing hashed payloads are not.
Host branch wiring inspected via AST is static evidence, not Host runtime testing.

For live checks, distinguish authentication environment parity from SDK defects.
Use the approved existing authentication context without exporting credentials;
preserve ordinary OS environment inputs needed by credential helpers. Record
process and session authentication separately from session creation success.
A no-turn session may lack persisted event history: do not fabricate that history
or treat a missing transcript as proof that populated-session resume is broken.
A minimal model turn needs applicable approval, an explicit send limit and no
automatic resend. Capture only safe response metadata, then remove only the owned
synthetic session. Persist runtime and cleanup results before lengthy post-run
integrity checks, so a verification timeout cannot erase the actual outcome.

Offline success does not authorize CLI/model execution, installation, commit,
push or publication. Reuse the workflow within an approved upgrade scope; seek
additional agreement for new effects, not for each routine in-scope command.

## References

- [SDK releases](https://github.com/github/copilot-sdk/releases)
- [SDK documentation](https://github.com/github/copilot-sdk/tree/main/docs)
- [Test execution safety](test-safety.md)
- Fixed execution entry: `scripts/run_sdk_tests.py`
- Reviewed inputs and test selection: `tests/sdk-test-review.json`
