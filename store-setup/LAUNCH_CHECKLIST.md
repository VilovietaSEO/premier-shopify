# Independence Phone Fresh Store Launch Checklist

Use this when the fresh Shopify store handle and access are available. The final public domain can be connected after the store preview is approved.

Canonical repo:

```bash
/Users/vilovieta/Documents/Shopify
```

Primary local gate:

```bash
cd /Users/vilovieta/Documents/Shopify
npm run verify:local
```

## 1. Access And Store Target

- [ ] Confirm the store handle: `STORE.myshopify.com`.
- [ ] Confirm staff/collaborator access with theme permissions.
- [ ] Confirm product, collection, page, navigation, files, and settings access.
- [ ] Confirm whether CLI login or Shopify Theme Access app password will be used.
- [ ] Do not connect or publish the final public domain until preview QA is approved.

## 2. Refresh Base Theme

- [ ] In Shopify admin, add the free Shopify `Refresh` theme.
- [ ] Get the Refresh theme ID:

```bash
shopify theme list --store STORE.myshopify.com
```

- [ ] Pull Refresh locally:

```bash
shopify theme pull --store STORE.myshopify.com --theme REFRESH_THEME_ID --path /Users/vilovieta/Documents/Shopify/refresh-theme
```

- [ ] Apply the Independence Phone overlay:

```bash
cd /Users/vilovieta/Documents/Shopify
scripts/apply-refresh-overlay.sh /Users/vilovieta/Documents/Shopify/refresh-theme
```

- [ ] Validate the applied Refresh theme:

```bash
cd /Users/vilovieta/Documents/Shopify/refresh-theme
shopify theme check
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

Required product metafields:

- [ ] `custom.product_deck`
- [ ] `custom.best_for`
- [ ] `custom.specs`

Import or create exactly two products:

```bash
/Users/vilovieta/Documents/Shopify/store-setup/products.csv
```

Required product handles:

- [ ] `/products/freedom-phone`
- [ ] `/products/patriot-phone`

Required product facts:

- [ ] Freedom Phone is `$99`.
- [ ] Patriot Phone is `$149`.
- [ ] Both products use template `product.independence-phone`.
- [ ] Product images are uploaded or assigned.
- [ ] Product descriptions and metafields match `/Users/vilovieta/Documents/Shopify/store-setup/README.md`.

## 5. Collection And Page Setup

- [ ] Create collection `Phones`.
- [ ] Set collection handle to `phones`.
- [ ] Add Freedom Phone and Patriot Phone to the collection.
- [ ] Assign collection template `collection.phones`.
- [ ] Create page `Contact`.
- [ ] Set page handle to `contact`.
- [ ] Assign page template `page.contact`.

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
- [ ] Confirm the JTBD line: `Reachable without scrollable`.
- [ ] Confirm product comparison section points to Freedom Phone and Patriot Phone.

Choose Your Phone page:

- [ ] Open collection template `collection.phones`.
- [ ] Confirm the page does not become a broad catalog grid.
- [ ] Confirm product comparison, plans, add-ons, capability table, package band, and FAQ render.

Product pages:

- [ ] Open `Freedom Phone` with template `product.independence-phone`.
- [ ] Open `Patriot Phone` with template `product.independence-phone`.
- [ ] Confirm the product image, price, specs, service copy, add-ons, and package band render.
- [ ] Confirm add-to-cart works for both products.

Contact page:

- [ ] Open page template `page.contact`.
- [ ] Confirm contact form fields render.
- [ ] Send a test submission and confirm delivery to the store contact email.

## 7. Navigation And Store Settings

Main menu:

- [ ] Home -> `/`
- [ ] Choose Your Phone -> `/collections/phones`
- [ ] Contact -> `/pages/contact`

Footer menu:

- [ ] Choose Your Phone -> `/collections/phones`
- [ ] Contact -> `/pages/contact`
- [ ] Privacy Policy -> `/policies/privacy-policy`
- [ ] Terms of Service -> `/policies/terms-of-service`

Store settings:

- [ ] Shipping is configured for `$15/phone` or the approved Shopify shipping model.
- [ ] Taxes are configured for launch requirements.
- [ ] Payments are configured or launch checkout behavior is explicitly approved.
- [ ] Store contact email is correct.
- [ ] Policies are drafted or approved.

## 8. Claim Discipline QA

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
- [ ] `Reachable without scrollable`.
- [ ] `A phone that acts like a phone`.
- [ ] `The useful part of a phone, first.`
- [ ] `For bus days, home-alone minutes, and grandparents.`
- [ ] American-owned messaging is secondary trust, not the first pitch.

## 9. Pre-Publish QA Matrix

Desktop and mobile:

- [ ] Home `/`.
- [ ] Choose Your Phone `/collections/phones`.
- [ ] Freedom Phone `/products/freedom-phone`.
- [ ] Patriot Phone `/products/patriot-phone`.
- [ ] Contact `/pages/contact`.
- [ ] Cart.
- [ ] Checkout path approved for launch.
- [ ] 404/system pages use Shopify boilerplate acceptably.

Theme Editor:

- [ ] Edit a section heading.
- [ ] Edit a row/block in FAQ or add-ons.
- [ ] Reorder a section.
- [ ] Change the hero video or poster.
- [ ] Confirm changes save and render in preview.

## 10. Publish And Domain

- [ ] Push the approved theme to a non-live theme first.
- [ ] Publish only after the preview URL is approved.
- [ ] Connect the final public domain after publish approval.
- [ ] Re-test Home, product pages, contact, cart, and checkout on the final domain.

Reference docs:

- `/Users/vilovieta/Documents/Shopify/independence-phone-theme/SHOPIFY_HANDOFF.md`
- `/Users/vilovieta/Documents/Shopify/independence-phone-theme/THEME_EDITOR_GUIDE.md`
- `/Users/vilovieta/Documents/Shopify/refresh-overlay/README.md`
- `/Users/vilovieta/Documents/Shopify/store-setup/README.md`
