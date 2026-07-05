# Independence Phone Client Handoff Packet

Date: 2026-07-05

This packet explains what has been built, what the business owner needs to finish in Shopify, how the support server should be hosted, and what the Rev.io API developer needs to finalize.

## 1. Store Summary

Store:

```text
jordan-mark-premier.myshopify.com
```

GitHub repo:

```text
https://github.com/VilovietaSEO/premier-shopify
```

Live Shopify theme:

```text
Independence Phone / theme ID 150479208517
```

Current public status:

```text
Password-protected until final launch approval
```

Public customer-facing offer:

- Classic Phone
- Rugged Phone
- Patriot Package
- Monthly or annual service
- Optional add-ons

Behind the scenes, the service plans, add-ons, bundle, and Patriot Package also exist as Shopify billing line items. This is intentional. It keeps the public storefront simple while giving checkout, order exports, CRM, and Rev.io clean product lines to work with.

## 2. What Is Finished

The web design/theme work is in place:

- Homepage sales flow.
- Product selection page.
- Classic Phone product page.
- Rugged Phone product page.
- Guided order flow.
- Cart review flow.
- FAQ page.
- Contact page.
- Editable Shopify sections for normal content updates.
- Hidden billing products for service/add-on/cart modeling.
- Line-item setup details for orders and Rev.io handoff.
- Contact-form CRM endpoint support. The current setting must be replaced with the real hosted URL before launch proof.
- Shopify order webhook CRM support.
- Rev.io checkout handoff support.
- Automatic `llms.txt` support through the hosted server.

The remaining work is launch setup and proof, not a redesign.

Important current-state note: any `ops.example.com` URL in this packet is an example/placeholder. The production CRM, Rev.io handoff, and `llms.txt` routes are not live until the ops server is hosted and the Shopify theme settings are changed to that real HTTPS domain.

## 3. What The Store Owner Needs To Do In Shopify

### Add Staff Users

Shopify path:

```text
Settings -> Users
```

Recommended setup:

- Add Jordan and Mark as owner/admin-level users as appropriate.
- Add fulfillment or support users with limited access.
- Add the API/developer user only with the access they need.
- Require two-step authentication for anyone who can manage payments, orders, users, apps, themes, or settings.
- Confirm invitations are accepted. Shopify staff invitations expire after seven days.

Official Shopify reference:

```text
https://help.shopify.com/en/manual/your-account/users/invite-users
```

### Activate Payments

Shopify path:

```text
Settings -> Payments
```

Fastest launch path:

- Activate Shopify Payments, PayPal, or another Shopify-supported payment provider.
- Leave the theme's `Rev.io checkout handoff URL` blank.
- Let Shopify Checkout collect money.
- Send completed orders to the CRM/server and Rev.io sync after checkout.

Official Shopify references:

```text
https://help.shopify.com/en/manual/payments/shopify-payments/onboarding
https://help.shopify.com/en/manual/payments/third-party-providers
```

### Configure Shipping

Only the phones ship:

- Classic Phone ships.
- Rugged Phone ships.

These billing items do not ship:

- Monthly Service
- Annual Service
- Call Recording
- Quiet Hours
- Voicemail to Email
- Auto Attendant
- Add-on Bundle
- Patriot Package as a separate product

Shopify path:

```text
Settings -> Shipping and delivery
```

The client should confirm the intended shipping price and locations before launch. Earlier project copy referenced shipping as `$15 per phone anywhere in the USA`; confirm that is still the business rule before taking real orders.

Official Shopify reference:

```text
https://help.shopify.com/en/manual/fulfillment/setup/shipping-rates
```

### Add Policies

Shopify path:

```text
Settings -> Policies
```

Needed before launch:

- Privacy Policy
- Terms and Conditions
- Refund Policy
- Shipping Policy

The cart/order flow already expects the customer to agree to privacy policy and terms before checkout/handoff.

### Connect The Public Domain

Shopify path:

```text
Settings -> Domains
```

If the final website domain should be the Shopify store, point the public domain to Shopify. Shopify's current manual domain instructions list:

```text
A record: 23.227.38.65
AAAA record: 2620:0127:f00f:5::
www CNAME: shops.myshopify.com.
```

Then connect the domain inside Shopify Admin:

```text
Settings -> Domains -> Connect existing domain
```

Official Shopify reference:

```text
https://help.shopify.com/en/manual/domains/add-a-domain/connecting-domains/connect-domain-manual
```

Important: the main public site should point to Shopify, not directly to the custom server. The custom server is only for support routes such as CRM, Rev.io handoff, and `llms.txt`.

## 4. Payment Decision

### Recommended Fast Path

Use Shopify Checkout first.

This means:

- The business can accept payment quickly.
- Shopify creates the order.
- Staff can manage orders, fulfillment, tracking, and refunds in Shopify.
- Rev.io can be updated after checkout from the completed order.

Theme setting:

```text
Online Store -> Themes -> Customize -> Cart -> Rev.io checkout handoff URL
```

