# Fresh Store Setup Data

This folder contains the Patriot Phone product data needed after the fresh Shopify store exists.

Files:

- `product-metafields.json` - product metafield definitions the theme reads.
- `products.csv` - two-product starter import file.
- `LAUNCH_CHECKLIST.md` - store-by-store checklist to execute after access exists.
- `/Users/vilovieta/Documents/Shopify/scripts/create-product-metafields.js` - Admin GraphQL helper for creating the product metafield definitions from `product-metafields.json`.
- `/Users/vilovieta/Documents/Shopify/scripts/create-storefront-objects.js` - Admin GraphQL helper for upserting the two products, creating the `Phones` collection, publishing products/collection to Online Store when publication scopes are available, and creating the `Order Now`, `FAQ`, and `Contact` pages.
- `/Users/vilovieta/Documents/Shopify/scripts/audit-storefront-objects.js` - read-only Admin GraphQL audit for products, prices, metafields, templates, media counts, collection membership, and required pages.
- `/Users/vilovieta/Documents/Shopify/scripts/assign-product-media.js` - Admin GraphQL helper for assigning existing theme product images to Classic/Rugged products with concise alt text.
- `/Users/vilovieta/Documents/Shopify/llms/automatic-llms.js` - automatic raw Markdown `llms.txt` generator/server for root and route-level summaries.

## Setup Order

1. Add Shopify `Refresh` to the fresh store.
2. Pull Refresh and apply `/Users/vilovieta/Documents/Shopify/refresh-overlay` with `/Users/vilovieta/Documents/Shopify/scripts/bootstrap-refresh-store.sh`.
3. Create the product metafields in Shopify admin or run `/Users/vilovieta/Documents/Shopify/scripts/create-product-metafields.js`.
4. Import `products.csv` manually or run `/Users/vilovieta/Documents/Shopify/scripts/create-storefront-objects.js`.
5. Publish both products and the `Phones` collection to Online Store if the helper prints a publication-scope warning.
6. Upload/select product images.
7. Add descriptive alt text to meaningful product images in Shopify product media.
8. Open Theme Editor and select the product objects in the product comparison section.
9. Run the read-only object audit:

```bash
cd /Users/vilovieta/Documents/Shopify
SHOPIFY_STORE=STORE.myshopify.com SHOPIFY_USE_CLI_SESSION=1 npm run store:objects:audit
```

If using the included theme assets as starter product media:

```bash
cd /Users/vilovieta/Documents/Shopify
npm run store:media:dry-run
SHOPIFY_STORE=STORE.myshopify.com SHOPIFY_USE_CLI_SESSION=1 npm run store:media:assign
```

## Product Metafields

In Shopify admin:

```text
Settings -> Custom data -> Products -> Add definition
```

Create these definitions:

| Name | Namespace and key | Type | Used by |
| --- | --- | --- | --- |
| Product deck | `custom.product_deck` | Single line text | Product hero deck |
| Best for | `custom.best_for` | Single line text | Product hero and product comparison |
| Specs | `custom.specs` | Multi-line text | Product specs list |

The `Specs` value is semicolon-separated because it needs to work predictably in both CSV import and Liquid rendering.

CLI/API shortcut after a Shopify Admin API token exists:

```bash
cd /Users/vilovieta/Documents/Shopify
SHOPIFY_STORE=STORE.myshopify.com \
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_... \
node scripts/create-product-metafields.js
```

Local dry run without credentials:

```bash
cd /Users/vilovieta/Documents/Shopify
npm run store:metafields:dry-run
```

The script follows Shopify Admin GraphQL `metafieldDefinitionCreate` shape for the current `2026-04` Admin API:

```text
https://shopify.dev/docs/api/admin-graphql/latest/mutations/metafieldDefinitionCreate
```

Override the API version with `SHOPIFY_ADMIN_API_VERSION` if the store needs a different version.

## Product Import

Import:

```bash
/Users/vilovieta/Documents/Shopify/store-setup/products.csv
```

CLI/API shortcut after product metafield definitions exist:

```bash
cd /Users/vilovieta/Documents/Shopify
SHOPIFY_STORE=STORE.myshopify.com \
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_... \
node scripts/create-storefront-objects.js
```

Local dry run without credentials:

```bash
cd /Users/vilovieta/Documents/Shopify
npm run store:objects:dry-run
```

This helper uses current Shopify Admin GraphQL patterns verified against the `2026-04` docs: `productCreate`/`productUpdate`, `productVariantsBulkUpdate`, `collectionCreate`, `collectionAddProducts`, and `pageCreate`.

Products and collections also need to be published to the Online Store channel before `/products/standard-phone`, `/products/rugged-phone`, and `/collections/phones` resolve. The helper uses Shopify Admin GraphQL `publishablePublish` when the token includes `read_publications` and `write_publications`. If the token does not include those scopes, publish the two products and the `Phones` collection manually in Shopify admin under Publishing / Sales channels.

