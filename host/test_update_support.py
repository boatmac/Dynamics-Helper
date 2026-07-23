from pathlib import Path


class InjectedCrash(BaseException):
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
