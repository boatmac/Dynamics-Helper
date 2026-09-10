# Deterministic Session Identity

## Identity

DH and MyCasesKit independently derive the identical session handle from the
bare 16-digit parent case number. A valid 19-digit task maps to its first 16
digits before session derivation. No prefix, salt, or stored mapping is involved.

```python
_NAMESPACE_MYCASE = uuid.UUID("816bee4e-8eee-4c0b-ae69-70879d032f4d")

@classmethod
def _case_to_session_id(cls, case_id: str) -> str:
    return str(uuid.uuid5(_NAMESPACE_MYCASE, case_id))
```

The namespace and bare-case UTF-8 input MUST remain byte-identical across both
repositories. The cross-repository definition is
`MyCasesKit/docs/dh-uuid5-change-spec.md`; it defines identity, not execution
authority. `session_name` is an opaque resume handle; `case_number` carries
human-readable case identity.

## Golden Values

| Bare case number | UUIDv5 |
|---|---|
| `2601190030003106` | `ce0ec286-26e6-5095-8b30-46143e9f437f` |
| `2099020099009998` | `0ff23d45-654e-55aa-8be9-dfc55a842b2e` |
| `2606100030001545` | `6eb4d81e-d635-59e4-8a98-3d3a733cc733` |

If a computed value differs, fix the namespace/input or implementation, never
these golden values. The 36-character lowercase UUID satisfies the known AAD
`client_session` length/character constraints;
this is not a guarantee about every future external validator.

## Consumers and Lifecycle

- SDK create and resume use the same derived ID. Repeated analysis does not
  allocate a random generic session; SDK initialization starts only the client.
- `current_session_id`, report metadata, and system `## Session Info` use this
  same handle. Session Info labels it `Session Name: <uuid>`.
- Reports include a Root-bound PowerShell resume command of the form
  `copilot -C '<root>' --resume=<uuid>`, or `copilot --resume=<uuid>` when Root is
  empty. The report command is generated from the actual session Root.
- Source/mode/Root changes refresh the same case UUID, not its derivation. Active
  Root and prompt fingerprint track what the SDK actually accepted.
- Old `co-`/`dhco-` sessions are not aliases for this UUID. The derivation does
  not migrate their conversation history; independently stored reports remain.

See [prompt lifecycle](prompt-source-isolation.md#6-session-lifecycle-and-prompt-fingerprint),
[Host derivation](../../host/dh_native_host.py), and
[literal golden guards](../../host/test_case_id.py). No test, rollback, release,
or external repository change is prescribed by this contract.
