# Independence Phone Visual Preview

This is a local-only visual QA harness for the Independence Phone Shopify build.

It exists because Shopify Theme Editor preview requires a fresh store and Shopify auth. Until that store exists, this file gives us a browser-renderable approximation of the scoped pages using the same theme CSS and image assets.

Preview file:

```bash
/Users/vilovieta/Documents/Shopify/visual-preview/index.html
```

Preview routes:

```bash
/visual-preview/index.html
/visual-preview/index.html?route=order
/visual-preview/index.html?route=cart
/visual-preview/index.html?route=faq
/visual-preview/index.html?route=contact
```

Run visual QA:

```bash
cd /Users/vilovieta/Documents/Shopify
npm run preview:test
```

The test opens `index.html` through a local `file://` URL by default. To test a server URL instead, set `PREVIEW_URL`.

What this verifies:

- Home route with bounded video hero, $17.76/mo price callout, Order Now CTA, feature strip, four use-case image cards, and FAQ.
- Order route with Patriot Package, Classic/Rugged phone choice, monthly/annual plan choice, add-on bundle, individual add-ons, savings descriptors, and policy checkbox.
- Preview cart display of selected setup details, estimated savings, legal checkbox, and always-visible cart add-on controls.
- FAQ and Contact as standalone routes.
- Text wrapping, image loading, and horizontal overflow risk before Shopify auth exists.

What this does not verify:

- Shopify Theme Editor controls.
- Shopify product data, actual checkout completion, subscription billing, or contact form submission.
- Actual `Refresh` theme integration after pulling from a fresh store.

Those checks remain in `independence-phone-theme/SHOPIFY_HANDOFF.md`.
