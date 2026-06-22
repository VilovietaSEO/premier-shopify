# Independence Phone Visual Preview

This is a local-only visual QA harness for the Independence Phone Shopify build.

It exists because Shopify Theme Editor preview requires a fresh store and Shopify auth. Until that store exists, this file gives us a browser-renderable approximation of the four scoped pages using the same Independence Phone CSS and image assets.

Preview file:

```bash
/Users/vilovieta/Documents/Shopify/visual-preview/index.html
```

Open directly:

```bash
open /Users/vilovieta/Documents/Shopify/visual-preview/index.html
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
- Product comparison, service, add-ons, package, capability table, FAQ, trust band, product detail, and contact form layout.
- Text wrapping and horizontal overflow risk before Shopify auth exists.

What this does not verify:

- Shopify Theme Editor controls.
- Shopify product data, carts, checkout, or contact form submission.
- Actual `Refresh` theme integration after pulling from a fresh store.

Those checks remain in `independence-phone-theme/SHOPIFY_HANDOFF.md`.
