"""Source-only pre-import review gate; never a sandbox or proof of safe imports.

Profiles declare their complete local dependency closure. No import traversal, payload decoding,
project imports, or test discovery occurs. Unknown wrappers/monkeypatches and
interprocedural data flow require human review. Hashes bind review, not trust.
Future runners must stop on any finding BEFORE importing tests, use only the
returned selection, and separately authorize process_tests=True. Live probes and
observational helpers are never selected. Optional CJS gets manual review only.
"""
import ast
import hashlib
import io
import json
from pathlib import Path, PureWindowsPath
import re
import stat
import tokenize

ROOTS = ("host/test*.py", "tests/test*.py", "tests/harnesses/*.ps1")
CLASSES = {"pure_mock", "process", "live_probe", "observational_helper", "support"}
PROCESS = {"run", "Popen", "call", "check_call", "check_output", "getoutput", "getstatusoutput"}
BOOTSTRAP = "import runpy, sys; sys.frozen = True; runpy.run_path(sys.argv[1], run_name='__main__')"
FORBIDDEN_KINDS = frozenset({"forbidden_execution", "shell_execution", "inline_command", "powershell_complex", "powershell_unresolved", "parse_error"})
MANIFEST_PATH = 'tests/test-safety-manifest.json'
BOOTSTRAP_PATHS = {'scripts/check_test_safety.py', 'scripts/run_safe_tests.py'}
SOURCE_KINDS = {'.py': 'python', '.ps1': 'powershell', '.cjs': 'javascript'}
PS_INLINE_FLAGS = {'-c', '-command', '-commandwithargs', '-e', '-ec', '-enc', '-encodedcommand', '-encodedarguments'}