Shopify's product CSV format requires the first line to use supported column headers, and Shopify supports product metafields in product CSV import/export after the metafields are defined. The CSV uses current column names such as `Title`, `URL handle`, `Description`, `Option1 name`, `Option1 value`, `Price`, `Product image URL`, and custom metafield columns in the `product.metafields.custom.KEY` format.

Important image note:

- The CSV intentionally leaves image URLs out.
- Shopify product CSV image fields require public image URLs.
- Upload the local product images directly to products after import:
  - `/Users/vilovieta/Documents/Shopify/brief-materials/assets/site-images/current-site-product-1.png`
  - `/Users/vilovieta/Documents/Shopify/brief-materials/assets/site-images/current-site-product-2.png`
  - `/Users/vilovieta/Documents/Shopify/brief-materials/assets/site-images/current-site-product-3.png`
  - `/Users/vilovieta/Documents/Shopify/brief-materials/assets/site-images/current-site-product-4.png`
  - `/Users/vilovieta/Documents/Shopify/brief-materials/assets/product-images/independence-phone-product-crunchy.png`
- Product pages and collection product cards read Shopify product media first.
- Product image alt text should be maintained in Shopify product media. The theme falls back to the product/card title when media alt text is blank.
- Use Shopify media/file details to check image dimensions and file sizes before launch.

## Product Template Assignment

After import, set both products to:

```text
Theme template: independence-phone
```

Required handles:

- `standard-phone`
- `rugged-phone`

Required collection:

- Title: `Phones`
- Handle: `phones`
- Template: `collection.phones`

## Cart and Recurring Billing Boundary

- Normal cart behavior does not require a Shopify app. The theme uses Shopify's native cart form plus Ajax cart endpoints for add-to-cart, live cart count, and quantity/subtotal updates.
- The current product form captures phone setup intent as line-item properties and, when billing products are assigned, adds the matching service/add-on products as real priced cart items.
- The Order Now page captures Patriot Package, chosen phone, service plan, add-ons, savings, and policy agreement on the phone line, then adds configured service/add-on/package billing products with the same hidden setup id.
- Hidden billing products are created for monthly service, annual service, Call Recording, Quiet Hours, Voicemail to Email, Auto Attendant, Add-on Bundle, and Patriot Package. They use template `product.billing-item` and should not be added to the `Phones` collection.
- If a shopper chooses quantity `2` for one setup, the phone, service, and selected add-on billing item quantities are all submitted as `2`. If they need one phone with upgrades and one without, they should add two separate setups.
- After checkout settings are configured, place test/manual orders and confirm Shopify Admin order detail and order CSV export show the setup details in a usable form.
- Product line items charge one-time checkout totals by default. If monthly service and add-ons need true recurring billing through Shopify checkout, configure selling plans through Shopify Subscriptions or another subscription app and attach the applicable `selling_plan` IDs to the hidden billing products.
- If Rev.io owns recurring billing after checkout, the hidden billing products and setup ids provide the order structure the ops webhook can send downstream.
- Keep product-page dynamic checkout buttons off unless an app-level checkout path is added. Express checkout can bypass the theme's grouped add-to-cart logic and skip the hidden billing products.

## SEO And Form Operations Boundary

