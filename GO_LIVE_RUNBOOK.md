# Independence Phone Go-Live Runbook

Date: 2026-07-23

This runbook covers the final path from local repo to GitHub, Shopify draft theme, owner-hosted ops server, Rev.io middleware handoff, and live launch.

## Current Known Targets

- Shopify store: `jordan-mark-premier.myshopify.com`
- Shopify current live theme ID: `151266459717`
- Shopify unpublished QA theme ID: `151553245253`
- Rollback theme: select and verify an unpublished candidate with `shopify theme list` before launch
- Local theme path: `/Users/vilovieta/Documents/Shopify/independence-phone-theme`
- GitHub repo: `https://github.com/VilovietaSEO/premier-shopify`
- Ops server entrypoint: `ops/storefront-ops-server.js`
- Rev.io handoff endpoint exposed by ops server: `/revio/checkout`
- Cart payload schema: `independence_phone.revio_checkout.v2`
- Rev.io outbound event for API middleware: `revio.checkout.requested`

## What Shopify Handles

Shopify remains the storefront and product-management surface:

- Theme rendering.
- Homepage, collection, product, cart, FAQ, and contact pages.
- Product images, image alt text, product titles, SEO title/meta description, product handles, and collection membership.
- Public phone products and seven hidden `$0.00` billing products.
- Cart state and line-item grouping before checkout handoff.
- Phone-only merchandise totals due today, one `$15` shipping fee per order, tax pending until address, and separate future service/add-on totals.
- Stable SKU, future-charge, cadence, and first-bill metadata for the external handoff.

Do not expose the hidden service/add-on billing products in a broad public product grid. The storefront stays focused on Classic Phone, Rugged Phone, service, and optional add-ons. The retired Patriot Package is not part of the current order flow.

The Shopify side is complete before gateway handoff only when service/add-on variants are `$0.00`, non-shipping, use stable SKUs and American-flag media, preserve `future_charge_cents`, `billing_cadence`, and `first_bill_rule`, and grouped setup removal works.

## What The Owner-Hosted Server Handles When Enabled

The ops server provides optional features Shopify Liquid should not own. CRM capture is not enabled for the current native-contact handoff:

- Contact-form CRM capture: `POST /crm/capture`.
- Staff CRM viewer: `GET /crm/leads`.
- CSV export: `GET /crm/leads.csv`.
- Signed Shopify order webhook ingestion: `POST /crm/shopify/orders/create`.
- Protected manual Shopify order import: `POST /crm/orders/import`.
- Automatic raw Markdown `llms.txt` routes.
- Rev.io checkout handoff receiver: `POST /revio/checkout`.
- Signed outbound webhooks to Rev.io middleware or other automation endpoints.

## What Rev.io Middleware Handles

This repo does not call Rev.io directly. The API implementer should receive the signed `revio.checkout.requested` webhook, then translate `record.revio_checkout_payload` into the client's Rev.io account.

Expected Rev.io-side mapping:

1. Match or create the customer.
2. Create the request.
3. Create the request service.
4. Collect required policy consent and desired area code exactly once at final checkout.
5. Calculate tax after address entry and charge only phone, applicable tax, and one `$15` order shipping fee today.
6. Create request products for phone, service, and add-ons; schedule service/add-ons for the first day of the following month.
7. Make customer, request, payment, provisioning, retry, and webhook handling idempotent.
8. Return a `redirect_url` or `checkout_url` for the approved hosted/tokenized payment step.
9. Send lifecycle events back through configured CRM/webhook paths as needed.

See `REVIO_INTEGRATION_HANDOFF.md` for endpoint docs, payload shape, and Rev.io questions the API implementer needs answered.

## 1. Verify Locally

Run before committing or pushing:

```bash
cd /Users/vilovieta/Documents/Shopify
npm run verify:local
```

If the sandbox blocks localhost tests, run the affected ops tests outside the sandbox:

```bash
npm run ops:test
npm run ops:deployment:audit:test
```

Minimum focused proof after Rev.io handoff changes:

```bash
npm run crm:test
npm run ops:test
npm run ops:bundle:test
npm run ops:deployment:audit:test
npm run audit:coverage
npm run overlay:test
npm run theme:check
```

## 2. Review And Merge Through GitHub

```bash
git status --short
git fetch origin
git diff --stat origin/main...HEAD
npm run verify:local
```

Open a pull request to `main`, review the complete integrated diff and test output, then merge only after the approved checks pass. A GitHub merge does not push or publish a Shopify theme.

Do not commit:

- `.DS_Store`
- `*.swp`
- `tmp/`
- `test-results/`
- `node_modules/`

