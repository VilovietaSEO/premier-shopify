# Limited Sitemap

Project: Independence Phone Shopify build

Date: 2026-06-22

## Constraint

The paid custom build should be treated as approximately four custom pages/templates total.

Shopify legal policies, cart, checkout, customer account, and 404 are platform/system pages. They should use Shopify defaults or light boilerplate styling and should not consume custom-page budget unless the client explicitly expands scope.

## Recommended Four-Page Structure

### 1. Home

URL:

- `/`

Template:

- `index.json`

Primary job:

- Explain the category and drive buyers to choose a phone.

Main sections:

1. Video hero.
2. "Give them a phone. Not the internet."
3. Parent problem / JTBD.
4. Product comparison teaser.
5. Service plan teaser.
6. 250th Anniversary package.
7. Why not smartphone/landline/flip phone.
8. FAQ preview.
9. Trust band.

CTA:

- `Choose your phone` -> `/collections/phones`
- `Ask a question` -> `/pages/contact`

Content folded into this page:

- About/company story.
- American-owned trust layer.
- 42-year experience note.
- Core FAQ preview.

### 2. Choose Your Phone / Collection

URL:

- `/collections/phones`

Template:

- `collection.phones.json`

Primary job:

- Let the buyer compare Freedom Phone vs Patriot Phone and click into the right product.

Main sections:

1. Short collection hero.
2. Freedom vs Patriot comparison.
3. Shared service requirement.
4. Add-on overview.
5. Capability truth table.
6. Link to contact if unsure.

Products included:

- Freedom Phone.
- Patriot Phone.

CTA:

- `View Freedom Phone` -> `/products/freedom-phone`
- `View Patriot Phone` -> `/products/patriot-phone`

Notes:

- This replaces a broad category/catalog experience.
- No filters, no mega menu, no deep collection merchandising.

### 3. Product Detail Template

URLs:

- `/products/freedom-phone`
- `/products/patriot-phone`

Template:

- `product.independence-phone.json`

Budget treatment:

- Count as one custom page/template even though it powers two product URLs.

Primary job:

- Give enough detail to buy or submit a lead without requiring separate product education pages.

Main sections:

1. Product hero/buy box.
2. Best-for statement.
3. Specs.
4. What it does / does not do.
5. Service plan selector/explainer.
6. Add-ons.
7. 250th package cross-sell where relevant.
8. FAQ.
9. Contact/help CTA.

Required product data:

- Price.
- Product media.
- Feature list.
- Battery/talk/standby times.
- Best-for label.
- Product-specific URL handle.

CTA:

- `Add to cart` or chosen preorder/order action.
- `Ask before ordering` -> `/pages/contact`

### 4. Contact / Lead Form

URL:

- `/pages/contact`

Template:

- `page.contact.json`

Primary job:

- Capture questions, updates, buyer uncertainty, and marketing opt-in.

Main sections:

1. Contact hero.
2. Lead form.
3. "Not sure which phone?" helper copy.
4. Support/company contact details.
5. Short FAQ.

Form intent options:

- Help choosing a phone.
- Question about service.
- Question about add-ons.
- Order/preorder help.
- Marketing updates.
- Referral question.

CTA:

- `Send my question`

## Boilerplate / System Pages

These should exist, but not count as custom paid pages unless scope expands:

- `/policies/privacy-policy`
- `/policies/terms-of-service`
- `/policies/refund-policy` if needed.
- `/policies/shipping-policy` if needed.
- `/cart`
- `/checkout`
- `/404`

About page recommendation:

- Do not build a standalone About page in the four-page version.
- Fold company story, American-owned message, and 42-year proof into Home and Contact.

FAQ page recommendation:

- Do not build a standalone FAQ page in the four-page version.
- Use FAQ sections on Home, Collection, Product, and Contact.

## Navigation

Primary nav:

- Home
- Choose Your Phone
- Contact

Utility/footer:

- Privacy Policy
- Terms
- Shipping/Returns if applicable

Avoid:

- Blog.
- Resources.
- Separate About.
- Separate FAQ.
- Multi-category catalog.
- Competitor comparison hub.

## Scope Risk Notes

The product pages require two product URLs, but they should share one product template and one editable section system.

If the client insists that each product page counts separately as a page, remove the collection page and let Home compare the two products directly:

1. Home.
2. Freedom Phone.
3. Patriot Phone.
4. Contact.

That fallback is less clean for Shopify browsing, but it preserves the four-page cap.

