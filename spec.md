# Shopify Flow Remediation Spec

Date: 2026-06-30
Store: `jordan-mark-premier.myshopify.com`
Live theme: `Independence Phone` / theme ID `150479208517`
Status: current theme is live; storefront remains password-gated; final client review still required

## Purpose

This spec captures the issues found in the current Shopify draft flow, the required fix steps for each issue, the proof needed to verify each fix, and the quality definition for considering each issue complete.

The original core problem was that the theme files were updated faster than the Shopify store objects. The draft theme expected Classic/Rugged products and an Order Now page before those objects were fully visible in the store.

## Execution Status: 2026-06-30

The theme `Independence Phone` (`150479208517`) has been pushed and published live. The previous live theme `Horizon` (`150479175749`) is now unpublished.

Verified locally:

- `npm run verify:local`
- Goal coverage audit: `984 passed, 0 failed`
- Simple CRM proof: timestamp, all fields, expandable staff viewer details, CSV export with raw field/metadata columns, honeypot, and rate limit verified
- Storefront ops proof: combined health check, CRM capture/view/export, storefront-origin post-capture redirect, root `llms.txt`, route-level `llms.txt`, and app-proxy style `llms.txt` verified
- Ops deployment audit proof: health, CRM capture/view/export, storefront return redirect, raw `llms.txt` routes, and token redaction verified locally
- Order setup export proof: setup line-item properties normalize to staff-readable CSV
- Order proof audit: `ORDER_PROOF_INPUT=/path/to/shopify-orders.json npm run orders:proof:audit` validates the two required real/test order scenarios and writes a launch-readiness artifact once order data exists
- Storefront object audit proof: read-only product, collection, and page checks validate expected launch objects
- Launch readiness audit: `npm run launch:readiness` writes a consolidated current-state artifact and intentionally reports `blocked` until live public SEO/LLMS, ops deployment, and order proof are complete
- Shopify Theme Check: `64 files inspected with no offenses found`
- Playwright visual preview: `4 passed`

Verified against the live Shopify storefront:

- `shopify theme list --store jordan-mark-premier.myshopify.com` reports `Independence Phone` as `[live]` and `Horizon` as `[unpublished]`.
- `curl -sS -I https://jordan-mark-premier.myshopify.com/` returns a password redirect, which is expected while storefront password protection is enabled.
- The live storefront response includes `server-timing` theme proof: `theme;desc="150479208517"`.
- The verified CRM/contact theme update was pushed to live theme `150479208517` with `shopify theme push --allow-live`; the post-push theme list and storefront header still confirm `Independence Phone` is live.
- The read-only Shopify object audit using the existing Shopify CLI session confirms `standard-phone` and `rugged-phone` are active, use template `product.independence-phone`, are priced at `$100.00` and `$150.00`, are both in the `phones` collection, and now have `mediaCount: 2` plus `mediaWithAltCount: 2` after `npm run store:media:assign`.
- Password-authenticated live route proof confirms `/pages/order-now`, `/pages/faq`, and `/pages/contact` render and are not 404s.
- Current public SEO audit artifact `/Users/vilovieta/Documents/Shopify/tmp/shopify-live-proof/seo-ops-audit.json` confirms public unauthenticated routes still return the password page, and live `llms.txt` routes still return Shopify HTML because the ops proxy has not been deployed.
- The current Shopify CLI session cannot read `pages`; Admin page-object verification still needs a token/session with `read_content` or `read_online_store_pages`.

Verified against the Shopify draft preview:

- `/collections/all?preview_theme_id=150479208517` renders the product-selection page.
- `/products/standard-phone?preview_theme_id=150479208517` renders the redesigned product page.
- `/pages/order-now?preview_theme_id=150479208517` renders the guided order builder.
- `/pages/faq?preview_theme_id=150479208517` renders the standalone FAQ/support page.
- `/pages/contact?preview_theme_id=150479208517` renders the contact form page.
- `/cart?preview_theme_id=150479208517` renders the custom cart review page.
- Collection card images are full-width inside the card, top/left/right flush, `object-fit: cover`, and 320px tall at the desktop proof viewport.
- Product page uses the homepage palette: white surface, navy text, red purchase button.
- Product gallery is sticky on desktop during the initial product overview and releases before the lower `Product Details` section.
- Classic Phone product form successfully adds the product with service/add-on/policy line-item properties.
- Order builder successfully adds Rugged Phone with Patriot Package, annual service, add-on bundle, savings descriptor, and policy line-item properties. The updated cart model also supports configured service/add-on billing products as real Shopify cart items grouped by hidden setup id.
- Unauthenticated preview currently redirects to `/password`; client access needs the store password, an Admin-generated preview path that bypasses password protection, or temporary password disablement.
- `shopify theme share` was tested. It created temporary unpublished theme `balanced-aspect` (`150747545669`), but unauthenticated access still redirected to `/password`; the temporary theme was deleted.
- Password-gated preview access was verified from a clean curl session without storing the password in proof artifacts.
- Theme Editor guide, store setup README, and launch checklist now document merchant media ownership, product image alt text, image size checks, SEO metadata, sitemap/robots scope, automatic route-level `llms.txt`, order detail/export checks, and the simple CRM capture boundary.
- Coverage audit now enforces the SEO/operations documentation plus theme SEO tags, editable design controls, product-card gallery media/alt behavior, product-card gallery overlay parity, the live SEO audit script, the local CRM capture proof, and the automatic `llms.txt` proof.
- `scripts/audit-live-seo.js` and `npm run seo:live` are available to generate `/Users/vilovieta/Documents/Shopify/tmp/shopify-live-proof/seo-ops-audit.json` after the storefront is publicly reachable.
- `crm/simple-crm.js`, `crm/README.md`, `scripts/test-simple-crm.js`, and `scripts/audit-contact-crm-wiring.js` now provide the CRM capture path, signed Shopify order webhook capture, expandable local viewer, CSV export with raw field/metadata columns, contact-form wiring proof, and lead/sale tagging proof.
- Contact submissions are tagged as CRM lead records with `record_type=lead`, `source_type=contact_form`, `lead_type=contact_form`, and tags.
- Shopify order webhooks and protected manual imports are tagged as CRM sale records with `record_type=sale`, `source_type=shopify_order`, `sale_type`, order id/name, setup summary, and tags.
- Optional outbound webhooks are configurable on the ops server for owner-controlled integrations. Leads dispatch `crm.lead.created`; sales dispatch `crm.sale.created`; both include `x-patriot-phone-record-id` and `x-patriot-phone-signature: sha256=...` when `CRM_LEAD_WEBHOOK_URLS`, `CRM_SALE_WEBHOOK_URLS`, and `CRM_WEBHOOK_SECRET` are configured.
- `ops/storefront-ops-server.js`, `ops/README.md`, `ops/patriot-phone-ops.service.example`, `ops/patriot-phone-ops.env.example`, `ops/cloudflare-worker.example.js`, `ops/wrangler.toml.example`, `scripts/test-storefront-ops-server.js`, and `scripts/audit-ops-deployment.js` now provide a deployable combined server-side path plus deployed-endpoint proof for CRM lead capture, signed Shopify order webhook capture, sale import backfill, view/export, and automatic `llms.txt` routing.
- The live SEO audit supports password-gated draft previews with `SHOPIFY_STOREFRONT_PASSWORD` and `SHOPIFY_PREVIEW_THEME_ID`. It uses an in-memory cookie jar and records only password metadata in the proof artifact, not the password itself.
- `templates/robots.txt.liquid` now preserves Shopify default robots groups through `robots.default_groups`.
- `llms/automatic-llms.js` now generates raw Markdown for root `/llms.txt` and route-level files such as `/products/standard-phone/llms.txt`, `/collections/all/llms.txt`, and Shopify app-proxy requests such as `/a/llms.txt?path=/pages/faq`.
- `scripts/create-storefront-objects.js` now creates the three Shopify pages that actually need page objects: `order-now`, `faq`, and `contact`.
- `scripts/audit-storefront-objects.js` provides a read-only Admin GraphQL audit for product titles, handles, prices, templates, metafields, media counts, collection membership, and required pages.

