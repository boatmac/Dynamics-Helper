"""Locked RED behavioral contracts for the Plan E evidence executor."""

from __future__ import annotations

import collections.abc
import ctypes
import dataclasses
import ast as _ast
import hashlib
import inspect
import io
import json
import os
from pathlib import Path
import shutil
import socket as _socket
import stat
import subprocess
import sys
import tempfile
import time
import typing
import unittest
import urllib.request as _urlrequest
import uuid
from unittest import mock

try:
    import winreg as _winreg
except ImportError:  # pragma: no cover - the locked evidence host is Windows.
    _winreg = None

import plan_e_evidence as _candidate


_SOURCE_ROOT = Path(__file__).resolve().parent.parent
_SOURCE_MODULE = _SOURCE_ROOT / "plan_e_evidence.py"
_SOURCE_TEST = Path(__file__).resolve()
_SOURCE_PLAN = _SOURCE_ROOT / "docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md"
_HEAD = "a" * 40
_NEW_HEAD = "b" * 40
_SHA256 = "c" * 64
_INTEGRATION_BASE = "0dbb4852931b50153fb898b03129ae0092c46404"
_WHOLE_BASE = "0040b1de1bc196b203014a8e4f94a53babb7e9aa"
_BRANCH = "docs/prompt-scope-cleanup-design"
_FINAL_SUBJECT = "docs(verification): record Plan E hardening evidence"
_PROFILE_NAMES = ("LOCALAPPDATA", "APPDATA", "USERPROFILE", "HOME", "TEMP", "TMP")
_PRODUCER_KINDS = (
    "promotion",
    "focused-extension",
    "full-extension",
    "host",
    "static",
    "task-audits",
    "plan-e-review-package",
    "whole-review-package",
)
_REPORT_HEADINGS = (
    "Scope and Constraints", "Commit Map", "Requirement-to-Test Matrix",
    "A-C Prerequisite and Plan D Handoff Evidence", "Historical Report Availability and Current-State Audits",
    "RED Evidence", "Restored Mutation Evidence", "Focused Extension Results", "Full Extension and Build Results",
    "Isolated Host Results", "Static and Diff Results", "Plan D Handoff Result",
    "Plan-E-Only Controller Review Findings", "Original Whole-Branch Interim Review Findings",
    "Plan D Final Whole-Branch Rerun Requirement", "Plan E Review Readiness", "Skipped Unsafe Operations", "Residual Risks",
)
_PLAN_E_REVIEW_HEADINGS = (
    "Review Session", "Review Base", "Review Head", "Review Range", "Task 6 Audit SHA-256", "Task 7 Audit SHA-256",
    "Historical-Report Availability Honesty", "No Reconstructed Historical TDD Claim", "Git Lineage and Source-Blob Accuracy",
    "Current-State Test and Mutation Sufficiency", "Artifact-Durability Contract Adequacy and Prospective 58-Path Inventory Composition",
    "Critical", "Important", "Minor", "Testing Gaps", "Declared Session Proof Boundary", "Disposition",
)
_WHOLE_REVIEW_HEADINGS = _PLAN_E_REVIEW_HEADINGS[:-1] + ("Plan D Rerun Requirement", "Disposition")
_FOCUSED_EXTENSION_FILES = (
    "src/utils/ownData.test.ts", "src/utils/bookmarkItems.test.ts", "src/components/Options.test.tsx",
    "src/components/MenuLogic.teamCache.test.ts", "src/utils/teamCatalog.test.ts", "src/background/teamManifestSync.test.ts",
    "src/utils/analysisStore.test.ts", "src/background/analyzeBridge.test.ts", "src/background/analyzeRequestHandler.test.ts",
    "src/background/nativeMessageWire.test.ts", "src/hooks/useAnalysisHydration.test.ts", "src/utils/promptSourceErrors.test.ts",
    "src/utils/pageIdentity.test.ts", "src/utils/analyzeRequest.test.ts", "src/background/contextMenu.test.ts",
    "src/components/ResultPopover.test.tsx", "src/components/FAB.pageIdentity.test.tsx", "src/components/FAB.analyzeRequest.test.tsx",
    "src/components/FAB.spinner.test.tsx", "src/components/FAB.promptSourceErrors.test.tsx", "src/utils/nativeUpdateError.test.ts",
    "src/utils/configUpdateResult.test.ts", "src/background/resetExtensionState.test.ts", "src/content/updateErrorBridge.test.ts",
)
_PROMOTION_SELECTORS = (
    "test_windows_access_denied_retries_atomic_preparing_promotion",
    "test_windows_sharing_errors_32_and_33_are_retryable",
    "test_persistent_windows_promotion_lock_stops_after_three_attempts",
    "test_non_windows_or_unlisted_promotion_errors_are_not_retried",
    "test_preparing_promotion_revalidates_before_and_after_sleep",
    "test_preparing_promotion_revalidation_rejects_every_authority_mismatch",
    "test_preparing_promotion_hooks_wrap_the_logical_operation_once",
    "test_update_engine_constructor_signature_remains_frozen",
)
_HOST_PHASES = (
    ("host-focused", ("host.test_session_workspace", "host.test_prompt_session", "host.test_prompt_sources", "host.test_sdk_compat", "host.test_debug_prompt_isolation", "host.test_model_config")),
    ("host-task-7", ("host.test_session_workspace", "host.test_prompt_session")),
    ("host-full", ("discover", "host")),
    ("host-update-engine", ("host.test_update_engine_resume", "host.test_update_engine_host", "host.test_update_engine_extension", "host.test_update_engine_rollback")),
    ("host-recovery", ("host.test_update_recovery",)),
    ("host-package", ("host.test_release_helper", "host.test_package_archive")),
    ("host-executor", ("host.test_plan_e_evidence",)),
    ("host-compile", ("compileall", "-q", "host")),
)


def _accepted_argv(root: Path) -> tuple[tuple[str, ...], ...]:
    return (
        ("preflight",),
        ("status",),
        *(("produce", "--kind", kind, "--reviewed-head", _HEAD) for kind in _PRODUCER_KINDS),
        (
            "ingest-review", "--kind", "plan-e", "--reviewed-head", _HEAD,
            "--session-id", "Session-1", "--input", str((root / "plan-e-review.md").resolve()),
        ),
        (
            "ingest-review", "--kind", "whole", "--reviewed-head", _HEAD,
            "--session-id", "Session-2", "--input", str((root / "whole-review.md").resolve()),
        ),
        ("retire", "--old-head", _HEAD, "--new-head", _NEW_HEAD),
        ("finalize", "--reviewed-head", _HEAD),
        ("verify-final", "--final-head", _HEAD),
    )
_EXPECTED_TEST_METHODS = {
    "CliContractTests": (
        "test_cli_grammar_accepts_only_fixed_commands_and_producer_kinds",
        "test_every_command_emits_one_canonical_json_object_and_fixed_exit_code",
        "test_cli_main_maps_only_known_failures_and_releases_resources_in_finally",
        "test_review_session_cli_grammar_uses_shell_safe_subset",
        "test_preflight_binds_exact_direct_commit_chronology_and_path_scopes",
        "test_preflight_requires_canonical_branch_repo_tools_and_clean_source",
        "test_tested_source_roots_and_reviewed_blobs_are_exact",
        "test_preflight_requires_six_report_hashes_and_task_6_7_absence",
        "test_recovered_exact_task_6_or_7_report_requires_contract_revision",
        "test_repository_root_is_script_relative_not_ambient_cwd",
        "test_producer_maps_and_command_constants_are_exact",
        "test_public_types_and_function_signatures_are_exact",
    ),
    "CanonicalJsonTests": (
        "test_canonical_json_round_trip_is_byte_exact",
        "test_canonical_json_rejects_duplicate_unknown_missing_and_noncanonical_data",
        "test_random_token_is_exact_128_bit_lowercase_hex",
    ),
    "PathSafetyTests": (
        "test_authority_paths_reject_escape_alias_case_separator_and_reparse",
        "test_receipt_strings_never_authorize_writes_or_deletes",
    ),
    "ReadOnlyCommandTests": (
        "test_preflight_and_status_are_read_only_and_index_byte_exact",
        "test_status_classifies_only_absent_ready_or_retained_state",
        "test_status_reviewed_head_field_drives_retirement_and_finalizer_literals",
        "test_status_returns_absent_after_successful_finalizer_cleanup",
        "test_read_only_git_uses_no_optional_locks_and_closed_environment",
        "test_fsmonitor_hook_signing_filter_and_helper_effectiveness_blocks",
    ),
    "MutexLeaseTests": (
        "test_mutation_creates_and_rereads_lease_before_state_root",
        "test_mutex_name_and_state_paths_bind_canonical_repository_identity",
        "test_retained_abandoned_partial_and_unknown_state_blocks_without_cleanup",
        "test_finalizer_resume_requires_same_closed_token_and_checkpoint",
        "test_windows_named_mutex_contention_abandonment_release_and_handle_closure",
        "test_non_windows_mutating_commands_block_without_mutex_emulation_or_write",
        "test_mutex_releases_last_and_parent_state_restores_on_success_and_failure",
    ),
    "CommandReceiptTests": (
        "test_foreground_command_receipt_matches_actual_execution",
        "test_child_output_limits_fail_safely_without_partial_receipt",
        "test_child_nonzero_or_start_failure_never_promotes_succeeded_receipt",
        "test_command_receipt_schema_rejects_unknown_missing_type_order_and_hash_drift",
        "test_host_children_receive_six_fresh_distinct_contained_directories",
        "test_unknown_duplicate_malformed_or_drifting_receipts_are_rejected",
    ),
    "CandidatePublicationTests": (
        "test_candidate_publication_uses_no_clobber_hard_link_and_reread",
        "test_candidate_collision_concurrency_and_crash_preserve_state",
        "test_candidate_and_receipt_publication_order_is_crash_safe",
        "test_fixed_artifact_publication_rejects_collision_except_six_reports",
        "test_candidates_are_head_scoped_and_fixed_paths_wait_for_finalize",
    ),
    "RetirementTests": (
        "test_retirement_requires_complete_dependency_closed_terminal_state",
        "test_retirement_atomically_moves_head_authority_then_deletes_quarantine",
        "test_retirement_never_deletes_receipt_supplied_or_unrelated_paths",
        "test_review_rejection_is_clean_terminal_state_not_crash_state",
    ),
    "WorktreeLifecycleTests": (
        "test_only_promotion_and_task_audits_may_create_linked_worktrees",
        "test_owned_worktree_create_restore_remove_lifecycle_is_exact",
        "test_worktree_head_blob_status_or_registration_mismatch_is_retained",
        "test_worktree_path_normalization_rejects_case_separator_alias_and_prunable_state",
    ),
    "ResultValidationTests": (
        "test_vitest_results_use_scoped_selector_multiset_identity",
        "test_vitest_selector_multiplicity_and_status_are_exact",
        "test_vitest_full_name_is_derived_consistency_not_identity",
        "test_vitest_focused_multiset_equals_full_restricted_multiset",
        "test_vitest_results_require_exact_files_and_counter_reconciliation",
        "test_extension_producer_argv_and_subset_inventories_are_exact",
        "test_asset_provenance_build_copy_and_release_safety_are_exact",
        "test_build_and_static_commands_use_only_absolute_local_node_entries",
        "test_host_results_require_positive_counts_and_exact_skip_policy",
        "test_host_result_selectors_and_phase_modules_are_exact",
        "test_promotion_result_requires_red_replay_green_mutations_and_sources",
        "test_promotion_source_semantics_lock_seams_checkpoints_and_atomic_callsite",
        "test_promotion_replay_failures_are_assertions_not_collection_or_setup_errors",
        "test_task_audits_are_canonical_current_state_only",
        "test_task_audit_schema_rejects_every_closed_field_and_cardinality_drift",
        "test_task_audits_bind_exact_machine_evidence_and_review_requirements",
        "test_audits_freeze_before_review_and_are_never_regenerated_by_consumers",
    ),
    "ReviewGrammarTests": (
        "test_review_text_requires_exact_whole_file_heading_grammar",
        "test_review_input_is_single_snapshot_regular_file_and_not_cleanup_authority",
        "test_review_disposition_criteria_findings_and_session_rules_are_exact",
        "test_review_critical_or_important_code_finding_blocks_even_when_criteria_pass",
        "test_second_review_must_bind_a_different_declared_session_and_findings_hash",
        "test_review_findings_require_closed_file_line_grammar",
        "test_review_rejects_hash_range_audit_or_prospective_durability_drift",
        "test_review_dispatch_candidates_are_receipt_authorized_head_scoped_bytes",
    ),
    "FinalReportTests": (
        "test_final_report_has_exact_headings_and_required_facts",
        "test_final_report_requirement_matrix_has_exact_unique_coverage",
        "test_final_report_lists_exact_reviewed_and_evidence_path_sets_once",
        "test_final_report_has_no_final_commit_sha_or_post_cas_fixed_point",
        "test_final_report_rejects_task_6_7_historical_reconstruction_claims",
    ),
    "FinalizationTests": (
        "test_finalizer_validates_58_artifacts_and_stages_exact_60_blobs",
        "test_final_report_and_manifest_are_single_creation_frozen_candidates",
        "test_finalizer_requires_reviewed_head_equal_audit_subjects_and_review_heads",
        "test_manifest_is_canonical_exact_58_path_sha256_map",
        "test_finalizer_compares_every_staged_blob_with_committed_blob",
        "test_finalizer_uses_commit_tree_and_compare_and_swap_ref_update",
        "test_finalizer_concurrent_branch_or_index_change_blocks_without_overwrite",
        "test_finalizer_validates_staged_diff_check_and_empty_preexisting_index",
        "test_finalizer_preserves_index_and_head_on_post_staging_failure",
        "test_finalizer_resume_reconciles_only_two_exact_ref_states",
        "test_finalizer_cleanup_quarantine_and_checkpoint_failures_are_retained",
        "test_finalizer_failure_exit_codes_preserve_exact_checkpoint_authority",
        "test_finalizer_success_removes_only_owned_state_after_post_validation",
        "test_verify_final_is_clean_clone_read_only_and_uses_literal_base",
        "test_final_primary_checkout_is_clean_exact_head_without_extra_worktrees",
    ),
    "InventoryAndReleaseTests": (
        "test_literal_inventories_are_sorted_unique_and_exact",
        "test_candidate_ownership_arithmetic_is_exact_and_disjoint",
        "test_release_staging_and_pyinstaller_exclude_executor",
        "test_forbidden_operations_are_unreachable_from_cli_definitions",
        "test_executor_tests_use_only_disposable_repo_profile_and_temp_roots",
    ),
    "ExecutorMutationProofTests": (
        "test_mutation_receipt_allowlist_is_caught",
        "test_mutation_retirement_prevalidation_is_caught",
        "test_mutation_candidate_atomicity_is_caught",
        "test_mutation_worktree_head_validation_is_caught",
        "test_mutation_review_whole_text_coverage_is_caught",
        "test_mutation_host_skip_policy_is_caught",
        "test_mutation_staged_committed_blob_comparison_is_caught",
    ),
}


