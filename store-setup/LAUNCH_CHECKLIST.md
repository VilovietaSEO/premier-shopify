# Independence Phone Store Launch Checklist

Use this for `jordan-mark-premier.myshopify.com`. The final public domain can be connected after the store preview is approved.

Canonical repo:

```bash
/Users/vilovieta/Documents/Shopify
```

Primary local gate:

```bash
cd /Users/vilovieta/Documents/Shopify
npm run verify:local
```

Consolidated launch-readiness status:

```bash
cd /Users/vilovieta/Documents/Shopify
npm run launch:readiness
```

This command writes `/Users/vilovieta/Documents/Shopify/tmp/shopify-live-proof/launch-readiness-audit.json`. It is expected to exit nonzero until public access/SEO, live `llms.txt`, external checkout/ops, approved delivery tests, and order proof are complete.

## 1. Access And Store Target

- [ ] Confirm the store handle: `jordan-mark-premier.myshopify.com`.
- [ ] Confirm staff/collaborator access with theme permissions.
- [ ] Confirm Jordan and Mark have the operating access approved by the owner.
- [ ] Keep the developer administrator access needed for ongoing store work.
- [ ] Give the Rev.io/API developer only the least-privilege integration access required; do not grant payment or bank-setting access unless separately approved.
- [ ] Require two-step authentication for every staff and collaborator account.
- [ ] Confirm product, collection, page, navigation, files, and settings access.
- [ ] Confirm Admin API token includes `read_publications` and `write_publications`, or plan to publish objects to Online Store manually in admin.
- [ ] Confirm whether CLI login or Shopify Theme Access app password will be used.
- [ ] Do not connect or publish the final public domain until preview QA is approved.

## 2. Refresh Base Theme

- [ ] In Shopify admin, add the free Shopify `Refresh` theme.
- [ ] Get the Refresh theme ID:

```bash
shopify theme list --store STORE.myshopify.com
```

- [ ] Pull Refresh, apply the Independence Phone overlay, and run Theme Check:

```bash
cd /Users/vilovieta/Documents/Shopify
scripts/bootstrap-refresh-store.sh STORE.myshopify.com REFRESH_THEME_ID /Users/vilovieta/Documents/Shopify/refresh-theme
```

- [ ] Use the manual overlay path only if the bootstrap script is not appropriate:

```bash
cd /Users/vilovieta/Documents/Shopify
shopify theme pull --store STORE.myshopify.com --theme REFRESH_THEME_ID --path /Users/vilovieta/Documents/Shopify/refresh-theme
scripts/apply-refresh-overlay.sh /Users/vilovieta/Documents/Shopify/refresh-theme
shopify theme check --path /Users/vilovieta/Documents/Shopify/refresh-theme
```

## 3. Development Preview

- [ ] Start a non-live preview:

```bash
cd /Users/vilovieta/Documents/Shopify/refresh-theme
shopify theme dev --store STORE.myshopify.com --theme REFRESH_THEME_ID
```

- [ ] Save the preview URL.
- [ ] Save the Theme Editor URL.
- [ ] Do not publish from an unreviewed local state.

## 4. Product Data

Create product metafield definitions first:

```bash
/Users/vilovieta/Documents/Shopify/store-setup/product-metafields.json
```

CLI/API path if an Admin API token is available:

```bash
cd /Users/vilovieta/Documents/Shopify
SHOPIFY_STORE=STORE.myshopify.com \
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_... \
node scripts/create-product-metafields.js
```

Required product metafields:

- [ ] `custom.product_deck`
- [ ] `custom.best_for`
- [ ] `custom.specs`

Import or create exactly two products:

```bash
/Users/vilovieta/Documents/Shopify/store-setup/products.csv
```

CLI/API path after metafields exist:

```bash
cd /Users/vilovieta/Documents/Shopify
SHOPIFY_STORE=STORE.myshopify.com \
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_... \
node scripts/create-storefront-objects.js
```

Read-only proof after import/setup:

```bash
cd /Users/vilovieta/Documents/Shopify
SHOPIFY_STORE=STORE.myshopify.com SHOPIFY_USE_CLI_SESSION=1 npm run store:objects:audit
```

Required product handles:

- [ ] `/products/standard-phone`
- [ ] `/products/rugged-phone`
- [ ] Both products are published to the Online Store sales channel.

