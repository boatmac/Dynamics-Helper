import json
import ast
import shutil
import tempfile
import unittest
from pathlib import Path

from package_archive import validate_staged_package
from package_manifest import generate_release_documents, write_release_documents
from product_info import VERSION
from test_update_engine_host import TX
from test_update_support import (
    FakeMutationMutex,
    FaultController,
    InjectedCrash,
    InjectedFault,
    RecordingHooks,
)
from update_engine import (
    PreparedTransactionConflict,
    UpdateEngine,
    UpdateEngineError,
    UpdateEngineHooks,
    UpdateStateConflict,
)
from update_journal import (
    InitiatingProcessIdentity,
    JournalPhase,
    JournalReason,
    TransactionPaths,
    UpdateInitiator,
)


FORWARD_TRANSITION_LABELS = (
    "staging", "prepared", "waiting-for-host-exit", "host-backed-up", "host-installed",
    "extension-backed-up", "extension-installed", "metadata-installed",
    "probing", "committed",
)
ROLLBACK_TRANSITION_LABELS = ("rolling-back", "recovery-required", "rolled-back")

OWNERSHIP_MODE_LABELS = (
    "installed", "legacy", "fresh-seeded", "fresh-preexisting",
    "fresh-post-plan-user-creation",
)
OPERATION_FAULT_AXES = (
    "before-operation", "after-operation",
    "synthesized-post-operation-pre-transition",
)
TRANSITION_FAULT_AXES = ("after-transition",)
TERMINAL_OUTCOMES = ("committed", "rolled-back")
PREPARING_ORPHAN_RECOVERY_OPERATIONS = ("workspace:remove-orphan-preparing",)

INSTALLED_PREPARATION_OPERATIONS = (
    "workspace:create-preparing", "workspace:write-staging-journal",
    "workspace:write-probe-manifest",
    "workspace:stage-host:_internal/runtime.dll", "workspace:stage-host:dh_native_host.exe",
    "workspace:stage-host:helper.dll",
    "workspace:stage-host:installed-product.json", "workspace:stage-host:register.py",
    "workspace:stage-host:release-integrity.json", "workspace:stage-host:system_prompt.md",
    "workspace:stage-extension:assets/app.js", "workspace:stage-extension:manifest.json",
    "workspace:write-ownership", "workspace:write-prepared-journal",
    "workspace:promote-preparing", "active:write",
)
LEGACY_PREPARATION_OPERATIONS = (
    "workspace:create-preparing", "workspace:write-staging-journal",
    "workspace:write-probe-manifest",
    "workspace:stage-host:_internal/runtime.dll", "workspace:stage-host:dh_native_host.exe",
    "workspace:stage-host:helper.dll",
    "workspace:stage-host:installed-product.json", "workspace:stage-host:register.py",
    "workspace:stage-host:release-integrity.json", "workspace:stage-host:system_prompt.md",
    "workspace:stage-extension:assets/app.js", "workspace:stage-extension:manifest.json",
    "workspace:write-ownership", "workspace:write-prepared-journal",
    "workspace:promote-preparing", "active:write",
)
FRESH_SEEDED_PREPARATION_OPERATIONS = (
    "workspace:create-preparing", "workspace:write-staging-journal",
    "workspace:write-probe-manifest",
    "workspace:stage-host:_internal/runtime.dll", "workspace:stage-host:config.json",
    "workspace:stage-host:dh_native_host.exe", "workspace:stage-host:helper.dll",
    "workspace:stage-host:installed-product.json", "workspace:stage-host:register.py",
    "workspace:stage-host:release-integrity.json", "workspace:stage-host:system_prompt.md",
    "workspace:stage-extension:assets/app.js", "workspace:stage-extension:manifest.json",
    "workspace:write-ownership", "workspace:write-prepared-journal",
    "workspace:promote-preparing", "active:write",
)
FRESH_PREEXISTING_PREPARATION_OPERATIONS = (
    "workspace:create-preparing", "workspace:write-staging-journal",
    "workspace:write-probe-manifest",
    "workspace:stage-host:_internal/runtime.dll", "workspace:stage-host:dh_native_host.exe",
    "workspace:stage-host:helper.dll",
    "workspace:stage-host:installed-product.json", "workspace:stage-host:register.py",
    "workspace:stage-host:release-integrity.json", "workspace:stage-host:system_prompt.md",
    "workspace:stage-extension:assets/app.js", "workspace:stage-extension:manifest.json",
    "workspace:write-ownership", "workspace:write-prepared-journal",
    "workspace:promote-preparing", "active:write",
)
FRESH_POST_PLAN_USER_CREATION_PREPARATION_OPERATIONS = (
    "workspace:create-preparing", "workspace:write-staging-journal",
    "workspace:write-probe-manifest",
    "workspace:stage-host:_internal/runtime.dll", "workspace:stage-host:config.json",
    "workspace:stage-host:dh_native_host.exe", "workspace:stage-host:helper.dll",
    "workspace:stage-host:installed-product.json", "workspace:stage-host:register.py",
    "workspace:stage-host:release-integrity.json", "workspace:stage-host:system_prompt.md",
    "workspace:stage-extension:assets/app.js", "workspace:stage-extension:manifest.json",
    "workspace:write-ownership", "workspace:write-prepared-journal",
    "workspace:promote-preparing", "active:write",
)
INSTALLED_FORWARD_OPERATIONS = (
    "backup-metadata:installed-product.json", "backup-metadata:release-integrity.json",
    "backup-host:dh_native_host.exe", "backup-host:_internal",
    "backup-host:register.py", "backup-host:stale-runtime.dll", "backup-host:system_prompt.md",
    "install-host:_internal", "install-host:helper.dll", "install-host:register.py",
    "install-host:system_prompt.md", "install-host:dh_native_host.exe",
    "backup-extension", "install-extension",
    "install-metadata:release-integrity.json", "install-metadata:installed-product.json",
)
LEGACY_FORWARD_OPERATIONS = (
    "backup-host:dh_native_host.exe", "backup-host:_internal",
    "backup-host:register.py", "backup-host:system_prompt.md",
    "install-host:_internal", "install-host:helper.dll", "install-host:register.py",
    "install-host:system_prompt.md", "install-host:dh_native_host.exe",
    "backup-extension", "install-extension",
    "install-metadata:release-integrity.json", "install-metadata:installed-product.json",
)
FRESH_SEEDED_FORWARD_OPERATIONS = (
    "install-host:_internal", "install-host:helper.dll", "install-host:register.py",
    "install-host:system_prompt.md", "install-host:dh_native_host.exe",
    "install-extension", "install-seed:config.json", "journal:record-seed-receipt",
    "install-metadata:release-integrity.json", "install-metadata:installed-product.json",
)
FRESH_PREEXISTING_FORWARD_OPERATIONS = (
    "install-host:_internal", "install-host:helper.dll", "install-host:register.py",
    "install-host:system_prompt.md", "install-host:dh_native_host.exe",
    "install-extension",
    "install-metadata:release-integrity.json", "install-metadata:installed-product.json",
)
FRESH_POST_PLAN_USER_CREATION_FORWARD_OPERATIONS = (
    "install-host:_internal", "install-host:helper.dll", "install-host:register.py",
    "install-host:system_prompt.md", "install-host:dh_native_host.exe",
    "install-extension", "journal:record-seed-receipt",
    "install-metadata:release-integrity.json", "install-metadata:installed-product.json",
)
INSTALLED_ROLLBACK_OPERATIONS = (
    "remove-new-metadata:installed-product.json", "remove-new-metadata:release-integrity.json",
    "remove-new-extension", "restore-extension", "remove-new-host:dh_native_host.exe",
    "remove-new-host:_internal", "remove-new-host:helper.dll", "remove-new-host:register.py",
    "remove-new-host:system_prompt.md", "restore-host:_internal", "restore-host:register.py",
    "restore-host:stale-runtime.dll", "restore-host:system_prompt.md",
    "restore-host:dh_native_host.exe", "restore-metadata:release-integrity.json",
    "restore-metadata:installed-product.json",
)
LEGACY_ROLLBACK_OPERATIONS = (
    "remove-new-metadata:installed-product.json", "remove-new-metadata:release-integrity.json",
    "remove-new-extension", "restore-extension", "remove-new-host:dh_native_host.exe",
    "remove-new-host:_internal", "remove-new-host:helper.dll", "remove-new-host:register.py",
    "remove-new-host:system_prompt.md", "restore-host:_internal", "restore-host:register.py",
    "restore-host:system_prompt.md", "restore-host:dh_native_host.exe",
)
FRESH_SEEDED_ROLLBACK_OPERATIONS = (
    "remove-new-metadata:installed-product.json", "remove-new-metadata:release-integrity.json",
    "remove-new-extension", "remove-new-host:dh_native_host.exe", "remove-new-host:_internal",
    "remove-new-host:helper.dll", "remove-new-host:register.py", "remove-new-host:system_prompt.md",
)
FRESH_PREEXISTING_ROLLBACK_OPERATIONS = (
    "remove-new-metadata:installed-product.json", "remove-new-metadata:release-integrity.json",
    "remove-new-extension", "remove-new-host:dh_native_host.exe", "remove-new-host:_internal",
    "remove-new-host:helper.dll", "remove-new-host:register.py", "remove-new-host:system_prompt.md",
)
FRESH_POST_PLAN_USER_CREATION_ROLLBACK_OPERATIONS = (
    "remove-new-metadata:installed-product.json", "remove-new-metadata:release-integrity.json",
    "remove-new-extension", "remove-new-host:dh_native_host.exe", "remove-new-host:_internal",
    "remove-new-host:helper.dll", "remove-new-host:register.py", "remove-new-host:system_prompt.md",
)

