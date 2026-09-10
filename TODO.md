# Project TODO

## New Repository Setup

- [ ] Confirm the company GitHub host and target private repository under the
  managed user account, including enterprise permission to create personal repos.
- [ ] Choose the product/repository name and default branch for the new start.
- [ ] Decide release distribution and update authentication before replacing URLs.
  The current updater uses anonymous requests to a public repository; a private
  source repository is not automatically a working software distribution channel.
- [ ] Establish a clean initial commit from the reviewed current files. Exclude
  `archive/`, prior Git objects/refs, external records, dependencies and generated
  binaries. The old repository retains its archive; ordinary directory copies
   must explicitly exclude it, even when files are ignored by Git.
   Verify the export tree: `git archive HEAD` does not include uncommitted cleanup
   or new documents, and staging alone does not change HEAD.
- [ ] Update active support, privacy, documentation and release links together
  with the corresponding public-menu tests after the destination is chosen.
- [ ] Decide whether installed extension/native identities remain compatible.
  Do not regenerate keys, reset storage or change session identity incidentally.

## Maintenance

- [ ] Retire the three unsupported SDK debug scripts together with their dedicated
  source-inspection test, preserving meaningful prompt-isolation coverage.
- [ ] Complete applicable test inventory/source reviews when those test scopes
  are selected; do not treat pending entries or old results as current approval.
- [ ] Assess optional timezone-data packaging and browser-compatibility data
  warnings within a scoped dependency maintenance change.

## Product Limitations

- Personal bookmark items are browser-local and are not backed up in Host config.
- Repository-only mode selects instructions, Skills and MCP; it does not initialize
  external case-management workflows or provide automatic workflow integration.
- Automatic rollback does not provide per-write power-loss atomicity. Extreme
  interruption may require the matching full installer; preserve recovery evidence.
- Update/rollback qualification must identify exact source, package and runtime
  conditions. A normal update success does not establish every recovery scenario.

Items describe current needs and limitations, not authorization to install,
operate accounts, publish, change security settings or execute live workloads.
