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

The test starts a local HTTP server by default so the preview can exercise Shopify-style `/cart/add.js`, `/cart.js`, `/cart/update.js`, `/cart`, and `/pages/order-now` behavior. To test an already-running server instead, set `PREVIEW_URL`.

What this verifies:

- Home route with bounded video hero, $17.76/mo price callout, Order Now CTA, feature strip, four use-case image cards, and FAQ.
- Order route with flag-backed Classic/Rugged phone choices, monthly/annual plan choice, add-on bundle, individual add-ons, and separate immediate/future price language.
- Successful builder submission posts one grouped setup and redirects to `/cart`; rejected and incomplete adds stay on the builder. Incomplete lines are removed when cleanup succeeds, while failed cleanup preserves the truthful cart count and directs the customer to open the cart.
- A child-first cart payload renders as one customer setup with the phone as the parent, service/add-ons nested beneath it, one image, one quantity, and one remove action.
- Dawn/Refresh cart-count behavior creates a missing `#cart-icon-bubble` badge, preserves a full accessible label at 100+, and ignores stale initial `/cart.js` responses after either an Independence Phone mutation or a native cart-icon section replacement.
- Grouped Remove is absent from the no-JavaScript interaction surface until cart JavaScript initializes the control.
- The cart shows phone-only merchandise due today, one flat `$15` order shipping fee, tax pending until address, and a separate future service/add-on total.
- Service/add-on lines use `$0.00` Shopify prices while preserving future charge, cadence, and first-day-of-next-month metadata.
- Order Now and cart contain no Patriot Package, Privacy Policy/Terms consent, or desired-area-code field; those final fields belong to the external Rev.io/gateway checkout.
- FAQ and Contact as standalone routes.
- Phone-card selection behavior, full rear-view image containment, flag backgrounds, text wrapping, image loading, and horizontal overflow risk before Shopify auth exists.

What this does not verify:

- Shopify Theme Editor controls.
- Live Shopify product data, actual checkout completion, subscription billing, or contact form submission.
- Actual `Refresh` theme integration after pulling from a fresh store.

Those checks remain in `independence-phone-theme/SHOPIFY_HANDOFF.md`.
