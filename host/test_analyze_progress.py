"""Offline stdlib-only progress fixtures; no Host or SDK import."""

import json
from types import SimpleNamespace
import unittest
from unittest.mock import Mock

from analyze_progress import (
    AnalyzeProgress, MAX_ACTIVE_TOOLS, MAX_EVENTS, MAX_SAFE_INTEGER, MAX_TOOLS,
)


def event(kind="tool.execution_start", raw_id="private-id", **fields):
    return SimpleNamespace(
        type=SimpleNamespace(value=kind),
        data=SimpleNamespace(tool_call_id=raw_id, **fields),
    )


class Poison:
    def __getattribute__(self, name):
        raise RuntimeError("private getter")

    def __str__(self):
        raise AssertionError("must not stringify")


class AnalyzeProgressTests(unittest.TestCase):
    def setUp(self):
        self.rows = []
        self.progress = AnalyzeProgress(self.rows.append, clock=lambda: 10.0)
        self.unsubscribe = Mock()
        self.session = SimpleNamespace(on=Mock(return_value=self.unsubscribe))

    def handler(self):
        return self.session.on.call_args.args[0]

    def test_exact_safe_projection(self):
        with self.progress.listen(self.session):
            self.handler()(event(
                mcp_server_name="WorkIQ", tool_name="secret-tool",
                arguments=Poison(), result=Poison(), intent=Poison(),
                description="private-description", url="https://private.test",
            ))
            self.handler()(event("tool.execution_complete", success=True, result=Poison()))
        self.assertEqual(self.rows, [
            {"version": 1, "seq": 1, "stage": "tool", "state": "running",
             "elapsedMs": 0, "service": "workiq", "toolId": "tool-1"},
            {"version": 1, "seq": 2, "stage": "tool", "state": "succeeded",
             "elapsedMs": 0, "service": "workiq", "toolId": "tool-1"},
        ])
        self.assertNotIn("private", json.dumps(self.rows))
        self.assertNotIn("secret", json.dumps(self.rows))

    def test_exact_service_allowlist(self):
        with self.progress.listen(self.session):
            for index, (raw, expected) in enumerate([
                ("ICM-MCP", "icm"), ("WebIQ", "webiq"), ("ado", "ado"),
                ("mslearn", "mslearn"), ("kusto", "kusto"), ("enghub", "enghub"),
                ("research", "research"), ("filesystem", "filesystem"),
                ("other", "other"), ("workiq-extra", "other"),
                (" webiq", "other"), ("https://workiq", "other"),
                (Poison(), "other"), (None, "other"),
            ]):
                self.handler()(event(raw_id=f"id-{index}", mcp_server_name=raw))
                self.assertEqual(self.rows[-1]["service"], expected)

    def test_parallel_starts_complete_out_of_order(self):
        with self.progress.listen(self.session):
            handle = self.handler()
            handle(event(raw_id="a", mcp_server_name="webiq"))
            handle(event(raw_id="b", mcp_server_name="kusto"))
            handle(event("tool.execution_complete", "b", success=False))
            handle(event("tool.execution_complete", "a", success=True))
        self.assertEqual([row["toolId"] for row in self.rows], ["tool-1", "tool-2", "tool-2", "tool-1"])
        self.assertEqual([row["state"] for row in self.rows], ["running", "running", "failed", "succeeded"])

    def test_unknown_completion_and_duplicates_ignored(self):
        with self.progress.listen(self.session):
            handle = self.handler()
            handle(event("tool.execution_complete", success=True))
            self.assertEqual(self.rows, [])
            handle(event())
            handle(event())
            handle(event("tool.execution_complete", success=True))
            handle(event("tool.execution_complete", success=False))
            handle(event())
        self.assertEqual(len(self.rows), 2)

    def test_completion_requires_exact_boolean(self):
        with self.progress.listen(self.session):
            handle = self.handler()
            handle(event())
            for value in (None, 0, 1, "true", [], Poison()):
                handle(event("tool.execution_complete", success=value))
            self.assertEqual(len(self.rows), 1)
            handle(event("tool.execution_complete", success=False))
        self.assertEqual(self.rows[-1]["state"], "failed")

    def test_high_frequency_and_unknown_events_do_not_read_data(self):
        reads = Mock()

        class Ignored:
            type = "tool.execution_progress"

            @property
            def data(self):
                reads()
                raise AssertionError("ignored events must not read data")

        with self.progress.listen(self.session):
            for _ in range(100):
                self.handler()(Ignored())
            self.handler()(event("assistant.message", content=Poison()))
            self.handler()(event("tool.execution_partial_result", result=Poison()))
        reads.assert_not_called()
        self.assertEqual(self.rows, [])

    def test_invalid_event_fields_and_throwing_getters(self):
        class StrSubclass(str):
            pass

        with self.progress.listen(self.session):
            handle = self.handler()
            for value in (None, Poison(), {}, SimpleNamespace(type=Poison()),
                          SimpleNamespace(type="tool.execution_start", data=Poison())):
                handle(value)
            for raw in (None, True, 7, [], {}, Poison(), "", "x" * 1025, StrSubclass("id")):
                handle(event(raw_id=raw))
        self.assertEqual(self.rows, [])

    def test_plain_string_event_type(self):
        with self.progress.listen(self.session):
            value = event()
            value.type = "tool.execution_start"
            self.handler()(value)
        self.assertEqual(self.rows[0]["state"], "running")

    def test_attempt_detach_ignores_late_handlers_and_reuses_raw_ids(self):
        with self.progress.listen(self.session):
            old = self.handler()
            old(event())
        self.assertEqual(self.rows[-1]["state"], "unavailable")
        with self.progress.listen(self.session):
            before = len(self.rows)
            old(event("tool.execution_complete", success=True))
            self.assertEqual(len(self.rows), before)
            self.handler()(event())
            self.assertEqual(self.rows[-1]["toolId"], "tool-2")
        self.assertEqual(self.unsubscribe.call_count, 2)

    def test_exception_unsubscribes_before_retry(self):
        with self.assertRaisesRegex(RuntimeError, "send failed"):
            with self.progress.listen(self.session):
                old = self.handler()
                raise RuntimeError("send failed")
        self.unsubscribe.assert_called_once_with()
        old(event())
        self.assertEqual(self.rows, [])

    def test_request_and_actual_session_ownership(self):
        owner = [True]
        actual = [True]
        progress = AnalyzeProgress(self.rows.append, is_owner=lambda: owner[0])
        with progress.listen(self.session, is_current=lambda: actual[0]):
            handle = self.handler()
            actual[0] = False
            handle(event())
            actual[0] = True
            owner[0] = False
            handle(event())
            progress.phase("report", "succeeded")
        self.assertEqual(self.rows, [])

    def test_new_request_restarts_sequence_and_aliases(self):
        with self.progress.listen(self.session):
            old = self.handler()
            old(event())
            self.progress.deactivate()
        new_rows = []
        new = AnalyzeProgress(new_rows.append)
        with new.listen(self.session):
            before = len(self.rows)
            old(event("tool.execution_complete", success=True))
            self.assertEqual(len(self.rows), before)
            self.handler()(event())
            self.assertEqual(new_rows[0]["seq"], 1)
            self.assertEqual(new_rows[0]["toolId"], "tool-1")

    def test_deactivated_listener_and_phase_are_inert(self):
        with self.progress.listen(self.session):
            handle = self.handler()
            self.progress.deactivate()
            handle(event())
            self.progress.phase("report", "succeeded")
            self.progress.deactivate()
        self.unsubscribe.assert_called_once_with()
        self.assertEqual(self.rows, [])

    def test_unsubscribe_reentrant_events_are_inert(self):
        self.unsubscribe.side_effect = lambda: self.handler()(event())
        with self.progress.listen(self.session):
            pass
        self.assertEqual(self.rows, [])

    def test_subscription_sink_and_cleanup_failures_are_best_effort(self):
        progress = AnalyzeProgress(Mock(side_effect=RuntimeError("private sink")))
        self.session.on.side_effect = RuntimeError("private subscription")
        with progress.listen(self.session):
            progress.phase("agent", "running")
        self.session.on.side_effect = None
        self.unsubscribe.side_effect = RuntimeError("private cleanup")
        with progress.listen(self.session):
            self.handler()(event())
        progress.deactivate()

    def test_deactivation_during_subscription_unsubscribes(self):
        def subscribe(handle):
            self.progress.deactivate()
            return self.unsubscribe

        self.session.on.side_effect = subscribe
        with self.progress.listen(self.session):
            pass
        self.unsubscribe.assert_called_once_with()

    def test_throwing_ownership_is_inert(self):
        progress = AnalyzeProgress(self.rows.append, is_owner=Mock(side_effect=RuntimeError()))
        progress.phase("agent", "running")
        with progress.listen(self.session):
            pass
        self.session.on.assert_not_called()
        self.assertEqual(self.rows, [])

    def test_schema_rejects_invalid_primitives_and_aliases(self):
        for stage, state in ((Poison(), "running"), ("agent", Poison()),
                             ("unknown", "running"), ("agent", "unknown")):
            self.progress.phase(stage, state)
        for alias in ("tool-0", "tool-01", "tool--1", "tool-1\n", "tool-1/raw", "tool-" + "1" * 124, Poison()):
            self.progress.phase("tool", "running", service="other", tool_id=alias)
        self.progress.phase("agent", "running", tool_id="tool-1")
        self.progress.phase("tool", "running", service=Poison(), tool_id="tool-1")
        self.progress.phase("tool", "running", service="WorkIQ", tool_id="tool-1")
        self.progress.phase("tool", "running")
        self.progress.phase("tool", "running", service="other")
        self.progress.phase("tool", "running", tool_id="tool-1")
        self.assertEqual(self.rows, [])
        self.assertEqual(self.progress._seq, 0)
        self.progress.phase("tool", "running", service="other", tool_id="tool-1")
        self.assertEqual(len(self.rows), 1)
        self.assertEqual(self.rows[0]["seq"], 1)

    def test_session_id_is_canonical_and_ready_success_only(self):
        canonical = "816bee4e-8eee-4c0b-ae69-70879d032f4d"
        for value in (canonical.upper(), canonical.replace("-", ""), "{" + canonical + "}", "bad", Poison()):
            self.progress.phase("session_ready", "succeeded", session_id=value)
        self.progress.phase("session_ready", "running", session_id=canonical)
        self.progress.phase("agent", "succeeded", session_id=canonical)
        self.assertEqual(self.rows, [])
        self.progress.session_ready(SimpleNamespace(session_id=canonical))
        self.assertEqual(self.rows[-1]["sessionId"], canonical)
        for session in (Poison(), SimpleNamespace(session_id="bad"), SimpleNamespace()):
            self.progress.session_ready(session)
            self.assertNotIn("sessionId", self.rows[-1])

    def test_monotonic_elapsed_with_invalid_and_throwing_clocks(self):
        clock = Mock(side_effect=[10.0, 10.25, 9.0, float("nan"), float("inf"),
                                  True, Poison(), RuntimeError(), 11.0])
        progress = AnalyzeProgress(self.rows.append, clock=clock)
        for _ in range(8):
            progress.phase("agent", "running")
        self.assertEqual([row["elapsedMs"] for row in self.rows], [250] * 7 + [1000])
        self.assertEqual([row["seq"] for row in self.rows], list(range(1, 9)))

    def test_initial_invalid_clock_and_extreme_elapsed(self):
        progress = AnalyzeProgress(self.rows.append, clock=Mock(side_effect=[None, 0, 10 ** 100, 10 ** 1000]))
        for _ in range(3):
            progress.phase("agent", "running")
        self.assertEqual([row["elapsedMs"] for row in self.rows], [0, MAX_SAFE_INTEGER, MAX_SAFE_INTEGER])

    def test_sequence_and_event_budget(self):
        self.progress._seq = MAX_SAFE_INTEGER - 1
        self.progress.phase("agent", "running")
        self.progress.phase("agent", "succeeded")
        self.assertEqual(len(self.rows), 1)
        self.assertEqual(self.rows[0]["seq"], MAX_SAFE_INTEGER)
        progress = AnalyzeProgress(self.rows.append)
        for _ in range(MAX_EVENTS + 1):
            progress.phase("agent", "running")
        self.assertEqual(len(self.rows), MAX_EVENTS + 1)

    def test_active_tool_bound(self):
        with self.progress.listen(self.session):
            handle = self.handler()
            for index in range(MAX_ACTIVE_TOOLS + 1):
                handle(event(raw_id=f"id-{index}"))
            self.assertEqual(len(self.progress._tools), MAX_ACTIVE_TOOLS)
            self.assertEqual(len(self.rows), MAX_ACTIVE_TOOLS)
            handle(event("tool.execution_complete", "id-0", success=True))
            handle(event(raw_id="new"))
            self.assertEqual(self.rows[-1]["toolId"], "tool-129")

    def test_request_tool_history_bound(self):
        with self.progress.listen(self.session):
            handle = self.handler()
            for index in range(MAX_TOOLS + 1):
                raw_id = f"id-{index}"
                handle(event(raw_id=raw_id))
                handle(event("tool.execution_complete", raw_id, success=True))
            self.assertEqual(len(self.progress._seen), MAX_TOOLS)
            self.assertEqual(len(self.rows), MAX_TOOLS * 2)
        self.assertEqual(self.progress._seen, set())

    def test_failure_only_marks_running_phases(self):
        self.progress.phase("prepare", "running")
        self.progress.phase("prepare", "succeeded")
        self.progress.phase("report", "running")
        self.progress.fail_running()
        self.progress.fail_running()
        self.assertEqual([(row["stage"], row["state"]) for row in self.rows], [
            ("prepare", "running"), ("prepare", "succeeded"),
            ("report", "running"), ("report", "failed"),
        ])