Proof artifacts:

- `/Users/vilovieta/Documents/Shopify/tmp/shopify-flow-proof/collection-all-final-edge-flush.png`
- `/Users/vilovieta/Documents/Shopify/tmp/shopify-flow-proof/product-standard-final-palette-top.png`
- `/Users/vilovieta/Documents/Shopify/tmp/shopify-flow-proof/product-standard-final-palette-details.png`
- `/Users/vilovieta/Documents/Shopify/tmp/shopify-live-proof/live-bridge-verification.json`
- `/Users/vilovieta/Documents/Shopify/tmp/shopify-live-proof/cart-standard-product-flow.png`
- `/Users/vilovieta/Documents/Shopify/tmp/shopify-live-proof/cart-rugged-package-flow.png`
- `/Users/vilovieta/Documents/Shopify/tmp/shopify-live-proof/anonymous-preview-home.html`
- `/Users/vilovieta/Documents/Shopify/tmp/shopify-live-proof/anonymous-preview-headers.txt`
- `/Users/vilovieta/Documents/Shopify/tmp/shopify-live-proof/share-preview-home.html`
- `/Users/vilovieta/Documents/Shopify/tmp/shopify-live-proof/share-preview-headers.txt`
- `/Users/vilovieta/Documents/Shopify/tmp/shopify-live-proof/password-access-verification.json`
- `/Users/vilovieta/Documents/Shopify/tmp/shopify-live-proof/password-preview-home.html`
- `/Users/vilovieta/Documents/Shopify/tmp/shopify-live-proof/password-preview-headers.txt`
- `/Users/vilovieta/Documents/Shopify/tmp/shopify-live-proof/storefront-objects-audit.json`
- `/Users/vilovieta/Documents/Shopify/tmp/shopify-live-proof/seo-ops-audit.json`
- `/Users/vilovieta/Documents/Shopify/tmp/shopify-live-proof/launch-readiness-audit.json`
- `/Users/vilovieta/Documents/Shopify/tmp/shopify-live-proof/contact-crm-wiring-audit.json` after rendered contact HTML is audited
- `/Users/vilovieta/Documents/Shopify/tmp/simple-crm-test-submissions.jsonl`

Note: Shopify Admin's visible Theme Editor "saved" timestamp may reflect Theme Editor settings saves rather than the latest Shopify CLI asset upload. The CLI push completed successfully, and the preview route served the updated CSS during verification.

## Acceptance Audit: 2026-06-30

| Requirement | Status | Evidence |
| --- | --- | --- |
| Homepage CTAs do not 404 | Pass | `live-bridge-verification.json` shows all homepage `Order now` links point to `/collections/all`; `/collections/all` route `notFound: false`. |
| Product-selection page reachable in one click from homepage | Pass | Homepage hero/package/footer `Order now` links resolve to `/collections/all`. |
| Classic/Rugged product pages exist and render | Pass | `/products/standard-phone` and `/products/rugged-phone` route checks show `notFound: false`, correct H1s, and product forms. |
| Product prices are `$100` and `$150` | Pass | Live product metrics show Standard `$100.00`, Rugged `$150.00`; cart subtotals match. |
| Collection/product-selection page visually matches homepage quality | Pass pending client review | Live screenshot and metrics confirm polished two-card layout, controlled spacing, homepage palette. |
| Collection card images are smaller, edge-flush, and gallery-capable | Pass | Live metrics show two media boxes at 646x320, top/left/right flush, `objectFit: cover`; code supports product media and Theme Editor image blocks. Read-only Admin audit now confirms both live products have two media items and both media items have alt text. |
| Product pages use sticky gallery/details behavior and homepage palette | Pass | Live metrics show `galleryPosition: sticky`, white section background, red purchase button, `Product Details` release before details section. |
| Every product/order button has a working destination | Pass | Live route checks and cart flows confirm product card links and order builder submit work. |
| Cart receives selected phone and options | Pass | `cart-standard-product-flow.png`, `cart-rugged-package-flow.png`, and live JSON show service, add-ons, package, savings, and policy properties. |
| FAQ page exists and renders | Pass | `/pages/faq` route check `notFound: false`; standalone FAQ support copy renders. |
| Client preview access works outside builder/admin context or has documented password access | Pass with store password | Clean-session proof shows password-gated access serves the draft-preview homepage; `password-access-verification.json` masks the password and does not store it. CLI `shopify theme share` still redirected to `/password`. |
| Desktop and mobile screenshots reviewed | Partial pass | Desktop live proof captured. Local Playwright covers mobile preview. Fresh unauthenticated mobile browser proof remains gated by password/share path. |
| Unsupported claims are controlled | Pass | Claim terms appear only in negative/unsupported contexts such as `without apps`, `No web browser`, and FAQ/capability rows. |
| Merchant media/SEO/order/contact readiness is documented and audited | Pass locally; live admin execution remains | `npm run verify:local` now reports coverage audit `984 passed, 0 failed`; docs and checklist cover product media, alt text, SEO listings, sitemap/robots, automatic route-level `llms.txt`, order export, CRM contact-form storage, deployment bundle generation, and read-only store-object auditing. `npm run seo:live` generates the live SEO proof artifact and can use a password-gated storefront without storing the password. `npm run store:objects:audit` generated `tmp/shopify-live-proof/storefront-objects-audit.json`; products, prices, templates, collection membership, product media, and media alt text pass. Storefront page routes pass; Admin page-object verification still needs page-read scope. Store-admin proof is still required after launch settings/test orders are available. |
| Robots and automatic raw Markdown `llms.txt` exist locally | Pass locally; live proxy deployment remains | Theme Check passes with `64 files inspected`; `templates/robots.txt.liquid` keeps Shopify default robots groups. `llms/automatic-llms.js`, `ops/storefront-ops-server.js`, `npm run llms:test`, and `npm run ops:test` verify root, app proxy, product, collection, page, content type, and missing-route behavior. Live proof still requires deploying the ops service behind `/llms.txt` or `/a/llms.txt`. |
| Simple CRM captures form submissions and purchases | Pass locally; live deployment remains | `crm/simple-crm.js` captures submitted date/time and every form field, tags contact submissions as CRM `lead` records, captures signed Shopify order webhooks and protected manual imports as CRM `sale` records, renders `/crm/leads` with expandable full-record details, exports `/crm/leads.csv` with normalized fields plus raw field/metadata JSON columns, includes honeypot/rate-limit controls, and redirects successful external captures back to the Shopify storefront origin. `ops/storefront-ops-server.js` combines the CRM and `llms.txt` endpoints behind one deployable process. `npm run crm:test`, `npm run contact:crm:audit:test`, `npm run ops:test`, `npm run ops:bundle:test`, and `npm run ops:deployment:audit:test` verify timestamp, all fields, lead/sale tags, Shopify webhook signature checks, viewer details, CSV completeness, honeypot, rate limit, storefront return redirect, endpoint routing, deployment bundle contents, deployed-endpoint audit behavior, and secret redaction. Live completion still requires deploying the endpoint, entering its HTTPS URL in the Theme Editor `CRM endpoint URL` field, configuring Shopify `orders/create` webhook delivery to `/crm/shopify/orders/create`, auditing rendered contact HTML, and proving real/test purchases as CRM sales. |

