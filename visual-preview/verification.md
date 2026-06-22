# Visual Preview Verification

Last run: 2026-06-22

Command:

```bash
cd /Users/vilovieta/Documents/Shopify
npm run preview:test
```

Result:

```text
3 passed
```

The preview test now verifies:

- Required scoped page markers render: Home, Choose Your Phone, Freedom product, Patriot product, Contact.
- Required section slots render: hero, JTBD story, feature strip, product comparison, service plans, add-ons, capability table, package band, product pages, FAQ, contact, trust band.
- Required positioning/product/service copy renders.
- Two product forms render.
- One contact form renders.
- All local preview images load.
- No page-level horizontal overflow appears.

Viewport checks:

| Viewport | Width | Body scroll width | Section count | Product forms | Contact forms | Broken images | Overflowing elements |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Desktop | `1440px` | `1440px` | `13` | `2` | `1` | `0` | `0` |
| Tablet | `1024px` | `1024px` | `13` | `2` | `1` | `0` | `0` |
| Mobile | `390px` | `390px` | `13` | `2` | `1` | `0` | `0` |

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
55 files inspected with no offenses found.
```
