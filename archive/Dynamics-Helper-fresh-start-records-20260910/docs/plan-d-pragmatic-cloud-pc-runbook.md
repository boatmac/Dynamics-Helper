# Cloud PC Update Qualification: Historical Boundaries

Qualification is paused. This summary is not an executable runbook, retry
allowance, or active work queue. Recorded outcomes and artifact identities are
in [Cloud PC results](plan-d-pragmatic-cloud-pc-results.md).

## Disposition

| Historical scenario | Result |
| --- | --- |
| Normal B1-to-B2 update | FAIL: Defender quarantine; B1 rollback and integrity reported, full settlement not established |
| Interrupted recovery | NOT RUN |
| Same-package matching-installer repair | NOT RUN |

Later beta3 full installation and basic use did not qualify those B2 scenarios.
A successful rollback is not a passed update. B1 lacked the new completion ACK
protocol and could not qualify B2 completion behavior.

The normal update ran through separately authorized chat while the old runbook
still contained six blocking placeholders. No complete replacement was recorded;
full conformance to an executable reviewed runbook is not established. The old
commands, temporary guards, and attempt-allocation rules are archived historical
material; see `docs/documentation-cleanup.md`. Do not reconstruct or execute them.

## Retained Boundaries

- A future bounded experiment requires explicit authorization for its actual
  environment and effects. Historical approvals do not authorize retries,
  installation, publication, cloud distribution, or security changes.
- Preserve journals, backups, `updates/**`, finalization evidence, and browser
  state. Neither reported rollback nor distribution cleanup proves settlement.
- No Defender trigger or false positive was established. Do not bypass protection
  or infer equivalent policy/allow state from a successful installation.
- Temporary guard mock checks did not verify real Windows ACL/reparse behavior,
  eliminate concurrent-change races, or establish real cleanup readiness.
- Source checkout, local installation, and Cloud PC product state are separate.

The retained [Visible Update Completion design](specs/2026-09-05-visible-update-completion-design.md)
defines the product behavior: eight continuous foreground-visible seconds and
persisted Service Worker authority, not manual ACKs or synthetic completion.
Source tests of that contract do not establish successful cloud qualification.