## Remaining Work: Current

The build is no longer blocked by missing products, missing product media, dead homepage CTAs, or missing storefront page routes. The remaining work is operational launch proof:

Current consolidated proof:

```bash
cd /Users/vilovieta/Documents/Shopify
npm run launch:readiness
```

Latest result: `blocked` with 13 pass, 1 pending, and 7 blockers. The saved artifact is `/Users/vilovieta/Documents/Shopify/tmp/shopify-live-proof/launch-readiness-audit.json`.

1. Decide how Jordan/Mark will access the password-gated store for review: share the store password, temporarily disable storefront password protection, or use a Shopify preview method that actually bypasses password protection.
2. Build `tmp/patriot-phone-ops-deployment` with `npm run ops:bundle`, then deploy the included ops service from that bundle so the simple CRM, optional outbound lead/sale webhooks, and automatic raw Markdown `llms.txt` routes are publicly reachable behind HTTPS.
3. Enter the deployed CRM endpoint URL in the live theme's `CRM endpoint URL` setting, then audit rendered contact HTML with `CONTACT_CRM_HTML=... CONTACT_CRM_EXPECTED_ENDPOINT=... npm run contact:crm:audit`, submit a real contact test, and export it from the CRM viewer.
4. Wire/prove `/llms.txt`, route-level `.../llms.txt`, and/or `/a/llms.txt?path=...` on the live domain, then run `OPS_BASE_URL=... CRM_VIEWER_TOKEN=... CRM_ORDER_INGEST_TOKEN=... SHOPIFY_ORDER_WEBHOOK_SECRET=... npm run ops:deployment:audit`.
5. Re-run the live SEO audit against the password-unlocked or public storefront after ops proxy deployment; the current saved artifact is blocker proof, not final SEO pass proof.
6. Run a real/test Shopify order after checkout/payment settings are ready, then confirm order line-item properties, savings descriptors, policy acceptance, fulfillment/tracking visibility, and export behavior in Shopify Admin.
   - Proof command: `ORDER_PROOF_INPUT=/path/to/shopify-orders.json npm run orders:proof:audit`
   - Expected artifacts: `/Users/vilovieta/Documents/Shopify/tmp/shopify-live-proof/order-proof-audit.json` and `/Users/vilovieta/Documents/Shopify/tmp/shopify-live-proof/order-setup-details.csv`
   - CRM requirement: purchases must be automatically tracked as CRM `sale` records through the signed `/crm/shopify/orders/create` webhook with `source_type=shopify_order`, `sale_type`, order id/name, and tags; `/crm/orders/import` remains the manual backfill path.
   - Billing requirement: the phone line must carry setup properties while selected service/add-ons are actual priced billing items when hidden billing products are configured.
   - Integration requirement: if the owner configures outbound destinations, purchases must also dispatch `crm.sale.created` and contact leads must dispatch `crm.lead.created` with HMAC signatures.
7. Re-run the Admin object audit with page-read scope if the client wants Admin API proof of page objects; storefront route proof already confirms the pages render.
8. Do final client review on desktop and mobile using the actual access method they will receive.

## Operational And SEO Readiness Addendum

These are launch-readiness gaps or confirmations that sit above the visual flow work. They matter because the merchant will expect a Shopify store to handle media, SEO, orders, inquiries, and exports without developer intervention.

## Issue 19: Merchant Media Management Needs A Clear Ownership Boundary

### Problem

The theme supports product media and Theme Editor image blocks, but the owner needs to know where each image type is edited. Product images belong to Shopify product media. Section images, such as hero poster, logo, and comparison fallback/gallery images, belong to Theme Editor settings and blocks.

### Fix Steps

1. Document the exact admin paths for product images:
   - Shopify Admin -> Products -> Classic Phone -> Media
   - Shopify Admin -> Products -> Rugged Phone -> Media
2. Document the Theme Editor paths for section images:
   - Home page -> `IP video hero`
   - Header -> logo image
   - Collection template -> `IP product comparison` fallback images and Classic/Rugged gallery image blocks
3. Confirm the product page gallery uses Shopify `product.media`.
4. Confirm the collection product cards use Shopify product media first and Theme Editor gallery blocks as an additional fallback/control surface.
5. Add at least two images to one phone and confirm thumbnail tiles appear.

### Proof Fixed

- Screenshot Shopify product media with multiple images assigned.
- Screenshot `/collections/all` showing product-card thumbnail tiles.
- Screenshot `/products/standard-phone` or `/products/rugged-phone` showing product-page thumbnails.
- Confirm no code edit is needed to add or remove product photos.

### Done Quality

- The owner can add, remove, and reorder product photos in Shopify Admin.
- The owner can add collection-card supporting images in Theme Editor blocks.
- Product media alt text comes from Shopify media alt text when present.
- Decorative thumbnail images remain empty-alt where they duplicate the main image.
- Image ownership is documented so future edits do not overwrite merchant-managed photos.

## Issue 20: SEO Controls Need A Launch Checklist

### Problem

The theme renders canonical URLs, page titles, meta descriptions, Open Graph, Twitter cards, product structured data, Organization/WebSite JSON-LD, and FAQPage JSON-LD. Shopify also provides SEO fields on store objects. The missing piece is a store-owner checklist proving every public object has edited SEO metadata before launch.

### Fix Steps

1. Set Online Store Preferences:
   - homepage title
   - homepage meta description
   - social sharing image if available
