# Independence Phone Go-Live Runbook

Date: 2026-07-05

This runbook explains how to take the Independence Phone Shopify store live.

It is written in two layers:

- Business-owner checklist first.
- Developer/API setup after that.

## Business Owner Summary

The site is built, but it is not fully launched because a few business decisions and live proofs still need to happen.

The owner needs to decide:

1. Who should have Shopify access?
2. Should payment launch through Shopify Checkout first, or wait for Rev.io checkout?
3. What domain should be public?
4. Who will host the small server for CRM, order capture, Rev.io handoff, and `llms.txt`?
5. Who will receive contact leads and order/sale records?
6. When should the storefront password be removed?

Fastest path to start selling:

1. Add staff users in Shopify.
2. Turn on Shopify Payments or another supported payment provider.
3. Leave the Rev.io checkout handoff setting blank.
4. Configure shipping for the phones.
5. Add policies.
6. Place a test order.
7. Remove the storefront password when approved.

Rev.io path:

1. Host the ops server.
2. Give the Rev.io API implementer the handoff docs.
3. Prove a Rev.io sandbox checkout/request flow.
4. Enter the hosted `/revio/checkout` URL in the Shopify theme.
5. Place a test order/handoff.

Do not put Rev.io keys or card-handling code into Shopify.

## Current Known Targets

- Shopify store: `jordan-mark-premier.myshopify.com`
- Shopify live working theme: `Independence Phone` / theme ID `150479208517`
- Local theme path: `/Users/vilovieta/Documents/Shopify/independence-phone-theme`
- GitHub repo: `https://github.com/VilovietaSEO/premier-shopify`
- Ops server entrypoint: `ops/storefront-ops-server.js`
- Rev.io handoff endpoint exposed by ops server: `/revio/checkout`
- Cart payload schema: `independence_phone.revio_checkout.v1`
- Rev.io outbound event for API middleware: `revio.checkout.requested`
- Current public access: storefront password protection is still on until launch.

## Current Launch Status

Latest saved launch audit:

```bash
cd /Users/vilovieta/Documents/Shopify
SHOPIFY_STORE=jordan-mark-premier.myshopify.com SHOPIFY_USE_CLI_SESSION=1 npm run launch:readiness
```

Current result in `tmp/shopify-live-proof/launch-readiness-audit.json`:

- Status: `blocked`.
- Pass: `22`.
- Pending: `1`.
- Blockers: `6`.

Resolved since the earlier checklist:

- `Independence Phone` is the live theme.
- Classic Phone and Rugged Phone are active public products.
- Hidden billing products are active line items for service/add-ons/package mapping.
- Hidden billing products are non-shipping, so only phone products require shipping.
- Homepage/product/order/cart theme flows are implemented.

Remaining blockers:

- Storefront password page blocks public crawler/SEO proof.
- Public `llms.txt` and route-level Markdown routes need ops/proxy deployment.
- Sitemap and route SEO proof need to be rerun after public access/proxy routing.
- Ops endpoint proof must be run against a public HTTPS endpoint.
- The contact form CRM endpoint must be changed from the placeholder/example URL to the real hosted `/crm/capture` URL, then proven with a test submission.
- A real or approved test Shopify order proof must be run after payment setup.

## What Shopify Handles

Shopify remains the storefront and product-management surface:

- Theme rendering.
- Homepage, collection, product, cart, FAQ, and contact pages.
- Product images, image alt text, product titles, SEO title/meta description, product handles, and collection membership.
- Public phone products and hidden billing products.
- Cart state and line-item grouping before checkout handoff.
- Native Shopify checkout if the business chooses Shopify as the payment processor.

Do not expose the hidden service/add-on billing products in a broad public product grid. The storefront should stay focused on Classic Phone, Rugged Phone, and the Patriot Package framing.

## What The Owner-Hosted Server Handles

The ops server provides features Shopify Liquid should not own:

- Contact-form CRM capture: `POST /crm/capture`.
- Staff CRM viewer: `GET /crm/leads`.
- CSV export: `GET /crm/leads.csv`.
- Signed Shopify order webhook ingestion: `POST /crm/shopify/orders/create`.
- Protected manual Shopify order import: `POST /crm/orders/import`.
- Automatic raw Markdown `llms.txt` routes.
- Rev.io checkout handoff receiver: `POST /revio/checkout`.
- Signed outbound webhooks to Rev.io middleware or other automation endpoints.

The ops server does not store Rev.io API credentials and does not collect raw card numbers. It stores CRM proof, verifies/normalizes payloads, and forwards signed events to owner-controlled destinations.

## What Rev.io Middleware Handles

This repo does not call Rev.io directly. The API implementer should receive the signed `revio.checkout.requested` webhook, then translate `record.revio_checkout_payload` into the client's Rev.io account.

