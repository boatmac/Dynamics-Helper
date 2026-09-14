"""Inert checker fixtures. Authorization is required before running these.

Fixture text goes only to the source scanner; no fixture is imported or executed.
Passing these fixtures does not qualify repository-wide selection or containment.
"""
import copy
import hashlib
import json
from pathlib import Path
import stat
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from scripts.check_test_safety import (FORBIDDEN_KINDS, approved, check_repository,
                                     load_execution_profile, resolve_profile,
                                     scan_powershell, scan_python)


class TestTestSafety(unittest.TestCase):
    def kinds(self, source):
        return {finding[2] for finding in scan_python(source)}

    def test_dynamic_execution_and_basic_aliases(self):
        for source in (
            "eval(value)",
            "import builtins as b\nb.exec(value)",
            "from builtins import eval as evaluate\nevaluate(value)",
            "loader = exec\nloader(value)",
            "import base64 as b\nvalue = b.b64decode(data)\nexec(value)",
            "import gzip\nexec(gzip.decompress(data))",
        ):
            with self.subTest(source=source):
                self.assertIn('forbidden_execution', self.kinds(source))

    def test_negative_assertions_and_base64_data_are_not_execution(self):
        source = '''
import base64
data = "aGVsbG8="
decoded = base64.b64decode(data)
self.assertNotIn("Invoke-Expression", text)
negative = "exec(gzip.decompress(data))"
'''
        self.assertEqual(scan_python(source), [])

    def test_process_shapes_require_review(self):
        cases = {
            "s.run(['pwsh', '-File', 'tests/harnesses/fixture.ps1'])": 'process_review',
            "s.run(command)": 'process_unknown',
            "s.run('command')": 'process_unknown',
            "s.run(['tool'], shell=True)": 'shell_execution',
            "s.run(['tool'], shell=setting)": 'shell_execution',
            "s.run(['cmd.exe', '/c', 'echo'])": 'inline_command',
            "s.run(['powershell', '-Command', 'fixture'])": 'inline_command',
            "s.run(['pwsh', '-EncodedCommand', value])": 'inline_command',
            "s.run(['pwsh', '-EncodedCommand', value], input=data)": 'inline_command',
            "s.run(['python', '-'], input=data)": 'executable_input',
            "s.run(['tool'], **options)": 'shell_execution',
        }
        for call, kind in cases.items():
            with self.subTest(call=call):
                self.assertIn(kind, self.kinds('import subprocess as s\n' + call))

    def test_unknown_callable_and_stdin_are_reviewed(self):
        self.assertIn('unknown_execution', self.kinds('getattr(module, key)(data)'))
        self.assertIn('executable_input', self.kinds('proc.stdin.write(data)'))

    def test_fixed_bootstrap_is_review_candidate_not_approval(self):
        source = '''
import sys
from subprocess import run as launch
launch([sys.executable, '-c', "import runpy, sys; sys.frozen = True; runpy.run_path(sys.argv[1], run_name='__main__')", str(shadow)])
'''
        self.assertEqual(self.kinds(source), {'fixed_python_bootstrap'})
        self.assertIn('inline_command', self.kinds(source.replace('sys.frozen = True', 'sys.frozen = False')))

    def test_parse_failure_is_fixed(self):
        self.assertEqual(scan_python('def broken('), [(1, '<module>', 'parse_error', '')])

    def test_scope_and_exact_source(self):
        self.assertEqual(scan_python('class A:\n def test_one(self):\n  eval(value)\n'),
                         [(3, 'A.test_one', 'forbidden_execution', 'eval(value)')])

    def test_compilation_and_dynamic_imports_require_separate_review(self):
        self.assertEqual(self.kinds("compile('1', '<fixture>', 'eval')"), {'reviewable_compilation'})
        for source in ("__import__('fixture')", "import runpy\nrunpy.run_path(path)"):
            self.assertEqual(self.kinds(source), {'reviewable_dynamic_import'})

    def test_fully_matching_forbidden_exceptions_never_approve(self):
        fixtures = [('host/test_fixture.py', scan_python('exec(value)'))]
        fixtures += [('tests/harnesses/fixture.ps1', scan_powershell(source)) for source in (
            'IEX $value', 'Invoke-Expression $value', '[ScriptBlock]::Create($value)',
            'pwsh -EncodedCommand $value', 'pwsh -Command $value', "& 'Invoke-Expression' $value",
        )]
        fixtures += [('host/test_fixture.py', scan_python(source)) for source in (
            "import subprocess\nsubprocess.run(['tool'], shell=True)",
            "import subprocess\nsubprocess.run(['python', '-c', source])",
        )]
        for path, findings in fixtures:
            self.assertTrue(any(kind in FORBIDDEN_KINDS for _, _, kind, _ in findings))
            for _, scope, kind, literal in findings:
                if kind in FORBIDDEN_KINDS:
                    entry = dict(path=path, scope=scope, kind=kind, source=literal,
                                 purpose='Synthetic forbidden exception', sha256='a' * 64)
                    self.assertFalse(approved(entry, path, scope, kind, literal, 'a' * 64))

    def test_forbidden_exception_outside_inventory_rejects_manifest(self):
        for kind in FORBIDDEN_KINDS:
            entry = dict(path='outside/fixture.py', scope='<module>', kind=kind,
                         source='fixture', purpose='Synthetic forbidden exception', sha256='a' * 64)
            manifest = dict(version=2, profiles={}, inventory=[], exceptions=[entry])
            with patch('scripts.check_test_safety._checked_path') as checked, patch.object(Path, 'glob') as glob:
                checked.return_value.read_bytes.return_value = json.dumps(manifest).encode()
                for profile in (None, 'missing'):
                    self.assertEqual(check_repository('unused', profile=profile),
                                     ([('tests/test-safety-manifest.json', 1, 'forbidden_exception')], []))
                self.assertEqual(checked.call_count, 2)
                glob.assert_not_called()

    def test_exception_is_exact_and_pending_never_approves(self):
        literal = "s.run(['pwsh', '-File', 'tests/harnesses/fixture.ps1'])"
        entry = dict(path='host/test_fixture.py', scope='A.test_one', kind='process_review',
                     source=literal, purpose='Synthetic match-contract fixture', sha256=None)
        digest = 'a' * 64
        args = ('host/test_fixture.py', 'A.test_one', 'process_review', literal, digest)
        self.assertFalse(approved(entry, *args))
        entry['sha256'] = digest
        self.assertTrue(approved(entry, *args))
        for key in ('path', 'scope', 'kind', 'source', 'sha256', 'purpose'):
            changed = dict(entry)
            changed[key] = ''
            self.assertFalse(approved(changed, *args))
        self.assertFalse(approved(entry, *args[:-1], 'b' * 64))

    def test_powershell_literals_comments_and_fixture_review(self):
        self.assertEqual(scan_powershell('# Invoke-Expression is forbidden'), [])
        findings = scan_powershell("$text = 'Invoke-Expression' # not a call")
        self.assertEqual({item[2] for item in findings}, {'powershell_review'})
        for source in (". './fixture.ps1'", "& './fixture.ps1'", '& { $value = 1 }'):
            self.assertTrue(scan_powershell(source))
        self.assertIn('forbidden_execution', {item[2] for item in scan_powershell('Invoke-Expression $value')})
        self.assertIn('powershell_unresolved', {item[2] for item in scan_powershell('$value = @\"')})

    def test_ordinary_instances_do_not_poison_attribute_aliases(self):
        source = 'import re\npattern = re.compile("data")\npattern.sub("", text)\nvalues = []\nvalues.append(1)'
        self.assertEqual(self.kinds(source), {'reviewable_compilation'})
        self.assertEqual(self.kinds('import re as regex\nbuild = regex.compile\nbuild("x")'), {'reviewable_compilation'})
        self.assertIn('unknown_execution', self.kinds('factory()(value)'))
        for source in ('callback = factory()\ncallback(value)', 'callback = table[key]\ncallback(value)',
                       'callback = getattr(module, key)\ncallback(value)'):
            self.assertIn('unknown_execution', self.kinds(source))

    def test_powershell_command_tokens_not_substrings(self):
        for source in ('ConvertTo-Json -Compress', '$prefixIEXsuffix = 1', 'Write-Output "IEX"',
                       '$text = "ordinary $value"', 'if ($value) { Write-Output $value }', '& $Ops $value'):
            with self.subTest(source=source):
                self.assertEqual({item[2] for item in scan_powershell(source)}, {'powershell_review'})
        for source in ("& 'IEX' $value", '& "iex" $value', 'Write-Output x; IEX $value',
                       '$result = Invoke-Expression $value', 'Write-Output x | IEX'):
            self.assertIn('forbidden_execution', {item[2] for item in scan_powershell(source)})
        for source in ('pwsh -Command x', 'powershell.exe -Enc x', '& "C:/fixed/pwsh.exe" -c x', "& 'pwsh' '-Command' x"):
            self.assertIn('inline_command', {item[2] for item in scan_powershell(source)})
        for source in ('& ("I" + "EX") $value', '& "$command" $value', '$text = "$(IEX $value)"',
                       '& $Ops[0] $value', '& $Ops.Invoke $value', 'I`EX $value', "& 'I' + 'EX'", '& $Ops + $suffix'):
            self.assertTrue({item[2] for item in scan_powershell(source)} & FORBIDDEN_KINDS)
        for source in ("import subprocess as s\ns.run(['pwsh', '-Compress'])",
                       "import subprocess as s\ns.run(['tool', '-Command'])"):
            self.assertEqual(self.kinds(source), {'process_review'})

    def repository(self):
        """Fresh in-memory bytes only. No temp files, imports or fixture execution."""
        files = {
            'tests/test_one.py': b'class Example:\n def test_one(self):\n  pass\n',
            'support/helper.py': b'value = 1\n',
        }
        manifest = {
            'version': 2,
            'profiles': {'core': {'tests': ['tests/test_one.py'], 'dependencies': ['support/helper.py']}},
            'inventory': [dict(path=path, role='test' if path.startswith('tests/') else 'dependency',
                               source_kind='python', **{'class': 'pure_mock' if path.startswith('tests/') else 'support'},
                               sha256=hashlib.sha256(raw).hexdigest(), purpose='Inert review fixture')
                          for path, raw in files.items()],
            'exceptions': [],
        }
        return manifest, files

    def gate(self, manifest, files, profile='core', *, process_tests=False, special=None, raw_manifest=None):
        root = Path(__file__).absolute().parent / '__inert_repository__'
        contents = dict(files)
        contents['tests/test-safety-manifest.json'] = raw_manifest if raw_manifest is not None else json.dumps(manifest).encode()
        reads, listings = [], []
        special = special or {}

        def read_bytes(path):
            relative = path.relative_to(root).as_posix()
            reads.append(relative)
            return contents[relative]

        def lstat(path):
            relative = path.relative_to(root).as_posix() if path.is_relative_to(root) else str(path)
            if relative in special:
                return special[relative]
            return SimpleNamespace(st_mode=stat.S_IFREG if relative in contents else stat.S_IFDIR, st_file_attributes=0)

        def glob(path, pattern):
            listings.append(path.relative_to(root).as_posix())
            return [root / name for name in contents if (root / name).parent == path and Path(name).match(pattern)]

        with patch.object(Path, 'read_bytes', read_bytes), patch.object(Path, 'lstat', lstat), patch.object(Path, 'glob', glob):
            result = check_repository(root, profile=profile, process_tests=process_tests)
        return result, reads, listings

    def test_profile_resolver_and_loader_contract(self):
        manifest, files = self.repository()
        expected = dict(tests=['tests/test_one.py'], dependencies=['support/helper.py'], test_ids=[])
        self.assertEqual(resolve_profile(manifest, 'core'), expected)
        resolved = resolve_profile(manifest, 'core')
        resolved['tests'].clear()
        self.assertEqual(resolve_profile(manifest, 'core'), expected)
        with patch('scripts.check_test_safety._load_manifest', return_value=manifest):
            self.assertEqual(load_execution_profile('unused', 'core'), expected)
        for name in ('missing', None):
            with self.assertRaisesRegex(ValueError, 'unknown_profile'):
                resolve_profile(manifest, name)
        manifest['profiles']['core']['enabled'] = False
        self.assertEqual(self.gate(manifest, files)[0], ([('tests/test-safety-manifest.json', 1, 'profile_disabled')], []))

    def test_checked_in_profiles_have_explicit_closure_without_source_imports(self):
        root = Path(__file__).absolute().parents[1]
        safety = load_execution_profile(root, 'safety-core')
        pii = load_execution_profile(root, 'pii-core')
        self.assertEqual(sorted(safety['tests']), ['tests/test_profile_state.py', 'tests/test_safe_runner.py', 'tests/test_test_safety.py'])
        self.assertEqual(set(safety['dependencies']), {'scripts/check_test_safety.py', 'scripts/run_safe_tests.py', 'scripts/test_profile_state.py'})
        self.assertEqual(len(safety['test_ids']), 55)
        self.assertEqual(len(set(safety['test_ids'])), 55)
        self.assertEqual({identity.rsplit('.', 2)[0] for identity in safety['test_ids']},
                         {'tests.test_test_safety', 'tests.test_profile_state', 'tests.test_safe_runner'})
        self.assertIn('tests.test_safe_runner.SafeRunnerTests.test_postwait_input_mutation_blocks_success', safety['test_ids'])
        self.assertEqual(pii['tests'], ['host/test_pii_scrubber.py'])
        self.assertEqual(set(pii['dependencies']), {'host/pii_scrubber.py', 'scripts/check_test_safety.py', 'scripts/run_safe_tests.py'})
        self.assertEqual(pii['test_ids'], [])

    def test_profile_ignores_unrelated_pending_and_unclassified_sources_audit_finds(self):
        manifest, files = self.repository()
        files['host/test_pending.py'] = b'exec(value)\n'
        files['host/test_unknown.py'] = b'exec(other)\n'
        entry = dict(manifest['inventory'][0], path='host/test_pending.py', sha256=None)
        manifest['inventory'].append(entry)
        manifest['exceptions'].append(dict(path='outside/pending.py', scope='<module>', kind='unknown_execution',
                                            source='fixture()', sha256=None, purpose='Pending outside profile'))
        result, reads, listings = self.gate(manifest, files)
        self.assertEqual(result, ([], ['tests/test_one.py']))
        self.assertEqual(set(reads), {'tests/test-safety-manifest.json', 'tests/test_one.py', 'support/helper.py'})
        self.assertEqual(listings, [])
        (diagnostics, selected), reads, listings = self.gate(manifest, files, None)
        self.assertEqual(selected, [])
        self.assertIn(('host/test_unknown.py', 1, 'unclassified_file'), diagnostics)
        self.assertIn(('host/test_pending.py', 1, 'inventory_review_pending'), diagnostics)
        self.assertIn(('outside/pending.py', 1, 'exception_review_pending'), diagnostics)
        self.assertIn('host', listings)

    def test_dependency_raw_hash_including_line_endings_blocks_selection(self):
        manifest, files = self.repository()
        self.assertEqual(self.gate(manifest, files)[0], ([], ['tests/test_one.py']))
        for raw in (b'value = 2\n', b'value = 1\r\n'):
            changed = dict(files, **{'support/helper.py': raw})
            self.assertEqual(self.gate(manifest, changed)[0], ([('support/helper.py', 1, 'inventory_review_pending')], []))

    def test_dependency_scan_requires_exact_source_full_hash_exception(self):
        manifest, files = self.repository()
        raw = b'import re\npattern = re.compile("x")\npattern.sub("", text)\n'
        files['support/helper.py'] = raw
        digest = hashlib.sha256(raw).hexdigest()
        manifest['inventory'][1]['sha256'] = digest
        self.assertEqual(self.gate(manifest, files)[0], ([('support/helper.py', 2, 'reviewable_compilation')], []))
        exception = dict(path='support/helper.py', scope='<module>', kind='reviewable_compilation',
                         source='re.compile("x")', purpose='Inert regex callsite', sha256=digest)
        manifest['exceptions'] = [exception]
        self.assertEqual(self.gate(manifest, files)[0], ([], ['tests/test_one.py']))
        for key in ('path', 'scope', 'source', 'sha256'):
            changed = copy.deepcopy(manifest)
            changed['exceptions'][0][key] = 'a' * 64 if key == 'sha256' else 'different'
            self.assertEqual(self.gate(changed, files)[0][1], [])
        files['support/helper.py'] += b'# changed outside callsite\n'
        manifest['inventory'][1]['sha256'] = hashlib.sha256(files['support/helper.py']).hexdigest()
        self.assertIn(('support/helper.py', 2, 'reviewable_compilation'), self.gate(manifest, files)[0][0])

    def test_process_permission_is_checked_without_importing_tests(self):
        manifest, files = self.repository()
        manifest['inventory'][0]['class'] = 'process'
        self.assertEqual(self.gate(manifest, files)[0], ([('tests/test_one.py', 1, 'process_permission_required')], []))
        self.assertEqual(self.gate(manifest, files, process_tests=True)[0], ([], ['tests/test_one.py']))
        for category in ('live_probe', 'observational_helper'):
            manifest['inventory'][0]['class'] = category
            self.assertEqual(self.gate(manifest, files, process_tests=True)[0][1], [])

    def test_malformed_schema_rejects_before_source_reads_or_glob(self):
        base, files = self.repository()
        variants = [None, [], dict(base, version=1), dict(base, inventory={}), dict(base, profiles=[])]
        for field, value in (('tests', []), ('tests', ['tests/test_one.py'] * 2),
                             ('dependencies', ['support/missing.py']), ('dependencies', ['tests/test_one.py']),
                             ('test_ids', []), ('test_ids', ['tests.test_one.Example.test_one'] * 2),
                             ('test_ids', ['other.Example.test_one']), ('test_ids', ['tests.test_one']),
                             ('enabled', 'yes')):
            changed = copy.deepcopy(base)
            changed['profiles']['other'] = dict(changed['profiles']['core'], **{field: value})
            variants.append(changed)
        for path in ('../escape.py', '/absolute.py', 'C:/absolute.py', 'a\\b.py', './a.py', 'a//b.py', 'a/../b.py', 'a/NUL.py', 'a/file.py:stream', 'a/trailing./b.py'):
            changed = copy.deepcopy(base)
            changed['inventory'][0]['path'] = path
            variants.append(changed)
        for field, value in (('role', 'data'), ('role', []), ('source_kind', 'data'), ('class', []), ('class', 'support'), ('sha256', 'A' * 64), ('purpose', ' ')):
            changed = copy.deepcopy(base)
            changed['inventory'][0][field] = value
            variants.append(changed)
        for duplicate in ('tests/test_one.py', 'tests/TEST_one.py'):
            changed = copy.deepcopy(base)
            changed['inventory'].append(dict(changed['inventory'][0], path=duplicate))
            variants.append(changed)
        for manifest in variants:
            with self.subTest(manifest=manifest):
                (diagnostics, selected), reads, listings = self.gate(manifest, files, None)
                self.assertEqual(selected, [])
                self.assertTrue(diagnostics)
                self.assertEqual(reads, ['tests/test-safety-manifest.json'])
                self.assertEqual(listings, [])
        for raw in (b'{', b'{"version":2,"version":2}', b'\xff'):
            self.assertEqual(self.gate(base, files, raw_manifest=raw)[0][1], [])

    def test_exact_test_ids_must_exist_in_reviewed_module(self):
        manifest, files = self.repository()
        manifest['profiles']['core']['test_ids'] = ['tests.test_one.Example.test_one']
        self.assertEqual(self.gate(manifest, files)[0], ([], ['tests/test_one.py']))
        for value in ('tests.test_one.Example.test_missing', 'tests.test_one.Other.test_one'):
            manifest['profiles']['core']['test_ids'] = [value]
            self.assertEqual(self.gate(manifest, files)[0], ([('tests/test_one.py', 1, 'invalid_test_ids')], []))

    def test_links_and_windows_reparse_ancestors_block_before_read(self):
        manifest, files = self.repository()
        for path in ('support', 'support/helper.py'):
            for mode, flags in ((stat.S_IFLNK, 0), (stat.S_IFDIR, stat.FILE_ATTRIBUTE_REPARSE_POINT)):
                with self.subTest(path=path, mode=mode):
                    special = {path: SimpleNamespace(st_mode=mode, st_file_attributes=flags)}
                    (diagnostics, selected), reads, _ = self.gate(manifest, files, special=special)
                    self.assertEqual(selected, [])
                    self.assertIn(('support/helper.py', 1, 'path_review'), diagnostics)
                    self.assertNotIn('support/helper.py', reads)
        special = {'tests': SimpleNamespace(st_mode=stat.S_IFDIR, st_file_attributes=stat.FILE_ATTRIBUTE_REPARSE_POINT)}
        (diagnostics, selected), reads, listings = self.gate(manifest, files, special=special)
        self.assertEqual(diagnostics, [('tests/test-safety-manifest.json', 1, 'path_review')])
        self.assertEqual((selected, reads, listings), ([], [], []))

    def test_audit_does_not_glob_through_reparse_root(self):
        manifest, files = self.repository()
        special = {'host': SimpleNamespace(st_mode=stat.S_IFDIR, st_file_attributes=stat.FILE_ATTRIBUTE_REPARSE_POINT)}
        (diagnostics, selected), _, listings = self.gate(manifest, files, None, special=special)
        self.assertIn(('host', 1, 'path_review'), diagnostics)
        self.assertEqual(selected, [])
        self.assertNotIn('host', listings)

    def test_bootstrap_is_explicit_hash_bound_trust_boundary_not_scan_proof(self):
        manifest, files = self.repository()
        path = 'scripts/check_test_safety.py'
        files[path] = b'# inert bootstrap fixture, never executed\nexec(value)\n'
        manifest['profiles']['core']['dependencies'].append(path)
        entry = dict(path=path, role='bootstrap', source_kind='python', review_kind='bootstrap',
                     **{'class': 'support'}, purpose='Separate synthetic bootstrap review', sha256=None)
        manifest['inventory'].append(entry)
        self.assertEqual(self.gate(manifest, files)[0], ([(path, 1, 'inventory_review_pending')], []))
        entry['sha256'] = hashlib.sha256(files[path]).hexdigest()
        self.assertEqual(self.gate(manifest, files)[0], ([], ['tests/test_one.py']))
        for key, value in (('review_kind', 'other'), ('purpose', ''), ('path', 'support/other.py')):
            changed = copy.deepcopy(manifest)
            changed['inventory'][-1][key] = value
            self.assertEqual(self.gate(changed, files)[0][1], [])

    def test_scanned_dependency_process_sink_needs_permission_and_review(self):
        manifest, files = self.repository()
        raw = b'import subprocess\nsubprocess.run(["tool"])\n'
        files['support/helper.py'] = raw
        digest = hashlib.sha256(raw).hexdigest()
        manifest['inventory'][1]['sha256'] = digest
        manifest['exceptions'] = [dict(path='support/helper.py', scope='<module>', kind='process_review',
                                       source='subprocess.run(["tool"])', purpose='Inert process-shaped fixture', sha256=digest)]
        self.assertEqual(self.gate(manifest, files)[0], ([('support/helper.py', 2, 'process_permission_required')], []))
        self.assertEqual(self.gate(manifest, files, process_tests=True)[0], ([], ['tests/test_one.py']))
