"""Explicitly authorized SDK/CLI probe. Not an offline test entry.

Run with base Python -I -B -S and an existing fresh evidence directory. An outer
supervisor must enforce the total deadline and cancel only this owned process tree.
No Host import, tool execution, login, or installed product mutation.
Model sending requires separate approval and the explicit single-turn option.
"""
import argparse
import asyncio
import hashlib
import json
import logging
import os
from pathlib import Path
import re
import sys
import time
import uuid


async def probe(cli, run, safe, sdk_entry, root, use_existing_profile=False, single_model_turn=False):
    started = time.monotonic()
    total = 9 if single_model_turn else 8
    review_hash, selection = sdk_entry.selection(safe, root)
    site, baseline = sdk_entry.dependencies(safe, root)
    safe.write_record(run / 'dependency-before.json', baseline)
    safe.write_record(run / 'source-before.json', selection['sources'])
    cli_hash = safe.digest(cli)
    for name in (*safe.ISOLATED, 'workspace', 'copilot-home'):
        (run / name).mkdir()
    existing_profile = {key: os.environ[key] for key in ('USERPROFILE', 'APPDATA', 'LOCALAPPDATA')} if use_existing_profile else {}
    if use_existing_profile:
        existing_profile['HOME'] = os.environ.get('HOME') or existing_profile['USERPROFILE']
        copilot_home = safe.checked_path(Path(os.environ.get('COPILOT_HOME') or str(Path(existing_profile['HOME']) / '.copilot')), directory=True)
        for path in existing_profile.values():
            safe.checked_path(Path(path), directory=True)
    else:
        copilot_home = run / 'copilot-home'
    environment = safe.environment(run)
    environment['PATH'] = str(cli.parent) + os.pathsep + str(Path(environment['SystemRoot']) / 'System32')
    cli_environment = environment | existing_profile
    if use_existing_profile:
        # Preserve credential-helper discovery without copying token variables.
        cli_environment['PATH'] = os.environ['PATH']
        for key in ('ComSpec', 'PATHEXT', 'USERNAME', 'USERDOMAIN', 'HOMEDRIVE', 'HOMEPATH', 'SESSIONNAME', 'SystemDrive', 'ProgramData', 'ProgramFiles', 'ProgramFiles(x86)', 'ProgramW6432', 'OS'):
            if key in os.environ:
                cli_environment[key] = os.environ[key]
    os.environ.clear()
    os.environ.update(environment)
    os.chdir(run / 'workspace')
    logging.disable(logging.CRITICAL)
    sys.path[:0] = [str(root / 'host'), str(site)]
    from copilot import RuntimeConnection
    from copilot.session import PermissionDecisionUserNotAvailable
    from sdk_client import CopilotClient

    session_id = str(uuid.uuid4())
    state = dict(sdk_version=baseline['versions']['github-copilot-sdk'],
                 cli_sha256=cli_hash, review_hash=review_hash,
                 probe_sha256=safe.digest(Path(__file__).absolute()),
                 synthetic_session_id=session_id, steps=[], permission_requests=0,
                 model_turns_sent=0, overall_success=False, cleanup={})
    state['uses_existing_profile'] = use_existing_profile
    if (copilot_home / 'session-state' / session_id).exists():
        raise RuntimeError('Synthetic session path already exists')
    safe.write_record(run / 'ownership.json', {'session_id': session_id, 'base_directory': str(copilot_home)})

    def deny_permission(request, context):
        state['permission_requests'] += 1
        return PermissionDecisionUserNotAvailable()

    def classify_message(message):
        if not isinstance(message, str):
            return []
        text = message.lower()
        return [label for label in ('not found', 'not authenticated', 'not logged', 'credentials',
                'token', 'keychain', 'keyring', 'certificate', 'unauthorized', 'forbidden',
                'session', 'events', 'empty', 'invalid', 'unsupported') if label in text]

    async def step(name, operation, timeout=30):
        print(json.dumps({'stage': name, 'completed': len(state['steps']),
                          'total': total, 'elapsed': round(time.monotonic() - started, 2)}), flush=True)
        value = await asyncio.wait_for(operation, timeout=timeout)
        state['steps'].append(name)
        print(json.dumps({'completed_stage': name, 'completed': len(state['steps']),
                          'total': total, 'elapsed': round(time.monotonic() - started, 2)}), flush=True)
        return value

    # This flag disables stored authentication too, so omit it in the approved existing-profile mode.
    cli_args = [] if use_existing_profile else ['--no-auto-login']
    client = CopilotClient(connection=RuntimeConnection.for_stdio(path=str(cli), args=cli_args),
                           working_directory=str(run / 'workspace'),
                           base_directory=str(copilot_home), env=cli_environment,
                           use_logged_in_user=True, log_level='error')
    session = None
    process = None
    create_attempted = False
    try:
        await step('start_handshake', client.start())
        process = client._cli_process
        if process is None:
            raise RuntimeError('Expected owned CLI process')
        safe.write_record(run / 'cli-process.json', {'pid': process.pid, 'observed_at': time.time(), 'executable': str(cli)})
        status = await step('status', client.get_status(), 10)
        if not re.fullmatch(r'[0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9.-]+)?', status.version):
            raise RuntimeError('Unexpected CLI version format')
        state['cli_version'] = status.version
        state['protocol_version'] = status.protocol_version
        auth = await step('authentication', client.get_auth_status(), 15)
        state['authenticated'] = auth.isAuthenticated is True
        state['process_auth_diagnostics'] = classify_message(auth.statusMessage)
        print(json.dumps({'authenticated': state['authenticated']}), flush=True)
        if not state['authenticated'] and not use_existing_profile:
            state['stop_reason'] = 'existing_auth_unavailable' if use_existing_profile else 'isolated_auth_unavailable'
            return
        kwargs = dict(on_permission_request=deny_permission, skip_custom_instructions=True,
                      working_directory=str(run / 'workspace'),
                      system_message={'mode': 'replace', 'content': 'Synthetic compatibility check. Do not run tools.'},
                      available_tools=[], mcp_servers={}, skill_directories=[],
                      enable_config_discovery=False, enable_file_hooks=False, enable_skills=False)
        create_attempted = True
        session = await step('create_options_confirmed', client.create_session(session_id=session_id, **kwargs))
        if session.session_id != session_id:
            raise RuntimeError('Synthetic session identity mismatch')
        session_auth = await step('created_session_auth', session.rpc.git_hub_auth.get_status(timeout=10), 15)
        state['created_session_authenticated'] = session_auth.is_authenticated is True
        state['session_auth_diagnostics'] = classify_message(session_auth.status_message)
        print(json.dumps({'created_session_authenticated': state['created_session_authenticated']}), flush=True)
        if single_model_turn:
            if not state['created_session_authenticated']:
                raise RuntimeError('Authenticated session required for model turn')
            # Persist intent before sending; no retries or additional turns on failure.
            safe.write_record(run / 'model-turn-intent.json', {'session_id': session_id, 'turns': 1})
            state['model_turns_sent'] = 1
            response = await step('single_model_turn', session.send_and_wait(
                'Reply with exactly OK. Do not use any tools.', timeout=120), 130)
            content = getattr(getattr(response, 'data', None), 'content', None)
            state['model_response_present'] = isinstance(content, str) and bool(content.strip())
            state['model_response_matches_expected'] = isinstance(content, str) and content.strip() == 'OK'
            print(json.dumps({'model_response_present': state['model_response_present'],
                              'model_response_matches_expected': state['model_response_matches_expected']}), flush=True)
            if not state['model_response_matches_expected']:
                raise RuntimeError('Unexpected synthetic model response')
        await step('disconnect_for_resume', session.disconnect(), 10)
        session = None
        state['session_directory_before_resume'] = (copilot_home / 'session-state' / session_id).is_dir()
        state['session_events_before_resume'] = (copilot_home / 'session-state' / session_id / 'events.jsonl').is_file()
        session = await step('resume_options_confirmed', client.resume_session(session_id, **kwargs))
        if session.session_id != session_id:
            raise RuntimeError('Synthetic session identity mismatch')
        session_auth = await step('resumed_session_auth', session.rpc.git_hub_auth.get_status(timeout=10), 15)
        state['resumed_session_authenticated'] = session_auth.is_authenticated is True
        print(json.dumps({'resumed_session_authenticated': state['resumed_session_authenticated']}), flush=True)
        state['overall_success'] = (state['permission_requests'] == 0
                                    and state['created_session_authenticated']
                                    and state['resumed_session_authenticated'])
    except BaseException as error:
        state['error_type'] = type(error).__name__
        code = getattr(error, 'code', None)
        state['rpc_error_code'] = code if type(code) is int else None
        state['error_diagnostics'] = classify_message(str(error))
    finally:
        async def cleanup(name, operation):
            try:
                await asyncio.wait_for(operation, 10)
                state['cleanup'][name] = True
            except BaseException as error:
                state['cleanup'][name] = False
                state['cleanup'][name + '_error_type'] = type(error).__name__
                state['overall_success'] = False
        if session is not None:
            await cleanup('disconnect', session.disconnect())
        if create_attempted:
            await cleanup('delete_owned_session', client.delete_session(session_id))
            state['cleanup']['owned_session_path_absent'] = not (copilot_home / 'session-state' / session_id).exists()
            state['overall_success'] &= state['cleanup']['owned_session_path_absent']
        process = process or client._cli_process
        await cleanup('client_stop', client.stop())
        if process is not None:
            if process.poll() is None:
                process.kill()
            try:
                process.wait(timeout=5)
                state['cleanup']['cli_exited'] = True
                state['cleanup']['cli_exit_code'] = process.returncode
            except Exception:
                state['cleanup']['cli_exited'] = False
                state['overall_success'] = False
        safe.write_record(run / 'runtime-result.json', state)
        print(json.dumps({'runtime_complete': True, 'steps': state['steps'],
                          'cleanup': state['cleanup'], 'error_type': state.get('error_type')}), flush=True)
        try:
            _, after = sdk_entry.dependencies(safe, root)
            state['dependencies_unchanged'] = after == baseline
            state['sources_unchanged'] = all(safe.digest(root / path) == digest for path, digest in selection['sources'].items())
            state['cli_unchanged'] = safe.digest(cli) == cli_hash
            state['overall_success'] &= state['dependencies_unchanged'] and state['sources_unchanged'] and state['cli_unchanged']
        except Exception as error:
            state['verification_error_type'] = type(error).__name__
            state['overall_success'] = False
        state['elapsed_seconds'] = round(time.monotonic() - started, 2)
        safe.write_record(run / 'result.json', state)
        print(json.dumps({key: state[key] for key in ('steps', 'overall_success', 'cleanup')}
                         | {'authenticated': state.get('authenticated'), 'error_type': state.get('error_type')}), flush=True)