Expected Rev.io-side mapping:

1. Match or create the customer.
2. Create the request.
3. Create the request service.
4. Create request products for phone, service, package, and add-ons.
5. Create charges/bill/payment records if the Rev.io account wants immediate invoicing or payment.
6. Return a `redirect_url` or `checkout_url` if the visitor should continue to a hosted payment step.
7. Send lifecycle events back through configured CRM/webhook paths as needed.

See `REVIO_INTEGRATION_HANDOFF.md` for endpoint docs, payload shape, and Rev.io questions the API implementer needs answered.

## 0. Choose The Payment Path

There are two launchable payment models. Pick one before final order proof.

### Option A: Fastest Payment Launch With Shopify Checkout

Use this if the business needs to accept money quickly.

1. In Shopify Admin, go to `Settings -> Payments`.
2. Activate Shopify Payments or an approved third-party payment provider.
3. Leave the theme's `Cart -> Rev.io checkout handoff URL` blank.
4. Keep the hidden billing products active and non-shipping so Shopify checkout receives priced line items for the phone setup.
5. Configure the Shopify `orders/create` webhook to the ops server so paid orders become CRM sale records.
6. Have the Rev.io/API implementer sync Shopify orders into Rev.io after checkout, if Rev.io needs to own service/billing records.

This path creates Shopify orders and collects payment in Shopify. Rev.io can still be updated after the order through webhook/middleware work.

### Option B: Rev.io Owns Checkout Or Payment

Use this only after the API implementer has a working Rev.io tenant/sandbox flow.

1. Deploy the ops server.
2. Configure `REVIO_CHECKOUT_WEBHOOK_URLS` and `REVIO_WEBHOOK_SECRET` on the ops server.
3. Set the theme's `Cart -> Rev.io checkout handoff URL` to `https://YOUR_DOMAIN/revio/checkout`.
4. The cart button posts the setup payload to the ops server.
5. The ops server stores CRM proof and forwards `revio.checkout.requested` to Rev.io middleware.
6. The Rev.io middleware creates the customer/request/products/bill/payment or returns a hosted payment URL.
7. Run sandbox proof before launch.

Do not put Rev.io API keys, APIM subscription keys, Basic Auth credentials, raw card numbers, or CVV handling in Shopify Liquid, browser JavaScript, or Theme Editor settings.

Official Shopify payment references:

- Shopify Payments setup: `https://help.shopify.com/en/manual/payments/shopify-payments/onboarding`
- Third-party payment providers: `https://help.shopify.com/en/manual/payments/third-party-providers`

## 0.1 Add Store Users

The store owner or an administrator should add staff before launch:

1. Shopify Admin -> `Settings -> Users`.
2. Click `Add users`.
3. Enter each staff email.
4. Assign a role with the minimum permissions needed.
5. Require two-step authentication for anyone who can manage payments, orders, users, apps, themes, or settings.
6. Confirm each invite is accepted. Shopify invitations expire after seven days.

Recommended roles to create or assign:

- Owner/admin: billing, payments, users, settings, apps, themes, products, orders, reports.
- Store manager: products, orders, customers, discounts, reports, fulfillment.
- Support/CRM: orders, customers, contact submissions/CRM viewer link, no theme/payment settings.
- Developer/API implementer: themes, apps/webhooks, products as needed, no payment/bank access unless explicitly approved.

Official Shopify user reference: `https://help.shopify.com/en/manual/your-account/users/invite-users`

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

## 2. Commit And Push

```bash
cd /Users/vilovieta/Documents/Shopify
git status --short
git add .
git status --short
git commit -m "Add Rev.io checkout handoff and launch ops"
git push origin main
```

Do not commit:

- `.DS_Store`
- `*.swp`
- `tmp/`
- `test-results/`
- `node_modules/`

Those are ignored by `.gitignore`.

## 3. Push Theme To Shopify Draft Theme

Push the local theme package to the known Shopify theme ID:

```bash
cd /Users/vilovieta/Documents/Shopify
shopify theme push \
  --store jordan-mark-premier.myshopify.com \
  --theme 150479208517 \
  --path independence-phone-theme
```

Expected result:

- Shopify CLI uploads the local theme files to theme `150479208517`.
- The theme remains a draft/non-published theme unless Shopify explicitly prompts and you choose to publish.
- Theme editor should show the latest cart setting named `Rev.io checkout handoff URL`.

If Shopify CLI asks to overwrite remote changes, confirm only after checking that the target theme ID is `150479208517`.

## 4. Configure Shopify Theme Settings

In Shopify Admin:

```text
Online Store -> Themes -> Customize
```

Required checks:

- Header logo size is correct.
- Homepage video, text, add-ons, FAQ, and product links match the latest client feedback.
- Cart section includes `Rev.io checkout handoff URL`.
- If Rev.io is not ready yet, leave `Rev.io checkout handoff URL` blank so native Shopify checkout remains available for testing.
- If Rev.io middleware is ready, set it to the same-domain ops route:

```text
https://YOUR_DOMAIN/revio/checkout
```

Contact form:

```text
Online Store -> Themes -> Customize -> Pages -> Contact -> IP contact form
CRM endpoint URL = https://YOUR_DOMAIN/crm/capture
```

Do not leave the CRM endpoint pointed at a placeholder/example host for launch. A launch-ready contact form must post to the real hosted ops server and the test submission must appear in the CRM viewer and CSV export.

## 5. Create Or Verify Shopify Store Objects

Use the Shopify CLI session or Admin API token.

Dry run:

```bash
cd /Users/vilovieta/Documents/Shopify
SHOPIFY_STORE=jordan-mark-premier.myshopify.com \
SHOPIFY_USE_CLI_SESSION=1 \
npm run store:objects:dry-run
```

Actual create/update:

```bash
SHOPIFY_STORE=jordan-mark-premier.myshopify.com \
SHOPIFY_USE_CLI_SESSION=1 \
node scripts/create-storefront-objects.js
```

Verify:

```bash
SHOPIFY_STORE=jordan-mark-premier.myshopify.com \
SHOPIFY_USE_CLI_SESSION=1 \
npm run store:objects:audit
```

Required store objects:

- Classic Phone visible product.
- Rugged Phone visible product.
- Hidden billing products for monthly service, annual service, add-ons, add-on bundle, and Patriot Package.
- Order Now page.
- FAQ page.
- Contact page.
- `All` or phone collection route points users to the order flow.

## 6. Assign Product Media

Dry run:

```bash
SHOPIFY_STORE=jordan-mark-premier.myshopify.com \
SHOPIFY_USE_CLI_SESSION=1 \
npm run store:media:dry-run
```

Assign:

```bash
SHOPIFY_STORE=jordan-mark-premier.myshopify.com \
SHOPIFY_USE_CLI_SESSION=1 \
npm run store:media:assign
```

Then manually confirm in Shopify Admin:

- Product images are present.
- Alt text is correct.
- Product image order is correct.
- Large images are not visually overwhelming on product and collection pages.

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

Keep these as server environment variables only. Do not paste real values into Git, Theme Editor fields, customer-facing scripts, screenshots, or chat.

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

The Shopify webhook secret is not the same as `CRM_WEBHOOK_SECRET` or `REVIO_WEBHOOK_SECRET`:

- `SHOPIFY_ORDER_WEBHOOK_SECRET` verifies inbound Shopify order webhooks.
- `CRM_WEBHOOK_SECRET` signs outbound CRM lead/sale webhooks.
- `REVIO_WEBHOOK_SECRET` signs outbound Rev.io checkout handoff webhooks.

## 10. Configure Rev.io Middleware

Give the API implementer:

- `REVIO_INTEGRATION_HANDOFF.md`
- The public handoff URL: `https://YOUR_DOMAIN/revio/checkout`
- The signing secret used in `REVIO_WEBHOOK_SECRET`
- The outbound event name: `revio.checkout.requested`
- The parsed payload field: `record.revio_checkout_payload`

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
curl -i https://YOUR_DOMAIN/collections/all/llms.txt
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

## 12. Final Launch Gate

Only publish the theme after these are true:

- GitHub `main` contains the launch commit.
- Shopify theme `150479208517` has the latest local theme files.
- Theme preview works on desktop and mobile.
- Store owner/staff users are added with correct roles and two-step authentication decisions.
- Payment path is chosen and proven: native Shopify checkout or Rev.io checkout handoff.
- Cart can build Classic, Rugged, annual, monthly, bundle, individual add-ons, and Patriot Package setups.
- Quantity 2 creates matching quantity 2 phone/service/add-on lines.
- Only phone products require shipping; hidden billing products remain non-shipping.
- Privacy policy and terms checkbox is required.
- Contact form posts to the real hosted CRM endpoint and appears in `/crm/leads`.
- Shopify `orders/create` webhook creates CRM sale records.
- If Rev.io checkout is enabled, the handoff posts `revio.checkout.requested` to middleware and middleware can parse `record.revio_checkout_payload`.
- `llms.txt` routes return raw `text/plain` Markdown, not Shopify HTML.
- Staff can export CRM CSV.
- No Rev.io credentials are present in Liquid, JavaScript, rendered HTML, or browser network payloads.

Publish command when approved:

```bash
shopify theme publish \
  --store jordan-mark-premier.myshopify.com \
  --theme 150479208517
```

Do not publish until the business owner approves the final preview.
