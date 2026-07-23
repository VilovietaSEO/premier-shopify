# Independence Phone Theme Editor Guide

Use this guide for the existing Independence Phone Shopify store after the Refresh overlay has been applied.

Canonical local paths:

- Theme source: `/Users/vilovieta/Documents/Shopify/independence-phone-theme`
- Refresh overlay: `/Users/vilovieta/Documents/Shopify/refresh-overlay`
- Product setup: `/Users/vilovieta/Documents/Shopify/store-setup`
- Hero video source: `/Users/vilovieta/Documents/Shopify/brief-materials/assets/video/indy-phone-reel-1.mov`
- Handoff checklist: `/Users/vilovieta/Documents/Shopify/independence-phone-theme/SHOPIFY_HANDOFF.md`

## Store Boundary

The storefront target is `jordan-mark-premier.myshopify.com`. The final public domain can be connected later.

Before Theme Editor work, the store needs:

- Shopify `Refresh` installed.
- Independence Phone overlay applied.
- Two products imported or created: `Classic Phone` and `Rugged Phone`.
- `Phones` collection created with both products.
- `Order Now` page created.
- `FAQ` page created.
- `Contact` page created.
- Hero video uploaded in Shopify files or selected directly in Theme Editor.

## Page Map

| Store URL | Shopify object | Template | Purpose |
| --- | --- | --- | --- |
| `/` | Home | `index.json` | Main sales page and hero video |
| `/collections/all` | Shopify all collection | `collection.json` | Two-phone catalog/support route; hidden billing items must not appear |
| `/pages/order-now` | Page: `Order Now` | `page.order` | Primary `Order now` destination and guided purchase flow: package, phone, plan, add-ons |
| `/collections/phones` | Collection: `Phones` | `collection.phones` | Narrow two-phone collection support |
| `/products/standard-phone` | Product: `Classic Phone` | `product.independence-phone` | Classic Phone product detail |
| `/products/rugged-phone` | Product: `Rugged Phone` | `product.independence-phone` | Rugged Phone product detail |
| `/pages/faq` | Page: `FAQ` | `page.faq` | Installation, usage, referral, and troubleshooting FAQ |
| `/pages/contact` | Page: `Contact` | `page.contact` | Contact form and support path |

This is intentionally a very small sitemap. Do not expand the catalog beyond the two phones unless the client changes scope.

## Home Page Sections

Open:

```text
Online Store -> Themes -> Customize -> Home page
```

Editable sections:

- `IP video hero`
  - Edit hero video, fallback poster, eyebrow, headline, subheading, and primary button.
  - Use `/Users/vilovieta/Documents/Shopify/brief-materials/assets/video/indy-phone-reel-1.mov` as the hero video.
- `IP JTBD story`
  - Edit parent-focused story copy and family moments.
  - Keep the main job-to-be-done centered on parents giving kids connection without smartphone exposure.
- `IP feature strip`
  - Edit the short benefit cards.
- `IP product comparison`
  - Disabled on the home page by default; keep phone selection on the Order Now page unless the client changes direction.
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

## Order Now Page

Open:

```text
Online Store -> Themes -> Customize -> Pages -> Order Now
```

Template:

```text
page.order
```

Editable sections:

- `IP order builder`

The point of this page is purchase selection, not a broad product grid. Keep the Classic/Rugged phone cards, monthly/annual service cards, add-ons, and savings summary prominent. Privacy/terms consent belongs only in the final checkout.

## Product Pages

Open either product:

```text
Online Store -> Themes -> Customize -> Products -> Classic Phone
Online Store -> Themes -> Customize -> Products -> Rugged Phone
```

Template:

```text
product.independence-phone
```

Editable sections:

- `IP product main`
  - Edit eyebrow and dynamic checkout visibility in Theme Editor.
  - Edit service plan and add-on purchase options as blocks inside the product main section.
  - Product title, price, image, description, and add-to-cart come from Shopify product data.
  - Product deck, best-for copy, and specs come from product metafields when present.
  - Service and add-on selections remain visible as setup details and add matching `$0.00` deferred-billing lines with future-charge metadata when those products are assigned.
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
  - Leave `CRM endpoint URL` blank for the client handoff. The section then uses Shopify's native contact form.
  - In Shopify Admin, set `Settings -> Notifications -> Sender email` to `jordan@premiercompanies.com`; Liquid cannot set or override that recipient.
  - The theme controls the visible form content, but durable CRM capture requires the approved server-side capture path. A Liquid theme cannot securely store CRM records by itself.
  - If CRM capture is later approved, it should capture submitted date/time plus every submitted form field in a staff-viewable record with CSV export.
