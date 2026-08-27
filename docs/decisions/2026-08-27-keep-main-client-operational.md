# Keep main focused on the client-operational Shopify source

- **Status:** Accepted
- **Date:** 2026-08-27
- **Scope:** Repository ownership and maintenance
- **Related:** `README.md`, `CHANGELOG.md`, `guides/`, `independence-phone-theme/`, `store-setup/`
- **Supersedes:** None
- **Superseded by:** None

## Context

The repository mixed the current Shopify theme and administrator guides with build-era specifications, dated QA screenshots, creative research, simulated previews, internal agent observability, and server prototypes that were not approved or hosted as part of the client storefront. That made it difficult for an administrator or future developer to tell what was current and operational.

## Decision

Maintain `main` as the client-operational source: the current live-theme snapshot, administrator guides, reproducible product setup data, focused Shopify helper scripts, verification commands, decisions, and changelog. Preserve the removed build archive in Git history and the annotated tag `archive/pre-cleanup-2026-08-27` instead of presenting it as current documentation or deployed functionality.

## Drivers

- A future administrator must be able to identify the maintained theme and operating instructions quickly.
- The repository must not imply that unhosted Rev.io, CRM, payment, or tax infrastructure is live.
- Build research and evidence should remain recoverable without dominating the maintained branch.
- The storefront itself must not change as a side effect of repository organization.

## Alternatives considered

### Leave every artifact on main

This preserves convenient access but keeps stale and current material visually equivalent.

### Permanently delete the history

This would reduce repository size further but would remove useful provenance and rollback evidence.

### Keep the optional backend prototypes on main

This would imply a maintained integration surface that the client has not authorized or hosted.

## Consequences

- **Positive:** The default branch clearly represents the maintained Shopify deliverable.
- **Positive:** Archived material remains recoverable from a named preservation point.
- **Negative:** Anyone restoring an old prototype must retrieve it from the archive and revalidate it before use.
- **Neutral:** Shopify remains the storefront host; changing GitHub alone does not change the live store.

## Revisit when

- The client authorizes and funds a maintained server-side integration.
- The client requests that creative research or QA evidence become a maintained repository deliverable.
- Repository ownership or hosting strategy changes.
