import ast
import inspect
import json
import os
import shutil
import stat
import tempfile
import time
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

import update_engine

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
    ActiveTransaction,
    InitiatingProcessIdentity,
    JournalPhase,
    JournalReason,
    TransactionPaths,
    UpdateInitiator,
    read_active_transaction,
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


class PreparingPromotionRetryTests(unittest.TestCase):
    PROMOTION_LABEL = "workspace:promote-preparing"

    JOURNAL_MUTATIONS = {
        "journal-schema-version": ("schema_version", 2),
        "journal-transaction-id": (
            "transaction_id",
            "ffffffffffffffffffffffffffffffff",
        ),
        "journal-phase": ("phase", "staging"),
        "journal-initiator": ("initiator", "installer"),
        "journal-target-version": ("target_version", "9.9.9"),
        "journal-prior-version": ("prior_version", "old-version"),
        "journal-fresh-install": ("fresh_install", True),
        "journal-ownership-digest": ("ownership_sha256", "0" * 64),
        "journal-reason-code": ("reason_code", "host_install_failed"),
        "journal-original-failure": (
            "original_failure_code",
            "host_install_failed",
        ),
        "journal-rollback-from": ("rollback_from", "host-installed"),
        "journal-initiating-process": (
            "initiating_process",
            {"pid": 7, "creation_token": "mutated"},
        ),
        "journal-ownership-path": ("ownership_path", "other.json"),
        "journal-seed-receipt": (
            "seed_receipt",
            {
                "path": "config.json",
                "expected_sha256": "1" * 64,
                "seed_installed": False,
                "observed_live_sha256": None,
            },
        ),
    }

    REVALIDATION_MUTATIONS = (
        "source-disappears",
        "destination-created",
        *JOURNAL_MUTATIONS,
        "ownership-bytes",
        "probe-manifest",
        "host-digest",
        "host-inventory",
        "extension-digest",
        "extension-inventory",
        "extra-workspace-topology",
        "updates-root-symlink",
        "updates-root-reparse",
        "transactions-root-symlink",
        "transactions-root-reparse",
        "preparing-root-symlink",
        "preparing-root-reparse",
        "descendant-symlink",
        "descendant-reparse",
        "descendant-unsupported",
        "updates-root-canonical-escape",
        "transactions-root-canonical-escape",
        "preparing-root-canonical-escape",
        "destination-canonical-escape",
        "state-read-error",
    )

    def _require_retry_implementation(self):
        sentinel = object()
        problems = []
        expected_module_values = (
            ("_replace_path", os.replace, None),
            ("_sleep", time.sleep, None),
            ("_is_windows", os.name == "nt", bool),
            ("PROMOTION_RETRY_DELAYS", (0.05, 0.2), tuple),
            (
                "PROMOTION_TRANSIENT_WINERRORS",
                frozenset((5, 32, 33)),
                frozenset,
            ),
        )
        for name, expected, expected_type in expected_module_values:
            actual = getattr(update_engine, name, sentinel)
            if actual is sentinel:
                problems.append(f"missing update_engine.{name}")
            elif name in ("_replace_path", "_sleep"):
                if actual is not expected:
                    problems.append(f"update_engine.{name} has wrong default")
            elif type(actual) is not expected_type or actual != expected:
                problems.append(f"update_engine.{name} has wrong value")

        expected_parameters = (
            "self",
            "package",
            "candidate",
            "candidate_bytes",
            "paths",
            "staging",
        )
        for name in (
            "_promote_preparing_with_retry",
            "_require_preparing_promotion_candidate",
        ):
            method = getattr(UpdateEngine, name, sentinel)
            if method is sentinel:
                problems.append(f"missing UpdateEngine.{name}")
            elif not callable(method):
                problems.append(f"UpdateEngine.{name} is not callable")
            else:
                try:
                    parameters = tuple(inspect.signature(method).parameters)
                except (TypeError, ValueError):
                    parameters = ()
                if parameters != expected_parameters:
                    problems.append(f"UpdateEngine.{name} has wrong signature")

        if problems:
            self.fail(
                "preparing-promotion retry implementation mismatch: "
                + "; ".join(problems)
            )

    @staticmethod
    def _windows_error(winerror):
        error = OSError("synthetic promotion failure")
        error.winerror = winerror
        return error

    @staticmethod
    def _canonical_json_bytes(value):
        return (
            json.dumps(
                value,
                ensure_ascii=True,
                allow_nan=False,
                sort_keys=True,
                separators=(",", ":"),
            )
            + "\n"
        ).encode("utf-8")

    @staticmethod
    def _tree_snapshot(root):
        if not root.exists():
            return None
        result = {"": ("directory", None)}
        for path in sorted(root.rglob("*"), key=lambda item: item.as_posix()):
            relative = path.relative_to(root).as_posix()
            info = path.lstat()
            if stat.S_ISDIR(info.st_mode):
                result[relative] = ("directory", None)
            elif stat.S_ISREG(info.st_mode):
                result[relative] = ("file", path.read_bytes())
            else:
                result[relative] = ("other", None)
        return result

    def _apply_revalidation_mutation(self, name, paths, faults, external):
        if name == "source-disappears":
            shutil.rmtree(paths.preparing_root)
            return
        if name == "destination-created":
            paths.transaction_root.mkdir()
            return
        if name in self.JOURNAL_MUTATIONS:
            key, replacement = self.JOURNAL_MUTATIONS[name]
            value = json.loads(
                paths.preparing_journal.read_text(encoding="utf-8")
            )
            value[key] = replacement
            paths.preparing_journal.write_bytes(self._canonical_json_bytes(value))
            return
        if name == "ownership-bytes":
            value = json.loads(
                paths.preparing_ownership.read_text(encoding="utf-8")
            )
            value["host_backup_roots"] = ["unexpected"]
            paths.preparing_ownership.write_bytes(
                self._canonical_json_bytes(value)
            )
            return
        if name == "probe-manifest":
            paths.preparing_probe_manifest.write_bytes(
                paths.preparing_probe_manifest.read_bytes() + b" "
            )
            return
        if name == "host-digest":
            (paths.preparing_staged_host / "helper.dll").write_bytes(
                b"mutated-host"
            )
            return
        if name == "host-inventory":
            (paths.preparing_staged_host / "unexpected.dll").write_bytes(
                b"unexpected"
            )
            return
        if name == "extension-digest":
            (paths.preparing_staged_extension / "assets/app.js").write_bytes(
                b"mutated-extension"
            )
            return
        if name == "extension-inventory":
            (paths.preparing_staged_extension / "unexpected.js").write_bytes(
                b"unexpected"
            )
            return
        if name == "extra-workspace-topology":
            (paths.preparing_root / "unexpected.bin").write_bytes(b"unexpected")
            return

        lstat_targets = {
            "updates-root": paths.updates_root,
            "transactions-root": paths.transactions_root,
            "preparing-root": paths.preparing_root,
            "descendant": paths.preparing_staged_host / "_internal",
        }
        if name.endswith("-symlink") or name.endswith("-reparse"):
            component, kind = name.rsplit("-", 1)
            faults["lstat"] = (lstat_targets[component], kind)
            return
        if name == "descendant-unsupported":
            faults["lstat"] = (
                paths.preparing_staged_host / "helper.dll",
                "unsupported",
            )
            return

        resolve_targets = {
            "updates-root": paths.updates_root,
            "transactions-root": paths.transactions_root,
            "preparing-root": paths.preparing_root,
            "destination": paths.transaction_root,
        }
        if name.endswith("-canonical-escape"):
            component = name.removesuffix("-canonical-escape")
            faults["resolve"] = (resolve_targets[component], external)
            return
        if name == "state-read-error":
            faults["read_text"] = paths.preparing_journal
            return
        raise AssertionError(f"unknown revalidation mutation: {name}")

    def _exercise_promotion(
        self,
        replace_outcomes,
        *,
        is_windows=True,
        mutation=None,
        hook_fault=None,
    ):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve()
            fixture = MatrixHarness(root, "installed")
            paths = TransactionPaths.for_install(fixture.install, TX)
            external = root / "external"
            external.mkdir()
            if hook_fault is not None:
                fixture.controller.arm(
                    hook_fault,
                    self.PROMOTION_LABEL,
                    InjectedFault,
                )

            live_before = live_snapshot(fixture.install)
            real_replace = os.replace
            real_lstat = Path.lstat
            real_resolve = Path.resolve
            real_read_text = Path.read_text
            real_validator = fixture.engine._require_preparing_promotion_candidate
            replace_calls = []
            replacement_errors = []
            delays = []
            sequence = []
            validation_count = 0
            candidate_snapshot = None
            mutation_applied = False
            faults = {"lstat": None, "resolve": None, "read_text": None}

            def apply_mutation_once():
                nonlocal mutation_applied
                if mutation_applied:
                    return
                self._apply_revalidation_mutation(
                    mutation[1],
                    paths,
                    faults,
                    external,
                )
                mutation_applied = True

            def validating(*args):
                nonlocal candidate_snapshot, validation_count
                validation_count += 1
                sequence.append(("validate", validation_count))
                if candidate_snapshot is None:
                    candidate_snapshot = self._tree_snapshot(paths.preparing_root)
                if (
                    mutation is not None
                    and mutation[0] == "initial"
                    and validation_count == 1
                ):
                    apply_mutation_once()
                if (
                    mutation is not None
                    and mutation[0] == "pre-sleep"
                    and validation_count == 2
                ):
                    apply_mutation_once()
                return real_validator(*args)

            def replacing(source, destination):
                attempt = len(replace_calls) + 1
                replace_calls.append((Path(source), Path(destination)))
                sequence.append(("replace", attempt))
                if (
                    mutation is not None
                    and mutation[0] == "pre-replace"
                    and attempt == 1
                ):
                    apply_mutation_once()
                if callable(replace_outcomes):
                    action = replace_outcomes(attempt)
                elif attempt <= len(replace_outcomes):
                    action = replace_outcomes[attempt - 1]
                else:
                    action = AssertionError(
                        "unexpected additional promotion attempt"
                    )
                if action is None:
                    return real_replace(source, destination)
                if not isinstance(action, BaseException):
                    raise AssertionError("invalid replacement outcome")
                replacement_errors.append(action)
                raise action

            def sleeping(delay):
                delays.append(delay)
                sequence.append(("sleep", delay))
                if mutation is not None and mutation[0] == "post-sleep":
                    apply_mutation_once()

            def lstat(path, *args, **kwargs):
                target = faults["lstat"]
                if target is None or path != target[0]:
                    return real_lstat(path, *args, **kwargs)
                info = real_lstat(path, *args, **kwargs)
                kind = target[1]
                if kind == "symlink":
                    return SimpleNamespace(
                        st_mode=stat.S_IFLNK | stat.S_IMODE(info.st_mode),
                        st_file_attributes=0,
                    )
                if kind == "reparse":
                    return SimpleNamespace(
                        st_mode=info.st_mode,
                        st_file_attributes=0x400,
                    )
                return SimpleNamespace(
                    st_mode=stat.S_IFIFO,
                    st_file_attributes=0,
                )

            def resolve(path, *args, **kwargs):
                target = faults["resolve"]
                if target is not None and path == target[0]:
                    return target[1]
                return real_resolve(path, *args, **kwargs)

            def read_text(path, *args, **kwargs):
                if (
                    faults["read_text"] is not None
                    and path == faults["read_text"]
                ):
                    raise OSError("synthetic state-read failure")
                return real_read_text(path, *args, **kwargs)

            result = None
            outcome_error = None
            with (
                mock.patch.object(update_engine, "_replace_path", replacing),
                mock.patch.object(update_engine, "_sleep", sleeping),
                mock.patch.object(update_engine, "_is_windows", is_windows),
                mock.patch.object(
                    fixture.engine,
                    "_require_preparing_promotion_candidate",
                    side_effect=validating,
                ),
                mock.patch.object(Path, "lstat", lstat),
                mock.patch.object(Path, "resolve", resolve),
                mock.patch.object(Path, "read_text", read_text),
            ):
                try:
                    result = fixture.prepare()
                except Exception as error:
                    outcome_error = error

            active_value = None
            active_error = None
            if paths.active.exists():
                try:
                    active_value = read_active_transaction(paths.active)
                except Exception as error:
                    active_error = error
            events = tuple(fixture.recording.events)
            return {
                "result": result,
                "error": outcome_error,
                "cause": (
                    outcome_error.__cause__
                    if outcome_error is not None
                    else None
                ),
                "attempts": len(replace_calls),
                "replace_calls": tuple(replace_calls),
                "expected_replace": (
                    paths.preparing_root,
                    paths.transaction_root,
                ),
                "replacement_errors": tuple(replacement_errors),
                "delays": tuple(delays),
                "validations": validation_count,
                "sequence": tuple(sequence),
                "candidate_snapshot": candidate_snapshot,
                "preparing_snapshot": self._tree_snapshot(paths.preparing_root),
                "final_snapshot": self._tree_snapshot(paths.transaction_root),
                "preparing_exists": paths.preparing_root.exists(),
                "final_exists": paths.transaction_root.exists(),
                "active_exists": paths.active.exists(),
                "active": active_value,
                "active_error": active_error,
                "live_before": live_before,
                "live_after": live_snapshot(fixture.install),
                "hook_before": sum(
                    kind == "before" and label == self.PROMOTION_LABEL
                    for kind, label in events
                ),
                "hook_after": sum(
                    kind == "after" and label == self.PROMOTION_LABEL
                    for kind, label in events
                ),
            }

    def _assert_replace_calls(self, case, count, label):
        self.assertEqual(
            case["replace_calls"],
            (case["expected_replace"],) * count,
            label,
        )

    def _assert_active_is_exact(self, case, label):
        self.assertIsNone(case["active_error"], label)
        self.assertEqual(
            case["active"],
            ActiveTransaction(1, TX, f"transactions/{TX}/journal.json"),
            label,
        )

    def _assert_first_success(self, case, label):
        self.assertIsNone(case["error"], label)
        self.assertEqual(case["result"].phase, JournalPhase.PREPARED, label)
        self.assertEqual(case["attempts"], 1, label)
        self.assertEqual(case["delays"], (), label)
        self.assertEqual(case["validations"], 1, label)
        self._assert_replace_calls(case, 1, label)
        self.assertFalse(case["preparing_exists"], label)
        self.assertTrue(case["final_exists"], label)
        self.assertEqual(case["final_snapshot"], case["candidate_snapshot"], label)
        self.assertTrue(case["active_exists"], label)
        self._assert_active_is_exact(case, label)
        self.assertEqual(case["live_after"], case["live_before"], label)
        self.assertEqual(case["hook_before"], 1, label)
        self.assertEqual(case["hook_after"], 1, label)

    def _assert_retry_success(self, case, label):
        self.assertIsNone(case["error"], label)
        self.assertEqual(case["result"].phase, JournalPhase.PREPARED, label)
        self.assertEqual(case["attempts"], 2, label)
        self.assertEqual(case["delays"], (0.05,), label)
        self.assertEqual(case["validations"], 3, label)
        self._assert_replace_calls(case, 2, label)
        self.assertFalse(case["preparing_exists"], label)
        self.assertTrue(case["final_exists"], label)
        self.assertEqual(case["final_snapshot"], case["candidate_snapshot"], label)
        self.assertTrue(case["active_exists"], label)
        self._assert_active_is_exact(case, label)
        self.assertEqual(case["live_after"], case["live_before"], label)
        self.assertEqual(case["hook_before"], 1, label)
        self.assertEqual(case["hook_after"], 1, label)

    def _assert_exhausted(self, case, label):
        self.assertEqual(case["attempts"], 3, label)
        self.assertEqual(case["delays"], (0.05, 0.2), label)
        self.assertEqual(case["validations"], 5, label)
        self._assert_replace_calls(case, 3, label)
        self.assertIs(type(case["error"]), PreparedTransactionConflict, label)
        self.assertEqual(len(case["replacement_errors"]), 3, label)
        self.assertIs(case["cause"], case["replacement_errors"][-1], label)
        self.assertTrue(case["preparing_exists"], label)
        self.assertFalse(case["final_exists"], label)
        self.assertFalse(case["active_exists"], label)
        self.assertEqual(
            case["preparing_snapshot"],
            case["candidate_snapshot"],
            label,
        )
        self.assertEqual(case["live_after"], case["live_before"], label)
        self.assertEqual(case["hook_before"], 1, label)
        self.assertEqual(case["hook_after"], 0, label)

    def _assert_not_retried(self, case, original_error, label):
        self.assertEqual(case["attempts"], 1, label)
        self.assertEqual(case["delays"], (), label)
        self.assertEqual(case["validations"], 1, label)
        self._assert_replace_calls(case, 1, label)
        self.assertIs(type(case["error"]), PreparedTransactionConflict, label)
        self.assertIs(case["cause"], original_error, label)
        self.assertTrue(case["preparing_exists"], label)
        self.assertFalse(case["final_exists"], label)
        self.assertFalse(case["active_exists"], label)
        self.assertEqual(
            case["preparing_snapshot"],
            case["candidate_snapshot"],
            label,
        )
        self.assertEqual(case["live_after"], case["live_before"], label)
        self.assertEqual(case["hook_before"], 1, label)
        self.assertEqual(case["hook_after"], 0, label)

    def test_windows_access_denied_retries_atomic_preparing_promotion(self):
        self._require_retry_implementation()
        access_denied = self._windows_error(5)
        retry = self._exercise_promotion((access_denied, None))
        self._assert_retry_success(retry, "WinError 5 retry success")
        first_success = self._exercise_promotion((None,))
        self._assert_first_success(first_success, "first-attempt promotion success")

    def test_windows_sharing_errors_32_and_33_are_retryable(self):
        self._require_retry_implementation()
        for winerror in (32, 33):
            injected = self._windows_error(winerror)
            case = self._exercise_promotion((injected, None))
            self._assert_retry_success(case, f"WinError {winerror} retry")
        permission_error = PermissionError("synthetic access denied")
        permission_error.winerror = 5
        permission_case = self._exercise_promotion((permission_error, None))
        self._assert_retry_success(
            permission_case,
            "PermissionError WinError 5 retry",
        )

    def test_persistent_windows_promotion_lock_stops_after_three_attempts(self):
        self._require_retry_implementation()
        case = self._exercise_promotion(lambda _attempt: self._windows_error(32))
        self._assert_exhausted(case, "persistent sharing violation")

    def test_non_windows_or_unlisted_promotion_errors_are_not_retried(self):
        self._require_retry_implementation()

        class IntSubclass(int):
            pass

        non_os_error = RuntimeError("generic promotion failure")
        non_os_error.winerror = 5
        cases = (
            ("non-Windows", False, self._windows_error(5)),
            ("unlisted", True, self._windows_error(87)),
            ("missing-winerror", True, OSError("generic promotion failure")),
            ("non-OSError", True, non_os_error),
            ("boolean-winerror", True, self._windows_error(True)),
            (
                "int-subclass-winerror",
                True,
                self._windows_error(IntSubclass(5)),
            ),
        )
        for label, is_windows, injected in cases:
            case = self._exercise_promotion((injected,), is_windows=is_windows)
            self._assert_not_retried(case, injected, label)

    def test_preparing_promotion_revalidates_before_and_after_sleep(self):
        self._require_retry_implementation()
        first = self._exercise_promotion((None,))
        self.assertEqual(first["sequence"], (("validate", 1), ("replace", 1)))
        self._assert_first_success(first, "first-success sequence")
        retry = self._exercise_promotion((self._windows_error(5), None))
        self.assertEqual(
            retry["sequence"],
            (
                ("validate", 1),
                ("replace", 1),
                ("validate", 2),
                ("sleep", 0.05),
                ("validate", 3),
                ("replace", 2),
            ),
        )
        self._assert_retry_success(retry, "one-retry sequence")
        exhausted = self._exercise_promotion(
            lambda _attempt: self._windows_error(33)
        )
        self.assertEqual(
            exhausted["sequence"],
            (
                ("validate", 1),
                ("replace", 1),
                ("validate", 2),
                ("sleep", 0.05),
                ("validate", 3),
                ("replace", 2),
                ("validate", 4),
                ("sleep", 0.2),
                ("validate", 5),
                ("replace", 3),
            ),
        )
        self._assert_exhausted(exhausted, "exhausted sequence")
        initial_corruption = self._exercise_promotion(
            lambda _attempt: self._windows_error(5),
            mutation=("initial", "extra-workspace-topology"),
        )
        self.assertEqual(initial_corruption["sequence"], (("validate", 1),))
        self.assertIs(
            type(initial_corruption["error"]),
            PreparedTransactionConflict,
        )
        self.assertEqual(initial_corruption["attempts"], 0)
        self.assertEqual(initial_corruption["delays"], ())
        self.assertEqual(initial_corruption["validations"], 1)
        self.assertTrue(initial_corruption["preparing_exists"])
        self.assertFalse(initial_corruption["final_exists"])
        self.assertFalse(initial_corruption["active_exists"])
        self.assertEqual(
            initial_corruption["live_after"],
            initial_corruption["live_before"],
        )
        self.assertEqual(initial_corruption["hook_before"], 1)
        self.assertEqual(initial_corruption["hook_after"], 0)

    def test_preparing_promotion_rejects_pre_replace_mutation_before_active(self):
        self._require_retry_implementation()
        for mutation in (
            "host-digest",
            "journal-phase",
            "extra-workspace-topology",
        ):
            with self.subTest(mutation=mutation):
                case = self._exercise_promotion(
                    (None,),
                    mutation=("pre-replace", mutation),
                )
                self.assertIs(type(case["error"]), PreparedTransactionConflict)
                self.assertEqual(case["attempts"], 1)
                self.assertFalse(case["active_exists"])
                self.assertFalse(case["preparing_exists"])
                self.assertTrue(case["final_exists"])
                self.assertNotEqual(
                    case["final_snapshot"],
                    case["candidate_snapshot"],
                )
                self.assertEqual(case["live_after"], case["live_before"])
                self.assertEqual(case["hook_before"], 1)
                self.assertEqual(case["hook_after"], 0)

    def test_preparing_promotion_revalidation_rejects_every_authority_mismatch(
        self,
    ):
        self._require_retry_implementation()
        for checkpoint in ("pre-sleep", "post-sleep"):
            for mutation in self.REVALIDATION_MUTATIONS:
                label = f"{checkpoint}:{mutation}"
                case = self._exercise_promotion(
                    lambda _attempt: self._windows_error(5),
                    mutation=(checkpoint, mutation),
                )
                self.assertIs(
                    type(case["error"]),
                    PreparedTransactionConflict,
                    label,
                )
                self._assert_replace_calls(case, 1, label)
                self.assertEqual(
                    case["delays"],
                    () if checkpoint == "pre-sleep" else (0.05,),
                    label,
                )
                self.assertEqual(
                    case["validations"],
                    2 if checkpoint == "pre-sleep" else 3,
                    label,
                )
                self.assertFalse(case["active_exists"], label)
                self.assertEqual(case["live_after"], case["live_before"], label)
                self.assertEqual(case["hook_before"], 1, label)
                self.assertEqual(case["hook_after"], 0, label)
                self.assertEqual(
                    case["preparing_exists"],
                    mutation != "source-disappears",
                    label,
                )
                self.assertEqual(
                    case["final_exists"],
                    mutation == "destination-created",
                    label,
                )

    def test_preparing_promotion_hooks_wrap_the_logical_operation_once(self):
        self._require_retry_implementation()
        retry = self._exercise_promotion((self._windows_error(5), None))
        self._assert_retry_success(retry, "retry hook counts")
        exhausted = self._exercise_promotion(
            lambda _attempt: self._windows_error(32)
        )
        self._assert_exhausted(exhausted, "exhausted hook counts")
        before_failure = self._exercise_promotion((None,), hook_fault="before")
        self.assertIs(type(before_failure["error"]), PreparedTransactionConflict)
        self.assertIsInstance(before_failure["cause"], InjectedFault)
        self.assertEqual(before_failure["attempts"], 0)
        self.assertEqual(before_failure["delays"], ())
        self.assertEqual(before_failure["validations"], 0)
        self.assertEqual(before_failure["hook_before"], 1)
        self.assertEqual(before_failure["hook_after"], 0)
        self.assertTrue(before_failure["preparing_exists"])
        self.assertFalse(before_failure["final_exists"])
        self.assertFalse(before_failure["active_exists"])
        after_failure = self._exercise_promotion((None,), hook_fault="after")
        self.assertIs(type(after_failure["error"]), PreparedTransactionConflict)
        self.assertIsInstance(after_failure["cause"], InjectedFault)
        self._assert_replace_calls(after_failure, 1, "after-hook failure")
        self.assertEqual(after_failure["attempts"], 1)
        self.assertEqual(after_failure["delays"], ())
        self.assertEqual(after_failure["validations"], 1)
        self.assertEqual(after_failure["hook_before"], 1)
        self.assertEqual(after_failure["hook_after"], 1)
        self.assertFalse(after_failure["preparing_exists"])
        self.assertTrue(after_failure["final_exists"])
        self.assertFalse(after_failure["active_exists"])
        self.assertEqual(after_failure["live_after"], after_failure["live_before"])

    def test_update_engine_constructor_signature_remains_frozen(self):
        signature = inspect.signature(UpdateEngine)
        parameters = signature.parameters
        self.assertEqual(
            tuple(parameters),
            ("install_root", "mutex_factory", "hooks"),
        )
        self.assertIs(
            parameters["install_root"].kind,
            inspect.Parameter.POSITIONAL_OR_KEYWORD,
        )
        self.assertIs(
            parameters["install_root"].default,
            inspect.Parameter.empty,
        )
        self.assertIs(
            parameters["mutex_factory"].kind,
            inspect.Parameter.KEYWORD_ONLY,
        )
        self.assertIs(
            parameters["mutex_factory"].default,
            update_engine.create_windows_mutation_mutex,
        )
        self.assertIs(
            parameters["hooks"].kind,
            inspect.Parameter.KEYWORD_ONLY,
        )
        self.assertIsNone(parameters["hooks"].default)
        self.assertIs(signature.return_annotation, inspect.Signature.empty)