INSTALLED_FINALIZATION_OPERATIONS = ("active:remove", "workspace:remove-terminal")
LEGACY_FINALIZATION_OPERATIONS = ("active:remove", "workspace:remove-terminal")
FRESH_SEEDED_FINALIZATION_OPERATIONS = ("active:remove", "workspace:remove-terminal")
FRESH_PREEXISTING_FINALIZATION_OPERATIONS = ("active:remove", "workspace:remove-terminal")
FRESH_POST_PLAN_USER_CREATION_FINALIZATION_OPERATIONS = (
    "active:remove", "workspace:remove-terminal",
)

EXPECTED_OWNERSHIP_MODE_COUNT = 5
EXPECTED_OPERATION_FAULT_AXIS_COUNT = 3
EXPECTED_TRANSITION_FAULT_AXIS_COUNT = 1
EXPECTED_TERMINAL_OUTCOME_COUNT = 2
EXPECTED_ORPHAN_RECOVERY_OPERATION_COUNT = 1
EXPECTED_INSTALLED_PREPARATION_OPERATION_COUNT = 16
EXPECTED_LEGACY_PREPARATION_OPERATION_COUNT = 16
EXPECTED_FRESH_SEEDED_PREPARATION_OPERATION_COUNT = 17
EXPECTED_FRESH_PREEXISTING_PREPARATION_OPERATION_COUNT = 16
EXPECTED_FRESH_POST_PLAN_PREPARATION_OPERATION_COUNT = 17
EXPECTED_INSTALLED_FORWARD_OPERATION_COUNT = 16
EXPECTED_LEGACY_FORWARD_OPERATION_COUNT = 13
EXPECTED_FRESH_SEEDED_FORWARD_OPERATION_COUNT = 10
EXPECTED_FRESH_PREEXISTING_FORWARD_OPERATION_COUNT = 8
EXPECTED_FRESH_POST_PLAN_FORWARD_OPERATION_COUNT = 9
EXPECTED_INSTALLED_ROLLBACK_OPERATION_COUNT = 16
EXPECTED_LEGACY_ROLLBACK_OPERATION_COUNT = 13
EXPECTED_FRESH_SEEDED_ROLLBACK_OPERATION_COUNT = 8
EXPECTED_FRESH_PREEXISTING_ROLLBACK_OPERATION_COUNT = 8
EXPECTED_FRESH_POST_PLAN_ROLLBACK_OPERATION_COUNT = 8
EXPECTED_FINALIZATION_OPERATION_COUNT = 2
EXPECTED_FORWARD_TRANSITION_LABEL_COUNT = 10
EXPECTED_ROLLBACK_TRANSITION_LABEL_COUNT = 3
EXPECTED_TRANSITION_LABEL_COUNT = 13
EXPECTED_PREPARATION_LABEL_CASES = 82
EXPECTED_ORPHAN_RECOVERY_LABEL_CASES = 5
EXPECTED_FORWARD_LABEL_CASES = 56
EXPECTED_ROLLBACK_LABEL_CASES = 53
EXPECTED_FINALIZATION_LABEL_CASES = 20
EXPECTED_OPERATION_LABEL_CASES = 216
EXPECTED_BEFORE_OPERATION_FAULT_CASES = 216
EXPECTED_AFTER_OPERATION_CRASH_CASES = 216
EXPECTED_SYNTHESIZED_POST_OPERATION_CASES = 216
EXPECTED_PHASE_TRANSITION_CRASH_CASES = 65
EXPECTED_SEED_RECEIPT_TRANSITION_CRASH_CASES = 2
EXPECTED_AFTER_TRANSITION_CRASH_CASES = 67


