import ast
import contextlib
import io
import inspect
import shutil
import tempfile
import unittest
from dataclasses import replace
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

from native_registration import ALLOWED_ORIGINS, MainHostRuntime
from product_info import VERSION
from test_update_engine_host import TX, make_package
from test_update_support import FakeMutationMutex
from update_engine import UpdateEngine
from update_entrypoint import (
    EXIT_ALREADY_IN_PROGRESS,
    EXIT_INSTALLER_UNAVAILABLE,
    EXIT_INVALID_ARGUMENTS,
    EXIT_RECOVERY_REQUIRED,
    EXIT_ROLLED_BACK,
    EXIT_SUCCESS,
    INVALID_EARLY_INVOCATION,
    EarlyModeDependencies,
    EntryMode,
    EntrySelection,
    ExecutableRole,
    ValidatedCompleteUpdate,
    ValidatedInstallPackage,
    ValidatedMainHost,
    ValidatedProbe,
    ValidatedRecoveryCommand,
    ValidatedRegistration,
    ValidatedStatusHost,
    classify_entrypoint,
    dispatch_early_mode,
    parse_main_host_launch_args,
    resolve_active_command,
    resolve_journal_command,
    select_entry_mode,
    validate_complete_update_command,
    validate_early_invocation,
    validate_probe_invocation,
)
from update_journal import InitiatingProcessIdentity, JournalPhase, TransactionPaths, UpdateInitiator


class FakeRegistry:
    def __init__(self):
        self.calls = []

    def read_native_host(self, prefix, name):
        return None

    def write_native_host(self, prefix, name, path):
        self.calls.append(("write", prefix, name, path))

    def delete_native_host(self, prefix, name):
        self.calls.append(("delete", prefix, name))


class FakeController:
    def __init__(self):
        self.calls = []
        self.result = None

    def run_complete_update(self, transaction_id, identity):
        self.calls.append(("complete", transaction_id, identity))
        return self.result

    def recover_active(self):
        self.calls.append(("active",))
        return self.result

    def recover_journal(self, path):
        self.calls.append(("journal", path))
        return self.result