For Shopify Checkout, leave that field blank.

### Rev.io Direct Checkout Path

Only use this if the Rev.io API developer has completed and tested the Rev.io flow.

Theme setting:

```text
Online Store -> Themes -> Customize -> Cart -> Rev.io checkout handoff URL
```

Value after the server/API work is ready:

```text
https://YOUR_DOMAIN/revio/checkout
```

Do not put Rev.io API keys, APIM subscription keys, passwords, card numbers, or card security codes in Shopify Liquid, JavaScript, or Theme Editor settings.

## 5. Server Hosting Handoff

The Shopify theme cannot securely store CRM records, verify private webhooks, generate root-level raw text routes, or call Rev.io with private credentials. That is why this project includes a small hosted server.

The server handles:

- Contact form capture.
- Staff CRM viewer.
- CRM CSV export.
- Shopify order webhook capture.
- Manual order import/backfill.
- Rev.io checkout handoff.
- Automatic raw Markdown `llms.txt` routes.

Server source:

```text
ops/storefront-ops-server.js
```

Deployment docs:

```text
ops/README.md
```

Build the deployment bundle:

```bash
cd /Users/vilovieta/Documents/Shopify
npm run ops:bundle
```

Bundle output:

```text
tmp/patriot-phone-ops-deployment
```

Recommended hosting:

- Persistent VPS or app server.
- Node.js 20 or newer.
- HTTPS.
- Persistent disk or database-backed storage.

Do not use temporary/ephemeral storage for the CRM unless the storage layer is replaced with a database.

### Required Server URLs

Once hosted, the server should expose:

```text
GET  /healthz
POST /crm/capture
GET  /crm/leads
GET  /crm/leads.csv
POST /crm/shopify/orders/create
POST /crm/orders/import
POST /revio/checkout
GET  /llms.txt
GET  /products/standard-phone/llms.txt
GET  /products/rugged-phone/llms.txt
GET  /collections/all/llms.txt
GET  /a/llms.txt?path=/pages/faq
```

### Required Server Secrets

These belong on the server only:

```text
CRM_VIEWER_TOKEN
CRM_ORDER_INGEST_TOKEN
SHOPIFY_ORDER_WEBHOOK_SECRET
CRM_WEBHOOK_SECRET
REVIO_WEBHOOK_SECRET
```

Meanings:

- `CRM_VIEWER_TOKEN` protects the staff CRM viewer and CSV export.
- `CRM_ORDER_INGEST_TOKEN` protects manual order imports.
- `SHOPIFY_ORDER_WEBHOOK_SECRET` verifies Shopify order webhooks.
- `CRM_WEBHOOK_SECRET` signs outbound lead/sale webhooks.
- `REVIO_WEBHOOK_SECRET` signs outbound Rev.io handoff webhooks.

## 6. How The Domain Should Point To The Server

There are two acceptable patterns.

### Option A: Separate Ops Subdomain

Example:

```text
https://ops.example.com
```

Use this when the business wants the main site on Shopify and the server on a separate subdomain. Replace `ops.example.com` with the actual hosted ops domain.

Theme settings would use:

```text
CRM endpoint URL = https://ops.example.com/crm/capture
Rev.io checkout handoff URL = https://ops.example.com/revio/checkout
```

Staff CRM viewer:

```text
https://ops.example.com/crm/leads?token=STAFF_TOKEN
```

This is simplest to host, but root-domain `llms.txt` routes may still need an edge/proxy rule if the business wants `https://www.example.com/llms.txt`.

### Option B: Same-Domain Proxy

Example public store:

```text
https://www.example.com
```

The main domain still points to Shopify. A Cloudflare Worker or reverse proxy forwards only these special paths to the ops server:

```text
/crm/*
/revio/*
/llms.txt
/*/llms.txt
/a/llms.txt
```

This lets the public URLs look clean:

```text
https://www.example.com/crm/capture
https://www.example.com/revio/checkout
https://www.example.com/llms.txt
https://www.example.com/products/standard-phone/llms.txt
```

Provided proxy examples:

```text
ops/cloudflare-worker.example.js
ops/wrangler.toml.example
```

## 7. Shopify Theme Settings To Fill In

Contact form:

```text
Online Store -> Themes -> Customize -> Pages -> Contact -> IP contact form
CRM endpoint URL = https://YOUR_DOMAIN/crm/capture
```

Cart/checkout:

```text
Online Store -> Themes -> Customize -> Cart
```

If using Shopify Checkout:

```text
Rev.io checkout handoff URL = leave blank
```

If using Rev.io handoff:

```text
Rev.io checkout handoff URL = https://YOUR_DOMAIN/revio/checkout
```

## 8. Shopify Webhook To Create

Create one Shopify webhook after the server is hosted.

Shopify path:

```text
Settings -> Notifications -> Webhooks
```

Webhook:

