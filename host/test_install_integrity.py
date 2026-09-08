import base64
import gzip
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


@unittest.skipUnless(os.name == "nt", "Windows PowerShell 5.1 required")
class InstallerSafetyTests(unittest.TestCase):
    repo = Path(__file__).resolve().parents[1]

    def _run_installer(self, scenario):
        source = (self.repo / "installer_core.ps1").read_text(encoding="utf-8")
        encoded_source = base64.b64encode(source.encode("utf-8")).decode("ascii")
        # Parse the real source, replace only native invocation targets, and reject
        # any command not explicitly mocked or allowlisted before evaluating it.
        harness = r'''
$ErrorActionPreference = 'Stop'
if ($PSVersionTable.PSVersion.Major -ne 5) { throw 'Expected Windows PowerShell 5.1' }
$Scenario = 'SCENARIO'
$Source = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('SOURCE'))
$Tokens = $null
$Errors = $null
$Ast = [Management.Automation.Language.Parser]::ParseInput($Source, [ref]$Tokens, [ref]$Errors)
if ($Errors.Count) { throw 'Installer parse failed' }
$Commands = $Ast.FindAll({param($n) $n -is [Management.Automation.Language.CommandAst]}, $true)
$Allowed = @('Test-Path', 'Write-Error', 'Join-Path', 'New-Item', 'Copy-Item',
    'Get-ChildItem', 'Remove-Item', 'Write-Host', 'Get-Process', 'Start-Sleep',
    'ForEach-Object', 'Out-Null', 'Read-Host', 'Write-Warning', 'Stop-Process',
    'Unblock-File', 'Add-MpPreference', 'Set-MpPreference', 'Set-ExecutionPolicy')
foreach ($Command in ($Commands | Sort-Object { $_.Extent.StartOffset } -Descending)) {
    if ($Command.InvocationOperator -eq 'Ampersand') {
        $Target = $Command.CommandElements[0].Extent
        if ($Target.Text -notin @('$ExePath', '"$PreflightRoot\dh_native_host.exe"')) {
            throw 'Unexpected native target'
        }
        $Source = $Source.Remove($Target.StartOffset, $Target.EndOffset - $Target.StartOffset).Insert($Target.StartOffset, 'Invoke-MockHost')
    } elseif ($Command.GetCommandName() -notin $Allowed) {
        throw "Unmocked command: $($Command.GetCommandName())"
    }
}
function Test-Path {
    param($Path)
    if ($Path -eq "$env:APPDATA\DynamicsHelper") { return $Scenario -eq 'roaming' }
    if ($Path -eq 'C:\mock-package\host\dh_native_host.exe' -and $Scenario -eq 'missing-package') { return $false }
    if ($Path -eq "$env:LOCALAPPDATA\DynamicsHelper\dh_native_host.exe" -and $Scenario -eq 'missing-exe') { return $false }
    return $true
}
function Get-Process { if ($Scenario -eq 'running') { [pscustomobject]@{ Id = 123; ProcessName = 'dh_native_host' } } }
function New-Item { "MUTATION:new:$args" }
function Copy-Item {
    if ($Scenario -eq 'copy-throw') { throw 'virus blocked SECRET-ERROR' }
    "MUTATION:copy:$args"
}
function Remove-Item { "MUTATION:remove:$args" }
function Stop-Process { 'FORBIDDEN:Stop-Process' }
function Unblock-File { 'FORBIDDEN:Unblock-File' }
function Add-MpPreference { 'FORBIDDEN:Add-MpPreference' }
function Set-MpPreference { 'FORBIDDEN:Set-MpPreference' }
function Set-ExecutionPolicy { 'FORBIDDEN:Set-ExecutionPolicy' }
function Start-Sleep { }
function Out-Null { process { if ($_ -like 'MUTATION:*') { Write-Host $_ } } }
function Read-Host { param($Prompt) Write-Host "PROMPT:$Prompt"; return '' }
function Get-ChildItem {
    param($Path)
    foreach ($Name in @('config.json', 'dh_native_host.exe')) {
        [pscustomobject]@{ FullName = "$Path\$Name"; PSIsContainer = $false }
    }
}
function Invoke-MockHost {
    Write-Host "NATIVE:$args"
    $global:LASTEXITCODE = 0
    $Phase = if ($args -contains '--register') { 'register' } elseif ($args -contains '--settle-installer-repair') { 'settle' } elseif ($args.Count -eq 3) { 'preflight' } else { 'live' }
    if ($Scenario -eq "$Phase-throw") { throw 'virus blocked SECRET-ERROR' }
    if ($Scenario -eq 'register-generic-throw' -and $Phase -eq 'register') { throw 'Access denied SECRET-ERROR' }
    if ($Scenario -eq "$Phase-nonzero") { $global:LASTEXITCODE = 17; return 'SECRET-ERROR' }
    return 'mock host success'
}
. ([scriptblock]::Create('$PSScriptRoot = ''C:\mock-package'';' + $Source))
'''.replace("SCENARIO", scenario).replace("SOURCE", encoded_source)
        compressed = base64.b64encode(gzip.compress(harness.encode("utf-8"))).decode("ascii")
        loader = (
            "$stream = New-Object IO.MemoryStream(,[Convert]::FromBase64String('"
            + compressed
            + "')); $gzip = New-Object IO.Compression.GZipStream($stream,"
            "[IO.Compression.CompressionMode]::Decompress); "
            "$reader = New-Object IO.StreamReader($gzip); Invoke-Expression $reader.ReadToEnd()"
        )
        with tempfile.TemporaryDirectory() as temp:
            env = os.environ.copy()
            for name in ("LOCALAPPDATA", "APPDATA", "USERPROFILE", "HOME", "TEMP", "TMP"):
                directory = Path(temp) / name
                directory.mkdir()
                env[name] = str(directory)
            result = subprocess.run(
                ["powershell.exe", "-NoLogo", "-NoProfile", "-NonInteractive", "-Command", loader],
                cwd=temp, env=env, capture_output=True, text=True, timeout=20,
            )
            self.assertFalse(any(path.is_file() for path in Path(temp).rglob("*")))
        output = result.stdout + result.stderr
        self.assertNotIn("FORBIDDEN:", output)
        self.assertNotIn("Unmocked command:", output)
        self.assertNotIn("Installer parse failed", output)
        return result.returncode, result.stdout

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

    def test_running_host_denies_before_any_mutation(self):
        code, output = self._run_installer("running")
        self.assertEqual(code, 1, output)
        self.assertNotIn("MUTATION:", output)
        self.assertNotIn("NATIVE:", output)
        self.assertIn("running", output)
        self.assertIn("PROMPT:Press Enter to exit", output)

    def test_roaming_denies_before_any_mutation(self):
        code, output = self._run_installer("roaming")
        self.assertEqual(code, 1, output)
        self.assertNotIn("MUTATION:", output)
        self.assertNotIn("NATIVE:", output)
        self.assertIn("Roaming", output)
        self.assertIn("preserved", output)

    def test_native_failures_exit_one_without_success_or_security_changes(self):
        for scenario in ("preflight-throw", "preflight-nonzero", "live-throw", "live-nonzero",
                         "settle-throw", "settle-nonzero", "register-throw", "register-nonzero",
                         "register-generic-throw", "missing-exe", "missing-package", "copy-throw"):
            with self.subTest(scenario=scenario):
                code, output = self._run_installer(scenario)
                self.assertEqual(code, 1, output)
                self.assertNotIn("SUCCESS:", output)
                self.assertNotIn("SECRET-ERROR", output)
                self.assertIn("Installation failed.", output)
                self.assertIn("PROMPT:Press Enter to exit", output)

    def test_success_preserves_probe_settlement_registration_and_config_skip(self):
        code, output = self._run_installer("success")
        self.assertEqual(code, 0, output)
        self.assertEqual(output.count("NATIVE:--update-probe"), 2)
        self.assertLess(output.index("NATIVE:--settle-installer-repair"), output.index("NATIVE:--register"))
        self.assertIn("SUCCESS: Update Complete!", output)
        self.assertIn("PROMPT:Press Enter to exit", output)
        self.assertNotIn("MUTATION:copy:C:\\mock-package\\host\\config.json", output)


if __name__ == "__main__":
    unittest.main()
