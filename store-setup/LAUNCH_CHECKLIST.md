# Independence Phone Store Launch Checklist

Use this when Shopify store access is available. The final public domain can be connected after store preview, payment path, ops hosting, CRM, and order proof are approved.

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

This command writes `/Users/vilovieta/Documents/Shopify/tmp/shopify-live-proof/launch-readiness-audit.json`. It is expected to exit nonzero until public access/SEO, live `llms.txt`, deployed CRM/ops, and order proof are complete.

## 1. Access And Store Target

- [ ] Confirm the store handle: `jordan-mark-premier.myshopify.com` or the current `STORE.myshopify.com`.
- [ ] Confirm staff/collaborator access with theme permissions.
- [ ] Confirm product, collection, page, navigation, files, and settings access.
- [ ] Confirm Admin API token includes `read_publications` and `write_publications`, or plan to publish objects to Online Store manually in admin.
- [ ] Confirm whether CLI login or Shopify Theme Access app password will be used.
- [ ] Do not connect or publish the final public domain until preview QA is approved.

## 1.1 Users, Roles, And Store Ownership

- [ ] Store owner/admin goes to `Settings -> Users`.
- [ ] Add Jordan, Mark, support staff, fulfillment staff, and any API/developer users who need access.
- [ ] Assign least-privilege roles instead of giving every user administrator access.
- [ ] Require two-step authentication for users with payment, order, user, app, theme, or settings access.
- [ ] Confirm every invite is accepted; Shopify invitations expire after seven days.
- [ ] Keep the Rev.io/API implementer out of Shopify payment/bank settings unless explicitly approved.

Official reference: `https://help.shopify.com/en/manual/your-account/users/invite-users`

## 1.2 Payment Path

Choose one launch path before real order proof.

Fastest path: native Shopify Checkout.

- [ ] Go to `Settings -> Payments`.
- [ ] Activate Shopify Payments or an approved third-party provider.
- [ ] Leave Theme Editor `Cart -> Rev.io checkout handoff URL` blank.
- [ ] Confirm checkout can collect payment and create a Shopify order.
- [ ] Configure Shopify `orders/create` webhook to the ops server so paid orders become CRM sale records.
- [ ] Decide whether Rev.io sync happens after Shopify payment.

Rev.io checkout path:

- [ ] Deploy the ops server publicly.
- [ ] Configure `REVIO_CHECKOUT_WEBHOOK_URLS` and `REVIO_WEBHOOK_SECRET` on the ops server.
- [ ] Set Theme Editor `Cart -> Rev.io checkout handoff URL` to `https://YOUR_DOMAIN/revio/checkout`.
- [ ] Confirm the cart handoff creates a CRM sale/checkout intent record.
- [ ] Confirm the API implementer receives and verifies the signed `revio.checkout.requested` webhook.
- [ ] Confirm Rev.io sandbox payment/request proof before launch.

Do not put Rev.io API keys, APIM subscription keys, Basic Auth credentials, raw card data, or payment-processing code in Shopify Liquid, JavaScript, or Theme Editor settings.

Official payment references:

- `https://help.shopify.com/en/manual/payments/shopify-payments/onboarding`
- `https://help.shopify.com/en/manual/payments/third-party-providers`

## 2. Refresh Base Theme

- [ ] In Shopify admin, add the free Shopify `Refresh` theme.
- [ ] Get the Refresh theme ID:

```bash
shopify theme list --store STORE.myshopify.com
```

- [ ] Pull Refresh, apply the Patriot Phone overlay, and run Theme Check:

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
- [ ] `/products/patriot-package`
- [ ] Billing products are active and purchasable, use template `product.billing-item`, and are not added to the `Phones` collection or public product cards.
- [ ] Billing products are not physical products and do not require shipping.

Required product facts:

- [ ] Classic Phone is `$100`.
- [ ] Rugged Phone is `$150`.
- [ ] Classic Phone and Rugged Phone are physical products and require shipping.
- [ ] Both products use template `product.independence-phone`.
- [ ] Product images are uploaded or assigned.
- [ ] Product images have concise alt text for SEO/accessibility.
- [ ] Product image dimensions/file sizes are acceptable in Shopify media/file details before launch.
- [ ] Product descriptions and metafields match `/Users/vilovieta/Documents/Shopify/store-setup/README.md`.

Product media helper, if needed:

```bash
cd /Users/vilovieta/Documents/Shopify
npm run store:media:dry-run
SHOPIFY_STORE=STORE.myshopify.com SHOPIFY_USE_CLI_SESSION=1 npm run store:media:assign
```

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
- [ ] Confirm hero positioning: `Give them a phone. Not the internet.`
- [ ] Confirm the JTBD line is removed and the section starts with the updated reachability heading.
- [ ] Confirm the primary CTA says `Order now` and points to `/pages/order-now`.

Order Now page:

- [ ] Open page template `page.order`.
- [ ] Confirm the page presents Patriot Package, Choose your phone, Choose your plan, and Choose add-ons.
- [ ] Confirm selected-state highlighting, savings descriptors, and policy checkbox render.

