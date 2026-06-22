# Independence Phone Refresh Overlay

This folder is the portable Independence Phone customization layer for a real Shopify Refresh theme.

The local `independence-phone-theme` is a complete uploadable Shopify theme package. This overlay exists because the active project direction says to use Shopify Refresh as the base theme, and Refresh is normally installed or pulled from a Shopify store rather than initialized directly by `shopify theme init`.

## What This Overlay Contains

- Independence Phone assets:
  - `assets/ip-theme.css`
  - `assets/ip-independence-phone-logo.png`
  - `assets/ip-current-site-logo.png`
  - `assets/ip-current-site-product-1.png`
  - `assets/ip-current-site-product-2.png`
  - `assets/ip-current-site-product-3.png`
  - `assets/ip-current-site-product-4.png`
  - `assets/ip-current-site-product-collage.png`
  - `assets/ip-independence-phone-product-crunchy.png`
  - `assets/ip-hero-video-poster.jpg`
- Custom editable sections:
  - `sections/ip-video-hero.liquid`
  - `sections/ip-jtbd-story.liquid`
  - `sections/ip-feature-strip.liquid`
  - `sections/ip-product-comparison.liquid`
  - `sections/ip-product-main.liquid`
  - `sections/ip-service-plans.liquid`
  - `sections/ip-add-ons.liquid`
  - `sections/ip-capability-table.liquid`
  - `sections/ip-package-band.liquid`
  - `sections/ip-comparison-matrix.liquid`
  - `sections/ip-faq.liquid`
  - `sections/ip-trust-band.liquid`
  - `sections/ip-contact-form.liquid`
- Custom snippets:
  - `snippets/ip-structured-data.liquid`
- Scoped templates:
  - `templates/index.json`
  - `templates/collection.phones.json`
  - `templates/product.independence-phone.json`
  - `templates/page.contact.json`

It intentionally does not include Refresh's native theme files. Pull those from the fresh Shopify store after installing Refresh.

## Apply To A Pulled Refresh Theme

1. In Shopify admin, add the free `Refresh` theme to the fresh store.
2. Pull that theme locally:

```bash
shopify theme list --store STORE.myshopify.com
shopify theme pull --store STORE.myshopify.com --theme REFRESH_THEME_ID --path /Users/vilovieta/Documents/Shopify/refresh-theme
```

3. Apply this overlay:

```bash
cd /Users/vilovieta/Documents/Shopify
scripts/apply-refresh-overlay.sh /Users/vilovieta/Documents/Shopify/refresh-theme
```

4. Validate:

```bash
cd /Users/vilovieta/Documents/Shopify/refresh-theme
shopify theme check
```

Local smoke test for this overlay path:

```bash
cd /Users/vilovieta/Documents/Shopify
npm run overlay:test
```

5. Preview:

```bash
shopify theme dev --store STORE.myshopify.com --theme REFRESH_THEME_ID
```

6. After preview QA is approved, push the approved local Refresh theme back to that non-live theme:

```bash
cd /Users/vilovieta/Documents/Shopify/refresh-theme
shopify theme push --store STORE.myshopify.com --theme REFRESH_THEME_ID
```

7. Publish only after explicit approval:

```bash
shopify theme publish --store STORE.myshopify.com --theme REFRESH_THEME_ID
```

## Layout Patch

The apply script copies the overlay files and inserts these includes before `{{ content_for_header }}` in `layout/theme.liquid` when missing:

```liquid
{{ 'ip-theme.css' | asset_url | stylesheet_tag }}
{% render 'ip-structured-data' %}
```

The CSS uses fallback tokens, so it can render inside Refresh even before custom Independence Phone color settings are added to Refresh's `settings_schema.json`.

## Store Setup After Applying

Create these Shopify objects:

- Product: `Freedom Phone`, handle `freedom-phone`, price `$99`, template `product.independence-phone`.
- Product: `Patriot Phone`, handle `patriot-phone`, price `$149`, template `product.independence-phone`.
- Collection: `Phones`, handle `phones`, template `collection.phones`, containing both products.
- Page: `Contact`, handle `contact`, template `page.contact`.

Product data setup files:

- `/Users/vilovieta/Documents/Shopify/store-setup/product-metafields.json`
- `/Users/vilovieta/Documents/Shopify/store-setup/products.csv`
- `/Users/vilovieta/Documents/Shopify/store-setup/README.md`
- `/Users/vilovieta/Documents/Shopify/independence-phone-theme/THEME_EDITOR_GUIDE.md`

The overlay sections read `custom.product_deck`, `custom.best_for`, and `custom.specs` product metafields when present, then fall back to the canonical Liquid copy.

Upload/select the hero video in Theme Editor:

```bash
/Users/vilovieta/Documents/Shopify/brief-materials/assets/video/indy-phone-reel-1.mov
```

Set the Refresh header logo to the supplied-logo export:

```bash
/Users/vilovieta/Documents/Shopify/brief-materials/assets/logo/independence-phone-logo-export.png
```

## Claim Discipline

The overlay uses the supplied product and service facts as canonical. It does not claim SMS/texting, GPS, camera, cellular mobility, app support, browser support, YouTube/social access, or 911/emergency calling.
