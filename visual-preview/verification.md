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

Viewport checks:

| Viewport | Width | Body scroll width | Overflowing elements |
| --- | ---: | ---: | ---: |
| Desktop | `1440px` | `1440px` | `0` |
| Tablet | `1024px` | `1024px` | `0` |
| Mobile | `390px` | `390px` | `0` |

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
