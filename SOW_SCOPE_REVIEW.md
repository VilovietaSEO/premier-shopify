# Independence Phone Scope Review

## Current Delivery

The repository now contains the customer-facing Shopify theme, guided order builder, grouped cart presentation, deferred-billing v2 data contract, native Contact form, FAQ/footer updates, product and scenario media, store-object helpers, Rev.io handoff bridge, documentation, and automated verification.

The current customer journey is:

```text
Homepage -> /pages/order-now -> /cart -> external final checkout
```

Client feedback superseded several early concepts:

- Product descriptors are Classic Phone and Rugged Phone.
- The Patriot Package was removed from the active offer and checkout contract.
- The homepage routes directly to the guided Order Now experience.
- Order Now uses compact selectable phone cards, then service and add-on choices.
- Privacy Policy and Terms acceptance belongs once at final checkout.
- The Contact page uses four simple customer fields and Shopify native email delivery.

## Delivered In This Repository

- Responsive Independence Phone theme for desktop and mobile
- Homepage video with audio controls and desktop/mobile media
- Approved front-facing and rotating phone media
- Scenario-image candidate bundle with explicit fidelity-review results; existing theme imagery remains in place until replacement candidates are approved
- FAQ, Privacy Policy, and Terms routes and links
- Guided phone, service, add-on, and referral selection
- Cart grouped by configured phone
- Full-setup and optional-add-on removal logic
- `$15` per-order shipping presentation
- Separated due-today and future-charge totals
- `$0.00` Shopify variants for future-billed service/add-on selections
- Stable product SKUs and future-charge metadata
- Deferred-billing contract `independence_phone.revio_checkout.v2`
- Order export and signed Rev.io handoff payload
- Shopify native Contact delivery with optional future CRM capture
- Automated theme, media, catalog, handoff, and browser-preview tests
- Launch, Shopify Admin, Theme Editor, and Rev.io integration documentation

## External Or Owner-Controlled Work

These items cannot be completed solely in theme code:

- Rev.io sandbox and production credentials
- Rev.io tenant product and workflow mappings
- hosted/tokenized payment provider
- final checkout UI for one-time legal consent and required desired area code
- future billing creation, provisioning, and reconciliation
- Shopify Admin shipping-profile configuration with exactly one `$15` rate
- business address, tax registrations, nexus, and telecom-fee decisions
- public domain/DNS/hosting access
- owner-approved contact-email and test-order proof
- final QA-theme approval and Shopify publish action

## Acceptance Boundary

The repository is ready for GitHub review and merge when `npm run verify:local` passes. That state means the pre-gateway implementation and contract are internally consistent.

It does not mean:

- the unpublished QA theme has been published
- payment processing is connected
- Rev.io provisioning is live
- tax or shipping settings are approved
- the storefront password or external public domain is ready

Those are separate launch gates documented in `GO_LIVE_RUNBOOK.md`.
