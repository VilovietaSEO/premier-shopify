# Simple CRM Capture

This is the minimal CRM path for the Independence Phone storefront contact form.

It is intentionally separate from Liquid. A Shopify theme can render the form, but it cannot securely store lead records or hold private API credentials. The theme posts to this server-side endpoint only when the `IP contact form` section has a CRM endpoint URL configured.

## Local Commands

Run the proof test:

```bash
cd /Users/vilovieta/Documents/Shopify
npm run crm:test
```

Run the local server:

```bash
cd /Users/vilovieta/Documents/Shopify
PORT=8787 CRM_SUBMISSIONS_PATH=tmp/crm-submissions.jsonl npm run crm:server
```

Local endpoints:

- Capture: `http://127.0.0.1:8787/crm/capture`
- Sale import: `http://127.0.0.1:8787/crm/orders/import`
- Shopify order webhook: `http://127.0.0.1:8787/crm/shopify/orders/create`
- Viewer: `http://127.0.0.1:8787/crm/leads`
- CSV export: `http://127.0.0.1:8787/crm/leads.csv`

## Theme Editor Wiring

Open:

```text
Online Store -> Themes -> Customize -> Pages -> Contact -> IP contact form
```

Set `CRM endpoint URL` to the deployed HTTPS capture endpoint, for example:

```text
https://crm.example.com/crm/capture
```

If the field is blank, the form falls back to Shopify's native contact form behavior.

After a successful CRM capture, the endpoint redirects the visitor back to the submitted storefront `crm[source_url]` origin and the submitted `crm[return_to]` path. This matters when the CRM endpoint is on a separate ops domain; visitors should land back on the Shopify contact page, not on the ops host.

## Captured Fields

Each accepted lead record stores:

- submitted timestamp in ISO format
- submitted timestamp formatted in the store timezone
- record type, source type, lead type, sale type, tags, order id, and order name fields
- source URL
- source path
- referrer
- UTM source, medium, and campaign when present
- name
- email
- phone
- child age range
- main use case
- interested product
- preferred service plan
- Patriot Package interest
- selected add-ons
- message
- marketing opt-in
- privacy and terms consent
- raw submitted form fields
- IP and user agent metadata when the host provides them

Contact form submissions are tagged as:

- `record_type`: `lead`
- `source_type`: `contact_form`
- `lead_type`: `contact_form`
- `tags`: `lead`, `contact_form`, `product_interest`

Purchase/order imports are tagged as:

- `record_type`: `sale`
- `source_type`: `shopify_order`
- `sale_type`: `classic_monthly_addon_sale`, `classic_patriot_package_sale`, `rugged_patriot_package_sale`, or `phone_setup_sale`
- `tags`: `sale`, `shopify_order`, product/plan/package tags where available

Automatic order capture uses Shopify's signed `orders/create` webhook at `/crm/shopify/orders/create`. Set `SHOPIFY_ORDER_WEBHOOK_SECRET` in production so the endpoint can verify `X-Shopify-Hmac-Sha256` before writing a sale record into the same CRM JSONL store as contact leads.

Manual order backfills use Shopify order JSON or exported payloads at `/crm/orders/import`. Set `CRM_ORDER_INGEST_TOKEN` in production and send it as a bearer token or `?token=` query parameter.

## Outbound Webhooks

The CRM can also forward accepted records to downstream systems such as Zapier, Make, Rev.io middleware, a custom CRM, or a client-owned database.

Configure destinations on the server, not in Liquid:

```text
CRM_LEAD_WEBHOOK_URLS=https://hooks.example.com/leads
CRM_SALE_WEBHOOK_URLS=https://hooks.example.com/sales
CRM_WEBHOOK_SECRET=<long random outbound signing secret>
```

Lead destinations receive `crm.lead.created` after contact-form capture. Sale destinations receive `crm.sale.created` after signed Shopify order webhook capture or protected manual import. Multiple URLs can be comma-separated or newline-separated.

Every outbound request is JSON and includes `x-patriot-phone-event`, `x-patriot-phone-record-id`, and `x-patriot-phone-signature: sha256=...`. The signature is an HMAC SHA-256 of the exact JSON body using `CRM_WEBHOOK_SECRET`.

## Staff Viewer And Export

The viewer lists newest leads first at `/crm/leads`. It shows total record, lead, and sale counts at the top. Each table row includes a `View details` disclosure with every normalized CRM field, the raw submitted form fields, and request/order metadata.

Set `CRM_VIEWER_TOKEN` in production to require a bearer token or `?token=` query parameter for the viewer and CSV export.

The CSV export is available at `/crm/leads.csv` and includes the normalized lead and sale fields needed for staff follow-up, plus `raw_form_fields_json` and `meta_json` columns for full-detail review or external CRM import.

## Spam Controls

The capture handler includes:

- a hidden honeypot field named `company_website`
- in-memory rate limiting per IP address

Production hosting should add platform-level rate limiting or bot protection as well.

## Production Storage Note

The included implementation writes JSONL records to `CRM_SUBMISSIONS_PATH`. Use a persistent volume, database-backed adapter, or CRM app storage before production traffic. Do not deploy this on ephemeral serverless storage unless the storage layer is replaced.
