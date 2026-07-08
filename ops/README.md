# Storefront Ops Service

This service is the deployable server-side layer for the Independence Phone storefront. It intentionally stays outside Shopify Liquid because the theme cannot securely store CRM records, verify private webhooks, forward signed integration events, or create arbitrary route-level raw text files by itself.

It serves:

- `GET /healthz` - service health check.
- `POST /crm/capture` - contact-form CRM capture.
- outbound `crm.lead.created` webhooks after accepted contact-form captures.
- `POST /crm/orders/import` - protected Shopify order import into CRM sale records.
- `POST /crm/shopify/orders/create` - signed Shopify `orders/create` webhook into CRM sale records.
- outbound `crm.sale.created` webhooks after accepted order imports or Shopify order webhooks.
- `POST /revio/checkout` - pre-checkout Rev.io handoff receiver for the theme cart button.
- outbound `revio.checkout.requested` webhooks after accepted Rev.io checkout handoffs.
- `GET /crm/leads` - staff lead viewer.
- `GET /crm/leads.csv` - staff CSV export.
- `GET /llms.txt` - root/site overview Markdown.
- `GET /products/standard-phone/llms.txt` and other route-level `.../llms.txt` paths.
- `GET /a/llms.txt?path=/pages/faq` - Shopify app-proxy compatible LLM Markdown route.

## Payment Boundary

The ops service is not a payment gateway.

Fast payment launch:

- Configure Shopify Payments or another Shopify-supported provider in Shopify Admin.
- Leave the theme's `Cart -> Rev.io checkout handoff URL` blank.
- Shopify Checkout collects payment and creates the order.
- Shopify's signed `orders/create` webhook sends the completed order to `/crm/shopify/orders/create` for CRM sale capture.

Rev.io checkout launch:

- Deploy this ops service first.
- Set the theme's `Cart -> Rev.io checkout handoff URL` to the public `/revio/checkout` route.
- Configure `REVIO_CHECKOUT_WEBHOOK_URLS` and `REVIO_WEBHOOK_SECRET`.
- This service stores the checkout intent and forwards a signed `revio.checkout.requested` event to the API implementer's Rev.io middleware.

Do not put Rev.io API credentials, APIM subscription keys, Basic Auth credentials, raw card numbers, or CVV handling in Shopify Liquid, browser JavaScript, Theme Editor settings, this README, or committed env files. Rev.io tenant credentials belong only in the API implementer's server environment.

## Local Proof

```bash
cd /Users/vilovieta/Documents/Shopify
npm run ops:test
npm run ops:bundle:test
npm run ops:deployment:audit:test
```

Run locally:

```bash
cd /Users/vilovieta/Documents/Shopify
PORT=8786 \
CRM_SUBMISSIONS_PATH=tmp/crm-submissions.jsonl \
CRM_VIEWER_TOKEN=change-me \
CRM_ORDER_INGEST_TOKEN=change-me-too \
SHOPIFY_ORDER_WEBHOOK_SECRET=change-me-webhook-secret \
CRM_LEAD_WEBHOOK_URLS=https://hooks.example.com/leads \
CRM_SALE_WEBHOOK_URLS=https://hooks.example.com/sales \
REVIO_CHECKOUT_WEBHOOK_URLS=https://hooks.example.com/revio-checkout \
CRM_WEBHOOK_SECRET=change-me-outbound-signing-secret \
REVIO_WEBHOOK_SECRET=change-me-revio-signing-secret \
LLMS_SITE_URL=https://jordan-mark-premier.myshopify.com \
npm run ops:server
```

## Production Environment

Use a persistent host or a database-backed storage adapter. Do not run the CRM capture endpoint on ephemeral serverless storage unless the storage layer is replaced.

Deployment templates in this folder:

- `patriot-phone-ops.service.example` - systemd service for a persistent Linux host.
- `patriot-phone-ops.env.example` - secret environment file template for tokens and outbound webhook settings. The filename is legacy; the service supports the Independence Phone storefront.
- `cloudflare-worker.example.js` - edge proxy for final-domain CRM, Rev.io handoff, and `llms.txt` paths.
- `wrangler.toml.example` - Cloudflare Worker route and `OPS_ORIGIN` template.

Build the minimal persistent-host deployment bundle before copying files to a server:

```bash
cd /Users/vilovieta/Documents/Shopify
npm run ops:bundle
```

The bundle is written to `/Users/vilovieta/Documents/Shopify/tmp/patriot-phone-ops-deployment` and includes `DEPLOYMENT.md`, `deployment-manifest.json`, the CRM service, the automatic `llms.txt` generator, order setup export support, package files, and the systemd/env/edge proxy templates.

Required production variables:

```text
PORT=8786
CRM_SUBMISSIONS_PATH=/opt/patriot-phone/data/crm-submissions.jsonl
CRM_VIEWER_TOKEN=<long random staff token>
CRM_ORDER_INGEST_TOKEN=<different long random order-ingest token>
SHOPIFY_ORDER_WEBHOOK_SECRET=<Shopify order webhook signing secret>
CRM_STORE_TIMEZONE=America/Denver
LLMS_SITE_URL=https://jordan-mark-premier.myshopify.com
LLMS_TIME_ZONE=America/Denver
```

Optional outbound integration variables:

```text
CRM_LEAD_WEBHOOK_URLS=https://hooks.example.com/leads
CRM_SALE_WEBHOOK_URLS=https://hooks.example.com/sales
CRM_WEBHOOK_SECRET=<long random outbound signing secret>
REVIO_CHECKOUT_WEBHOOK_URLS=https://hooks.example.com/revio-checkout
REVIO_WEBHOOK_SECRET=<long random Rev.io handoff signing secret>
REVIO_CHECKOUT_SUCCESS_URL=https://jordan-mark-premier.myshopify.com/cart?revio_checkout=received
REVIO_CHECKOUT_ALLOWED_ORIGINS=https://jordan-mark-premier.myshopify.com
```

Secret meanings:

- `CRM_VIEWER_TOKEN` protects `/crm/leads` and `/crm/leads.csv`.
- `CRM_ORDER_INGEST_TOKEN` protects manual order imports at `/crm/orders/import`.
- `SHOPIFY_ORDER_WEBHOOK_SECRET` verifies inbound Shopify `orders/create` webhooks.
- `CRM_WEBHOOK_SECRET` signs outbound `crm.lead.created` and `crm.sale.created` webhooks.
- `REVIO_WEBHOOK_SECRET` signs outbound `revio.checkout.requested` webhooks.

`CRM_LEAD_WEBHOOK_URLS` and `CRM_SALE_WEBHOOK_URLS` can contain one or more comma-separated or newline-separated `https://` destinations. When either outbound webhook variable is configured in production, the service refuses to start unless every URL is valid and `CRM_WEBHOOK_SECRET` is at least 24 characters.

`REVIO_CHECKOUT_WEBHOOK_URLS` is the bridge for the Rev.io API implementer. The theme posts the normalized cart to `/revio/checkout`; this ops service stores the checkout intent as a CRM sale record and forwards `revio.checkout.requested` to every configured Rev.io middleware URL. When this variable is configured in production, set `REVIO_WEBHOOK_SECRET` or `CRM_WEBHOOK_SECRET` to a long random signing secret. `REVIO_CHECKOUT_ALLOWED_ORIGINS` is only needed when the theme posts directly across origins; prefer a same-domain proxy route such as `https://www.example.com/revio/checkout`.

When `NODE_ENV=production`, the service refuses to start unless `CRM_SUBMISSIONS_PATH`, a `CRM_VIEWER_TOKEN` of at least 24 characters, a `CRM_ORDER_INGEST_TOKEN` of at least 24 characters, a `SHOPIFY_ORDER_WEBHOOK_SECRET` of at least 24 characters, and an `https://` `LLMS_SITE_URL` are configured.

## Outbound Webhook Contract

Accepted contact-form submissions are stored first, then posted to every `CRM_LEAD_WEBHOOK_URLS` destination as `crm.lead.created`.

Accepted order imports and signed Shopify `orders/create` webhooks are stored first, then posted to every `CRM_SALE_WEBHOOK_URLS` destination as `crm.sale.created`.

Accepted Rev.io checkout handoffs are stored first, then posted to every `REVIO_CHECKOUT_WEBHOOK_URLS` destination as `revio.checkout.requested`.

Each outbound request is `POST application/json` and includes:

```text
x-patriot-phone-event: crm.lead.created, crm.sale.created, or revio.checkout.requested
x-patriot-phone-record-id: <CRM record id>
x-patriot-phone-signature: sha256=<HMAC SHA-256 body signature>
```

The JSON body includes `event`, `generatedAt`, `source`, and the normalized `record` with submitted timestamp, store-timezone timestamp, normalized fields, raw form fields, and metadata. For `revio.checkout.requested`, the record also includes `revio_checkout_payload` as a parsed object for direct middleware consumption. The HMAC signature uses `CRM_WEBHOOK_SECRET` or `REVIO_WEBHOOK_SECRET`. Failed outbound delivery is reported in import/webhook JSON responses when applicable, but it does not delete the already stored CRM record.

## Shopify Wiring

In Theme Editor:

```text
Online Store -> Themes -> Customize -> Pages -> Contact -> IP contact form
```

Set `CRM endpoint URL` to the HTTPS capture URL:

```text
https://ops.example.com/crm/capture
```

If a same-domain proxy is available, use:

```text
https://www.example.com/crm/capture
```

The contact form sends `crm[source_url]` and `crm[return_to]`. The CRM resolves that return path against the storefront source origin, so a successful submission returns the visitor to the Shopify contact page even when `/crm/capture` is hosted on a separate ops domain.

Create a Shopify `orders/create` webhook that posts to:

```text
https://ops.example.com/crm/shopify/orders/create
```

The endpoint verifies `X-Shopify-Hmac-Sha256` with `SHOPIFY_ORDER_WEBHOOK_SECRET`, then writes the purchase as a CRM `sale` record tagged with `source_type=shopify_order`, a `sale_type`, order id/name, product/plan/package tags, and the setup summary. Keep `/crm/orders/import` available as a protected manual backfill path for exported order JSON.

For Rev.io processing, configure the cart section setting:

```text
Online Store -> Themes -> Customize -> Cart -> Rev.io checkout handoff URL
```

Use a same-domain route when possible:

```text
https://www.example.com/revio/checkout
```

When the setting is blank, the cart button keeps native Shopify checkout behavior. When the setting is filled, the checkout button posts a Rev.io-ready payload with `schema=independence_phone.revio_checkout.v1`, grouped `setups`, line roles, Shopify product/variant IDs, quantities, cents-based prices, cart token, source URL, and privacy/terms consent. The endpoint returns JSON and may include `redirect_url` or `checkout_url` for the browser to follow.

## llms.txt Routing

The generator must be reachable through a real public route before launch. Use one of these:

- Edge/Cloudflare Worker routes for `/llms.txt`, `/*/llms.txt`, `/a/llms.txt`, `/crm/*`, and `/revio/*`.
- Shopify app proxy for `/a/llms.txt?path=/...` plus an external route for root `/llms.txt`.
- A final-domain reverse proxy that forwards only CRM, Rev.io handoff, and `llms.txt` paths to this service.

Required launch checks:

```bash
curl -i https://www.example.com/llms.txt
curl -i https://www.example.com/products/standard-phone/llms.txt
curl -i https://www.example.com/pages/order-now/llms.txt
curl -i 'https://www.example.com/a/llms.txt?path=/pages/faq'
curl -i 'https://www.example.com/crm/leads?token=<staff-token>'
curl -i -X POST https://www.example.com/revio/checkout
SHOPIFY_STORE_URL=https://jordan-mark-premier.myshopify.com LLMS_BASE_URL=https://www.example.com npm run seo:live
```

`/llms.txt` and route-level `.../llms.txt` must return `text/plain; charset=utf-8` raw Markdown, not the Shopify HTML shell.

After the service and proxy routes are deployed, run the end-to-end ops audit:

```bash
cd /Users/vilovieta/Documents/Shopify
OPS_BASE_URL=https://www.example.com \
CRM_VIEWER_TOKEN=<staff-token> \
CRM_ORDER_INGEST_TOKEN=<order-ingest-token> \
SHOPIFY_ORDER_WEBHOOK_SECRET=<Shopify order webhook signing secret> \
SHOPIFY_STORE_URL=https://jordan-mark-premier.myshopify.com \
npm run ops:deployment:audit
```

The audit writes `/Users/vilovieta/Documents/Shopify/tmp/shopify-live-proof/ops-deployment-audit.json` and redacts the staff token, order ingest token, and webhook secret from the proof artifact.