PREPARATION_BY_MODE = {
    "installed": INSTALLED_PREPARATION_OPERATIONS,
    "legacy": LEGACY_PREPARATION_OPERATIONS,
    "fresh-seeded": FRESH_SEEDED_PREPARATION_OPERATIONS,
    "fresh-preexisting": FRESH_PREEXISTING_PREPARATION_OPERATIONS,
    "fresh-post-plan-user-creation": FRESH_POST_PLAN_USER_CREATION_PREPARATION_OPERATIONS,
}
FORWARD_BY_MODE = {
    "installed": INSTALLED_FORWARD_OPERATIONS,
    "legacy": LEGACY_FORWARD_OPERATIONS,
    "fresh-seeded": FRESH_SEEDED_FORWARD_OPERATIONS,
    "fresh-preexisting": FRESH_PREEXISTING_FORWARD_OPERATIONS,
    "fresh-post-plan-user-creation": FRESH_POST_PLAN_USER_CREATION_FORWARD_OPERATIONS,
}
ROLLBACK_BY_MODE = {
    "installed": INSTALLED_ROLLBACK_OPERATIONS,
    "legacy": LEGACY_ROLLBACK_OPERATIONS,
    "fresh-seeded": FRESH_SEEDED_ROLLBACK_OPERATIONS,
    "fresh-preexisting": FRESH_PREEXISTING_ROLLBACK_OPERATIONS,
    "fresh-post-plan-user-creation": FRESH_POST_PLAN_USER_CREATION_ROLLBACK_OPERATIONS,
}
FINALIZATION_BY_MODE = {
    "installed": INSTALLED_FINALIZATION_OPERATIONS,
    "legacy": LEGACY_FINALIZATION_OPERATIONS,
    "fresh-seeded": FRESH_SEEDED_FINALIZATION_OPERATIONS,
    "fresh-preexisting": FRESH_PREEXISTING_FINALIZATION_OPERATIONS,
    "fresh-post-plan-user-creation": FRESH_POST_PLAN_USER_CREATION_FINALIZATION_OPERATIONS,
}


class ProbeFailure(RuntimeError):
    pass


class SynthesizedOperationEngine(UpdateEngine):
    def __init__(self, *args, synthesized_label: str, **kwargs):
        super().__init__(*args, **kwargs)
        self.synthesized_label = synthesized_label
        self.synthesized = False

    def _run_operation(self, label, operation):
        if not self.synthesized and label == self.synthesized_label:
            operation()
            self.synthesized = True
            raise InjectedCrash(label)
        return super()._run_operation(label, operation)


def live_snapshot(root: Path) -> dict[str, bytes]:
    return {
        path.relative_to(root).as_posix(): path.read_bytes()
        for path in root.rglob("*")
        if path.is_file() and "updates" not in path.relative_to(root).parts
    }


def make_matrix_package(root: Path, name: str, *, prior: bool = False):
    stage = root / name
    files = {
        "host/dh_native_host.exe": b"old-host" if prior else b"new-host",
        "host/_internal/runtime.dll": b"old-runtime" if prior else b"new-runtime",
        "host/system_prompt.md": b"old-core" if prior else b"new-core",
        "host/register.py": b"old-register" if prior else b"new-register",
        "host/config.json": b"{}\n",
        "extension/manifest.json": json.dumps(
            {"version": "2.0.74", "version_name": VERSION},
            sort_keys=True,
            separators=(",", ":"),
        ).encode("ascii")
        + b"\n",
        "extension/assets/app.js": b"old-app" if prior else b"new-app",
        "installer_core.ps1": b"installer",
        "install.bat": b"wrapper",
    }
    if prior:
        files["host/stale-runtime.dll"] = b"stale-runtime"
    else:
        files["host/helper.dll"] = b"new-helper"
    for relative, payload in files.items():
        path = stage.joinpath(*relative.split("/"))
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(payload)
    documents = generate_release_documents(stage, VERSION)
    write_release_documents(stage, documents)
    return validate_staged_package(stage, expected_version=VERSION)