class EntrypointFixture:
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()

        self.package = make_package(self.root)
        self.package_root = self.package.stage_root
        self.main = self.package_root / "host/dh_native_host.exe"
        self.manifest = self.package_root / "update-manifest.json"

        self.source = Path("host/dh_native_host.py").resolve()
        self.source_root = self.source.parent

        self.install = self.root / "install"
        self.install.mkdir()
        mutex = FakeMutationMutex()
        engine = UpdateEngine(
            self.install, mutex_factory=lambda _root: mutex
        )
        engine.create_prepared(
            self.package,
            TX,
            expected_version=VERSION,
            prior_version=None,
            initiator=UpdateInitiator.BROWSER,
        )
        self.paths = TransactionPaths.for_install(self.install, TX)
        self.recovery = self.paths.updates_root / "recovery"
        self.recovery.mkdir()
        self.runner = self.recovery / "dh_update_runner.exe"
        self.status = self.recovery / "dh_update_status_host.exe"
        self.runner.write_bytes(b"runner")
        self.status.write_bytes(b"status")
        (self.recovery / "_internal").mkdir()
        (self.recovery / "_internal/runtime.dll").write_bytes(b"runtime")

        self.stdout = io.BytesIO()
        self.stderr = io.BytesIO()
        self.registry = FakeRegistry()
        self.controller = FakeController()
        self.controller.result = replace(
            __import__("update_journal").read_journal(self.paths.journal),
            phase=JournalPhase.COMMITTED,
            initiating_process=InitiatingProcessIdentity(
                77, "win-create-time-123"
            ),
        )
        self.factory_calls = []
        self.install_calls = []
        self.status_calls = []

    def deps_factory(self):
        self.factory_calls.append(True)
        return EarlyModeDependencies(
            input_stream=io.BytesIO(),
            output_stream=self.stdout,
            error_stream=self.stderr,
            registry_factory=lambda: self.registry,
            recovery_factory=lambda root: (
                self.controller
                if root == self.install
                else self.fail(f"wrong recovery root {root}")
            ),
            default_install_root=lambda: self.root / "default-install",
            install_package=lambda package, install: self.install_calls.append(
                (package, install)
            )
            or EXIT_INSTALLER_UNAVAILABLE,
            status_server=lambda input_stream, output_stream, install: self.status_calls.append(
                (input_stream, output_stream, install)
            )
            or 0,
        )

    def dispatch(self, executable, argv, *, source_runtime=False):
        self.stdout = io.BytesIO()
        self.stderr = io.BytesIO()
        return dispatch_early_mode(
            str(executable),
            argv,
            source_runtime=source_runtime,
            dependencies_factory=self.deps_factory,
        )

    @staticmethod
    def construction_sentinels(exploding):
        return tuple(
            mock.patch(target, exploding)
            for target in (
                "update_entrypoint.production_early_mode_dependencies",
                "update_entrypoint.EarlyModeDependencies",
                "update_entrypoint.WindowsRegistryBackend",
                "update_entrypoint.create_production_recovery_controller",
                "update_entrypoint.RecoveryController",
                "update_entrypoint.InitiatingProcessIdentity",
                "update_entrypoint.register_main_host",
                "update_entrypoint.serve_status_host",
                "native_registration.WindowsRegistryBackend",
                "native_registration.register_main_host",
                "update_status_host.serve_status_host",
                "update_journal.InitiatingProcessIdentity",
                "update_platform.InitiatingProcessIdentity",
                "update_recovery.InitiatingProcessIdentity",
                "update_recovery.RecoveryController",
                "update_recovery.RecoveryDependencies",
                "update_recovery.RecoveryDiagnostics",
                "update_recovery.create_production_recovery_controller",
                "update_recovery.CtypesWin32ProcessApi",
                "update_recovery.WindowsProcessAdapter",
                "update_recovery.SubprocessProbeAdapter",
                "update_recovery.TemporaryStagedProbeWorkspace",
                "update_recovery.WindowsRunOnceStore",
                "update_recovery.SystemClock",
                "update_recovery.create_windows_mutation_mutex",
                "update_platform.CtypesWin32ProcessApi",
                "update_platform.WindowsProcessAdapter",
                "update_platform.SubprocessProbeAdapter",
                "update_platform.WindowsRunOnceStore",
                "update_platform.SystemClock",
                "update_mutex.create_windows_mutation_mutex",
                "early_cli.run_update_probe",
                "install_integrity.run_update_probe",
            )
        )

    def assert_invalid(self, executable, argv, *, source_runtime=False):
        for production_path in (False, True):
            with self.subTest(production_path=production_path):
                stdout = io.BytesIO()
                stderr = io.BytesIO()
                exploding = mock.Mock(
                    side_effect=AssertionError("dependency_constructed")
                )
                dependencies_factory = None if production_path else exploding
                with contextlib.ExitStack() as stack:
                    stack.enter_context(mock.patch(
                        "update_entrypoint.sys.stdout",
                        SimpleNamespace(buffer=stdout),
                    ))
                    stack.enter_context(mock.patch(
                        "update_entrypoint.sys.stderr",
                        SimpleNamespace(buffer=stderr),
                    ))
                    for sentinel in self.construction_sentinels(exploding):
                        stack.enter_context(sentinel)
                    result = dispatch_early_mode(
                        str(executable),
                        argv,
                        source_runtime=source_runtime,
                        dependencies_factory=dependencies_factory,
                    )
                self.assertEqual(result, EXIT_INVALID_ARGUMENTS)
                self.assertEqual(stdout.getvalue(), b"")
                self.assertEqual(stderr.getvalue(), INVALID_EARLY_INVOCATION)
                exploding.assert_not_called()


