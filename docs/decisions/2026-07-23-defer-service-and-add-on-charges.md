# Defer service and add-on charges until the next billing cycle

- **Status:** Accepted
- **Date:** 2026-07-23
- **Scope:** Independence Phone order builder, Shopify cart and checkout handoff
- **Related:** `independence-phone-theme/sections/cart.liquid`, `independence-phone-theme/assets/ip-cart.js`, `independence-phone-theme/snippets/ip-order-builder-form.liquid`, `guides/REVIO_PAYMENT_AND_PROVISIONING_GUIDE.md`
- **Supersedes:** None
- **Superseded by:** None

## Context

The client wants Shopify to charge only the phone, applicable tax, and one $15 shipping fee at checkout. Service and add-ons should be free through the remainder of the current month and start billing on the first day of the following month. The external payment and Rev.io integration is not yet available, but the storefront must preserve every selection and present truthful current and future totals before that integration arrives.

## Decision

Keep service plans and add-ons as hidden Shopify billing-item variants with a checkout price of $0. Store their approved future prices, billing cadence, and first-bill rule as line-item metadata. Keep the selected phone as the only merchandise charge due today. Configure one $15 flat shipping rate per order. Collect the desired area code as a required line-item property on Order Now. Any future Rev.io integration must validate all selections server-side, implement its approved payment boundary, and provision future billing.

## Drivers

- Shopify checkout must not charge service or add-ons before the first day of the following month.
- Separate billing-item lines preserve readable checkout/order evidence and stable SKU-to-Rev.io mappings.
- The theme can finish cart presentation and payload preparation without storing credentials or pretending to create recurring billing.
- The retired Patriot Package must not remain in the new contract.

## Alternatives considered

### Keep service and add-ons as priced Shopify lines

This matches the original implementation, but it would charge those items immediately and directly contradict the client's billing-timing instruction.

### Store all service and add-on choices only as phone properties

This avoids zero-dollar lines, but weakens line-level checkout visibility, media, SKU mapping, fulfillment reconciliation, and the future Rev.io handoff.

### Implement Shopify selling plans now

Selling plans could model recurring billing, but the approved operating direction is an external Rev.io/payment integration. Adding a separate subscription system now would create overlapping billing ownership.

## Consequences

- **Positive:** The cart and Shopify order can truthfully separate today's equipment charge from future service commitments before the gateway exists.
- **Positive:** The external developer receives stable line roles, SKUs, nominal future prices, and first-bill timing instead of having to reinterpret display copy.
- **Negative:** Zero-dollar billing variants do not themselves schedule or collect future payments.
- **Negative:** The required area code is preserved in Shopify order metadata but is not a number reservation; availability and substitution still require a server-side provisioning workflow.

## Revisit when

- The client selects the final gateway and confirms whether Shopify or Rev.io owns today's payment.
- The Rev.io tenant supplies product, service, tax, billing-profile, and webhook identifiers.
- The business changes the $15-per-order shipping rule or the first-of-next-month billing rule.
