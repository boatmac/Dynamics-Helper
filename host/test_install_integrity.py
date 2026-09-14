import json
import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from install_integrity import (
    InstallationVerification,
    InstallationVerifier,
    UpdateProbeResult,
    run_update_probe,
)
from package_manifest import (
    InstalledProduct,
    canonical_json_bytes,
    generate_release_documents,
    installed_product_to_dict,
    load_installed_product,
    load_release_integrity,
    release_integrity_to_dict,
    sha256_bytes,
    write_release_documents,
)
from product_info import VERSION
from test_update_support import current_extension_manifest_bytes
from scripts.test_profile_state import PROFILE_KEYS, capture_profile_state, validate_profile_state


class InstallationVerifierTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def _make_live(self) -> Path:
        stage = self.root / next(tempfile._get_candidate_names())
        files = {
            "host/dh_native_host.exe": b"host-exe",
            "host/_internal/python313.dll": b"runtime",
            "host/system_prompt.md": b"core",
            "host/register.py": b"register",
            "host/config.json": b"{}\n",
            "extension/manifest.json": current_extension_manifest_bytes(),
            "extension/assets/app.js": b"app",
            "installer_core.ps1": b"installer",
            "install.bat": b"wrapper",
        }
        for relative, payload in files.items():
            path = stage.joinpath(*relative.split("/"))
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(payload)
        documents = generate_release_documents(stage, VERSION)
        write_release_documents(stage, documents)
        live = self.root / next(tempfile._get_candidate_names())
        shutil.copytree(stage / "host", live)
        shutil.copytree(stage / "extension", live / "extension")
        return live

    def test_source_host_reports_development_without_metadata(self):
        live = self.root / "development"
        live.mkdir()
        result = InstallationVerifier(live, frozen=False).verify()
        self.assertEqual(
            result,
            InstallationVerification(
                mode="development",
                integrity="development",
                host_version=VERSION,
            ),
        )

    def test_frozen_complete_product_is_verified(self):
        live = self._make_live()
        result = InstallationVerifier(live, frozen=True).verify()
        self.assertEqual(
            result,
            InstallationVerification(
                mode="packaged",
                integrity="verified",
                host_version=VERSION,
                extension_version=VERSION,
            ),
        )

    def test_frozen_failure_table(self):
        cases = (
            ("missing-integrity", lambda live: (live / "release-integrity.json").unlink()),
            ("missing-installed", lambda live: (live / "installed-product.json").unlink()),
            ("bad-link", lambda live: (live / "release-integrity.json").write_bytes(b"{}\n")),
            ("missing-host", lambda live: (live / "system_prompt.md").unlink()),
            ("changed-host", lambda live: (live / "system_prompt.md").write_bytes(b"changed")),
            ("extra-internal", lambda live: (live / "_internal/extra.dll").write_bytes(b"extra")),
            ("missing-extension", lambda live: (live / "extension/assets/app.js").unlink()),
            ("extra-extension", lambda live: (live / "extension/extra.js").write_bytes(b"extra")),
            ("extension-version", lambda live: (live / "extension/manifest.json").write_text('{"version":"9.9.9"}\n', encoding="utf-8")),
        )
        expected = InstallationVerification(
            mode="packaged",
            integrity="failed",
            error_code="installation_integrity_failed",
        )
        for name, mutate in cases:
            live = self._make_live()
            mutate(live)
            with self.subTest(name=name):
                self.assertEqual(InstallationVerifier(live, frozen=True).verify(), expected)

    def test_metadata_capability_or_version_mismatch_fails(self):
        for field, value in (
            ("package_version", "9.9.9"),
            ("provided_capabilities", ("transactional-update-v1",)),
        ):
            live = self._make_live()
            installed = load_installed_product(live / "installed-product.json")
            changed = InstalledProduct(
                schema_version=installed.schema_version,
                package_version=(value if field == "package_version" else installed.package_version),
                required_capabilities=installed.required_capabilities,
                provided_capabilities=(value if field == "provided_capabilities" else installed.provided_capabilities),
                ownership_schema_version=installed.ownership_schema_version,
                legacy_allowlist_version=installed.legacy_allowlist_version,
                release_integrity_sha256=installed.release_integrity_sha256,
            )
            (live / "installed-product.json").write_bytes(
                canonical_json_bytes(installed_product_to_dict(changed))
            )
            with self.subTest(field=field):
                self.assertEqual(
                    InstallationVerifier(live, frozen=True).verify().integrity,
                    "failed",
                )

    def test_result_is_cached_per_instance(self):
        live = self._make_live()
        verifier = InstallationVerifier(live, frozen=True)
        first = verifier.verify()
        (live / "system_prompt.md").write_bytes(b"changed")
        self.assertIs(verifier.verify(), first)
        self.assertEqual(
            InstallationVerifier(live, frozen=True).verify().integrity,
            "failed",
        )

    def test_unexpected_verifier_exception_fails_closed(self):
        live = self._make_live()
        verifier = InstallationVerifier(live, frozen=True)
        with patch.object(
            verifier,
            "_verify_packaged",
            side_effect=RuntimeError("SECRET-VERIFIER"),
        ):
            result = verifier.verify()
        self.assertEqual(result.integrity, "failed")
        self.assertEqual(result.error_code, "installation_integrity_failed")
        self.assertNotIn("SECRET-VERIFIER", repr(result))


class UpdateProbeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        stage = self.root / "stage"
        files = {
            "host/dh_native_host.exe": b"host-exe",
            "host/_internal/python313.dll": b"runtime",
            "host/system_prompt.md": b"core",
            "host/register.py": b"register",
            "host/config.json": b"{}\n",
            "extension/manifest.json": current_extension_manifest_bytes(),
            "extension/assets/app.js": b"app",
            "installer_core.ps1": b"installer",
            "install.bat": b"wrapper",
        }
        for relative, payload in files.items():
            path = stage.joinpath(*relative.split("/"))
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(payload)
        documents = generate_release_documents(stage, VERSION)
        write_release_documents(stage, documents)
        self.manifest = self.root / "external" / "update-manifest.json"
        self.manifest.parent.mkdir()
        shutil.copy2(stage / "update-manifest.json", self.manifest)
        self.live = self.root / "live"
        shutil.copytree(stage / "host", self.live)
        shutil.copytree(stage / "extension", self.live / "extension")

    def _make_live(self) -> Path:
        live = self.root / next(tempfile._get_candidate_names())
        stage = self.root / "stage"
        shutil.copytree(stage / "host", live)
        shutil.copytree(stage / "extension", live / "extension")
        return live

    def test_valid_probe_returns_only_allowlisted_success(self):
        self.assertEqual(
            run_update_probe(self.manifest, install_root=self.live),
            UpdateProbeResult(
                status="success",
                host_version=VERSION,
                extension_version=VERSION,
                capabilities=("prompt-scope-v1", "transactional-update-v1"),
            ),
        )

    def test_probe_failure_table(self):
        failures = (
            ("host-file", lambda: (self.live / "system_prompt.md").write_bytes(b"changed")),
            ("core-missing", lambda: (self.live / "system_prompt.md").unlink()),
            ("extension-version", lambda: (self.live / "extension/manifest.json").write_text('{"version":"9.9.9"}\n', encoding="utf-8")),
            ("manifest-malformed", lambda: self.manifest.write_bytes(b"{}\n")),
        )
        expected = UpdateProbeResult(
            status="error",
            error_code="package_probe_failed",
        )
        for name, mutate in failures:
            with self.subTest(name=name):
                self.tearDown_probe_state()
                mutate()
                self.assertEqual(
                    run_update_probe(self.manifest, install_root=self.live),
                    expected,
                )

    def tearDown_probe_state(self):
        # Rebuild from the fixture bytes so each mutation is independent.
        if self.live.exists():
            shutil.rmtree(self.live)
        stage = self.root / "stage"
        shutil.copytree(stage / "host", self.live)
        shutil.copytree(stage / "extension", self.live / "extension")
        shutil.copy2(stage / "update-manifest.json", self.manifest)

    def test_manifest_parent_is_not_used_as_install_root(self):
        self.assertNotEqual(self.manifest.parent, self.live)
        self.assertEqual(
            run_update_probe(self.manifest, install_root=self.live).status,
            "success",
        )

    def test_unexpected_probe_exception_returns_fixed_failure(self):
        with patch(
            "install_integrity.load_update_manifest",
            side_effect=RuntimeError("SECRET-PROBE"),
        ):
            result = run_update_probe(self.manifest, install_root=self.live)
        self.assertEqual(
            result,
            UpdateProbeResult(status="error", error_code="package_probe_failed"),
        )
        self.assertNotIn("SECRET-PROBE", repr(result))

    def test_relinked_integrity_with_reserved_host_path_fails(self):
        live = self._make_live()
        integrity = load_release_integrity(live / "release-integrity.json")
        config = live / "config.json"
        changed_integrity = type(integrity)(
            schema_version=integrity.schema_version,
            package_version=integrity.package_version,
            required_capabilities=integrity.required_capabilities,
            provided_capabilities=integrity.provided_capabilities,
            chrome_version=integrity.chrome_version,
            chrome_version_name=integrity.chrome_version_name,
            host_files=tuple(sorted((*integrity.host_files, type(integrity.host_files[0])(
                path="config.json",
                sha256=sha256_bytes(config.read_bytes()),
            )))),
            extension_files=integrity.extension_files,
        )
        integrity_bytes = canonical_json_bytes(
            release_integrity_to_dict(changed_integrity)
        )
        (live / "release-integrity.json").write_bytes(integrity_bytes)
        installed = load_installed_product(live / "installed-product.json")
        relinked = type(installed)(
            schema_version=installed.schema_version,
            package_version=installed.package_version,
            required_capabilities=installed.required_capabilities,
            provided_capabilities=installed.provided_capabilities,
            ownership_schema_version=installed.ownership_schema_version,
            legacy_allowlist_version=installed.legacy_allowlist_version,
            release_integrity_sha256=sha256_bytes(integrity_bytes),
        )
        (live / "installed-product.json").write_bytes(
            canonical_json_bytes(installed_product_to_dict(relinked))
        )
        self.assertEqual(
            InstallationVerifier(live, frozen=True).verify().integrity,
            "failed",
        )


