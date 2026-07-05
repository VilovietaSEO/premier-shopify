# Shopify Handoff Checklist

Use this for the Independence Phone Shopify store handoff.

Current store: `jordan-mark-premier.myshopify.com`.

Current live theme: `Independence Phone` / theme ID `150479208517`.

The original fresh-store workflow below remains useful for future stores. For this launch, use `GO_LIVE_RUNBOOK.md` for the current payment, hosting, users, ops, CRM, Rev.io, and public-launch sequence.

Detailed Theme Editor editing guide:

```bash
/Users/vilovieta/Documents/Shopify/independence-phone-theme/THEME_EDITOR_GUIDE.md
```

Store launch checklist:

```bash
/Users/vilovieta/Documents/Shopify/store-setup/LAUNCH_CHECKLIST.md
```

## Refresh Base Requirement

Final build target: Shopify `Refresh` plus the Independence Phone overlay.

The current local folder `/Users/vilovieta/Documents/Shopify/independence-phone-theme` is a complete uploadable theme package and source reference. The Refresh-specific path is:

```bash
/Users/vilovieta/Documents/Shopify/refresh-overlay
```

Apply it to a pulled Refresh theme with:

```bash
cd /Users/vilovieta/Documents/Shopify
scripts/apply-refresh-overlay.sh /path/to/pulled-refresh-theme
```

## 1. Authenticate CLI

```bash
cd /Users/vilovieta/Documents/Shopify/independence-phone-theme
shopify theme dev --store STORE.myshopify.com
```

If login opens a device-code flow, complete it in the browser. After auth, the command should print preview and Theme Editor URLs.

## 2. Pull Refresh, Then Preview

In Shopify admin, add the free `Refresh` theme to the fresh store. Then:

Preferred scripted path:

```bash
cd /Users/vilovieta/Documents/Shopify
scripts/bootstrap-refresh-store.sh STORE.myshopify.com REFRESH_THEME_ID /Users/vilovieta/Documents/Shopify/refresh-theme
```

Manual path:

```bash
shopify theme list --store STORE.myshopify.com
shopify theme pull --store STORE.myshopify.com --theme REFRESH_THEME_ID --path /Users/vilovieta/Documents/Shopify/refresh-theme
cd /Users/vilovieta/Documents/Shopify
scripts/apply-refresh-overlay.sh /Users/vilovieta/Documents/Shopify/refresh-theme
cd /Users/vilovieta/Documents/Shopify/refresh-theme
shopify theme check
```

Preview against the pulled Refresh theme:

```bash
shopify theme dev --store STORE.myshopify.com --theme REFRESH_THEME_ID
```

Do not publish until desktop, mobile, product pages, cart, checkout, and contact form behavior are approved.

After preview QA is approved, push the approved local Refresh theme back to the non-live theme:

```bash
cd /Users/vilovieta/Documents/Shopify/refresh-theme
shopify theme push --store STORE.myshopify.com --theme REFRESH_THEME_ID
```

Publish only after explicit approval:

```bash
shopify theme publish --store STORE.myshopify.com --theme REFRESH_THEME_ID
```

## 3. Create Product Data

Preferred path:

1. Create product metafield definitions from:

```bash
/Users/vilovieta/Documents/Shopify/store-setup/product-metafields.json
```

API shortcut after an Admin API token exists:

```bash
cd /Users/vilovieta/Documents/Shopify
SHOPIFY_STORE=STORE.myshopify.com \
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_... \
node scripts/create-product-metafields.js
```

2. Import the starter product CSV:

```bash
/Users/vilovieta/Documents/Shopify/store-setup/products.csv
```

API shortcut for the two products, `Phones` collection, and `Contact` page after metafields exist:

```bash
cd /Users/vilovieta/Documents/Shopify
SHOPIFY_STORE=STORE.myshopify.com \
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_... \
node scripts/create-storefront-objects.js
```

For automatic Online Store publishing, the Admin API token also needs `read_publications` and `write_publications`. Without those scopes, the helper still creates/updates the products and collection, then prints a warning. In Shopify admin, publish `Classic Phone`, `Rugged Phone`, and the `Phones` collection under each object's Publishing / Sales channels panel.

3. Follow the setup notes:

```bash
/Users/vilovieta/Documents/Shopify/store-setup/README.md
```

Create exactly these two products. The theme reads `custom.product_deck`, `custom.best_for`, and `custom.specs` when present, then falls back to the canonical values below.

### Classic Phone