```text
Event: Order creation
Format: JSON
URL: https://YOUR_DOMAIN/crm/shopify/orders/create
```

The webhook signing secret must match the server's `SHOPIFY_ORDER_WEBHOOK_SECRET`.

This is what turns completed Shopify orders into CRM sale records.

## 9. Rev.io API Developer Handoff

Give the Rev.io API developer:

```text
REVIO_INTEGRATION_HANDOFF.md
ops/README.md
This handoff packet
The public /revio/checkout URL
The REVIO_WEBHOOK_SECRET value through a secure password manager
```

The Rev.io API developer should not edit the Shopify theme to add credentials.

They should receive signed webhook events:

```text
event: revio.checkout.requested
signature header: x-patriot-phone-signature
payload field: record.revio_checkout_payload
```

They need to finalize:

- Rev.io tenant/client code.
- Rev.io sandbox access.
- API-only Rev.io user.
- APIM subscription key.
- Product IDs for Classic Phone, Rugged Phone, monthly service, annual service, each add-on, bundle, Patriot Package, shipping, and discounts.
- Whether Rev.io creates a request only, or also bill/charge/payment immediately.
- Whether Rev.io provides a hosted checkout/payment URL.
- If no hosted checkout exists, which gateway tokenizes card data before Rev.io payment endpoints are called.
- Which Rev.io webhook events update the CRM after payment/order status changes.

Rev.io proof before launch:

- Classic monthly setup creates the expected Rev.io customer/request/products.
- Rugged annual setup creates the expected Rev.io mapping.
- Patriot Package creates the agreed package/discount structure.
- Returned Rev.io IDs are stored in the CRM sale record.
- Payment succeeds in sandbox if Rev.io is handling payment.
- Failed payment creates a clear user-visible error and CRM status update.
- No raw card number or CVV appears in Shopify, browser requests, server logs, or CRM.

## 10. Final Launch Checklist

Before removing the storefront password:

- Shopify users added.
- Payment path chosen.
- Shopify payment provider active if using Shopify Checkout.
- Rev.io sandbox proof complete if using Rev.io checkout.
- Shipping rates confirmed for the phones.
- Policies added.
- Final domain connected to Shopify.
- Ops server hosted over HTTPS.
- Contact form points to the real hosted `/crm/capture`, not the placeholder example URL.
- Shopify order webhook points to `/crm/shopify/orders/create`.
- CRM viewer works for staff.
- CRM CSV export works.
- Test contact form submission appears in CRM.
- Test order appears in Shopify.
- Test order appears as CRM sale record.
- If enabled, Rev.io handoff reaches the API middleware.
- `llms.txt` routes return raw Markdown.
- Storefront password is removed only after owner approval.

## 11. Proof Commands For The Developer

Run local proof:

```bash
cd /Users/vilovieta/Documents/Shopify
npm run verify:local
```

Run live launch readiness:

```bash
cd /Users/vilovieta/Documents/Shopify
SHOPIFY_STORE=jordan-mark-premier.myshopify.com SHOPIFY_USE_CLI_SESSION=1 npm run launch:readiness
```

Run deployed server proof after hosting:

```bash
cd /Users/vilovieta/Documents/Shopify
OPS_BASE_URL=https://YOUR_DOMAIN \
CRM_VIEWER_TOKEN=STAFF_TOKEN \
CRM_ORDER_INGEST_TOKEN=ORDER_INGEST_TOKEN \
SHOPIFY_ORDER_WEBHOOK_SECRET=SHOPIFY_WEBHOOK_SECRET \
SHOPIFY_STORE_URL=https://jordan-mark-premier.myshopify.com \
npm run ops:deployment:audit
```

Run live SEO/LLMS proof:

```bash
cd /Users/vilovieta/Documents/Shopify
SHOPIFY_STORE_URL=https://jordan-mark-premier.myshopify.com \
LLMS_BASE_URL=https://YOUR_DOMAIN \
npm run seo:live
```

## 12. What To Tell The Client

Suggested plain-language handoff:

```text
The storefront is built and ready for owner launch setup. The client now needs to add staff users, activate payments, confirm shipping and policies, host the small CRM/Rev.io handoff server, replace the placeholder CRM endpoint with the real hosted URL, and run one test order before removing the storefront password. If they want to accept payment quickly, use Shopify Checkout first. If they want Rev.io to own payment, the Rev.io API developer must finish and prove that API flow before launch.
```

## 13. SOW Review

The original SOW has been reviewed against the current build in:

```text
SOW_SCOPE_REVIEW.md
```

Short version:

- The custom Shopify storefront and handoff documentation are substantially complete.
- Several details evolved after client feedback, especially Classic/Rugged naming, Patriot Package, priced add-on line items, CRM/order capture, and Rev.io handoff.
- Remaining items are launch operations: Shopify owner settings, payment choice, policy/shipping/tax confirmation, public server hosting, Rev.io API proof if used, public SEO/LLMS proof, test order proof, and optional PDF/video handoff artifacts.
