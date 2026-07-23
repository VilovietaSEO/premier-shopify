# Simple CRM Capture

This is the minimal CRM path for the Independence Phone storefront contact form and optional Shopify order evidence.

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

Each accepted lead record can store:

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
- interested product
- preferred service plan
- selected add-ons
- message
- marketing opt-in
- raw submitted form fields
- IP and user agent metadata when the host provides them

The current contact form submits only Name, Email, Phone Number, and `How can we Help?`. Optional normalized product/service/add-on fields remain available for other approved sources, but the CRM must not invent values that were not submitted.

For `contact_form` lead capture, Name, a valid Email, and `How can we Help?` are required. Phone Number is optional. Privacy/Terms consent is neither required nor synthesized: when the field is omitted, its normalized value remains `null`. If an approved compatible source explicitly submits a true consent value, the receiver preserves that value without making it a contact-form requirement.

Privacy Policy/Terms checkout consent and required desired area code are not collected by the contact form, Order Now page, cart, or CRM lead capture. The final Rev.io/gateway checkout, or a Shopify Plus checkout extension, must collect them exactly once and persist the resulting evidence with the checkout/sale record.

Contact form submissions are tagged as:

- `record_type`: `lead`
- `source_type`: `contact_form`
- `lead_type`: `contact_form`
- `tags`: `lead`, `contact_form`, `product_interest`

Purchase/order imports are tagged as:

- `record_type`: `sale`
- `source_type`: `shopify_order`
- `sale_type`: a setup-derived value such as `classic_monthly_addon_sale`, `rugged_annual_bundle_sale`, or the fallback `phone_setup_sale`
- `tags`: `sale`, `shopify_order`, and product/plan/add-on tags where available

The current checkout contract has no Patriot Package. Purchase evidence can include `$0.00` service/add-on Shopify lines plus their stable SKU, future charge, billing cadence, and first-day-of-next-month rule. CRM records are audit evidence, not the authority that validates prices or schedules future billing.

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

Every outbound request is JSON and includes `x-patriot-phone-event`, `x-patriot-phone-record-id`, and `x-patriot-phone-signature: sha256=...`. These legacy header names are retained for compatibility with the current server implementation; they do not indicate a Patriot Package product. The signature is an HMAC SHA-256 of the exact JSON body using `CRM_WEBHOOK_SECRET`.

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
