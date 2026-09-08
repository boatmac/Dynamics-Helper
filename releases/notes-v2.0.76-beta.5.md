# Dynamics Helper v2.0.76-beta.5

## Fixes

- Restored automatic update discovery when Options opens. The check waits for
  successful configuration and safe update-state hydration, runs once per mount,
  and shares the manual check guard. It does not install automatically or check
  during update/recovery phases.
- Fixed Created On extraction for the observed D365 datetime container with
  deeply nested readonly inputs. Displayed date and time are preserved in DOM
  order; Modified On controls are excluded, with no guessed timezone conversion.
- Added a repository workflow for Edge/D365 field debugging: existing-session
  MCP setup, bounded single-connection CDP fallback, internal-tab/frame selection,
  sanitized structural evidence, and synthetic regression tests.

## Verification

- Focused frontend tests: **519/519**; related Host tests: **50/50**.
- Production frontend build, TypeScript, default menu **5/5**, and source/dist
  menu identity checks passed.
- Fresh frozen Host retains all **17** required imports, excludes both Pydantic
  development plugins, and includes no setuptools code.
- Complete final ZIP validation and actual frozen probe passed with matching
  beta.5 Host/Extension versions and isolated profiles.
- Created On structure was inspected read-only in the live D365 page; the fix
  passed synthetic regressions. Installed beta.5 live extraction remains to be
  confirmed. No customer field values were copied into fixtures or workflow docs.

## Limits And Upgrade Notes

Only loaded fields are read; DH does not automatically open Details/Audit or cache
metadata across tab unloading. Review Case Context before Analyze. Customer names
are not generally removed by the existing pattern scrubber.

Users reported successful beta.3-to-beta.4 upgrades on local and Cloud PC machines,
with completion notices disappearing after approximately eight seconds. This is
normal-upgrade evidence, not exhaustive interruption/recovery or antivirus testing.
The optional tzdata/Browserslist warnings and React act warnings remain disclosed.

For old overlay-updater versions such as v2.0.75-beta.1, use the complete installer:
that legacy path can leave mixed runtime files despite reporting success. Users on
a verified beta.4 installation may use the normal beta update UI. Stop on a failure
or detection; do not repeatedly retry, clear transaction evidence, weaken security
policy, or restore/allowlist a detected executable.

## Package Identity

- Asset: `DynamicsHelper_v2.0.76-beta.5.zip`
- Size: **14,007,154 bytes**
- SHA-256: `862d81d8f7ac5801f03b56b8276313202e25541aca016706c8a112b18b486f65`
- Recorded package inputs are checked against the release commit. The tested ZIP
  was built before that commit, not rebuilt from the tag.