class MatrixHarness:
    def __init__(
        self,
        root: Path,
        mode: str,
        *,
        rollback: bool = False,
        initiator: UpdateInitiator = UpdateInitiator.BROWSER,
    ):
        self.root = root
        self.mode = mode
        self.initiator = initiator
        self.install = root / "install"
        self.install.mkdir(parents=True)
        self.package = make_matrix_package(root, "target")
        self.prior_version = None
        if mode == "installed":
            prior = make_matrix_package(root, "prior", prior=True)
            shutil.copytree(prior.stage_root / "host", self.install, dirs_exist_ok=True)
            shutil.copytree(prior.stage_root / "extension", self.install / "extension")
            self.prior_version = VERSION
        elif mode == "legacy":
            (self.install / "dh_native_host.exe").write_bytes(b"legacy-host")
            (self.install / "system_prompt.md").write_bytes(b"legacy-core")
            (self.install / "register.py").write_bytes(b"legacy-register")
            (self.install / "_internal").mkdir()
            (self.install / "_internal/runtime.dll").write_bytes(b"legacy-runtime")
            (self.install / "extension").mkdir()
            (self.install / "extension/legacy.js").write_bytes(b"legacy-extension")
            self.prior_version = "legacy-version"
        elif mode == "fresh-preexisting":
            (self.install / "config.json").write_bytes(b"preexisting-user")

        self.mutex = FakeMutationMutex()
        self.recording = RecordingHooks(self.mutex)
        self.controller = FaultController(self.recording)
        self.fail_probe = rollback

        def probe(path, plan):
            self.controller.probe_installed_product(path, plan)
            if self.fail_probe:
                raise ProbeFailure("probe")

        self.hooks = UpdateEngineHooks(
            self.controller.before_live_phase,
            self.controller.wait_for_initiating_host_exit,
            probe,
            self.controller.before_filesystem_operation,
            self.controller.after_filesystem_operation,
            self.controller.after_journal_transition,
        )
        self.rebuild_engine()

    def rebuild_engine(self, *, synthesized_label=None):
        if synthesized_label is None:
            self.engine = UpdateEngine(
                self.install,
                mutex_factory=lambda _root: self.mutex,
                hooks=self.hooks,
            )
        else:
            self.engine = SynthesizedOperationEngine(
                self.install,
                mutex_factory=lambda _root: self.mutex,
                hooks=self.hooks,
                synthesized_label=synthesized_label,
            )

    def prepare(self):
        result = self.engine.create_prepared(
            self.package,
            TX,
            expected_version=(
                VERSION if self.initiator is UpdateInitiator.BROWSER else None
            ),
            prior_version=self.prior_version,
            initiator=self.initiator,
        )
        if self.mode == "fresh-post-plan-user-creation":
            (self.install / "config.json").write_bytes(b"post-plan-user")
        return result

    def activate_and_resume(self):
        self.activate()
        return self.engine.resume(TX)

    def activate(self):
        return self.engine.activate_prepared(
            TX,
            (
                InitiatingProcessIdentity(123, "created")
                if self.initiator is UpdateInitiator.BROWSER
                else None
            ),
        )

    def operations(self):
        return tuple(value for kind, value in self.recording.events if kind == "before")

    def transitions(self):
        return tuple(value for kind, value in self.recording.events if kind == "transition")

    def clear_events(self):
        self.recording.events.clear()

    def finalize(self):
        return self.engine.finalize_terminal_evidence(TX)