Those are ignored by `.gitignore`.

## 3. Push Theme To The Unpublished QA Theme

Use the fixed QA-only deployment script. It checks both theme roles, verifies every reviewed allowlist file exists, adds `--nodelete`, passes one `--only` per file, and checks both roles again afterward. The repo's `.shopifyignore` also excludes `config/settings_data.json`, so the script cannot erase server-side Theme Editor selections.

```bash
cd /Users/vilovieta/Documents/Shopify

scripts/push-client-qa-theme.sh
```

Expected result:

- Shopify CLI uploads the local theme files to QA theme `151553245253`.
- QA theme `151553245253` remains unpublished.
- Current theme `151266459717` remains live and unchanged.
- Server-side `config/settings_data.json` remains unchanged.
- Theme editor should show the latest cart setting named `Rev.io checkout handoff URL`.

Never add `--allow-live`, `--live`, or `--publish` to the QA push command. Never use current live theme `151266459717` as the push target.

## 4. Configure Shopify Theme Settings

In Shopify Admin:

```text
Online Store -> Themes -> Customize
```

Required checks:

- Header logo size is correct.
- Homepage video, text, add-ons, FAQ, and product links match the latest client feedback.
- Cart section includes `Rev.io checkout handoff URL`.
- If Rev.io is not ready, leave `Rev.io checkout handoff URL` blank only for password-protected cart QA. Do not treat native checkout as production-ready: zero-dollar service/add-on lines preserve selections but do not provision recurring billing.
- If Rev.io middleware is ready, set it to the same-domain ops route:

```text
https://YOUR_DOMAIN/revio/checkout
```

Contact form:

```text
Online Store -> Themes -> Customize -> Pages -> Contact -> IP contact form
CRM endpoint URL = blank
```

With that field blank, Shopify's native contact form delivers to the Admin Sender email. Set `Settings -> Notifications -> Sender email` to `jordan@premiercompanies.com`. Configure new-order staff notifications separately for both `mark@premiercompanies.com` and `jordan@premiercompanies.com`.

Do not submit a contact-form test or place an email-triggering test order until the client explicitly approves the external delivery test. If CRM capture is later approved, replace the blank value with the approved HTTPS `/crm/capture` endpoint and run the CRM wiring audit documented below.

## 5. Create Or Verify Shopify Store Objects

Use the stored, ignored Admin API token for a read-only audit. Never print it or commit the credential file.

Read-only audit:

```bash
cd /Users/vilovieta/Documents/Shopify
set -a
source tmp/shopify-admin-access-token.env
set +a
npm run store:objects:audit
```

The helper `scripts/create-storefront-objects.js` is broad: it rewrites both phone products, the supported billing products, the collection, publications, and missing pages. Do not run it against this established store without a fresh snapshot and explicit approval. If one object is missing, use a narrow Admin action or a guarded billing-only mode.

Required store objects:

- Classic Phone visible product.
- Rugged Phone visible product.
- Seven hidden billing products for monthly service, annual service, four individual add-ons, and the add-on bundle.
- Order Now page.
- FAQ page.
- Contact page.
- `All` or phone collection route points users to the order flow.

Before launch, confirm the seven billing products are available to the order builder, hidden from public discovery, priced at `$0.00`, non-shipping, assigned stable SKUs, and use American-flag media. The v2 handoff, not the zero-dollar Shopify line, provisions future billing.

## 6. Assign Product Media

Dry run:

```bash
SHOPIFY_STORE=jordan-mark-premier.myshopify.com \
SHOPIFY_USE_CLI_SESSION=1 \
npm run store:media:dry-run
```

Assign:

```bash
# Copy the exact asset-directory base from a rendered QA-theme asset URL.
SHOPIFY_THEME_ASSET_BASE='https://cdn.shopify.com/s/files/.../assets' \
SHOPIFY_PRODUCT_MEDIA_APPROVED=1 \
SHOPIFY_STORE=jordan-mark-premier.myshopify.com \
SHOPIFY_USE_CLI_SESSION=1 \
npm run store:media:assign
```

Do not infer or hard-code a `/cdn/shop/t/N/assets` path. Run the real assignment only after the approved phone stills and `ip-billing-flag.webp` are visible at the exact base URL and the media mutation is explicitly approved.

Then manually confirm in Shopify Admin:

- Product images are present.
- Alt text is correct.
- Product image order is correct.
- Large images are not visually overwhelming on product and collection pages.
- Each hidden service/add-on product uses the American-flag image in checkout.

## 7. Deploy Owner-Hosted Ops Server