2. Edit search-engine listings for:
   - Classic Phone
   - Rugged Phone
   - `/collections/all`
   - `/collections/phones`
   - FAQ page
   - Contact page
   - Order Now page
3. Add concise alt text to every meaningful product image.
4. Confirm theme meta output on each public route:
   - `<title>`
   - `<meta name="description">`
   - `<link rel="canonical">`
   - Open Graph title/description/image
5. Confirm product pages output Shopify product structured data.
6. Confirm FAQ sections output FAQPage JSON-LD only for real FAQs.

### Proof Fixed

- View-source or crawler proof for title, meta description, canonical, OG tags, and JSON-LD on home, collection, product, FAQ, and contact pages.
- Admin screenshots or exported notes showing SEO titles/descriptions are populated.
- Image alt audit showing all meaningful product media has descriptive alt text.

### Done Quality

- No public page depends on a generic Shopify-generated title/description.
- Every meaningful image has alt text.
- Canonical tags are present and correct.
- Schema exists where appropriate and does not make unsupported claims.

## Issue 21: Robots, Sitemap, And Automatic LLM Text Files Need Explicit Scope

### Problem

Shopify provides platform sitemap behavior, and this theme now includes `templates/robots.txt.liquid` while preserving Shopify defaults through `robots.default_groups`. The correct LLM surface is not a Shopify page. It is automatic raw Markdown text for the homepage/site overview and every meaningful storefront route: homepage, collections, products, FAQ/contact/order pages, and cart/order-flow surfaces.

Important implementation boundary: a Shopify theme cannot directly create arbitrary root text routes such as `/llms.txt` or route-level `.../llms.txt`. The repo now provides the generator/server in `llms/automatic-llms.js`; live deployment requires an edge/proxy/custom-domain route for root `/llms.txt` or a Shopify app proxy such as `/a/llms.txt`.

The deployable path is `/Users/vilovieta/Documents/Shopify/ops/storefront-ops-server.js`, which serves CRM endpoints and automatic `llms.txt` routes from one persistent server-side process. `/Users/vilovieta/Documents/Shopify/ops/README.md` documents the persistent-host variables and edge/proxy routing requirements.

### Fix Steps

1. Confirm `/sitemap.xml` works after the store is published and products/pages are public.
2. Confirm `/robots.txt` renders Shopify default groups from `templates/robots.txt.liquid`.
3. Generate raw Markdown route summaries automatically from repo/store data:
   - root `/llms.txt` for homepage/site overview
   - `/collections/all/llms.txt` for the product-selection/order-flow route
   - `/products/standard-phone/llms.txt`
   - `/products/rugged-phone/llms.txt`
   - `/pages/faq/llms.txt`
   - `/pages/contact/llms.txt`
4. Deploy the automatic generator behind one approved route layer:
   - edge/proxy route for root `/llms.txt` and route-level `.../llms.txt`
   - Shopify app proxy for `/a/llms.txt?path=/...`
   - custom app route if the final hosting stack supports it
5. Define the content source for markdown route summaries:
   - page/product/collection data
   - theme section copy
   - generated summaries from the route manifest
   - manually curated summaries only where needed

### Proof Fixed

- Fetch `/sitemap.xml` and confirm public products/pages appear.
- Fetch `/robots.txt` and confirm the launch directives.
- Fetch `/llms.txt` and confirm it returns `text/plain; charset=utf-8` raw Markdown with the homepage/site overview.
- Fetch `/products/standard-phone/llms.txt` and `/products/rugged-phone/llms.txt` and confirm each returns product-specific Markdown.
- Fetch `/collections/all/llms.txt` and confirm it returns collection/order-flow Markdown.
- If using Shopify app proxy routing, fetch `/a/llms.txt?path=/pages/faq` and confirm it returns FAQ-specific Markdown.
- Confirm the generated Markdown omits unsupported claims and links to canonical public pages.
- Local proof: `npm run llms:test`.
- Combined deployment proof: `npm run ops:test`.

### Done Quality

- Sitemap and robots behavior are verified, not assumed.
- `llms.txt` is automatic, raw Markdown, and route-level.
- Homepage/root output summarizes the store.
- Product, collection, page, and cart/order-flow routes each have faithful route-specific Markdown.
- Root `/llms.txt` or app-proxy `/a/llms.txt` has a real route and a repeatable update process before launch.

## Issue 22: Typography, Heading Levels, And Resizing Are Mostly Code-Owned

### Problem

The theme exposes a global font picker, page width, page margin, color tokens, input radius, copy fields, richtext fields, and section/block order. It does not currently expose arbitrary per-section font-size sliders, H1/H2/H3 switches, product-image sizing controls, sticky behavior controls, or layout-resize controls.

### Fix Steps

1. Document the current editable design controls:
   - global primary font
   - page width
   - page margin
   - palette colors
   - input corner radius
   - section copy and richtext
   - section/block order
2. Identify any controls the client truly needs after review.
3. Add schema settings only where merchant control is useful and safe.
4. Keep semantic heading levels code-owned unless there is a real content-management need.
5. Keep product/card image sizing code-owned unless the merchant needs selectable layout variants.

### Proof Fixed

- Theme Editor screenshot showing global typography/layout settings.
- Theme Editor screenshot showing section copy/richtext settings.
- Written list of controls that are intentionally code-owned.

### Done Quality

- The owner knows what can be edited without code.
- The theme does not expose dangerous controls that can break mobile layout or SEO hierarchy.
- Heading hierarchy remains semantically clean.

## Issue 23: Orders, Setup Choices, Tracking, And Export Need An Ops Check

### Problem

Shopify Admin handles orders, order counts, fulfillment status, tracking numbers, customer/order status pages, and CSV exports. The theme captures Patriot Package, phone, service plan, add-ons, savings, and policy agreement as line-item properties on the phone line, and now supports real priced service/add-on billing products grouped by hidden setup id. This needs to be verified in a real/test order after checkout settings are configured.

Dynamic/express checkout buttons must remain off for the phone product templates unless an app-level checkout path also adds the hidden billing products. The supported theme path is add-to-cart, cart review, then checkout.

The local fallback export path is `/Users/vilovieta/Documents/Shopify/orders/setup-export.js`. It converts Shopify orders JSON with line-item properties into a staff-readable setup-detail CSV if the native Shopify CSV does not expose those properties cleanly enough. The real/test order proof path is `/Users/vilovieta/Documents/Shopify/scripts/audit-order-proof.js`.

### Fix Steps

1. Configure the approved launch checkout/payment path.
2. Place a test order or approved manual order using:
   - Classic Phone with monthly service and one add-on
   - Rugged Phone with Patriot Package, annual service, and add-on bundle
3. Confirm Shopify Admin order detail shows all line-item properties.
4. Confirm fulfillment/tracking workflow is available in Shopify Admin.
5. Export orders to CSV and confirm setup details are included or decide if a custom export is needed.
6. Run `ORDER_PROOF_INPUT=/path/to/shopify-orders.json npm run orders:proof:audit`.
7. If a custom export is needed, use `npm run orders:export` with a Shopify orders JSON source and verify the output with `npm run orders:test`.