class EntrypointSelectionTests(EntrypointFixture, unittest.TestCase):
    def test_recognized_command_selects_then_wrong_role_rejects(self):
        selected = select_entry_mode(self.status, ["--recover-active"])
        self.assertEqual(selected, EntrySelection(EntryMode.RECOVER_ACTIVE, ()))
        with self.assertRaisesRegex(ValueError, "invalid_early_invocation"):
            validate_early_invocation(
                self.status,
                ["--recover-active"],
                source_runtime=False,
            )

    def test_exact_status_basename_and_fuzzy_name(self):
        origin = ALLOWED_ORIGINS[0]
        self.assertEqual(
            select_entry_mode(
                self.status.with_name("DH_UPDATE_STATUS_HOST.EXE"), [origin]
            ).mode,
            EntryMode.STATUS_HOST,
        )
        self.assertEqual(
            select_entry_mode(
                self.status.with_name("prefix-dh_update_status_host.exe"),
                [origin],
            ).mode,
            EntryMode.MAIN_HOST,
        )

    def test_normal_main_source_and_frozen_continue_without_factory(self):
        origin = ALLOWED_ORIGINS[0]
        exploding = mock.Mock(side_effect=AssertionError("factory_called"))
        for executable, argv, source_runtime in (
            (self.main, [origin], False),
            (self.main, [origin, "--parent-window=0"], False),
            (self.source, [], True),
            (self.source, [origin, "--parent-window=123"], True),
        ):
            with self.subTest(executable=executable, argv=argv):
                self.assertIsNone(
                    dispatch_early_mode(
                        str(executable),
                        argv,
                        source_runtime=source_runtime,
                        dependencies_factory=exploding,
                    )
                )
        exploding.assert_not_called()
        self.assertEqual(
            parse_main_host_launch_args([origin, "--parent-window=0"]).parent_window,
            0,
        )

    def test_historical_main_classification_ignores_metadata(self):
        (self.main.parent / "release-integrity.json").unlink()
        (self.main.parent / "installed-product.json").unlink()
        role, path = classify_entrypoint(self.main)
        self.assertEqual(role, ExecutableRole.PRODUCTION_MAIN)
        self.assertEqual(path, self.main)
        self.assertIsNone(
            dispatch_early_mode(
                str(self.main),
                [ALLOWED_ORIGINS[0]],
                source_runtime=False,
                dependencies_factory=lambda: self.fail("factory called"),
            )
        )

    def test_probe_validator_requires_complete_frozen_chain(self):
        self.assertEqual(
            validate_probe_invocation(
                self.main,
                ["--update-probe", str(self.manifest)],
                source_runtime=False,
            ),
            ValidatedProbe(self.main, self.manifest),
        )
        (self.main.parent / "installed-product.json").unlink()
        with self.assertRaisesRegex(ValueError, "invalid_early_invocation"):
            validate_probe_invocation(
                self.main,
                ["--update-probe", str(self.manifest)],
                source_runtime=False,
            )

    def test_runtime_bits_are_not_caller_selectable(self):
        self.assert_invalid(self.main, [], source_runtime=True)
        self.assert_invalid(self.source, [], source_runtime=False)

    def test_arbitrary_same_named_source_script_cannot_claim_source_role(self):
        fake_root = self.root / "fake-source"
        fake_root.mkdir()
        fake = fake_root / "dh_native_host.py"
        fake.write_bytes(b"fake")
        (fake_root / "launch_host.bat").write_bytes(b"fake-launcher")
        with self.assertRaisesRegex(ValueError, "invalid_early_invocation"):
            classify_entrypoint(fake.resolve())


class EntrypointDependencyTests(EntrypointFixture, unittest.TestCase):
    def test_exact_dependency_and_payload_shapes(self):
        self.assertEqual(
            tuple(EarlyModeDependencies.__dataclass_fields__),
            (
                "input_stream",
                "output_stream",
                "error_stream",
                "registry_factory",
                "recovery_factory",
                "default_install_root",
                "install_package",
                "status_server",
            ),
        )
        self.assertEqual(tuple(ValidatedMainHost.__dataclass_fields__), ("launch",))
        self.assertEqual(
            tuple(ValidatedStatusHost.__dataclass_fields__),
            ("install_root", "launch"),
        )
        self.assertEqual(
            tuple(ValidatedRegistration.__dataclass_fields__),
            ("host_root", "runtime"),
        )
        self.assertEqual(
            tuple(ValidatedInstallPackage.__dataclass_fields__),
            ("package_root",),
        )
        self.assertEqual(
            tuple(ValidatedCompleteUpdate.__dataclass_fields__),
            ("install_root", "transaction_id", "process_identity"),
        )
        self.assertEqual(
            tuple(ValidatedRecoveryCommand.__dataclass_fields__),
            ("install_root", "transaction_id", "journal_path"),
        )

    def test_dispatch_signature_accepts_factory(self):
        self.assertEqual(
            tuple(inspect.signature(dispatch_early_mode).parameters),
            ("executable", "argv", "source_runtime", "dependencies_factory"),
        )

    def test_dependency_construction_occurs_after_validated_invocation(self):
        source = Path("host/update_entrypoint.py").read_text(encoding="utf-8")
        tree = ast.parse(source)
        function = next(
            node
            for node in tree.body
            if isinstance(node, ast.FunctionDef)
            and node.name == "dispatch_early_mode"
        )
        calls = [node for node in ast.walk(function) if isinstance(node, ast.Call)]

        def name(call):
            if isinstance(call.func, ast.Name):
                return call.func.id
            if isinstance(call.func, ast.Attribute):
                return call.func.attr
            return ""

        validates = [call for call in calls if name(call) == "validate_early_invocation"]
        factories = [
            call
            for call in calls
            if name(call)
            in ("dependencies_factory", "production_early_mode_dependencies")
        ]
        self.assertEqual(len(validates), 1)
        self.assertEqual(len(factories), 2)
        self.assertTrue(all(validates[0].lineno < call.lineno for call in factories))
        classify = inspect.getsource(classify_entrypoint)
        self.assertNotIn("release-integrity.json", classify)
        self.assertNotIn("installed-product.json", classify)