class MatrixCoverageTests(unittest.TestCase):
    def test_literal_counts_are_frozen(self):
        self.assertEqual(len(OWNERSHIP_MODE_LABELS), EXPECTED_OWNERSHIP_MODE_COUNT)
        self.assertEqual(len(OPERATION_FAULT_AXES), EXPECTED_OPERATION_FAULT_AXIS_COUNT)
        self.assertEqual(len(TRANSITION_FAULT_AXES), EXPECTED_TRANSITION_FAULT_AXIS_COUNT)
        self.assertEqual(len(TERMINAL_OUTCOMES), EXPECTED_TERMINAL_OUTCOME_COUNT)
        self.assertEqual(len(PREPARING_ORPHAN_RECOVERY_OPERATIONS), EXPECTED_ORPHAN_RECOVERY_OPERATION_COUNT)
        expected_lengths = (
            (INSTALLED_PREPARATION_OPERATIONS, EXPECTED_INSTALLED_PREPARATION_OPERATION_COUNT),
            (LEGACY_PREPARATION_OPERATIONS, EXPECTED_LEGACY_PREPARATION_OPERATION_COUNT),
            (FRESH_SEEDED_PREPARATION_OPERATIONS, EXPECTED_FRESH_SEEDED_PREPARATION_OPERATION_COUNT),
            (FRESH_PREEXISTING_PREPARATION_OPERATIONS, EXPECTED_FRESH_PREEXISTING_PREPARATION_OPERATION_COUNT),
            (FRESH_POST_PLAN_USER_CREATION_PREPARATION_OPERATIONS, EXPECTED_FRESH_POST_PLAN_PREPARATION_OPERATION_COUNT),
            (INSTALLED_FORWARD_OPERATIONS, EXPECTED_INSTALLED_FORWARD_OPERATION_COUNT),
            (LEGACY_FORWARD_OPERATIONS, EXPECTED_LEGACY_FORWARD_OPERATION_COUNT),
            (FRESH_SEEDED_FORWARD_OPERATIONS, EXPECTED_FRESH_SEEDED_FORWARD_OPERATION_COUNT),
            (FRESH_PREEXISTING_FORWARD_OPERATIONS, EXPECTED_FRESH_PREEXISTING_FORWARD_OPERATION_COUNT),
            (FRESH_POST_PLAN_USER_CREATION_FORWARD_OPERATIONS, EXPECTED_FRESH_POST_PLAN_FORWARD_OPERATION_COUNT),
            (INSTALLED_ROLLBACK_OPERATIONS, EXPECTED_INSTALLED_ROLLBACK_OPERATION_COUNT),
            (LEGACY_ROLLBACK_OPERATIONS, EXPECTED_LEGACY_ROLLBACK_OPERATION_COUNT),
            (FRESH_SEEDED_ROLLBACK_OPERATIONS, EXPECTED_FRESH_SEEDED_ROLLBACK_OPERATION_COUNT),
            (FRESH_PREEXISTING_ROLLBACK_OPERATIONS, EXPECTED_FRESH_PREEXISTING_ROLLBACK_OPERATION_COUNT),
            (FRESH_POST_PLAN_USER_CREATION_ROLLBACK_OPERATIONS, EXPECTED_FRESH_POST_PLAN_ROLLBACK_OPERATION_COUNT),
        )
        for labels, expected in expected_lengths:
            self.assertEqual(len(labels), expected)
        for labels in FINALIZATION_BY_MODE.values():
            self.assertEqual(len(labels), EXPECTED_FINALIZATION_OPERATION_COUNT)
        self.assertEqual(len(FORWARD_TRANSITION_LABELS), EXPECTED_FORWARD_TRANSITION_LABEL_COUNT)
        self.assertEqual(len(ROLLBACK_TRANSITION_LABELS), EXPECTED_ROLLBACK_TRANSITION_LABEL_COUNT)
        self.assertEqual(
            len(FORWARD_TRANSITION_LABELS) + len(ROLLBACK_TRANSITION_LABELS),
            EXPECTED_TRANSITION_LABEL_COUNT,
        )
        preparation = sum(len(labels) for labels in PREPARATION_BY_MODE.values())
        forward = sum(len(labels) for labels in FORWARD_BY_MODE.values())
        rollback = sum(len(labels) for labels in ROLLBACK_BY_MODE.values())
        finalization = sum(len(labels) for labels in FINALIZATION_BY_MODE.values()) * len(TERMINAL_OUTCOMES)
        self.assertEqual(preparation, EXPECTED_PREPARATION_LABEL_CASES)
        self.assertEqual(len(OWNERSHIP_MODE_LABELS), EXPECTED_ORPHAN_RECOVERY_LABEL_CASES)
        self.assertEqual(forward, EXPECTED_FORWARD_LABEL_CASES)
        self.assertEqual(rollback, EXPECTED_ROLLBACK_LABEL_CASES)
        self.assertEqual(finalization, EXPECTED_FINALIZATION_LABEL_CASES)
        total = preparation + len(OWNERSHIP_MODE_LABELS) + forward + rollback + finalization
        self.assertEqual(total, EXPECTED_OPERATION_LABEL_CASES)
        self.assertEqual(total, EXPECTED_BEFORE_OPERATION_FAULT_CASES)
        self.assertEqual(total, EXPECTED_AFTER_OPERATION_CRASH_CASES)
        self.assertEqual(total, EXPECTED_SYNTHESIZED_POST_OPERATION_CASES)
        phases = len(FORWARD_TRANSITION_LABELS) + len(ROLLBACK_TRANSITION_LABELS)
        self.assertEqual(phases * len(OWNERSHIP_MODE_LABELS), EXPECTED_PHASE_TRANSITION_CRASH_CASES)
        self.assertEqual(2, EXPECTED_SEED_RECEIPT_TRANSITION_CRASH_CASES)
        self.assertEqual(
            EXPECTED_PHASE_TRANSITION_CRASH_CASES + EXPECTED_SEED_RECEIPT_TRANSITION_CRASH_CASES,
            EXPECTED_AFTER_TRANSITION_CRASH_CASES,
        )

    def test_no_fault_observations_equal_literal_mode_tuples(self):
        for mode in OWNERSHIP_MODE_LABELS:
            with self.subTest(mode=mode, outcome="committed"):
                with tempfile.TemporaryDirectory() as temporary:
                    fixture = MatrixHarness(Path(temporary), mode)
                    fixture.prepare()
                    preparation_count = len(fixture.operations())
                    result = fixture.activate_and_resume()
                    self.assertEqual(result.phase, JournalPhase.COMMITTED)
                    self.assertEqual(
                        fixture.operations()[:preparation_count],
                        PREPARATION_BY_MODE[mode],
                    )
                    self.assertEqual(
                        fixture.operations()[preparation_count:],
                        FORWARD_BY_MODE[mode],
                    )
                    expected_transitions = list(FORWARD_TRANSITION_LABELS)
                    if mode in ("fresh-seeded", "fresh-post-plan-user-creation"):
                        expected_transitions.insert(
                            expected_transitions.index("extension-installed"),
                            "extension-backed-up",
                        )
                    self.assertEqual(fixture.transitions(), tuple(expected_transitions))

            with self.subTest(mode=mode, outcome="rolled-back"):
                with tempfile.TemporaryDirectory() as temporary:
                    fixture = MatrixHarness(Path(temporary), mode, rollback=True)
                    fixture.prepare()
                    preparation_count = len(fixture.operations())
                    result = fixture.activate_and_resume()
                    self.assertEqual(result.phase, JournalPhase.ROLLED_BACK)
                    forward_count = len(FORWARD_BY_MODE[mode])
                    self.assertEqual(
                        fixture.operations()[preparation_count:preparation_count + forward_count],
                        FORWARD_BY_MODE[mode],
                    )
                    self.assertEqual(
                        fixture.operations()[preparation_count + forward_count:],
                        ROLLBACK_BY_MODE[mode],
                    )

    def test_no_fault_finalization_observes_exact_tuple(self):
        for mode in OWNERSHIP_MODE_LABELS:
            for rollback in (False, True):
                with self.subTest(mode=mode, rollback=rollback):
                    with tempfile.TemporaryDirectory() as temporary:
                        fixture = MatrixHarness(Path(temporary), mode, rollback=rollback)
                        fixture.prepare()
                        result = fixture.activate_and_resume()
                        self.assertEqual(
                            result.phase,
                            JournalPhase.ROLLED_BACK if rollback else JournalPhase.COMMITTED,
                        )
                        fixture.clear_events()
                        self.assertTrue(fixture.finalize())
                        self.assertEqual(
                            fixture.operations(),
                            FINALIZATION_BY_MODE[mode],
                        )

    def test_installer_activation_skips_wait_in_four_modes(self):
        for mode in (
            "installed",
            "legacy",
            "fresh-seeded",
            "fresh-preexisting",
        ):
            with self.subTest(mode=mode):
                with tempfile.TemporaryDirectory() as temporary:
                    fixture = MatrixHarness(
                        Path(temporary),
                        mode,
                        initiator=UpdateInitiator.INSTALLER,
                    )
                    fixture.prepare()
                    self.assertEqual(
                        fixture.activate_and_resume().phase,
                        JournalPhase.COMMITTED,
                    )
                    self.assertEqual(fixture.recording.waited_processes, [])


