# Documentation

## Start Here

Use [AGENTS.md](../AGENTS.md) for durable execution boundaries and topic routing,
then read only the documents relevant to the requested change. This is not a
mandatory read-all checklist and does not require a particular coding assistant.
[TODO.md](../TODO.md) owns current work and limitations; release notes and scoped
investigation records own dated verification evidence. Historical commands,
approvals and machine paths in those records are not instructions for a new
machine or session. Start with the unchecked items in TODO; investigation records
are supporting references, not a prerequisite reading stack.

## Product And Development

- [Overview and installation](../README.md)
- [User guide](../USER_GUIDE.md)
- [Architecture](../ARCHITECTURE.md)
- [Developer guide](../DEVELOPER_GUIDE.md)
- [Development rules](../AGENTS.md)
- [Project TODO and limitations](../TODO.md)

## Working Practices

- [Test execution safety](test-safety.md)
- [SDK integration](sdk-integration.md)
- [SDK upgrade workflow](sdk-upgrade-workflow.md)
- [D365 field debugging](edge-d365-debugging-workflow.md)

## Design Contracts

| Area | Contracts |
| --- | --- |
| Configuration | [Storage and Reset](specs/configuration-storage-contract.md), [hydration](specs/options-hydration.md), [model configuration](specs/model-performance-configuration.md), [beta preference](specs/beta-channel-preference.md) |
| Bookmarks | [Team configuration](specs/team-catalog-configuration.md), [merge policy](specs/team-catalog-merge-policy.md), [preference persistence](specs/team-preferences-persistence.md), [URL encryption](specs/team-manifest-url-encryption.md), [public defaults](specs/public-default-menu-asset.md) |
| Analysis | [Result persistence](specs/analysis-result-persistence.md), [request snapshots](specs/native-message-snapshot.md), [session identity](specs/deterministic-session-identity.md), [prompt isolation](specs/prompt-source-isolation.md) |
| Updates | [Runtime and transaction boundaries](specs/runtime-transaction-data-boundaries.md), [transactional updates](specs/transactional-auto-update.md), [staging promotion](specs/windows-staging-promotion-retry.md), [completion acknowledgment](specs/update-completion-acknowledgment.md), [completion visibility](specs/update-completion-visibility.md) |
| Options UI | [Navigation](specs/options-navigation.md), [About and Help](specs/options-about-help.md) |
