import json
from pathlib import Path


_REPOSITORY_ROOT = Path(__file__).resolve().parent.parent


def current_extension_manifest_bytes() -> bytes:
    manifest = json.loads(
        (_REPOSITORY_ROOT / "extension" / "manifest.json").read_text(
            encoding="utf-8"
        )
    )
    projected = {"version": manifest["version"]}
    if "version_name" in manifest:
        projected["version_name"] = manifest["version_name"]
    return (
        json.dumps(projected, ensure_ascii=True, separators=(",", ":")) + "\n"
    ).encode("ascii")


class InjectedCrash(BaseException):
    pass


class InjectedFault(RuntimeError):
    pass


class FakeMutationMutex:
    def __init__(self):
        self.held = False
        self.acquire_count = 0
        self.release_count = 0

    def acquire(self):
        if self.held:
            raise AssertionError("already held")
        self.held = True
        self.acquire_count += 1

    def release(self):
        if self.held:
            self.held = False
            self.release_count += 1

    def __enter__(self):
        self.acquire()
        return self

    def __exit__(self, exc_type, exc, traceback):
        self.release()


class RecordingHooks:
    def __init__(self, mutex):
        self.mutex = mutex
        self.events = []
        self.waited_processes = []

    def before_live_phase(self, phase, paths, plan):
        assert self.mutex.held
        self.events.append(("phase", phase.value))

    def wait_for_initiating_host_exit(self, identity):
        assert self.mutex.held
        self.waited_processes.append(identity)

    def probe_installed_product(self, path, plan):
        assert self.mutex.held
        self.events.append(("probe", str(path)))

    def before_filesystem_operation(self, label):
        assert self.mutex.held
        self.events.append(("before", label))

    def after_filesystem_operation(self, label):
        assert self.mutex.held
        self.events.append(("after", label))

    def after_journal_transition(self, phase):
        assert self.mutex.held
        self.events.append(("transition", phase.value))


class FaultController:
    def __init__(self, recording):
        self.recording = recording
        self._rules = []

    def arm(self, kind, target, exception_type, *, occurrence=1):
        self._rules = []
        self.add(kind, target, exception_type, occurrence=occurrence)

    def add(self, kind, target, exception_type, *, occurrence=1):
        self._rules.append(
            {
                "kind": kind,
                "target": target,
                "occurrence": occurrence,
                "exception_type": exception_type,
                "seen": 0,
            }
        )

    def clear(self):
        self._rules = []

    def _maybe_raise(self, kind, target):
        for rule in self._rules:
            if rule["kind"] != kind or rule["target"] != target:
                continue
            rule["seen"] += 1
            if rule["seen"] == rule["occurrence"]:
                raise rule["exception_type"](target)

    def before_live_phase(self, phase, paths, plan):
        self.recording.before_live_phase(phase, paths, plan)

    def wait_for_initiating_host_exit(self, identity):
        self.recording.wait_for_initiating_host_exit(identity)

    def probe_installed_product(self, path, plan):
        self.recording.probe_installed_product(path, plan)

    def before_filesystem_operation(self, label):
        self.recording.before_filesystem_operation(label)
        self._maybe_raise("before", label)

    def after_filesystem_operation(self, label):
        self.recording.after_filesystem_operation(label)
        self._maybe_raise("after", label)

    def after_journal_transition(self, phase):
        self.recording.after_journal_transition(phase)
        self._maybe_raise("transition", phase.value)
