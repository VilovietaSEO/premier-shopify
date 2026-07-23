# Rev.io Integration Handoff

Date: 2026-07-23

Purpose: give the Rev.io/payment implementer a stable, versioned contract for the Independence Phone checkout without moving credentials, payment processing, recurring billing, or tenant-specific Rev.io logic into Shopify Liquid or browser JavaScript.

## Accepted Commerce Contract

The accepted contract is `independence_phone.revio_checkout.v2`.

- Shopify charges only the selected phone today.
- Shopify adds selected service and add-ons as hidden billing-product lines priced at `$0.00`.
- The selected service and add-ons begin billing on the first day of the following month.
- The cart and checkout must distinguish today's charge from future recurring charges.
- Shipping is one flat `$15` fee per order, not per phone.
- Tax is calculated after the customer enters a taxable address.
- The final Rev.io/gateway checkout, or a Shopify Plus checkout extension, collects required Privacy Policy/Terms consent and the required desired area code.
- Consent and desired area code must not be collected a second time in the Order Now page or cart.
- The retired Patriot Package is not part of this contract.
- Service and add-on checkout lines use the approved American-flag media so `$0.00` operational lines do not look like broken or image-less products.

The native Shopify cart remains useful before the gateway is connected: it preserves the selected phone, service, add-ons, stable SKUs, future prices, billing cadence, and first-bill timing. Zero-dollar service/add-on lines do not schedule or collect future payments by themselves.

## Ownership And Current Boundary

### Storefront and catalog obligations

These are owned by this Shopify repository and can be finished before Rev.io credentials or a payment gateway are available:

- Keep the public purchase path focused on Classic Phone, Rugged Phone, service plan, and optional add-ons.
- Keep service/add-on products hidden from public catalog discovery.
- Price each service/add-on Shopify variant at `$0.00`, mark it non-shipping, and keep its stable SKU.
- Add one phone line plus the selected zero-dollar service/add-on lines to the cart with one shared `setup_id`.
- Carry validated `future_charge_cents`, `billing_cadence`, and `first_bill_rule` metadata for every future-billed line.
- Show phone-only merchandise due today, `$15` shipping per order, tax pending until address, and a separate future-charge total.
- Use the approved phone media for phone lines and American-flag media for service/add-on lines.
- Emit `independence_phone.revio_checkout.v2` when a handoff endpoint is configured.
- Allow customers to update or remove a complete setup before checkout.
- Do not duplicate policy consent or desired-area-code fields in Order Now or cart.

### External Rev.io/gateway obligations

These remain with the Rev.io/payment implementer:

- Supply Rev.io tenant credentials, sandbox access, product IDs, bill profile, service type, provider, tax, request, status, and webhook mappings.
- Receive and authenticate the v2 payload through the approved server-side handoff.
- Revalidate every Shopify variant, SKU, quantity, role, immediate price, future price, cadence, and first-bill rule against a server-side allowlist.
- Collect required Privacy Policy/Terms consent and the required desired area code exactly once at the final checkout step.
- Tokenize payment details through an approved hosted or gateway flow. Never send raw card numbers or CVV through the theme.
- Calculate tax after the customer provides an address.
- Charge today only for the phone, applicable tax, and the single `$15` order shipping fee.
- Create the Rev.io customer/request/service/product records and schedule selected service/add-ons for the first day of the following month.
- Make checkout creation, payment, provisioning, webhook handling, and retries idempotent.
- Return the approved redirect or confirmation URL and reconcile final status back to Shopify/CRM.

The storefront must not be described as payment-complete until this external path passes sandbox and end-to-end proof.

## Server-Side Integration Only

Do not put Rev.io API keys, APIM subscription keys, Basic Auth credentials, payment tokens, raw payment data, or tenant mappings in Liquid, theme JavaScript, rendered HTML, line-item properties, cart attributes, or browser logs.

The repository bridge is:

- Theme setting: `Cart -> Rev.io checkout handoff URL`.
- Payload schema: `independence_phone.revio_checkout.v2`.
- Ops receiver: `POST /revio/checkout`.
- Shopify app-proxy option: `POST /apps/independence-phone/revio/checkout`.
- Signed outbound event: `revio.checkout.requested`.

When the handoff URL is blank, the storefront can be reviewed through the native cart, but production checkout is not complete. When the URL is configured, the cart sends the normalized payload and follows the returned `redirect_url` or `checkout_url`.

## Official Rev.io Documentation

Primary developer surface:

