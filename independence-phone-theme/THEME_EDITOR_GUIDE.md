# Independence Phone Theme Editor Guide

Use this guide after the fresh Shopify store exists and the Refresh overlay has been applied.

Canonical local paths:

- Theme source: `/Users/vilovieta/Documents/Shopify/independence-phone-theme`
- Refresh overlay: `/Users/vilovieta/Documents/Shopify/refresh-overlay`
- Product setup: `/Users/vilovieta/Documents/Shopify/store-setup`
- Hero video source: `/Users/vilovieta/Documents/Shopify/brief-materials/assets/video/indy-phone-reel-1.mov`
- Handoff checklist: `/Users/vilovieta/Documents/Shopify/independence-phone-theme/SHOPIFY_HANDOFF.md`

## Fresh Store Boundary

The storefront is built for a fresh Shopify store. The final domain can be connected later.

Before Theme Editor work, the store needs:

- Shopify `Refresh` installed.
- Independence Phone overlay applied.
- Two products imported or created: `Freedom Phone` and `Patriot Phone`.
- `Phones` collection created with both products.
- `Contact` page created.
- Hero video uploaded in Shopify files or selected directly in Theme Editor.

## Page Map

| Store URL | Shopify object | Template | Purpose |
| --- | --- | --- | --- |
| `/` | Home | `index.json` | Main sales page and hero video |
| `/collections/phones` | Collection: `Phones` | `collection.phones` | Choose between the two phones |
| `/products/freedom-phone` | Product: `Freedom Phone` | `product.independence-phone` | Freedom Phone product detail |
| `/products/patriot-phone` | Product: `Patriot Phone` | `product.independence-phone` | Patriot Phone product detail |
| `/pages/contact` | Page: `Contact` | `page.contact` | Contact form and support path |

This is intentionally a very small sitemap. Do not expand the catalog beyond the two phones unless the client changes scope.

## Home Page Sections

Open:

```text
Online Store -> Themes -> Customize -> Home page
```

Editable sections:

- `IP video hero`
  - Edit hero video, fallback poster, eyebrow, headline, subheading, primary button, secondary button, and proof bullets.
  - Use `/Users/vilovieta/Documents/Shopify/brief-materials/assets/video/indy-phone-reel-1.mov` as the hero video.
- `IP JTBD story`
  - Edit parent-focused story copy and family moments.
  - Keep the main job-to-be-done centered on parents giving kids connection without smartphone exposure.
- `IP feature strip`
  - Edit the short benefit cards.
- `IP product comparison`
  - Select the Freedom Phone and Patriot Phone products.
  - Optional image and summary overrides are available in the section.
- `IP service plans`
  - Edit monthly and annual service plan cards.
- `IP add-ons`
  - Edit add-on cards.
- `IP capability table`
  - Edit the simple yes/no capability rows.
- `IP package band`
  - Edit the 250th Anniversary package copy, price, included items, disclosure, and button.
- `IP comparison matrix`
  - Edit comparison rows against smartphones, flip phones, and landlines.
- `IP FAQ`
  - Edit FAQ rows.
- `IP trust band`
  - Edit the American-owned and communications-experience trust copy.

## Choose Your Phone Page

Open:

```text
Online Store -> Themes -> Customize -> Collections -> Phones
```

Template:

```text
collection.phones
```

Editable sections:

- `IP product comparison`
- `IP service plans`
- `IP add-ons`
- `IP capability table`
- `IP package band`
- `IP FAQ`

The point of this page is selection, not a broad product grid. Keep the two-phone comparison prominent.

## Product Pages

Open either product:

```text
Online Store -> Themes -> Customize -> Products -> Freedom Phone
Online Store -> Themes -> Customize -> Products -> Patriot Phone
```

Template:

```text
product.independence-phone
```

Editable sections:

- `IP product main`
  - Edit eyebrow and dynamic checkout visibility in Theme Editor.
  - Product title, price, image, description, and add-to-cart come from Shopify product data.
  - Product deck, best-for copy, and specs come from product metafields when present.
- `IP service plans`
- `IP add-ons`
- `IP capability table`
- `IP package band`
- `IP FAQ`
- `IP trust band`

Product metafields read by the theme:

- `custom.product_deck`
- `custom.best_for`
- `custom.specs`

Metafield setup source:

```bash
/Users/vilovieta/Documents/Shopify/store-setup/product-metafields.json
```

Starter product CSV:

```bash
/Users/vilovieta/Documents/Shopify/store-setup/products.csv
```

## Contact Page

Open:

```text
Online Store -> Themes -> Customize -> Pages -> Contact
```

Template:

```text
page.contact
```

Editable sections:

- `IP contact form`
  - Edit eyebrow, heading, body, helper text, button label, marketing opt-in note, and payment note.
  - The form posts through Shopify's native contact form behavior.
- `IP FAQ`
- `IP trust band`

After store auth exists, send a real contact form test and confirm delivery to the store contact email.

## Content That Belongs In Shopify Admin

Edit these in Shopify admin, not in Liquid:

- Product title.
- Product price.
- Product images.
- Product descriptions.
- Product metafields.
- Collection membership.
- Navigation menus.
- Policies.
- Store contact email.
- Shipping, tax, payment, and checkout settings.

## Content That Belongs In Theme Editor

Edit these through the visual customizer:

- Hero video and poster.
- Section headings and body copy.
- Benefit cards.
- Plan cards.
- Add-on cards.
- FAQ rows.
- Comparison rows.
- Trust proof rows.
- Section order on each template.

## Developer-Controlled Boundary

Keep these in the repo:

- Liquid section structure.
- JSON templates.
- CSS and responsive layout.
- Theme assets copied by the overlay.
- Product metafield rendering logic.
- Accessibility, performance, and Theme Check fixes.

If the client edits Theme Editor content after launch, pull the remote theme before overwriting the theme from this repo.

## Claims To Keep Tight

Use these supplied claims:

- No apps.
- No web browser.
- No social feeds.
- Cordless Wi-Fi handset with charging base.
- Freedom Phone: `$99`.
- Patriot Phone: `$149`.
- Monthly service: `$17.76/mo`.
- Annual service: `$200/yr`.
- Shipping: `$15/phone` anywhere in the USA.
- American-owned.
- 42 years in communications.

Do not imply these unless the client confirms them:

- SMS/texting.
- GPS.
- Camera.
- Cellular mobility.
- App support.
- Browser support.
- YouTube/social access.
- 911/emergency calling.

## Local Proof Before Store Auth

Run from the repo root:

```bash
cd /Users/vilovieta/Documents/Shopify
npm run verify:local
```

This proves:

- Required brief/source files exist.
- Theme files and Refresh overlay files match.
- Editable section schemas expose the expected settings and blocks.
- Required templates include the expected sections.
- Product setup files include the required products and metafields.
- Shopify Theme Check passes.
- Static desktop, tablet, and mobile visual preview passes.

## Store Proof After Auth

After the fresh store handle and access are available, verify:

- Home desktop and mobile.
- `/collections/phones` desktop and mobile.
- `/products/freedom-phone`.
- `/products/patriot-phone`.
- `/pages/contact`.
- Theme Editor can edit copy, media, rows, and section order.
- Both products can add to cart.
- Contact form delivers.
- Checkout settings are configured enough for the approved launch path.
