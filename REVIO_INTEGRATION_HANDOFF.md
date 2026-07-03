# Rev.io Integration Handoff

Date: 2026-07-03

Purpose: align the Independence Phone Shopify storefront with Rev.io payment and billing integration so the API implementer can wire checkout, cart lines, CRM records, and webhook reconciliation without changing the public merchandising model.

## Executive Decision

Rev.io should be integrated server-side. Do not put Rev.io API keys, APIM subscription keys, Basic Auth credentials, raw payment data, or payment-processing calls inside Shopify Liquid or browser JavaScript.

The current storefront direction is compatible with Rev.io if the final checkout action becomes a backend handoff. This repo now includes that bridge:

- Theme setting: `Cart -> Rev.io checkout handoff URL`.
- Theme payload schema: `independence_phone.revio_checkout.v1`.
- Ops receiver: `POST /revio/checkout`.
- Outbound event to API middleware: `revio.checkout.requested`.

1. The customer uses the theme to choose phone, plan, and add-ons.
2. Shopify cart receives the visible phone item plus hidden/priced billing items.
3. The cart page sends the complete setup payload to a server endpoint.
4. The server validates prices and consent, creates or updates Rev.io records, creates the service request/products/bill/payment flow, stores CRM proof, and redirects the customer to the approved next step.

The native Shopify checkout button is not the final Rev.io payment path unless the business intentionally keeps Shopify checkout as the payment processor. If Rev.io is the processor, the checkout button should become a server-side Rev.io checkout handoff before launch.

## Official Documentation

Primary developer surface:

- Rev.io developer portal: https://developers.rev.io/
- Rev.io LLM/docs index: https://developers.rev.io/llms.txt
- Getting started workflow: https://developers.rev.io/docs/getting-started
- API management: https://developers.rev.io/docs/api-management.md
- Basic authentication: https://developers.rev.io/docs/basic-authentication.md
- Payments guide: https://developers.rev.io/docs/payments-1.md
- Webhooks guide: https://developers.rev.io/docs/webhooks.md
- Webhook receivers: https://developers.rev.io/docs/webhook-receivers.md
- Webhook subscriptions: https://developers.rev.io/docs/webhook-subscriptions.md
- Webhook notifications: https://developers.rev.io/docs/webhook-notifications.md

Key REST reference pages for this build:

- Create customer: https://developers.rev.io/reference/postv1_customers-1.md
- Search bill profiles: https://developers.rev.io/reference/getv1_billprofiles-1.md
- Search products: https://developers.rev.io/reference/getv1_products-1.md
- Create request: https://developers.rev.io/reference/postv1_requests-1.md
- Create request service: https://developers.rev.io/reference/postv1_requestservices-1.md
- Create request product: https://developers.rev.io/reference/postv1_requestproducts-1.md
- Create bill: https://developers.rev.io/reference/postv1_bills.md
- Create charge: https://developers.rev.io/reference/postv1_charges.md
- Create payment: https://developers.rev.io/reference/postv1_payments.md
- Create card payment: https://developers.rev.io/reference/postv1_payments_card.md
- Create card payment account: https://developers.rev.io/reference/postv1_paymentaccounts_paymentcard.md
- Search payments: https://developers.rev.io/reference/getv1_payments.md
- Search orders: https://developers.rev.io/reference/getv1_orders-1.md

Do not use `revio.docs.apiary.io` for this integration. The public APIary document found during research is a sample/placeholder Polls API, not the Rev.io billing API.

## Auth And Security Requirements

Rev.io API calls require server-side credentials. The docs describe an APIM subscription key header and Basic Auth using a Rev.io API user:

- `Ocp-Apim-Subscription-Key: <client APIM key>`
- Basic Auth credential format: `username@clientcode:password`
- Base REST API host: `https://restapi.rev.io`

Implementation requirements:

- Store credentials only in server environment variables.
- Use a dedicated Rev.io API-only user for this integration.
- Use sandbox credentials until end-to-end tests pass.
- Never collect, store, log, or transmit raw card numbers or CVV from the theme.
- Tokenized card data must come from the approved Rev.io/gateway flow.
- The theme can collect consent and cart choices, but the server must validate all prices and product mappings.

## Storefront Button Alignment

Homepage and product CTAs:

- `Order now` can route to the order builder or the narrow product collection.
- Product pages can still present the same add-ons and service plan choices.
- The public catalog should stay narrow: Classic Phone, Rugged Phone, and the consumer-facing Patriot Package framing.

Order builder submit:

- Current function: add the selected phone plus priced hidden billing items into the Shopify cart.
- Keep this behavior. It produces line-level products that Rev.io and payment reconciliation can map cleanly.

Cart update:

- Current function: update Shopify cart quantities and keep hidden setup items aligned with the parent phone.
- Keep this as a local cart-management action.

Cart checkout:

- Required final function: hand off to the server for Rev.io checkout.
- Implemented endpoint shape: `POST /revio/checkout`.
- Shopify app proxy version: `POST /apps/independence-phone/revio/checkout`.
- The endpoint should return a redirect URL, order confirmation URL, or error response.
- The native checkout behavior remains when the cart section `Rev.io checkout handoff URL` setting is blank.
- When the setting is filled, the button posts the normalized cart payload to that URL and follows `redirect_url` or `checkout_url` from the JSON response.

Launch blocker:

- If Rev.io is the actual payment processor, native Shopify checkout cannot be treated as finished until it is replaced by or wrapped with the Rev.io backend checkout handoff.

## Current Cart Payload Contract

The theme should send one setup group per selected phone configuration. Each line needs enough information to reconstruct the sale on the server.

Required setup fields:

- `schema`: `independence_phone.revio_checkout.v1`.
- `setup_id`: stable client-generated setup group ID.
- `cart_token`: Shopify cart token if available.
- `source_url`: page URL that submitted the setup.
- `policy_agreed`: true only if privacy policy and terms were accepted.
- `policy_agreed_at`: timestamp generated server-side.
- `customer`: email, phone, name, billing address, service address, and any contact form fields available.
- `lines`: normalized array of products and billing items.

Required line fields:

- `role`: `phone`, `service`, `addon`, `addon_bundle`, `package`, `shipping`, or `discount`.
- `shopify_product_id`
- `shopify_variant_id`
- `shopify_handle`
- `sku`
- `title`
- `quantity`
- `unit_price_cents`
- `currency`
- `billing_name`
- `billing_value`
- `setup_phone`
- `requires_shipping`
- `taxable`

Server validation:

- Do not trust prices sent from the browser.
- Validate every line against a server-side allowlist of Shopify variant IDs and expected prices.
- Reject a checkout if required setup lines are missing.
- Reject a checkout if hidden billing lines do not match the visible phone quantity.
- Use an idempotency key derived from cart token plus setup ID to prevent duplicate Rev.io records.

## Quantity Model

Default behavior should remain per-phone.

If a customer chooses quantity 2 with add-ons selected, each selected service/add-on/package line should also have quantity 2. That means two phones and two matching service/add-on commitments.

If the business needs one phone with add-ons and one phone without add-ons in the same purchase, the UI should create two separate setup groups. Do not overload a single quantity selector to represent mixed configurations.

## Product Mapping For API Implementer

The final Rev.io `product_id`, `bill_profile_id`, `service_type_id`, `provider_id`, package IDs, tax classes, and status IDs must come from the client's Rev.io tenant.