class OwnershipBoundaryTests(unittest.TestCase):
    def test_existing_update_ancestor_reparse_is_rejected_before_preparing_writes(self):
        for component in ("updates", "transactions"):
            with self.subTest(component=component):
                with tempfile.TemporaryDirectory() as temporary:
                    root = Path(temporary).resolve()
                    fixture = MatrixHarness(root, "installed")
                    paths = TransactionPaths.for_install(fixture.install, TX)
                    target = (
                        paths.updates_root
                        if component == "updates"
                        else paths.transactions_root
                    )
                    target.mkdir(parents=True)
                    real_lstat = Path.lstat

                    def lstat(path, *args, **kwargs):
                        info = real_lstat(path, *args, **kwargs)
                        if path == target:
                            return SimpleNamespace(
                                st_mode=info.st_mode,
                                st_file_attributes=0x400,
                            )
                        return info

                    before = tuple(target.iterdir())
                    with mock.patch.object(Path, "lstat", lstat):
                        with self.assertRaises(PreparedTransactionConflict):
                            fixture.prepare()
                    self.assertEqual(tuple(target.iterdir()), before)
                    self.assertFalse(paths.preparing_root.exists())
                    self.assertFalse(paths.transaction_root.exists())
                    self.assertFalse(paths.active.exists())

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
        for mutation in ("host-digest", "journal-phase", "extra-topology"):
            with self.subTest(mutation=mutation):
                with tempfile.TemporaryDirectory() as temporary:
                    fixture = MatrixHarness(Path(temporary), "fresh-preexisting")
                    fixture.controller.arm(
                        "after", "workspace:promote-preparing", InjectedCrash
                    )
                    with self.assertRaises(InjectedCrash):
                        fixture.prepare()
                    paths = TransactionPaths.for_install(fixture.install, TX)
                    if mutation == "host-digest":
                        (paths.staged_host / "helper.dll").write_bytes(
                            b"corrupt-staged"
                        )
                    elif mutation == "journal-phase":
                        value = json.loads(paths.journal.read_text(encoding="utf-8"))
                        value["phase"] = "staging"
                        paths.journal.write_bytes(
                            (
                                json.dumps(
                                    value,
                                    ensure_ascii=True,
                                    allow_nan=False,
                                    sort_keys=True,
                                    separators=(",", ":"),
                                )
                                + "\n"
                            ).encode("utf-8")
                        )
                    else:
                        (paths.transaction_root / "unexpected.bin").write_bytes(
                            b"unexpected"
                        )
                    fixture.controller.clear()
                    fixture.rebuild_engine()
                    with self.assertRaises(PreparedTransactionConflict):
                        fixture.prepare()
                    self.assertFalse(paths.active.exists())

    def test_nested_preparing_reparse_is_rejected_before_copy(self):
        with tempfile.TemporaryDirectory() as temporary:
            fixture = MatrixHarness(Path(temporary), "installed")
            paths = TransactionPaths.for_install(fixture.install, TX)
            target_parent = paths.preparing_staged_extension / "assets"
            target_file = target_parent / "app.js"
            real_lstat = Path.lstat

            def lstat(path, *args, **kwargs):
                info = real_lstat(path, *args, **kwargs)
                if path == target_parent:
                    return SimpleNamespace(
                        st_mode=info.st_mode,
                        st_file_attributes=0x400,
                    )
                return info

            with mock.patch.object(Path, "lstat", lstat):
                with self.assertRaises(PreparedTransactionConflict):
                    fixture.prepare()
            self.assertFalse(target_file.exists())
            self.assertFalse(paths.transaction_root.exists())
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
                "PreparingPromotionRetryTests",
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