class ForwardFaultMatrixTests(unittest.TestCase):
    def _exercise_preparation_case(self, mode, label, axis, *, orphan=False):
        with tempfile.TemporaryDirectory() as temporary:
            fixture = MatrixHarness(Path(temporary), mode)
            before = live_snapshot(fixture.install)
            if orphan:
                paths = TransactionPaths.for_install(fixture.install, TX)
                paths.preparing_root.mkdir(parents=True)
            if axis == "before-operation":
                fixture.controller.arm("before", label, InjectedFault)
                with self.assertRaises(UpdateEngineError):
                    fixture.prepare()
            elif axis == "after-operation":
                fixture.controller.arm("after", label, InjectedCrash)
                with self.assertRaises(InjectedCrash):
                    fixture.prepare()
            else:
                fixture.rebuild_engine(synthesized_label=label)
                with self.assertRaises(InjectedCrash):
                    fixture.prepare()
                self.assertTrue(fixture.engine.synthesized)
            self.assertEqual(live_snapshot(fixture.install), before)
            fixture.controller.clear()
            fixture.rebuild_engine()
            prepared = fixture.prepare()
            self.assertEqual(prepared.phase, JournalPhase.PREPARED)
            self.assertEqual(
                fixture.activate_and_resume().phase,
                JournalPhase.COMMITTED,
            )

    def _assert_fresh_rollback_boundary(self, fixture):
        self.assertFalse((fixture.install / "dh_native_host.exe").exists())
        self.assertFalse((fixture.install / "extension").exists())
        self.assertFalse((fixture.install / "release-integrity.json").exists())
        self.assertFalse((fixture.install / "installed-product.json").exists())

    def _exercise_forward_case(self, mode, label, axis):
        with tempfile.TemporaryDirectory() as temporary:
            fixture = MatrixHarness(Path(temporary), mode)
            fixture.prepare()
            before = live_snapshot(fixture.install)
            if axis == "before-operation":
                fixture.controller.arm("before", label, InjectedFault)
                fixture.activate()
                result = fixture.engine.resume(TX)
                self.assertEqual(result.phase, JournalPhase.ROLLED_BACK)
                if mode in ("installed", "legacy", "fresh-preexisting", "fresh-post-plan-user-creation"):
                    self.assertEqual(live_snapshot(fixture.install), before)
                else:
                    self._assert_fresh_rollback_boundary(fixture)
                return
            if axis == "after-operation":
                fixture.controller.arm("after", label, InjectedCrash)
            else:
                fixture.rebuild_engine(synthesized_label=label)
            fixture.activate()
            with self.assertRaises(InjectedCrash):
                fixture.engine.resume(TX)
            if axis == "synthesized-post-operation-pre-transition":
                self.assertTrue(fixture.engine.synthesized)
            fixture.controller.clear()
            fixture.rebuild_engine()
            self.assertEqual(fixture.engine.resume(TX).phase, JournalPhase.COMMITTED)

    def test_before_operation_fault_matrix(self):
        axis = "before-operation"
        for mode in OWNERSHIP_MODE_LABELS:
            with self.subTest(mode=mode, label=PREPARING_ORPHAN_RECOVERY_OPERATIONS[0]):
                self._exercise_preparation_case(
                    mode,
                    PREPARING_ORPHAN_RECOVERY_OPERATIONS[0],
                    axis,
                    orphan=True,
                )
            for label in PREPARATION_BY_MODE[mode]:
                with self.subTest(mode=mode, label=label):
                    self._exercise_preparation_case(mode, label, axis)
            for label in FORWARD_BY_MODE[mode]:
                with self.subTest(mode=mode, label=label):
                    self._exercise_forward_case(mode, label, axis)

    def test_after_operation_crash_matrix(self):
        axis = "after-operation"
        for mode in OWNERSHIP_MODE_LABELS:
            with self.subTest(mode=mode, label=PREPARING_ORPHAN_RECOVERY_OPERATIONS[0]):
                self._exercise_preparation_case(
                    mode,
                    PREPARING_ORPHAN_RECOVERY_OPERATIONS[0],
                    axis,
                    orphan=True,
                )
            for label in PREPARATION_BY_MODE[mode]:
                with self.subTest(mode=mode, label=label):
                    self._exercise_preparation_case(mode, label, axis)
            for label in FORWARD_BY_MODE[mode]:
                with self.subTest(mode=mode, label=label):
                    self._exercise_forward_case(mode, label, axis)

    def test_synthesized_post_operation_matrix(self):
        axis = "synthesized-post-operation-pre-transition"
        for mode in OWNERSHIP_MODE_LABELS:
            with self.subTest(mode=mode, label=PREPARING_ORPHAN_RECOVERY_OPERATIONS[0]):
                self._exercise_preparation_case(
                    mode,
                    PREPARING_ORPHAN_RECOVERY_OPERATIONS[0],
                    axis,
                    orphan=True,
                )
            for label in PREPARATION_BY_MODE[mode]:
                with self.subTest(mode=mode, label=label):
                    self._exercise_preparation_case(mode, label, axis)
            for label in FORWARD_BY_MODE[mode]:
                with self.subTest(mode=mode, label=label):
                    self._exercise_forward_case(mode, label, axis)

    def _exercise_forward_transition(self, mode, label):
        with tempfile.TemporaryDirectory() as temporary:
            fixture = MatrixHarness(Path(temporary), mode)
            fixture.controller.arm("transition", label, InjectedCrash)
            if label in ("staging", "prepared"):
                with self.assertRaises(InjectedCrash):
                    fixture.prepare()
                fixture.controller.clear()
                fixture.rebuild_engine()
                fixture.prepare()
                fixture.activate()
            else:
                fixture.prepare()
                if label == "waiting-for-host-exit":
                    with self.assertRaises(InjectedCrash):
                        fixture.activate()
                else:
                    fixture.activate()
                    with self.assertRaises(InjectedCrash):
                        fixture.engine.resume(TX)
                fixture.controller.clear()
                fixture.rebuild_engine()
            self.assertEqual(fixture.engine.resume(TX).phase, JournalPhase.COMMITTED)

    def _exercise_rollback_transition(self, mode, label):
        with tempfile.TemporaryDirectory() as temporary:
            fixture = MatrixHarness(Path(temporary), mode, rollback=True)
            fixture.prepare()
            fixture.activate()
            if label == "recovery-required":
                first_reverse = ROLLBACK_BY_MODE[mode][0]
                fixture.controller.add("before", first_reverse, InjectedFault)
                fixture.controller.add(
                    "transition", "recovery-required", InjectedCrash
                )
            else:
                fixture.controller.arm("transition", label, InjectedCrash)
            with self.assertRaises(InjectedCrash):
                fixture.engine.resume(TX)
            fixture.controller.clear()
            fixture.rebuild_engine()
            if label == "recovery-required":
                self.assertEqual(
                    fixture.engine.resume(TX).phase,
                    JournalPhase.RECOVERY_REQUIRED,
                )
                result = fixture.engine.rollback(
                    TX, JournalReason.STARTUP_PROBE_FAILED
                )
            else:
                result = fixture.engine.resume(TX)
            self.assertEqual(result.phase, JournalPhase.ROLLED_BACK)

    def test_phase_transition_crash_matrix(self):
        for mode in OWNERSHIP_MODE_LABELS:
            for label in FORWARD_TRANSITION_LABELS:
                with self.subTest(mode=mode, label=label):
                    self._exercise_forward_transition(mode, label)
            for label in ROLLBACK_TRANSITION_LABELS:
                with self.subTest(mode=mode, label=label):
                    self._exercise_rollback_transition(mode, label)

    def test_seed_receipt_transition_crash_matrix(self):
        for mode in ("fresh-seeded", "fresh-post-plan-user-creation"):
            with self.subTest(mode=mode):
                with tempfile.TemporaryDirectory() as temporary:
                    fixture = MatrixHarness(Path(temporary), mode)
                    fixture.prepare()
                    fixture.activate()
                    fixture.controller.arm(
                        "transition",
                        "extension-backed-up",
                        InjectedCrash,
                        occurrence=2,
                    )
                    with self.assertRaises(InjectedCrash):
                        fixture.engine.resume(TX)
                    fixture.controller.clear()
                    fixture.rebuild_engine()
                    result = fixture.engine.resume(TX)
                    self.assertEqual(result.phase, JournalPhase.COMMITTED)
                    self.assertIsNotNone(result.seed_receipt)