def scan_python(source):
    """Return (line, qualified_scope, kind, exact_call_source), never execute it."""
    try:
        tree = ast.parse(source)
    except (SyntaxError, ValueError, RecursionError):
        return [(1, "<module>", "parse_error", "")]
    findings = []

    def visit(node, aliases, scope):
        def name(value):
            if isinstance(value, ast.Name):
                return aliases.get(value.id, value.id)
            if isinstance(value, ast.Attribute):
                base = name(value.value)
                if base == '?' and isinstance(value.value, ast.Name):
                    base = value.value.id
                return base + "." + value.attr
            return "?"

        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            scope = scope + [node.name]
            aliases = aliases.copy()
        if isinstance(node, ast.Import):
            for item in node.names:
                aliases[item.asname or item.name.split('.')[0]] = item.name if item.asname else item.name.split('.')[0]
        if isinstance(node, ast.ImportFrom):
            for item in node.names:
                aliases[item.asname or item.name] = (node.module or "") + "." + item.name
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    # Ordinary constructed instances are not unknown callable aliases.
                    # Direct invocation of a call/subscript result still needs review.
                    if isinstance(node.value, (ast.Name, ast.Attribute)):
                        aliases[target.id] = name(node.value)
                    elif isinstance(node.value, (ast.Call, ast.Subscript, ast.Lambda)):
                        aliases[target.id] = '?'
                    else:
                        aliases.pop(target.id, None)
        if isinstance(node, ast.Call):
            called = name(node.func)
            leaf = called.rsplit('.', 1)[-1]
            kind = None
            if leaf in {"eval", "exec"}:
                kind = "forbidden_execution"
            elif leaf == "compile":
                kind = "reviewable_compilation"
            elif leaf in {"__import__", "exec_module", "run_path", "run_module"} or called.startswith("importlib."):
                kind = "reviewable_dynamic_import"
            elif leaf in {"getattr", "setattr"} or called.startswith("?"):
                kind = "unknown_execution"
            elif (called.startswith("subprocess.") and leaf in PROCESS) or called in {"os.system", "os.popen", "os.startfile"} or called.startswith(("os.exec", "os.spawn", "asyncio.create_subprocess")):
                kind = "process_review"
                keywords = {item.arg: item.value for item in node.keywords}
                argv = node.args[0] if node.args else keywords.get("args")
                shell = keywords.get("shell")
                if called in {"os.system", "os.popen", "subprocess.getoutput", "subprocess.getstatusoutput"} or None in keywords or (shell is not None and not (isinstance(shell, ast.Constant) and shell.value is False)):
                    kind = "shell_execution"
                elif any(key in keywords for key in ("stdin", "input", "executable")):
                    kind = "executable_input"
                elif not isinstance(argv, (ast.List, ast.Tuple)):
                    kind = "process_unknown"
                else:
                    words = [v.value if isinstance(v, ast.Constant) and isinstance(v.value, str) else None for v in argv.elts]
                    flags = [word.lower() for word in words[1:] if word is not None]
                    executable = (words[0] or '').lower().replace('\\', '/').split('/')[-1] if words else ''
                    if any(flag in {'-c', '/c', '/k'} or (executable in {'pwsh', 'pwsh.exe', 'powershell', 'powershell.exe'} and flag in PS_INLINE_FLAGS) for flag in flags):
                        kind = "inline_command"
                        if len(words) == 4 and name(argv.elts[0]) == "sys.executable" and words[1:3] == ["-c", BOOTSTRAP]:
                            kind = "fixed_python_bootstrap"
                    elif any(word is None for word in words):
                        kind = "process_unknown"
                    elif words and words[0].lower().replace('\\', '/').split('/')[-1] in {"cmd", "cmd.exe"}:
                        kind = "shell_execution"
                # Input/executable keywords must not hide forbidden inline flags.
                if isinstance(argv, (ast.List, ast.Tuple)) and kind != 'fixed_python_bootstrap':
                    words = [v.value if isinstance(v, ast.Constant) and isinstance(v.value, str) else None for v in argv.elts]
                    executable = (words[0] or '').lower().replace('\\', '/').split('/')[-1] if words else ''
                    flags = [word.lower() for word in words[1:] if word is not None]
                    if any(flag in {'-c', '/c', '/k'} or (executable in {'pwsh', 'pwsh.exe', 'powershell', 'powershell.exe'} and flag in PS_INLINE_FLAGS) for flag in flags):
                        kind = 'inline_command'
            elif leaf in {"communicate", "write"} and (leaf == "communicate" or ".stdin." in called):
                kind = "executable_input"
            if kind:
                findings.append((node.lineno, '.'.join(scope) or '<module>', kind, ast.get_source_segment(source, node) or ""))
        for child in ast.iter_child_nodes(node):
            visit(child, aliases, scope)

    visit(tree, {}, [])
    return findings


