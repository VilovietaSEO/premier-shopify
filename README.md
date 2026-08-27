# INDEPENDENCE PHONE Shopify Store

This repository contains the live INDEPENDENCE PHONE Shopify theme, deferred-billing order flow, owner-hosted operations bridge, administrator guides, and verification tooling for:

```text
jordan-mark-premier.myshopify.com
```

## Current Live Theme

Verified directly with Shopify CLI on August 27, 2026:

- Live theme: `Independence Phone QA 2026-07-23 Deferred v2`
- Live theme ID: `151553245253`
- Canonical GitHub theme directory: [`independence-phone-theme/`](independence-phone-theme/)

Theme names and roles can change. Run `shopify theme list --store jordan-mark-premier.myshopify.com` before every pull, push, preview, or publish operation. Never rely on an old hard-coded “QA” or “live” ID.

Only `independence-phone-theme/` is the current theme source stored in GitHub. Historical QA reports can mention older themes, but `refresh-overlay/` is not a current theme source. GitHub version control does not publish a Shopify theme, and pulling the live theme does not change the storefront.

## Current Storefront Contract

The customer journey is:

```text
Homepage → /pages/order-now → /cart → final checkout/handoff
```

The public catalog is intentionally narrow:

- Classic Phone: `$100`, physical, taxable, and shipping
- Rugged Phone: `$150`, physical, taxable, and shipping
- Monthly or annual service: selected now and billed later
- Four optional add-ons or the add-on bundle: selected now and billed later

The Order Now page also collects:

- Required three-digit `Requested area code` using “What area code do you want INDEPENDENCE PHONE to have?”
- Optional `Discount/referral/customer ID`

Shopify is prepared to charge only the phone, applicable tax, and one `$15` shipping charge today. Service and add-on variants are `$0.00`, non-taxable, and non-shipping in Shopify; their future prices and billing cadence travel as deferred-billing metadata. Selected service and add-ons begin billing on the first day of the following month only after the server-side Rev.io integration creates and schedules them.

The retired Patriot Package is not part of the current order contract.

## Current Integration Status

Shopify owns storefront pages, product data, cart state, physical-product checkout data, orders, and fulfillment.

The owner-hosted operations bridge can verify Shopify order evidence and forward a signed `revio.checkout.requested` payload. It is not a payment gateway and does not supply tenant-specific Rev.io mappings.

The Rev.io/API implementer still owns credentials, hosted/tokenized payment, tenant mappings, billing, number provisioning, telecom tax, webhooks, and reconciliation. The storefront must not be described as payment-and-provisioning complete until the approved sandbox and production tests pass.

Never place Rev.io credentials, raw card numbers, CVV, or private tenant mappings in GitHub, Liquid, browser JavaScript, Theme Editor settings, screenshots, or chat.

## Contact and Tax Status

The approved Contact page uses Shopify's native contact form while **CRM endpoint URL** is blank. Native submissions go to the Sender email configured under **Settings → Notifications**; the documented handoff address is `jordan@premiercompanies.com`. Do not send a delivery test without client approval.

The Shopify tax screen was last directly verified on August 4, 2026: Shopify Tax was active, but no US states were enabled for collection. Recheck Shopify Admin before relying on that state. Enable a state only after the client or accountant confirms an active registration. Rev.io telecom tax is a separate configuration.

## Administrator Guides

1. [Rev.io Payment and Provisioning Guide](guides/REVIO_PAYMENT_AND_PROVISIONING_GUIDE.md)
2. [Contact Form Administration Guide](guides/CONTACT_FORM_ADMINISTRATION_GUIDE.md)
3. [State Sales-Tax Setup Guide](guides/STATE_SALES_TAX_SETUP_GUIDE.md)
4. [Shopify Store Operations Guide](guides/SHOPIFY_STORE_OPERATIONS_GUIDE.md)
5. [Domain, Hosting, and Ownership Transfer Guide](guides/DOMAIN_HOSTING_AND_OWNERSHIP_TRANSFER_GUIDE.md)

Technical references:

- [`REVIO_INTEGRATION_HANDOFF.md`](REVIO_INTEGRATION_HANDOFF.md) — versioned deferred-billing payload and server contract
- [`ops/README.md`](ops/README.md) — operations bridge deployment and secret boundaries
- [`store-setup/LAUNCH_CHECKLIST.md`](store-setup/LAUNCH_CHECKLIST.md) — detailed Shopify Admin checklist
- [`CLIENT_HANDOFF_PACKET.md`](CLIENT_HANDOFF_PACKET.md) — earlier handoff summary; verify dated theme roles against this README
- [`spec.md`](spec.md) — implementation and QA history

## Synchronize From the Live Theme

Use the live Shopify theme as the source of truth. Pull it into a temporary directory first:

```bash
shopify theme list --store jordan-mark-premier.myshopify.com
shopify theme pull \
  --store jordan-mark-premier.myshopify.com \
  --live \
  --path /tmp/independence-phone-live
shopify theme check --path /tmp/independence-phone-live
```

Compare and synchronize only Shopify deployable directories—`assets`, `blocks`, `config`, `layout`, `locales`, `sections`, `snippets`, and `templates`—into `independence-phone-theme/`. Preserve repository documentation outside those directories. Shopify CLI can omit `config/settings_data.json`; treat it as store-managed customization data and do not delete or overwrite it blindly.

Never push to the live theme merely to make GitHub match it. A live push is a separate storefront change requiring explicit approval, narrow scope, Theme Check, responsive verification, and rollback proof.

## Local Verification

Run Theme Check on the canonical snapshot:

```bash
npm run theme:check
```

Run the broader local test suite when changing application or storefront behavior:

```bash
npm run verify:local
```

The broader suite can require local dependencies and operational fixtures. Historical proof and old theme IDs are not evidence of the current live role.