Recommended: a persistent VPS or app server with Node.js 20+ and durable disk. Do not use ephemeral serverless storage unless the CRM storage layer is replaced with a database.

Build deployment bundle:

```bash
cd /Users/vilovieta/Documents/Shopify
npm run ops:bundle
```

The bundle is written to:

```text
tmp/patriot-phone-ops-deployment
```

Server install sketch:

```bash
sudo mkdir -p /opt/patriot-phone/shopify /opt/patriot-phone/data
sudo chown -R patriot-phone:patriot-phone /opt/patriot-phone
rsync -a ./ /opt/patriot-phone/shopify/
cd /opt/patriot-phone/shopify
npm ci --omit=dev
sudo cp ops/patriot-phone-ops.service.example /etc/systemd/system/patriot-phone-ops.service
sudo cp ops/patriot-phone-ops.env.example /etc/patriot-phone-ops.env
sudo editor /etc/patriot-phone-ops.env
sudo systemctl daemon-reload
sudo systemctl enable --now patriot-phone-ops
sudo systemctl status patriot-phone-ops
```

Required environment:

```text
NODE_ENV=production
PORT=8786
CRM_SUBMISSIONS_PATH=/opt/patriot-phone/data/crm-submissions.jsonl
CRM_VIEWER_TOKEN=<long random staff token>
CRM_ORDER_INGEST_TOKEN=<different long random order-ingest token>
SHOPIFY_ORDER_WEBHOOK_SECRET=<Shopify order webhook signing secret>
CRM_STORE_TIMEZONE=America/Denver
LLMS_SITE_URL=https://jordan-mark-premier.myshopify.com
LLMS_TIME_ZONE=America/Denver
```

Optional outbound/webhook environment:

```text
CRM_LEAD_WEBHOOK_URLS=https://hooks.example.com/leads
CRM_SALE_WEBHOOK_URLS=https://hooks.example.com/sales
CRM_WEBHOOK_SECRET=<long random outbound signing secret>
REVIO_CHECKOUT_WEBHOOK_URLS=https://api-implementer.example.com/revio-checkout
REVIO_WEBHOOK_SECRET=<long random Rev.io handoff signing secret>
REVIO_CHECKOUT_SUCCESS_URL=https://jordan-mark-premier.myshopify.com/cart?revio_checkout=received
REVIO_CHECKOUT_ALLOWED_ORIGINS=https://jordan-mark-premier.myshopify.com
```

## 8. Route Public Domain To Ops Server

Preferred public routes:

- `https://YOUR_DOMAIN/crm/*`
- `https://YOUR_DOMAIN/revio/*`
- `https://YOUR_DOMAIN/llms.txt`
- `https://YOUR_DOMAIN/*/llms.txt`
- `https://YOUR_DOMAIN/a/llms.txt`

Cloudflare Worker templates are provided:

- `ops/cloudflare-worker.example.js`
- `ops/wrangler.toml.example`

At minimum, the proxy must forward:

- `/crm/capture` to the ops server.
- `/crm/leads` to the ops server.
- `/crm/leads.csv` to the ops server.
- `/crm/shopify/orders/create` to the ops server.
- `/revio/checkout` to the ops server.
- `/llms.txt` and route-level `.../llms.txt` to the ops server.

## 9. Configure Shopify Webhooks

In Shopify Admin:

```text
Settings -> Notifications -> Webhooks
```

Create:

```text
Event: Order creation
Format: JSON
URL: https://YOUR_DOMAIN/crm/shopify/orders/create
```

Set the same webhook signing secret in:

```text
SHOPIFY_ORDER_WEBHOOK_SECRET
```

## 10. Configure Rev.io Middleware

Give the API implementer:

- `REVIO_INTEGRATION_HANDOFF.md`
- The public handoff URL: `https://YOUR_DOMAIN/revio/checkout`
- The signing secret used in `REVIO_WEBHOOK_SECRET`
- The outbound event name: `revio.checkout.requested`
- The parsed payload field: `record.revio_checkout_payload`
- The required schema: `independence_phone.revio_checkout.v2`
- The stable SKU/future-charge map in `REVIO_INTEGRATION_HANDOFF.md`
- The rule that today includes phone, applicable tax, and one `$15` order shipping fee only
- The rule that service/add-ons begin billing on the first day of the following month
- The requirement to collect policy consent and desired area code exactly once at final checkout

The API implementer should verify HMAC signature header:

```text
x-patriot-phone-signature: sha256=<HMAC SHA-256 body signature>
```

They should return JSON:

```json
{
  "ok": true,
  "redirect_url": "https://..."
}
```