def scan_powershell(source):
    """Coarse positive identification only, NOT a PowerShell parser.

    Every non-comment statement needs exact file+line-source review, including
    dot sourcing, call operators and fixture ScriptBlocks. No safe-cmdlet list.
    Ordinary interpolation/structure stays reviewable. Unparsed quoting, escapes,
    code subexpressions and constructed command targets remain non-exempt.
    """
    findings = []
    for line, original in enumerate(source.splitlines(), 1):
        code, quote, index, command_literal = "", None, 0, False
        quoted_text = ''
        unresolved = False
        while index < len(original):
            char = original[index]
            if char == '`' or original[index:index + 2] in {"<#", "#>", "@'", '@"'}:
                unresolved = True
            if quote:
                if char == quote:
                    if original[index:index + 2] == quote * 2:
                        index += 1
                    else:
                        quote = None
                        if quoted_text.lower() in PS_INLINE_FLAGS and re.search(r'(?:^|[;|&{}=(])\s*(?:[\w:./\\-]*[/\\])?(?:pwsh|powershell)(?:\.exe)?\s', code, re.I):
                            code += ' ' + quoted_text + ' '
                elif quote == '"' and char == '$':
                    if command_literal or original[index:index + 2] == '$(':
                        unresolved = True
                elif command_literal:
                    code += char
                if quote:
                    quoted_text += char
            elif char == '#':
                break
            elif char in "\"'":
                quote = char
                quoted_text = ''
                command_literal = code.rstrip().endswith(('&', '.'))
                code += ' ' if command_literal else ' literal '
            else:
                code += char
            index += 1
        if quote or code.strip() or unresolved:
            kind = 'powershell_review'
            if quote or unresolved or '$(' in code or re.search(r'[&.]\s*\(', code):
                kind = 'powershell_unresolved'
            # Simple variable call targets are exact-line manual review candidates;
            # member/index/string construction is not such a candidate.
            if re.search(r'&\s*\$[^\s;|}]+[.\[+]', code) or re.search(r'&[^;|{}]*\+', code):
                kind = 'powershell_unresolved'
            if re.search(r'(?:^|[;|&{}=(])\s*(?:iex|invoke-expression)(?=\s|[;(]|$)', code, re.I) or re.search(r'\[\s*(?:System\.Management\.Automation\.)?scriptblock\s*\]\s*::\s*create\s*\(', code, re.I):
                kind = 'forbidden_execution'
            elif re.search(r'(?:^|[;|&{}=(])\s*(?:[\w:./\\-]*[/\\])?(?:pwsh|powershell)(?:\.exe)?\s+[^;|]*?(?<!\S)(?:' + '|'.join(re.escape(flag) for flag in PS_INLINE_FLAGS) + r')(?=\s|$)', code, re.I):
                kind = 'inline_command'
            elif re.search(r'(?:^|[;|&{}=(])\s*cmd(?:\.exe)?\s+[^;|]*?/(?:c|k)(?=\s|$)', code, re.I):
                kind = 'shell_execution'
            findings.append((line, '<file>', kind, original))
    return findings


def approved(entry, path, scope, kind, literal, digest):
    if kind in FORBIDDEN_KINDS:
        return False
    return (entry.get('path') == path and entry.get('scope') == scope
            and entry.get('kind') == kind and entry.get('source') == literal
            and bool(literal) and isinstance(entry.get('purpose'), str) and bool(entry['purpose'].strip())
            and isinstance(entry.get('sha256'), str) and re.fullmatch('[0-9a-f]{64}', entry['sha256']) is not None
            and entry['sha256'] == digest)


def _canonical_path(value):
    if not isinstance(value, str) or not value or '\\' in value or PureWindowsPath(value).drive or value.startswith('/'):
        return False
    for part in value.split('/'):
        if part in {'', '.', '..'} or part.endswith((' ', '.')) or re.search(r'[<>:"|?*\x00-\x1f]', part):
            return False
        if part.split('.')[0].upper() in {'CON', 'PRN', 'AUX', 'NUL', *(f'COM{i}' for i in range(1, 10)), *(f'LPT{i}' for i in range(1, 10))}:
            return False
    return True