Required hidden billing product handles:

- [ ] `/products/monthly-service`
- [ ] `/products/annual-service`
- [ ] `/products/call-recording`
- [ ] `/products/family-quiet-hours`
- [ ] `/products/voicemail-to-email`
- [ ] `/products/auto-attendant`
- [ ] `/products/add-on-bundle`
- [ ] Billing products are active and purchasable, use template `product.billing-item`, and are not added to the `Phones` collection or public product cards.
- [ ] Each billing variant is `$0.00`, non-shipping, and uses its documented stable SKU.
- [ ] The retired `/products/patriot-package` product is not assigned, published, or used by the current order flow.

Required product facts:

- [ ] Classic Phone is `$100`.
- [ ] Rugged Phone is `$150`.
- [ ] Both products use template `product.independence-phone`.
- [ ] Both phone products use Shopify category `Electronics > Communications > Telephony > Cordless Phones` (`gid://shopify/TaxonomyCategory/el-4-8-3`).
- [ ] Deferred service/add-on products remain uncategorized pending accounting guidance.
- [ ] Product images are uploaded or assigned.
- [ ] Each phone's product media order is Front, optimized rotating MP4, Buttons, Charger, Back.
- [ ] Product images have concise alt text for SEO/accessibility.
- [ ] All seven service/add-on products use the approved American-flag media so checkout has no blank placeholder.
- [ ] Product image dimensions/file sizes are acceptable in Shopify media/file details before launch.
- [ ] Product descriptions and metafields match `/Users/vilovieta/Documents/Shopify/store-setup/README.md`.

Product media helper, if needed:

```bash
cd /Users/vilovieta/Documents/Shopify
npm run store:media:dry-run
SHOPIFY_THEME_ASSET_BASE='https://cdn.shopify.com/s/files/.../assets' \
SHOPIFY_PRODUCT_MEDIA_APPROVED=1 \
SHOPIFY_STORE=STORE.myshopify.com \
SHOPIFY_USE_CLI_SESSION=1 \
npm run store:media:assign
```

- [ ] Before a real media assignment, copy the exact asset-directory base from a rendered QA-theme asset URL; do not assume a `/cdn/shop/t/N/assets` number.
- [ ] Record explicit approval for the product-global media mutation before setting `SHOPIFY_PRODUCT_MEDIA_APPROVED=1`.
- [ ] Run `npm run store:retired-product:dry-run`; if the audit reports an active/published Patriot Package, obtain approval and run `SHOPIFY_RETIRED_PRODUCT_ARCHIVE_APPROVED=1 npm run store:retired-product:archive`.

## 5. Collection And Page Setup

- [ ] Create collection `Phones`.
- [ ] Set collection handle to `phones`.
- [ ] Add Classic Phone and Rugged Phone to the collection.
- [ ] Assign collection template `collection.phones`.
- [ ] Publish the collection to the Online Store sales channel.
- [ ] Create page `Contact`.
- [ ] Set page handle to `contact`.
- [ ] Assign page template `page.contact`.
- [ ] Create page `Order Now`.
- [ ] Set page handle to `order-now`.
- [ ] Assign page template `page.order`.
- [ ] Create page `FAQ`.
- [ ] Set page handle to `faq`.
- [ ] Assign page template `page.faq`.

## 6. Theme Editor Configuration

Use:

```bash
/Users/vilovieta/Documents/Shopify/independence-phone-theme/THEME_EDITOR_GUIDE.md
```

Home page:

- [ ] Open `Home page` in Theme Editor.
- [ ] Select `IP video hero`.
- [ ] Upload or select hero video: `/Users/vilovieta/Documents/Shopify/brief-materials/assets/video/indy-phone-reel-1.mov`.
- [ ] Confirm hero positioning: `Give your child a phone, not the internet.`
- [ ] Confirm the JTBD line is removed and the section starts with the updated reachability heading.
- [ ] Confirm the primary CTA says `Order now` and points to `/pages/order-now`.

Order Now page:

- [ ] Open page template `page.order`.
- [ ] Confirm the page presents Choose your phone, Choose your service plan, and Choose add-ons with no Patriot Package.
- [ ] Confirm selected-state highlighting and separate immediate/future price language render.
- [ ] Confirm neither Privacy Policy/Terms consent nor desired area code is requested on Order Now.

Product pages:

- [ ] Open `Classic Phone` with template `product.independence-phone`.
- [ ] Open `Rugged Phone` with template `product.independence-phone`.
- [ ] Confirm the product image, price, specs, service copy, and add-ons render without Patriot Package copy.
- [ ] Confirm the product form shows monthly/annual service choices.
- [ ] Confirm the product form shows Call Recording, Quiet Hours, Voicemail to Email, Add-on Bundle, and Auto Attendant add-on choices.
- [ ] Confirm the hidden billing products are assigned in the product form and Order Now template settings.
- [ ] Confirm add-to-cart works for both products and adds phone, service, and selected add-ons as grouped cart items.
- [ ] Confirm dynamic/express checkout buttons are off unless an app checkout path also adds the hidden billing products.

Contact page:

- [ ] Open page template `page.contact`.
- [ ] Confirm contact form fields render.
- [ ] Confirm Theme Editor `CRM endpoint URL` is blank so the form uses Shopify's native contact handling for this handoff.
- [ ] Confirm Shopify Admin `Settings -> Notifications -> Sender email` is `jordan@premiercompanies.com`.
- [ ] Record explicit client approval before submitting any external contact-form delivery test.
- [ ] After approval, submit a uniquely labeled test and confirm delivery to `jordan@premiercompanies.com`.
- [ ] If CRM capture is later approved, confirm the endpoint stores submitted date/time plus every submitted field, staff can view the lead without developer tools, and CSV export includes the same data.

## 7. Navigation And Store Settings

Main menu:

- [ ] Home -> `/`
- [ ] Order Now -> `/pages/order-now`
- [ ] FAQ -> `/pages/faq`
- [ ] Contact -> `/pages/contact`

Footer menu:

- [ ] Order Now -> `/pages/order-now`
- [ ] FAQ -> `/pages/faq`
- [ ] Contact -> `/pages/contact`
- [ ] Privacy Policy -> `/policies/privacy-policy`
- [ ] Terms and Conditions -> `/policies/terms-of-service`

Store settings:

- [ ] Header logo is uploaded/selected from `/Users/vilovieta/Documents/Shopify/brief-materials/assets/logo/independence-phone-logo-export.png`.
- [ ] Exactly one flat `$15` shipping rate applies per order.
- [ ] No second shipping method appears.
- [ ] Taxes calculate after a customer enters an address.
- [ ] The final Rev.io/gateway path is configured or production checkout remains explicitly blocked.
- [ ] Store contact email is correct.
- [ ] Native contact-form Sender email is `jordan@premiercompanies.com`.
- [ ] Staff new-order notifications include `mark@premiercompanies.com` and `jordan@premiercompanies.com`; this list is separate from the contact-form Sender email.
- [ ] Record explicit client approval before sending a contact-form test or placing a test order that triggers external email.
- [ ] Policies are drafted or approved.

## 8. SEO And Operations Readiness

SEO:

- [ ] Online Store preferences have a launch-ready home page title.
- [ ] Online Store preferences have a launch-ready home page meta description.
- [ ] Classic Phone search-engine listing is edited.
- [ ] Rugged Phone search-engine listing is edited.
- [ ] `/collections/all` and `/collections/phones` search-engine listings are edited.
- [ ] FAQ, Contact, and Order Now page search-engine listings are edited.
- [ ] Page source includes `<title>`, meta description, canonical, Open Graph, and Twitter card tags.
- [ ] Product page source includes Shopify product structured data.
- [ ] FAQ page source includes FAQPage JSON-LD only for real FAQs.
- [ ] `/sitemap.xml` resolves after the storefront is public.
- [ ] `/robots.txt` is reviewed; Shopify defaults are accepted or a custom `templates/robots.txt.liquid` is intentionally added.
- [ ] Automatic raw Markdown `llms.txt` is deployed for root and route-level requests.
- [ ] `/llms.txt` returns a homepage/site overview in `text/plain; charset=utf-8`.
- [ ] `/products/standard-phone/llms.txt` returns a product-specific Markdown summary.
- [ ] `/products/rugged-phone/llms.txt` returns a product-specific Markdown summary.
- [ ] `/pages/order-now/llms.txt` returns a guided order-flow Markdown summary.
- [ ] `/a/llms.txt?path=/pages/faq` returns the FAQ Markdown summary when using Shopify app proxy routing.
- [ ] Run the local llms proof:

```bash
cd /Users/vilovieta/Documents/Shopify
npm run llms:test
```
- [ ] Run the live SEO proof after the storefront is publicly reachable:

```bash
cd /Users/vilovieta/Documents/Shopify
SHOPIFY_STORE_URL=https://STORE.myshopify.com npm run seo:live
```

- [ ] If the storefront is still password-gated or you are auditing an unpublished draft theme, run the password/preview variant without putting the password in shell history:

```bash
cd /Users/vilovieta/Documents/Shopify
read -s SHOPIFY_STOREFRONT_PASSWORD
export SHOPIFY_STOREFRONT_PASSWORD
SHOPIFY_STORE_URL=https://STORE.myshopify.com \
SHOPIFY_PREVIEW_THEME_ID=THEME_ID \
npm run seo:live
unset SHOPIFY_STOREFRONT_PASSWORD
```

- [ ] Save or review the generated proof at `/Users/vilovieta/Documents/Shopify/tmp/shopify-live-proof/seo-ops-audit.json`.

Operations:

- [ ] Confirm hidden billing products exist and use template `product.billing-item`: Monthly Service, Annual Service, Call Recording, Quiet Hours, Voicemail to Email, Auto Attendant, and Add-on Bundle.
- [ ] Confirm hidden billing products are active/purchasable but not added to the `Phones` collection or visible public product grid.
- [ ] Confirm all seven billing products use `$0.00` Shopify variants, no shipping requirement, stable SKUs, and American-flag media.
- [ ] Place a test order or approved manual order for Classic Phone with monthly service and one add-on.
- [ ] Place a test order or approved manual order for Rugged Phone with annual service and Add-on Bundle.
- [ ] Confirm Shopify Admin order detail shows the phone line plus zero-dollar service/add-on lines with matching setup quantities.
- [ ] Confirm service/add-on lines preserve future charge, billing cadence, and `first_day_of_next_month`.
- [ ] Confirm the Order Now page and cart do not contain policy consent or desired-area-code fields.
- [ ] Confirm cart removal deletes the phone and its grouped service/add-on lines.
- [ ] Confirm fulfillment/tracking workflow is available in Shopify Admin.
- [ ] Export orders to CSV and confirm setup details are usable, or document the need for a custom export/app.
- [ ] If Shopify's native CSV does not expose setup properties cleanly, use the local custom-export proof and exporter:

```bash
cd /Users/vilovieta/Documents/Shopify
npm run orders:test
ORDER_PROOF_INPUT=/path/to/shopify-orders.json \
npm run orders:proof:audit
ORDER_SETUP_EXPORT_INPUT=/path/to/shopify-orders.json \
ORDER_SETUP_EXPORT_OUTPUT=/path/to/order-setup-details.csv \
npm run orders:export
```

- [ ] Confirm `/Users/vilovieta/Documents/Shopify/tmp/shopify-live-proof/order-proof-audit.json` reports `status: pass`.
- [ ] Confirm `/Users/vilovieta/Documents/Shopify/tmp/shopify-live-proof/order-setup-details.csv` contains the Classic monthly add-on order and Rugged annual/bundle order.

### Storefront/cart handoff proof

- [ ] The checkout handoff schema is `independence_phone.revio_checkout.v2`.
- [ ] Each line includes stable SKU, role, quantity, `checkout_price_cents`, `future_charge_cents`, `billing_cadence`, and `first_bill_rule`.
- [ ] Phone-only merchandise is due today.
- [ ] Shipping is exactly `1500` cents once per order.
- [ ] Tax is marked pending until the final checkout has an address.
- [ ] Future service/add-on total is shown separately and begins the first day of the following month.
- [ ] Patriot Package and `PP-PATRIOT-PACKAGE` are absent.

### External Rev.io/gateway proof

These items cannot be completed by the Shopify theme alone:

- [ ] Final checkout requires Privacy Policy/Terms consent exactly once.
- [ ] Final checkout requires desired area code.
- [ ] Server validates every variant, SKU, quantity, role, checkout price, future price, cadence, and first-bill rule.
- [ ] Server rejects browser-tampered values and retired package roles/SKUs.
- [ ] Checkout creation, payment, provisioning, retry, and webhook handling are idempotent.
- [ ] Today's payment includes only phone, applicable tax, and one `$15` shipping fee.
- [ ] Service/add-ons are scheduled for the first day of the following month and are not charged today.
- [ ] No raw card number, CVV, or Rev.io credential appears in the browser, Shopify metadata, logs, or CRM.
- [ ] Complete `/Users/vilovieta/Documents/Shopify/REVIO_INTEGRATION_HANDOFF.md` sandbox proof before enabling production checkout.

