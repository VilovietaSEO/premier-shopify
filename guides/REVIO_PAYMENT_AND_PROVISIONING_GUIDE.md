# Rev.io Payment and Provisioning Guide

Last reviewed: August 27, 2026

This guide explains how the INDEPENDENCE PHONE Shopify storefront hands an order to a server-side Rev.io integration. It does not claim that Rev.io payment or provisioning is already live.

## What the storefront already collects

The Order Now flow records:

- Classic Phone or Rugged Phone
- Monthly or annual service
- Optional add-ons
- The required three-digit answer to “What area code do you want INDEPENDENCE PHONE to have?”
- Optional `Discount/referral/customer ID`

The phone, applicable phone tax, and one `$15` shipping charge are due today. Service and add-ons are represented in Shopify as `$0.00` deferred-billing lines and begin billing on the first day of the following month. Those zero-dollar lines do not create a Rev.io customer, charge a card, reserve a telephone number, or schedule service by themselves.

## Responsibility split

Shopify owns the visible order flow, cart, physical phone order, line-item metadata, and fulfillment record. The owner-hosted operations bridge can validate Shopify order evidence and forward a signed request. The Rev.io implementer owns the tenant credentials, payment gateway, customer and product mappings, billing rules, number provisioning, retries, webhooks, and reconciliation.

Never put Rev.io credentials, raw card numbers, CVV, or tenant-only identifiers in Liquid, browser JavaScript, Theme Editor fields, screenshots, chat, or GitHub.

## Information the Rev.io administrator must supply

Before development or sandbox testing, obtain and record outside GitHub:

- Rev.io client code and sandbox credentials
- A dedicated API-only user and APIM subscription key
- Bill profile ID
- Customer class and required customer fields
- Service type and provider IDs
- Product IDs for monthly service, annual service, each add-on, and any device records Rev.io must receive
- Request status, assignment, and workflow IDs
- Payment gateway and tokenization method
- Telecom tax configuration and the party responsible for filings
- Number-inventory or provisioning rules, including how a requested area code is accepted, substituted, or rejected
- Referral/customer-ID interpretation and the exact Rev.io field where it belongs
- Webhook receiver events and reconciliation rules

Do not guess any of these values from Shopify titles or SKUs.

## Server setup

1. Deploy the owner-hosted operations bridge described in [`ops/README.md`](../ops/README.md).
2. Put secrets in the hosting provider's encrypted environment-variable or secret-management system.
3. Configure the Rev.io integration to receive `independence_phone.revio_checkout.v2`.
4. Validate every submitted Shopify variant, SKU, role, quantity, immediate price, future price, cadence, and first-bill rule against a server-side allowlist.
5. Map `Requested area code` and `Discount/referral code` from the Shopify setup to the approved Rev.io fields.
6. Use a hosted or tokenized payment flow. The Shopify theme and operations bridge must never handle raw card data.
7. Make checkout creation, customer creation, payment, provisioning, webhook processing, and retries idempotent.
8. Configure the live theme's **Cart → Rev.io checkout handoff URL** only after the endpoint is hosted, authenticated, and approved.

The lower-level payload contract and endpoint details are in [`REVIO_INTEGRATION_HANDOFF.md`](../REVIO_INTEGRATION_HANDOFF.md).

## Sandbox acceptance test

Do not enable production payment until a sandbox run proves all of the following:

1. A Classic Phone order and a Rugged Phone order each reach the server.
2. The phone price, `$15` shipping rule, service selection, add-ons, requested area code, and discount/referral/customer ID arrive intact.
3. The server rejects modified prices, unknown variants, retired SKUs, duplicate events, and unauthenticated requests.
4. The gateway tokenizes payment without exposing raw card data to Shopify or application logs.
5. The Rev.io customer and service records use the approved bill profile, provider, product, and tax mappings.
6. Future service billing is scheduled for the first day of the following month.
7. Area-code unavailability produces an explicit operator/customer resolution path instead of silently provisioning a different number.
8. Webhook retries do not create duplicate customers, payments, or service records.
9. The final Rev.io/customer identifier is written back to the reconciliation record.

Record sanitized request IDs, Shopify order numbers, Rev.io record IDs, timestamps, and final status. Do not save secrets or payment data in the proof.

## Production activation and rollback

Production activation requires written approval from the client, the Rev.io implementer, and the person responsible for tax/payment compliance. After switching to production credentials, place one approved low-risk order and reconcile Shopify, gateway, and Rev.io records end to end.

If checkout, payment, or provisioning fails, clear the live theme's Rev.io handoff URL or disable the server route according to the approved rollback plan. Do not delete orders or retry manually until the implementer checks idempotency state.

## Official references

- [Rev.io developer portal](https://developers.rev.io/)
- [Rev.io getting started](https://developers.rev.io/docs/getting-started)
- [Rev.io API management](https://developers.rev.io/docs/api-management.md)
- [Rev.io basic authentication](https://developers.rev.io/docs/basic-authentication.md)
- [Rev.io payments](https://developers.rev.io/docs/payments-1.md)
- [Rev.io webhooks](https://developers.rev.io/docs/webhooks.md)