def _validate_manifest(manifest):
    """Global structural validation, including profiles not selected for execution."""
    if not isinstance(manifest, dict) or type(manifest.get('version')) is not int or manifest['version'] != 2:
        raise ValueError('manifest_error')
    inventory, exceptions, profiles = (manifest.get(key) for key in ('inventory', 'exceptions', 'profiles'))
    if not isinstance(inventory, list) or not isinstance(exceptions, list) or not isinstance(profiles, dict):
        raise ValueError('manifest_error')
    if any(isinstance(item, dict) and isinstance(item.get('kind'), str) and item['kind'] in FORBIDDEN_KINDS for item in exceptions):
        raise ValueError('forbidden_exception')
    seen, entries = set(), {}
    for item in inventory:
        if not isinstance(item, dict) or not _canonical_path(item.get('path')):
            raise ValueError('manifest_error')
        path = item['path']
        if path.casefold() in seen:
            raise ValueError('duplicate_inventory_path')
        seen.add(path.casefold())
        entries[path] = item
        role, category, source_kind = (item.get(key) for key in ('role', 'class', 'source_kind'))
        if not isinstance(role, str) or not isinstance(category, str) or role not in {'test', 'dependency', 'data', 'bootstrap'} or category not in CLASSES:
            raise ValueError('manifest_error')
        if (role == 'test') == (category == 'support'):
            raise ValueError('source_kind_conflict')
        expected = SOURCE_KINDS.get(Path(path).suffix.lower())
        if expected is not None and Path(path).suffix != Path(path).suffix.lower():
            raise ValueError('source_kind_conflict')
        if role == 'data':
            if source_kind != 'data' or expected is not None:
                raise ValueError('source_kind_conflict')
        elif source_kind != expected or expected is None:
            raise ValueError('source_kind_conflict')
        if role == 'test' and source_kind == 'powershell' and category not in {'process', 'live_probe', 'observational_helper'}:
            raise ValueError('source_kind_conflict')
        if (role == 'bootstrap') != (path in BOOTSTRAP_PATHS):
            raise ValueError('bootstrap_role_conflict')
        if role == 'bootstrap' and item.get('review_kind') != 'bootstrap':
            raise ValueError('bootstrap_review_required')
        if not isinstance(item.get('purpose'), str) or not item['purpose'].strip():
            raise ValueError('manifest_error')
        if 'sha256' not in item or (item['sha256'] is not None and (not isinstance(item['sha256'], str) or not re.fullmatch('[0-9a-f]{64}', item['sha256']))):
            raise ValueError('manifest_error')
    seen_exceptions = set()
    for item in exceptions:
        if not isinstance(item, dict) or not _canonical_path(item.get('path')):
            raise ValueError('manifest_error')
        if any(not isinstance(item.get(key), str) or not item[key].strip() for key in ('scope', 'kind', 'source', 'purpose')):
            raise ValueError('manifest_error')
        if 'sha256' not in item or (item['sha256'] is not None and (not isinstance(item['sha256'], str) or not re.fullmatch('[0-9a-f]{64}', item['sha256']))):
            raise ValueError('manifest_error')
        key = (item['path'], item['scope'], item['kind'], item['source'])
        if key in seen_exceptions:
            raise ValueError('duplicate_exception')
        seen_exceptions.add(key)
    for name, profile in profiles.items():
        if not isinstance(name, str) or not re.fullmatch('[a-z0-9]+(?:-[a-z0-9]+)*', name) or not isinstance(profile, dict):
            raise ValueError('manifest_error')
        if set(profile) - {'tests', 'dependencies', 'test_ids', 'enabled'} or type(profile.get('enabled', True)) is not bool:
            raise ValueError('manifest_error')
        tests, dependencies = profile.get('tests'), profile.get('dependencies')
        if not isinstance(tests, list) or not tests or not isinstance(dependencies, list):
            raise ValueError('manifest_error')
        paths = tests + dependencies
        if any(not _canonical_path(path) for path in paths) or len({path.casefold() for path in paths}) != len(paths):
            raise ValueError('duplicate_or_invalid_profile_path')
        for path in paths:
            if path not in entries:
                raise ValueError('unknown_profile_reference')
            if (path in tests) != (entries[path]['role'] == 'test'):
                raise ValueError('source_kind_conflict')
        ids = profile.get('test_ids', [])
        if not isinstance(ids, list) or any(not isinstance(value, str) for value in ids) or len(set(ids)) != len(ids) or ('test_ids' in profile and not ids):
            raise ValueError('invalid_test_ids')
        modules = {path[:-3].replace('/', '.') for path in tests if path.endswith('.py')}
        if ids and (len(modules) != len(tests) or any(not re.fullmatch(r'(?:[A-Za-z_]\w*\.)+[A-Za-z_]\w*\.test\w*', value) or value.rsplit('.', 2)[0] not in modules for value in ids) or {value.rsplit('.', 2)[0] for value in ids} != modules):
            raise ValueError('invalid_test_ids')
    return entries