### Optional CRM track

The CRM items below are not required for the current native-contact handoff. Run them only if the client separately approves CRM capture and deployment.

- [ ] Implement simple CRM capture through an approved server-side path, such as a custom Shopify app/app proxy, Shopify Forms/CRM app, or external backend.
- [ ] If using the included ops service, deploy `/Users/vilovieta/Documents/Shopify/ops/storefront-ops-server.js` on persistent storage with `CRM_SUBMISSIONS_PATH`, `CRM_VIEWER_TOKEN`, `CRM_ORDER_INGEST_TOKEN`, `SHOPIFY_ORDER_WEBHOOK_SECRET`, and `LLMS_SITE_URL` configured.
- [ ] If using the included persistent-host path, start from `/Users/vilovieta/Documents/Shopify/ops/patriot-phone-ops.service.example` and `/Users/vilovieta/Documents/Shopify/ops/patriot-phone-ops.env.example`.
- [ ] Build the minimal ops deployment bundle before copying files to the persistent host:

```bash
cd /Users/vilovieta/Documents/Shopify
npm run ops:bundle
```

- [ ] Confirm `/Users/vilovieta/Documents/Shopify/tmp/patriot-phone-ops-deployment/deployment-manifest.json` lists `/crm/capture`, `/crm/shopify/orders/create`, `/crm/orders/import`, `/crm/leads`, `/crm/leads.csv`, and `/llms.txt`.
- [ ] If using Cloudflare for final-domain routing, start from `/Users/vilovieta/Documents/Shopify/ops/cloudflare-worker.example.js` and `/Users/vilovieta/Documents/Shopify/ops/wrangler.toml.example`.
- [ ] Run the combined ops proof before deployment:

```bash
cd /Users/vilovieta/Documents/Shopify
npm run ops:test
npm run ops:deployment:audit:test
```

- [ ] Keep Theme Editor `CRM endpoint URL` blank for native contact delivery. Configure a deployed HTTPS `/crm/capture` endpoint only if the client later approves CRM capture.
- [ ] If CRM capture is approved, configure Shopify `orders/create` webhook delivery to the deployed HTTPS `/crm/shopify/orders/create` endpoint.
- [ ] If leads or purchases need to fan out to another system, configure outbound destinations on the ops host with `CRM_LEAD_WEBHOOK_URLS`, `CRM_SALE_WEBHOOK_URLS`, and `CRM_WEBHOOK_SECRET`.
- [ ] Confirm outbound lead deliveries use event `crm.lead.created`; outbound sale deliveries use event `crm.sale.created`; both include `x-patriot-phone-record-id` and `x-patriot-phone-signature`.
- [ ] If CRM capture is approved, save the rendered live contact page HTML and prove it posts to the CRM endpoint:

```bash
cd /Users/vilovieta/Documents/Shopify
CONTACT_CRM_HTML=/path/to/rendered-contact-page.html \
CONTACT_CRM_EXPECTED_ENDPOINT=https://www.example.com/crm/capture \
npm run contact:crm:audit
```

- [ ] If CRM capture is approved, confirm `/Users/vilovieta/Documents/Shopify/tmp/shopify-live-proof/contact-crm-wiring-audit.json` reports `status: pass`.

### Public `llms.txt` and combined ops proof

- [ ] Configure an edge/proxy/app-proxy route for `/llms.txt`, route-level `.../llms.txt`, and/or `/a/llms.txt?path=/...`.
- [ ] Run the deployed endpoint proof and save `/Users/vilovieta/Documents/Shopify/tmp/shopify-live-proof/ops-deployment-audit.json`:

```bash
cd /Users/vilovieta/Documents/Shopify
OPS_BASE_URL=https://www.example.com \
CRM_VIEWER_TOKEN=<staff-token> \
CRM_ORDER_INGEST_TOKEN=<order-ingest-token> \
SHOPIFY_ORDER_WEBHOOK_SECRET=<Shopify order webhook signing secret> \
SHOPIFY_STORE_URL=https://jordan-mark-premier.myshopify.com \
npm run ops:deployment:audit
```

