# Independence Phone Client Handoff

## Store And Theme

- Store: `jordan-mark-premier.myshopify.com`
- Published theme: `151266459717`
- Unpublished QA theme: `151553245253`

Theme roles were verified during the July 23, 2026 QA work. Re-run `shopify theme list` before any later push or publish. Merging this repository does not publish the QA theme.

## Customer Experience

The intended path is:

```text
Homepage -> Order Now -> Cart -> final checkout
```

Order Now presents:

1. Classic Phone or Rugged Phone
2. Monthly or annual service
3. Optional individual add-ons or the add-on bundle

The order form uses the approved front-facing and rotating phone media. The Patriot Package has been retired from the customer-facing purchase contract.

## What Shopify Charges

Shopify is prepared to represent:

- Phone price due today
- one `$15` shipping charge per order
- tax calculated after the shipping address
- service and add-ons as `$0.00` deferred-billing lines

The cart shows future service and add-on amounts separately. These future charges are not collected by Shopify today.

The external Rev.io/API checkout still must collect final Privacy Policy and Terms acceptance once, require the desired area code, tokenize or collect payment through the approved provider, establish the future billing schedule, and return a confirmation result.

## Product And Shipping Model

Only the phones are physical products:

- Classic Phone — `$100`
- Rugged Phone — `$150`

Service and add-on selections are non-shipping and non-taxable in Shopify. Their future charge, cadence, and first-bill rule are stored as order metadata for the Rev.io handoff.

## Contact And Notifications

The current Contact page contains only:

- Name
- Email
- optional Phone Number
- How can we Help?
- Send

Leave the Theme Editor `CRM endpoint URL` blank so Shopify native contact handling is used. Set the Shopify sender email to `jordan@premiercompanies.com`.

Order notifications are separate from Contact delivery and should include:

- `mark@premiercompanies.com`
- `jordan@premiercompanies.com`

Do not submit external contact-form tests or place test orders without client approval.

## Admin Access

- Keep the developer as an administrator for ongoing development.
- Add Jordan and Mark with the access needed to operate the store.
- Give the Rev.io/API developer least-privilege access limited to the integration work.
- Require two-step authentication.
- Do not grant payment or bank-setting access unless the owner explicitly approves it.

## External Work Still Required

The repository completes the pre-gateway storefront and handoff contract. Launch still depends on:

- Rev.io sandbox credentials and tenant mappings
- approved hosted/tokenized payment flow
- final checkout handling for consent and desired area code
- Rev.io billing, provisioning, and reconciliation proof
- exact `$15` shipping-rate configuration in Shopify Admin
- business address, tax registrations, nexus, and telecom-fee decisions
- public domain/DNS/hosting decisions outside this Shopify store
- client-approved end-to-end test order

## Security Boundary

The owner-hosted operations bridge verifies, records, and forwards signed order evidence. It is not the Rev.io tenant integration or a payment gateway.

Never store Rev.io tenant credentials, raw card numbers, or CVV in the theme, browser code, Git, Theme Editor settings, screenshots, or chat. Server secrets belong only in the hosted environment.

## Handoff Proof

Before launch, confirm:

- `npm run verify:local` passes
- the intended unpublished QA theme is visually approved on desktop and mobile
- the live/QA theme roles are re-verified
- public password/domain behavior is approved
- legal pages and links resolve
- native Contact delivery is approved and proven
- the external Rev.io checkout passes sandbox tests
- Shopify checkout presents only one `$15` shipping option
- one approved Classic order and one approved Rugged order complete end to end

See `GO_LIVE_RUNBOOK.md`, `store-setup/LAUNCH_CHECKLIST.md`, and `REVIO_INTEGRATION_HANDOFF.md` for the detailed operator sequence.