### Proof Fixed

- Admin screenshot of an order with selected service/add-ons/policy properties visible.
- Fulfillment/tracking screenshot or documented admin path.
- CSV export sample showing whether setup details are present in usable form.
- Local custom-export proof: `npm run orders:test`.
- Real/test order proof: `ORDER_PROOF_INPUT=/path/to/shopify-orders.json npm run orders:proof:audit`.

### Done Quality

- Staff can see exactly what the customer selected from the Shopify order.
- Staff can fulfill and add tracking using Shopify Admin.
- Staff can export orders and setup details without asking a developer, or the custom-export gap is explicitly scoped.
- If native CSV is insufficient, a documented setup-detail CSV exporter exists and is verified against the theme's line-item property names.

## Issue 24: Simple CRM Capture, Viewing, And Export Is Required

### Problem

The contact page now supports a configurable simple CRM endpoint while preserving Shopify's native contact form as the fallback when no endpoint is configured. A native Shopify contact email is not enough for the launch requirement because staff need durable records, viewer access, CSV export, and tagged lead/sale records.

Important implementation boundary: a Shopify theme cannot securely write CRM records by itself because Liquid runs without a private Admin API context. The CRM capture needs a server-side path such as a small Shopify app/app-proxy endpoint, a CRM/form app, or another approved backend. The theme can still own the customer-facing form UI.

The included server-side path is `/Users/vilovieta/Documents/Shopify/ops/storefront-ops-server.js`; it combines `/crm/capture`, `/crm/shopify/orders/create`, `/crm/orders/import`, `/crm/leads`, `/crm/leads.csv`, `/llms.txt`, and route-level `.../llms.txt` in one deployable process. Production use requires persistent storage for `CRM_SUBMISSIONS_PATH`, a protected `CRM_VIEWER_TOKEN`, a protected `CRM_ORDER_INGEST_TOKEN`, and a `SHOPIFY_ORDER_WEBHOOK_SECRET`. The deployable file set is generated with `npm run ops:bundle` into `/Users/vilovieta/Documents/Shopify/tmp/patriot-phone-ops-deployment`.

### Fix Steps

1. Keep the existing contact form design in the theme, but change submission handling from email-only to CRM capture.
2. Configure the Theme Editor `CRM endpoint URL` field with the deployed HTTPS capture endpoint.
3. Audit the rendered contact page HTML with `npm run contact:crm:audit`.
4. Use the included `crm/simple-crm.js` endpoint or replace it with an approved CRM/form app if it exposes every required field and export.
5. Capture a CRM lead record for every submission with:
   - submitted date and time, stored as ISO timestamp plus store timezone display
   - `record_type`, `source_type`, `lead_type`, `sale_type`, `tags`
   - source page URL, referrer, and UTM fields when present
   - name
   - email
   - phone
   - age range
   - use case
   - interested product
   - preferred plan
   - Patriot Package interest
   - selected add-ons
   - message
   - marketing opt-in
   - privacy/terms consent state if shown on the form
6. Capture Shopify purchases through the signed `orders/create` webhook into CRM sale records with `record_type=sale`, `source_type=shopify_order`, `sale_type`, order id/name, setup summary, and tags. Keep protected order import available for manual backfills.
7. Add spam protection appropriate for the chosen endpoint, at minimum a honeypot field and rate limiting.
8. Add a staff-facing viewer that shows newest submissions first, summarizes total/lead/sale counts, and allows staff to inspect every normalized field, raw submitted field, and metadata value for each record.
9. Add CSV export for all captured fields, including raw submitted fields and metadata.
10. Define retention, access, and deletion expectations for inquiry data.

### Proof Fixed

- Submit a test lead with unique values in every visible form field.
- Screenshot the CRM viewer showing the test lead, timestamp, and all submitted fields.
- Confirm the CRM viewer summary shows total records, leads, and sales.
- Expand `View details` in the CRM viewer and confirm normalized fields, raw submitted fields, and metadata are visible.
- Export CSV and confirm the same test lead includes every submitted field with the correct timestamp.
- Confirm staff can find the record without developer tools.
- Confirm email notification still works if the client wants email in addition to CRM capture.
- Local proof: `npm run crm:test`.
- Contact wiring proof: `CONTACT_CRM_HTML=/path/to/rendered-contact-page.html CONTACT_CRM_EXPECTED_ENDPOINT=https://www.example.com/crm/capture npm run contact:crm:audit`.
- Combined endpoint proof: `npm run ops:test`.
- Deployment bundle proof: `npm run ops:bundle:test`.
- Deployed automatic purchase proof: `OPS_BASE_URL=... CRM_VIEWER_TOKEN=... CRM_ORDER_INGEST_TOKEN=... SHOPIFY_ORDER_WEBHOOK_SECRET=... npm run ops:deployment:audit`.

### Done Quality

- Every contact form submission creates a durable CRM lead record.
- Every purchase creates a durable CRM sale record through the Shopify webhook, and manual imports can backfill missed records.
- Staff can view leads and sales, see record counts, see when records came in, distinguish their type/tags, inspect full details, and export all normalized/raw fields.
- No form field is only present in email.
- The implementation does not expose Admin API credentials in theme code.
- Privacy/retention behavior is documented before launch.

## Original Observed State

This section is historical diagnosis. The current status is summarized in `Execution Status`, `Acceptance Audit`, and `Remaining Work: Current` above.

Homepage CTA destinations:

- Hero `Order now` links to `/pages/order-now`.
- Patriot Package `Order now` links to `/pages/order-now`.
- Footer `Order Now` links to `/pages/order-now`.
- `/pages/order-now` currently returns `404`.

Product routes:

- `/products/freedom-phone` exists, but still shows old name and price: `Freedom Phone`, `$99`.
- `/products/patriot-phone` exists, but still shows old name and price: `Patriot Phone`, `$149`.
- `/products/standard-phone` returns `404`.
- `/products/rugged-phone` returns `404`.
- `/products/independence-phone` returns `404`.

Collection routes:

- `/collections/phones` exists and renders the intended product-comparison style page.
- `/collections/phones` has product buttons, but they point to missing new product handles.
- `/collections/all` is likely a usable Shopify collection destination, but it needs to be confirmed and polished in the preview context.

Screenshots captured during diagnosis:

- `/Users/vilovieta/Documents/Shopify/tmp/shopify-flow-map/home-preview.png`
- `/Users/vilovieta/Documents/Shopify/tmp/shopify-flow-map/order-now.png`
- `/Users/vilovieta/Documents/Shopify/tmp/shopify-flow-map/collections-phones.png`
- `/Users/vilovieta/Documents/Shopify/tmp/shopify-flow-map/products-freedom-phone.png`
- `/Users/vilovieta/Documents/Shopify/tmp/shopify-flow-map/products-patriot-phone.png`

