# INDEPENDENCE PHONE Shopify Store

This repository is the maintained source for the INDEPENDENCE PHONE Shopify storefront at `jordan-mark-premier.myshopify.com`. It contains the current live-theme snapshot, client operating guides, reproducible product setup data, and focused local checks.

It does **not** contain or claim to deploy a Rev.io backend, payment gateway, CRM, tax-filing system, or generic self-hosted replacement for Shopify.

## Current live theme

Verified with Shopify CLI on August 27, 2026:

- Theme: `Independence Phone QA 2026-07-23 Deferred v2`
- Theme ID: `151553245253`
- Repository source: [`independence-phone-theme/`](independence-phone-theme/)

Theme roles can change. Before any Shopify operation, run:

```bash
shopify theme list --store jordan-mark-premier.myshopify.com
```

Only `independence-phone-theme/` is maintained as theme source. A Git push does not publish Shopify, and a Shopify theme push is a separate live-store change requiring explicit approval and verification.

## Storefront contract

```text
Homepage → /pages/order-now → /cart → checkout
```

- Classic Phone: `$100`, physical, taxable, and shippable
- Rugged Phone: `$150`, physical, taxable, and shippable
- Monthly or annual service: selected now and represented as a `$0.00` deferred-billing line
- Optional add-ons: selected now and represented as `$0.00` deferred-billing lines
- Required Order Now field: `Requested area code`
- Optional Order Now field: `Discount/referral/customer ID`

Shopify charges the phone, applicable tax, and one `$15` shipping charge today. The zero-dollar service and add-on lines preserve the customer's choices; they do not create Rev.io billing or telephone service. A future, separately authorized server-side integration must validate the Shopify order and implement payment, billing, provisioning, telecom tax, webhooks, and reconciliation.

## Administrator guides

1. [Rev.io payment and provisioning](guides/REVIO_PAYMENT_AND_PROVISIONING_GUIDE.md)
2. [Contact form administration](guides/CONTACT_FORM_ADMINISTRATION_GUIDE.md)
3. [State sales-tax setup](guides/STATE_SALES_TAX_SETUP_GUIDE.md)
4. [Shopify store operations](guides/SHOPIFY_STORE_OPERATIONS_GUIDE.md)
5. [Domain, hosting, and ownership transfer](guides/DOMAIN_HOSTING_AND_OWNERSHIP_TRANSFER_GUIDE.md)

The Rev.io guide is an implementation and operating handoff, not evidence that an integration is currently hosted. The tax guide separates Shopify sales tax from Rev.io telecom tax and requires the client's accountant or tax adviser to confirm registrations before a state is enabled.

## Repository map

| Path | Purpose |
| --- | --- |
| `independence-phone-theme/` | Current deployable Shopify theme snapshot |
| `guides/` | Client and administrator operating guides |
| `store-setup/` | Product import and metafield source data |
| `scripts/` | Focused Shopify Admin setup, audit, and media helpers |
| `docs/decisions/` | Current architectural and operating decisions |
| `CHANGELOG.md` | Outcome-oriented repository changes |

Build-era specs, dated QA captures, creative source material, simulated previews, internal agent logs, and unapproved backend prototypes were removed from maintained `main`. They remain recoverable in Git history and at the preservation tag `archive/pre-cleanup-2026-08-27`.

## Synchronize from Shopify

Treat the live theme as the truth for deployed files. Pull it into a temporary directory first:

```bash
shopify theme pull \
  --store jordan-mark-premier.myshopify.com \
  --live \
  --path /tmp/independence-phone-live
shopify theme check --path /tmp/independence-phone-live
```

Compare only Shopify deployable directories—`assets`, `blocks`, `config`, `layout`, `locales`, `sections`, `snippets`, and `templates`—with `independence-phone-theme/`. Shopify may omit `config/settings_data.json`; that file is store-managed customization state and is intentionally not committed or pushed from this repository.

Never push to the live theme merely to make GitHub match it.

## Local verification

Install the Shopify CLI if it is not already available, then run:

```bash
npm run verify:local
```

The suite checks the retained Shopify helpers in dry-run/test mode and runs Shopify Theme Check. Commands that read or modify Shopify require the environment and approvals described in [store-setup/README.md](store-setup/README.md).