or:

```json
{
  "ok": false,
  "errors": ["human-readable error"]
}
```

## 11. Public Proof Checks

After deployment:

```bash
curl -i https://YOUR_DOMAIN/healthz
curl -i https://YOUR_DOMAIN/llms.txt
curl -i https://YOUR_DOMAIN/products/standard-phone/llms.txt
curl -i https://YOUR_DOMAIN/pages/order-now/llms.txt
curl -i 'https://YOUR_DOMAIN/crm/leads?token=<staff-token>'
curl -i -X POST https://YOUR_DOMAIN/revio/checkout
```

Run the ops deployment audit:

```bash
cd /Users/vilovieta/Documents/Shopify
OPS_BASE_URL=https://YOUR_DOMAIN \
CRM_VIEWER_TOKEN=<staff-token> \
CRM_ORDER_INGEST_TOKEN=<order-ingest-token> \
SHOPIFY_ORDER_WEBHOOK_SECRET=<Shopify order webhook signing secret> \
SHOPIFY_STORE_URL=https://jordan-mark-premier.myshopify.com \
npm run ops:deployment:audit
```

Run SEO/LLMS audit:

```bash
SHOPIFY_STORE_URL=https://jordan-mark-premier.myshopify.com \
LLMS_BASE_URL=https://YOUR_DOMAIN \
npm run seo:live
```

If the storefront is password protected, provide:

```bash
SHOPIFY_STOREFRONT_PASSWORD=<password>
```

Do not commit or paste that password.

## 11A. Legal Policy Recovery

The approved company-published legal sources and Shopify destinations are:

- Terms source: `https://independencephone.com/terms/`
- Terms destination: `https://jordan-mark-premier.myshopify.com/policies/terms-of-service`
- Privacy source: `https://independencephone.com/privacy/`
- Privacy destination: `https://jordan-mark-premier.myshopify.com/policies/privacy-policy`

Both source pages reported a WordPress modified date of 2026-06-02 when they were restored to Shopify on 2026-07-14. The Shopify Privacy Policy must use the PCI/Independence Phone text with `Use automated policy` disabled; do not replace it with Shopify's generic `jordan-mark-premier` template. Restore or review policies at:

```text
https://admin.shopify.com/store/jordan-mark-premier/settings/legal
```

After any policy change, verify both storefront destinations render the approved company wording, return no 404, retain `noindex,nofollow` during QA, and have no horizontal overflow.

## 12. Final Launch Gate

Only publish the theme after these are true:

- GitHub `main` contains the launch commit.
- Shopify QA theme `151553245253` has the latest local theme files and remains unpublished.
- Shopify current theme `151266459717` remains live until the approved publish action.
- A rollback candidate has been explicitly selected and its role verified immediately before launch.
- Theme preview works on desktop and mobile.
- Cart can build Classic, Rugged, annual, monthly, bundle, and individual add-on setups without Patriot Package.
- Quantity 2 creates matching quantity 2 phone/service/add-on lines.
- Cart removal removes the parent phone and every service/add-on line sharing its setup id.
- Service/add-on variants are `$0.00`, non-shipping, use stable SKUs and American-flag media, and preserve future charge/cadence/first-bill metadata.
- Cart shows phone-only merchandise due today, one `$15` shipping fee, tax pending until address, and separate future charges.
- Order Now and cart do not collect Privacy Policy/Terms consent or desired area code.
- Contact form uses Shopify native handling and reaches `jordan@premiercompanies.com` after an explicitly approved delivery test. If CRM capture is later approved, the form instead posts to CRM and appears in `/crm/leads`.
- If CRM sale capture is approved, Shopify `orders/create` webhook creates CRM sale records.
- Rev.io checkout handoff posts `revio.checkout.requested` with schema `independence_phone.revio_checkout.v2`.
- Middleware validates `record.revio_checkout_payload`, stable inventory data, immediate/future prices, and idempotency keys.
- Final checkout requires policy consent and desired area code exactly once.
- Sandbox proves today's payment contains only phone, applicable tax, and one `$15` order shipping fee.
- Sandbox proves service/add-ons start billing on the first day of the following month.
- `llms.txt` routes return raw `text/plain` Markdown, not Shopify HTML.
- If CRM capture is approved, staff can export CRM CSV.
- No Rev.io credentials are present in Liquid, JavaScript, rendered HTML, or browser network payloads.

Publish command when approved:

```bash
shopify theme publish \
  --store jordan-mark-premier.myshopify.com \
  --theme 151553245253
```

Do not publish until the business owner approves the final preview.