class EntrypointDispatchTests(EntrypointFixture, unittest.TestCase):
    def test_source_and_frozen_register_dispatch_exact_runtime(self):
        with mock.patch("update_entrypoint.register_main_host") as register:
            self.assertEqual(
                self.dispatch(self.source, ["--register"], source_runtime=True),
                EXIT_SUCCESS,
            )
            register.assert_called_with(
                self.source_root, self.registry, MainHostRuntime.SOURCE
            )
            register.reset_mock()
            self.assertEqual(
                self.dispatch(self.main, ["--register"]), EXIT_SUCCESS
            )
            register.assert_called_with(
                self.main.parent, self.registry, MainHostRuntime.FROZEN
            )

    def test_install_package_binds_entrypoint_to_package_root(self):
        self.assertEqual(
            self.dispatch(
                self.main,
                ["--install-package", str(self.package_root)],
            ),
            EXIT_INSTALLER_UNAVAILABLE,
        )
        self.assertEqual(
            self.install_calls,
            [(self.package_root, self.root / "default-install")],
        )
        self.assert_invalid(
            self.main,
            ["--install-package", str(self.root)],
        )

    def test_complete_update_validates_authority_before_controller(self):
        identity = InitiatingProcessIdentity(77, "win-create-time-123")
        value = validate_complete_update_command(
            self.runner,
            [TX, "77", identity.creation_token],
        )
        self.assertEqual(value, ValidatedCompleteUpdate(self.install, TX, identity))
        self.assertEqual(
            self.dispatch(
                self.runner,
                ["--complete-update", TX, "77", identity.creation_token],
            ),
            EXIT_SUCCESS,
        )
        self.assertEqual(self.controller.calls, [("complete", TX, identity)])

    def test_recover_active_and_recover_update_dispatch(self):
        active = resolve_active_command(self.install)
        self.assertEqual(active.transaction_id, TX)
        manual = resolve_journal_command(self.paths.journal)
        self.assertEqual(manual.transaction_id, TX)
        self.assertEqual(
            self.dispatch(self.runner, ["--recover-active"]), EXIT_SUCCESS
        )
        self.assertEqual(
            self.dispatch(
                self.runner, ["--recover-update", str(self.paths.journal)]
            ),
            EXIT_SUCCESS,
        )
        self.assertEqual(
            self.controller.calls,
            [("active",), ("journal", self.paths.journal)],
        )

    def test_status_dispatch_uses_only_status_server(self):
        self.assertEqual(
            self.dispatch(
                self.status,
                [ALLOWED_ORIGINS[0], "--parent-window=0"],
            ),
            EXIT_SUCCESS,
        )
        self.assertEqual(len(self.status_calls), 1)
        self.assertEqual(self.status_calls[0][2], self.install)

    def test_malformed_modes_never_construct_dependencies(self):
        invalid = (
            (self.main, ["--register", "extra"]),
            (self.main, ["--install-package"]),
            (self.runner, ["--complete-update"]),
            (self.runner, ["--complete-update", TX, "0", "win-create-time-1"]),
            (self.runner, ["--complete-update", "F" * 32, "77", "win-create-time-1"]),
            (self.runner, ["--recover-active", TX]),
            (self.runner, ["--recover-update"]),
            (self.status, []),
            (self.status, [ALLOWED_ORIGINS[0], "--parent-window=-1"]),
            (self.runner, ["--register"]),
            (self.main, ["--recover-active"]),
        )
        for executable, argv in invalid:
            with self.subTest(executable=executable.name, argv=argv):
                self.stderr = io.BytesIO()
                self.assert_invalid(executable, argv)

    def test_recognized_command_wrong_role_cross_product_is_rejected(self):
        commands = (
            ["--register"],
            ["--complete-update", TX, "77", "win-create-time-1"],
            ["--install-package", str(self.package_root)],
            ["--recover-active"],
            ["--recover-update", str(self.paths.journal)],
        )
        roles = (self.main, self.source, self.runner, self.status)
        allowed = {
            "--register": {self.main, self.source},
            "--complete-update": {self.runner},
            "--install-package": {self.main},
            "--recover-active": {self.runner},
            "--recover-update": {self.runner},
        }
        for argv in commands:
            for executable in roles:
                if executable in allowed[argv[0]]:
                    continue
                with self.subTest(command=argv[0], executable=executable.name):
                    self.assert_invalid(
                        executable,
                        argv,
                        source_runtime=executable == self.source,
                    )

    def test_complete_update_invalid_authority_never_constructs_dependencies(self):
        active = self.paths.active
        original = active.read_bytes()
        active.write_bytes(b"malformed")
        try:
            self.assert_invalid(
                self.runner,
                ["--complete-update", TX, "77", "win-create-time-1"],
            )
        finally:
            active.write_bytes(original)

    def test_unknown_case_variant_and_command_position_are_rejected(self):
        for argv in (
            ["--REGISTER"],
            [ALLOWED_ORIGINS[0], "--register"],
            ["--unknown-dh-mode"],
            ["--register", "--recover-active"],
        ):
            with self.subTest(argv=argv):
                self.assert_invalid(self.main, argv)

    def test_non_string_args_are_rejected_before_factory(self):
        self.assert_invalid(self.runner, ["--recover-active", 1])

    def test_valid_probe_delegates_without_dependencies(self):
        factory = mock.Mock(side_effect=AssertionError("factory_called"))
        with mock.patch(
            "update_entrypoint.dispatch_early_cli", return_value=0
        ) as delegate:
            self.assertEqual(
                dispatch_early_mode(
                    str(self.main),
                    ["--update-probe", str(self.manifest)],
                    source_runtime=False,
                    dependencies_factory=factory,
                ),
                EXIT_SUCCESS,
            )
        delegate.assert_called_once_with(
            (str(self.main), "--update-probe", str(self.manifest))
        )
        factory.assert_not_called()

    def test_malformed_probe_uses_fixed_plan_a_tuple_without_dependencies(self):
        factory = mock.Mock(side_effect=AssertionError("factory_called"))
        with mock.patch(
            "update_entrypoint.dispatch_early_cli", return_value=2
        ) as delegate:
            self.assertEqual(
                dispatch_early_mode(
                    str(self.main),
                    ["--update-probe"],
                    source_runtime=False,
                    dependencies_factory=factory,
                ),
                EXIT_INVALID_ARGUMENTS,
            )
        delegate.assert_called_once_with((str(self.main), "--update-probe"))
        factory.assert_not_called()

    def test_probe_wrong_role_uses_canonical_failure_without_probe_or_factories(self):
        for executable, source_runtime in (
            (self.source, True),
            (self.runner, False),
            (self.status, False),
        ):
            for production_path in (False, True):
                with self.subTest(
                    executable=executable.name,
                    production_path=production_path,
                ):
                    stdout = io.BytesIO()
                    stderr = io.BytesIO()
                    exploding = mock.Mock(
                        side_effect=AssertionError("dependency_or_probe_called")
                    )
                    dependencies_factory = None if production_path else exploding
                    plan_a_dispatch = __import__("early_cli").dispatch_early_cli
                    with contextlib.ExitStack() as stack:
                        stack.enter_context(mock.patch(
                            "update_entrypoint.sys.stdout",
                            SimpleNamespace(buffer=stdout),
                        ))
                        stack.enter_context(mock.patch(
                            "update_entrypoint.sys.stderr",
                            SimpleNamespace(buffer=stderr),
                        ))
                        for sentinel in self.construction_sentinels(exploding):
                            stack.enter_context(sentinel)
                        delegate = stack.enter_context(mock.patch(
                            "update_entrypoint.dispatch_early_cli",
                            wraps=plan_a_dispatch,
                        ))
                        self.assertEqual(
                            dispatch_early_mode(
                                str(executable),
                                ["--update-probe", str(self.manifest)],
                                source_runtime=source_runtime,
                                dependencies_factory=dependencies_factory,
                            ),
                            EXIT_INVALID_ARGUMENTS,
                        )
                    delegate.assert_called_once_with(
                        (str(executable.absolute()), "--update-probe")
                    )
                    self.assertEqual(
                        stdout.getvalue(),
                        b'{"error_code":"package_probe_failed","status":"error"}\n',
                    )
                    self.assertEqual(stderr.getvalue(), b"")
                    exploding.assert_not_called()

    def test_post_validation_internal_and_contention_exit_categories_are_fixed(self):
        with mock.patch(
            "update_entrypoint.register_main_host",
            side_effect=RuntimeError("private secret"),
        ):
            self.assertEqual(
                self.dispatch(self.main, ["--register"]),
                50,
            )
            self.assertEqual(self.stderr.getvalue(), b"early_mode_failed\n")
        from update_mutex import UpdateAlreadyInProgress

        with mock.patch(
            "update_entrypoint.register_main_host",
            side_effect=UpdateAlreadyInProgress(),
        ):
            self.assertEqual(
                self.dispatch(self.main, ["--register"]),
                EXIT_ALREADY_IN_PROGRESS,
            )


if __name__ == "__main__":
    unittest.main()