Product pages:

- [ ] Open `Classic Phone` with template `product.independence-phone`.
- [ ] Open `Rugged Phone` with template `product.independence-phone`.
- [ ] Confirm the product image, price, specs, service copy, add-ons, and package band render.
- [ ] Confirm the product form shows monthly/annual service choices.
- [ ] Confirm the product form shows Call Recording, Quiet Hours, Voicemail to Email, Add-on Bundle, and Auto Attendant add-on choices.
- [ ] Confirm the hidden billing products are assigned in the product form and Order Now template settings.
- [ ] Confirm add-to-cart works for both products and adds phone, service, and selected add-ons as grouped cart items.
- [ ] Confirm dynamic/express checkout buttons are off unless an app checkout path also adds the hidden billing products.

Contact page:

- [ ] Open page template `page.contact`.
- [ ] Confirm contact form fields render.
- [ ] Confirm the form posts to the approved simple CRM capture path, not email-only handling.
- [ ] Submit a test lead with unique values in every field.
- [ ] Confirm the CRM record stores submitted date/time plus every submitted field.
- [ ] Confirm staff can view the lead without developer tools.
- [ ] Confirm CSV export includes the same timestamp and all submitted fields.
- [ ] If email notification remains enabled, confirm delivery to the store contact email.

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
- [ ] Terms of Service -> `/policies/terms-of-service`

Store settings:

- [ ] Header logo is uploaded/selected from `/Users/vilovieta/Documents/Shopify/brief-materials/assets/logo/independence-phone-logo-export.png`.
- [ ] Shipping is configured for `$15/phone` or the approved Shopify shipping model.
- [ ] Taxes are configured for launch requirements.
- [ ] Payments are configured or launch checkout behavior is explicitly approved.
- [ ] Store contact email is correct.
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
- [ ] `/pages/order-now/llms.txt` returns a guided order-builder Markdown summary.
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

- [ ] Confirm hidden billing products exist and use template `product.billing-item`: Monthly Service, Annual Service, Call Recording, Quiet Hours, Voicemail to Email, Auto Attendant, Add-on Bundle, and Patriot Package.
- [ ] Confirm hidden billing products are active/purchasable but not added to the `Phones` collection or visible public product grid.
- [ ] Place a test order or approved manual order for Classic Phone with monthly service and one add-on.
- [ ] Place a test order or approved manual order for Classic Phone with Patriot Package, annual service, and Add-on Bundle.
- [ ] Confirm Shopify Admin order detail shows the phone line plus the priced service/add-on billing line items with matching setup quantities.
- [ ] Confirm the phone line still shows service plan, add-ons, Patriot Package, savings, and policy agreement line-item properties for staff setup review.
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
- [ ] Confirm `/Users/vilovieta/Documents/Shopify/tmp/shopify-live-proof/order-setup-details.csv` contains the Classic monthly add-on order and Classic Patriot Package annual/bundle order.

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

- [ ] Configure the Theme Editor `CRM endpoint URL` to the deployed HTTPS `/crm/capture` endpoint.
- [ ] Configure Shopify `orders/create` webhook delivery to the deployed HTTPS `/crm/shopify/orders/create` endpoint.
- [ ] If leads or purchases need to fan out to another system, configure outbound destinations on the ops host with `CRM_LEAD_WEBHOOK_URLS`, `CRM_SALE_WEBHOOK_URLS`, and `CRM_WEBHOOK_SECRET`.
- [ ] Confirm outbound lead deliveries use event `crm.lead.created`; outbound sale deliveries use event `crm.sale.created`; both include `x-patriot-phone-record-id` and `x-patriot-phone-signature`.
- [ ] Save the rendered live contact page HTML and prove it posts to the CRM endpoint:

```bash
cd /Users/vilovieta/Documents/Shopify
CONTACT_CRM_HTML=/path/to/rendered-contact-page.html \
CONTACT_CRM_EXPECTED_ENDPOINT=https://www.example.com/crm/capture \
npm run contact:crm:audit
```

- [ ] Confirm `/Users/vilovieta/Documents/Shopify/tmp/shopify-live-proof/contact-crm-wiring-audit.json` reports `status: pass`.
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

- [ ] Confirm contact leads are tagged with `record_type=lead`, `source_type=contact_form`, `lead_type=contact_form`, and useful tags.
- [ ] Confirm purchases are automatically captured in CRM through `/crm/shopify/orders/create` and tagged with `record_type=sale`, `source_type=shopify_order`, and the correct `sale_type`; keep `/crm/orders/import` available for protected manual backfills.
- [ ] Confirm failed outbound deliveries do not erase the local CRM record; downstream retry/alerting should be handled by the receiving automation tool or production host monitoring.
- [ ] Confirm the CRM captures submitted date/time, source URL, referrer/UTMs, name, email, phone, age range, use case, interested product, preferred plan, Patriot Package interest, selected add-ons, message, marketing opt-in, and privacy/terms consent if present.
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

- [ ] `Give them a phone. Not the internet.`
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
- [ ] Checkout path approved for launch.
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
