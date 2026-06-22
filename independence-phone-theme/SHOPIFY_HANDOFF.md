# Shopify Handoff Checklist

Use this after the fresh Shopify store exists.

This project targets a fresh Shopify store. Connect the final public domain later; the immediate requirement is a Shopify store handle, theme access, and a non-live preview/publish workflow.

Detailed Theme Editor editing guide:

```bash
/Users/vilovieta/Documents/Shopify/independence-phone-theme/THEME_EDITOR_GUIDE.md
```

Fresh store launch checklist:

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

3. Follow the setup notes:

```bash
/Users/vilovieta/Documents/Shopify/store-setup/README.md
```

Create exactly these two products. The theme reads `custom.product_deck`, `custom.best_for`, and `custom.specs` when present, then falls back to the canonical values below.

### Freedom Phone

- Title: `Freedom Phone`
- Handle: `freedom-phone`
- Price: `$99`
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

### Patriot Phone

- Title: `Patriot Phone`
- Handle: `patriot-phone`
- Price: `$149`
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
  - Freedom Phone.
  - Patriot Phone.

## 5. Create Contact Page

- Title: `Contact`
- Handle: `contact`
- Template: `page.contact`

## 6. Upload Hero Video

Source file:

```bash
/Users/vilovieta/Documents/Shopify/brief-materials/assets/video/indy-phone-reel-1.mov
```

Theme Editor path:

1. Online Store -> Themes -> Customize.
2. Open Home page.
3. Select `IP video hero`.
4. Choose the uploaded video in the `Hero video` setting.
5. Keep or replace the fallback poster.

The theme already includes:

```bash
/Users/vilovieta/Documents/Shopify/independence-phone-theme/assets/ip-hero-video-poster.jpg
```

## 6A. Theme Editor Editing Boundary

The client should maintain normal page content through Shopify's visual Theme Editor, not through Liquid files.

Theme Editor guide:

```bash
/Users/vilovieta/Documents/Shopify/independence-phone-theme/THEME_EDITOR_GUIDE.md
```

Client-editable areas already exposed through section schemas:

- Hero video, poster, headline, subheading, buttons, and proof bullets.
- Parent/JTBD story copy and moment cards.
- Product comparison headings, product selectors, image overrides, and summary overrides.
- Service plan cards.
- Add-on cards.
- Capability table rows.
- 250th Anniversary package band copy and CTA.
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
- Choose Your Phone -> `/collections/phones`
- Contact -> `/pages/contact`

Footer menu:

- Choose Your Phone -> `/collections/phones`
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
- Time Conditions: `$5/mo`
- Voicemail to Email: `$5/mo`
- Victory Bundle: `$10/mo`
- Auto Attendant: `$5/mo`
- 250th Anniversary package: `$250`, includes 1 Freedom Phone, 1 year service, and Victory Bundle

Current product form behavior:

- The product form captures selected service plan as a `Service plan` line-item property.
- The product form captures selected add-ons as line-item properties named for each add-on.
- This is purchase/setup intent capture, not a final recurring billing engine.

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
- `npm run overlay:test`
- `npm run theme:check`
- `npm run preview:test`

Already completed locally as part of that gate:

```bash
shopify theme check
```

Result:

```text
56 files inspected with no offenses found.
```

Visual preview QA also passes locally:

```bash
cd /Users/vilovieta/Documents/Shopify
npm run preview:test
```

Result:

```text
3 passed
```

Still required after store auth:

- Run `shopify theme dev --store STORE.myshopify.com`.
- Check Home desktop and mobile.
- Check `/collections/phones` desktop and mobile.
- Check `/products/freedom-phone`.
- Check `/products/patriot-phone`.
- Check `/pages/contact`.
- Confirm page source includes Independence Phone `Organization`, home-page `WebSite`, and FAQ accordion `FAQPage` JSON-LD.
- Confirm Theme Editor can edit section content and reorder sections.
- Confirm add-to-cart works for both product handles.
- Confirm contact form sends to the store contact email.