class RollbackFaultMatrixTests(unittest.TestCase):
    def _exercise_reverse_case(self, mode, label, axis):
        with tempfile.TemporaryDirectory() as temporary:
            fixture = MatrixHarness(Path(temporary), mode, rollback=True)
            fixture.prepare()
            expected = live_snapshot(fixture.install)
            if mode == "fresh-seeded":
                expected["config.json"] = b"{}\n"
            fixture.activate()
            if axis == "before-operation":
                fixture.controller.arm("before", label, InjectedFault)
                result = fixture.engine.resume(TX)
                self.assertEqual(result.phase, JournalPhase.RECOVERY_REQUIRED)
                self.assertEqual(
                    result.original_failure_code,
                    JournalReason.STARTUP_PROBE_FAILED,
                )
                fixture.controller.clear()
                fixture.rebuild_engine()
                result = fixture.engine.rollback(
                    TX, JournalReason.STARTUP_PROBE_FAILED
                )
                self.assertEqual(result.phase, JournalPhase.ROLLED_BACK)
                self.assertEqual(live_snapshot(fixture.install), expected)
                return
            if axis == "after-operation":
                fixture.controller.arm("after", label, InjectedCrash)
            else:
                fixture.rebuild_engine(synthesized_label=label)
            with self.assertRaises(InjectedCrash):
                fixture.engine.resume(TX)
            if axis == "synthesized-post-operation-pre-transition":
                self.assertTrue(fixture.engine.synthesized)
            fixture.controller.clear()
            fixture.rebuild_engine()
            self.assertEqual(
                fixture.engine.resume(TX).phase,
                JournalPhase.ROLLED_BACK,
            )
            self.assertEqual(live_snapshot(fixture.install), expected)

    def _exercise_finalization_case(self, mode, rollback, label, axis):
        with tempfile.TemporaryDirectory() as temporary:
            fixture = MatrixHarness(Path(temporary), mode, rollback=rollback)
            fixture.prepare()
            fixture.activate_and_resume()
            fixture.clear_events()
            if axis == "before-operation":
                fixture.controller.arm("before", label, InjectedFault)
                with self.assertRaises(UpdateEngineError):
                    fixture.finalize()
                fixture.controller.clear()
                fixture.rebuild_engine()
                self.assertTrue(fixture.finalize())
                return
            if axis == "after-operation":
                fixture.controller.arm("after", label, InjectedCrash)
            else:
                fixture.rebuild_engine(synthesized_label=label)
            with self.assertRaises(InjectedCrash):
                fixture.finalize()
            if axis == "synthesized-post-operation-pre-transition":
                self.assertTrue(fixture.engine.synthesized)
            fixture.controller.clear()
            fixture.rebuild_engine()
            if label == "active:remove":
                self.assertTrue(fixture.finalize())
                self.assertFalse(fixture.finalize())
            else:
                self.assertFalse(fixture.finalize())

    def test_before_operation_fault_matrix(self):
        axis = "before-operation"
        for mode in OWNERSHIP_MODE_LABELS:
            for label in ROLLBACK_BY_MODE[mode]:
                with self.subTest(mode=mode, label=label):
                    self._exercise_reverse_case(mode, label, axis)
            for rollback in (False, True):
                for label in FINALIZATION_BY_MODE[mode]:
                    with self.subTest(
                        mode=mode,
                        rollback=rollback,
                        label=label,
                    ):
                        self._exercise_finalization_case(
                            mode, rollback, label, axis
                        )

    def test_after_operation_crash_matrix(self):
        axis = "after-operation"
        for mode in OWNERSHIP_MODE_LABELS:
            for label in ROLLBACK_BY_MODE[mode]:
                with self.subTest(mode=mode, label=label):
                    self._exercise_reverse_case(mode, label, axis)
            for rollback in (False, True):
                for label in FINALIZATION_BY_MODE[mode]:
                    with self.subTest(
                        mode=mode,
                        rollback=rollback,
                        label=label,
                    ):
                        self._exercise_finalization_case(
                            mode, rollback, label, axis
                        )

    def test_synthesized_post_operation_matrix(self):
        axis = "synthesized-post-operation-pre-transition"
        for mode in OWNERSHIP_MODE_LABELS:
            for label in ROLLBACK_BY_MODE[mode]:
                with self.subTest(mode=mode, label=label):
                    self._exercise_reverse_case(mode, label, axis)
            for rollback in (False, True):
                for label in FINALIZATION_BY_MODE[mode]:
                    with self.subTest(
                        mode=mode,
                        rollback=rollback,
                        label=label,
                    ):
                        self._exercise_finalization_case(
                            mode, rollback, label, axis
                        )

    def test_terminal_cleanup_replays_after_active_removal_crash(self):
        with tempfile.TemporaryDirectory() as temporary:
            fixture = MatrixHarness(Path(temporary), "fresh-preexisting")
            fixture.prepare()
            fixture.activate_and_resume()
            fixture.clear_events()
            fixture.controller.arm("after", "active:remove", InjectedCrash)
            with self.assertRaises(InjectedCrash):
                fixture.finalize()
            fixture.controller.clear()
            fixture.rebuild_engine()
            self.assertTrue(fixture.finalize())
            self.assertFalse(fixture.finalize())


