# Independence Phone Visual Preview

This is a local-only visual QA harness for the Independence Phone Shopify build.

It exists because Shopify Theme Editor preview requires a fresh store and Shopify auth. Until that store exists, this file gives us a browser-renderable approximation of the scoped pages using the same Independence Phone CSS and image assets.

Preview file:

```bash
/Users/vilovieta/Documents/Shopify/visual-preview/index.html
```

Open directly:

```bash
open /Users/vilovieta/Documents/Shopify/visual-preview/index.html
```

The preview is routed so page contexts do not bleed together. Home section jumps can still use hashes, but product, cart, and contact contexts use route parameters so they do not behave like in-page jump links:

```bash
/visual-preview/index.html
/visual-preview/index.html?route=freedom
/visual-preview/index.html?route=patriot
/visual-preview/index.html?route=cart
/visual-preview/index.html?route=contact
```

Run visual QA:

```bash
cd /Users/vilovieta/Documents/Shopify
npm run preview:test
```

The test opens `index.html` through a local `file://` URL by default. To test a server URL instead, set `PREVIEW_URL`.

What this verifies:

- Desktop/mobile rhythm for the custom section system.
- Hero visual treatment using the generated poster from the supplied hero video.
- Home landing page layout without product-detail ordering forms.
- Product comparison, package, FAQ, trust band, product detail, cart review, and contact form layout in their correct preview routes.
- Product detail pages keep the carousel thumbnails, service choices, and add-on options isolated from the landing page.
- Local cart display of selected service/add-on setup details.
- Preview cart empty state, cart count, add-to-cart, remove, quantity/subtotal updates, and always-visible cart add-on controls for both phone models.
- Text wrapping and horizontal overflow risk before Shopify auth exists.

What this does not verify:

- Shopify Theme Editor controls.
- Shopify product data, actual checkout completion, or contact form submission.
- Actual `Refresh` theme integration after pulling from a fresh store.

Those checks remain in `independence-phone-theme/SHOPIFY_HANDOFF.md`.
