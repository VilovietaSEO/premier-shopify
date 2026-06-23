# Visual Preview Verification

Last run: 2026-06-22

Command:

```bash
cd /Users/vilovieta/Documents/Shopify
npm run preview:test
```

Result:

```text
4 passed
```

The preview test now verifies:

- Required preview routes render separately: Home, Freedom product, Patriot product, Cart, Contact.
- Product page CTAs use preview route URLs instead of `#freedom` or `#patriot` jump links.
- The Home route renders hero, feature strip, product comparison, JTBD story, package band, FAQ, and trust.
- The Home route does not render product-detail sections, product forms, cart setup details, or the contact form.
- The Home hero uses a larger dedicated heading and lede scale, including the 860px audit viewport from browser review.
- The Freedom and Patriot product routes each render exactly one product detail section with one product form, two carousel thumbnails, two service radio options, and five add-on checkboxes.
- Cart and Contact render in their own routes without product ordering forms.
- The Cart route renders as a standalone cart page with a true empty-cart state when no preview item has been added.
- Product add-to-cart updates the preview cart count, carries the selected phone model into the cart, and updates line totals/subtotal live.
- Cart review always shows all five add-on options for the active phone line, with selected add-ons checked.
- Cart add-on checkbox changes update the selected setup-property summary live.
- Preview cart remove clears the cart item and returns the Cart route to the empty state.
- Required positioning/product/service copy renders.
- The preview-only navigation ribbon is absent; the deal banner and primary header are the only top navigation layers.
- The preview header and logo stay compact, with the logo constrained by height while preserving its source aspect ratio.
- The footer stays visually separated from the dark trust band with a light background and a visible patriotic divider rule.
- Cart review renders selected service/add-on setup properties only when a preview cart item exists.
- One contact form renders.
- All local preview images load.
- No page-level horizontal overflow appears.

Viewport checks:

| Viewport | Route | Width | Body scroll width | Visible sections | Product forms | Service radios | Add-on checkboxes | Cart property lists | Contact forms | Broken images | Overflowing elements |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Desktop | `home` | `1440px` | `1440px` | `7` | `0` | `0` | `0` | `0` | `0` | `0` | `0` |
| Desktop | `freedom` | `1440px` | `1440px` | `1` | `1` | `2` | `5` | `0` | `0` | `0` | `0` |
| Audit | `home` | `860px` | `860px` | `7` | `0` | `0` | `0` | `0` | `0` | `0` | `0` |
| Mobile | `home` | `390px` | `390px` | `7` | `0` | `0` | `0` | `0` | `0` | `0` | `0` |
| Mobile | `freedom` | `390px` | `390px` | `1` | `1` | `2` | `5` | `0` | `0` | `0` | `0` |

Screenshots were generated locally under:

```bash
/Users/vilovieta/Documents/Shopify/visual-preview/screenshots
```

Those screenshots are intentionally ignored by Git because they are generated QA artifacts.

Additional validation:

```bash
cd /Users/vilovieta/Documents/Shopify/independence-phone-theme
shopify theme check
```

Result:

```text
57 files inspected with no offenses found.
```