- Shopify Admin owns home page SEO settings, product/collection/page search-engine listings, product image alt text, sitemap availability, order management, fulfillment, tracking, and order exports.
- The theme renders title, meta description, canonical, Open Graph, Twitter card, product structured data, Organization/WebSite JSON-LD, and FAQPage JSON-LD from Shopify objects and theme sections.
- Shopify provides `/sitemap.xml` after public objects are available.
- Shopify provides default `/robots.txt`; add `templates/robots.txt.liquid` only if custom crawl directives are intentionally required.
- Use `SHOPIFY_STORE_URL=https://STORE.myshopify.com npm run seo:live` after the storefront is publicly reachable to generate `/Users/vilovieta/Documents/Shopify/tmp/shopify-live-proof/seo-ops-audit.json`.
- If the storefront is password-gated or the audit needs the unpublished draft theme, run `read -s SHOPIFY_STOREFRONT_PASSWORD`, export it for the command, and include `SHOPIFY_PREVIEW_THEME_ID=THEME_ID`. The audit report records that a password was provided, but it does not store the password.
- Use `npm run launch:readiness` to generate `/Users/vilovieta/Documents/Shopify/tmp/shopify-live-proof/launch-readiness-audit.json`, the consolidated current-state launch status. It exits nonzero until public access/SEO, live `llms.txt`, deployed CRM/ops, and order proof are complete.
- Automatic `llms.txt` output is generated by `/Users/vilovieta/Documents/Shopify/llms/automatic-llms.js`.
- Route-level raw Markdown is available for homepage, collections, products, pages, and cart-style routes through the llms service.
- Use `npm run llms:test` to verify root `/llms.txt`, Shopify app-proxy `/a/llms.txt`, product route `/products/standard-phone/llms.txt`, collection route `/collections/all/llms.txt`, and page route summaries.
- Root `/llms.txt` requires an edge/proxy or custom domain route in front of Shopify. Shopify app proxy routing can serve `/a/llms.txt` and route-specific output with `?path=/products/standard-phone`.
- The contact page should post to the approved CRM capture endpoint before launch. The theme setting is `CRM endpoint URL` in the `IP contact form` section.
- The rendered contact page should be audited after the Theme Editor `CRM endpoint URL` is configured: `CONTACT_CRM_HTML=/path/to/rendered-contact-page.html CONTACT_CRM_EXPECTED_ENDPOINT=https://www.example.com/crm/capture npm run contact:crm:audit`.
- Contact form submissions are CRM `lead` records tagged with `source_type=contact_form` and `lead_type=contact_form`.
- Shopify order webhooks and protected manual imports create CRM `sale` records tagged with `source_type=shopify_order` and `sale_type` values such as `classic_monthly_addon_sale`, `classic_patriot_package_sale`, or `rugged_patriot_package_sale`.
- Optional outbound webhooks can forward accepted leads and sales to owner-controlled systems. Configure `CRM_LEAD_WEBHOOK_URLS`, `CRM_SALE_WEBHOOK_URLS`, and `CRM_WEBHOOK_SECRET` on the ops server; do not put destination secrets in Liquid.
- Lead outbound webhooks send `crm.lead.created`; sale outbound webhooks send `crm.sale.created`. Each request includes `x-patriot-phone-event`, `x-patriot-phone-record-id`, and a `sha256=` HMAC signature.
- The included simple CRM path is `/Users/vilovieta/Documents/Shopify/crm/simple-crm.js`; `npm run crm:test` verifies timestamp capture, all submitted fields, lead/sale tagging, Shopify webhook signature checks, expandable full-detail viewer output, CSV export with raw field and metadata columns, honeypot, and rate limiting.
- The deployable storefront ops service is `/Users/vilovieta/Documents/Shopify/ops/storefront-ops-server.js`; `npm run ops:test` verifies health, CRM lead capture, sale import, signed Shopify order webhook capture, staff viewer, CSV export, root `llms.txt`, route-level `llms.txt`, and app-proxy style `llms.txt` requests in one process.
- Use `/Users/vilovieta/Documents/Shopify/ops/README.md` for persistent-host environment variables, Theme Editor CRM endpoint wiring, and edge/proxy routing requirements.
- Shopify's native contact form remains only as a fallback when no CRM endpoint URL is configured. Native contact form behavior is not enough for launch because it is not a durable submission database or CSV export.
- Order setup selections are captured as Shopify line-item properties. If the native Shopify order CSV does not expose those properties cleanly enough for staff, use `/Users/vilovieta/Documents/Shopify/orders/setup-export.js`; `npm run orders:test` proves the Classic/Rugged setup properties normalize to a staff-readable CSV, and `npm run orders:export` converts a Shopify orders JSON export into setup-detail CSV.
- After real/test orders exist, run `ORDER_PROOF_INPUT=/path/to/shopify-orders.json npm run orders:proof:audit`. It writes `/Users/vilovieta/Documents/Shopify/tmp/shopify-live-proof/order-proof-audit.json` and `/Users/vilovieta/Documents/Shopify/tmp/shopify-live-proof/order-setup-details.csv`, then `npm run launch:readiness` can clear the order-proof blocker.

## Canonical Product Data

### Classic Phone

- Price: `$100`
- URL: `/products/standard-phone`
- Product deck: `The everyday family phone for kids who need to call home without stepping into smartphone life.`
- Best for: `Best for home, grandparents, short independence windows, and everyday family calling.`
- Specs:
  - Heavy-duty cordless Wi-Fi handset with charging base.
  - HD audio quality.
  - Smart noise filtering.
  - Encrypted data transmission and storage.
  - Built-in Bluetooth 5.0.
  - 9-hour talk time.
  - 200-hour standby battery.

### Rugged Phone

- Price: `$150`
- URL: `/products/rugged-phone`
- Product deck: `The rugged family phone for busier homes, tougher handling, and longer days.`
- Best for: `Best for families who want rugged durability, longer battery life, and a more resilient handset.`
- Specs:
  - Rugged cordless Wi-Fi handset with charging base.
  - Waterproof and dust-proof.
  - Drop-proof up to 1.8 meters.
  - Non-slip, anti-scratch, anti-bacterial construction.
  - HD Voice, AI Noise Cancellation, and Acoustic Shield.
  - Encrypted data transmission and storage.
  - Built-in Bluetooth 5.0.
  - 13-hour talk time.
  - 300-hour standby battery.

### Hidden Billing Products

These products support checkout charging and should use template `product.billing-item`, tag `hidden-from-catalog`, and stay out of the `Phones` collection.

- Monthly Service: `/products/monthly-service`, `$17.76`
- Annual Service: `/products/annual-service`, `$200`
- Call Recording: `/products/call-recording`, `$5`
- Quiet Hours: `/products/family-quiet-hours`, `$5`
- Voicemail to Email: `/products/voicemail-to-email`, `$5`
- Auto Attendant: `/products/auto-attendant`, `$5`
- Add-on Bundle: `/products/add-on-bundle`, `$10`