- Rev.io developer portal: https://developers.rev.io/
- Rev.io LLM/docs index: https://developers.rev.io/llms.txt
- Getting started: https://developers.rev.io/docs/getting-started
- API management: https://developers.rev.io/docs/api-management.md
- Basic authentication: https://developers.rev.io/docs/basic-authentication.md
- Payments: https://developers.rev.io/docs/payments-1.md
- Webhooks: https://developers.rev.io/docs/webhooks.md
- Webhook receivers: https://developers.rev.io/docs/webhook-receivers.md
- Webhook subscriptions: https://developers.rev.io/docs/webhook-subscriptions.md
- Webhook notifications: https://developers.rev.io/docs/webhook-notifications.md

Relevant REST references:

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

Do not use `revio.docs.apiary.io`; the public document found there is a sample Polls API, not the Rev.io billing API.

## Authentication And Payment Security

Rev.io documentation describes:

- Header: `Ocp-Apim-Subscription-Key: <client APIM key>`
- Basic Auth format: `username@clientcode:password`
- REST API host: `https://restapi.rev.io`

Requirements:

- Store credentials only in server environment variables or an approved secret manager.
- Use a dedicated Rev.io API-only user.
- Use sandbox credentials until end-to-end proof passes.
- Use a hosted/tokenized gateway path for card data.
- Never collect, persist, log, or forward raw card numbers or CVV through Shopify theme code, the ops receiver, or CRM.

## Shopify Catalog Contract

The two public phone variants keep their immediate prices. The seven supported hidden billing variants use a `$0.00` Shopify checkout price and retain their nominal future prices in validated metadata.

| Item | Shopify handle | Stable SKU | Checkout price | Future charge | Cadence |
| --- | --- | --- | ---: | ---: | --- |
| Classic Phone | `standard-phone` | `PP-CLASSIC-PHONE` | `$100.00` | none | one time |
| Rugged Phone | `rugged-phone` | `PP-RUGGED-PHONE` | `$150.00` | none | one time |
| Monthly Service | `monthly-service` | `PP-MONTHLY-SERVICE` | `$0.00` | `$17.76` | monthly |
| Annual Service | `annual-service` | `PP-ANNUAL-SERVICE` | `$0.00` | `$200.00` | annual |
| Call Recording | `call-recording` | `PP-ADDON-CALL-RECORDING` | `$0.00` | `$5.00` | monthly |
| Quiet Hours | `family-quiet-hours` | `PP-ADDON-FAMILY-QUIET-HOURS` | `$0.00` | `$5.00` | monthly |
| Voicemail to Email | `voicemail-to-email` | `PP-ADDON-VOICEMAIL-TO-EMAIL` | `$0.00` | `$5.00` | monthly |
| Auto Attendant | `auto-attendant` | `PP-ADDON-AUTO-ATTENDANT` | `$0.00` | `$5.00` | monthly |
| Add-on Bundle | `add-on-bundle` | `PP-ADDON-BUNDLE` | `$0.00` | `$10.00` | monthly |

All service and add-on lines use `first_day_of_next_month` as `first_bill_rule`. The external service must reject the retired `PP-PATRIOT-PACKAGE` SKU and any `package` role in a v2 payload.

## `independence_phone.revio_checkout.v2` Payload

The theme sends one setup group per selected phone configuration. Mixed configurations use separate setup IDs.

Example:

```json
{
  "schema": "independence_phone.revio_checkout.v2",
  "source": "shopify-theme-cart",
  "occurred_at": "2026-07-23T18:00:00.000Z",
  "source_url": "https://store.example/cart",
  "referrer": "https://store.example/pages/order-now",
  "consent": {
    "collection_status": "pending_checkout",
    "privacy_terms_accepted": null
  },
  "customer": {
    "desired_area_code": null,
    "desired_area_code_collection_status": "required_at_checkout"
  },
  "cart": {
    "token": "shopify-cart-token",
    "currency": "USD",
    "item_count": 1,
    "raw_item_count": 3,
    "immediate_subtotal_cents": 10000,
    "flat_shipping_cents": 1500,
    "tax_cents": null,
    "tax_status": "calculated_after_address",
    "due_today_before_tax_cents": 11500,
    "future_charge_cents": 2276,
    "first_bill_rule": "first_day_of_next_month",
    "shopify_total_price_cents": 10000,
    "shopify_items_subtotal_price_cents": 10000,
    "total_discount_cents": 0
  },
  "setup_count": 1,
  "setups": [
    {
      "setup_id": "ip-setup-...",
      "quantity": 1,
      "phone_line": {
        "role": "phone",
        "sku": "PP-CLASSIC-PHONE"
      },
      "lines": [
        {
          "line_index": 1,
          "key": "shopify-line-key",
          "role": "phone",
          "setup_id": "ip-setup-...",
          "setup_parent": false,
          "shopify_product_id": 123,
          "shopify_variant_id": 456,
          "shopify_handle": "standard-phone",
          "sku": "PP-CLASSIC-PHONE",
          "title": "Classic Phone",
          "quantity": 1,
          "checkout_price_cents": 10000,
          "checkout_line_price_cents": 10000,
          "future_charge_cents": 0,
          "future_line_charge_cents": 0,
          "billing_cadence": "",
          "first_bill_rule": "",
          "currency": "USD",
          "requires_shipping": true,
          "taxable": true,
          "visible_properties": []
        },
        {
          "line_index": 2,
          "key": "shopify-line-key",
          "role": "service",
          "setup_id": "ip-setup-...",
          "setup_parent": true,
          "setup_billing_name": "Service plan",
          "setup_billing_value": "Monthly service",
          "setup_phone": "Classic Phone",
          "shopify_product_id": 789,
          "shopify_variant_id": 1011,
          "shopify_handle": "monthly-service",
          "sku": "PP-MONTHLY-SERVICE",
          "title": "Monthly Service",
          "quantity": 1,
          "checkout_price_cents": 0,
          "checkout_line_price_cents": 0,
          "future_charge_cents": 1776,
          "future_line_charge_cents": 1776,
          "billing_cadence": "monthly",
          "first_bill_rule": "first_day_of_next_month",
          "currency": "USD",
          "requires_shipping": false,
          "taxable": false,
          "visible_properties": [
            {
              "name": "Future charge",
              "value": "$17.76/mo"
            },
            {
              "name": "Billing begins",
              "value": "First day of next month"
            }
          ]
        },
        {
          "line_index": 3,
          "key": "shopify-line-key",
          "role": "addon",
          "setup_id": "ip-setup-...",
          "setup_parent": true,
          "setup_billing_name": "Call Recording",
          "setup_billing_value": "$5/mo",
          "setup_phone": "Classic Phone",
          "shopify_product_id": 1213,
          "shopify_variant_id": 1415,
          "shopify_handle": "call-recording",
          "sku": "PP-ADDON-CALL-RECORDING",
          "title": "Call Recording",
          "quantity": 1,
          "checkout_price_cents": 0,
          "checkout_line_price_cents": 0,
          "future_charge_cents": 500,
          "future_line_charge_cents": 500,
          "billing_cadence": "monthly",
          "first_bill_rule": "first_day_of_next_month",
          "currency": "USD",
          "requires_shipping": false,
          "taxable": false,
          "visible_properties": [
            {
              "name": "Future charge",
              "value": "$5/mo"
            },
            {
              "name": "Billing begins",
              "value": "First day of next month"
            }
          ]
        }
      ],
      "summary": {
        "phone": "Classic Phone",
        "service": "Monthly service",
        "add_ons": [
          "Call Recording"
        ],
        "due_today_before_tax_cents": 10000,
        "future_charge_cents": 2276
      }
    }
  ],
  "lines": [],
  "ungrouped_lines": []
}
```

The abbreviated `phone_line` object and empty top-level `lines` array above are for readability; the real payload repeats each fully normalized line in both its setup and the top-level `lines` array. `tax_cents` remains `null` until the final checkout has an address. The gateway may add normalized name, email, phone, billing address, and service address fields after collecting them.

### Required line fields

- `role`: `phone`, `service`, `addon`, or `addon_bundle`
- `shopify_product_id`
- `shopify_variant_id`
- `shopify_handle`
- `sku`
- `title`
- `quantity`
- `checkout_price_cents`
- `checkout_line_price_cents`
- `future_charge_cents`
- `future_line_charge_cents`
- `billing_cadence`
- `first_bill_rule`
- `currency`
- `billing_name`
- `billing_value`
- `setup_phone`
- `requires_shipping`
- `taxable`

The theme may expose readable line-item properties such as `Future charge` and `Billing begins` in checkout. Private underscore-prefixed properties can carry normalized values such as `_setup_future_charge_cents`, `_setup_billing_cadence`, and `_setup_first_bill_rule`. The external server must validate both; browser metadata is never authoritative.

## Server Validation And Idempotency

Before creating any Rev.io or payment object:

1. Require schema exactly `independence_phone.revio_checkout.v2`.
2. Allow only the two phone SKUs and seven future-billing SKUs listed above.
3. Reject `package`, `shipping`, or `discount` product roles inside setup lines.
4. Validate each Shopify product/variant ID, handle, SKU, role, quantity, checkout price, future price, cadence, taxability, and shipping requirement against a server-side inventory map.
5. Require exactly one phone per setup group and exactly one selected service plan per phone quantity.
6. Require service/add-on quantity to match the parent phone quantity.
7. Calculate the phone subtotal server-side.
8. Apply shipping once per order as exactly `1500` cents.
9. Calculate tax only after receiving the address through the final checkout.
10. Require policy consent and desired area code before payment/provisioning.
11. Derive an idempotency key from a stable cart token plus sorted setup IDs and persist the result of every create/payment attempt.
12. Use Rev.io webhook event IDs as separate idempotency keys for inbound reconciliation.