### Optional CRM verification

Complete these checks only if the client approves CRM lead or sale capture.

- [ ] If CRM capture is approved, confirm contact leads are tagged with `record_type=lead`, `source_type=contact_form`, `lead_type=contact_form`, and useful tags.
- [ ] Confirm purchases are automatically captured in CRM through `/crm/shopify/orders/create` and tagged with `record_type=sale`, `source_type=shopify_order`, and the correct `sale_type`; keep `/crm/orders/import` available for protected manual backfills.
- [ ] Confirm failed outbound deliveries do not erase the local CRM record; downstream retry/alerting should be handled by the receiving automation tool or production host monitoring.
- [ ] Confirm the CRM captures submitted date/time, source URL, referrer/UTMs, name, email, phone, interested product, selected service, selected add-ons, message, marketing opt-in, and checkout consent evidence when provided by the final gateway.
- [ ] Confirm staff can expand `View details` for a lead or sale and see normalized fields, raw submitted fields, and metadata.
- [ ] Confirm the CRM has spam protection, at minimum honeypot plus rate limiting or the equivalent app controls.
- [ ] Confirm the CRM viewer shows newest submissions first plus total, lead, and sale counts.
- [ ] Export CRM leads/sales to CSV and confirm all normalized fields, `raw_form_fields_json`, and `meta_json` are included.

## 9. Claim Discipline QA

Confirm the storefront does not imply unsupported features:

- [ ] SMS/texting.
- [ ] GPS.
- [ ] Camera.
- [ ] Cellular mobility.
- [ ] App support.
- [ ] Browser support.
- [ ] YouTube/social access.
- [ ] 911/emergency calling.

Confirm the storefront keeps the main pitch parent-first:

- [ ] `Give your child a phone, not the internet.`
- [ ] The old `Reachable without scrollable` eyebrow is absent.
- [ ] `A phone that acts like a phone`.
- [ ] The old `The useful part of a phone, first.` heading is absent.
- [ ] `For bus days, home-alone minutes, and grandparents.`
- [ ] American-owned messaging is secondary trust, not the first pitch.

## 10. Pre-Publish QA Matrix

Desktop and mobile:

- [ ] Home `/`.
- [ ] Order Now `/pages/order-now`.
- [ ] FAQ `/pages/faq`.
- [ ] Classic Phone `/products/standard-phone`.
- [ ] Rugged Phone `/products/rugged-phone`.
- [ ] Contact `/pages/contact`.
- [ ] Page source includes Independence Phone `Organization`, home-page `WebSite`, and FAQ accordion `FAQPage` JSON-LD.
- [ ] Cart shows selected service/add-on setup details.
- [ ] Cart shows phone-only due-today merchandise, one `$15` shipping fee, tax pending until address, and separate future charges.
- [ ] Cart removal removes the complete grouped setup.
- [ ] Final Rev.io/gateway checkout path passes the required sandbox proof.
- [ ] 404/system pages use Shopify boilerplate acceptably.

Theme Editor:

- [ ] Edit a section heading.
- [ ] Edit a row/block in FAQ or add-ons.
- [ ] Reorder a section.
- [ ] Change the hero video or poster.
- [ ] Confirm changes save and render in preview.

## 11. Publish And Domain

- [ ] Push the approved theme to a non-live theme first.

```bash
cd /Users/vilovieta/Documents/Shopify/refresh-theme
shopify theme push --store STORE.myshopify.com --theme REFRESH_THEME_ID
```

- [ ] Publish only after the preview URL is approved.

```bash
shopify theme publish --store STORE.myshopify.com --theme REFRESH_THEME_ID
```

- [ ] Connect the final public domain after publish approval.
- [ ] Re-test Home, product pages, contact, cart, and checkout on the final domain.

Reference docs:

- `/Users/vilovieta/Documents/Shopify/independence-phone-theme/SHOPIFY_HANDOFF.md`
- `/Users/vilovieta/Documents/Shopify/independence-phone-theme/THEME_EDITOR_GUIDE.md`
- `/Users/vilovieta/Documents/Shopify/refresh-overlay/README.md`
- `/Users/vilovieta/Documents/Shopify/store-setup/README.md`