def resolve_profile(manifest, profile):
    """Pure schema resolver; returns copies of tests/dependencies/test_ids lists.

    Raises ValueError with a fixed diagnostic code. Does not read source, import
    tests, verify hashes or authorize execution. Call check_repository first;
    the runner must bind the same manifest and closure bytes across the gate/run.
    An empty test_ids list means all tests in exactly the listed modules.
    """
    _validate_manifest(manifest)
    if not isinstance(profile, str) or profile not in manifest['profiles']:
        raise ValueError('unknown_profile')
    value = manifest['profiles'][profile]
    if not value.get('enabled', True):
        raise ValueError('profile_disabled')
    return {key: list(value.get(key, [])) for key in ('tests', 'dependencies', 'test_ids')}


def _checked_path(root, relative, *, directory=False):
    """lstat every ancestor before reading or enumerating; never resolve links.

    Not atomic against concurrent replacement. Runner must enforce the separate
    no-mutation review/gate/execution boundary and recheck its launch snapshot.
    """
    path = root / relative
    for part in (*reversed(path.parents), path):
        info = part.lstat()
        if stat.S_ISLNK(info.st_mode) or getattr(info, 'st_file_attributes', 0) & stat.FILE_ATTRIBUTE_REPARSE_POINT:
            raise ValueError('path_review')
        if not (stat.S_ISDIR(info.st_mode) if part != path or directory else stat.S_ISREG(info.st_mode)):
            raise ValueError('path_review')
    return path


def _unique_object(pairs):
    value = {}
    for key, item in pairs:
        if key in value:
            raise ValueError('manifest_error')
        value[key] = item
    return value


def _load_manifest(root):
    raw = _checked_path(root, MANIFEST_PATH).read_bytes()
    manifest = json.loads(raw.decode('utf-8'), object_pairs_hook=_unique_object)
    _validate_manifest(manifest)
    return manifest


def load_execution_profile(root, name):
    """Read the validated manifest and return resolve_profile's three-list dict.

    Metadata only, NOT a gate. Raises OSError/ValueError on invalid input. Runner
    must call check_repository(root, profile=name, ...) and stop on any diagnostic.
    """
    return resolve_profile(_load_manifest(Path(root).absolute()), name)