def main():
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import run_safe_tests as safe
    import run_sdk_tests as sdk_entry
    safe.startup()
    parser = argparse.ArgumentParser(description=__doc__, allow_abbrev=False)
    parser.add_argument('--cli', type=Path, required=True)
    parser.add_argument('--run', type=Path, required=True)
    parser.add_argument('--use-existing-profile', action='store_true', help='Requires explicit permission to use existing CLI configuration/authentication.')
    parser.add_argument('--single-model-turn', action='store_true', help='Requires separate approval for one synthetic no-tool model request; never retries.')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    cli = safe.checked_path(args.cli)
    run = safe.checked_path(args.run, directory=True)
    if cli.name.lower() != 'copilot.exe' or run.is_relative_to(root) or any(run.iterdir()):
        raise ValueError('Fixed CLI and fresh external evidence directory required')
    if args.single_model_turn and not args.use_existing_profile:
        raise ValueError('Single-turn verification requires approved existing authentication')
    asyncio.run(probe(cli, run, safe, sdk_entry, root, args.use_existing_profile, args.single_model_turn))
    result = json.loads((run / 'result.json').read_bytes())
    return 0 if result['overall_success'] else 1


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (Exception, KeyboardInterrupt) as error:
        print('Live probe stopped: ' + type(error).__name__, file=sys.stderr)
        raise SystemExit(2)