| Storefront item | Shopify handle/status | Rev.io target | Price expectation |
| --- | --- | --- | --- |
| Classic Phone | visible phone product, current handle may still be `standard-phone` | one-time equipment `RequestProduct` or `Charge` | $100 one time |
| Rugged Phone | visible phone product | one-time equipment `RequestProduct` or `Charge` | $150 one time |
| Monthly service | hidden billing product | recurring service `RequestProduct` | $17.76/mo |
| Annual service | hidden billing product | annual/prepaid service `RequestProduct` | $200/yr |
| Auto Attendant | hidden add-on product | recurring add-on `RequestProduct` | $5/mo |
| Call Recording | hidden add-on product | recurring add-on `RequestProduct` | $5/mo |
| Quiet Hours | hidden add-on product | recurring add-on `RequestProduct` | $5/mo |
| Voicemail to Email | hidden add-on product | recurring add-on `RequestProduct` | $5/mo |
| Add-on bundle | hidden bundle product | bundle `RequestProduct` or package line representing all 4 add-ons | $10/mo |
| Patriot Package | public package framing plus hidden package/billing line | Rev.io package, discount, or balancing line as agreed with Rev.io | $250 total public offer |
| Shipping | cart/order fee | shipping charge or Shopify-only fulfillment fee | $15 per phone |

Patriot Package modeling needs an explicit API decision. Publicly it should remain simple: Classic Phone, 1 year service, all 4 add-ons, $250. Behind the scenes it can be a Rev.io package, a set of request products plus discount, or a balancing product line if accounting approves that approach.

## Recommended Rev.io Workflow

1. Search bill profiles with `GET /v1/BillProfiles`.
2. Create or match customer with `POST /v1/Customers`.
3. Search Rev.io product catalog with `GET /v1/Products`.
4. Create a service setup request with `POST /v1/Requests`.
5. Create the request service with `POST /v1/RequestServices`.
6. Add phone, service plan, add-ons, bundle, or package with `POST /v1/RequestProducts`.
7. If immediate invoicing is required, create charges with `POST /v1/Charges` and/or bill with `POST /v1/Bills`.
8. If immediate payment is required, create payment account or card payment only with tokenized gateway data:
   - `POST /v1/PaymentAccounts/paymentcard`
   - `POST /v1/Payments/card`
   - `POST /v1/Payments`
9. Store returned Rev.io IDs on the local CRM sale record and Shopify order/cart note attributes where available.
10. Reconcile through Rev.io webhooks and search endpoints.

## Webhook Events To Configure

Subscribe the backend receiver to the events needed for order and payment lifecycle tracking:

- Customer created
- Customer status changed
- Request created
- Request status changed
- Order created
- Order status changed
- Charge created
- Bill created
- Payment created
- Payment voided
- Payment reversed
- Payment auto debit success
- Payment auto debit failure

Inbound webhook requirements:

- Verify receiver activation according to Rev.io's webhook receiver flow.
- Persist the full event ID, event type, created date, object ID, and received timestamp.
- Update the CRM sale record by Rev.io customer/request/order/payment IDs.
- Keep raw webhook payloads in a secure server log or database table for audit.
- Make processing idempotent by Rev.io event ID.

## CRM Requirements

Contact forms and purchase attempts both need CRM entries.

Contact lead record:

- Lead type: `contact_form`.
- Captured fields: all form fields.
- Captured metadata: submitted at, source page, user agent if available, IP if permitted, consent flags if present.
- Outbound action: forward to configured webhook destinations.

Purchase lead/sale record:

- Lead type: `cart_started`, `checkout_started`, `revio_request_created`, `payment_pending`, `payment_succeeded`, `payment_failed`, or `cancelled`.
- Captured fields: all checkout/contact fields, full normalized setup payload, consent, cart token, and Shopify line IDs.
- Rev.io IDs: customer ID, request ID, request service IDs, request product IDs, bill ID, payment ID, order ID if available.
- Outbound action: forward sale events to configured webhook destinations.

## API Questions To Resolve

The API implementer needs these answers before final wiring:

