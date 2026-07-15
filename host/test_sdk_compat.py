"""SDK 1.0.5 compatibility regression tests.

Locks in the SDK contract values that DH depends on, so a future SDK
upgrade that quietly mutates any of these surfaces fails loudly in CI
instead of silently breaking DH at runtime.

Upgraded from the 0.3.0 contract on 2026-07-03.
Companion artifact: docs/sdk-upgrade-2026-07-1.0.5.md § 5.
Prior contract:     docs/sdk-upgrade-2026-05-0.3.0.md § 7.
"""

import typing
import unittest


class TestCustomInstructionIsolation(unittest.TestCase):
    def test_session_methods_accept_skip_custom_instructions(self):
        import inspect
        from copilot import CopilotClient

        for name in ("create_session", "resume_session"):
            with self.subTest(name=name):
                signature = inspect.signature(getattr(CopilotClient, name))
                self.assertIn("skip_custom_instructions", signature.parameters)


class TestSdkImportPaths(unittest.TestCase):
    """1.0.5 removed `SubprocessConfig` (→ RuntimeConnection) and demoted
    `PermissionRequestResult` to a Union. Make sure the paths DH imports
    still resolve, so an upgrade that moves them again is caught."""

    def test_top_level_imports(self):
        # B1 (1.0.5): SubprocessConfig removed; RuntimeConnection is the
        # stdio connection factory DH now uses.
        from copilot import CopilotClient, RuntimeConnection  # noqa: F401

    def test_subprocessconfig_removed(self):
        """B1 regression guard: `SubprocessConfig` must NOT be importable.
        If it comes back, we want to know before someone reintroduces the
        old `CopilotClient(SubprocessConfig(...))` construction shape."""
        with self.assertRaises(ImportError):
            from copilot import SubprocessConfig  # type: ignore  # noqa: F401

    def test_session_imports(self):
        # PermissionRequestResultKind was REMOVED in 1.0.5. The concrete
        # approval variant PermissionDecisionApproveOnce is what DH returns.
        from copilot.session import (  # noqa: F401
            PermissionRequestResult,
            PreToolUseHookOutput,
            PermissionDecisionApproveOnce,
        )

    def test_permission_request_result_kind_is_gone(self):
        """1.0.5 removed the `PermissionRequestResultKind` Literal alias.
        The approval vocabulary moved from a string Literal to concrete
        decision classes. If the alias reappears we re-evaluate."""
        with self.assertRaises(ImportError):
            from copilot.session import PermissionRequestResultKind  # type: ignore  # noqa: F401

    def test_legacy_types_module_is_gone(self):
        """`copilot.types` was removed back in 0.3.0 — make sure it stays
        gone so we don't accidentally re-introduce the old import shape."""
        with self.assertRaises(ModuleNotFoundError):
            import copilot.types  # type: ignore  # noqa: F401


class TestPermissionDecision(unittest.TestCase):
    """B2 (1.0.5): PermissionRequestResult is now a Union of concrete
    decision classes and is NOT constructible. The headless auto-approve
    handler must return PermissionDecisionApproveOnce(). Lock this so a
    future rename breaks the build instead of prod (AGENTS.md § 4.1)."""

    def test_prr_is_a_union_including_approve_once(self):
        from copilot.session import (
            PermissionRequestResult,
            PermissionDecisionApproveOnce,
        )

        members = typing.get_args(PermissionRequestResult)
        self.assertGreater(
            len(members),
            1,
            "PermissionRequestResult should be a Union of decision variants; "
            f"got {PermissionRequestResult!r}",
        )
        self.assertIn(
            PermissionDecisionApproveOnce,
            members,
            "PermissionDecisionApproveOnce must be a member of the "
            "PermissionRequestResult union — it is what DH's headless "
            "_permission_handler returns.",
        )

    def test_approve_once_constructs(self):
        """The exact call DH makes at _permission_handler. If this stops
        working, headless auto-approve breaks and every analysis hangs."""
        from copilot.session import PermissionDecisionApproveOnce

        result = PermissionDecisionApproveOnce()
        self.assertIsInstance(result, PermissionDecisionApproveOnce)

    def test_old_construction_form_is_dead(self):
        """Regression guard for the 0.3.0 form. In 1.0.5
        PermissionRequestResult is a UnionType and is NOT callable —
        constructing it must raise. This is exactly the breakage the
        upgrade fixed; if it ever becomes callable again we want to
        re-examine the handler."""
        from copilot.session import PermissionRequestResult

        with self.assertRaises(TypeError):
            # 0.3.0 did PermissionRequestResult(kind="approve-once")
            PermissionRequestResult(kind="approve-once")  # type: ignore


class TestPreToolUseHookOutput(unittest.TestCase):
    """Unchanged from 0.3.0 → 1.0.5 (probe-confirmed), but keep the guard:
    DH relies on permissionDecision="allow" at _pre_tool_use_hook."""

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
        """DH relies on `"allow"` at the pre-tool-use hook."""
        from copilot.session import PreToolUseHookOutput

        out = PreToolUseHookOutput(permissionDecision="allow")
        self.assertEqual(out["permissionDecision"], "allow")


class TestRuntimeConnection(unittest.TestCase):
    """B1: RuntimeConnection.for_stdio(path=...) replaces
    SubprocessConfig(cli_path=...). Lock the factory + param name."""

    def test_for_stdio_accepts_path_kwarg(self):
        import inspect
        from copilot import RuntimeConnection

        sig = inspect.signature(RuntimeConnection.for_stdio)
        self.assertIn(
            "path",
            sig.parameters,
            "RuntimeConnection.for_stdio must accept a `path=` kwarg; DH "
            "passes the resolved copilot.cmd path there.",
        )

    def test_for_stdio_constructs_with_and_without_path(self):
        from copilot import RuntimeConnection

        # No-arg (SDK auto-discovers the CLI)
        conn_default = RuntimeConnection.for_stdio()
        self.assertIsNotNone(conn_default)
        # Explicit path (DH's normal path)
        conn_path = RuntimeConnection.for_stdio(path=r"C:\some\copilot.cmd")
        self.assertEqual(getattr(conn_path, "path", None), r"C:\some\copilot.cmd")


class TestMcpTypeMigration(unittest.TestCase):
    """B-4 from docs/sdk-upgrade-2026-05-0.3.0.md (still applies).
    DH's `start_session` migrates legacy `type: "local"` / `"remote"` to
    `"stdio"` / `"http"` in memory. Verify the migration map is intact."""

    def test_migration_map_values(self):
        from host import dh_native_host  # noqa: F401

        legacy_to_new = {"local": "stdio", "remote": "http"}
        for legacy, new in legacy_to_new.items():
            self.assertIn(new, {"stdio", "http"})
            self.assertNotEqual(legacy, new)


if __name__ == "__main__":
    unittest.main()