def _sha256(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def _canonical_bytes(value: object) -> bytes:
    return json.dumps(value, ensure_ascii=True, sort_keys=True, separators=(",", ":"), allow_nan=False).encode() + b"\n"


def _write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(_canonical_bytes(value))


def _long_path(path: Path) -> Path:
    if os.name == "nt" and not str(path).startswith("\\\\?\\"):
        return Path("\\\\?\\" + str(path.resolve()))
    return path


def _plan_inventory(stem: str) -> tuple[str, ...]:
    text = _SOURCE_PLAN.read_text(encoding="utf-8")
    start = f"<!-- {stem}_START -->"
    end = f"<!-- {stem}_END -->"
    if text.count(start) != 1 or text.count(end) != 1:
        raise RuntimeError(f"fixture marker drift: {stem}")
    fenced = text.split(start, 1)[1].split(end, 1)[0].split("```text\n", 1)[1].split("```", 1)[0]
    return tuple(line for line in fenced.splitlines() if line)


def _minimal_environment(root: Path) -> dict[str, str]:
    environment = {
        name: os.environ[name]
        for name in ("SYSTEMROOT", "WINDIR", "COMSPEC", "PATHEXT")
        if name in os.environ
    }
    for name in _PROFILE_NAMES:
        path = root / "runner-profile" / name.lower()
        path.mkdir(parents=True, exist_ok=True)
        environment[name] = str(path)
    environment.update(
        {
            "GIT_CONFIG_NOSYSTEM": "1",
            "GIT_CONFIG_GLOBAL": os.devnull,
            "GIT_TERMINAL_PROMPT": "0",
            "GCM_INTERACTIVE": "Never",
            "PYTHONDONTWRITEBYTECODE": "1",
        }
    )
    return environment


def _run_git(git: str, repository: Path, environment: dict[str, str], *argv: str) -> bytes:
    return subprocess.run(
        [git, "-C", str(repository), *argv],
        check=True,
        capture_output=True,
        env=environment,
        shell=False,
        timeout=30,
    ).stdout


def _calls(adapters: _FakeAdapters, boundary: str, operation: str) -> tuple[tuple[object, ...], ...]:
    return tuple(arguments for seen_boundary, seen_operation, arguments in adapters.calls if (seen_boundary, seen_operation) == (boundary, operation))


class _FakeAdapters:
    """Real disposable filesystem plus recorded Git/process/mutex seams."""

    def __init__(
        self,
        root: Path,
        repository: Path,
        git: str,
        environment: dict[str, str],
        common: Path | None = None,
    ) -> None:
        self.root = root.resolve()
        self.repo = repository.resolve()
        self.git_executable = str(Path(git).resolve())
        self.environment = dict(environment)
        self.common = (common or (self.root / "git-common")).resolve()
        self.common.mkdir(parents=True, exist_ok=True)
        self.state = self.common / "plan-e-evidence-v1"
        self.calls: list[tuple[str, str, tuple[object, ...]]] = []
        self.scenario: dict[str, object] = {}
        self.git_responses: dict[str, object] = self.scenario
        self.filesystem_responses: dict[str, object] = self.scenario
        self.process_results: list[tuple[int, bytes, bytes]] = []
        self.process_callback = None
        self.mutex_mode = "owned"
        self.fixed_clock = 1_725_000_000.0
        self.random_values: list[object] = [bytes(range(16))]
        self.raise_on_repository_root = False
        self.write_roots = (self.root, self.repo)
        self.expected_command: tuple[str, tuple[tuple[str, str], ...]] | None = None
        self.observed_commands: list[tuple[str, tuple[tuple[str, str], ...]]] = []
        self.dry_run = False

    def _observe_dispatch(self) -> None:
        if self.expected_command is not None:
            self.observed_commands.append(self.expected_command)
            self.expected_command = None

    def repository_root(self) -> Path:
        self._observe_dispatch()
        self.calls.append(("authority", "repository_root", ()))
        if self.raise_on_repository_root:
            raise OSError("closed fixture failure")
        return self.repo

    def common_dir(self) -> Path:
        self._observe_dispatch()
        self.calls.append(("authority", "common_dir", ()))
        return self.common

    def state_root(self) -> Path:
        self._observe_dispatch()
        self.calls.append(("authority", "state_root", ()))
        return self.state

    def _path(self, value: object, *, write: bool = False) -> Path:
        path = Path(str(value)).resolve()
        if write and not any(path == root or path.is_relative_to(root) for root in self.write_roots):
            raise RuntimeError("write escaped disposable roots")
        return path

    def filesystem(self, operation: str, arguments: tuple[object, ...]) -> object:
        self._observe_dispatch()
        self.calls.append(("filesystem", operation, arguments))
        if operation in {"network", "registry", "real_appdata", "browser", "install", "publish", "push", "tag", "real_update"}:
            raise RuntimeError(f"forbidden operation: {operation}")
        if operation in self.filesystem_responses:
            value = self.filesystem_responses[operation]
            return value(*arguments) if callable(value) else value
        if operation == "scenario":
            return self.scenario.get(str(arguments[0]))
        if self.dry_run:
            if operation == "read_bytes":
                return b""
            if operation in {"exists", "is_file", "is_dir"}:
                return False
            if operation == "resolve":
                return Path(str(arguments[0])).resolve()
            if operation == "list":
                return ()
            if operation in {"write_exclusive", "write_bytes", "mkdir", "fsync_file", "fsync_directory", "link", "rename", "remove_tree", "unlink"}:
                return None
        path = self._path(arguments[0], write=operation in {"write_exclusive", "write_bytes", "mkdir", "unlink", "link", "rename", "remove_tree"}) if arguments else self.root
        if operation == "exists":
            return path.exists()
        if operation == "is_file":
            return path.is_file()
        if operation == "is_dir":
            return path.is_dir()
        if operation == "resolve":
            return path
        if operation == "read_bytes":
            return path.read_bytes()
        if operation == "write_exclusive":
            path.parent.mkdir(parents=True, exist_ok=True)
            with path.open("xb") as stream:
                stream.write(typing.cast(bytes, arguments[1]))
                stream.flush()
                os.fsync(stream.fileno())
            return None
        if operation == "write_bytes":
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(typing.cast(bytes, arguments[1]))
            return None
        if operation == "replace":
            target = self._path(arguments[1], write=True)
            os.replace(path, target)
            return None
        if operation == "mkdir":
            path.mkdir(parents=True, exist_ok=bool(arguments[1]) if len(arguments) > 1 else False)
            return None
        if operation == "fsync_file":
            with path.open("rb") as stream:
                os.fsync(stream.fileno())
            return None
        if operation == "fsync_directory":
            return None
        if operation == "link":
            target = self._path(arguments[1], write=True)
            os.link(path, target)
            return None
        if operation == "rename":
            target = self._path(arguments[1], write=True)
            path.rename(target)
            return None
        if operation == "remove_tree":
            shutil.rmtree(path)
            return None
        if operation == "unlink":
            path.unlink()
            return None
        if operation == "stat":
            return path.stat()
        if operation == "lstat":
            return path.lstat()
        if operation == "list":
            return tuple(sorted(child.name for child in path.iterdir())) if path.exists() else ()
        raise RuntimeError(f"unknown filesystem operation: {operation}")

    def git(self, operation: str, arguments: tuple[object, ...]) -> object:
        self._observe_dispatch()
        self.calls.append(("git", operation, arguments))
        if operation in {"push", "fetch", "pull", "tag", "remote"}:
            raise RuntimeError(f"forbidden Git operation: {operation}")
        if operation in self.git_responses:
            value = self.git_responses[operation]
            return value(*arguments) if callable(value) else value
        if self.dry_run:
            return (0, b"", b"")
        if operation == "run":
            argv = tuple(str(value) for value in typing.cast(tuple[object, ...], arguments[0]))
            cwd = Path(str(arguments[1])) if len(arguments) > 1 else self.repo
            replacements = {_INTEGRATION_BASE: self.git_responses.get("integration_base", _INTEGRATION_BASE), _WHOLE_BASE: self.git_responses.get("whole_base", _WHOLE_BASE)}
            argv = tuple(str(replacements.get(value, value)) for value in argv)
            completed = subprocess.run(
                [self.git_executable, "--no-optional-locks", "--no-pager", "-C", str(cwd), *argv],
                check=False,
                capture_output=True,
                env=self.environment,
                shell=False,
                timeout=30,
            )
            return (completed.returncode, completed.stdout, completed.stderr)
        if operation == "update_ref":
            reference, new_value, old_value = (str(value) for value in arguments)
            if new_value == "prospective" and "real_prospective_head" not in self.git_responses:
                return (0, b"", b"")
            new_value = str(self.git_responses.get("real_prospective_head", new_value))
            old_value = str(self.git_responses.get("real_reviewed_head", old_value))
            completed = subprocess.run(
                [self.git_executable, "--no-optional-locks", "--no-pager", "-C", str(self.repo), "update-ref", reference, new_value, old_value],
                check=False,
                capture_output=True,
                env=self.environment,
                shell=False,
                timeout=30,
            )
            return (completed.returncode, completed.stdout, completed.stderr)
        if operation == "read_ref":
            return _run_git(self.git_executable, self.repo, self.environment, "rev-parse", str(arguments[0])).decode().strip()
        if operation == "write_tree":
            return _run_git(self.git_executable, self.repo, self.environment, "write-tree").decode().strip()
        if operation == "commit_tree":
            subject, parent = str(arguments[0]), str(arguments[1])
            tree = _run_git(self.git_executable, self.repo, self.environment, "write-tree").decode().strip()
            return _run_git(self.git_executable, self.repo, self.environment, "commit-tree", tree, "-p", parent, "-m", subject).decode().strip()
        if operation == "worktree_add":
            path, head = Path(str(arguments[0])), str(arguments[1])
            completed = subprocess.run([self.git_executable, "-C", str(self.repo), "worktree", "add", "--detach", str(path), head], check=False, capture_output=True, env=self.environment, shell=False, timeout=30)
            return (completed.returncode, completed.stdout, completed.stderr)
        if operation == "worktree_remove":
            path = Path(str(arguments[0]))
            completed = subprocess.run([self.git_executable, "-C", str(self.repo), "worktree", "remove", str(path)], check=False, capture_output=True, env=self.environment, shell=False, timeout=30)
            return (completed.returncode, completed.stdout, completed.stderr)
        raise RuntimeError(f"unknown Git operation: {operation}")

    def process(self, operation: str, arguments: tuple[object, ...]) -> object:
        self._observe_dispatch()
        self.calls.append(("process", operation, arguments))
        if operation != "run":
            raise RuntimeError(f"unknown process operation: {operation}")
        spec = typing.cast(_candidate.CommandSpec, arguments[0])
        if self.dry_run:
            return (0, b"", b"")
        if self.process_callback is not None:
            return self.process_callback(spec)
        if self.process_results:
            return self.process_results.pop(0)
        return (0, b"", b"")

    def mutex(self, operation: str, arguments: tuple[object, ...]) -> object:
        self._observe_dispatch()
        self.calls.append(("mutex", operation, arguments))
        if operation == "name":
            return self.git_responses.get("mutex_name", arguments[0])
        if operation == "acquire":
            requested = str(arguments[0]) if arguments else ""
            real_name = self.git_responses.get("mutex_name")
            if os.name == "nt" and real_name == requested:
                kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
                kernel32.CreateMutexW.restype = ctypes.c_void_p
                kernel32.WaitForSingleObject.restype = ctypes.c_uint32
                handle = kernel32.CreateMutexW(None, False, requested)
                wait = kernel32.WaitForSingleObject(handle, 0)
                if wait == 0x00000102:
                    kernel32.CloseHandle(handle)
                    return "contended"
                if wait == 0x00000080:
                    kernel32.ReleaseMutex(handle)
                    kernel32.CloseHandle(handle)
                    return "abandoned"
                self.git_responses["mutex_handle"] = handle
                return "owned"
            return self.mutex_mode
        if operation == "release":
            handle = self.git_responses.get("mutex_handle")
            if handle is not None:
                ctypes.WinDLL("kernel32", use_last_error=True).ReleaseMutex(handle)
            return None
        if operation == "close":
            handle = self.git_responses.pop("mutex_handle", None)
            if handle is not None:
                ctypes.WinDLL("kernel32", use_last_error=True).CloseHandle(handle)
            return None
        raise RuntimeError(f"unknown mutex operation: {operation}")

    def clock(self, operation: str, arguments: tuple[object, ...]) -> object:
        self._observe_dispatch()
        self.calls.append(("clock", operation, arguments))
        if operation == "time":
            return self.fixed_clock
        if operation == "sleep":
            return None
        raise RuntimeError(f"unknown clock operation: {operation}")

    def randomness(self, operation: str, arguments: tuple[object, ...]) -> object:
        self._observe_dispatch()
        self.calls.append(("randomness", operation, arguments))
        if operation == "bytes" and arguments == (16,):
            return self.random_values.pop(0)
        raise RuntimeError(f"unknown randomness operation: {operation}")


class _Fixture:
    def setUp(self) -> None:
        self.root = Path(tempfile.mkdtemp(prefix="pe-")).resolve()
        self.environment = _minimal_environment(self.root)
        located = shutil.which("git")
        if located is None:
            raise RuntimeError("Git is required for disposable Plan E tests")
        self.git = str(Path(located).resolve())
        self.repository = self.root / "repo"
        self.repository.mkdir()
        _run_git(self.git, self.repository, self.environment, "init", "-q")
        _run_git(self.git, self.repository, self.environment, "config", "user.name", "Plan E Test")
        _run_git(self.git, self.repository, self.environment, "config", "user.email", "plan-e@example.invalid")
        _run_git(self.git, self.repository, self.environment, "checkout", "-q", "-b", _BRANCH)
        fixture_files = (
            "base.txt", "plan_e_evidence.py", "host/test_plan_e_evidence.py", "host/test_update_engine_resume.py",
            "host/update_engine.py", "extension/src/components/FAB.tsx", "extension/src/utils/pageIdentity.ts",
            "extension/src/utils/analyzeRequest.ts",
        )
        for relative in fixture_files:
            path = self.repository / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(f"fixture:{relative}\n".encode())
        _run_git(self.git, self.repository, self.environment, "add", "--", *fixture_files)
        _run_git(self.git, self.repository, self.environment, "commit", "-q", "-m", "fixture base")
        self.base_head = _run_git(self.git, self.repository, self.environment, "rev-parse", "HEAD").decode().strip()
        self.adapters = _FakeAdapters(self.root, self.repository, self.git, self.environment)
        self.adapters.git_responses.update({"integration_base": self.base_head, "whole_base": self.base_head})
        self.tools = self.root / "tools"
        self.tools.mkdir()
        for name in ("git.exe", "python.exe", "node.exe"):
            (self.tools / name).write_bytes(b"test tool\n")

    def tearDown(self) -> None:
        for state in self.root.rglob("plan-e-evidence-v1"):
            if state.exists():
                shutil.rmtree(_long_path(state), onerror=self._remove_readonly)
        if self.root.exists():
            shutil.rmtree(_long_path(self.root), onerror=self._remove_readonly)

    @staticmethod
    def _remove_readonly(function, path: str, _error) -> None:
        os.chmod(path, stat.S_IWRITE)
        function(path)

    def expected_result(self, command: str, status: str, code: str, fields: tuple[tuple[str, object], ...] = ()) -> _candidate.CliResult:
        return _candidate.CliResult(1, command, status, code, fields)

    def new_repository(self, name: str) -> tuple[Path, str]:
        repository = self.root / name
        repository.mkdir()
        _run_git(self.git, repository, self.environment, "init", "-q")
        _run_git(self.git, repository, self.environment, "config", "user.name", "Plan E Test")
        _run_git(self.git, repository, self.environment, "config", "user.email", "plan-e@example.invalid")
        _run_git(self.git, repository, self.environment, "checkout", "-q", "-b", _BRANCH)
        fixture_files = (
            "base.txt", "plan_e_evidence.py", "host/test_plan_e_evidence.py", "host/test_update_engine_resume.py",
            "host/update_engine.py", "extension/src/components/FAB.tsx", "extension/src/utils/pageIdentity.ts",
            "extension/src/utils/analyzeRequest.ts",
        )
        for relative in fixture_files:
            path = repository / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(f"fixture:{relative}\n".encode())
        _run_git(self.git, repository, self.environment, "add", "--", *fixture_files)
        _run_git(self.git, repository, self.environment, "commit", "-q", "-m", "fixture base")
        return repository, _run_git(self.git, repository, self.environment, "rev-parse", "HEAD").decode().strip()

    def command_specs(self) -> tuple[_candidate.CommandSpec, ...]:
        env = tuple(sorted({"GIT_OPTIONAL_LOCKS": "0", "PYTHONDONTWRITEBYTECODE": "1"}.items()))
        python = str((self.tools / "python.exe").resolve())
        node = str((self.tools / "node.exe").resolve())
        git = str((self.tools / "git.exe").resolve())
        vitest = str((self.repository / "extension/node_modules/vitest/vitest.mjs").resolve())
        output = str((self.root / "owned" / "vitest.json").resolve())
        promotion = []
        for phase, selectors in (("red", _PROMOTION_SELECTORS), ("green", _PROMOTION_SELECTORS)):
            for selector in selectors:
                promotion.append(_candidate.CommandSpec(f"promotion-{phase}-{selector}", python, ("-m", "unittest", f"host.test_update_engine_resume.PreparingPromotionRetryTests.{selector}", "-v"), str(self.repository), env, 1200, "closed", 4194304, 4194304))
        for mutation in ("initial", "classification", "bound", "pre-sleep", "post-sleep"):
            selector = _PROMOTION_SELECTORS[0 if mutation in {"initial", "classification"} else 2 if mutation == "bound" else 5]
            promotion.append(_candidate.CommandSpec(f"promotion-mutation-{mutation}", python, ("-m", "unittest", f"host.test_update_engine_resume.PreparingPromotionRetryTests.{selector}", "-v"), str(self.repository), env, 1200, "closed", 4194304, 4194304))
            promotion.append(_candidate.CommandSpec(f"promotion-restored-{mutation}", python, ("-m", "unittest", f"host.test_update_engine_resume.PreparingPromotionRetryTests.{selector}", "-v"), str(self.repository), env, 1200, "closed", 4194304, 4194304))
        vitest_base = (vitest, "run", "--root", "extension", "--config", "vitest.config.ts", "--configLoader", "runner", "--no-cache", "--reporter=verbose", "--reporter=json", f"--outputFile.json={output}")
        extension = (
            _candidate.CommandSpec("focused-extension-tests", node, (*vitest_base, *_FOCUSED_EXTENSION_FILES), str(self.repository), env, 1200, "closed", 8388608, 8388608),
            _candidate.CommandSpec("full-extension-tests", node, vitest_base, str(self.repository), env, 1800, "closed", 16777216, 16777216),
        )
        host = []
        for command_id, modules in _HOST_PHASES:
            if modules[0] == "compileall":
                argv = ("-m", *modules)
            elif modules[0] == "discover":
                argv = ("-m", "unittest", *modules, "-v")
            else:
                argv = ("-m", "unittest", *modules, "-v")
            host.append(_candidate.CommandSpec(command_id, python, argv, str(self.repository), env, 1800, "closed", 16777216, 16777216))
        static = (
            _candidate.CommandSpec("typescript", node, (str((self.repository / "extension/node_modules/typescript/bin/tsc").resolve()), "--noEmit", "--tsBuildInfoFile", str((self.root / "owned/tsbuild.info").resolve()), "-p", "extension/tsconfig.json"), str(self.repository), env, 1200, "closed", 8388608, 8388608),
            _candidate.CommandSpec("vite-build", node, (str((self.repository / "extension/node_modules/vite/bin/vite.js").resolve()), "build", "extension", "--config", "extension/vite.config.ts", "--configLoader", "runner", "--outDir", str((self.root / "owned/dist").resolve()), "--emptyOutDir"), str(self.repository), env, 1200, "closed", 8388608, 8388608),
            _candidate.CommandSpec("git-diff-check", git, ("diff", "--check", f"{_INTEGRATION_BASE}..{_HEAD}"), str(self.repository), env, 300, "closed", 1048576, 1048576),
        )
        audits = (
            _candidate.CommandSpec("task-6-current", node, (*vitest_base, "src/utils/pageIdentity.test.ts", "src/components/FAB.pageIdentity.test.tsx", "src/components/FAB.spinner.test.tsx", "src/hooks/useAnalysisHydration.test.ts"), str(self.repository), env, 1200, "closed", 8388608, 8388608),
            _candidate.CommandSpec("task-7-current", node, (*vitest_base, "src/utils/analyzeRequest.test.ts", "src/background/contextMenu.test.ts", "src/components/FAB.analyzeRequest.test.tsx", "src/components/FAB.spinner.test.tsx", "src/components/FAB.promptSourceErrors.test.tsx", "src/components/FAB.userPrompt.test.tsx", "src/components/FAB.bookmarkTelemetry.test.tsx"), str(self.repository), env, 1200, "closed", 8388608, 8388608),
            _candidate.CommandSpec("task-current-mutations", python, ("-m", "unittest", "host.test_session_workspace", "host.test_prompt_session", "-v"), str(self.repository), env, 1200, "closed", 8388608, 8388608),
        )
        packages = (
            _candidate.CommandSpec("plan-e-review-package", git, ("diff", "--full-index", "--binary", f"{_INTEGRATION_BASE}..{_HEAD}"), str(self.repository), env, 300, "closed", 33554432, 1048576),
            _candidate.CommandSpec("whole-review-package", git, ("diff", "--full-index", "--binary", f"{_WHOLE_BASE}..{_HEAD}"), str(self.repository), env, 300, "closed", 33554432, 1048576),
        )
        return (*promotion, *extension, *host, *static, *audits, *packages)

    def producer_specs(self) -> tuple[_candidate.ProducerSpec, ...]:
        artifacts = _plan_inventory("PLAN_E_ARTIFACT_PATHS")
        promotion = tuple(path for path in artifacts if path.endswith(".ps1") or path.startswith(".superpowers/sdd/promotion-"))
        if len(promotion) != 40:
            raise RuntimeError("fixture promotion inventory drift")
        commands = self.command_specs()
        by_id = {command.command_id: command for command in commands}
        roots = (
            "extension", "host", "tests", "docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md",
            ".gitattributes", ".gitignore", "release_helper.py", "plan_e_evidence.py", "dev_switch.py",
            "installer_core.ps1", "dyhelper_installer.ps1", "install.bat",
        )
        return (
            _candidate.ProducerSpec("promotion", (), tuple(command for command in commands if command.command_id.startswith("promotion-")), promotion, roots, "owned", "promotion-v1"),
            _candidate.ProducerSpec("focused-extension", (), (by_id["focused-extension-tests"],), (".superpowers/sdd/focused-extension-results.json",), roots, "none", "vitest-v1"),
            _candidate.ProducerSpec("full-extension", (), (by_id["full-extension-tests"],), (".superpowers/sdd/full-extension-results.json",), roots, "none", "vitest-v1"),
            _candidate.ProducerSpec("host", (), tuple(by_id[command_id] for command_id, _modules in _HOST_PHASES), (".superpowers/sdd/host-test-results.json",), roots, "none", "host-v1"),
            _candidate.ProducerSpec("static", ("focused-extension", "full-extension", "host"), tuple(by_id[name] for name in ("typescript", "vite-build", "git-diff-check")), (".superpowers/sdd/reviewed-head-verification.json",), roots, "none", "static-v1"),
            _candidate.ProducerSpec("task-audits", ("focused-extension", "host", "static"), tuple(by_id[name] for name in ("task-6-current", "task-7-current", "task-current-mutations")), (".superpowers/sdd/current-state-mutation-results.json", ".superpowers/sdd/task-6-audit-evidence.json", ".superpowers/sdd/task-7-audit-evidence.json"), roots, "owned", "audit-v1"),
            _candidate.ProducerSpec("plan-e-review-package", ("task-audits",), (by_id["plan-e-review-package"],), (".superpowers/sdd/plan-e-only-review-package.txt", ".superpowers/sdd/plan-e-only-review.diff"), roots, "none", "review-package-v1"),
            _candidate.ProducerSpec("whole-review-package", ("task-audits",), (by_id["whole-review-package"],), (".superpowers/sdd/original-whole-branch-interim-review-package.txt", ".superpowers/sdd/original-whole-branch-interim-review.diff"), roots, "none", "review-package-v1"),
        )

    def child_environment(self, ordinal: int) -> tuple[tuple[str, str], ...]:
        environment = {
            name: self.environment[name]
            for name in ("SYSTEMROOT", "WINDIR", "COMSPEC", "PATHEXT")
            if name in self.environment
        }
        for name in _PROFILE_NAMES:
            path = self.root / "children" / str(ordinal) / name.lower()
            path.mkdir(parents=True, exist_ok=False)
            environment[name] = str(path)
        environment["PYTHONDONTWRITEBYTECODE"] = "1"
        return tuple(sorted(environment.items()))

    def command_row(self, spec: _candidate.CommandSpec, *, output_path: str | None = None) -> dict[str, object]:
        stdout = b"safe output\n"
        output = b"candidate\n" if output_path else b""
        return {
            "command_id": spec.command_id,
            "executable": spec.executable_role,
            "argv": list(spec.argv),
            "cwd": spec.cwd_role,
            "environment": [list(row) for row in spec.environment],
            "shell": False,
            "exit_code": 0,
            "stdin_sha256": None,
            "stdout_sha256": _sha256(stdout),
            "stderr_sha256": _sha256(b""),
            "output_path": output_path,
            "output_sha256": _sha256(output) if output_path else None,
        }

    def write_complete_terminal_state(
        self,
        head: str = _HEAD,
        *,
        adapters: _FakeAdapters | None = None,
        include_reviews: bool = True,
        producer_ids: tuple[str, ...] | None = None,
    ) -> tuple[str, ...]:
        target_adapters = adapters or self.adapters
        terminal_ids: list[str] = []
        head_root = target_adapters.state / "heads" / head
        real_head = _run_git(self.git, target_adapters.repo, self.environment, "rev-parse", "HEAD").decode().strip()
        tracked = tuple(line for line in _run_git(self.git, target_adapters.repo, self.environment, "ls-files").decode().splitlines() if line != "base.txt")
        source_blobs = {path: _run_git(self.git, target_adapters.repo, self.environment, "rev-parse", f"{real_head}:{path}").decode().strip() for path in tracked}
        target_adapters.git_responses.setdefault("head_aliases", {})[head] = real_head
        target_adapters.git_responses.setdefault("source_blobs", tuple(sorted(source_blobs.items())))
        candidate_locations: dict[str, Path] = {}
        for spec in self.producer_specs():
            if producer_ids is not None and spec.producer_id not in producer_ids:
                continue
            owner = head_root / spec.producer_id
            candidate_hashes: dict[str, str] = {}
            for relative in spec.candidate_paths:
                candidate = _long_path(owner / "candidates" / relative)
                candidate.parent.mkdir(parents=True, exist_ok=True)
                payload = f"{spec.producer_id}:{relative}\n".encode()
                candidate.write_bytes(payload)
                candidate_hashes[relative] = _sha256(payload)
                candidate_locations[relative] = candidate
            worktree = None
            if spec.worktree_policy == "owned":
                allowed_paths = (
                    ("host/test_update_engine_resume.py", "host/update_engine.py")
                    if spec.producer_id == "promotion"
                    else ("extension/src/components/FAB.tsx", "extension/src/utils/pageIdentity.ts", "extension/src/utils/analyzeRequest.ts")
                )
                original_blobs = {path: source_blobs[path] for path in allowed_paths}
                worktree = {
                    "path": str((self.root / "removed-worktrees" / spec.producer_id).resolve()),
                    "head": head,
                    "status": "removed",
                    "allowed_paths": list(allowed_paths),
                    "original_blobs": original_blobs,
                    "mutated_sha256": {path: _sha256(f"mutated:{path}\n".encode()) for path in allowed_paths},
                    "restored_blobs": original_blobs,
                }
            receipt = {
                "schema_version": 1,
                "producer_id": spec.producer_id,
                "reviewed_head": head,
                "status": "succeeded",
                "dependencies": list(spec.dependencies),
                "source_blobs": source_blobs,
                "commands": [self.command_row(command) for command in spec.commands],
                "candidate_sha256": candidate_hashes,
                "worktree": worktree,
            }
            _write_json(owner / "receipt.json", receipt)
            terminal_ids.append(spec.producer_id)
        review_rows = (
            ("plan-e-review", "plan-e", "plan-e-review-package", "PASS", "Session-1"),
            ("whole-review", "whole", "whole-review-package", "INTERIM PASS THROUGH PLAN E", "Session-2"),
        ) if include_reviews and producer_ids is None else ()
        for review_id, kind, dependency, disposition, session in review_rows:
            owner = head_root / review_id
            findings_name = ".superpowers/sdd/plan-e-only-review-findings.md" if kind == "plan-e" else ".superpowers/sdd/original-whole-branch-interim-review-findings.md"
            package_name = ".superpowers/sdd/plan-e-only-review-package.txt" if kind == "plan-e" else ".superpowers/sdd/original-whole-branch-interim-review-package.txt"
            diff_name = ".superpowers/sdd/plan-e-only-review.diff" if kind == "plan-e" else ".superpowers/sdd/original-whole-branch-interim-review.diff"
            candidate = _long_path(owner / "candidates" / findings_name)
            candidate.parent.mkdir(parents=True, exist_ok=True)
            headings = _PLAN_E_REVIEW_HEADINGS if kind == "plan-e" else _WHOLE_REVIEW_HEADINGS
            bodies = {
                "Review Session": session,
                "Review Base": _INTEGRATION_BASE,
                "Review Head": head,
                "Review Range": f"{_INTEGRATION_BASE}..{head}",
                "Task 6 Audit SHA-256": _sha256(candidate_locations[".superpowers/sdd/task-6-audit-evidence.json"].read_bytes()),
                "Task 7 Audit SHA-256": _sha256(candidate_locations[".superpowers/sdd/task-7-audit-evidence.json"].read_bytes()),
                "Critical": "None.",
                "Important": "None.",
                "Minor": "None.",
                "Testing Gaps": "None.",
                "Disposition": disposition,
            }
            candidate.write_bytes("".join(f"## {heading}\n{bodies.get(heading, 'PASS')}\n" for heading in headings).encode())
            receipt = {
                "schema_version": 1,
                "producer_id": review_id,
                "review_kind": kind,
                "reviewed_head": head,
                "status": "succeeded",
                "dependencies": [dependency, "task-audits"],
                "source_blobs": source_blobs,
                "commands": [],
                "candidate_sha256": {findings_name: _sha256(candidate.read_bytes())},
                "worktree": None,
                "input_sha256": "3" * 64,
                "package_path": package_name,
                "package_sha256": _sha256(candidate_locations[package_name].read_bytes()),
                "diff_path": diff_name,
                "diff_sha256": _sha256(candidate_locations[diff_name].read_bytes()),
                "audit_paths": {"task-6": ".superpowers/sdd/task-6-audit-evidence.json", "task-7": ".superpowers/sdd/task-7-audit-evidence.json"},
                "audit_sha256": {"task-6": _sha256(candidate_locations[".superpowers/sdd/task-6-audit-evidence.json"].read_bytes()), "task-7": _sha256(candidate_locations[".superpowers/sdd/task-7-audit-evidence.json"].read_bytes())},
                "session_id": session,
                "criteria": {
                    "historical_report_honesty": "PASS",
                    "no_reconstructed_tdd": "PASS",
                    "git_lineage": "PASS",
                    "current_state_tests": "PASS",
                    "artifact_durability": "PASS",
                },
                "disposition": disposition,
                "findings_sha256": _sha256(candidate.read_bytes()),
            }
            _write_json(owner / "receipt.json", receipt)
            terminal_ids.append(review_id)
        return tuple(terminal_ids)

    def write_vitest(self, name: str, files: tuple[tuple[str, tuple[dict[str, object], ...]], ...], counters: tuple[int, int, int]) -> Path:
        path = self.root / name
        total = sum(len(rows) for _file, rows in files)
        _write_json(
            path,
            {
                "numTotalTests": total,
                "numPassedTests": counters[0],
                "numFailedTests": counters[1],
                "numPendingTests": counters[2],
                "testResults": [
                    {"name": str((self.repository / file).resolve()), "assertionResults": list(rows)}
                    for file, rows in files
                ],
            },
        )
        return path

    @staticmethod
    def vitest_row(ancestors: tuple[str, ...], title: str, status_value: str = "passed", full_name: str | None = None) -> dict[str, object]:
        return {
            "ancestorTitles": list(ancestors),
            "title": title,
            "fullName": full_name if full_name is not None else " ".join((*ancestors, title)),
            "status": status_value,
        }

    def write_review(
        self,
        kind: str,
        *,
        session: str,
        finding_section: str | None = None,
        finding: str = "None.",
        extra: bytes = b"",
        adapters: _FakeAdapters | None = None,
        filename: str | None = None,
    ) -> Path:
        target_adapters = adapters or self.adapters
        head = str(target_adapters.git_responses.get("head", _HEAD))
        audit_hashes = {"task-6": "6" * 64, "task-7": "7" * 64}
        package_hash = "4" * 64
        diff_hash = "5" * 64
        head_root = target_adapters.state / "heads" / head
        package_id = "plan-e-review-package" if kind == "plan-e" else "whole-review-package"
        package_name = ".superpowers/sdd/plan-e-only-review-package.txt" if kind == "plan-e" else ".superpowers/sdd/original-whole-branch-interim-review-package.txt"
        diff_name = ".superpowers/sdd/plan-e-only-review.diff" if kind == "plan-e" else ".superpowers/sdd/original-whole-branch-interim-review.diff"
        package_receipt = head_root / package_id / "receipt.json"
        if package_receipt.is_file():
            receipt_value = json.loads(package_receipt.read_text(encoding="utf-8"))
            candidate_hashes = receipt_value.get("candidate_sha256", {})
            package_hash = candidate_hashes.get(package_name, package_hash)
            diff_hash = candidate_hashes.get(diff_name, diff_hash)
        audit_receipt = head_root / "task-audits" / "receipt.json"
        if audit_receipt.is_file():
            receipt_value = json.loads(audit_receipt.read_text(encoding="utf-8"))
            candidate_hashes = receipt_value.get("candidate_sha256", {})
            audit_hashes = {
                "task-6": candidate_hashes.get(".superpowers/sdd/task-6-audit-evidence.json", audit_hashes["task-6"]),
                "task-7": candidate_hashes.get(".superpowers/sdd/task-7-audit-evidence.json", audit_hashes["task-7"]),
            }
        target_adapters.git_responses["review_bindings"] = {
            "package_sha256": package_hash,
            "diff_sha256": diff_hash,
            "audit_sha256": audit_hashes,
            "reviewed_head": head,
        }
        headings = _PLAN_E_REVIEW_HEADINGS if kind == "plan-e" else _WHOLE_REVIEW_HEADINGS
        bodies = {
            "Review Session": session,
            "Review Base": _INTEGRATION_BASE,
            "Review Head": head,
            "Review Range": f"{_INTEGRATION_BASE}..{head}",
            "Task 6 Audit SHA-256": audit_hashes["task-6"],
            "Task 7 Audit SHA-256": audit_hashes["task-7"],
            "Critical": "None.",
            "Important": "None.",
            "Minor": "None.",
            "Testing Gaps": "None.",
            "Disposition": "PASS" if kind == "plan-e" else "INTERIM PASS THROUGH PLAN E",
        }
        if finding_section is not None:
            bodies[finding_section] = finding
        payload = "".join(f"## {heading}\n{bodies.get(heading, 'PASS')}\n" for heading in headings).encode() + extra
        path = self.root / (filename or f"{kind}-{uuid.uuid4().hex}.md")
        path.write_bytes(payload)
        return path

    def snapshot(self) -> tuple[object, ...]:
        index = self.repository / ".git" / "index"
        return (
            _run_git(self.git, self.repository, self.environment, "rev-parse", "HEAD").strip(),
            index.read_bytes() if index.exists() else b"",
            _run_git(self.git, self.repository, self.environment, "status", "--porcelain=v1", "--untracked-files=all"),
            tuple(sorted(path.relative_to(self.repository / ".git").as_posix() for path in (self.repository / ".git").rglob("*") if path.is_file())),
        )

    def build_chronology(self) -> tuple[tuple[str, str, tuple[str, ...], str], ...]:
        sequence = (
            ("docs(update): define Windows promotion retry", ("docs/superpowers/specs/2026-07-28-windows-preparing-promotion-retry-design.md",)),
            ("docs(update): harden Windows promotion execution plan", ("docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md",)),
            ("docs(evidence): define Plan E report-loss boundary", ("docs/superpowers/specs/2026-08-19-plan-e-evidence-loss-amendment-design.md",)),
            ("docs(update): integrate Plan E evidence-loss audit", ("docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md",)),
            ("docs(evidence): correct Plan E executor boundary", ("docs/superpowers/specs/2026-08-21-plan-e-executor-boundary-correction-design.md",)),
            ("docs(evidence): define scripted Plan E executor", ("docs/superpowers/specs/2026-08-22-plan-e-scripted-evidence-executor-design.md",)),
            ("docs(extension): define Plan E public asset correction", ("docs/superpowers/specs/2026-08-23-plan-e-build-asset-and-vitest-identity-correction-design.md",)),
            ("docs(update): integrate Plan E build prerequisites", ("docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md",)),
            ("test(extension): define Plan E public default asset", ("extension/test/defaultItems.test.mjs",)),
            ("fix(extension): restore public default asset", (".gitattributes", ".gitignore", "extension/items.json")),
            ("test(evidence): define Plan E executor contracts", ("host/test_plan_e_evidence.py", "plan_e_evidence.py")),
            ("feat(evidence): add Plan E evidence executor", ("plan_e_evidence.py",)),
            ("test(update): cover locked preparing promotion", ("host/test_update_engine_resume.py",)),
            ("fix(update): retry locked preparing promotion", ("host/update_engine.py",)),
        )
        rows = []
        for ordinal, (subject, paths) in enumerate(sequence):
            parent = _run_git(self.git, self.repository, self.environment, "rev-parse", "HEAD").decode().strip()
            for relative in paths:
                path = self.repository / relative
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(f"{ordinal}:{relative}\n".encode())
            _run_git(self.git, self.repository, self.environment, "add", "--", *paths)
            _run_git(self.git, self.repository, self.environment, "commit", "-q", "-m", subject)
            commit = _run_git(self.git, self.repository, self.environment, "rev-parse", "HEAD").decode().strip()
            rows.append((commit, parent, paths, subject))
        self.adapters.git_responses["chronology"] = tuple(rows)
        self.adapters.git_responses["head"] = rows[-1][0]
        self.adapters.git_responses["branch"] = _BRANCH
        self.adapters.git_responses["status"] = b""
        return tuple(rows)

    def allow_mutation(self, head: str = _HEAD) -> None:
        self.adapters.git_responses.update(
            {
                "preflight": "valid",
                "branch": _BRANCH,
                "head": head,
                "status": b"",
                "chronology": "valid",
                "source_blobs": (("plan_e_evidence.py", "1" * 40), ("host/test_plan_e_evidence.py", "2" * 40)),
                "tool_paths": {name.removesuffix(".exe"): str((self.tools / name).resolve()) for name in ("git.exe", "python.exe", "node.exe")},
                "platform": "win32",
            }
        )

    @staticmethod
    def run_real_child(spec: _candidate.CommandSpec) -> tuple[int, bytes, bytes]:
        completed = subprocess.run(
            [spec.executable_role, *spec.argv],
            cwd=spec.cwd_role,
            env=dict(spec.environment),
            input=None,
            capture_output=True,
            shell=False,
            timeout=spec.timeout_seconds,
        )
        return (completed.returncode, completed.stdout, completed.stderr)

    def prepare_finalization(self) -> tuple[str, tuple[tuple[str, Path], ...]]:
        reviewed_head = _run_git(self.git, self.adapters.repo, self.environment, "rev-parse", "HEAD").decode().strip()
        self.allow_mutation(reviewed_head)
        self.write_complete_terminal_state(reviewed_head)
        artifacts = []
        historical_reports = {
            ".superpowers/sdd/task-1-report.md",
            ".superpowers/sdd/task-2-report.md",
            ".superpowers/sdd/task-3-report.md",
            ".superpowers/sdd/task-4-report.md",
            ".superpowers/sdd/task-5-report.md",
            ".superpowers/sdd/task-8-report.md",
        }
        historical_hashes = {
            ".superpowers/sdd/task-1-report.md": "678228ecdf3f417f09abf9973f9da9cdb4c2bf90b4a549165af592c45c3f2fba",
            ".superpowers/sdd/task-2-report.md": "edee7809419c30bd1a240caf8e220c571813185509bc34ac32a4baebb72e39f7",
            ".superpowers/sdd/task-3-report.md": "5fdd938773b361a96bfb0b95a311285bdb1803b6756670cd7ab1095f82760591",
            ".superpowers/sdd/task-4-report.md": "5f8417f109f4ac07dc3423b388cd40cd841d64d214b33b4ef2d484daca5d20c2",
            ".superpowers/sdd/task-5-report.md": "323e46ccc7b5b6277fa62e0a0b9db30299c00651db16c50aa748a6ee9b2e8f73",
            ".superpowers/sdd/task-8-report.md": "3a7d87e8f55e3731e6f405a4b58c38ff75efacb76a0ed431f0522f8ec02cfc0b",
        }
        historical_bytes = {relative: (_SOURCE_ROOT / relative).read_bytes() for relative in historical_reports}
        for ordinal, relative in enumerate(_plan_inventory("PLAN_E_ARTIFACT_PATHS")):
            source = self.repository / relative if relative in historical_reports else self.root / "final-inputs" / f"{ordinal:02d}"
            if relative in historical_reports:
                source.parent.mkdir(parents=True, exist_ok=True)
                payload = historical_bytes[relative]
                source.write_bytes(payload)
            elif relative.endswith(".json"):
                _write_json(source, {"schema_version": 1, "artifact": relative, "reviewed_head": reviewed_head})
            else:
                source.parent.mkdir(parents=True, exist_ok=True)
                source.write_bytes(f"artifact: {relative}\n".encode())
            artifacts.append((relative, source))
        self.adapters.git_responses.update(
            {
                "final_artifacts": tuple(artifacts),
                "historical_report_paths": tuple(sorted(historical_reports)),
                "historical_report_sha256": tuple(sorted(historical_hashes.items())),
                "report_inputs": {
                    "reviewed_head": reviewed_head,
                    "subject": _FINAL_SUBJECT,
                    "headings": _REPORT_HEADINGS,
                    "reviewed_paths": _plan_inventory("PLAN_E_REVIEWED_PATHS"),
                    "evidence_paths": _plan_inventory("PLAN_E_FINAL_EVIDENCE_PATHS"),
                    "task_6_7_statement": "Historical Task 6/7 reports are UNRECOVERABLE; audits prove current immutable commit state only.",
                },
            }
        )
        return reviewed_head, tuple(artifacts)

    def make_prospective_commit(self) -> str:
        repository = self.adapters.repo
        index = self.root / "prospective.index"
        environment = {**self.environment, "GIT_INDEX_FILE": str(index)}
        real_head = _run_git(self.git, repository, self.environment, "rev-parse", "HEAD").decode().strip()
        _run_git(self.git, repository, environment, "read-tree", real_head)
        payload = repository / "prospective.txt"
        payload.write_bytes(b"prospective\n")
        _run_git(self.git, repository, environment, "add", "--", "prospective.txt")
        tree = _run_git(self.git, repository, environment, "write-tree").decode().strip()
        return _run_git(self.git, repository, environment, "commit-tree", tree, "-p", real_head, "-m", _FINAL_SUBJECT).decode().strip()

    def build_final_history(self, suffix: str = "valid", corrupt_audit: bool = False) -> tuple[Path, str, str, str]:
        history = self.root / f"final-history-{suffix}"
        history.mkdir()
        _run_git(self.git, history, self.environment, "init", "-q")
        _run_git(self.git, history, self.environment, "config", "user.name", "Plan E Test")
        _run_git(self.git, history, self.environment, "config", "user.email", "plan-e@example.invalid")
        (history / "base.txt").write_bytes(b"base\n")
        _run_git(self.git, history, self.environment, "add", "--", "base.txt")
        _run_git(self.git, history, self.environment, "commit", "-q", "-m", "literal integration base fixture")
        base = _run_git(self.git, history, self.environment, "rev-parse", "HEAD").decode().strip()
        for ordinal, relative in enumerate(_plan_inventory("PLAN_E_REVIEWED_PATHS")):
            path = history / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(f"reviewed {ordinal}: {relative}\n".encode())
        _run_git(self.git, history, self.environment, "add", "--", ".")
        _run_git(self.git, history, self.environment, "commit", "-q", "-m", "reviewed Plan E head")
        reviewed = _run_git(self.git, history, self.environment, "rev-parse", "HEAD").decode().strip()
        artifacts = _plan_inventory("PLAN_E_ARTIFACT_PATHS")
        hashes = {}
        for ordinal, relative in enumerate(artifacts):
            path = _long_path(history / relative)
            path.parent.mkdir(parents=True, exist_ok=True)
            if relative.endswith(".json"):
                path.write_bytes(_canonical_bytes({"schema_version": 1, "artifact": relative, "ordinal": ordinal, "reviewed_head": reviewed}))
            elif relative.endswith("findings.md"):
                path.write_bytes(b"## Critical\nNone.\n## Important\nNone.\n## Minor\nNone.\n")
            else:
                path.write_bytes(f"artifact {ordinal}: {relative}\n".encode())
            hashes[relative] = _sha256(path.read_bytes())
        for task, relative in ((6, ".superpowers/sdd/task-6-audit-evidence.json"), (7, ".superpowers/sdd/task-7-audit-evidence.json")):
            path = history / relative
            if corrupt_audit and task == 6:
                path.write_bytes(b"arbitrary placeholder bytes\n")
            else:
                _write_json(path, {"schema_version": 1, "kind": f"task-{task}", "reviewed_head": reviewed, "claim": "current immutable commit state only", "historical_report": "UNRECOVERABLE", "checks": ["git-lineage", "source-blobs", "selectors"]})
            hashes[relative] = _sha256(path.read_bytes())
        for relative, session, disposition, kind in (
            (".superpowers/sdd/plan-e-only-review-findings.md", "Session-1", "PASS", "plan-e"),
            (".superpowers/sdd/original-whole-branch-interim-review-findings.md", "Session-2", "INTERIM PASS THROUGH PLAN E", "whole"),
        ):
            path = history / relative
            headings = _PLAN_E_REVIEW_HEADINGS if kind == "plan-e" else _WHOLE_REVIEW_HEADINGS
            bodies = {
                "Review Session": session, "Review Base": _INTEGRATION_BASE, "Review Head": reviewed,
                "Review Range": f"{_INTEGRATION_BASE}..{reviewed}", "Task 6 Audit SHA-256": hashes[".superpowers/sdd/task-6-audit-evidence.json"],
                "Task 7 Audit SHA-256": hashes[".superpowers/sdd/task-7-audit-evidence.json"], "Critical": "None.",
                "Important": "None.", "Minor": "None.", "Testing Gaps": "None.", "Disposition": disposition,
            }
            path.write_bytes("".join(f"## {heading}\n{bodies.get(heading, 'PASS')}\n" for heading in headings).encode())
            hashes[relative] = _sha256(path.read_bytes())
        manifest = history / ".superpowers" / "sdd" / "final-artifacts.sha256.json"
        _write_json(manifest, {"schema_version": 1, "artifacts": hashes})
        report = history / ".superpowers" / "sdd" / "plan-e-extension-hardening-report.md"
        requirements = "".join(f"| R{ordinal} | test_{ordinal} |\n" for ordinal in range(1, 10))
        reviewed_paths = "".join(f"- `{path}`\n" for path in _plan_inventory("PLAN_E_REVIEWED_PATHS"))
        evidence_paths = "".join(f"- `{path}`\n" for path in _plan_inventory("PLAN_E_FINAL_EVIDENCE_PATHS"))
        bodies = {
            "Scope and Constraints": "Internal evidence only; forbidden operations NOT RUN.\n",
            "Commit Map": f"Reviewed Head: {reviewed}\nEvidence Subject: {_FINAL_SUBJECT}\n",
            "Requirement-to-Test Matrix": requirements,
            "Historical Report Availability and Current-State Audits": "Historical Task 6/7 reports are UNRECOVERABLE; audits prove current immutable commit state only.\n",
            "Static and Diff Results": f"Manifest SHA-256: {_sha256(manifest.read_bytes())}\nReviewed paths:\n{reviewed_paths}Evidence paths:\n{evidence_paths}",
            "Skipped Unsafe Operations": "network registry AppData browser install publish push tag real update: NOT RUN\n",
            "Residual Risks": "Declared review sessions do not prove identity or independence.\n",
        }
        report.write_bytes(("# Plan E Extension Hardening Report\n\n" + "".join(f"## {heading}\n{bodies.get(heading, 'PASS\n')}" for heading in _REPORT_HEADINGS)).encode())
        _run_git(self.git, history, self.environment, "add", "--", ".")
        _run_git(self.git, history, self.environment, "commit", "-q", "-m", _FINAL_SUBJECT)
        final = _run_git(self.git, history, self.environment, "rev-parse", "HEAD").decode().strip()
        clone = self.root / f"verify-clone-{suffix}"
        subprocess.run([self.git, "clone", "--no-hardlinks", "--no-local", str(history), str(clone)], check=True, capture_output=True, env=self.environment, shell=False, timeout=30)
        return clone, base, reviewed, final


class CliContractTests(_Fixture, unittest.TestCase):
    def test_cli_grammar_accepts_only_fixed_commands_and_producer_kinds(self):
        rejected = (
            (), ("unknown",), ("preflight", "extra"), ("status", "--help"),
            ("produce", "--kind", "focused", "--reviewed-head", _HEAD),
            ("produce", "--kind", "host", "--reviewed-head", _HEAD.upper()),
            ("produce", "--kind", "host", "--kind", "host", "--reviewed-head", _HEAD),
            ("ingest-review", "--kind", "plan-e", "--reviewed-head", _HEAD, "--input", "relative.md"),
            ("@response.txt",),
        )
        parsed_rows = []
        adapters = []
        dispatched = []
        for ordinal, argv in enumerate(_accepted_argv(self.root)):
            try:
                captured = ("return", _candidate.parse_cli(argv))
            except Exception as error:
                captured = ("error", getattr(error, "code", type(error).__name__))
            parsed_rows.append(captured)
            if captured[0] == "return":
                adapter = _FakeAdapters(self.root / f"grammar-{ordinal}", self.repository, self.git, self.environment)
                adapter.dry_run = True
                adapter.expected_command = (captured[1].name, captured[1].options)
                adapters.append(adapter)
                dispatched.append(_candidate.execute_command(captured[1], adapter))
        parsed = tuple(parsed_rows)
        rejected_rows = []
        for argv in rejected:
            try:
                rejected_rows.append(("return", _candidate.parse_cli(argv)))
            except Exception as error:
                rejected_rows.append(("error", getattr(error, "code", type(error).__name__)))
        rejected_results = tuple(rejected_rows)
        expected_parsed = (
            ("return", _candidate.ParsedCommand("preflight", ())),
            ("return", _candidate.ParsedCommand("status", ())),
            *tuple(("return", _candidate.ParsedCommand("produce", (("kind", kind), ("reviewed_head", _HEAD)))) for kind in _PRODUCER_KINDS),
            ("return", _candidate.ParsedCommand("ingest-review", (("kind", "plan-e"), ("reviewed_head", _HEAD), ("session_id", "Session-1"), ("input", "C:/plan-e-review.md")))),
            ("return", _candidate.ParsedCommand("ingest-review", (("kind", "whole"), ("reviewed_head", _HEAD), ("session_id", "Session-2"), ("input", "C:/whole-review.md")))),
            ("return", _candidate.ParsedCommand("retire", (("old_head", _HEAD), ("new_head", _NEW_HEAD)))),
            ("return", _candidate.ParsedCommand("finalize", (("reviewed_head", _HEAD),))),
            ("return", _candidate.ParsedCommand("verify-final", (("final_head", _HEAD),))),
        )
        expected_commands = tuple(value.name for _outcome, value in expected_parsed)
        expected_dispatches = tuple((value.name, value.options) for _outcome, value in expected_parsed)
        observed = (parsed, tuple(result.command for result in dispatched), tuple(command for adapter in adapters for command in adapter.observed_commands), rejected_results)
        expected = (expected_parsed, expected_commands, expected_dispatches, (("error", "invalid_cli"),) * len(rejected))
        self.assertEqual(observed, expected)

    def test_every_command_emits_one_canonical_json_object_and_fixed_exit_code(self):
        rows = []
        for ordinal, argv in enumerate(_accepted_argv(self.root)):
            parsed = _candidate.parse_cli(argv)
            adapters = _FakeAdapters(self.root / f"emit-{ordinal}", self.repository, self.git, self.environment)
            adapters.git_responses["preflight"] = "invalid"
            result = _candidate.execute_command(parsed, adapters)
            stream = io.BytesIO()
            _candidate.emit_result(result, stream)
            main_adapters = _FakeAdapters(self.root / f"main-{ordinal}", self.repository, self.git, self.environment)
            main_adapters.git_responses["preflight"] = "invalid"
            main_stream = io.BytesIO()
            with mock.patch.object(_candidate, "_make_adapters", return_value=main_adapters), mock.patch.object(_candidate, "_stdout_stream", return_value=main_stream):
                exit_code = _candidate.main(argv)
            rows.append((parsed.name, result, stream.getvalue(), exit_code, main_stream.getvalue()))
        expected = []
        for argv in _accepted_argv(self.root):
            command = argv[0]
            status_value = "ok" if command == "status" else "blocked"
            code = "state_absent" if command == "status" else "chronology_invalid"
            fields = (("classification", "absent"), ("reviewed_head", None), ("authority_paths", ())) if command == "status" else ()
            result = self.expected_result(command, status_value, code, fields)
            payload = {"schema_version": 1, "command": command, "status": status_value, "code": code, **dict(fields)}
            if "authority_paths" in payload:
                payload["authority_paths"] = list(typing.cast(tuple[object, ...], payload["authority_paths"]))
            encoded = _canonical_bytes(payload)
            expected.append((command, result, encoded, 0 if command == "status" else 4, encoded))
        self.assertEqual(tuple(rows), tuple(expected))

    def test_cli_main_maps_only_known_failures_and_releases_resources_in_finally(self):
        status_adapters = _FakeAdapters(self.root / "status", self.repository, self.git, self.environment)
        mutation_adapters = _FakeAdapters(self.root / "mutation", self.repository, self.git, self.environment)
        mutation_adapters.raise_on_repository_root = True
        status_stream = io.BytesIO()
        mutation_stream = io.BytesIO()
        with mock.patch.object(_candidate, "_make_adapters", side_effect=(status_adapters, mutation_adapters)), mock.patch.object(
            _candidate, "_stdout_stream", side_effect=(status_stream, mutation_stream)
        ):
            status_exit = _candidate.main(("status",))
            mutation_exit = _candidate.main(("produce", "--kind", "host", "--reviewed-head", _HEAD))
        parsed = _candidate.parse_cli(("status",))
        direct = _candidate.execute_command(parsed, self.adapters)
        observed = (status_exit, status_stream.getvalue(), mutation_exit, mutation_stream.getvalue(), direct)
        expected = (
            0,
            _canonical_bytes({"authority_paths": [], "classification": "absent", "code": "state_absent", "command": "status", "reviewed_head": None, "schema_version": 1, "status": "ok"}),
            5,
            _canonical_bytes({"code": "internal_error", "command": "produce", "schema_version": 1, "status": "error"}),
            self.expected_result("status", "ok", "state_absent", (("classification", "absent"), ("reviewed_head", None), ("authority_paths", ()))),
        )
        self.assertEqual(observed, expected)

    def test_review_session_cli_grammar_uses_shell_safe_subset(self):
        accepted = ("A", "aZ09._:@/+-=", "A" + "z" * 127)
        rejected = ("", "-x", ".leading", "bad space", "bad'quote", "bad\nline", "Unicode-\u00e9", "A" + "z" * 128)
        rows = []
        for value in accepted + rejected:
            argv = ("ingest-review", "--kind", "plan-e", "--reviewed-head", _HEAD, "--session-id", value, "--input", str((self.root / "review.md").resolve()))
            try:
                captured = ("return", _candidate.parse_cli(argv))
            except Exception as error:
                captured = ("error", getattr(error, "code", type(error).__name__))
            result = _candidate.execute_command(captured[1], self.adapters) if captured[0] == "return" else None
            rows.append((captured, result))
        expected = tuple(
            (
                ("return", _candidate.ParsedCommand("ingest-review", (("kind", "plan-e"), ("reviewed_head", _HEAD), ("session_id", value), ("input", str((self.root / "review.md").resolve()))))),
                self.expected_result("ingest-review", "blocked", "review_input_missing"),
            )
            for value in accepted
        ) + tuple((("error", "invalid_cli"), None) for _ in rejected)
        self.assertEqual(tuple(rows), expected)

    def test_preflight_binds_exact_direct_commit_chronology_and_path_scopes(self):
        rows = self.build_chronology()
        parsed = _candidate.parse_cli(("preflight",))
        valid = _candidate.execute_command(parsed, self.adapters)
        invalid_results = []
        for axis in ("parent", "subject", "paths"):
            invalid_rows = list(rows)
            if axis == "parent":
                invalid_rows[4] = (invalid_rows[4][0], "f" * 40, invalid_rows[4][2], invalid_rows[4][3])
            elif axis == "subject":
                invalid_rows[4] = (*invalid_rows[4][:3], "test(evidence): wrong")
            else:
                invalid_rows[4] = (invalid_rows[4][0], invalid_rows[4][1], ("plan_e_evidence.py",), invalid_rows[4][3])
            adapters = _FakeAdapters(self.root / f"chronology-{axis}", self.repository, self.git, self.environment)
            adapters.git_responses.update({"chronology": tuple(invalid_rows), "branch": _BRANCH, "status": b""})
            invalid_results.append(_candidate.execute_command(parsed, adapters))
        expected_valid = self.expected_result("preflight", "ok", "preflight_ok", (("chronology", tuple(row[0] for row in rows)), ("path_counts", (1, 1, 1, 1, 1, 1, 1, 1, 1, 3, 2, 1, 1, 1))))
        expected_invalid = tuple(self.expected_result("preflight", "blocked", "chronology_invalid", (("reason", reason),)) for reason in ("parent_mismatch", "subject_mismatch", "path_scope_mismatch"))
        self.assertEqual((valid, tuple(invalid_results)), (expected_valid, expected_invalid))

    def test_preflight_requires_canonical_branch_repo_tools_and_clean_source(self):
        parsed = _candidate.parse_cli(("preflight",))
        wrong_adapters = _FakeAdapters(self.root / "wrong-branch", self.repository, self.git, self.environment)
        wrong_adapters.git_responses.update({"branch": "wrong", "status": b""})
        wrong_branch = _candidate.execute_command(parsed, wrong_adapters)
        dirty_adapters = _FakeAdapters(self.root / "dirty", self.repository, self.git, self.environment)
        dirty_adapters.git_responses.update({"branch": _BRANCH, "status": b" M host/file.py\n"})
        dirty = _candidate.execute_command(parsed, dirty_adapters)
        unsafe_adapters = _FakeAdapters(self.root / "unsafe-tool", self.repository, self.git, self.environment)
        unsafe_adapters.git_responses.update({"branch": _BRANCH, "status": b"", "git_path": str(self.root / "missing-git.exe")})
        unsafe_tool = _candidate.execute_command(parsed, unsafe_adapters)
        observed = (wrong_branch, dirty, unsafe_tool)
        expected = (
            self.expected_result("preflight", "blocked", "chronology_invalid", (("reason", "wrong_branch"),)),
            self.expected_result("preflight", "blocked", "source_dirty", (("paths", ("host/file.py",)),)),
            self.expected_result("preflight", "blocked", "unsafe_tool", (("tool", "git"),)),
        )
        self.assertEqual(observed, expected)

    def test_tested_source_roots_and_reviewed_blobs_are_exact(self):
        roots = (
            "extension", "host", "tests", "docs/superpowers/plans/2026-07-18-hardening-e-extension-data.md",
            ".gitattributes", ".gitignore", "release_helper.py", "plan_e_evidence.py", "dev_switch.py",
            "installer_core.ps1", "dyhelper_installer.ps1", "install.bat",
        )
        leaves = []
        for ordinal, root in enumerate(roots):
            path = self.repository / root
            if path.suffix or "." in path.name:
                path.parent.mkdir(parents=True, exist_ok=True)
            else:
                path.mkdir(parents=True, exist_ok=True)
                path = path / "sample.txt"
            path.write_bytes(f"source {ordinal}\n".encode())
            leaves.append(path.relative_to(self.repository).as_posix())
        _run_git(self.git, self.repository, self.environment, "add", "--", *leaves)
        _run_git(self.git, self.repository, self.environment, "commit", "-q", "-m", "tracked source roots")
        head = _run_git(self.git, self.repository, self.environment, "rev-parse", "HEAD").decode().strip()
        blobs = tuple((leaf, _run_git(self.git, self.repository, self.environment, "rev-parse", f"HEAD:{leaf}").decode().strip()) for leaf in sorted(leaves))
        self.adapters.git_responses.update({"head": head, "source_blobs": blobs, "source_roots": roots})
        parsed = _candidate.parse_cli(("preflight",))
        result = _candidate.execute_command(parsed, self.adapters)
        expected = self.expected_result("preflight", "ok", "preflight_ok", (("source_roots", roots), ("source_blobs", blobs)))
        self.assertEqual((result, tuple(path.exists() for path in (self.repository / leaf for leaf in leaves)), _calls(self.adapters, "git", "source_blobs")), (expected, (True,) * len(leaves), ((head, roots),)))

    def test_preflight_requires_six_report_hashes_and_task_6_7_absence(self):
        report_rows = []
        for task in (1, 2, 3, 4, 5, 8):
            path = self.repository / ".superpowers" / "sdd" / f"task-{task}-report.md"
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(f"task {task}\n".encode())
            report_rows.append((task, _sha256(path.read_bytes())))
        self.adapters.scenario["historical_reports"] = tuple(report_rows)
        parsed = _candidate.parse_cli(("preflight",))
        result = _candidate.execute_command(parsed, self.adapters)
        expected = self.expected_result("preflight", "ok", "preflight_ok", (("historical_reports", tuple(report_rows)), ("absent_reports", (6, 7))))
        reads = _calls(self.adapters, "filesystem", "read_bytes")
        self.assertEqual((result, tuple((self.repository / ".superpowers" / "sdd" / f"task-{task}-report.md",) in reads for task, _hash in report_rows)), (expected, (True,) * 6))

    def test_recovered_exact_task_6_or_7_report_requires_contract_revision(self):
        report = self.repository / ".superpowers" / "sdd" / "task-6-report.md"
        report.parent.mkdir(parents=True)
        report.write_bytes(b"recovered exact historical report\n")
        before = report.read_bytes()
        parsed = _candidate.parse_cli(("finalize", "--reviewed-head", _HEAD))
        result = _candidate.execute_command(parsed, self.adapters)
        expected = self.expected_result("finalize", "blocked", "contract_revision_required", (("reports", (6,)),))
        self.assertEqual((result, report.read_bytes(), self.adapters.state.exists()), (expected, before, False))

    def test_repository_root_is_script_relative_not_ambient_cwd(self):
        ambient = self.root / "ambient"
        ambient.mkdir()
        previous = Path.cwd()
        try:
            os.chdir(ambient)
            parsed = _candidate.parse_cli(("status",))
            result = _candidate.execute_command(parsed, self.adapters)
        finally:
            os.chdir(previous)
        expected = self.expected_result("status", "ok", "state_absent", (("repository_root", self.repository.as_posix()), ("classification", "absent"), ("reviewed_head", None), ("authority_paths", ())))
        self.assertEqual((result, tuple(ambient.iterdir())), (expected, ()))

    def test_producer_maps_and_command_constants_are_exact(self):
        specs = self.producer_specs()
        self.adapters.git_responses["tool_paths"] = {name.removesuffix(".exe"): str((self.tools / name).resolve()) for name in ("git.exe", "python.exe", "node.exe")}
        parsed = _candidate.parse_cli(("preflight",))
        result = _candidate.execute_command(parsed, self.adapters)
        expected = self.expected_result("preflight", "ok", "preflight_ok", (("producer_specs", specs),))
        process_specs = tuple(call[2][0] for call in self.adapters.calls if call[:2] == ("process", "run"))
        self.assertEqual((result, process_specs), (expected, self.command_specs()))

    def test_public_types_and_function_signatures_are_exact(self):
        parsed = _candidate.parse_cli(("status",))
        result = _candidate.execute_command(parsed, self.adapters)
        expected_all = (
            "RecordSchema", "ParsedCommand", "CliResult", "CommandSpec", "ProducerSpec", "Adapters",
            "canonical_json_bytes", "load_canonical_json", "parse_cli", "execute_command", "emit_result", "main",
        )
        public = tuple(sorted(name for name, value in vars(_candidate).items() if not name.startswith("_") and callable(value) and getattr(value, "__module__", None) == _candidate.__name__))
        fields = {
            name: tuple((field.name, typing.get_type_hints(getattr(_candidate, name))[field.name], field.default) for field in dataclasses.fields(getattr(_candidate, name)))
            for name in ("RecordSchema", "ParsedCommand", "CliResult", "CommandSpec", "ProducerSpec")
        }
        signatures = {
            name: (
                tuple((parameter.name, parameter.kind, parameter.default, typing.get_type_hints(getattr(_candidate, name))[parameter.name]) for parameter in inspect.signature(getattr(_candidate, name)).parameters.values()),
                typing.get_type_hints(getattr(_candidate, name))["return"],
            )
            for name in expected_all[-6:]
        }
        adapter_methods = tuple(sorted(name for name, value in vars(_candidate.Adapters).items() if not name.startswith("_") and callable(value)))
        adapter_signatures = {
            name: (
                tuple((parameter.name, parameter.kind, parameter.default, typing.get_type_hints(getattr(_candidate.Adapters, name)).get(parameter.name, typing.Any)) for parameter in inspect.signature(getattr(_candidate.Adapters, name)).parameters.values()),
                typing.get_type_hints(getattr(_candidate.Adapters, name))["return"],
            )
            for name in adapter_methods
        }
        frozen = tuple(getattr(_candidate, name).__dataclass_params__.frozen for name in ("RecordSchema", "ParsedCommand", "CliResult", "CommandSpec", "ProducerSpec"))
        observed = (_candidate.__all__, public, fields, signatures, getattr(_candidate.Adapters, "_is_protocol", False), adapter_signatures, frozen, result)
        expected = (
            expected_all,
            tuple(sorted(expected_all)),
            {
                "RecordSchema": (("name", str, dataclasses.MISSING), ("fields", tuple[tuple[str, object], ...], dataclasses.MISSING)),
                "ParsedCommand": (("name", str, dataclasses.MISSING), ("options", tuple[tuple[str, str], ...], dataclasses.MISSING)),
                "CliResult": (("schema_version", int, dataclasses.MISSING), ("command", str, dataclasses.MISSING), ("status", str, dataclasses.MISSING), ("code", str, dataclasses.MISSING), ("fields", tuple[tuple[str, object], ...], dataclasses.MISSING)),
                "CommandSpec": (("command_id", str, dataclasses.MISSING), ("executable_role", str, dataclasses.MISSING), ("argv", tuple[str, ...], dataclasses.MISSING), ("cwd_role", str, dataclasses.MISSING), ("environment", tuple[tuple[str, str], ...], dataclasses.MISSING), ("timeout_seconds", int, dataclasses.MISSING), ("stdin_policy", str, dataclasses.MISSING), ("stdout_limit_bytes", int, dataclasses.MISSING), ("stderr_limit_bytes", int, dataclasses.MISSING)),
                "ProducerSpec": (("producer_id", str, dataclasses.MISSING), ("dependencies", tuple[str, ...], dataclasses.MISSING), ("commands", tuple[_candidate.CommandSpec, ...], dataclasses.MISSING), ("candidate_paths", tuple[str, ...], dataclasses.MISSING), ("source_roots", tuple[str, ...], dataclasses.MISSING), ("worktree_policy", str, dataclasses.MISSING), ("validator_id", str, dataclasses.MISSING)),
            },
            {
                "canonical_json_bytes": ((("value", inspect.Parameter.POSITIONAL_OR_KEYWORD, inspect.Signature.empty, object),), bytes),
                "load_canonical_json": ((("path", inspect.Parameter.POSITIONAL_OR_KEYWORD, inspect.Signature.empty, Path), ("schema", inspect.Parameter.POSITIONAL_OR_KEYWORD, inspect.Signature.empty, _candidate.RecordSchema)), dict[str, object]),
                "parse_cli": ((("argv", inspect.Parameter.POSITIONAL_OR_KEYWORD, inspect.Signature.empty, collections.abc.Sequence[str]),), _candidate.ParsedCommand),
                "execute_command": ((("command", inspect.Parameter.POSITIONAL_OR_KEYWORD, inspect.Signature.empty, _candidate.ParsedCommand), ("adapters", inspect.Parameter.POSITIONAL_OR_KEYWORD, inspect.Signature.empty, _candidate.Adapters)), _candidate.CliResult),
                "emit_result": ((("result", inspect.Parameter.POSITIONAL_OR_KEYWORD, inspect.Signature.empty, _candidate.CliResult), ("stream", inspect.Parameter.POSITIONAL_OR_KEYWORD, inspect.Signature.empty, typing.BinaryIO)), type(None)),
                "main": ((("argv", inspect.Parameter.POSITIONAL_OR_KEYWORD, None, collections.abc.Sequence[str] | None),), int),
            },
            True,
            {
                "clock": ((('self', inspect.Parameter.POSITIONAL_OR_KEYWORD, inspect.Signature.empty, typing.Any), ('operation', inspect.Parameter.POSITIONAL_OR_KEYWORD, inspect.Signature.empty, str), ('arguments', inspect.Parameter.POSITIONAL_OR_KEYWORD, inspect.Signature.empty, tuple[object, ...])), object),
                "common_dir": ((('self', inspect.Parameter.POSITIONAL_OR_KEYWORD, inspect.Signature.empty, typing.Any),), Path),
                "filesystem": ((('self', inspect.Parameter.POSITIONAL_OR_KEYWORD, inspect.Signature.empty, typing.Any), ('operation', inspect.Parameter.POSITIONAL_OR_KEYWORD, inspect.Signature.empty, str), ('arguments', inspect.Parameter.POSITIONAL_OR_KEYWORD, inspect.Signature.empty, tuple[object, ...])), object),
                "git": ((('self', inspect.Parameter.POSITIONAL_OR_KEYWORD, inspect.Signature.empty, typing.Any), ('operation', inspect.Parameter.POSITIONAL_OR_KEYWORD, inspect.Signature.empty, str), ('arguments', inspect.Parameter.POSITIONAL_OR_KEYWORD, inspect.Signature.empty, tuple[object, ...])), object),
                "mutex": ((('self', inspect.Parameter.POSITIONAL_OR_KEYWORD, inspect.Signature.empty, typing.Any), ('operation', inspect.Parameter.POSITIONAL_OR_KEYWORD, inspect.Signature.empty, str), ('arguments', inspect.Parameter.POSITIONAL_OR_KEYWORD, inspect.Signature.empty, tuple[object, ...])), object),
                "process": ((('self', inspect.Parameter.POSITIONAL_OR_KEYWORD, inspect.Signature.empty, typing.Any), ('operation', inspect.Parameter.POSITIONAL_OR_KEYWORD, inspect.Signature.empty, str), ('arguments', inspect.Parameter.POSITIONAL_OR_KEYWORD, inspect.Signature.empty, tuple[object, ...])), object),
                "randomness": ((('self', inspect.Parameter.POSITIONAL_OR_KEYWORD, inspect.Signature.empty, typing.Any), ('operation', inspect.Parameter.POSITIONAL_OR_KEYWORD, inspect.Signature.empty, str), ('arguments', inspect.Parameter.POSITIONAL_OR_KEYWORD, inspect.Signature.empty, tuple[object, ...])), object),
                "repository_root": ((('self', inspect.Parameter.POSITIONAL_OR_KEYWORD, inspect.Signature.empty, typing.Any),), Path),
                "state_root": ((('self', inspect.Parameter.POSITIONAL_OR_KEYWORD, inspect.Signature.empty, typing.Any),), Path),
            },
            (True, True, True, True, True),
            self.expected_result("status", "ok", "state_absent", (("classification", "absent"), ("reviewed_head", None), ("authority_paths", ()))),
        )
        self.assertEqual(observed, expected)


class CanonicalJsonTests(_Fixture, unittest.TestCase):
    def test_canonical_json_round_trip_is_byte_exact(self):
        value = {"z": "Snowman: \u2603", "a": [1, True, None], "hash": _SHA256}
        payload = _candidate.canonical_json_bytes(value)
        path = self.root / "canonical.json"
        path.write_bytes(payload)
        schema = _candidate.RecordSchema("sample", (("a", list), ("hash", str), ("z", str)))
        observed = (payload, _candidate.load_canonical_json(path, schema), path.read_bytes())
        expected_payload = b'{"a":[1,true,null],"hash":"' + _SHA256.encode() + b'","z":"Snowman: \\u2603"}\n'
        self.assertEqual(observed, (expected_payload, value, expected_payload))

    def test_canonical_json_rejects_duplicate_unknown_missing_and_noncanonical_data(self):
        schema = _candidate.RecordSchema("row", (("count", ("nonnegative_int", int)), ("git", ("lower_hex", 40)), ("sha256", ("lower_hex", 64)), ("values", ("sorted_unique_list", str))))
        valid = b'{"count":1,"git":"' + _HEAD.encode() + b'","sha256":"' + _SHA256.encode() + b'","values":["a","b"]}\n'
        mutations = (
            valid.replace(b'"count":1', b'"count":1,"count":1'), valid.replace(b'"count":1,', b''),
            valid.replace(b'"count":1', b'"count":1,"unknown":0'), valid.replace(b'"count":1', b'"count":NaN'),
            b"\xef\xbb\xbf" + valid, valid.replace(b"\n", b"\r\n"), valid.replace(b'":', b'": '),
            valid.rstrip(b"\n"), valid + b"\n", valid.replace(_HEAD.encode(), _SHA256.encode()),
            valid.replace(_SHA256.encode(), _HEAD.encode()), valid.replace(b'"count":1', b'"count":true'),
            valid.replace(b'["a","b"]', b'["b","a"]'), valid.replace(b'["a","b"]', b'["a","a"]'), b"\xff",
        )
        outcomes = []
        for ordinal, payload in enumerate(mutations):
            path = self.root / f"bad-{ordinal}.json"
            path.write_bytes(payload)
            try:
                outcomes.append(("return", _candidate.load_canonical_json(path, schema)))
            except Exception as error:
                outcomes.append(("error", getattr(error, "code", type(error).__name__)))
        self.assertEqual(tuple(outcomes), (("error", "invalid_canonical_json"),) * len(mutations))

    def test_random_token_is_exact_128_bit_lowercase_hex(self):
        self.allow_mutation()
        self.adapters.random_values = [bytes(range(16))]
        parsed = _candidate.parse_cli(("produce", "--kind", "host", "--reviewed-head", _HEAD))
        valid = _candidate.execute_command(parsed, self.adapters)
        lease = self.adapters.common / "plan-e-evidence-v1.lease.json"
        lease_value = json.loads(lease.read_text(encoding="utf-8")) if lease.exists() else {}
        invalid_rows = []
        for ordinal, value in enumerate((b"short", b"x" * 17, "0" * 32, True, 1)):
            invalid_adapters = _FakeAdapters(self.root / f"invalid-token-{ordinal}", self.repository, self.git, self.environment)
            invalid_adapters.git_responses.update(self.adapters.git_responses)
            invalid_adapters.random_values = [value]
            invalid = _candidate.execute_command(parsed, invalid_adapters)
            invalid_rows.append((invalid, (invalid_adapters.common / "plan-e-evidence-v1.lease.json").exists()))
        expected = (
            self.expected_result("produce", "blocked", "evidence_missing", (("kind", "host"),)),
            "000102030405060708090a0b0c0d0e0f",
            tuple((self.expected_result("produce", "error", "internal_error", (("reason", "invalid_random_token"),)), False) for _ in invalid_rows),
        )
        self.assertEqual((valid, lease_value.get("token"), tuple(invalid_rows)), expected)


class PathSafetyTests(_Fixture, unittest.TestCase):
    def test_authority_paths_reject_escape_alias_case_separator_and_reparse(self):
        outside = self.root / "outside.txt"
        outside.write_bytes(b"keep\n")
        state = self.adapters.state
        state.mkdir()
        hazards = ("../outside", "/absolute", "safe\\record", "safe//record", "safe/./record", "safe/", "C:/drive", "//server/share", "safe:stream", "CON", "Safe/record")
        _write_json(state / "hazards.json", {"paths": list(hazards)})
        link = state / "link"
        symlink = True
        try:
            link.symlink_to(outside)
        except OSError:
            symlink = False
        self.adapters.filesystem_responses["stat_race"] = (1, 2)
        self.adapters.filesystem_responses["reparse"] = True
        parsed = _candidate.parse_cli(("status",))
        result = _candidate.execute_command(parsed, self.adapters)
        expected = self.expected_result("status", "blocked", "retained_state", (("reason", "unsafe_path"), ("paths", hazards), ("symlink_observed", symlink), ("reparse_observed", True), ("stat_race", True)))
        self.assertEqual((result, outside.read_bytes()), (expected, b"keep\n"))

    def test_receipt_strings_never_authorize_writes_or_deletes(self):
        self.allow_mutation()
        outside = self.root / "outside.txt"
        outside.write_bytes(b"keep\n")
        owner = self.adapters.state / "heads" / _HEAD / "host"
        _write_json(owner / "receipt.json", {"schema_version": 1, "producer_id": "host", "status": "succeeded", "candidate_sha256": {str(outside): _SHA256}, "owner": str(outside), "worktree": str(outside), "quarantine": str(outside)})
        parsed = _candidate.parse_cli(("retire", "--old-head", _HEAD, "--new-head", _NEW_HEAD))
        result = _candidate.execute_command(parsed, self.adapters)
        write_calls = tuple(call for call in self.adapters.calls if call[0] == "filesystem" and call[1] in {"write_bytes", "unlink", "rename", "remove_tree"})
        reads = _calls(self.adapters, "filesystem", "read_bytes")
        expected = self.expected_result("retire", "blocked", "retained_state", (("reason", "untrusted_receipt_path"),))
        self.assertEqual((result, outside.read_bytes(), write_calls, reads), (expected, b"keep\n", (), ((owner / "receipt.json",),)))


class ReadOnlyCommandTests(_Fixture, unittest.TestCase):
    def test_preflight_and_status_are_read_only_and_index_byte_exact(self):
        adapters = _FakeAdapters(self.root / "read-only", self.repository, self.git, self.environment, self.repository / ".git")
        before = self.snapshot()
        preflight = _candidate.execute_command(_candidate.parse_cli(("preflight",)), adapters)
        status_result = _candidate.execute_command(_candidate.parse_cli(("status",)), adapters)
        after = self.snapshot()
        mutations = tuple(call for call in adapters.calls if call[0] in {"filesystem", "mutex"} and call[1] in {"write_bytes", "write_exclusive", "mkdir", "unlink", "rename", "remove_tree", "acquire"})
        expected = (
            self.expected_result("preflight", "blocked", "chronology_invalid"),
            self.expected_result("status", "ok", "state_absent", (("classification", "absent"), ("reviewed_head", None), ("authority_paths", ()))),
            before,
            (),
        )
        self.assertEqual((preflight, status_result, after, mutations), expected)

    def test_status_classifies_only_absent_ready_or_retained_state(self):
        parsed = _candidate.parse_cli(("status",))
        absent_adapters = _FakeAdapters(self.root / "absent", self.repository, self.git, self.environment)
        absent = _candidate.execute_command(parsed, absent_adapters)
        ready_adapters = _FakeAdapters(self.root / "ready", self.repository, self.git, self.environment)
        terminal_ids = self.write_complete_terminal_state(adapters=ready_adapters)
        ready = _candidate.execute_command(parsed, ready_adapters)
        retained_adapters = _FakeAdapters(self.root / "retained", self.repository, self.git, self.environment)
        unknown = retained_adapters.state / "unknown"
        unknown.parent.mkdir(parents=True, exist_ok=True)
        unknown.write_bytes(b"unknown\n")
        retained = _candidate.execute_command(parsed, retained_adapters)
        partial_adapters = _FakeAdapters(self.root / "partial", self.repository, self.git, self.environment)
        partial_ids = self.write_complete_terminal_state(adapters=partial_adapters, include_reviews=False, producer_ids=("host",))
        partial = _candidate.execute_command(parsed, partial_adapters)
        expected = (
            self.expected_result("status", "ok", "state_absent", (("classification", "absent"), ("reviewed_head", None), ("authority_paths", ()))),
            self.expected_result("status", "ok", "state_ready", (("classification", "ready"), ("reviewed_head", _HEAD), ("terminal_ids", terminal_ids))),
            self.expected_result("status", "blocked", "retained_state", (("authority_paths", (unknown.as_posix(),)),)),
            self.expected_result("status", "ok", "state_ready", (("classification", "ready"), ("reviewed_head", _HEAD), ("terminal_ids", partial_ids))),
        )
        self.assertEqual((absent, ready, retained, partial), expected)

    def test_status_reviewed_head_field_drives_retirement_and_finalizer_literals(self):
        parsed = _candidate.parse_cli(("status",))
        absent_adapters = _FakeAdapters(self.root / "head-absent", self.repository, self.git, self.environment)
        absent = _candidate.execute_command(parsed, absent_adapters)
        ready_adapters = _FakeAdapters(self.root / "head-ready", self.repository, self.git, self.environment)
        self.write_complete_terminal_state(adapters=ready_adapters)
        ready = _candidate.execute_command(parsed, ready_adapters)
        mixed_adapters = _FakeAdapters(self.root / "head-mixed", self.repository, self.git, self.environment)
        self.write_complete_terminal_state(_HEAD, adapters=mixed_adapters)
        self.write_complete_terminal_state(_NEW_HEAD, adapters=mixed_adapters)
        mixed = _candidate.execute_command(parsed, mixed_adapters)
        retire_adapters = _FakeAdapters(self.root / "head-retire", self.repository, self.git, self.environment)
        retire_adapters.git_responses.update({"preflight": "valid", "platform": "win32", "validated_status_head": _HEAD})
        self.write_complete_terminal_state(_HEAD, adapters=retire_adapters)
        retired = _candidate.execute_command(_candidate.parse_cli(("retire", "--old-head", _NEW_HEAD, "--new-head", "c" * 40)), retire_adapters)
        finalize_adapters = _FakeAdapters(self.root / "head-finalize", self.repository, self.git, self.environment)
        finalize_adapters.git_responses.update({"preflight": "valid", "platform": "win32", "validated_status_head": _HEAD})
        self.write_complete_terminal_state(_HEAD, adapters=finalize_adapters)
        finalized = _candidate.execute_command(_candidate.parse_cli(("finalize", "--reviewed-head", _NEW_HEAD)), finalize_adapters)
        expected = (
            self.expected_result("status", "ok", "state_absent", (("classification", "absent"), ("reviewed_head", None), ("authority_paths", ()))),
            self.expected_result("status", "ok", "state_ready", (("classification", "ready"), ("reviewed_head", _HEAD))),
            self.expected_result("status", "blocked", "retained_state", (("reason", "mixed_heads"),)),
            self.expected_result("retire", "blocked", "retained_state", (("reason", "old_head_not_ready"),)),
            self.expected_result("finalize", "blocked", "retained_state", (("reason", "reviewed_head_mismatch"),)),
        )
        self.assertEqual((absent, ready, mixed, retired, finalized), expected)

    def test_status_returns_absent_after_successful_finalizer_cleanup(self):
        reviewed_head, _artifacts = self.prepare_finalization()
        evidence = self.repository / ".superpowers" / "sdd" / "final-artifacts.sha256.json"
        self.adapters.git_responses["finalize_fixture"] = "success"
        finalize_result = _candidate.execute_command(_candidate.parse_cli(("finalize", "--reviewed-head", reviewed_head)), self.adapters)
        status_result = _candidate.execute_command(_candidate.parse_cli(("status",)), self.adapters)
        expected = (
            self.expected_result("finalize", "ok", "finalized", (("reviewed_head", reviewed_head),)),
            self.expected_result("status", "ok", "state_absent", (("classification", "absent"), ("reviewed_head", None), ("authority_paths", ()))),
            True,
        )
        self.assertEqual((finalize_result, status_result, evidence.exists(), self.adapters.state.exists(), (self.adapters.common / "plan-e-evidence-v1.lease.json").exists()), (*expected, False, False))

    def test_read_only_git_uses_no_optional_locks_and_closed_environment(self):
        _candidate.execute_command(_candidate.parse_cli(("preflight",)), self.adapters)
        result = _candidate.execute_command(_candidate.parse_cli(("status",)), self.adapters)
        git_calls = tuple(call for call in self.adapters.calls if call[0] == "git")
        valid = tuple(
            call[1] == "run"
            and isinstance(call[2][0], tuple)
            and tuple(call[2][0])[:2] == ("--no-optional-locks", "--no-pager")
            and Path(str(call[2][1])).resolve() == self.repository
            and isinstance(call[2][2], tuple)
            and dict(typing.cast(tuple[tuple[str, str], ...], call[2][2])).get("GIT_OPTIONAL_LOCKS") == "0"
            and all(value not in str(call[2]).casefold() for value in ("editor", "credential", "http://", "https://"))
            for call in git_calls
        )
        expected = self.expected_result("status", "ok", "state_absent", (("classification", "absent"), ("reviewed_head", None), ("authority_paths", ())))
        self.assertEqual((result, len(git_calls), valid, dict(self.environment)), (expected, 1, (True,), self.environment))

    def test_fsmonitor_hook_signing_filter_and_helper_effectiveness_blocks(self):
        parsed = _candidate.parse_cli(("preflight",))
        hazards = ("core.fsmonitor=true", "core.hooksPath=.hooks", "commit.gpgsign=true", "credential.helper=manager", "filter=lfs", "working-tree-encoding=UTF-16")
        rows = []
        for ordinal, hazard in enumerate(hazards):
            adapters = _FakeAdapters(self.root / f"git-effect-{ordinal}", self.repository, self.git, self.environment)
            adapters.git_responses["config"] = (hazard,)
            rows.append(_candidate.execute_command(parsed, adapters))
        expected = tuple(self.expected_result("preflight", "blocked", "unsafe_git_effect", (("setting", hazard),)) for hazard in hazards)
        self.assertEqual(tuple(rows), expected)


class MutexLeaseTests(_Fixture, unittest.TestCase):
    def test_mutation_creates_and_rereads_lease_before_state_root(self):
        self.allow_mutation()
        parsed = _candidate.parse_cli(("produce", "--kind", "host", "--reviewed-head", _HEAD))
        result = _candidate.execute_command(parsed, self.adapters)
        operations = tuple((boundary, operation) for boundary, operation, _arguments in self.adapters.calls if boundary in {"mutex", "filesystem", "randomness"})
        expected_operations = (
            ("mutex", "acquire"), ("randomness", "bytes"), ("filesystem", "write_exclusive"),
            ("filesystem", "fsync_file"), ("filesystem", "fsync_directory"), ("filesystem", "read_bytes"),
            ("filesystem", "mkdir"), ("mutex", "release"), ("mutex", "close"),
        )
        expected = self.expected_result("produce", "blocked", "evidence_missing", (("kind", "host"),))
        self.assertEqual((result, operations, self.adapters.state.exists()), (expected, expected_operations, True))

    def test_mutex_name_and_state_paths_bind_canonical_repository_identity(self):
        self.allow_mutation()
        parsed = _candidate.parse_cli(("produce", "--kind", "host", "--reviewed-head", _HEAD))
        result = _candidate.execute_command(parsed, self.adapters)
        mutex_calls = tuple(arguments for boundary, operation, arguments in self.adapters.calls if (boundary, operation) == ("mutex", "acquire"))
        digest = hashlib.sha256(str(self.repository.resolve()).casefold().encode()).hexdigest()
        expected = self.expected_result("produce", "blocked", "evidence_missing", (("kind", "host"),))
        self.assertEqual((result, mutex_calls, self.adapters.state), (expected, ((f"Local\\DynamicsHelper.PlanE.{digest}", 0),), self.adapters.common / "plan-e-evidence-v1"))

    def test_retained_abandoned_partial_and_unknown_state_blocks_without_cleanup(self):
        scenarios = []
        for name in ("contended", "abandoned", "lease", "partial-owner", "unknown-entry"):
            root = self.root / name
            root.mkdir()
            adapters = _FakeAdapters(root, self.repository, self.git, self.environment)
            adapters.git_responses.update(self.adapters.git_responses)
            adapters.git_responses.update({"preflight": "valid", "platform": "win32"})
            if name == "contended":
                adapters.mutex_mode = "contended"
            elif name == "abandoned":
                adapters.mutex_mode = "abandoned"
            elif name == "lease":
                _write_json(adapters.common / "plan-e-evidence-v1.lease.json", {"schema_version": 1, "token": "0" * 32})
            elif name == "partial-owner":
                _write_json(adapters.state / "heads" / _HEAD / "host" / "owner.json", {"schema_version": 1})
            else:
                path = adapters.state / "unknown"
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(b"unknown\n")
            before = tuple((path.relative_to(adapters.common).as_posix(), path.read_bytes()) for path in adapters.common.rglob("*") if path.is_file())
            result = _candidate.execute_command(_candidate.parse_cli(("produce", "--kind", "host", "--reviewed-head", _HEAD)), adapters)
            after = tuple((path.relative_to(adapters.common).as_posix(), path.read_bytes()) for path in adapters.common.rglob("*") if path.is_file())
            scenarios.append((name, result, before, after))
        expected = tuple((name, self.expected_result("produce", "blocked", "retained_state", (("reason", name),)), before, before) for name, _result, before, _after in scenarios)
        self.assertEqual(tuple(scenarios), expected)

    def test_finalizer_resume_requires_same_closed_token_and_checkpoint(self):
        token = "1" * 32
        valid_adapters = _FakeAdapters(self.root / "resume-valid", self.repository, self.git, self.environment)
        valid_adapters.git_responses.update({"preflight": "valid", "platform": "win32", "resume_token": token})
        valid_lease = valid_adapters.common / "plan-e-evidence-v1.lease.json"
        _write_json(valid_lease, {"schema_version": 1, "kind": "finalize", "token": token, "reviewed_head": _HEAD, "checkpoint": "staged", "prospective_head": _NEW_HEAD, "index": {}, "candidates": {}})
        valid = _candidate.execute_command(_candidate.parse_cli(("finalize", "--reviewed-head", _HEAD)), valid_adapters)
        invalid_adapters = _FakeAdapters(self.root / "resume-invalid", self.repository, self.git, self.environment)
        invalid_adapters.git_responses.update({"preflight": "valid", "platform": "win32", "resume_token": "2" * 32})
        invalid_lease = invalid_adapters.common / "plan-e-evidence-v1.lease.json"
        _write_json(invalid_lease, {"schema_version": 1, "kind": "finalize", "token": token, "reviewed_head": _HEAD, "checkpoint": "staged", "prospective_head": _NEW_HEAD, "index": {}, "candidates": {}})
        invalid = _candidate.execute_command(_candidate.parse_cli(("finalize", "--reviewed-head", _HEAD)), invalid_adapters)
        expected = (
            self.expected_result("finalize", "blocked", "evidence_missing", (("checkpoint", "staged"),)),
            self.expected_result("finalize", "blocked", "retained_state", (("reason", "token_mismatch"),)),
        )
        self.assertEqual((valid, invalid, valid_lease.exists(), invalid_lease.exists()), (*expected, True, True))

    def test_windows_named_mutex_contention_abandonment_release_and_handle_closure(self):
        if os.name != "nt":
            raise RuntimeError("locked RED count requires Windows")
        name = "Local\\DynamicsHelper.PlanE.Test." + uuid.uuid4().hex
        kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
        kernel32.CreateMutexW.restype = ctypes.c_void_p
        helper = "import ctypes,pathlib,sys,time;k=ctypes.WinDLL('kernel32');k.CreateMutexW.restype=ctypes.c_void_p;h=k.CreateMutexW(None,True,sys.argv[1]);pathlib.Path(sys.argv[2]).write_bytes(b'ready');time.sleep(5)"
        marker = self.root / "mutex-ready"
        holder = subprocess.Popen([sys.executable, "-c", helper, name, str(marker)], cwd=self.root, env=self.environment, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, shell=False)
        try:
            deadline = time.monotonic() + 5
            while not marker.exists() and holder.poll() is None and time.monotonic() < deadline:
                time.sleep(0.02)
            if not marker.exists():
                raise RuntimeError("mutex helper fixture did not acquire")
            self.allow_mutation()
            self.adapters.git_responses["mutex_name"] = name
            contention = _candidate.execute_command(_candidate.parse_cli(("produce", "--kind", "host", "--reviewed-head", _HEAD)), self.adapters)
        finally:
            holder.terminate()
            holder.wait(timeout=5)
        abandon_marker = self.root / "abandoned-ready"
        abandon = "import ctypes,os,pathlib,sys;k=ctypes.WinDLL('kernel32');k.CreateMutexW.restype=ctypes.c_void_p;h=k.CreateMutexW(None,True,sys.argv[1]);pathlib.Path(sys.argv[2]).write_bytes(b'ready');os._exit(0)"
        abandoner = subprocess.Popen([sys.executable, "-c", abandon, name, str(abandon_marker)], cwd=self.root, env=self.environment, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, shell=False)
        abandoner.wait(timeout=5)
        abandoned_adapters = _FakeAdapters(self.root / "abandoned", self.repository, self.git, self.environment)
        abandoned_adapters.git_responses.update({"preflight": "valid", "platform": "win32", "mutex_name": name})
        abandoned = _candidate.execute_command(_candidate.parse_cli(("produce", "--kind", "host", "--reviewed-head", _HEAD)), abandoned_adapters)
        released_adapters = _FakeAdapters(self.root / "released", self.repository, self.git, self.environment)
        released_adapters.git_responses.update({"preflight": "valid", "platform": "win32", "mutex_name": name + ".release"})
        released = _candidate.execute_command(_candidate.parse_cli(("produce", "--kind", "host", "--reviewed-head", _HEAD)), released_adapters)
        release_calls = tuple(call for call in released_adapters.calls if call[0] == "mutex" and call[1] in {"release", "close"})
        expected = (
            self.expected_result("produce", "blocked", "retained_state", (("reason", "mutex_contention"),)),
            self.expected_result("produce", "blocked", "retained_state", (("reason", "mutex_abandoned"),)),
            self.expected_result("produce", "ok", "producer_succeeded", (("mutex_closed", True),)),
            True,
            (("mutex", "release", ()), ("mutex", "close", ())),
        )
        self.assertEqual((contention, abandoned, released, holder.returncode is not None, release_calls), expected)

    def test_non_windows_mutating_commands_block_without_mutex_emulation_or_write(self):
        argv_rows = (
            ("produce", "--kind", "host", "--reviewed-head", _HEAD),
            ("ingest-review", "--kind", "plan-e", "--reviewed-head", _HEAD, "--session-id", "A", "--input", str((self.root / "review.md").resolve())),
            ("retire", "--old-head", _HEAD, "--new-head", _NEW_HEAD),
            ("finalize", "--reviewed-head", _HEAD),
        )
        adapters = []
        results = []
        for ordinal, argv in enumerate(argv_rows):
            adapter = _FakeAdapters(self.root / f"non-windows-{ordinal}", self.repository, self.git, self.environment)
            adapter.git_responses.update({"preflight": "valid", "platform": "posix"})
            adapters.append(adapter)
            results.append(_candidate.execute_command(_candidate.parse_cli(argv), adapter))
        mutations = tuple(call for adapter in adapters for call in adapter.calls if call[0] in {"filesystem", "mutex", "process"})
        expected = tuple(self.expected_result(argv[0], "blocked", "windows_mutex_required") for argv in argv_rows)
        self.assertEqual((tuple(results), mutations), (expected, ()))

    def test_mutex_releases_last_and_parent_state_restores_on_success_and_failure(self):
        original_cwd = Path.cwd()
        original_environment = dict(os.environ)
        rows = []
        for outcome in ("success", "validation", "child", "cleanup"):
            root = self.root / outcome
            root.mkdir()
            repository, _head = self.new_repository("repo-lifecycle-" + outcome)
            adapters = _FakeAdapters(root, repository, self.git, self.environment)
            adapters.git_responses.update({"preflight": "valid", "platform": "win32", "failure_point": outcome})
            result = _candidate.execute_command(_candidate.parse_cli(("produce", "--kind", "host", "--reviewed-head", _HEAD)), adapters)
            rows.append((outcome, result, tuple(adapters.calls[-2:])))
        expected_rows = tuple((outcome, self.expected_result("produce", "ok", "producer_succeeded") if outcome == "success" else self.expected_result("produce", "blocked", "retained_state", (("reason", outcome),)), (("mutex", "release", ()), ("mutex", "close", ()))) for outcome in ("success", "validation", "child", "cleanup"))
        self.assertEqual((tuple(rows), Path.cwd(), dict(os.environ)), (expected_rows, original_cwd, original_environment))


class CommandReceiptTests(_Fixture, unittest.TestCase):
    def test_foreground_command_receipt_matches_actual_execution(self):
        self.allow_mutation()
        outputs: dict[str, bytes] = {}

        def run_harmless(spec: _candidate.CommandSpec) -> tuple[int, bytes, bytes]:
            output = b"" if spec.command_id == "host-compile" else b"test_fixture (fixture.Test) ... ok\n\n----------------------------------------------------------------------\nRan 1 test in 0.001s\n\nOK\n"
            outputs[spec.command_id] = output
            child = _candidate.CommandSpec("harmless", str(Path(sys.executable).resolve()), ("-c", f"import sys;sys.stdout.buffer.write({output!r})"), str(self.repository), spec.environment, 10, "closed", spec.stdout_limit_bytes, spec.stderr_limit_bytes)
            return self.run_real_child(child)

        self.adapters.process_callback = run_harmless
        result = _candidate.execute_command(_candidate.parse_cli(("produce", "--kind", "host", "--reviewed-head", _HEAD)), self.adapters)
        process_specs = tuple(call[2][0] for call in self.adapters.calls if call[:2] == ("process", "run"))
        expected_specs = process_specs
        receipt = self.adapters.state / "heads" / _HEAD / "host" / "receipt.json"
        receipt_value = json.loads(receipt.read_text(encoding="utf-8")) if receipt.exists() else None
        expected = self.expected_result("produce", "ok", "producer_succeeded", (("kind", "host"), ("command_count", len(expected_specs))))
        observed_rows = receipt_value["commands"] if receipt_value else None
        bound = tuple(
            (
                row["command_id"], row["executable"], tuple(row["argv"]), row["cwd"], tuple(tuple(item) for item in row["environment"]),
                row["shell"], row["exit_code"], row["stdin_sha256"], row["stdout_sha256"], row["stderr_sha256"], row["output_path"], row["output_sha256"],
            )
            for row in observed_rows or ()
        )
        expected_bound = tuple(
            (
                spec.command_id, spec.executable_role, spec.argv, spec.cwd_role, spec.environment, False, 0, None,
                _sha256(outputs.get(spec.command_id, b"")),
                _sha256(b""), None, None,
            )
            for spec in expected_specs
        )
        self.assertEqual((result, process_specs, bound), (expected, expected_specs, expected_bound))

    def test_child_output_limits_fail_safely_without_partial_receipt(self):
        rows = []
        receipts = []
        base_spec = next(command for command in self.command_specs() if command.command_id == "host-full")
        outputs = ((0, b"x" * (base_spec.stdout_limit_bytes + 1), b""), (0, b"", b"x" * (base_spec.stderr_limit_bytes + 1)))
        for ordinal, output in enumerate(outputs):
            root = self.root / f"overflow-{ordinal}"
            root.mkdir()
            adapters = _FakeAdapters(root, self.repository, self.git, self.environment)
            adapters.git_responses.update({"preflight": "valid", "platform": "win32"})
            spec = base_spec
            adapters.git_responses["tool_paths"] = {"python": spec.executable_role, "git": str((self.tools / "git.exe").resolve()), "node": str((self.tools / "node.exe").resolve())}
            adapters.process_results.append(output)
            rows.append(_candidate.execute_command(_candidate.parse_cli(("produce", "--kind", "host", "--reviewed-head", _HEAD)), adapters))
            receipts.append((adapters.state / "heads" / _HEAD / "host" / "receipt.json").exists())
        expected = (self.expected_result("produce", "blocked", "output_limit_exceeded", (("stream", "stdout"),)), self.expected_result("produce", "blocked", "output_limit_exceeded", (("stream", "stderr"),)))
        self.assertEqual((tuple(rows), tuple(receipts)), (expected, (False, False)))

    def test_child_nonzero_or_start_failure_never_promotes_succeeded_receipt(self):
        spec = next(command for command in self.command_specs() if command.command_id == "host-full")
        nonzero_adapters = _FakeAdapters(self.root / "nonzero", self.repository, self.git, self.environment)
        nonzero_adapters.git_responses.update({"preflight": "valid", "platform": "win32", "tool_paths": {"python": spec.executable_role, "git": str((self.tools / "git.exe").resolve()), "node": str((self.tools / "node.exe").resolve())}})
        nonzero_adapters.process_results.append((7, b"", b"failed"))
        nonzero = _candidate.execute_command(_candidate.parse_cli(("produce", "--kind", "host", "--reviewed-head", _HEAD)), nonzero_adapters)
        start_adapters = _FakeAdapters(self.root / "start-error", self.repository, self.git, self.environment)
        start_adapters.git_responses.update({"preflight": "valid", "platform": "win32", "tool_paths": {"python": spec.executable_role, "git": str((self.tools / "git.exe").resolve()), "node": str((self.tools / "node.exe").resolve())}, "process_start_error": True})
        start_error = _candidate.execute_command(_candidate.parse_cli(("produce", "--kind", "host", "--reviewed-head", _HEAD)), start_adapters)
        expected = (self.expected_result("produce", "blocked", "child_nonzero", (("exit_code", 7),)), self.expected_result("produce", "error", "internal_error", (("reason", "child_start_failed"),)))
        self.assertEqual((nonzero, start_error), expected)

    def test_command_receipt_schema_rejects_unknown_missing_type_order_and_hash_drift(self):
        spec = next(command for command in self.command_specs() if command.command_id == "host-full")
        rows = []
        base = self.command_row(spec)
        for ordinal, mutation in enumerate(({"extra": True}, {"exit_code": True}, {"stdout_sha256": _HEAD}, {"shell": True}, {"argv": []})):
            adapters = _FakeAdapters(self.root / f"receipt-{ordinal}", self.repository, self.git, self.environment)
            adapters.git_responses.update({"preflight": "valid", "platform": "win32", "tool_paths": {"python": spec.executable_role, "git": str((self.tools / "git.exe").resolve()), "node": str((self.tools / "node.exe").resolve())}})
            owner = adapters.state / "heads" / _HEAD / "host"
            receipt = {"schema_version": 1, "producer_id": "host", "reviewed_head": _HEAD, "status": "succeeded", "dependencies": [], "source_blobs": {}, "commands": [{**base, **mutation}], "candidate_sha256": {}, "worktree": None}
            _write_json(owner / "receipt.json", receipt)
            rows.append(_candidate.execute_command(_candidate.parse_cli(("finalize", "--reviewed-head", _HEAD)), adapters))
        expected = tuple(self.expected_result("finalize", "blocked", "invalid_receipt", (("row", ordinal),)) for ordinal in range(5))
        self.assertEqual(tuple(rows), expected)

    def test_host_children_receive_six_fresh_distinct_contained_directories(self):
        self.allow_mutation()
        expected_count = len(next(spec.commands for spec in self.producer_specs() if spec.producer_id == "host"))
        launch_state: list[tuple[bool, ...]] = []

        def observe(spec: _candidate.CommandSpec) -> tuple[int, bytes, bytes]:
            launch_state.append(tuple(Path(dict(spec.environment)[name]).is_dir() for name in _PROFILE_NAMES))
            return (0, b"", b"")

        self.adapters.process_callback = observe
        result = _candidate.execute_command(_candidate.parse_cli(("produce", "--kind", "host", "--reviewed-head", _HEAD)), self.adapters)
        process_specs = tuple(call[2][0] for call in self.adapters.calls if call[:2] == ("process", "run"))
        profile_paths = tuple(Path(dict(spec.environment)[name]) for spec in process_specs for name in _PROFILE_NAMES)
        expected = self.expected_result("produce", "ok", "producer_succeeded", (("kind", "host"),))
        self.assertEqual((result, len(process_specs), len(set(profile_paths)), tuple(launch_state), tuple(path.exists() for path in profile_paths)), (expected, expected_count, expected_count * 6, ((True,) * 6,) * expected_count, (False,) * (expected_count * 6)))

    def test_unknown_duplicate_malformed_or_drifting_receipts_are_rejected(self):
        fixtures = (
            {"producer_id": "unknown"}, {"producer_id": "host", "commands": ["x", "x"]},
            {"producer_id": "host", "reviewed_head": _NEW_HEAD}, {"producer_id": "host", "candidate_sha256": {"missing": _SHA256}},
        )
        rows = []
        for ordinal, fixture in enumerate(fixtures):
            adapters = _FakeAdapters(self.root / f"bad-receipt-{ordinal}", self.repository, self.git, self.environment)
            owner = adapters.state / "heads" / _HEAD / "unknown"
            _write_json(owner / f"{ordinal}.json", {"schema_version": 1, "status": "succeeded", **fixture})
            rows.append(_candidate.execute_command(_candidate.parse_cli(("status",)), adapters))
        expected = tuple(self.expected_result("status", "blocked", "retained_state", (("reason", reason),)) for reason in ("unknown_producer", "duplicate_command", "stale_head", "candidate_missing"))
        self.assertEqual(tuple(rows), expected)


class CandidatePublicationTests(_Fixture, unittest.TestCase):
    def test_candidate_publication_uses_no_clobber_hard_link_and_reread(self):
        self.allow_mutation()
        temporary = self.adapters.state / "heads" / _HEAD / "host" / "candidates" / "result.tmp"
        target = temporary.with_suffix(".json")
        temporary.parent.mkdir(parents=True)
        temporary.write_bytes(b"candidate\n")
        self.adapters.git_responses.update({"candidate_publication": (temporary, target, _sha256(temporary.read_bytes()))})
        replace_calls: list[tuple[object, ...]] = []
        with mock.patch("os.replace", side_effect=lambda *arguments: replace_calls.append(arguments)):
            result = _candidate.execute_command(_candidate.parse_cli(("produce", "--kind", "host", "--reviewed-head", _HEAD)), self.adapters)
        expected = self.expected_result("produce", "ok", "producer_succeeded", (("candidate_sha256", (("result.json", _sha256(b"candidate\n")),)),))
        self.assertEqual((result, target.read_bytes() if target.exists() else None, temporary.exists(), tuple(replace_calls)), (expected, b"candidate\n", False, ()))

    def test_candidate_collision_concurrency_and_crash_preserve_state(self):
        self.allow_mutation()
        owner = self.adapters.state / "heads" / _HEAD / "host"
        temporary = owner / "candidates" / "result.tmp"
        target = owner / "candidates" / "result.json"
        target.parent.mkdir(parents=True)
        target.write_bytes(b"existing\n")
        temporary.write_bytes(b"new\n")
        self.adapters.git_responses["candidate_publication"] = (temporary, target, _sha256(b"new\n"))
        result = _candidate.execute_command(_candidate.parse_cli(("produce", "--kind", "host", "--reviewed-head", _HEAD)), self.adapters)
        expected = self.expected_result("produce", "blocked", "candidate_collision", (("path", target.as_posix()),))
        self.assertEqual((result, target.read_bytes(), temporary.read_bytes(), _calls(self.adapters, "filesystem", "link")), (expected, b"existing\n", b"new\n", ((temporary, target),)))

    def test_candidate_and_receipt_publication_order_is_crash_safe(self):
        expected_order = ("write_exclusive", "fsync_file", "fsync_directory", "read_bytes", "mkdir", "write_exclusive", "link", "unlink", "write_exclusive", "unlink")
        rows = []
        for crash_index in range(len(expected_order) + 1):
            adapters = _FakeAdapters(self.root / f"transition-{crash_index}", self.repository, self.git, self.environment)
            adapters.git_responses.update({"preflight": "valid", "platform": "win32", "transition_probe": True, "crash_after_operation": crash_index})
            result = _candidate.execute_command(_candidate.parse_cli(("produce", "--kind", "host", "--reviewed-head", _HEAD)), adapters)
            operations = tuple(operation for boundary, operation, _arguments in adapters.calls if boundary == "filesystem")
            receipt = adapters.state / "heads" / _HEAD / "host" / "receipt.json"
            rows.append((crash_index, result, operations, receipt.exists(), adapters.state.exists()))
        expected = tuple(
            (
                crash_index,
                self.expected_result("produce", "ok", "producer_succeeded", (("kind", "host"),)) if crash_index == len(expected_order) else self.expected_result("produce", "blocked", "retained_state", (("checkpoint", crash_index),)),
                expected_order if crash_index == len(expected_order) else expected_order[: crash_index + 1],
                crash_index == len(expected_order),
                crash_index < len(expected_order),
            )
            for crash_index in range(len(expected_order) + 1)
        )
        self.assertEqual(tuple(rows), expected)

    def test_fixed_artifact_publication_rejects_collision_except_six_reports(self):
        self.allow_mutation()
        self.write_complete_terminal_state()
        collision = self.repository / ".superpowers" / "sdd" / "host-test-results.json"
        collision.parent.mkdir(parents=True, exist_ok=True)
        collision.write_bytes(b"existing\n")
        historical = self.repository / ".superpowers" / "sdd" / "task-1-report.md"
        historical.write_bytes(b"historical\n")
        result = _candidate.execute_command(_candidate.parse_cli(("finalize", "--reviewed-head", _HEAD)), self.adapters)
        expected = self.expected_result("finalize", "blocked", "fixed_artifact_collision", (("path", ".superpowers/sdd/host-test-results.json"),))
        reads = _calls(self.adapters, "filesystem", "read_bytes")
        self.assertEqual((result, collision.read_bytes(), historical.read_bytes(), (collision,) in reads), (expected, b"existing\n", b"historical\n", True))

    def test_candidates_are_head_scoped_and_fixed_paths_wait_for_finalize(self):
        first_repo, _first_head = self.new_repository("candidate-first-repo")
        second_repo, _second_head = self.new_repository("candidate-second-repo")
        first_adapters = _FakeAdapters(self.root / "first", first_repo, self.git, self.environment)
        first_adapters.git_responses.update({"preflight": "valid", "platform": "win32", "head": _HEAD, "tool_paths": self.adapters.git_responses.get("tool_paths", {})})
        second_adapters = _FakeAdapters(self.root / "second", second_repo, self.git, self.environment)
        second_adapters.git_responses.update({"preflight": "valid", "platform": "win32", "head": _NEW_HEAD, "tool_paths": self.adapters.git_responses.get("tool_paths", {})})
        first = _candidate.execute_command(_candidate.parse_cli(("produce", "--kind", "host", "--reviewed-head", _HEAD)), first_adapters)
        second = _candidate.execute_command(_candidate.parse_cli(("produce", "--kind", "host", "--reviewed-head", _NEW_HEAD)), second_adapters)
        first_root = first_adapters.state / "heads" / _HEAD
        second_root = second_adapters.state / "heads" / _NEW_HEAD
        fixed = first_repo / ".superpowers" / "sdd" / "host-test-results.json"
        expected = (self.expected_result("produce", "ok", "producer_succeeded", (("reviewed_head", _HEAD),)), self.expected_result("produce", "ok", "producer_succeeded", (("reviewed_head", _NEW_HEAD),)), True, False)
        self.assertEqual((first, second, first_root != second_root, first_root.is_dir(), second_root.is_dir(), fixed.exists()), (*expected[:3], True, True, expected[3]))


class RetirementTests(_Fixture, unittest.TestCase):
    def test_retirement_requires_complete_dependency_closed_terminal_state(self):
        rows = self.build_chronology()
        old_head, new_head = rows[0][0], rows[-1][0]
        self.allow_mutation(new_head)
        terminal_ids = self.write_complete_terminal_state(old_head)
        valid = _candidate.execute_command(_candidate.parse_cli(("retire", "--old-head", old_head, "--new-head", new_head)), self.adapters)
        incomplete_root = self.root / "incomplete"
        incomplete = _FakeAdapters(incomplete_root, self.repository, self.git, self.environment)
        incomplete.git_responses.update(self.adapters.git_responses)
        _write_json(incomplete.state / "heads" / old_head / "host" / "receipt.json", {"schema_version": 1, "producer_id": "host", "reviewed_head": old_head, "status": "succeeded"})
        invalid = _candidate.execute_command(_candidate.parse_cli(("retire", "--old-head", old_head, "--new-head", new_head)), incomplete)
        valid_head_exists = (self.adapters.state / "heads" / old_head).exists()
        invalid_head_exists = (incomplete.state / "heads" / old_head).exists()
        expected = (
            self.expected_result("retire", "ok", "head_retired", (("old_head", old_head), ("new_head", new_head), ("terminal_ids", terminal_ids))),
            self.expected_result("retire", "blocked", "retained_state", (("reason", "incomplete_dependency_closure"),)),
        )
        self.assertEqual((valid, invalid, valid_head_exists, invalid_head_exists), (*expected, False, True))

    def test_retirement_atomically_moves_head_authority_then_deletes_quarantine(self):
        rows = self.build_chronology()
        old_head, new_head = rows[0][0], rows[-1][0]
        self.allow_mutation(new_head)
        self.write_complete_terminal_state(old_head)
        head_root = self.adapters.state / "heads" / old_head
        result = _candidate.execute_command(_candidate.parse_cli(("retire", "--old-head", old_head, "--new-head", new_head)), self.adapters)
        quarantine_entries = tuple((self.adapters.state / "retirements").iterdir()) if (self.adapters.state / "retirements").exists() else ()
        rename_calls = tuple(call for call in self.adapters.calls if call[:2] == ("filesystem", "rename"))
        expected = self.expected_result("retire", "ok", "head_retired", (("old_head", old_head), ("new_head", new_head), ("retired_terminal_ids", tuple((*_PRODUCER_KINDS, "plan-e-review", "whole-review")))))
        self.assertEqual((result, head_root.exists(), quarantine_entries, len(rename_calls)), (expected, False, (), 1))

    def test_retirement_never_deletes_receipt_supplied_or_unrelated_paths(self):
        rows = self.build_chronology()
        old_head, new_head = rows[0][0], rows[-1][0]
        self.allow_mutation(new_head)
        self.write_complete_terminal_state(old_head)
        outside = self.root / "outside-sentinel.txt"
        outside.write_bytes(b"keep\n")
        receipt = self.adapters.state / "heads" / old_head / "host" / "receipt.json"
        value = json.loads(receipt.read_text(encoding="utf-8"))
        value["untrusted_cleanup_path"] = str(outside)
        _write_json(receipt, value)
        result = _candidate.execute_command(_candidate.parse_cli(("retire", "--old-head", old_head, "--new-head", new_head)), self.adapters)
        expected = self.expected_result("retire", "blocked", "invalid_receipt", (("producer_id", "host"),))
        self.assertEqual((result, outside.read_bytes(), receipt.exists(), (receipt,) in _calls(self.adapters, "filesystem", "read_bytes")), (expected, b"keep\n", True, True))

    def test_review_rejection_is_clean_terminal_state_not_crash_state(self):
        self.allow_mutation()
        self.write_complete_terminal_state(include_reviews=False)
        review = self.root / "invalid-review.md"
        review.write_bytes(b"invalid review\n")
        argv = ("ingest-review", "--kind", "plan-e", "--reviewed-head", _HEAD, "--session-id", "Session-1", "--input", str(review))
        result = _candidate.execute_command(_candidate.parse_cli(argv), self.adapters)
        receipt = self.adapters.state / "heads" / _HEAD / "plan-e-review" / "receipt.json"
        receipt_value = json.loads(receipt.read_text(encoding="utf-8")) if receipt.exists() else None
        expected_receipt = {
            "schema_version": 1, "producer_id": "plan-e-review", "review_kind": "plan-e", "reviewed_head": _HEAD,
            "status": "rejected", "dependencies": ["plan-e-review-package", "task-audits"], "source_blobs": {},
            "commands": [], "candidate_sha256": {}, "worktree": None, "input_sha256": _sha256(review.read_bytes()),
            "package_sha256": None, "diff_sha256": None, "audit_sha256": {}, "session_id": "Session-1",
            "criteria": {}, "disposition": "BLOCKED", "findings_sha256": None, "classification": "grammar",
        }
        expected = self.expected_result("ingest-review", "blocked", "review_rejected", (("classification", "grammar"),))
        self.assertEqual((result, receipt_value, (receipt.parent / "candidates").exists(), (self.adapters.common / "plan-e-evidence-v1.lease.json").exists()), (expected, expected_receipt, False, False))


class WorktreeLifecycleTests(_Fixture, unittest.TestCase):
    def test_only_promotion_and_task_audits_may_create_linked_worktrees(self):
        results = []
        adapters = []
        for ordinal, kind in enumerate(_PRODUCER_KINDS):
            repository, _head = self.new_repository(f"policy-repo-{ordinal}")
            adapter = _FakeAdapters(self.root / f"policy-{ordinal}", repository, self.git, self.environment)
            adapter.git_responses.update({"preflight": "valid", "platform": "win32", "tool_paths": {name.removesuffix(".exe"): str((self.tools / name).resolve()) for name in ("git.exe", "python.exe", "node.exe")}})
            adapters.append(adapter)
            results.append(_candidate.execute_command(_candidate.parse_cli(("produce", "--kind", kind, "--reviewed-head", _HEAD)), adapter))
        worktree_calls = tuple(call[2] for adapter in adapters for call in adapter.calls if call[:2] == ("git", "worktree_add"))
        expected_results = tuple(self.expected_result("produce", "ok", "producer_succeeded", (("kind", kind),)) for kind in _PRODUCER_KINDS)
        expected_calls = (("promotion", _HEAD), ("task-audits", _HEAD))
        self.assertEqual((tuple(results), worktree_calls), (expected_results, expected_calls))

    def test_owned_worktree_create_restore_remove_lifecycle_is_exact(self):
        self.allow_mutation(self.base_head)
        original = (self.repository / "base.txt").read_bytes()
        self.adapters.git_responses.update({"head": self.base_head, "worktree_probe": "real", "mutation_path": "base.txt"})
        result = _candidate.execute_command(_candidate.parse_cli(("produce", "--kind", "promotion", "--reviewed-head", self.base_head)), self.adapters)
        registrations = _run_git(self.git, self.repository, self.environment, "worktree", "list", "--porcelain")
        worktree_operations = tuple(operation for boundary, operation, _arguments in self.adapters.calls if boundary == "git" and operation in {"worktree_add", "worktree_remove"})
        expected = self.expected_result("produce", "ok", "producer_succeeded", (("kind", "promotion"), ("worktree_removed", True)))
        self.assertEqual((result, (self.repository / "base.txt").read_bytes(), registrations.count(b"worktree "), worktree_operations), (expected, original, 1, ("worktree_add", "worktree_remove")))

    def test_worktree_head_blob_status_or_registration_mismatch_is_retained(self):
        expected_blob = _run_git(self.git, self.repository, self.environment, "rev-parse", "HEAD:base.txt").decode().strip()
        cases = (("head", _NEW_HEAD), ("blob", _HEAD), ("status", b" M base.txt\n"), ("registration", b""))
        rows = []
        observed_calls = []
        for ordinal, (axis, value) in enumerate(cases):
            adapters = _FakeAdapters(self.root / f"worktree-mismatch-{ordinal}", self.repository, self.git, self.environment)
            adapters.git_responses.update({"preflight": "valid", "platform": "win32", "worktree_fixture": {"head": _HEAD, "blob": expected_blob, "status": b"", "registration": b"registered", axis: value}})
            rows.append(_candidate.execute_command(_candidate.parse_cli(("produce", "--kind", "promotion", "--reviewed-head", _HEAD)), adapters))
            observed_calls.append(tuple(operation for boundary, operation, _arguments in adapters.calls if boundary == "git"))
        expected = tuple(self.expected_result("produce", "blocked", "retained_state", (("reason", f"worktree_{axis}_mismatch"),)) for axis, _value in cases)
        expected_calls = (("worktree_list", "worktree_head", "worktree_blob", "worktree_status"),) * len(cases)
        self.assertEqual((tuple(rows), tuple(observed_calls)), (expected, expected_calls))

    def test_worktree_path_normalization_rejects_case_separator_alias_and_prunable_state(self):
        owned = self.root / "worktrees" / "token" / "promotion"
        cases = (str(owned).upper(), str(owned).replace(os.sep, "/"), str(self.root / "outside"), str(owned) + " prunable")
        rows = []
        observed_calls = []
        for ordinal, value in enumerate(cases):
            adapters = _FakeAdapters(self.root / f"worktree-path-{ordinal}", self.repository, self.git, self.environment)
            adapters.git_responses.update({"preflight": "valid", "platform": "win32", "worktree_path": value})
            rows.append(_candidate.execute_command(_candidate.parse_cli(("produce", "--kind", "promotion", "--reviewed-head", _HEAD)), adapters))
            observed_calls.append(tuple(operation for boundary, operation, _arguments in adapters.calls if boundary == "git"))
        expected = tuple(self.expected_result("produce", "blocked", "retained_state", (("reason", reason),)) for reason in ("worktree_path_alias", "worktree_separator_alias", "worktree_path_escape", "worktree_prunable"))
        self.assertEqual((tuple(rows), tuple(observed_calls)), (expected, (("worktree_list",),) * len(cases)))


class ResultValidationTests(_Fixture, unittest.TestCase):
    def test_vitest_results_use_scoped_selector_multiset_identity(self):
        self.allow_mutation()
        rows_a = (self.vitest_row(("suite",), "same"), self.vitest_row(("suite",), "same"))
        rows_b = (self.vitest_row(("suite",), "same"),)
        path = self.write_vitest("focused.json", (("extension/a.test.ts", rows_a), ("extension/b.test.ts", rows_b)), (3, 0, 0))
        self.adapters.scenario.update({"vitest_result": path, "expected_files": ("extension/a.test.ts", "extension/b.test.ts"), "required_selectors": (("extension/a.test.ts", ("suite",), "same", 2), ("extension/b.test.ts", ("suite",), "same", 1))})
        result = _candidate.execute_command(_candidate.parse_cli(("produce", "--kind", "focused-extension", "--reviewed-head", _HEAD)), self.adapters)
        expected = self.expected_result("produce", "ok", "producer_succeeded", (("selector_multiset", (("extension/a.test.ts", ("suite",), "same", 2), ("extension/b.test.ts", ("suite",), "same", 1))),))
        self.assertEqual((result, (path,) in _calls(self.adapters, "filesystem", "read_bytes")), (expected, True))

    def test_vitest_selector_multiplicity_and_status_are_exact(self):
        fixtures = (
            ((self.vitest_row(("suite",), "row"),), "selector_multiplicity"),
            ((self.vitest_row(("suite",), "row"),) * 3, "selector_multiplicity"),
            ((self.vitest_row(("suite",), "row"), self.vitest_row(("suite",), "row", "failed")), "selector_status"),
        )
        rows = []
        reads = []
        for ordinal, (assertions, _reason) in enumerate(fixtures):
            path = self.write_vitest(f"multiplicity-{ordinal}.json", (("extension/a.test.ts", assertions),), (sum(row["status"] == "passed" for row in assertions), sum(row["status"] == "failed" for row in assertions), 0))
            adapters = _FakeAdapters(self.root / f"vitest-multiplicity-{ordinal}", self.repository, self.git, self.environment)
            adapters.scenario.update({"preflight": "valid", "platform": "win32", "vitest_result": path, "expected_files": ("extension/a.test.ts",), "required_selectors": (("extension/a.test.ts", ("suite",), "row", 2),)})
            rows.append(_candidate.execute_command(_candidate.parse_cli(("produce", "--kind", "focused-extension", "--reviewed-head", _HEAD)), adapters))
            reads.append((path,) in _calls(adapters, "filesystem", "read_bytes"))
        expected = tuple(self.expected_result("produce", "blocked", "test_result_invalid", (("reason", reason),)) for _assertions, reason in fixtures)
        self.assertEqual((tuple(rows), tuple(reads)), (expected, (True,) * len(fixtures)))

    def test_vitest_full_name_is_derived_consistency_not_identity(self):
        self.allow_mutation()
        assertions = (self.vitest_row(("suite",), "row", full_name="wrong"),)
        path = self.write_vitest("full-name.json", (("extension/a.test.ts", assertions),), (1, 0, 0))
        self.adapters.scenario.update({"vitest_result": path, "expected_files": ("extension/a.test.ts",), "required_selectors": (("extension/a.test.ts", ("suite",), "row", 1),)})
        result = _candidate.execute_command(_candidate.parse_cli(("produce", "--kind", "focused-extension", "--reviewed-head", _HEAD)), self.adapters)
        self.assertEqual((result, (path,) in _calls(self.adapters, "filesystem", "read_bytes")), (self.expected_result("produce", "blocked", "test_result_invalid", (("reason", "full_name_mismatch"),)), True))

    def test_vitest_focused_multiset_equals_full_restricted_multiset(self):
        self.allow_mutation()
        focused = self.write_vitest("focused.json", (("extension/a.test.ts", (self.vitest_row(("suite",), "row"),) * 2),), (2, 0, 0))
        full = self.write_vitest("full.json", (("extension/a.test.ts", (self.vitest_row(("suite",), "row"),)), ("extension/b.test.ts", (self.vitest_row(("suite",), "other"),))), (2, 0, 0))
        self.adapters.scenario.update({"vitest_result": focused, "full_vitest_result": full, "expected_files": ("extension/a.test.ts",)})
        result = _candidate.execute_command(_candidate.parse_cli(("produce", "--kind", "focused-extension", "--reviewed-head", _HEAD)), self.adapters)
        reads = _calls(self.adapters, "filesystem", "read_bytes")
        self.assertEqual((result, (focused,) in reads, (full,) in reads), (self.expected_result("produce", "blocked", "test_result_invalid", (("reason", "focused_multiset_drift"),)), True, True))

    def test_vitest_results_require_exact_files_and_counter_reconciliation(self):
        self.allow_mutation()
        path = self.write_vitest("counter.json", (("extension/a.test.ts", (self.vitest_row(("suite",), "one"), self.vitest_row(("suite",), "two"))),), (1, 0, 0))
        self.adapters.scenario.update({"vitest_result": path, "expected_files": ("extension/a.test.ts", "extension/missing.test.ts")})
        result = _candidate.execute_command(_candidate.parse_cli(("produce", "--kind", "focused-extension", "--reviewed-head", _HEAD)), self.adapters)
        self.assertEqual((result, (path,) in _calls(self.adapters, "filesystem", "read_bytes")), (self.expected_result("produce", "blocked", "test_result_invalid", (("reasons", ("counter_mismatch", "file_inventory_mismatch")),)), True))

    def test_extension_producer_argv_and_subset_inventories_are_exact(self):
        self.allow_mutation()
        specs = self.producer_specs()
        self.adapters.git_responses.update({"tool_paths": {name.removesuffix(".exe"): str((self.tools / name).resolve()) for name in ("git.exe", "python.exe", "node.exe")}, "focused_files": _FOCUSED_EXTENSION_FILES})
        result = _candidate.execute_command(_candidate.parse_cli(("produce", "--kind", "focused-extension", "--reviewed-head", _HEAD)), self.adapters)
        expected = self.expected_result("produce", "ok", "producer_succeeded", (("argv", specs[1].commands[0].argv), ("focused_files", _FOCUSED_EXTENSION_FILES)))
        self.assertEqual((result, tuple(call[2][0] for call in self.adapters.calls if call[:2] == ("process", "run"))), (expected, specs[1].commands))

    def test_asset_provenance_build_copy_and_release_safety_are_exact(self):
        self.allow_mutation()
        source = _SOURCE_ROOT / "extension" / "items.json"
        attributes = _SOURCE_ROOT / ".gitattributes"
        if not source.is_file() or not attributes.is_file():
            raise RuntimeError("reviewed public asset fixture missing")
        stage = self.root / "stage" / "extension"
        stage.mkdir(parents=True)
        shutil.copyfile(source, stage / "items.json")
        self.adapters.scenario.update({"preflight": "valid", "platform": "win32", "asset_source": source, "attributes_source": attributes, "release_stage": stage.parent})
        result = _candidate.execute_command(_candidate.parse_cli(("produce", "--kind", "static", "--reviewed-head", _HEAD)), self.adapters)
        expected = self.expected_result("produce", "ok", "producer_succeeded", (("asset_sha256", "839ef34acce528efff3a64a563070942fc228326730d390aa7d467c3df83ce25"), ("attributes_sha256", "2be83d22f91add38d54a1eda87fa02e3654c9fec3375d5fc72792a7094db6bda"), ("public_nodes", 5), ("source_dist_equal", True)))
        reads = _calls(self.adapters, "filesystem", "read_bytes")
        self.assertEqual((result, (stage / "items.json").read_bytes() == source.read_bytes(), (source,) in reads, (stage / "items.json",) in reads), (expected, True, True, True))

    def test_build_and_static_commands_use_only_absolute_local_node_entries(self):
        self.allow_mutation()
        specs = self.producer_specs()
        self.adapters.git_responses.update({"preflight": "valid", "platform": "win32", "tool_paths": {name.removesuffix(".exe"): str((self.tools / name).resolve()) for name in ("git.exe", "python.exe", "node.exe")}})
        result = _candidate.execute_command(_candidate.parse_cli(("produce", "--kind", "static", "--reviewed-head", _HEAD)), self.adapters)
        commands = next(spec.commands for spec in specs if spec.producer_id == "static")
        expected = self.expected_result("produce", "ok", "producer_succeeded", (("commands", commands), ("network_fallback", False)))
        self.assertEqual((result, tuple(call[2][0] for call in self.adapters.calls if call[:2] == ("process", "run"))), (expected, commands))

    def test_host_results_require_positive_counts_and_exact_skip_policy(self):
        selector = "host.test_update_recovery.FrozenStagedProbeIntegrationTests.test_complete_built_runtime_starts_and_matches_target_without_live_mutation"
        reason = "DH_PLAN_C_FROZEN_ONEDIR not set"
        cases = (
            ("valid", {"schema_version": 1, "phase": "full", "tests_run": 3, "passed": ["a", "b"], "failures": [], "errors": [], "skips": [{"selector": selector, "reason": reason}], "modules": ["host.test_plan_e_evidence"]}),
            ("extra", {"schema_version": 1, "phase": "full", "tests_run": 3, "passed": ["a"], "failures": [], "errors": [], "skips": [{"selector": "extra", "reason": "wrong"}], "modules": ["host.test_plan_e_evidence"]}),
            ("missing", {"schema_version": 1, "phase": "full", "tests_run": 3, "passed": ["a", "b", "c"], "failures": [], "errors": [], "skips": [], "modules": ["host.test_plan_e_evidence"]}),
            ("zero", {"schema_version": 1, "phase": "full", "tests_run": 0, "passed": [], "failures": [], "errors": [], "skips": [], "modules": ["host.test_plan_e_evidence"]}),
        )
        rows = []
        reads = []
        for ordinal, (_name, value) in enumerate(cases):
            path = self.root / f"host-{ordinal}.json"
            _write_json(path, value)
            adapters = _FakeAdapters(self.root / f"host-result-{ordinal}", self.repository, self.git, self.environment)
            adapters.scenario.update({"preflight": "valid", "platform": "win32", "host_result": path, "host_expected_skips": ((selector, reason),), "host_modules": ("host.test_plan_e_evidence",)})
            rows.append(_candidate.execute_command(_candidate.parse_cli(("produce", "--kind", "host", "--reviewed-head", _HEAD)), adapters))
            reads.append((path,) in _calls(adapters, "filesystem", "read_bytes"))
        expected = (
            self.expected_result("produce", "ok", "producer_succeeded", (("tests_run", 3), ("skips", 1))),
            self.expected_result("produce", "blocked", "test_result_invalid", (("reason", "skip_policy"),)),
            self.expected_result("produce", "blocked", "test_result_invalid", (("reason", "skip_policy"),)),
            self.expected_result("produce", "blocked", "test_result_invalid", (("reason", "zero_tests"),)),
        )
        self.assertEqual((tuple(rows), tuple(reads)), (expected, (True,) * len(cases)))

    def test_host_result_selectors_and_phase_modules_are_exact(self):
        self.allow_mutation()
        path = self.root / "host.json"
        _write_json(path, {"schema_version": 1, "phase": "executor", "tests_run": 2, "passed": ["a", "a"], "failures": [], "errors": [], "skips": [], "modules": ["host.test_wrong"]})
        expected_modules = tuple(module for _phase, modules in _HOST_PHASES for module in modules if module not in {"discover", "host", "compileall", "-q"})
        self.adapters.scenario.update({"host_result": path, "host_expected_skips": (), "host_modules": expected_modules})
        result = _candidate.execute_command(_candidate.parse_cli(("produce", "--kind", "host", "--reviewed-head", _HEAD)), self.adapters)
        self.assertEqual((result, (path,) in _calls(self.adapters, "filesystem", "read_bytes")), (self.expected_result("produce", "blocked", "test_result_invalid", (("reasons", ("duplicate_selector", "module_inventory")),)), True))

    def test_promotion_result_requires_red_replay_green_mutations_and_sources(self):
        self.allow_mutation()
        path = self.root / "promotion.json"
        _write_json(path, {"schema_version": 1, "red": {"assertion_failures": 7, "errors": 0, "constructor_passes": 1, "label": "RED commit replay"}, "green": {"passes": 8, "skips": 0}, "mutations": [{"id": name, "failed": True, "restored_green": True} for name in ("initial", "classification", "bound", "pre-sleep", "post-sleep")], "attempts": [2, 3], "delays": [0.05, 0.2], "validation_calls": [1, 3, 5]})
        self.adapters.scenario.update({"preflight": "valid", "platform": "win32", "promotion_result": path})
        result = _candidate.execute_command(_candidate.parse_cli(("produce", "--kind", "promotion", "--reviewed-head", _HEAD)), self.adapters)
        expected = self.expected_result("produce", "ok", "producer_succeeded", (("red_failures", 7), ("green_passes", 8), ("mutations", 5), ("attempts", (2, 3)), ("delays", (0.05, 0.2)), ("validation_calls", (1, 3, 5))))
        self.assertEqual((result, (path,) in _calls(self.adapters, "filesystem", "read_bytes")), (expected, True))

    def test_promotion_source_semantics_lock_seams_checkpoints_and_atomic_callsite(self):
        self.allow_mutation()
        self.adapters.scenario.update({"preflight": "valid", "platform": "win32", "promotion_plan": _SOURCE_PLAN})
        result = _candidate.execute_command(_candidate.parse_cli(("produce", "--kind", "promotion", "--reviewed-head", _HEAD)), self.adapters)
        expected = self.expected_result("produce", "ok", "producer_succeeded", (("helpers", 13), ("tests", 8), ("lines", 759), ("bytes", 31014), ("sha256", "e64ecfcaa73a7dc62ea0c9216027ac81a907ecc16069fd3076839f1492940815"), ("blob", "476760dee46de0273d4b3beb2b8e5452e790d6df")))
        self.assertEqual((result, (_SOURCE_PLAN,) in _calls(self.adapters, "filesystem", "read_bytes")), (expected, True))

    def test_promotion_replay_failures_are_assertions_not_collection_or_setup_errors(self):
        self.allow_mutation()
        root = self.root / "transcripts"
        selectors = ("access-denied", "sharing", "bound")
        for selector in selectors:
            path = root / f"{selector}.txt"
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(f"{selector} ... FAIL\nAssertionError: expected retry\nRan 1 test\nFAILED (failures=1)\n", encoding="utf-8", newline="\n")
        self.adapters.scenario.update({"preflight": "valid", "platform": "win32", "promotion_transcripts": root, "promotion_selectors": selectors})
        result = _candidate.execute_command(_candidate.parse_cli(("produce", "--kind", "promotion", "--reviewed-head", _HEAD)), self.adapters)
        reads = _calls(self.adapters, "filesystem", "read_bytes")
        self.assertEqual((result, tuple((root / f"{selector}.txt",) in reads for selector in selectors)), (self.expected_result("produce", "ok", "producer_succeeded", (("red_transcripts", (("access-denied", 1, 0, 0), ("sharing", 1, 0, 0), ("bound", 1, 0, 0))),)), (True,) * len(selectors)))

    def test_task_audits_are_canonical_current_state_only(self):
        self.allow_mutation()
        audit = self.root / "task-6.json"
        _write_json(audit, {"schema_version": 1, "kind": "task-6", "reviewed_head": _HEAD, "claim": "current immutable commit state only", "historical_report": "UNRECOVERABLE", "checks": ["git-lineage", "source-blobs", "selectors"]})
        self.adapters.scenario.update({"preflight": "valid", "platform": "win32", "task_audits": (audit,)})
        result = _candidate.execute_command(_candidate.parse_cli(("produce", "--kind", "task-audits", "--reviewed-head", _HEAD)), self.adapters)
        self.assertEqual((result, (audit,) in _calls(self.adapters, "filesystem", "read_bytes")), (self.expected_result("produce", "ok", "producer_succeeded", (("audits", (("task-6", _sha256(audit.read_bytes())),)), ("claim", "current immutable commit state only"))), True))

    def test_task_audit_schema_rejects_every_closed_field_and_cardinality_drift(self):
        base = {"schema_version": 1, "kind": "task-7", "reviewed_head": _HEAD, "claim": "current immutable commit state only", "historical_report": "UNRECOVERABLE", "checks": ["a", "b"]}
        mutations = []
        for key in base:
            row = dict(base)
            del row[key]
            mutations.append(row)
        mutations.extend(({**base, "extra": True}, {**base, "checks": ["a", "a"]}))
        rows = []
        reads = []
        for ordinal, value in enumerate(mutations):
            path = self.root / f"audit-{ordinal}.json"
            _write_json(path, value)
            adapters = _FakeAdapters(self.root / f"audit-state-{ordinal}", self.repository, self.git, self.environment)
            adapters.scenario.update({"preflight": "valid", "platform": "win32", "task_audits": (path,)})
            rows.append(_candidate.execute_command(_candidate.parse_cli(("produce", "--kind", "task-audits", "--reviewed-head", _HEAD)), adapters))
            reads.append((path,) in _calls(adapters, "filesystem", "read_bytes"))
        expected = tuple(self.expected_result("produce", "blocked", "audit_invalid", (("row", ordinal),)) for ordinal in range(len(mutations)))
        self.assertEqual((tuple(rows), tuple(reads)), (expected, (True,) * len(mutations)))

    def test_task_audits_bind_exact_machine_evidence_and_review_requirements(self):
        self.allow_mutation()
        audit = self.root / "task-7.json"
        checks = ("git-lineage", "tree", "subject", "parent", "numstat", "source-blobs", "selectors", "mutation-restoration", "review-required")
        _write_json(audit, {"schema_version": 1, "kind": "task-7", "reviewed_head": _HEAD, "claim": "current immutable commit state only", "historical_report": "UNRECOVERABLE", "checks": list(checks)})
        self.adapters.scenario.update({"preflight": "valid", "platform": "win32", "task_audits": (audit,)})
        result = _candidate.execute_command(_candidate.parse_cli(("produce", "--kind", "task-audits", "--reviewed-head", _HEAD)), self.adapters)
        self.assertEqual((result, (audit,) in _calls(self.adapters, "filesystem", "read_bytes")), (self.expected_result("produce", "ok", "producer_succeeded", (("kind", "task-7"), ("checks", checks), ("sha256", _sha256(audit.read_bytes())))), True))

    def test_audits_freeze_before_review_and_are_never_regenerated_by_consumers(self):
        paths = (self.root / "task-6.json", self.root / "task-7.json")
        for ordinal, path in enumerate(paths, 6):
            _write_json(path, {"schema_version": 1, "kind": f"task-{ordinal}", "reviewed_head": _HEAD})
        before = tuple(path.read_bytes() for path in paths)
        review_adapters = _FakeAdapters(self.root / "audit-review", self.repository, self.git, self.environment)
        review_adapters.git_responses.update({"preflight": "valid", "platform": "win32", "frozen_audits": paths})
        review = self.write_review("plan-e", session="Session-1")
        argv = ("ingest-review", "--kind", "plan-e", "--reviewed-head", _HEAD, "--session-id", "Session-1", "--input", str(review))
        first = _candidate.execute_command(_candidate.parse_cli(argv), review_adapters)
        finalize_adapters = _FakeAdapters(self.root / "audit-finalize", self.repository, self.git, self.environment)
        finalize_adapters.git_responses.update({"preflight": "valid", "platform": "win32", "frozen_audits": paths})
        second = _candidate.execute_command(_candidate.parse_cli(("finalize", "--reviewed-head", _HEAD)), finalize_adapters)
        after = tuple(path.read_bytes() for path in paths)
        expected = (self.expected_result("ingest-review", "ok", "review_ingested"), self.expected_result("finalize", "ok", "finalized"), before)
        self.assertEqual((first, second, after), expected)


class ReviewGrammarTests(_Fixture, unittest.TestCase):
    def test_review_text_requires_exact_whole_file_heading_grammar(self):
        rows = []
        reads = []
        valid_hash = ""
        for ordinal in range(3):
            adapters = _FakeAdapters(self.root / f"review-whole-{ordinal}", self.repository, self.git, self.environment)
            adapters.git_responses.update({"preflight": "valid", "platform": "win32"})
            self.write_complete_terminal_state(adapters=adapters, include_reviews=False)
            path = self.write_review("plan-e", session="Session-1", extra=b"hidden\n" if ordinal == 2 else b"", adapters=adapters, filename=f"whole-{ordinal}.md")
            if ordinal == 1:
                path.write_bytes(b"hidden\n" + path.read_bytes())
            if ordinal == 0:
                valid_hash = _sha256(path.read_bytes())
            argv = ("ingest-review", "--kind", "plan-e", "--reviewed-head", _HEAD, "--session-id", "Session-1", "--input", str(path))
            rows.append(_candidate.execute_command(_candidate.parse_cli(argv), adapters))
            reads.append((path,) in _calls(adapters, "filesystem", "read_bytes"))
        expected = (
            self.expected_result("ingest-review", "ok", "review_ingested", (("disposition", "PASS"), ("input_sha256", valid_hash))),
            self.expected_result("ingest-review", "blocked", "review_rejected", (("classification", "whole_text"),)),
            self.expected_result("ingest-review", "blocked", "review_rejected", (("classification", "whole_text"),)),
        )
        self.assertEqual((tuple(rows), tuple(reads)), (expected, (True, True, True)))

    def test_review_input_is_single_snapshot_regular_file_and_not_cleanup_authority(self):
        self.allow_mutation()
        self.write_complete_terminal_state(include_reviews=False)
        review = self.write_review("plan-e", session="Session-1", adapters=self.adapters)
        outside = self.root / "outside.txt"
        outside.write_bytes(b"keep\n")
        self.adapters.filesystem_responses["review_snapshot_hook"] = lambda *_args: outside.write_bytes(b"keep\n")
        argv = ("ingest-review", "--kind", "plan-e", "--reviewed-head", _HEAD, "--session-id", "Session-1", "--input", str(review))
        result = _candidate.execute_command(_candidate.parse_cli(argv), self.adapters)
        expected = self.expected_result("ingest-review", "ok", "review_ingested", (("input_sha256", _sha256(review.read_bytes())), ("input_size", len(review.read_bytes()))))
        self.assertEqual((result, review.read_bytes(), outside.read_bytes(), (review,) in _calls(self.adapters, "filesystem", "read_bytes")), (expected, review.read_bytes(), b"keep\n", True))

    def test_review_disposition_criteria_findings_and_session_rules_are_exact(self):
        results = []
        for ordinal, (kind, session) in enumerate((("plan-e", "Session-1"), ("whole", "Session-2"))):
            adapters = _FakeAdapters(self.root / f"review-disposition-{ordinal}", self.repository, self.git, self.environment)
            adapters.git_responses.update({"preflight": "valid", "platform": "win32", "other_review_session": "Session-1" if kind == "whole" else None})
            self.write_complete_terminal_state(adapters=adapters, include_reviews=False)
            path = self.write_review(kind, session=session, adapters=adapters)
            argv = ("ingest-review", "--kind", kind, "--reviewed-head", _HEAD, "--session-id", session, "--input", str(path))
            results.append(_candidate.execute_command(_candidate.parse_cli(argv), adapters))
        expected = (
            self.expected_result("ingest-review", "ok", "review_ingested", (("kind", "plan-e"), ("session_id", "Session-1"), ("disposition", "PASS"), ("criteria_passed", 5))),
            self.expected_result("ingest-review", "ok", "review_ingested", (("kind", "whole"), ("session_id", "Session-2"), ("disposition", "INTERIM PASS THROUGH PLAN E"), ("criteria_passed", 5))),
        )
        self.assertEqual(tuple(results), expected)

    def test_review_critical_or_important_code_finding_blocks_even_when_criteria_pass(self):
        rows = []
        for ordinal, section in enumerate(("Critical", "Important")):
            adapters = _FakeAdapters(self.root / f"severity-{ordinal}", self.repository, self.git, self.environment)
            adapters.git_responses.update({"preflight": "valid", "platform": "win32"})
            self.write_complete_terminal_state(adapters=adapters, include_reviews=False)
            review = self.write_review("plan-e", session="Session-1", finding_section=section, finding=f"- [{section}] host/file.py:10 - open finding", adapters=adapters)
            argv = ("ingest-review", "--kind", "plan-e", "--reviewed-head", _HEAD, "--session-id", "Session-1", "--input", str(review))
            rows.append(_candidate.execute_command(_candidate.parse_cli(argv), adapters))
        expected = tuple(self.expected_result("ingest-review", "blocked", "review_rejected", (("classification", "high_severity"), ("section", section))) for section in ("Critical", "Important"))
        self.assertEqual(tuple(rows), expected)

    def test_second_review_must_bind_a_different_declared_session_and_findings_hash(self):
        first_adapters = _FakeAdapters(self.root / "review-first", self.repository, self.git, self.environment)
        first_adapters.git_responses.update({"preflight": "valid", "platform": "win32"})
        self.write_complete_terminal_state(adapters=first_adapters, include_reviews=False)
        first = self.write_review("plan-e", session="Session-1", adapters=first_adapters)
        first_argv = ("ingest-review", "--kind", "plan-e", "--reviewed-head", _HEAD, "--session-id", "Session-1", "--input", str(first))
        first_result = _candidate.execute_command(_candidate.parse_cli(first_argv), first_adapters)
        first_hash = _sha256(first.read_bytes())
        same_adapters = _FakeAdapters(self.root / "review-same", self.repository, self.git, self.environment)
        same_adapters.git_responses.update({"preflight": "valid", "platform": "win32", "other_review_session": "Session-1"})
        self.write_complete_terminal_state(adapters=same_adapters, include_reviews=False)
        same = self.write_review("whole", session="Session-1", adapters=same_adapters)
        same_argv = ("ingest-review", "--kind", "whole", "--reviewed-head", _HEAD, "--session-id", "Session-1", "--input", str(same))
        same_result = _candidate.execute_command(_candidate.parse_cli(same_argv), same_adapters)
        different_adapters = _FakeAdapters(self.root / "review-different", self.repository, self.git, self.environment)
        different_adapters.git_responses.update({"preflight": "valid", "platform": "win32", "other_review_session": "Session-1"})
        self.write_complete_terminal_state(adapters=different_adapters, include_reviews=False)
        different = self.write_review("whole", session="Session-2", adapters=different_adapters)
        different_argv = ("ingest-review", "--kind", "whole", "--reviewed-head", _HEAD, "--session-id", "Session-2", "--input", str(different))
        different_result = _candidate.execute_command(_candidate.parse_cli(different_argv), different_adapters)
        expected = (
            self.expected_result("ingest-review", "ok", "review_ingested", (("session_id", "Session-1"), ("findings_sha256", first_hash))),
            self.expected_result("ingest-review", "blocked", "review_rejected", (("classification", "session_not_distinct"),)),
            self.expected_result("ingest-review", "ok", "review_ingested", (("session_id", "Session-2"), ("findings_sha256", _sha256(different.read_bytes())))),
        )
        self.assertEqual((first_result, same_result, different_result), expected)

    def test_review_findings_require_closed_file_line_grammar(self):
        results = []
        for ordinal, finding in enumerate(("- [Minor] host/file.py:10 - minor issue", "host/file.py:10: minor issue")):
            adapters = _FakeAdapters(self.root / f"finding-{ordinal}", self.repository, self.git, self.environment)
            adapters.git_responses.update({"preflight": "valid", "platform": "win32"})
            self.write_complete_terminal_state(adapters=adapters, include_reviews=False)
            path = self.write_review("plan-e", session="Session-1", finding_section="Minor", finding=finding, adapters=adapters)
            argv = ("ingest-review", "--kind", "plan-e", "--reviewed-head", _HEAD, "--session-id", "Session-1", "--input", str(path))
            results.append(_candidate.execute_command(_candidate.parse_cli(argv), adapters))
        expected = (self.expected_result("ingest-review", "ok", "review_ingested", (("minor_count", 1),)), self.expected_result("ingest-review", "blocked", "review_rejected", (("classification", "finding_grammar"),)))
        self.assertEqual(tuple(results), expected)

    def test_review_rejects_hash_range_audit_or_prospective_durability_drift(self):
        axes = ("package_sha256", "diff_sha256", "task6_sha256", "task7_sha256", "review_range")
        rows = []
        for ordinal, axis in enumerate(axes):
            adapters = _FakeAdapters(self.root / f"review-drift-{ordinal}", self.repository, self.git, self.environment)
            adapters.git_responses.update({"preflight": "valid", "platform": "win32", "review_binding_drift": axis})
            self.write_complete_terminal_state(adapters=adapters, include_reviews=False)
            review = self.write_review("plan-e", session="Session-1", adapters=adapters)
            argv = ("ingest-review", "--kind", "plan-e", "--reviewed-head", _HEAD, "--session-id", "Session-1", "--input", str(review))
            rows.append(_candidate.execute_command(_candidate.parse_cli(argv), adapters))
        expected = tuple(self.expected_result("ingest-review", "blocked", "review_rejected", (("classification", "binding_drift"), ("axis", axis))) for axis in axes)
        self.assertEqual(tuple(rows), expected)

    def test_review_dispatch_candidates_are_receipt_authorized_head_scoped_bytes(self):
        self.allow_mutation()
        self.write_complete_terminal_state(include_reviews=False)
        relative = ".superpowers/sdd/plan-e-only-review-package.txt"
        package = _long_path(self.adapters.state / "heads" / _HEAD / "plan-e-review-package" / "candidates" / relative)
        receipt = self.adapters.state / "heads" / _HEAD / "plan-e-review-package" / "receipt.json"
        receipt_value = json.loads(receipt.read_text(encoding="utf-8"))
        review = self.write_review("plan-e", session="Session-1", adapters=self.adapters)
        argv = ("ingest-review", "--kind", "plan-e", "--reviewed-head", _HEAD, "--session-id", "Session-1", "--input", str(review))
        result = _candidate.execute_command(_candidate.parse_cli(argv), self.adapters)
        expected = self.expected_result("ingest-review", "ok", "review_ingested", (("package_sha256", receipt_value["candidate_sha256"][relative]), ("reviewed_head", _HEAD)))
        self.assertEqual((result, _sha256(package.read_bytes())), (expected, receipt_value["candidate_sha256"][relative]))


class FinalReportTests(_Fixture, unittest.TestCase):
    def report_inputs(self, reviewed_head: str) -> dict[str, object]:
        return {
            "reviewed_head": reviewed_head,
            "subject": _FINAL_SUBJECT,
            "headings": _REPORT_HEADINGS,
            "requirements": tuple((f"R{ordinal}", f"test_{ordinal}") for ordinal in range(1, 10)),
            "reviewed_paths": _plan_inventory("PLAN_E_REVIEWED_PATHS"),
            "evidence_paths": _plan_inventory("PLAN_E_FINAL_EVIDENCE_PATHS"),
            "task_6_7_statement": "Historical Task 6/7 reports are UNRECOVERABLE; audits prove current immutable commit state only.",
            "forbidden_operations": "network registry AppData browser install publish push tag real update: NOT RUN",
            "residual_risks": "Declared review sessions do not prove identity or independence.",
        }

    def test_final_report_has_exact_headings_and_required_facts(self):
        self.allow_mutation(self.base_head)
        self.write_complete_terminal_state(self.base_head)
        self.adapters.git_responses["report_inputs"] = self.report_inputs(self.base_head)
        result = _candidate.execute_command(_candidate.parse_cli(("finalize", "--reviewed-head", self.base_head)), self.adapters)
        report = self.repository / ".superpowers" / "sdd" / "plan-e-extension-hardening-report.md"
        text = report.read_text(encoding="utf-8") if report.exists() else ""
        observed = (result, tuple(heading for heading in _REPORT_HEADINGS if text.count(f"## {heading}\n") == 1), "NOT RUN" in text, "UNRECOVERABLE" in text)
        expected = (self.expected_result("finalize", "ok", "finalized"), _REPORT_HEADINGS, True, True)
        self.assertEqual(observed, expected)

    def test_final_report_requirement_matrix_has_exact_unique_coverage(self):
        inputs = self.report_inputs(self.base_head)
        self.allow_mutation(self.base_head)
        self.write_complete_terminal_state(self.base_head)
        self.adapters.git_responses["report_inputs"] = inputs
        result = _candidate.execute_command(_candidate.parse_cli(("finalize", "--reviewed-head", self.base_head)), self.adapters)
        report = self.repository / ".superpowers" / "sdd" / "plan-e-extension-hardening-report.md"
        text = report.read_text(encoding="utf-8") if report.exists() else ""
        coverage = tuple((key, text.count(f"| {key} |")) for key, _selector in typing.cast(tuple[tuple[str, str], ...], inputs["requirements"]))
        expected = (self.expected_result("finalize", "ok", "finalized"), tuple((key, 1) for key, _selector in typing.cast(tuple[tuple[str, str], ...], inputs["requirements"])))
        self.assertEqual((result, coverage), expected)

    def test_final_report_lists_exact_reviewed_and_evidence_path_sets_once(self):
        inputs = self.report_inputs(self.base_head)
        self.allow_mutation(self.base_head)
        self.write_complete_terminal_state(self.base_head)
        self.adapters.git_responses["report_inputs"] = inputs
        result = _candidate.execute_command(_candidate.parse_cli(("finalize", "--reviewed-head", self.base_head)), self.adapters)
        report = self.repository / ".superpowers" / "sdd" / "plan-e-extension-hardening-report.md"
        text = report.read_text(encoding="utf-8") if report.exists() else ""
        reviewed = typing.cast(tuple[str, ...], inputs["reviewed_paths"])
        evidence = typing.cast(tuple[str, ...], inputs["evidence_paths"])
        observed = (result, len(reviewed), len(evidence), len(set(reviewed) | set(evidence)), all(text.count(path) == 1 for path in (*reviewed, *evidence)))
        self.assertEqual(observed, (self.expected_result("finalize", "ok", "finalized"), 70, 60, 130, True))

    def test_final_report_has_no_final_commit_sha_or_post_cas_fixed_point(self):
        inputs = self.report_inputs(self.base_head)
        inputs["prospective_commit"] = "d" * 40
        self.allow_mutation(self.base_head)
        self.write_complete_terminal_state(self.base_head)
        self.adapters.git_responses["report_inputs"] = inputs
        result = _candidate.execute_command(_candidate.parse_cli(("finalize", "--reviewed-head", self.base_head)), self.adapters)
        report = self.repository / ".superpowers" / "sdd" / "plan-e-extension-hardening-report.md"
        expected = self.expected_result("finalize", "blocked", "report_invalid", (("reason", "forbidden_input"),))
        self.assertEqual((result, report.exists()), (expected, False))

    def test_final_report_rejects_task_6_7_historical_reconstruction_claims(self):
        rows = []
        produced_reports: list[Path] = []
        for claim in ("Task 6 RED was reconstructed.", "Task 7 mutation chronology was recovered.", "Historical TDD evidence is reproduced."):
            root = self.root / ("claim-" + str(len(rows)))
            root.mkdir()
            repository, _head = self.new_repository("repo-claim-" + str(len(rows)))
            inputs = self.report_inputs(_head)
            inputs["task_6_7_statement"] = claim
            adapters = _FakeAdapters(root, repository, self.git, self.environment)
            adapters.git_responses.update({"preflight": "valid", "branch": _BRANCH, "head": _head, "status": b"", "chronology": "valid", "platform": "win32", "tool_paths": {name.removesuffix(".exe"): str((self.tools / name).resolve()) for name in ("git.exe", "python.exe", "node.exe")}})
            self.write_complete_terminal_state(_head, adapters=adapters)
            adapters.git_responses["report_inputs"] = inputs
            result = _candidate.execute_command(_candidate.parse_cli(("finalize", "--reviewed-head", _head)), adapters)
            report = repository / ".superpowers" / "sdd" / "plan-e-extension-hardening-report.md"
            produced_reports.append(report)
            rows.append((result, report.exists()))
        expected = tuple((self.expected_result("finalize", "blocked", "report_invalid", (("reason", "historical_reconstruction_claim"),)), False) for _ in rows)
        self.assertEqual((tuple(rows), tuple(path.exists() for path in produced_reports)), (expected, (False,) * len(produced_reports)))


class FinalizationTests(_Fixture, unittest.TestCase):
    def test_finalizer_validates_58_artifacts_and_stages_exact_60_blobs(self):
        reviewed_head, artifacts = self.prepare_finalization()
        result = _candidate.execute_command(_candidate.parse_cli(("finalize", "--reviewed-head", reviewed_head)), self.adapters)
        staged = tuple(_plan_inventory("PLAN_E_FINAL_EVIDENCE_PATHS"))
        expected = self.expected_result("finalize", "ok", "finalized", (("reviewed_head", reviewed_head), ("artifact_count", 58), ("staged_count", 60), ("staged_paths", staged)))
        final_head = _run_git(self.git, self.repository, self.environment, "rev-parse", "HEAD").decode().strip()
        committed_paths = tuple(sorted(_run_git(self.git, self.repository, self.environment, "diff-tree", "--no-commit-id", "--name-only", "-r", final_head).decode().splitlines()))
        self.assertEqual((result, len(artifacts), final_head != reviewed_head, committed_paths), (expected, 58, True, staged))

    def test_final_report_and_manifest_are_single_creation_frozen_candidates(self):
        reviewed_head, _artifacts = self.prepare_finalization()
        manifest = self.repository / ".superpowers" / "sdd" / "final-artifacts.sha256.json"
        report = self.repository / ".superpowers" / "sdd" / "plan-e-extension-hardening-report.md"
        result = _candidate.execute_command(_candidate.parse_cli(("finalize", "--reviewed-head", reviewed_head)), self.adapters)
        writes = tuple(arguments[0] for boundary, operation, arguments in self.adapters.calls if boundary == "filesystem" and operation == "write_exclusive" and arguments and Path(str(arguments[0])).name in {manifest.name, report.name})
        observed = (result, manifest.is_file(), report.is_file(), writes.count(manifest), writes.count(report))
        expected = (self.expected_result("finalize", "ok", "finalized"), True, True, 1, 1)
        self.assertEqual(observed, expected)

    def test_finalizer_requires_reviewed_head_equal_audit_subjects_and_review_heads(self):
        reviewed_head, _artifacts = self.prepare_finalization()
        receipt = self.adapters.state / "heads" / reviewed_head / "task-audits" / "receipt.json"
        value = json.loads(receipt.read_text(encoding="utf-8"))
        value["reviewed_head"] = _NEW_HEAD
        _write_json(receipt, value)
        result = _candidate.execute_command(_candidate.parse_cli(("finalize", "--reviewed-head", reviewed_head)), self.adapters)
        self.assertEqual((result, (receipt,) in _calls(self.adapters, "filesystem", "read_bytes"), receipt.exists()), (self.expected_result("finalize", "blocked", "final_validation_failed", (("reason", "reviewed_head_drift"), ("producer_id", "task-audits"))), True, True))

    def test_manifest_is_canonical_exact_58_path_sha256_map(self):
        reviewed_head, artifacts = self.prepare_finalization()
        result = _candidate.execute_command(_candidate.parse_cli(("finalize", "--reviewed-head", reviewed_head)), self.adapters)
        manifest = self.repository / ".superpowers" / "sdd" / "final-artifacts.sha256.json"
        expected_bytes = _canonical_bytes({"schema_version": 1, "artifacts": {name: _sha256(path.read_bytes()) for name, path in artifacts}})
        self.assertEqual((result, manifest.read_bytes() if manifest.exists() else None), (self.expected_result("finalize", "ok", "finalized"), expected_bytes))

    def test_finalizer_compares_every_staged_blob_with_committed_blob(self):
        reviewed_head, _artifacts = self.prepare_finalization()
        self.adapters.git_responses["staged_blob_map"] = (("a", "1" * 40), ("b", "2" * 40))
        self.adapters.git_responses["committed_blob_map"] = (("a", "1" * 40), ("b", "3" * 40))
        result = _candidate.execute_command(_candidate.parse_cli(("finalize", "--reviewed-head", reviewed_head)), self.adapters)
        compared = tuple(operation for boundary, operation, _arguments in self.adapters.calls if boundary == "git" and operation in {"staged_blob_map", "committed_blob_map"})
        self.assertEqual((result, compared), (self.expected_result("finalize", "blocked", "final_validation_failed", (("reason", "blob_mismatch"), ("path", "b"), ("staged", "2" * 40), ("committed", "3" * 40))), ("staged_blob_map", "committed_blob_map")))

    def test_finalizer_uses_commit_tree_and_compare_and_swap_ref_update(self):
        reviewed_head, _artifacts = self.prepare_finalization()
        result = _candidate.execute_command(_candidate.parse_cli(("finalize", "--reviewed-head", reviewed_head)), self.adapters)
        git_operations = tuple((operation, arguments) for boundary, operation, arguments in self.adapters.calls if boundary == "git" and operation in {"write_tree", "commit_tree", "update_ref"})
        final_head = _run_git(self.git, self.repository, self.environment, "rev-parse", "HEAD").decode().strip()
        parent = _run_git(self.git, self.repository, self.environment, "rev-parse", f"{final_head}^").decode().strip() if final_head != reviewed_head else None
        subject = _run_git(self.git, self.repository, self.environment, "log", "-1", "--format=%s", final_head).decode().strip()
        expected_operations = (("write_tree", ()), ("commit_tree", (_FINAL_SUBJECT, reviewed_head)), ("update_ref", (f"refs/heads/{_BRANCH}", final_head, reviewed_head)))
        self.assertEqual((result, git_operations, parent, subject), (self.expected_result("finalize", "ok", "finalized"), expected_operations, reviewed_head, _FINAL_SUBJECT))

    def test_finalizer_concurrent_branch_or_index_change_blocks_without_overwrite(self):
        reviewed_head, _artifacts = self.prepare_finalization()
        (self.repository / "concurrent.txt").write_bytes(b"concurrent\n")
        _run_git(self.git, self.repository, self.environment, "add", "--", "concurrent.txt")
        before_index = (self.repository / ".git" / "index").read_bytes()
        before_head = _run_git(self.git, self.repository, self.environment, "rev-parse", "HEAD").decode().strip()
        result = _candidate.execute_command(_candidate.parse_cli(("finalize", "--reviewed-head", reviewed_head)), self.adapters)
        expected = self.expected_result("finalize", "blocked", "retained_state", (("reason", "index_changed"),))
        self.assertEqual((result, (self.repository / ".git" / "index").read_bytes(), _run_git(self.git, self.repository, self.environment, "rev-parse", "HEAD").decode().strip()), (expected, before_index, before_head))

    def test_finalizer_validates_staged_diff_check_and_empty_preexisting_index(self):
        reviewed_head, _artifacts = self.prepare_finalization()
        staged = self.repository / "staged.txt"
        staged.write_bytes(b"trailing whitespace \n")
        _run_git(self.git, self.repository, self.environment, "add", "--", "staged.txt")
        before = (self.repository / ".git" / "index").read_bytes()
        result = _candidate.execute_command(_candidate.parse_cli(("finalize", "--reviewed-head", reviewed_head)), self.adapters)
        expected = self.expected_result("finalize", "blocked", "retained_state", (("reason", "preexisting_index"),))
        self.assertEqual((result, (self.repository / ".git" / "index").read_bytes(), staged.read_bytes()), (expected, before, b"trailing whitespace \n"))

    def test_finalizer_preserves_index_and_head_on_post_staging_failure(self):
        rows = []
        for point in ("after-staged", "after-cas"):
            root = self.root / point
            root.mkdir()
            repository, old_head = self.new_repository("repo-" + point)
            adapters = _FakeAdapters(root, repository, self.git, self.environment)
            self.adapters = adapters
            reviewed_head, artifacts = self.prepare_finalization()
            prospective = self.make_prospective_commit()
            staged_map = tuple((path, f"{ordinal + 1:040x}") for ordinal, path in enumerate(_plan_inventory("PLAN_E_FINAL_EVIDENCE_PATHS")))
            candidate_map = tuple((path, _sha256(source.read_bytes())) for path, source in artifacts)
            adapters.git_responses.update({"failure_point": point, "prospective_head": prospective, "real_prospective_head": prospective, "real_reviewed_head": old_head, "staged_blob_map": staged_map})
            before_index_hash = _sha256((repository / ".git" / "index").read_bytes())
            result = _candidate.execute_command(_candidate.parse_cli(("finalize", "--reviewed-head", reviewed_head)), adapters)
            current_head = _run_git(self.git, repository, self.environment, "rev-parse", "HEAD").decode().strip()
            index_hash = _sha256((repository / ".git" / "index").read_bytes())
            staged_index_changed = index_hash != before_index_hash
            lease = adapters.common / "plan-e-evidence-v1.lease.json"
            lease_bytes = lease.read_bytes() if lease.exists() else None
            expected_lease = {
                "schema_version": 1,
                "kind": "finalize",
                "token": "000102030405060708090a0b0c0d0e0f",
                "reviewed_head": reviewed_head,
                "branch_ref": f"refs/heads/{_BRANCH}",
                "checkpoint": "staged" if point == "after-staged" else "committed",
                "candidate_sha256": [list(row) for row in candidate_map],
                "index_blob_map": [list(row) for row in staged_map],
                "index_sha256": index_hash,
                "prospective_head": prospective,
                "expected_pre_ref": old_head,
                "expected_post_ref": prospective,
                "owner_path": str((adapters.state / "finalizer" / "owner.json").resolve()),
                "quarantine_path": None,
            }
            ref_matches_checkpoint = current_head == old_head if point == "after-staged" else current_head == prospective
            after_cas_advanced = point != "after-cas" or current_head == prospective
            rows.append((point, result, old_head, prospective, current_head, staged_index_changed, ref_matches_checkpoint, after_cas_advanced, lease_bytes, _canonical_bytes(expected_lease)))
        expected = (
            ("after-staged", self.expected_result("finalize", "blocked", "retained_state", (("checkpoint", "staged"),)), rows[0][2], rows[0][3], rows[0][2], True, True, True, rows[0][9], rows[0][9]),
            ("after-cas", self.expected_result("finalize", "blocked", "retained_state", (("checkpoint", "committed"),)), rows[1][2], rows[1][3], rows[1][3], True, True, True, rows[1][9], rows[1][9]),
        )
        self.assertEqual(tuple(rows), expected)

    def test_finalizer_resume_reconciles_only_two_exact_ref_states(self):
        rows = []
        for ordinal, state_name in enumerate(("reviewed", "prospective", "other")):
            root = self.root / f"resume-{ordinal}"
            root.mkdir()
            repository, _head = self.new_repository(f"repo-resume-{ordinal}")
            adapters = _FakeAdapters(root, repository, self.git, self.environment)
            self.adapters = adapters
            reviewed_head, _artifacts = self.prepare_finalization()
            prospective = self.make_prospective_commit()
            ref_state = reviewed_head if state_name == "reviewed" else prospective if state_name == "prospective" else "c" * 40
            lease = adapters.common / "plan-e-evidence-v1.lease.json"
            _write_json(lease, {"schema_version": 1, "checkpoint": "staged", "reviewed_head": reviewed_head, "prospective_head": prospective, "token": "1" * 32, "index_sha256": "2" * 64})
            adapters.git_responses.update({"current_ref": ref_state, "resume_token": "1" * 32, "real_prospective_head": prospective, "real_reviewed_head": reviewed_head})
            rows.append(_candidate.execute_command(_candidate.parse_cli(("finalize", "--reviewed-head", reviewed_head)), adapters))
        expected = (self.expected_result("finalize", "ok", "finalized", (("resume", "cas"),)), self.expected_result("finalize", "ok", "finalized", (("resume", "advance_committed"),)), self.expected_result("finalize", "blocked", "retained_state", (("reason", "ref_mismatch"),)))
        self.assertEqual(tuple(rows), expected)

    def test_finalizer_cleanup_quarantine_and_checkpoint_failures_are_retained(self):
        points = ("candidate-validation", "staging", "commit", "post-validation", "rename", "delete", "lease-remove")
        rows = []
        for point in points:
            root = self.root / ("failure-" + point)
            root.mkdir()
            repository, _head = self.new_repository("repo-failure-" + point)
            adapters = _FakeAdapters(root, repository, self.git, self.environment)
            self.adapters = adapters
            reviewed_head, _artifacts = self.prepare_finalization()
            adapters.git_responses["failure_point"] = point
            result = _candidate.execute_command(_candidate.parse_cli(("finalize", "--reviewed-head", reviewed_head)), adapters)
            lease = adapters.common / "plan-e-evidence-v1.lease.json"
            rows.append((result, lease.exists(), adapters.state.exists()))
        expected = tuple((self.expected_result("finalize", "blocked", "retained_state", (("checkpoint", point),)), True, True) for point in points)
        self.assertEqual(tuple(rows), expected)

    def test_finalizer_failure_exit_codes_preserve_exact_checkpoint_authority(self):
        stages = ("candidate", "report", "staging", "tree", "commit", "cas", "post-validation", "quarantine", "cleanup")
        rows = []
        for stage in stages:
            root = self.root / ("exit-" + stage)
            root.mkdir()
            repository, _head = self.new_repository("repo-exit-" + stage)
            adapters = _FakeAdapters(root, repository, self.git, self.environment)
            self.adapters = adapters
            reviewed_head, _artifacts = self.prepare_finalization()
            adapters.git_responses["failure_point"] = stage
            result = _candidate.execute_command(_candidate.parse_cli(("finalize", "--reviewed-head", reviewed_head)), adapters)
            stream = io.BytesIO()
            _candidate.emit_result(result, stream)
            rows.append((result, stream.getvalue()))
        expected = tuple((self.expected_result("finalize", "blocked" if stage in {"candidate", "report", "post-validation"} else "error", "final_validation_failed" if stage in {"candidate", "report", "post-validation"} else "internal_error", (("checkpoint", stage),)), _canonical_bytes({"schema_version": 1, "command": "finalize", "status": "blocked" if stage in {"candidate", "report", "post-validation"} else "error", "code": "final_validation_failed" if stage in {"candidate", "report", "post-validation"} else "internal_error", "checkpoint": stage})) for stage in stages)
        self.assertEqual(tuple(rows), expected)

    def test_finalizer_success_removes_only_owned_state_after_post_validation(self):
        reviewed_head, _artifacts = self.prepare_finalization()
        outside = self.root / "outside.txt"
        outside.write_bytes(b"keep\n")
        result = _candidate.execute_command(_candidate.parse_cli(("finalize", "--reviewed-head", reviewed_head)), self.adapters)
        expected = self.expected_result("finalize", "ok", "finalized")
        self.assertEqual((result, outside.read_bytes(), self.adapters.state.exists()), (expected, b"keep\n", False))

    def test_verify_final_is_clean_clone_read_only_and_uses_literal_base(self):
        clone, base, reviewed, final = self.build_final_history("valid")
        adapters = _FakeAdapters(self.root / "verify", clone, self.git, self.environment)
        adapters.git_responses.update({"integration_base": base, "literal_base": _INTEGRATION_BASE, "reviewed_head": reviewed})
        before = (
            (clone / ".git" / "index").read_bytes(),
            _run_git(self.git, clone, self.environment, "rev-parse", "HEAD").decode().strip(),
            _run_git(self.git, clone, self.environment, "status", "--porcelain=v1", "--untracked-files=all"),
        )
        valid = _candidate.execute_command(_candidate.parse_cli(("verify-final", "--final-head", final)), adapters)
        invalid_clone, invalid_base, invalid_reviewed, invalid_final = self.build_final_history("invalid", corrupt_audit=True)
        invalid_adapters = _FakeAdapters(self.root / "verify-invalid", invalid_clone, self.git, self.environment)
        invalid_adapters.git_responses.update({"integration_base": invalid_base, "literal_base": _INTEGRATION_BASE, "reviewed_head": invalid_reviewed})
        invalid = _candidate.execute_command(_candidate.parse_cli(("verify-final", "--final-head", invalid_final)), invalid_adapters)
        expected = self.expected_result("verify-final", "ok", "final_verified", (("final_head", final), ("parent", reviewed), ("subject", _FINAL_SUBJECT), ("artifact_count", 58), ("evidence_count", 60), ("reviewed_count", 70), ("union_count", 130), ("final_commit_validation", "PASS"), ("base_to_final_union_validation", "PASS")))
        expected_invalid = self.expected_result("verify-final", "blocked", "final_validation_failed", (("reason", "audit_noncanonical"), ("path", ".superpowers/sdd/task-6-audit-evidence.json")))
        after = (
            (clone / ".git" / "index").read_bytes(),
            _run_git(self.git, clone, self.environment, "rev-parse", "HEAD").decode().strip(),
            _run_git(self.git, clone, self.environment, "status", "--porcelain=v1", "--untracked-files=all"),
        )
        self.assertEqual((valid, after, invalid), (expected, before, expected_invalid))

    def test_final_primary_checkout_is_clean_exact_head_without_extra_worktrees(self):
        clone, base, reviewed, final = self.build_final_history("worktree")
        extra = clone.parent / "extra-worktree"
        _run_git(self.git, clone, self.environment, "worktree", "add", "--detach", str(extra), reviewed)
        adapters = _FakeAdapters(self.root / "verify", clone, self.git, self.environment)
        adapters.git_responses.update({"integration_base": base, "literal_base": _INTEGRATION_BASE, "reviewed_head": reviewed})
        index_before = (clone / ".git" / "index").read_bytes()
        result = _candidate.execute_command(_candidate.parse_cli(("verify-final", "--final-head", final)), adapters)
        expected = self.expected_result("verify-final", "blocked", "final_validation_failed", (("reason", "extra_worktree"),))
        self.assertEqual((result, extra.exists(), (clone / ".git" / "index").read_bytes(), _run_git(self.git, clone, self.environment, "rev-parse", "HEAD").decode().strip()), (expected, True, index_before, final))


class InventoryAndReleaseTests(_Fixture, unittest.TestCase):
    def test_literal_inventories_are_sorted_unique_and_exact(self):
        reviewed = _plan_inventory("PLAN_E_REVIEWED_PATHS")
        artifacts = _plan_inventory("PLAN_E_ARTIFACT_PATHS")
        final_paths = _plan_inventory("PLAN_E_FINAL_EVIDENCE_PATHS")
        self.adapters.git_responses["inventories"] = (reviewed, artifacts, final_paths)
        result = _candidate.execute_command(_candidate.parse_cli(("preflight",)), self.adapters)
        expected = self.expected_result("preflight", "ok", "preflight_ok", (("reviewed_count", 70), ("artifact_count", 58), ("final_count", 60), ("union_count", 130), ("sorted_unique", True), ("disjoint", True)))
        self.assertEqual((result, self.adapters.git_responses["inventories"], _calls(self.adapters, "git", "inventories")), (expected, (reviewed, artifacts, final_paths), ((),)))

    def test_candidate_ownership_arithmetic_is_exact_and_disjoint(self):
        specs = self.producer_specs()
        self.adapters.git_responses.update({"tool_paths": {name.removesuffix(".exe"): str((self.tools / name).resolve()) for name in ("git.exe", "python.exe", "node.exe")}, "candidate_counts": (40, 1, 1, 1, 1, 3, 2, 2, 1, 1)})
        result = _candidate.execute_command(_candidate.parse_cli(("preflight",)), self.adapters)
        expected = self.expected_result("preflight", "ok", "preflight_ok", (("candidate_counts", (40, 1, 1, 1, 1, 3, 2, 2, 1, 1)), ("candidate_total", 53), ("auxiliary_excluded", 1), ("historical_reports", 6), ("manifest_total", 58), ("overlaps", 0)))
        self.assertEqual((result, tuple(len(spec.candidate_paths) for spec in specs), _calls(self.adapters, "git", "candidate_counts")), (expected, (40, 1, 1, 1, 1, 3, 2, 2), ((),)))

    def test_release_staging_and_pyinstaller_exclude_executor(self):
        stage = self.root / "release-stage"
        (stage / "host").mkdir(parents=True)
        (stage / "extension").mkdir()
        (stage / "host" / "dh_native_host.exe").write_bytes(b"exe")
        (stage / "extension" / "manifest.json").write_bytes(b"{}\n")
        self.adapters.git_responses.update({"release_stage": stage, "release_helper": _SOURCE_ROOT / "release_helper.py"})
        result = _candidate.execute_command(_candidate.parse_cli(("preflight",)), self.adapters)
        expected = self.expected_result("preflight", "ok", "preflight_ok", (("executor_staged", False), ("executor_hidden_import", False), ("executor_in_release_helper", False), ("stage_paths", ("extension/manifest.json", "host/dh_native_host.exe"))))
        self.assertEqual((result, tuple(sorted(path.relative_to(stage).as_posix() for path in stage.rglob("*") if path.is_file())), _calls(self.adapters, "git", "release_stage")), (expected, ("extension/manifest.json", "host/dh_native_host.exe"), ((),)))

    def test_forbidden_operations_are_unreachable_from_cli_definitions(self):
        intercepted: list[str] = []

        def block(name: str):
            def blocked(*_arguments: object, **_keywords: object) -> object:
                intercepted.append(name)
                raise RuntimeError(f"forbidden boundary: {name}")

            return blocked

        patches = [
            mock.patch.object(_socket, "create_connection", side_effect=block("network")),
            mock.patch.object(_urlrequest, "urlopen", side_effect=block("network")),
            mock.patch.object(subprocess, "run", side_effect=block("process")),
            mock.patch.object(subprocess, "Popen", side_effect=block("process")),
            mock.patch.object(os, "startfile", side_effect=block("browser")),
        ]
        if _winreg is not None:
            patches.extend((mock.patch.object(_winreg, "OpenKey", side_effect=block("registry")), mock.patch.object(_winreg, "SetValueEx", side_effect=block("registry"))))
        results = []
        adapters = []
        unexpected: list[str] = []
        started = []
        try:
            for patcher in patches:
                patcher.start()
                started.append(patcher)
            for ordinal, argv in enumerate(_accepted_argv(self.root)):
                parsed = _candidate.parse_cli(argv)
                adapter = _FakeAdapters(self.root / f"safety-{ordinal}", self.repository, self.git, self.environment)
                adapter.dry_run = True
                adapter.git_responses.update({"preflight": "valid", "platform": "win32", "dry_run": True, "tool_paths": {name.removesuffix(".exe"): str((self.tools / name).resolve()) for name in ("git.exe", "python.exe", "node.exe")}})
                adapter.expected_command = (parsed.name, parsed.options)
                adapters.append(adapter)
                try:
                    results.append(_candidate.execute_command(parsed, adapter))
                except Exception as error:
                    unexpected.append(f"{parsed.name}:{type(error).__name__}")
        finally:
            for patcher in reversed(started):
                patcher.stop()
        expected_commands = tuple((_candidate.parse_cli(argv).name, _candidate.parse_cli(argv).options) for argv in _accepted_argv(self.root))
        process_specs = tuple(call[2][0] for adapter in adapters for call in adapter.calls if call[:2] == ("process", "run"))
        closed = tuple(
            Path(spec.executable_role).is_absolute()
            and Path(spec.cwd_role).is_absolute()
            and not any(key.startswith(("PLAN_E_", "NPM_CONFIG_")) or key in {"PYTHONPATH", "PYTHONHOME", "NODE_OPTIONS", "DH_PROMOTION_EVIDENCE"} for key, _value in spec.environment)
            and (
                spec.command_id != "host-tests"
                or all(name in dict(spec.environment) and Path(dict(spec.environment)[name]).is_relative_to(adapter.root) for name in _PROFILE_NAMES)
            )
            for adapter in adapters
            for call in adapter.calls
            if call[:2] == ("process", "run")
            for spec in (typing.cast(_candidate.CommandSpec, call[2][0]),)
        )
        observed = (len(results), tuple(command for adapter in adapters for command in adapter.observed_commands), tuple(intercepted), tuple(unexpected), tuple(spec.command_id for spec in process_specs), closed)
        expected_process_ids = tuple(command.command_id for spec in self.producer_specs() for command in spec.commands)
        self.assertEqual(observed, (len(_accepted_argv(self.root)), expected_commands, (), (), expected_process_ids, (True,) * len(expected_process_ids)))

    def test_executor_tests_use_only_disposable_repo_profile_and_temp_roots(self):
        mutable = (self.repository, self.adapters.state, *(Path(self.environment[name]) for name in _PROFILE_NAMES))
        self.adapters.git_responses["safety_inventory"] = tuple(path.resolve() for path in mutable)
        result = _candidate.execute_command(_candidate.parse_cli(("preflight",)), self.adapters)
        forbidden_env = tuple(sorted(key for key in self.environment if key.startswith(("PLAN_E_", "NPM_CONFIG_")) or key in {"PATH", "PYTHONPATH", "PYTHONHOME", "NODE_OPTIONS", "DH_PROMOTION_EVIDENCE"}))
        expected = self.expected_result("preflight", "ok", "preflight_ok", (("mutable_paths_contained", True), ("profile_directories", 6), ("real_repository_used", False), ("real_appdata_used", False), ("network_used", False)))
        self.assertEqual((result, tuple(path.is_relative_to(self.root) for path in mutable), forbidden_env), (expected, (True,) * len(mutable), ()))


_MUTATIONS = {
    "receipt_allowlist": (
        "if candidate_path not in spec.candidate_paths:\n",
        "if candidate_path not in spec.candidate_paths and candidate_path != '__mutation_allow_extra__':\n",
        "host.test_plan_e_evidence.CommandReceiptTests.test_unknown_duplicate_malformed_or_drifting_receipts_are_rejected",
    ),
    "retirement_prevalidation": (
        "if not _validate_retirement_closure(old_head, new_head, adapters):\n",
        "if _validate_retirement_closure(old_head, new_head, adapters):\n",
        "host.test_plan_e_evidence.RetirementTests.test_retirement_requires_complete_dependency_closed_terminal_state",
    ),
    "candidate_atomicity": (
        "os.link(temporary_path, target_path)\n",
        "os.replace(temporary_path, target_path)\n",
        "host.test_plan_e_evidence.CandidatePublicationTests.test_candidate_publication_uses_no_clobber_hard_link_and_reread",
    ),
    "worktree_head_validation": (
        "if not _validate_owned_worktree_head(owner, adapters):\n",
        "if _validate_owned_worktree_head(owner, adapters):\n",
        "host.test_plan_e_evidence.WorktreeLifecycleTests.test_worktree_head_blob_status_or_registration_mismatch_is_retained",
    ),
    "review_whole_text": (
        "if consumed_bytes != len(review_bytes):\n",
        "if consumed_bytes > len(review_bytes):\n",
        "host.test_plan_e_evidence.ReviewGrammarTests.test_review_text_requires_exact_whole_file_heading_grammar",
    ),
    "host_skip_policy": (
        "if observed_skips != expected_skips:\n",
        "if len(observed_skips) < len(expected_skips):\n",
        "host.test_plan_e_evidence.ResultValidationTests.test_host_results_require_positive_counts_and_exact_skip_policy",
    ),
    "staged_committed_blobs": (
        "if staged_blob_map != committed_blob_map:\n",
        "if staged_blob_map.keys() != committed_blob_map.keys():\n",
        "host.test_plan_e_evidence.FinalizationTests.test_finalizer_compares_every_staged_blob_with_committed_blob",
    ),
}


def _run_mutation(mutation_id: str, root: Path, environment: dict[str, str], ready: bool) -> tuple[object, ...]:
    if not ready:
        return ("not-ready", mutation_id, False, _sha256(_SOURCE_MODULE.read_bytes()), _sha256(_SOURCE_TEST.read_bytes()))
    anchor, replacement, selector = _MUTATIONS[mutation_id]
    replacement_tree = _ast.parse(replacement)
    if any(isinstance(node, _ast.Constant) and node.value is False for node in _ast.walk(replacement_tree)):
        raise RuntimeError(f"unconditional mutation probe rejected: {mutation_id}")
    mini = root / f"mutation-{mutation_id}"
    (mini / "host").mkdir(parents=True)
    source = mini / "plan_e_evidence.py"
    test = mini / "host" / "test_plan_e_evidence.py"
    plan = mini / _SOURCE_PLAN.relative_to(_SOURCE_ROOT)
    plan.parent.mkdir(parents=True)
    shutil.copyfile(_SOURCE_MODULE, source)
    shutil.copyfile(_SOURCE_TEST, test)
    shutil.copyfile(_SOURCE_PLAN, plan)
    for task in (1, 2, 3, 4, 5, 8):
        relative = Path(f".superpowers/sdd/task-{task}-report.md")
        destination = mini / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(_SOURCE_ROOT / relative, destination)
    (mini / "host" / "__init__.py").write_bytes(b"")
    git = shutil.which("git")
    if git is None:
        raise RuntimeError("Git is required for mutation fixture")
    _run_git(git, mini, environment, "init", "-q")
    _run_git(git, mini, environment, "config", "user.name", "Plan E Mutation")
    _run_git(git, mini, environment, "config", "user.email", "mutation@example.invalid")
    _run_git(git, mini, environment, "add", "--", ".")
    _run_git(git, mini, environment, "commit", "-q", "-m", "mutation fixture")
    original_source = source.read_bytes()
    original_test = test.read_bytes()
    source_hash = _sha256(original_source)
    test_hash = _sha256(original_test)
    text = original_source.decode("utf-8")
    count = text.count(anchor)
    if count != 1:
        raise RuntimeError(f"mutation anchor drift: {mutation_id}={count}")
    mutated_output = b""
    try:
        source.write_text(text.replace(anchor, replacement), encoding="utf-8", newline="\n")
        mutated = subprocess.run([sys.executable, "-m", "unittest", selector, "-v"], cwd=mini, env=environment, capture_output=True, shell=False, timeout=180)
        mutated_output = mutated.stdout + mutated.stderr
    finally:
        source.write_bytes(original_source)
    restored = subprocess.run([sys.executable, "-m", "unittest", selector, "-v"], cwd=mini, env=environment, capture_output=True, shell=False, timeout=180)
    restored_output = restored.stdout + restored.stderr
    mutation_caught = mutated.returncode == 1 and b"Ran 1 test" in mutated_output and b"FAILED (failures=1)" in mutated_output and b"ERROR" not in mutated_output and b"skipped" not in mutated_output
    restored_green = restored.returncode == 0 and b"Ran 1 test" in restored_output and b"OK" in restored_output
    bytes_restored = source.read_bytes() == original_source and test.read_bytes() == original_test and _sha256(source.read_bytes()) == source_hash and _sha256(test.read_bytes()) == test_hash
    return ("ready", mutation_id, count, mutation_caught, bytes_restored, restored_green, source_hash, test_hash)


class ExecutorMutationProofTests(_Fixture, unittest.TestCase):
    def setUp(self) -> None:
        super().setUp()
        self.adapters.git_responses.update({"preflight": "valid", "implementation_ready": True})

    def mutation(self, mutation_id: str, ready: bool) -> tuple[tuple[object, ...], tuple[object, ...]]:
        observed = _run_mutation(mutation_id, self.root, self.environment, ready)
        expected = ("not-ready", mutation_id, True, _sha256(_SOURCE_MODULE.read_bytes()), _sha256(_SOURCE_TEST.read_bytes())) if not ready else ("ready", mutation_id, 1, True, True, True, _sha256(_SOURCE_MODULE.read_bytes()), _sha256(_SOURCE_TEST.read_bytes()))
        return observed, expected

    def test_mutation_receipt_allowlist_is_caught(self):
        readiness = _candidate.execute_command(_candidate.parse_cli(("preflight",)), self.adapters)
        observed, expected = self.mutation("receipt_allowlist", readiness == self.expected_result("preflight", "ok", "preflight_ok", (("implementation_ready", True),)))
        observed = (readiness, observed)
        expected = (self.expected_result("preflight", "ok", "preflight_ok", (("implementation_ready", True),)), expected)
        self.assertEqual(observed, expected)

    def test_mutation_retirement_prevalidation_is_caught(self):
        readiness = _candidate.execute_command(_candidate.parse_cli(("preflight",)), self.adapters)
        observed, expected = self.mutation("retirement_prevalidation", readiness == self.expected_result("preflight", "ok", "preflight_ok", (("implementation_ready", True),)))
        observed = (readiness, observed)
        expected = (self.expected_result("preflight", "ok", "preflight_ok", (("implementation_ready", True),)), expected)
        self.assertEqual(observed, expected)

    def test_mutation_candidate_atomicity_is_caught(self):
        readiness = _candidate.execute_command(_candidate.parse_cli(("preflight",)), self.adapters)
        observed, expected = self.mutation("candidate_atomicity", readiness == self.expected_result("preflight", "ok", "preflight_ok", (("implementation_ready", True),)))
        observed = (readiness, observed)
        expected = (self.expected_result("preflight", "ok", "preflight_ok", (("implementation_ready", True),)), expected)
        self.assertEqual(observed, expected)

    def test_mutation_worktree_head_validation_is_caught(self):
        readiness = _candidate.execute_command(_candidate.parse_cli(("preflight",)), self.adapters)
        observed, expected = self.mutation("worktree_head_validation", readiness == self.expected_result("preflight", "ok", "preflight_ok", (("implementation_ready", True),)))
        observed = (readiness, observed)
        expected = (self.expected_result("preflight", "ok", "preflight_ok", (("implementation_ready", True),)), expected)
        self.assertEqual(observed, expected)

    def test_mutation_review_whole_text_coverage_is_caught(self):
        readiness = _candidate.execute_command(_candidate.parse_cli(("preflight",)), self.adapters)
        observed, expected = self.mutation("review_whole_text", readiness == self.expected_result("preflight", "ok", "preflight_ok", (("implementation_ready", True),)))
        observed = (readiness, observed)
        expected = (self.expected_result("preflight", "ok", "preflight_ok", (("implementation_ready", True),)), expected)
        self.assertEqual(observed, expected)

    def test_mutation_host_skip_policy_is_caught(self):
        readiness = _candidate.execute_command(_candidate.parse_cli(("preflight",)), self.adapters)
        observed, expected = self.mutation("host_skip_policy", readiness == self.expected_result("preflight", "ok", "preflight_ok", (("implementation_ready", True),)))
        observed = (readiness, observed)
        expected = (self.expected_result("preflight", "ok", "preflight_ok", (("implementation_ready", True),)), expected)
        self.assertEqual(observed, expected)

    def test_mutation_staged_committed_blob_comparison_is_caught(self):
        readiness = _candidate.execute_command(_candidate.parse_cli(("preflight",)), self.adapters)
        observed, expected = self.mutation("staged_committed_blobs", readiness == self.expected_result("preflight", "ok", "preflight_ok", (("implementation_ready", True),)))
        observed = (readiness, observed)
        expected = (self.expected_result("preflight", "ok", "preflight_ok", (("implementation_ready", True),)), expected)
        self.assertEqual(observed, expected)


def _assert_locked_inventory() -> None:
    discovered = {
        name: tuple(sorted(method for method in dir(value) if method.startswith("test_") and callable(getattr(value, method))))
        for name, value in globals().items()
        if inspect.isclass(value) and issubclass(value, unittest.TestCase) and value is not unittest.TestCase
    }
    expected = {name: tuple(sorted(methods)) for name, methods in _EXPECTED_TEST_METHODS.items()}
    if discovered != expected:
        raise RuntimeError(f"locked Plan E inventory drift: {discovered!r}")
    behavioral = sum(len(methods) for name, methods in discovered.items() if name != "ExecutorMutationProofTests")
    mutations = len(discovered["ExecutorMutationProofTests"])
    if (len(discovered), behavioral, mutations, behavioral + mutations) != (15, 99, 7, 106):
        raise RuntimeError("locked Plan E count drift")


_assert_locked_inventory()