1. Which Rev.io tenant/client code is this store using?
2. Is there a Rev.io sandbox tenant?
3. Who creates the APIM subscription key and API-only user?
4. Which `bill_profile_id` should web customers use?
5. Which `request_status_id`, `assigned_to`, process IDs, and phase IDs should a web checkout use?
6. Which `service_type_id` and `provider_id` represent Independence Phone service?
7. What are the exact Rev.io `product_id` values for Classic Phone, Rugged Phone, monthly service, annual service, each add-on, add-on bundle, Patriot Package, shipping, and discounts?
8. Should web checkout create only a request, or should it also create charges, bills, and payments immediately?
9. Does Rev.io provide a hosted checkout/payment portal link for this account?
10. If hosted checkout is not available, which gateway tokenizes card data before calling Rev.io payment endpoints?
11. How should sales tax, telecom fees, and shipping be modeled?
12. Should Shopify orders be created before Rev.io payment, after Rev.io payment, or only after successful Rev.io reconciliation?
13. Which Rev.io webhook events are enabled for the tenant?
14. What endpoint and secret should Rev.io use for webhook receiver activation?

## Implemented Bridge Configuration

Theme setting:

```text
Online Store -> Themes -> Customize -> Cart -> Rev.io checkout handoff URL
```

Recommended value when routed through the ops service:

```text
https://www.example.com/revio/checkout
```

Ops variables:

```text
REVIO_CHECKOUT_WEBHOOK_URLS=https://api-implementer.example.com/revio-checkout
REVIO_WEBHOOK_SECRET=<long random signing secret>
REVIO_CHECKOUT_SUCCESS_URL=https://jordan-mark-premier.myshopify.com/cart?revio_checkout=received
REVIO_CHECKOUT_ALLOWED_ORIGINS=https://jordan-mark-premier.myshopify.com
```

The ops receiver does not call Rev.io directly. It stores the checkout intent in the CRM and forwards a signed `revio.checkout.requested` webhook to the configured middleware. That middleware is where the API implementer should translate the payload into Rev.io `Customers`, `Requests`, `RequestServices`, `RequestProducts`, bills, charges, or tokenized payments.

The signed outbound webhook includes:

- `event`: `revio.checkout.requested`.
- `record.fields`: normalized CRM/sale fields.
- `record.meta`: cart token, setup IDs, schema, total cents, and dedupe key.
- `record.revio_checkout_payload`: parsed checkout payload object for direct API mapping.

## Done Definition

Docs proof:

- Developer portal and `llms.txt` are reachable.
- API implementer can open every linked guide/reference page above.
- Old APIary URL is documented as not usable.

Payload proof:

- Test checkout payload contains one `setup_id`, accepted policy fields, customer fields, and normalized lines.
- Hidden billing lines have the same quantity as the parent phone.
- Mixed configurations produce separate setup groups.
- Server rejects tampered browser prices.

Rev.io sandbox proof:

- A Classic monthly setup creates or matches a customer, request, request service, and request products.
- A Rugged annual setup creates the expected annual product mapping.
- A Patriot Package setup creates the agreed package/discount/product structure.
- Returned Rev.io IDs are stored in CRM records.

Payment proof:

- No raw card number or CVV appears in browser requests to the theme, server logs, Shopify notes, or CRM records.
- Tokenized payment flow creates a Rev.io payment or payment account in sandbox.
- Failed payment creates a CRM status update and user-visible error.
- Successful payment creates a CRM status update and user-visible confirmation.

Webhook proof:

- Rev.io sends at least one test notification to the backend receiver.
- Receiver stores event ID, event type, object ID, and timestamp.
- Duplicate webhook delivery does not duplicate CRM actions.
- Payment and order/request status changes update the correct CRM sale record.

Launch proof:

- Cart checkout no longer depends on native Shopify payment processing when Rev.io is the processor.
- All purchase buttons eventually lead to either the order builder or the Rev.io checkout handoff.
- The public catalog remains narrow and does not expose hidden service/add-on products as a broad product grid.
- Privacy policy and terms acceptance is required before checkout handoff.
- API credentials are absent from Liquid, JavaScript, rendered HTML, and browser network payloads.