class InstallerSafetyTests(unittest.TestCase):
    repo = Path(__file__).resolve().parents[1]
    scenarios = frozenset((
        "running", "roaming", "preflight-throw", "preflight-nonzero",
        "live-throw", "live-nonzero", "settle-throw", "settle-nonzero",
        "register-throw", "register-nonzero", "register-generic-throw",
        "missing-exe", "missing-package", "copy-throw", "success",
    ))

    def _run_installer(self, scenario):
        # Gate only behavior invocation, never static discovery or source checks.
        if os.environ.get("DH_TEST_ALLOW_POWERSHELL_HARNESS") != "1":
            self.skipTest("PowerShell harness requires explicit DH_TEST_ALLOW_POWERSHELL_HARNESS=1")
        if os.name != "nt":
            self.skipTest("Windows PowerShell 5.1 required")
        self.assertIn(scenario, self.scenarios)
        system_root = Path(os.environ["SystemRoot"])
        self.assertTrue(system_root.is_absolute())
        self.assertEqual(system_root.resolve(), system_root)
        executable = system_root / "System32/WindowsPowerShell/v1.0/powershell.exe"
        self.assertTrue(executable.is_file())
        self.assertEqual(executable.resolve(), executable)
        harness = self.repo / "tests/harnesses/installer_safety.ps1"
        self.assertTrue(harness.is_file())
        self.assertEqual(harness.resolve(), harness)
        parent = Path(os.environ["TEMP"])
        self.assertTrue(parent.is_absolute() and parent.is_dir())
        parent = parent.resolve()
        temp = Path(tempfile.mkdtemp(prefix="dh-installer-harness-", dir=parent))
        sentinel = temp / "owner.txt"
        sentinel.write_text(temp.name, encoding="ascii")
        # Even passing tests can trigger a later security alert. Retain evidence;
        # deletion is a separate reviewed operation, not unittest cleanup.
        env = {"SystemRoot": str(system_root), "WINDIR": str(system_root)}
        for name in PROFILE_KEYS:
            directory = temp / name
            directory.mkdir()
            env[name] = str(directory)
        self.assertTrue(all(not entries for entries in capture_profile_state(temp).values()))
        # Finite checked-in scenarios emit finite event lists, not arbitrary user
        # output. capture_output is not a general memory cap; timeout is 20 seconds.
        try:
            result = subprocess.run(
                [str(executable), "-NoLogo", "-NoProfile", "-NonInteractive",
                 "-File", str(harness), "-Scenario", scenario],
                cwd=temp, env=env, shell=False, capture_output=True, text=True, timeout=20,
            )
        except subprocess.TimeoutExpired as error:
            # TimeoutExpired can carry bytes even with text=True. Preserve them
            # without logging the exception's command or claiming scenario success.
            for name, value in (("stdout.partial", error.stdout), ("stderr.partial", error.stderr)):
                data = value if isinstance(value, bytes) else (value or "").encode("utf-8")
                (temp / name).write_bytes(data)
            (temp / "timeout.json").write_text(
                json.dumps({"scenario": scenario, "timeout_seconds": 20}), encoding="utf-8"
            )
            self.fail(f"Plain PowerShell harness timed out; evidence retained: {temp}")
        (temp / "stdout.json").write_text(result.stdout, encoding="utf-8")
        (temp / "stderr.txt").write_text(result.stderr, encoding="utf-8")
        self.assertEqual(result.stderr, "", f"Harness stderr; evidence: {temp}")
        self.assertTrue("SECRET-ERROR" not in result.stdout, f"Native output leaked; evidence: {temp}")
        validate_profile_state(capture_profile_state(temp))
        report = json.loads(result.stdout)
        self.assertEqual(set(report), {"exitCode", "isUpdate", "events"})
        self.assertEqual(report["exitCode"], result.returncode)
        self.assertIsInstance(report["events"], list)
        self.assertTrue(all(event["kind"] in {
            "test-path", "running-host", "create-directory", "copy", "enumerate",
            "remove-tree", "invoke-host", "emit", "prompt",
        } and isinstance(event["phase"], str) for event in report["events"]))
        self.assertEqual(report["events"][-1], {
            "kind": "prompt", "phase": "finish", "message": "Press Enter to exit",
        })
        return report["exitCode"], report["events"]

    def test_no_protection_bypass_or_unsafe_advice(self):
        source = (self.repo / "installer_core.ps1").read_text(encoding="utf-8").lower()
        for forbidden in ("unblock-file", "stop-process", "add-mppreference", "set-mppreference",
                          "set-executionpolicy", "false positive", "whitelist", "exclusion",
                          "restore the blocked", "'allow'"):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, source)

    def test_batch_preserves_policy_and_exit_status(self):
        source = (self.repo / "install.bat").read_text(encoding="utf-8").lower()
        self.assertNotIn("-executionpolicy", source)
        self.assertIn('set "installerexitcode=%errorlevel%"', source)
        self.assertIn('exit /b %installerexitcode%', source)
        self.assertLess(source.index('set "installerexitcode='), source.index('pause'))

    def test_checked_in_harness_and_definitions_only_dependency_boundary(self):
        source = (self.repo / "installer_core.ps1").read_text(encoding="utf-8")
        harness = (self.repo / "tests/harnesses/installer_safety.ps1").read_text(encoding="utf-8")
        guard = "if ($MyInvocation.InvocationName -eq '.') { return }"
        definitions, main = source.split(guard)
        self.assertEqual(definitions.count("function "), 2)
        self.assertIn("$DefaultOps = New-InstallerOperations", main)
        self.assertIn("exit $Result.ExitCode", main)
        workflow = definitions.split("function Invoke-InstallerWorkflow {", 1)[1]
        self.assertNotIn("New-InstallerOperations", workflow)
        self.assertIn("[Parameter(Mandatory = $true)][hashtable]$Ops", workflow)
        required = "'TestPath', 'RunningHost', 'CreateDirectory', 'CopyFiles',\n        'Enumerate', 'RemoveTree', 'InvokeHost', 'Emit', 'Prompt'"
        self.assertIn(required, workflow)
        self.assertIn("$Ops.Count -ne $RequiredOps.Count", workflow)
        self.assertIn("-not $Ops.ContainsKey($Name) -or $Ops[$Name] -isnot [scriptblock]", workflow)
        self.assertLess(workflow.index("throw 'Invalid installer operations.'"), workflow.index("& $Ops.Emit"))
        self.assertIn(". (Join-Path -Path $PSScriptRoot -ChildPath '../../installer_core.ps1')", harness)
        self.assertNotIn("New-InstallerOperations", harness)
        self.assertIn("'missing', 'not-scriptblock', 'extra'", harness)
        self.assertIn("$Events.Count -ne 0", harness)
        for scenario in self.scenarios:
            self.assertIn("'" + scenario + "'", harness.split("[string]$Scenario", 1)[0])
        for forbidden in ("invoke-expression", "scriptblock]::create", "frombase64", "gzip", "parseinput"):
            self.assertNotIn(forbidden, (source + harness).lower())
        for forbidden in ("new-item", "copy-item", "remove-item", "get-process", "start-process", "read-host", "$env:"):
            self.assertNotIn(forbidden, harness.lower())

    def test_running_host_denies_before_any_mutation(self):
        code, events = self._run_installer("running")
        self.assertEqual(code, 1)
        self.assertEqual([event["kind"] for event in events], ["emit", "running-host", "emit", "prompt"])
        self.assertIn("dh_native_host is running", events[-2]["message"])

    def test_roaming_denies_before_any_mutation(self):
        code, events = self._run_installer("roaming")
        self.assertEqual(code, 1)
        self.assertEqual([event["kind"] for event in events], ["emit", "running-host", "test-path", "emit", "prompt"])
        self.assertIn("Roaming", events[-2]["message"])
        self.assertIn("preserved", events[-2]["message"])

    def _assert_safe_failure(self, scenario):
        code, events = self._run_installer(scenario)
        self.assertEqual(code, 1)
        self.assertFalse(any(event["phase"] == "success" for event in events))
        self.assertEqual(events[-2]["kind"], "emit")
        self.assertEqual(events[-2]["phase"], "error")
        self.assertTrue(events[-2]["message"].startswith("Installation failed."))
        self.assertIn("Keep security protections unchanged", events[-2]["message"])
        return events

    def test_preflight_failures_clean_only_owned_root_before_live_writes(self):
        for scenario in ("preflight-throw", "preflight-nonzero", "missing-package", "copy-throw"):
            with self.subTest(scenario=scenario):
                events = self._assert_safe_failure(scenario)
                effects = [event for event in events if event["kind"] in {
                    "create-directory", "copy", "remove-tree", "invoke-host",
                }]
                self.assertTrue(all(event["phase"] in {"preflight", "preflight-cleanup"} for event in effects))
                if scenario == "missing-package":
                    self.assertEqual(effects, [])
                else:
                    root = effects[0]["path"]
                    self.assertTrue(root.startswith("C:\\synthetic\\temp\\DynamicsHelper-preflight-"))
                    self.assertEqual([event for event in effects if event["kind"] == "remove-tree"], [
                        {"kind": "remove-tree", "phase": "preflight-cleanup", "path": root},
                    ])
                    self.assertEqual(effects[-1]["kind"], "remove-tree")

    def test_native_failures_exit_one_without_success_or_security_changes(self):
        for scenario in ("live-throw", "live-nonzero", "settle-throw", "settle-nonzero"):
            with self.subTest(scenario=scenario):
                events = self._assert_safe_failure(scenario)
                phases = [event["phase"] for event in events if event["kind"] == "invoke-host"]
                self.assertEqual(phases, ["preflight", "live"] + (["settle"] if scenario.startswith("settle-") else []))

    def test_registration_failures_never_report_success(self):
        for scenario in ("register-throw", "register-nonzero", "register-generic-throw", "missing-exe"):
            with self.subTest(scenario=scenario):
                events = self._assert_safe_failure(scenario)
                phases = [event["phase"] for event in events if event["kind"] == "invoke-host"]
                self.assertEqual(phases, ["preflight", "live", "settle"] + ([] if scenario == "missing-exe" else ["register"]))
                self.assertFalse(any(event.get("message") == "    - Registration successful." for event in events))

    def test_success_preserves_probe_settlement_registration_and_config_skip(self):
        code, events = self._run_installer("success")
        self.assertEqual(code, 0)
        native = [event for event in events if event["kind"] == "invoke-host"]
        self.assertEqual([event["phase"] for event in native], ["preflight", "live", "settle", "register"])
        package = "C:\\synthetic\\package"
        live = "C:\\synthetic\\local\\DynamicsHelper"
        self.assertEqual([event["arguments"] for event in native], [
            ["--update-probe", package + "\\update-manifest.json", package],
            ["--update-probe", package + "\\update-manifest.json"],
            ["--settle-installer-repair"], ["--register"],
        ])
        self.assertTrue(all(event["executable"] == live + "\\dh_native_host.exe" for event in native[1:]))
        self.assertTrue(any(event.get("message") == "SUCCESS: Update Complete!" for event in events))
        removals = [event for event in events if event["kind"] == "remove-tree"]
        self.assertEqual([event["phase"] for event in removals], ["preflight-cleanup", "host-copy", "extension-copy"])
        self.assertEqual([event["path"] for event in removals[1:]], [live + "\\_internal", live + "\\extension"])
        preflight_root = next(event["path"] for event in events if event["kind"] == "create-directory")
        self.assertEqual(removals[0]["path"], preflight_root)
        self.assertEqual(native[0]["executable"], preflight_root + "\\dh_native_host.exe")
        host_copies = [event for event in events if event["kind"] == "copy" and event["phase"] == "host-copy"]
        self.assertEqual([event["destination"] for event in host_copies], [
            live + "\\" + name for name in (
                "dh_native_host.exe", "_internal\\runtime.dll", "_internal\\nested\\library.dll",
                "release-integrity.json", "installed-product.json", "system_prompt.md", "system_prompt.md",
            )
        ])
        self.assertTrue(all(not event["recurse"] for event in host_copies))
        for name in ("config.json", "copilot-instructions.md", "user_prompt.md"):
            self.assertTrue(any(event["kind"] == "test-path" and event.get("path") == live + "\\" + name and event["exists"] for event in events))
        for path in (live + "\\_internal", live + "\\_internal\\nested"):
            self.assertTrue(any(event["kind"] == "create-directory" and event["path"] == path for event in events))
        extension_copy = next(event for event in events if event["kind"] == "copy" and event["phase"] == "extension-copy")
        ordered = [native[0], removals[0], removals[1], host_copies[0], removals[2], extension_copy, *native[1:]]
        self.assertEqual([events.index(event) for event in ordered], sorted(events.index(event) for event in ordered))


if __name__ == "__main__":
    unittest.main()