## Route Decision

Canonical product-selection route: `/collections/all`.

Rationale: the homepage needs one working product-discovery destination immediately, and `/collections/all` is the least surprising Shopify URL for browsing the two customer-facing products. `/pages/order-now` should still be created and assigned to `page.order` as the guided order-builder page, but homepage and cart product-discovery CTAs should not depend on that page.

## Issue 1: Homepage CTAs Point To A Missing Page

### Problem

The homepage contains multiple visible `Order now` links that route to `/pages/order-now`, but the Shopify page object does not exist. Users land on a 404 instead of seeing products or checkout options.

### Fix Steps

1. Choose the canonical product-selection destination:
   - `/collections/all`
   - `/collections/phones`
   - or a newly created `/pages/order-now`
2. Update every homepage `Order now` link to the chosen destination.
3. Update the Patriot Package CTA destination.
4. Update the footer `Order Now` destination.
5. Confirm no homepage CTA points to `/pages/order-now` unless that page exists.

### Proof Fixed

1. Open the draft homepage preview.
2. Inspect every visible `Order now` / `Order Now` link.
3. Click each CTA from:
   - hero
   - package band
   - footer
4. Confirm each click lands on a real page, not a 404.
5. Capture desktop and mobile screenshots of the homepage and destination page.

### Done Quality

- A visitor can reach product options in one click from the homepage.
- No primary CTA routes to a missing page.
- Desktop and mobile flows both work.
- The route decision is documented so future edits do not reintroduce conflicting CTA targets.

## Issue 2: `/pages/order-now` Does Not Exist

### Problem

The theme includes `templates/page.order.json`, but Shopify pages are store objects. Pushing the theme does not create a page. As a result, `/pages/order-now` returns 404.

### Fix Steps

If keeping `/pages/order-now`:

1. Create Shopify page object:
   - Title: `Order Now`
   - Handle: `order-now`
   - Template: `page.order`
2. Confirm the page is published/visible in the Online Store channel.
3. Configure the `IP order builder` section with real Shopify products.
4. Confirm the page content renders outside Theme Editor.

If not keeping `/pages/order-now`:

1. Remove it as a CTA destination.
2. Use the chosen collection route as the purchase/product-selection route.
3. Remove or deprioritize dead footer links to `/pages/order-now`.

### Proof Fixed

- Directly visit `/pages/order-now`.
- Confirm it does not render 404.
- Confirm it shows:
  - Patriot Package
  - Classic/Rugged phone choices
  - monthly/annual plan choices
  - add-ons
  - policy checkbox
  - order summary

### Done Quality

- `/pages/order-now` either exists and works, or no live user-facing link points to it.
- The customer flow does not depend on a missing Shopify page object.

## Issue 3: Classic/Rugged Product Handles Do Not Exist

### Problem

The updated theme expects:

- `/products/standard-phone`
- `/products/rugged-phone`

But the store currently has:

- `/products/freedom-phone`
- `/products/patriot-phone`

The current product buttons on the product-selection page point to missing handles.

### Fix Steps

1. Decide whether to rename existing products or create new products.
2. Recommended approach:
   - Rename `Freedom Phone` product to `Classic Phone`.
   - Change handle from `freedom-phone` to `standard-phone`.
   - Change price from `$99` to `$100`.
   - Rename `Patriot Phone` product to `Rugged Phone`.
   - Change handle from `patriot-phone` to `rugged-phone`.
   - Change price from `$149` to `$150`.
3. Keep the brand reference `Patriot Phone` in brand/trust/package copy only.
4. Assign both products to the chosen product collection.
5. Assign both products to template `product.independence-phone`.
6. Confirm product images and metafields are assigned.

### Proof Fixed

- Visit `/products/standard-phone`.
- Confirm the product page renders and title is `Classic Phone`.
- Confirm price is `$100`.
- Visit `/products/rugged-phone`.
- Confirm the product page renders and title is `Rugged Phone`.
- Confirm price is `$150`.
- Confirm both products are available in the Online Store sales channel.

### Done Quality

- Public product naming matches client direction.
- Public product pricing uses round numbers.
- Product handles match every theme and collection link.
- Old product handles are not linked anywhere in the customer flow unless intentionally redirected.

## Issue 4: Collection Product Buttons Point To 404s

### Problem

`/collections/phones` displays product cards for Classic/Rugged, but the card buttons link to missing product handles:

- `View Classic Phone` -> `/products/standard-phone` -> 404
- `View Rugged Phone` -> `/products/rugged-phone` -> 404

### Fix Steps

1. Fix/create the Standard and Rugged products.
2. Confirm collection product-card settings are bound to the actual Shopify products.
3. Remove fallback links that point to missing handles if the products are not created yet.
4. Recheck both card CTAs after product setup.

### Proof Fixed

- Open the chosen product-selection page.
- Click `View Classic Phone`.
- Confirm it loads the Classic Phone product page.
- Return to product-selection page.
- Click `View Rugged Phone`.
- Confirm it loads the Rugged Phone product page.

### Done Quality

- Every visible product-card CTA works.
- Product cards use actual Shopify product data where possible.
- No product-card CTA relies on a fallback handle that does not exist.

## Issue 5: Homepage Has No Working Product Discovery Path

### Problem

The two-phone chooser was removed from the homepage based on client feedback, but the replacement path is broken. As currently rendered, the homepage does not provide a working route to product options.

### Fix Steps

1. Keep the homepage clean and focused.
2. Route primary CTAs to the chosen working product-selection page.
3. Consider adding one secondary link such as:
   - `Compare phones`
   - `View phone options`
   - `See Standard vs Rugged`
4. Ensure the secondary link does not turn the homepage into a broad product grid.

### Proof Fixed

- From the homepage hero, reach product options in one click.
- From the package band, reach product options in one click.
- From the footer, reach product options in one click.
- Confirm visible destination shows Classic/Rugged options or a working order-builder.

### Done Quality

- Visitors understand the offer on the homepage.
- Visitors can reach phone choices without guessing or using the footer.
- The homepage remains high-quality and not catalog-heavy.

## Issue 6: Canonical Product-Selection Route Is Ambiguous

### Problem

The project currently has several possible product-selection routes:

- `/collections/all`
- `/collections/phones`
- `/pages/order-now`

Only `/collections/phones` is confirmed to render the custom product-selection layout. `/pages/order-now` is missing. `/collections/all` may be familiar/default Shopify behavior, but needs a design pass if used.

### Fix Steps

1. Pick one canonical route.
2. Update all major CTAs to that route.
3. Ensure non-canonical routes either:
   - still look acceptable
   - clearly route onward
   - or are not exposed in navigation
4. Update docs to reflect the chosen route.

### Proof Fixed

- Homepage CTA links all match the selected route.
- Footer CTA matches the selected route.
- Product/package CTAs match the selected route.
- No visible customer flow sends users to an unintended duplicate or dead route.

### Done Quality

