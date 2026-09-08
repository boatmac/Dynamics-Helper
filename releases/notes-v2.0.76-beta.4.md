# Dynamics Helper v2.0.76-beta.4

## Changes

- Restored **Check for Updates** beside the Host version and in About & Help.
  Both controls share one check, wait for discovery results rather than its
  initiation acknowledgment, and report timeout after 45 seconds. They do not
  install automatically and are disabled during update/recovery states.
- Added support for D365's open-shadow header components when extracting
  **Case Number**, **Severity**, and **Status Reason**. Existing page-layout
  fallbacks and case-ID validation remain intact.
- Added **Created On** and **Customer Name** to Case Context and its report input.
  Created On retains displayed date/time without assuming UTC. Customer Name is
  the associated Summary Customer lookup, not a verified ultimate customer or TPID.
- Kept same-case user edits protected. Ambiguous fields remain blank; Modified On
  is not used as Created On, and GUID-only customer values are rejected.

## Verification And Limits

- Frontend focused tests: **289/289**. Related Host/version/packaging/installer
  tests: **50/50** ultimately passed. An obsolete installer test was corrected to
  require refusal rather than forced process termination; one earlier mocked
  PowerShell scenario timed out and passed unchanged on retry.
- Production frontend build, TypeScript, default menu **5/5** and source/dist
  menu identity checks passed. Fresh Host build retained all 17 required imports.
- Final complete ZIP passed metadata/hash/archive validation and an actual frozen
  probe with matching beta.4 Host/Extension versions in isolated profiles.
- Live D365 validation of the new extraction remains pending, especially Created
  On control structure. Only loaded controls are read: DH does not open Details
  or Audit automatically and does not cache metadata across tab unloading.
- Customer names are not generally removed by the existing PII pattern scrubber.
  Review/edit Case Context before Analyze if a name should not be sent.
- Automatic discovery results are shared notifications, not individually
  request-correlated responses. The known optional `tzdata` build warning and
  outdated Browserslist-data warning remain.

## Upgrade Guidance

**For older overlay-updater versions, including v2.0.75-beta.1, use the complete
installer rather than relying on the old in-app update path.** A local upgrade
to beta.3 left stale runtime/assets and failed integrity despite matching version
labels and successful ping. Complete installation repaired it; the user reported
no Defender block during that local upgrade.

Users on a verified, fully repaired beta.3 installation can use the normal beta
update UI once to test this upgrade. Target-environment automatic-update/recovery
acceptance is still pending. On failure, preserve the error and transaction
evidence rather than repeatedly clicking Retry or clearing browser storage.

For full installation, extract the complete ZIP to a new local folder, close the
browser normally, and run install.bat under the same Windows account without
elevation or policy bypass. Do not copy only the EXE. Keep protection enabled;
stop on a new security detection instead of restoring/allowlisting the file.
This prerelease does not claim universal antivirus compatibility or a proven
remedy for the earlier Cloud PC detections.

## Package Identity

- Asset: `DynamicsHelper_v2.0.76-beta.4.zip`
- Size: **14,007,795 bytes**
- SHA-256: `bef3ef4971d88750a62bef627de0590996cf0ba7d89c459959554599cf9d0806`
- The tested package was built before the release commit; its recorded product
  inputs are checked against the release source. It is not a rebuild from the tag.
