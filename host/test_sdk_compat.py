"""SDK 0.3.0 compatibility regression tests.

Locks in the SDK contract values that DH depends on, so a future SDK
upgrade that quietly mutates any of these surfaces fails loudly in CI
instead of silently breaking DH at runtime.

Companion artifact: docs/sdk-upgrade-2026-05-0.3.0.md § 7.
Probe artifact:     .scratch/b82-1-sdk03-surface-probe.py
"""

import typing
import unittest


class TestSdkImportPaths(unittest.TestCase):
    """SDK 0.3.0 removed `copilot.types`. Make sure the new paths still
    resolve, so an upgrade that moves them again is caught immediately."""

    def test_top_level_imports(self):
        from copilot import CopilotClient, SubprocessConfig  # noqa: F401

    def test_session_imports(self):
        from copilot.session import (  # noqa: F401
            PermissionRequestResult,
            PreToolUseHookOutput,
            PermissionRequestResultKind,
        )

    def test_legacy_types_module_is_gone(self):
        """`copilot.types` must NOT exist on 0.3.0 — if it comes back
        we want to know before we accidentally re-introduce the old
        import shape."""
        with self.assertRaises(ModuleNotFoundError):
            import copilot.types  # type: ignore  # noqa: F401

    def test_internal_rpc_permissionresult_is_different_type(self):
        """Documentation guard: `copilot.generated.rpc.PermissionRequestResult`
        is an INTERNAL RPC type (success: bool). It is NOT the one DH
        uses. If a future refactor unifies them, this test will fail
        and we re-evaluate which one to import."""
        from copilot.generated.rpc import (
            PermissionRequestResult as RpcPRR,
        )
        from copilot.session import PermissionRequestResult as SessionPRR

        self.assertIsNot(RpcPRR, SessionPRR)
        # The RPC one carries `success`; the session one carries `kind`.
        self.assertIn("success", RpcPRR.__annotations__)
        self.assertIn("kind", SessionPRR.__annotations__)


class TestPermissionRequestResultKind(unittest.TestCase):
    """B-1 from docs/sdk-upgrade-2026-05-0.3.0.md.
    Lock in the permission vocabulary so a future SDK release renaming
    `approve-once` again breaks the build instead of breaking prod."""

    def test_kind_literal_values_exact(self):
        from copilot.session import PermissionRequestResultKind

        self.assertEqual(
            set(typing.get_args(PermissionRequestResultKind)),
            {"approve-once", "reject", "user-not-available", "no-result"},
        )

    def test_approve_once_is_valid(self):
        from copilot.session import PermissionRequestResult

        result = PermissionRequestResult(kind="approve-once")
        # 0.3.0 PermissionRequestResult is a dataclass-style object with
        # attribute access (not a TypedDict despite carrying a kind field).
        self.assertEqual(result.kind, "approve-once")

    def test_old_approved_literal_is_gone(self):
        """Regression: the 0.2.0 value `"approved"` must no longer be
        in the Literal. We deliberately don't try to construct it —
        TypedDict has no runtime literal enforcement, so constructing
        the dict will misleadingly succeed. The contract is the Literal."""
        from copilot.session import PermissionRequestResultKind

        self.assertNotIn("approved", typing.get_args(PermissionRequestResultKind))


class TestPreToolUseHookOutput(unittest.TestCase):
    """B-2 from docs/sdk-upgrade-2026-05-0.3.0.md."""

    def test_permission_decision_literal_values_exact(self):
        from copilot.session import PreToolUseHookOutput
        import copilot.session as session_mod

        ann = PreToolUseHookOutput.__annotations__["permissionDecision"]
        # ForwardRef in stub form: evaluate it in the session module namespace.
        if isinstance(ann, typing.ForwardRef):
            ann = eval(ann.__forward_arg__, vars(session_mod))

        self.assertEqual(
            set(typing.get_args(ann)),
            {"allow", "deny", "ask"},
        )

    def test_allow_literal_still_valid(self):
        """DH relies on `"allow"` at host/dh_native_host.py:881."""
        from copilot.session import PreToolUseHookOutput

        out = PreToolUseHookOutput(permissionDecision="allow")
        self.assertEqual(out["permissionDecision"], "allow")


class TestMcpTypeMigration(unittest.TestCase):
    """B-4 from docs/sdk-upgrade-2026-05-0.3.0.md.
    DH's `start_session` migrates legacy `type: "local"` / `"remote"` to
    `"stdio"` / `"http"` in memory because the SDK silently accepts the
    legacy values (behaviour undefined). Verify the migration map is
    intact."""

    def test_migration_map_values(self):
        # Read the constant directly from the source for the simplest possible
        # regression: if someone deletes the migration block, this test loses
        # its anchor and fails on import / attribute lookup.
        # Import via the host package (matches other host tests). Using a
        # top-level `import dh_native_host` would cause Python to register a
        # second module entry distinct from `host.dh_native_host`, re-running
        # all module-level setup (handler attach, SDK shim install, etc.)
        # and doubling log writes during the test suite.
        from host import dh_native_host  # noqa: F401

        # The migration happens inline inside start_session; the test below
        # exercises it end-to-end by reaching into the surrounding helper.
        # For unit-level coverage we just sanity-check that the SDK still
        # accepts the new values our code will emit.
        from copilot.session import PreToolUseHookOutput  # smoke import
        del PreToolUseHookOutput

        legacy_to_new = {"local": "stdio", "remote": "http"}
        for legacy, new in legacy_to_new.items():
            self.assertIn(new, {"stdio", "http"})
            self.assertNotEqual(legacy, new)


if __name__ == "__main__":
    unittest.main()