- There is one obvious product-selection path.
- The theme, store content, and documentation all agree on that path.
- The customer never has to decide between similar routes.

## Issue 7: Collection Page Visual Quality Is Below Homepage Quality

### Problem

The homepage has a strong visual standard. The collection/product-selection page feels less polished. The screenshot shows excessive top/section spacing, awkward gray field margins, and a service-plan section that feels too loose for a purchase flow.

### Fix Steps

1. Tighten vertical spacing on collection/product-selection pages.
2. Reduce top padding in the service-plan section.
3. Make the first viewport product-led, not service-led.
4. Arrange the page flow as:
   - choose phone
   - choose plan
   - add-ons/package
   - FAQ/support
5. Keep service and add-on sections compact and scannable.
6. Ensure mobile layout has no oversized blank zones.

### Proof Fixed

- Capture desktop screenshot of the collection/product-selection page.
- Capture mobile screenshot.
- Compare against homepage visual quality.
- Confirm no large accidental gray margin/void appears.
- Confirm the first viewport clearly says what the user should do next.

### Done Quality

- Collection page feels like the same product as the homepage.
- Product choice is visually dominant.
- Spacing feels deliberate, not like a default section dropped into the page.
- Mobile and desktop are both polished.

## Issue 8: Product Data And Theme Copy Are Out Of Sync

### Problem

Theme copy has been updated to Classic/Rugged and round prices, but live Shopify products still use old names/prices. This creates mixed customer-facing language and broken links.

### Fix Steps

1. Update Shopify product titles.
2. Update Shopify product handles.
3. Update Shopify prices.
4. Update Shopify product descriptions.
5. Update product metafields:
   - `custom.product_deck`
   - `custom.best_for`
   - `custom.specs`
6. Confirm product template assignment.
7. Confirm collection membership.
8. Run the read-only object audit with Admin auth:
   - `SHOPIFY_STORE=STORE.myshopify.com SHOPIFY_USE_CLI_SESSION=1 npm run store:objects:audit`

### Proof Fixed

- Product pages show correct names and prices.
- Collection cards show correct names and prices.
- Cart line items show correct names and prices.
- Theme Editor product selectors show the correct product names.
- Local proof: `npm run store:objects:audit:test`.
- Live proof after Admin auth: `npm run store:objects:audit`.

### Done Quality

- No mixed `Freedom Phone`, `Patriot Phone`, `Classic Phone`, `Rugged Phone` naming appears in the purchase path except approved brand use of `Patriot Phone`.
- Store data and theme copy tell the same story.

## Issue 9: Order Builder Depends On Store Objects That Are Not Wired

### Problem

The order-builder section exists in the theme, but it requires real product selections in Theme Editor or real product IDs created by setup. Without product references, the UI can render but cart behavior may fail or add the wrong product.

### Fix Steps

1. Confirm the Classic Phone product exists.
2. Confirm the Rugged Phone product exists.
3. Assign both products in the `IP order builder` section settings.
4. Test phone radio selection changes the variant/product ID.
5. Test Patriot Package behavior.
6. Test add-to-cart.

### Proof Fixed

- Select Classic Phone + monthly service.
- Add to cart.
- Cart shows Classic Phone and selected setup properties.
- Select Rugged Phone + Patriot Package.
- Add to cart.
- Cart shows Rugged Phone and package/annual/bundle properties.

### Done Quality

- Order builder is functional, not just visual.
- Selected phone maps to the correct Shopify product.
- Selected plan/add-ons are preserved in cart properties.
- No required policy checkbox can be bypassed.

## Issue 10: FAQ Page May Be Missing

### Problem

The footer links to `/pages/faq`, and the theme has `templates/page.faq.json`, but Shopify pages are store objects. The page must exist in Shopify Admin or the route will 404.

### Fix Steps

1. Visit `/pages/faq`.
2. If 404, create Shopify page:
   - Title: `FAQ`
   - Handle: `faq`
   - Template: `page.faq`
3. Confirm it is visible in the Online Store.
4. Confirm content supports installation, usage, referrals, and troubleshooting direction.

### Proof Fixed

- `/pages/faq` loads.
- Footer FAQ link works.
- Page uses the FAQ template.
- FAQ page is accessible outside Theme Editor.

### Done Quality

- FAQ is a real standalone page.
- Client can direct customers there confidently.

## Issue 11: Client Preview Access May Be Password Protected

### Problem

The public store may show a password page to unauthenticated users. A preview URL that works for the logged-in builder may not work for Jordan/Mark unless preview sharing or store password access is handled.

### Fix Steps

1. Open the preview URL in a clean/private browser session.
2. Confirm whether the password page appears.
3. If password protected, decide:
   - provide store password to client
   - use Shopify preview sharing
   - temporarily disable password only when appropriate
4. Document the exact URL and access instructions.

### Proof Fixed

- Open the shared URL as a non-admin user.
- Confirm the client can access the preview.
- Capture screenshot of what a non-admin visitor sees.

### Done Quality

- Client can test without needing builder/admin session assumptions.
- Preview access instructions are explicit and repeatable.

## Issue 12: Existing Old Product Pages Still Use Old Pricing

### Problem

The existing old product pages still show:

- Freedom Phone: `$99`
- Patriot Phone: `$149`

This conflicts with the client request for round numbers.

### Fix Steps

1. Update product prices to `$100` and `$150`, whether retaining old handles temporarily or renaming handles.
2. Confirm theme product cards and product pages pull the updated prices.
3. Confirm cart line items use the updated price.

### Proof Fixed

- Visit both active product pages.
- Confirm displayed prices are `$100` and `$150`.
- Add each product to cart and confirm cart totals reflect the new prices.

### Done Quality

- No active customer-facing product page shows `$99` or `$149`.
- Pricing is consistent across product cards, product pages, cart, and setup docs.

## Issue 13: Collection Page CTAs Still Reference A Missing Order Page

### Problem

The collection/product-selection page includes an `Order now` CTA that also points to `/pages/order-now`, which currently 404s.

### Fix Steps

1. If `/pages/order-now` is not created, update collection page CTAs to the chosen working destination.
2. If `/pages/order-now` is created, confirm the CTA lands on the working order-builder.
3. Confirm package-band CTA is not dead.

### Proof Fixed

- On collection/product-selection page, click `Order now`.
- Confirm the target page loads and is relevant to purchase.

### Done Quality

- No CTA on the collection page lands on 404.
- The route progression is clear from product selection to purchase/cart.

## Issue 14: `/collections/all` Needs Design Confirmation If Used As CTA Target

### Problem

The user suggested `/collections/all` may be the right CTA target. This may be true, but if it is used, it must be intentionally designed and tested. It cannot remain a default or visually weaker Shopify collection.

### Fix Steps

1. Confirm what template `/collections/all` uses.
2. If it uses `collection.json`, ensure that template has the polished product-selection layout.
3. If it differs from `/collections/phones`, either align the two templates or choose only one route.
4. Fix spacing, section order, and CTA destinations on `/collections/all`.

