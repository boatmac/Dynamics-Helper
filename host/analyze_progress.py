"""Bounded, best-effort Analyze progress projection; no SDK imports or raw output."""

from contextlib import contextmanager
import math
import re
import time
from uuid import UUID


MAX_SAFE_INTEGER = (1 << 53) - 1
MAX_ACTIVE_TOOLS = 128
MAX_TOOLS = 1024
MAX_EVENTS = 4096
STAGES = frozenset({
    "prepare", "session_resuming", "session_creating", "session_reused",
    "session_ready", "session_reconnecting", "auth", "agent", "tool",
    "response", "report",
})
STATES = frozenset({"running", "succeeded", "failed", "unavailable", "needs_auth"})
SERVICES = frozenset({
    "workiq", "webiq", "ado", "mslearn", "kusto", "enghub", "icm",
    "research", "filesystem", "other",
})
_TOOL_ALIAS = re.compile(r"tool-[1-9][0-9]*", re.ASCII)


def _field(value, name):
    try:
        return getattr(value, name, None)
    except Exception:
        return None


class AnalyzeProgress:
    """One request's safe wire sink and attempt-scoped SDK event reducer.

    The sink accepts data only; the Host captures the request ID in its envelope.
    Exhaustion drops progress, never model work. No diagnostic logging touches
    SDK objects, raw tool IDs, server names, or sink exceptions.
    """

    def __init__(self, sink, *, clock=time.monotonic, is_owner=lambda: True):
        self._sink = sink
        self._clock = clock
        self._is_owner = is_owner
        self._active = True
        self._seq = 0
        self._emitted = 0
        self._elapsed = 0
        self._started = self._now()
        self._running = set()
        self._attempt = None
        self._unsubscribe = None
        self._tools = {}
        self._seen = set()
        self._tool_count = 0

    def _now(self):
        try:
            value = self._clock()
            if type(value) in (int, float) and math.isfinite(value):
                return value
        except Exception:
            pass
        return None

    def _owned(self):
        try:
            return self._active and self._is_owner() is True
        except Exception:
            return False

    def phase(self, stage, state, *, service=None, tool_id=None, session_id=None):
        """Emit only the closed v1 schema, rejecting non-primitive inputs."""
        if not self._owned() or self._emitted >= MAX_EVENTS or self._seq >= MAX_SAFE_INTEGER:
            return
        if type(stage) is not str or stage not in STAGES:
            return
        if type(state) is not str or state not in STATES:
            return
        if stage == "tool" and (service is None or tool_id is None):
            return
        if service is not None and (type(service) is not str or service not in SERVICES):
            return
        if tool_id is not None and (
            stage != "tool" or type(tool_id) is not str or len(tool_id) > 128
            or _TOOL_ALIAS.fullmatch(tool_id) is None
        ):
            return
        if session_id is not None:
            if stage != "session_ready" or state != "succeeded" or type(session_id) is not str:
                return
            try:
                if str(UUID(session_id)) != session_id:
                    return
            except (ValueError, AttributeError):
                return
        now = self._now()
        if now is not None:
            if self._started is None:
                self._started = now
            try:
                delta = (now - self._started) * 1000
                if math.isfinite(delta):
                    self._elapsed = max(self._elapsed, min(MAX_SAFE_INTEGER, max(0, int(delta))))
            except (OverflowError, ValueError):
                pass
        self._seq += 1
        self._emitted += 1
        data = {
            "version": 1, "seq": self._seq, "stage": stage, "state": state,
            "elapsedMs": self._elapsed,
        }
        if service is not None:
            data["service"] = service
        if tool_id is not None:
            data["toolId"] = tool_id
        if session_id is not None:
            data["sessionId"] = session_id
        if stage != "tool":
            if state == "running":
                self._running.add(stage)
            else:
                self._running.discard(stage)
        try:
            self._sink(data)
        except Exception:
            pass

    def session_ready(self, session):
        session_id = _field(session, "session_id")
        # Only publish the actual SDK-returned canonical UUID, never a requested
        # ID fallback. A valid ready transition does not require an ID.
        if type(session_id) is str:
            try:
                if str(UUID(session_id)) != session_id:
                    session_id = None
            except ValueError:
                session_id = None
        else:
            session_id = None
        self.phase("session_ready", "succeeded", session_id=session_id)

    def fail_running(self):
        for stage in sorted(self._running):
            self.phase(stage, "failed")

    def _detach(self):
        self._attempt = None
        for alias, service in tuple(self._tools.values()):
            self.phase("tool", "unavailable", tool_id=alias, service=service)
        self._tools.clear()
        self._seen.clear()
        unsubscribe, self._unsubscribe = self._unsubscribe, None
        if callable(unsubscribe):
            try:
                unsubscribe()
            except Exception:
                pass

    def deactivate(self):
        self._active = False
        self._detach()
        self._running.clear()

    @contextmanager
    def listen(self, session, *, is_current=lambda: True):
        """Deactivate the attempt before unsubscribe, including failed retries."""
        self._detach()
        token = object()
        self._attempt = token

        def handle(event):
            try:
                if not self._owned() or self._attempt is not token or is_current() is not True:
                    return
                self._reduce(event)
            except Exception:
                # Malformed SDK events and progress-only failures cannot abort
                # dispatch to the SDK's other handlers or fail Analyze.
                pass

        try:
            if self._owned():
                try:
                    unsubscribe = session.on(handle)
                    if self._attempt is token and self._owned():
                        self._unsubscribe = unsubscribe
                    elif callable(unsubscribe):
                        unsubscribe()
                except Exception:
                    self._detach()
            yield
        finally:
            if self._attempt is token:
                self._detach()

    def _reduce(self, event):
        kind = _field(event, "type")
        if type(kind) is not str:
            kind = _field(kind, "value")
        if type(kind) is not str or kind not in {"tool.execution_start", "tool.execution_complete"}:
            return
        data = _field(event, "data")
        raw_id = _field(data, "tool_call_id")
        if type(raw_id) is not str or not raw_id or len(raw_id) > 1024:
            return
        if kind == "tool.execution_start":
            if raw_id in self._seen or len(self._tools) >= MAX_ACTIVE_TOOLS or self._tool_count >= MAX_TOOLS:
                return
            server = _field(data, "mcp_server_name")
            service = "other"
            if type(server) is str and len(server) <= 128:
                key = server.lower()
                service = "icm" if key == "icm-mcp" else key if key in SERVICES else "other"
            self._tool_count += 1
            alias = f"tool-{self._tool_count}"
            self._seen.add(raw_id)
            self._tools[raw_id] = (alias, service)
            self.phase("tool", "running", tool_id=alias, service=service)
        else:
            success = _field(data, "success")
            if type(success) is not bool or raw_id not in self._tools:
                return
            alias, service = self._tools.pop(raw_id)
            self.phase("tool", "succeeded" if success else "failed", tool_id=alias, service=service)