class OwnershipBoundaryTests(unittest.TestCase):
    def test_corrupt_active_prepared_workspace_blocks_replay(self):
        with tempfile.TemporaryDirectory() as temporary:
            fixture = MatrixHarness(Path(temporary), "fresh-preexisting")
            fixture.prepare()
            paths = TransactionPaths.for_install(fixture.install, TX)
            (paths.staged_host / "helper.dll").write_bytes(b"corrupt-staged")
            with self.assertRaises(PreparedTransactionConflict):
                fixture.prepare()
            self.assertTrue(paths.active.exists())

    def test_corrupt_promoted_workspace_blocks_active_repair(self):
        with tempfile.TemporaryDirectory() as temporary:
            fixture = MatrixHarness(Path(temporary), "fresh-preexisting")
            fixture.controller.arm(
                "after", "workspace:promote-preparing", InjectedCrash
            )
            with self.assertRaises(InjectedCrash):
                fixture.prepare()
            paths = TransactionPaths.for_install(fixture.install, TX)
            (paths.staged_host / "helper.dll").write_bytes(b"corrupt-staged")
            fixture.controller.clear()
            fixture.rebuild_engine()
            with self.assertRaises(PreparedTransactionConflict):
                fixture.prepare()
            self.assertFalse(paths.active.exists())

    def test_corrupt_staged_seed_is_never_installed(self):
        with tempfile.TemporaryDirectory() as temporary:
            fixture = MatrixHarness(Path(temporary), "fresh-seeded")
            fixture.prepare()
            paths = TransactionPaths.for_install(fixture.install, TX)
            (paths.staged_host / "config.json").write_bytes(b"corrupt-seed")
            fixture.activate()
            result = fixture.engine.resume(TX)
            self.assertEqual(result.phase, JournalPhase.ROLLED_BACK)
            self.assertFalse((fixture.install / "config.json").exists())

    def test_metadata_staged_absent_live_exact_replays_to_commit(self):
        with tempfile.TemporaryDirectory() as temporary:
            fixture = MatrixHarness(Path(temporary), "fresh-preexisting")
            fixture.prepare()
            fixture.activate()
            fixture.controller.arm(
                "transition", "extension-installed", InjectedCrash
            )
            with self.assertRaises(InjectedCrash):
                fixture.engine.resume(TX)
            paths = TransactionPaths.for_install(fixture.install, TX)
            for name in ("release-integrity.json", "installed-product.json"):
                staged = paths.staged_host / name
                shutil.copy2(staged, fixture.install / name)
                staged.unlink()
            fixture.controller.clear()
            fixture.rebuild_engine()
            self.assertEqual(fixture.engine.resume(TX).phase, JournalPhase.COMMITTED)

    def test_probe_requires_exact_live_product_before_commit(self):
        with tempfile.TemporaryDirectory() as temporary:
            fixture = MatrixHarness(Path(temporary), "fresh-preexisting")
            fixture.prepare()
            fixture.activate()

            def corrupt_after_probe(path, plan):
                fixture.recording.probe_installed_product(path, plan)
                (fixture.install / "helper.dll").write_bytes(b"corrupt-live")

            object.__setattr__(
                fixture.engine.hooks,
                "probe_installed_product",
                corrupt_after_probe,
            )
            result = fixture.engine.resume(TX)
            self.assertEqual(result.phase, JournalPhase.RECOVERY_REQUIRED)
            self.assertEqual(
                result.original_failure_code,
                JournalReason.STARTUP_PROBE_FAILED,
            )

    def test_missing_required_seed_receipt_is_state_conflict(self):
        with tempfile.TemporaryDirectory() as temporary:
            fixture = MatrixHarness(Path(temporary), "fresh-seeded")
            fixture.prepare()
            fixture.activate()
            fixture.controller.arm(
                "transition", "extension-installed", InjectedCrash
            )
            with self.assertRaises(InjectedCrash):
                fixture.engine.resume(TX)
            paths = TransactionPaths.for_install(fixture.install, TX)
            value = json.loads(paths.journal.read_text(encoding="utf-8"))
            value["seed_receipt"] = None
            paths.journal.write_text(
                json.dumps(
                    value,
                    ensure_ascii=True,
                    allow_nan=False,
                    sort_keys=True,
                    separators=(",", ":"),
                )
                + "\n",
                encoding="utf-8",
            )
            fixture.controller.clear()
            fixture.rebuild_engine()
            with self.assertRaises(UpdateStateConflict):
                fixture.engine.resume(TX)

    def test_unittest_class_map_is_exact(self):
        tree = ast.parse(Path(__file__).read_text(encoding="utf-8"))
        names = {
            node.name
            for node in tree.body
            if isinstance(node, ast.ClassDef)
            and any(
                (
                    isinstance(base, ast.Attribute)
                    and base.attr == "TestCase"
                )
                or isinstance(base, ast.Name)
                and base.id == "TestCase"
                for base in node.bases
            )
        }
        self.assertEqual(
            names,
            {
                "MatrixCoverageTests",
                "ForwardFaultMatrixTests",
                "RollbackFaultMatrixTests",
                "OwnershipBoundaryTests",
            },
        )

    def test_transaction_writers_have_single_production_owner(self):
        root = Path(__file__).parent
        modules = (
            root / "update_journal.py",
            root / "update_engine.py",
            root / "update_ownership.py",
            root / "update_mutex.py",
        )
        symbols = {
            "transition",
            "write_journal_atomic",
            "write_active_transaction_atomic",
        }
        definitions = {symbol: set() for symbol in symbols}
        calls = {symbol: set() for symbol in symbols}
        for path in modules:
            tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
            for node in ast.walk(tree):
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    if node.name in symbols:
                        definitions[node.name].add(path.name)
                if isinstance(node, ast.Call):
                    name = None
                    if isinstance(node.func, ast.Name):
                        name = node.func.id
                    elif isinstance(node.func, ast.Attribute):
                        name = node.func.attr
                    if name in symbols:
                        calls[name].add(path.name)
        for symbol in symbols:
            self.assertEqual(definitions[symbol], {"update_journal.py"})
            self.assertEqual(calls[symbol], {"update_engine.py"})

    def test_required_engine_recognizers_exist(self):
        required = {
            "_classify_file",
            "_classify_tree",
            "_classify_transfer",
            "_preflight_phase",
            "_resume_preparation",
            "_resume_host_backup",
            "_resume_host_install",
            "_resume_extension_backup",
            "_resume_extension_install",
            "_resume_metadata_install",
            "_resume_probe",
            "_resume_rollback",
            "_preflight_remove_new",
            "_preflight_restore_prior",
            "_finalize_terminal_evidence",
        }
        tree = ast.parse(
            (Path(__file__).parent / "update_engine.py").read_text(encoding="utf-8")
        )
        names = {
            node.name
            for node in ast.walk(tree)
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
        }
        self.assertLessEqual(required, names)


if __name__ == "__main__":
    unittest.main()