### Proof Fixed

- Visit `/collections/all`.
- Confirm it renders the intended product-selection page.
- Screenshot desktop and mobile.
- Confirm all buttons work.

### Done Quality

- `/collections/all` is not a lower-quality duplicate.
- It can safely be used as the homepage CTA target.

## Issue 15: Navigation Does Not Expose Product Selection Clearly

### Problem

The header currently exposes Contact and Cart icons, but not a clear product-selection link. The footer has `Order Now`, but that link is currently broken.

### Fix Steps

1. Decide whether header should include a visible `Order Now` or `Phones` link.
2. If yes, link it to the canonical product-selection route.
3. Keep header minimal; do not create a broad catalog navigation.
4. Ensure footer `Order Now` points to the same canonical route.

### Proof Fixed

- Inspect header and footer links.
- Confirm customer can reach product selection from header or primary homepage CTA.
- Confirm all footer links resolve.

### Done Quality

- Product-selection access is obvious.
- Header remains clean.
- Footer does not contain dead links.

## Issue 16: Collection Product Images Are Too Large And Need Gallery Tiles

### Problem

The product-selection page needs to feel as polished as the homepage. Product images should be smaller, controlled, clickable, and able to show multiple image tiles. The card image border must clip directly at the card edge; there should not be an inset image box floating inside the card. The two product cards also need a clearer empty-space gap between them.

### Fix Steps

1. Replace single static card images with a reusable product-card gallery snippet.
2. Pull gallery media from the assigned Shopify product media when available.
3. Add Theme Editor blocks so additional Classic/Rugged gallery images can be attached without code.
4. Render thumbnail tiles below the main card image when multiple images exist.
5. Keep the main card image smaller than the previous oversized treatment.
6. Set product-card media to full card width with a controlled height.
7. Use `object-fit: cover` so the border clips at the image edge.
8. Increase the grid gap between the two product cards.

### Proof Fixed

- Open `/collections/all?preview_theme_id=150479208517`.
- Confirm there are two product cards with a visible gap between them.
- Confirm each product card has a bounded main image area, not an oversized product image.
- Confirm the media box is flush to the card top/left/right edges.
- Confirm computed CSS reports `object-fit: cover`.
- Add a second product media item or Theme Editor gallery block and confirm thumbnail tiles appear below the main image.
- Click the main image and confirm the full-view/lightbox behavior still works.

### Done Quality

- Card images feel intentional and no longer dominate the page.
- The card border and media edge line up cleanly.
- Multiple product images can be added from Shopify product media or Theme Editor blocks.
- The two products are visually separated without making the page feel like a broad catalog grid.
- Desktop and mobile cards remain aligned with the homepage white/navy/red aesthetic.

## Issue 17: Product Page Needs Sticky Gallery/Product Details Behavior

### Problem

The product page should borrow functional behavior from the Impression/Felix reference: product details and purchase controls on one side, image gallery on the other, thumbnails below the image, and the image remaining sticky while the initial product overview scrolls. The reference is functional inspiration only; the visual palette must not change to cream/beige.

### Fix Steps

1. Rebuild the product page top section as an overview grid.
2. Place product summary, price, quantity, plan, add-ons, and purchase controls in the left column.
3. Place the gallery in the right column on desktop.
4. Make the gallery `position: sticky` only within the initial overview area.
5. Keep product thumbnails directly below the main image.
6. Move longer information into a separate lower `Product Details` section.
7. Ensure the sticky gallery releases before the lower `Product Details` section.
8. Keep mobile layout single-column with non-sticky gallery behavior.

### Proof Fixed

- Open `/products/standard-phone?preview_theme_id=150479208517`.
- Confirm the product title, description, price, quantity, options, and purchase controls are visible in the left column on desktop.
- Confirm the main product image and thumbnails render in the right column on desktop.
- Scroll through the initial product overview and confirm the gallery stays in lock step.
- Continue to `Product Details` and confirm the gallery has released before the lower details section.
- Confirm mobile renders as a clean single-column page with no horizontal overflow.

### Done Quality

- Product page behavior matches the reference intent without copying the reference brand or colors.
- Product image and details feel connected while scrolling the first product section.
- The lower `Product Details` section is readable and does not collide with the gallery.
- The add-ons/service controls remain visible and usable.
- The page keeps the existing homepage palette and button language.

## Issue 18: Reference Screenshots Must Not Introduce A Cream Palette

### Problem

The product-page inspiration screenshots use a cream/beige editorial palette, but this Shopify theme already has a strong homepage aesthetic. Copying the reference palette would make the collection/product pages feel disconnected from the homepage.

### Fix Steps

1. Keep product and collection surfaces on existing theme tokens:
   - `--ip-paper`
   - `--ip-paper-2`
   - `--ip-ink`
   - `--ip-blue`
   - `--ip-red`
2. Use the reference screenshots only for interaction/layout behavior.
3. Avoid adding cream, beige, tan, or warm editorial page backgrounds.
4. Keep primary purchase buttons red.
5. Confirm rendered product page background is white in the draft preview.

### Proof Fixed

- Inspect CSS for product-page and collection-page background rules.
- Open `/products/standard-phone?preview_theme_id=150479208517`.
- Confirm computed product section background is `rgb(255, 255, 255)`.
- Confirm computed product purchase-button background is `rgb(183, 53, 50)`.
- Capture product-page screenshots after the palette check.

### Done Quality

- Product and collection pages look like the same store as the homepage.
- Reference behavior is preserved without importing the reference palette.
- No new dominant cream/beige product-page theme exists.

## Recommended Implementation Order

1. Choose canonical product-selection route.
2. Fix/create Shopify product objects and handles.
3. Fix/create `/pages/order-now` only if it remains the canonical purchase page.
4. Fix all homepage/package/footer CTA destinations.
5. Fix collection page product-card links.
6. Polish collection/product-selection page spacing and layout.
7. Fix collection product image sizing, edge clipping, thumbnails, and product-card gap.
8. Rework product page layout and sticky-gallery behavior.
9. Verify product pages.
10. Verify cart/order behavior.
11. Verify FAQ page.
12. Verify client preview access from a non-admin browser.

## Final Acceptance Checklist

The remediation is finished only when all of the following are true:

- Homepage CTAs do not 404.
- Product-selection page is reachable in one click from homepage.
- Classic/Rugged product pages exist and render.
- Product prices are `$100` and `$150`.
- Collection/product-selection page visually matches homepage quality.
- Collection card images are smaller, full-width to the card edge, and support thumbnail tiles for multiple images.
- Product pages use the sticky gallery/product-details behavior while keeping the homepage palette.
- Every product/order button has a working destination.
- Cart receives the correct phone and selected options.
- FAQ page exists and renders.
- Client preview URL works outside the builder/admin context or has documented password access.
- Desktop and mobile screenshots are reviewed and acceptable.
- No active customer-facing page uses unsupported claims such as SMS, GPS, camera, or cellular mobility.