def check_repository(root, profile=None, process_tests=False, include_maintenance=False):
    """Return (diagnostics, selected_test_paths), with [] selection on ANY finding.

    profile=None audits known roots plus inventory (optional maintenance opt-in).
    Profiles scan only declared closure, AFTER global schema/exception validation.
    Bootstrap sources are hash-bound, separately human reviewed, NOT self-scanned;
    their explicit review_kind/purpose is a trust boundary, not sink approval.
    """
    root = Path(root).absolute()
    diagnostics, selected = [], []
    try:
        manifest = _load_manifest(root)
        entries = {item['path']: item for item in manifest['inventory']}
        closure = resolve_profile(manifest, profile) if profile is not None else None
    except (OSError, UnicodeError, ValueError, TypeError, RecursionError) as error:
        code = str(error) if isinstance(error, ValueError) and str(error) in {'forbidden_exception', 'path_review', 'unknown_profile', 'profile_disabled'} else 'manifest_error'
        return [(MANIFEST_PATH, 1, code)], []
    if closure is not None:
        paths = set(closure['tests'] + closure['dependencies'])
        selected = list(closure['tests'])
        for path in selected:
            category = entries[path]['class']
            if category not in {'pure_mock', 'process'}:
                diagnostics.append((path, 1, 'profile_not_runnable'))
            elif category == 'process' and not process_tests:
                diagnostics.append((path, 1, 'process_permission_required'))
    else:
        paths = {path for path in entries if include_maintenance or not path.startswith('scripts/maintenance/')}
        patterns = ROOTS + (('scripts/maintenance/Test*.cjs',) if include_maintenance else ())
        for pattern in patterns:
            parent, leaf = pattern.rsplit('/', 1)
            try:
                directory = _checked_path(root, parent, directory=True)
                paths.update(path.relative_to(root).as_posix() for path in directory.glob(leaf))
            except FileNotFoundError:
                pass
            except (OSError, ValueError):
                diagnostics.append((parent, 1, 'path_review'))
    for relative in sorted(paths):
        entry = entries.get(relative)
        if entry is None:
            diagnostics.append((relative, 1, 'unclassified_file'))
        try:
            path = _checked_path(root, relative)
            raw = path.read_bytes()
            digest = hashlib.sha256(raw).hexdigest()
            if entry and entry['sha256'] != digest:
                diagnostics.append((relative, 1, 'inventory_review_pending'))
            if entry and entry['role'] in {'bootstrap', 'data'}:
                continue
            if path.suffix == '.py':
                encoding, _ = tokenize.detect_encoding(io.BytesIO(raw).readline)
                source = raw.decode(encoding)
                findings = scan_python(source)
            else:
                source = raw.decode('utf-8-sig')
                findings = scan_powershell(source) if path.suffix == '.ps1' else [(1, '<file>', 'javascript_review', source)]
        except ValueError as error:
            diagnostics.append((relative, 1, 'path_review' if str(error) == 'path_review' else 'parse_error'))
            continue
        except (OSError, UnicodeError, SyntaxError, LookupError):
            diagnostics.append((relative, 1, 'parse_error'))
            continue
        category = entry['class'] if entry else None
        if closure is None and entry and entry['role'] == 'test' and (category == 'pure_mock' or category == 'process' and process_tests):
            selected.append(relative)
        for line, scope, kind, literal in findings:
            if category == 'pure_mock' and kind in {'process_review', 'process_unknown', 'shell_execution', 'inline_command', 'fixed_python_bootstrap', 'executable_input'}:
                diagnostics.append((relative, line, 'process_class_required'))
            if category == 'support' and kind in {'process_review', 'process_unknown', 'executable_input', 'fixed_python_bootstrap'} and not process_tests:
                diagnostics.append((relative, line, 'process_permission_required'))
            if not any(approved(item, relative, scope, kind, literal, digest) for item in manifest['exceptions']):
                diagnostics.append((relative, line, kind))
        if closure and closure['test_ids'] and relative in closure['tests'] and not any(kind == 'parse_error' for _, _, kind, _ in findings):
            module = relative[:-3].replace('/', '.')
            tree = ast.parse(source)
            available = {f'{module}.{node.name}.{method.name}' for node in tree.body if isinstance(node, ast.ClassDef) for method in node.body if isinstance(method, (ast.FunctionDef, ast.AsyncFunctionDef)) and method.name.startswith('test')}
            if any(value not in available for value in closure['test_ids'] if value.rsplit('.', 2)[0] == module):
                diagnostics.append((relative, 1, 'invalid_test_ids'))
    for item in manifest['exceptions']:
        if closure is None or item['path'] in paths:
            if item['sha256'] is None:
                diagnostics.append((item['path'], 1, 'exception_review_pending'))
    return sorted(set(diagnostics)), [] if diagnostics else selected


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--profile')
    mode.add_argument('--audit', action='store_true', help='Audit all known roots (default)')
    parser.add_argument('--process-tests', action='store_true')
    parser.add_argument('--include-maintenance', action='store_true')
    args = parser.parse_args()
    problems, _ = check_repository(Path(__file__).absolute().parents[1], profile=args.profile,
                                   process_tests=args.process_tests, include_maintenance=args.include_maintenance)
    for path, line, kind in problems:
        print(f'{json.dumps(path, ensure_ascii=True)}:{line}:{kind}')
    raise SystemExit(1 if problems else 0)
