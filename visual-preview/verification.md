# Visual Preview Verification

Last run: 2026-07-14, 22 tests passed across desktop, wide desktop, tablet, and two mobile viewport runs.

Command:

```bash
cd /Users/vilovieta/Documents/Shopify
npm run preview:test
```

The preview test verifies:

- Required preview routes render separately: Home, Order, Cart, FAQ, Contact.
- Home route does not render the two-phone chooser or product-detail forms.
- Home route shows the $17.76/mo price callout, Order Now CTA, video sound control, four add-on feature cards, four use-case image cards, FAQ, and Patriot Package labels.
- Order route renders the Patriot Package fast path, Classic/Rugged phone choice, monthly/annual service choice, add-on bundle, individual add-ons, and savings summary.
- Patriot Package selection autoselects Classic Phone, annual service, and the add-on bundle.
- Patriot Package submission posts exactly the Classic Phone and package billing lines, preserves the $73.12 offer and referral properties, and produces a $250 grouped cart.
- Builder submission carries one shared setup ID across the phone, service, and add-on lines, excludes duplicate line-item consent, and redirects to `/cart` after Shopify confirms the complete setup.
- A 422 add failure leaves the customer on the builder with an actionable error and restored controls.
- An incomplete add triggers `/cart/update.js` cleanup for every matching setup line and does not redirect.
- If both automatic cleanup attempts fail, the builder retains the partial setup count and directs the customer to open the cart and remove it before retrying.
- A Dawn/Refresh-style `#cart-icon-bubble` with no server-rendered `.cart-count-bubble` receives a visible, correctly structured badge after the grouped cart count loads.
- At 100+, `span[aria-hidden="true"]` remains the distinct visual-count node and is hidden, while `.visually-hidden` retains the full accessible count label.
- Grouped Remove carries `hidden` in server HTML and is revealed only after cart JavaScript initializes it.
- A delayed initial `/cart.js` response cannot overwrite a newer count produced after an add/update mutation.
- A native Refresh-style replacement of `#cart-icon-bubble` remains authoritative when an older empty `/cart.js` response completes afterward.
- A child-first fixture groups service and add-on lines beneath one phone parent with one image, one setup quantity, one remove action, and a setup-level subtotal.
- Cart route has no add-on selector and owns the single required Privacy Policy / Terms consent. Update works without consent; Checkout is blocked with a visible, focused error until consent is checked.
- Classic and Rugged cards use distinct full rear-view assets, contain the silhouettes inside flag-backed media wrappers, align the radio/title row, and remain selectable at 1440, 768, 430, and 390 pixel widths.
- FAQ and Contact render in their own routes without order forms.
- All local preview images load.
- No page-level horizontal overflow appears.

Screenshots are generated locally under:

```bash
/Users/vilovieta/Documents/Shopify/visual-preview/screenshots
```

Those screenshots are intentionally ignored by Git because they are generated QA artifacts.
