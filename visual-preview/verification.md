# Visual Preview Verification

Last run: 2026-07-03, passed across 4 Playwright viewport runs.

Command:

```bash
cd /Users/vilovieta/Documents/Shopify
npm run preview:test
```

The preview test verifies:

- Required preview routes render separately: Home, Order, Cart, FAQ, Contact.
- Home route does not render the two-phone chooser or product-detail forms.
- Home route shows the $17.76/mo price callout, Order Now CTA, video sound control, four add-on feature cards, four use-case image cards, FAQ, and Patriot Package labels.
- Order route renders the Patriot Package fast path, Classic/Rugged phone choice, monthly/annual service choice, add-on bundle, individual add-ons, savings summary, and Privacy Policy / Terms checkbox.
- Patriot Package selection autoselects Classic Phone, annual service, and the add-on bundle.
- Add-to-cart carries selected setup properties into the preview cart.
- Cart route shows selected setup details, estimated savings, legal checkbox, all five add-on controls, and updated subtotal.
- FAQ and Contact render in their own routes without order forms.
- All local preview images load.
- No page-level horizontal overflow appears.

Screenshots are generated locally under:

```bash
/Users/vilovieta/Documents/Shopify/visual-preview/screenshots
```

Those screenshots are intentionally ignored by Git because they are generated QA artifacts.