- `IP FAQ`
- `IP trust band`

Do not submit the form as an external delivery test until the client explicitly approves it. After approval, submit one uniquely labeled test and confirm it reaches `jordan@premiercompanies.com`. If CRM capture is later approved, separately confirm the CRM viewer and CSV export include the timestamp and every submitted field.

## Content That Belongs In Shopify Admin

Edit these in Shopify admin, not in Liquid:

- Product title.
- Product price.
- Product images.
- Product image alt text.
- Product image order.
- Product descriptions.
- Product metafields.
- Collection membership.
- Navigation menus.
- Policies.
- Search engine listing titles and meta descriptions for products, collections, pages, and the home page.
- Store contact email.
- Sender email for native contact-form submissions (`jordan@premiercompanies.com` for this handoff).
- Staff order notifications (`mark@premiercompanies.com` and `jordan@premiercompanies.com` for this handoff).
- Order list, order detail, fulfillment, tracking numbers, and order export.
- Shipping, tax, payment, and checkout settings.

## Content That Belongs In Theme Editor

Edit these through the visual customizer:

- Hero video and poster.
- Section headings and body copy.
- Benefit cards.
- Product form service plan and add-on option blocks.
- Plan cards.
- Add-on cards.
- FAQ rows.
- Comparison rows.
- Trust proof rows.
- Section order on each template.

## SEO And Operations Boundary

Shopify provides the store object controls and operations surface. The theme only renders what Shopify gives it.

Before launch, confirm these in Shopify admin:

- Home page title and meta description in Online Store preferences.
- Product, collection, and page search-engine listings.
- Product image alt text for every meaningful product photo.
- `/sitemap.xml` resolves after products/pages are published.
- `/robots.txt` is acceptable with Shopify defaults, or a custom `templates/robots.txt.liquid` is added intentionally.
- The Theme Editor `CRM endpoint URL` remains blank for native contact delivery unless a CRM endpoint is separately approved.
- The Shopify Admin Sender email is `jordan@premiercompanies.com`.
- Staff order notifications include both `mark@premiercompanies.com` and `jordan@premiercompanies.com`; these are separate from contact-form delivery.
- If CRM capture is later approved, staff can view CRM leads and export them to CSV.
- External contact and order delivery tests are run only after explicit client approval.
- Test orders show the service plan, add-ons, future-charge amount, billing cadence, and first-day-of-next-month rule. Final checkout collects policy consent and desired area code exactly once.
- Order CSV export includes setup details in a usable form, or a custom export/app gap is documented.

Automatic route-level `llms.txt` is generated outside the Liquid theme by `/Users/vilovieta/Documents/Shopify/llms/automatic-llms.js`.

The intended outputs are raw Markdown text, for example:

- root overview: `/llms.txt`
- product summary: `/products/standard-phone/llms.txt`
- guided order-flow summary: `/pages/order-now/llms.txt`
- Shopify app-proxy fallback: `/a/llms.txt?path=/pages/faq`

Root `/llms.txt` requires an edge/proxy or custom domain route in front of Shopify. Shopify app proxy routing can support `/a/llms.txt` and route-specific `?path=` requests. Do not model this as a manually maintained Shopify page.

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
- Classic Phone: `$100`.
- Rugged Phone: `$150`.
- Monthly service: `$17.76/mo`.
- Annual service: `$200/yr`.
- Shipping: one `$15` charge per order in the USA.
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
- Static desktop, tablet, audit-width, and mobile visual preview passes.

## Store Proof After Auth

After the fresh store handle and access are available, verify:

- Home desktop and mobile.
- `/collections/all` desktop and mobile.
- `/pages/order-now` desktop and mobile.
- `/collections/phones` desktop and mobile.
- `/products/standard-phone`.
- `/products/rugged-phone`.
- `/pages/faq`.
- `/pages/contact`.
- Theme Editor can edit copy, media, rows, and section order.
- Both products can add to cart.
- After explicit client approval, a native contact-form test delivers to `jordan@premiercompanies.com`.
- After explicit client approval, a test order notifies both `mark@premiercompanies.com` and `jordan@premiercompanies.com`.
- Checkout settings are configured enough for the approved launch path.
