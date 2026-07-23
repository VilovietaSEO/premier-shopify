# Independence Phone Shopify Store

This repository contains the Independence Phone theme, deferred-billing order flow, storefront operations bridge, launch documentation, and verification tooling for:

```text
jordan-mark-premier.myshopify.com
```

## Current Theme Roles

- Published theme: `151266459717`
- Unpublished client-QA theme: `151553245253`

Confirm roles with `shopify theme list` before any future theme operation. The repository does not designate a permanent rollback theme because that role can change.

The GitHub integration and merge in this repository do not publish a Shopify theme.

## Storefront Contract

The customer journey is:

```text
Homepage -> /pages/order-now -> /cart -> external final checkout
```

The public catalog is intentionally narrow:

- Classic Phone: `$100`, physical and shipping
- Rugged Phone: `$150`, physical and shipping
- Monthly or annual service: selected now, billed later
- Four optional add-ons or the add-on bundle: selected now, billed later

The retired Patriot Package is not part of the current order contract.

Shopify checkout is prepared to charge only the phone, tax, and one `$15` shipping charge today. Service and add-on variants are `$0.00`, non-taxable, and non-shipping in Shopify; their future prices and cadence travel as deferred-billing metadata. The Rev.io/API implementer still owns the final consent, desired area code, payment/billing schedule, provisioning, and reconciliation.

## Current Contact Path

Leave the Theme Editor `CRM endpoint URL` blank. The approved handoff uses Shopify native contact delivery with:

- Name
- Email
- optional Phone Number
- How can we Help?

Set Shopify Admin `Settings -> Notifications -> Sender email` to `jordan@premiercompanies.com`. Order notifications are configured separately for Mark and Jordan. Do not send test contact or order emails without client approval.

## Responsibilities

Shopify owns storefront pages, product data, cart state, physical-product checkout data, orders, and fulfillment.

The owner-hosted operations bridge verifies and records Shopify order evidence and can forward a signed `revio.checkout.requested` payload. It is not a payment gateway and does not contain the tenant-specific Rev.io implementation.

The external Rev.io/API implementer owns credentials, tenant mappings, final checkout/payment behavior, billing, provisioning, and reconciliation. Never place Rev.io credentials, raw card numbers, or CVV in Git, Liquid, browser JavaScript, Theme Editor settings, screenshots, or chat.

## Important Documents

- `CLIENT_HANDOFF_PACKET.md` — concise client handoff
- `GO_LIVE_RUNBOOK.md` — ordered launch and proof sequence
- `store-setup/LAUNCH_CHECKLIST.md` — Shopify Admin checklist
- `REVIO_INTEGRATION_HANDOFF.md` — deferred-billing v2 integration contract
- `ops/README.md` — operations bridge deployment and secret boundaries
- `independence-phone-theme/THEME_EDITOR_GUIDE.md` — owner-editable theme settings
- `spec.md` — implementation and QA specification

## Verification

Run the complete local gate:

```bash
npm run verify:local
```

The launch-readiness audit consumes separately collected live proof:

```bash
SHOPIFY_STORE=jordan-mark-premier.myshopify.com \
SHOPIFY_USE_CLI_SESSION=1 \
npm run launch:readiness
```

To update only the known unpublished QA theme after confirming its current role:

```bash
scripts/push-client-qa-theme.sh
```

The helper refuses to target the published theme. Publishing remains a separate owner-approved Shopify action.