Never use the browser-provided total as the charge amount.

## Quantity Model

Quantity remains per setup. If a customer chooses quantity two, the phone, selected service, and every selected add-on use quantity two. If two phones need different plans or add-ons, the storefront creates two setup groups instead of mixing configuration inside one quantity.

Shipping remains `$15` once for the entire order regardless of phone quantity.

## Recommended Rev.io Workflow

1. Validate and idempotently register the v2 checkout request.
2. Collect and validate checkout contact/address fields, policy consent, and desired area code.
3. Calculate tax after address entry.
4. Charge the phone subtotal, tax, and one `$15` shipping fee through the approved tokenized gateway.
5. Match or create the customer with `POST /v1/Customers`.
6. Create the request with `POST /v1/Requests`.
7. Create the service with `POST /v1/RequestServices`.
8. Add the selected phone, service plan, add-ons, or bundle with `POST /v1/RequestProducts`.
9. Schedule service/add-on billing for the first day of the following month.
10. Store returned Rev.io IDs with the checkout/order record.
11. Return an approved redirect or confirmation URL.
12. Reconcile request, order, bill, and payment state through Rev.io webhooks.

## Webhook Requirements

Subscribe to the customer, request, request status, order, order status, charge, bill, payment, void, reversal, auto-debit success, and auto-debit failure events required by the tenant.

For each inbound notification:

- Verify Rev.io receiver activation and any supported signature/authentication.
- Persist event ID, event type, object ID, created timestamp, and received timestamp.
- Resolve the local record by Rev.io customer/request/order/payment ID.
- Process each event ID once.
- Keep the raw payload in an access-controlled audit store.

## Questions The Rev.io Implementer Must Answer

1. Which Rev.io tenant/client code and sandbox tenant will be used?
2. Who supplies the APIM subscription key and API-only user?
3. Which `bill_profile_id`, `service_type_id`, `provider_id`, process, phase, request status, and assignment values apply?
4. Which Rev.io product IDs map to every stable Shopify SKU above?
5. Which hosted/tokenized gateway owns today's phone, tax, and shipping payment?
6. How are sales tax, telecom fees, and the single order shipping charge represented?
7. Should the integration create a Shopify order before payment, after payment, or after Rev.io reconciliation?
8. Which Rev.io webhooks are enabled and what endpoint/authentication do they require?
9. What retry and manual-recovery workflow applies to partial customer/request/payment creation?

## Bridge Configuration

Theme setting:

```text
Online Store -> Themes -> Customize -> Cart -> Rev.io checkout handoff URL
```

Recommended same-domain route:

```text
https://YOUR_DOMAIN/revio/checkout
```

Ops variables:

```text
REVIO_CHECKOUT_WEBHOOK_URLS=https://api-implementer.example.com/revio-checkout
REVIO_WEBHOOK_SECRET=<long random signing secret>
REVIO_CHECKOUT_SUCCESS_URL=https://jordan-mark-premier.myshopify.com/cart?revio_checkout=received
REVIO_CHECKOUT_ALLOWED_ORIGINS=https://jordan-mark-premier.myshopify.com
```

The ops receiver stores the checkout intent and forwards a signed `revio.checkout.requested` event. The API middleware consumes `record.revio_checkout_payload`.

## Proof Required Before Production Checkout

### Storefront/catalog proof

- Both phones retain the approved one-time price and correct phone media.
- Every supported service/add-on variant is `$0.00`, non-shipping, hidden from public discovery, and has its stable SKU.
- Service/add-on lines use American-flag media.
- Cart and v2 payload preserve `future_charge_cents`, `billing_cadence`, and `first_bill_rule`.
- Cart shows one `$15` order shipping fee, tax pending until address, phone-only due today, and separate future charges.
- Setup update/removal works.
- Patriot Package is absent.
- Order Now and cart do not collect policy consent or desired area code.

### External sandbox proof

- Server rejects tampered SKU, variant, quantity, checkout price, future price, cadence, first-bill rule, and totals.
- Duplicate submit does not duplicate a Rev.io customer, request, product, bill, charge, or payment.
- Final checkout requires consent and desired area code exactly once.
- Tax calculates after address.
- Today's successful charge contains only phone, tax, and one `$15` shipping fee.
- Service/add-ons begin billing on the first day of the following month.
- Returned Rev.io IDs are stored and reconciled through idempotent webhooks.
- No raw card number, CVV, or Rev.io credential appears in the browser, theme, logs, Shopify notes, or CRM.

Production checkout remains blocked until the external sandbox proof passes.