- Title: `Classic Phone`
- Handle: `standard-phone`
- Price: `$100`
- Template: `product.independence-phone`
- Product type/tag suggestion: `Phone`
- Description: `The everyday family phone for kids who need to call home without stepping into smartphone life.`
- Features:
  - Heavy-duty cordless Wi-Fi handset with charging base.
  - HD audio quality.
  - Smart noise filtering.
  - Encrypted data transmission and storage.
  - Built-in Bluetooth 5.0.
  - 9-hour talk time.
  - 200-hour standby battery.

### Rugged Phone

- Title: `Rugged Phone`
- Handle: `rugged-phone`
- Price: `$150`
- Template: `product.independence-phone`
- Product type/tag suggestion: `Phone`
- Description: `The rugged family phone for busier homes, tougher handling, and longer days.`
- Features:
  - Rugged cordless Wi-Fi handset with charging base.
  - Waterproof and dust-proof.
  - Drop-proof up to 1.8 meters.
  - Non-slip, anti-scratch, anti-bacterial construction.
  - HD Voice, AI Noise Cancellation, and Acoustic Shield.
  - Encrypted data transmission and storage.
  - Built-in Bluetooth 5.0.
  - 13-hour talk time.
  - 300-hour standby battery.

## 4. Create Collection

- Title: `Phones`
- Handle: `phones`
- Template: `collection.phones`
- Products:
  - Classic Phone.
  - Rugged Phone.

## 5. Create Store Pages

- Title: `Order Now`
- Handle: `order-now`
- Template: `page.order`

- Title: `FAQ`
- Handle: `faq`
- Template: `page.faq`

- Title: `Contact`
- Handle: `contact`
- Template: `page.contact`

Do not create a manual `LLMs` Shopify page for `llms.txt`. The LLM output is generated automatically as raw Markdown text by `/Users/vilovieta/Documents/Shopify/llms/automatic-llms.js`.

## 6. Upload Hero Video

Source file:

```bash
/Users/vilovieta/Documents/Shopify/brief-materials/assets/video/indy-phone-reel-1.mov
```

Theme Editor path:

1. Online Store -> Themes -> Customize.
2. Open Home page.
3. Select `IP video hero`.
4. Keep the packaged fallback video, or choose a replacement video in the `Hero video` setting.
5. Keep or replace the fallback poster.

The theme already includes:

```bash
/Users/vilovieta/Documents/Shopify/independence-phone-theme/assets/ip-hero-video.mp4
/Users/vilovieta/Documents/Shopify/independence-phone-theme/assets/ip-hero-video-poster.jpg
```

## 6A. Theme Editor Editing Boundary

The client should maintain normal page content through Shopify's visual Theme Editor, not through Liquid files.

Theme Editor guide:

```bash
/Users/vilovieta/Documents/Shopify/independence-phone-theme/THEME_EDITOR_GUIDE.md
```

Client-editable areas already exposed through section schemas:

- Hero video, poster, headline, subheading, and primary button.
- Parent/JTBD story copy and moment cards.
- Product comparison headings, product selectors, image overrides, and summary overrides.
- Service plan cards.
- Add-on cards.
- Capability table rows.
- Patriot Package band copy and CTA.
- Smartphone/flip phone/landline comparison matrix.
- FAQ rows.
- Trust proof rows.
- Contact form copy and opt-in/payment notes.

Product title, price, images, description, and core specs should be maintained in Shopify products and product metafields.

## 7. Navigation

Set the store header logo to the supplied-logo export:

```bash
/Users/vilovieta/Documents/Shopify/brief-materials/assets/logo/independence-phone-logo-export.png
```

The local uploadable theme also includes this as:

```bash
/Users/vilovieta/Documents/Shopify/independence-phone-theme/assets/ip-independence-phone-logo.png
```

Create or update the main menu:

- Home -> `/`
- Order Now -> `/collections/all`
- FAQ -> `/pages/faq`
- Contact -> `/pages/contact`

Footer menu:

- Order Now -> `/collections/all`
- FAQ -> `/pages/faq`
- Contact -> `/pages/contact`
- Privacy Policy -> `/policies/privacy-policy`
- Terms of Service -> `/policies/terms-of-service`
- Shipping/Returns policy if the store uses one.

## 8. Service And Add-On Setup

Current storefront presentation:

- Monthly service: `$17.76/mo`
- Annual service: `$200/yr`
- Annual savings: `$13.12`
- Shipping: `$15/phone` anywhere in the USA
- Call Recording: `$5/mo`
- Quiet Hours: `$5/mo`
- Voicemail to Email: `$5/mo`
- Add-on Bundle: `$10/mo`, includes all add-ons
- Auto Attendant: `$5/mo`
- Patriot Package: `$250`, includes Classic Phone, 1 year service, and every add-on
- Billing model: the storefront keeps the simple phone/order-builder UI, but service and add-ons must be configured as hidden Shopify billing products before real checkout. The phone line keeps setup properties; selected billing items are added as separate priced cart lines with the same hidden setup id.

Current product form behavior:

- The product form captures selected service plan as a `Service plan` line-item property.
- The product form keeps selected add-ons on the phone line as setup properties and adds matching hidden billing products as priced cart items when those products are assigned.
- This is a Shopify cart charging model. True recurring monthly billing still requires Shopify selling plans/subscriptions or Rev.io/backend processing.
- Keep dynamic/express checkout buttons off on phone product pages unless an app checkout path also adds the hidden billing products. The supported theme path is add-to-cart, cart review, then checkout.
- Native cart count, add-to-cart, quantity update, and checkout routing are theme-native and do not require a Shopify app.
- Rev.io checkout handoff: the cart section has an optional `Rev.io checkout handoff URL` setting. When blank, checkout remains native Shopify. When set, the checkout button posts a normalized `independence_phone.revio_checkout.v1` payload to the configured endpoint, preserving phone/service/add-on line roles and setup IDs for Rev.io middleware.
- If Shopify's native order CSV does not expose setup properties cleanly enough, `/Users/vilovieta/Documents/Shopify/orders/setup-export.js` converts Shopify orders JSON into a setup-detail CSV; verify with `npm run orders:test`.
- True recurring billing through Shopify checkout requires selling plans from Shopify Subscriptions or another subscription app. At that point, service and add-ons need selling plan IDs or subscription products/variants instead of only line-item property checkboxes.

If Rev.io or Shopify app integration requires service/add-ons as separate products, keep the storefront copy but change the cart/checkout modeling behind it. Do not turn the public catalog into a broad product grid.

## 9. Claim Discipline

Use these as supplied facts:

- No apps.
- No web browser.
- No social feeds.
- Cordless Wi-Fi handset with charging base.
- Product/service/add-on prices listed above.
- American-owned.
- 42 years in communications.

Do not market these as included unless the product/service scope changes:

- SMS/texting.
- GPS.
- Camera.
- Cellular mobility.
- App support.
- Browser support.
- YouTube/social access.
- 911/emergency calling.

## 10. Verification

Run the full local gate from the repo root:

```bash
cd /Users/vilovieta/Documents/Shopify
npm run verify:local
```

That command runs:

- `npm run audit:coverage`
- `npm run store:metafields:dry-run`
- `npm run store:objects:dry-run`
- `npm run overlay:test`
- `npm run theme:check`
- `npm run preview:test`

Already completed locally as part of that gate on 2026-06-30:

```bash
npm run verify:local
```

Key results:

```text
Goal coverage audit: 984 passed, 0 failed
Simple CRM proof passed, including storefront-origin return redirects after external CRM capture
Automatic llms.txt proof passed
Storefront ops proof passed
Ops deployment audit proof passed locally
Launch readiness audit exists and currently reports blocked with 22 pass, 1 pending, and 6 blockers until live ops, public SEO/LLMS, storefront password/public access, and real/test order proof are complete
Order setup export proof passed
Storefront object audit proof passed
Product media assignment proof passed
Storefront objects ready: 2 products, 1 collection, 3 pages
Refresh overlay smoke test passed
Theme Check Summary: 64 files inspected with no offenses found.
Preview QA: 4 passed
```

Already proved against the password-authenticated live storefront:

- Home renders on live theme `150479208517`.
- `/collections/all` renders the product-selection page.
- `/pages/order-now` renders the guided order-builder page and is not a 404.
- `/pages/faq` renders the standalone support page and is not a 404.
- `/pages/contact` renders the contact form page and is not a 404.
- `/products/standard-phone` and `/products/rugged-phone` render and add to cart.
- Existing product media assignment gives both live products two media items with alt text.

Still required for launch proof:

- Re-run `cd /Users/vilovieta/Documents/Shopify && npm run launch:readiness` after each live ops/access/order change. Current artifact: `/Users/vilovieta/Documents/Shopify/tmp/shopify-live-proof/launch-readiness-audit.json`.
- Give Jordan/Mark the storefront password, temporarily disable password protection for review, or provide another preview method that works outside an Admin session.
- Current public `npm run seo:live` proof is saved at `/Users/vilovieta/Documents/Shopify/tmp/shopify-live-proof/seo-ops-audit.json`; it fails because unauthenticated routes return the password page and live `llms.txt` still returns Shopify HTML until the ops proxy is deployed.
- Check Home, `/collections/all`, `/pages/order-now`, `/pages/faq`, `/pages/contact`, `/products/standard-phone`, and `/products/rugged-phone` on the exact desktop/mobile access path the client will use.
- Deploy and check automatic route-level `llms.txt` output:
  - `/llms.txt`
  - `/products/standard-phone/llms.txt`
  - `/products/rugged-phone/llms.txt`
  - `/collections/all/llms.txt`
  - `/a/llms.txt?path=/pages/faq` if using Shopify app proxy routing.
- If using the included server-side path, deploy `/Users/vilovieta/Documents/Shopify/ops/storefront-ops-server.js` on persistent storage and use `/Users/vilovieta/Documents/Shopify/ops/README.md` for environment variables and proxy routing.
- Deployment templates are in `/Users/vilovieta/Documents/Shopify/ops/patriot-phone-ops.service.example`, `/Users/vilovieta/Documents/Shopify/ops/patriot-phone-ops.env.example`, `/Users/vilovieta/Documents/Shopify/ops/cloudflare-worker.example.js`, and `/Users/vilovieta/Documents/Shopify/ops/wrangler.toml.example`.
- After deployment, prove the public endpoint with `OPS_BASE_URL=... CRM_VIEWER_TOKEN=... CRM_ORDER_INGEST_TOKEN=... SHOPIFY_ORDER_WEBHOOK_SECRET=... SHOPIFY_STORE_URL=https://jordan-mark-premier.myshopify.com npm run ops:deployment:audit`; the proof artifact redacts both tokens and the webhook secret.
- After configuring Theme Editor `CRM endpoint URL`, save rendered contact page HTML and run `CONTACT_CRM_HTML=/path/to/rendered-contact-page.html CONTACT_CRM_EXPECTED_ENDPOINT=https://www.example.com/crm/capture npm run contact:crm:audit`.
- If the owner wants leads or purchases sent to another system, configure outbound server variables `CRM_LEAD_WEBHOOK_URLS`, `CRM_SALE_WEBHOOK_URLS`, and `CRM_WEBHOOK_SECRET`. Do not put downstream secrets in Liquid.
- Confirm page source includes Patriot Phone `Organization`, home-page `WebSite`, and FAQ accordion `FAQPage` JSON-LD.
- Confirm Theme Editor can edit section content and reorder sections.
- Confirm add-to-cart works for both product handles.
- After real/test orders exist, run `ORDER_PROOF_INPUT=/path/to/shopify-orders.json npm run orders:proof:audit`; it writes `/Users/vilovieta/Documents/Shopify/tmp/shopify-live-proof/order-proof-audit.json` and `/Users/vilovieta/Documents/Shopify/tmp/shopify-live-proof/order-setup-details.csv`.
- Run the read-only object audit with Admin page-read scope if Admin API page-object proof is required:
  - `SHOPIFY_STORE=STORE.myshopify.com SHOPIFY_USE_CLI_SESSION=1 npm run store:objects:audit`
- Confirm contact form creates a CRM `lead` record with submitted date/time, every submitted field, `source_type=contact_form`, `lead_type=contact_form`, and tags after the CRM endpoint is deployed and configured in Theme Editor.
- Configure Shopify `orders/create` webhook delivery to `/crm/shopify/orders/create` and confirm purchases create CRM `sale` records with `source_type=shopify_order`, `sale_type`, order id/name, setup summary, and tags. Keep `/crm/orders/import` available for protected manual backfills.
- Confirm outbound lead webhooks send `crm.lead.created`, outbound purchase webhooks send `crm.sale.created`, and both include `x-patriot-phone-record-id` plus a `sha256=` HMAC signature when outbound destinations are configured.
- Confirm the hidden billing products exist, use template `product.billing-item`, are assigned to the Order Now/product/cart template settings, and are not added to the public `Phones` collection.
- Confirm a quantity-2 setup adds quantity 2 for the phone, selected service, and selected add-on billing items; different setups should be added as separate cart lines.
- Confirm staff can view and export CRM submissions without developer tools.
- If email notifications remain enabled, confirm contact form sends to the store contact email.
