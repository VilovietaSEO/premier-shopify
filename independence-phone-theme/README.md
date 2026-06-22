# Independence Phone Shopify Theme

Fresh-store Shopify Online Store 2.0 theme for Independence Phone.

Local path:

```bash
/Users/vilovieta/Documents/Shopify/independence-phone-theme
```

Canonical source folder:

```bash
/Users/vilovieta/Documents/Shopify/brief-materials
```

## Build Status

- Theme scaffold exists locally.
- Independence Phone sections and JSON templates are implemented.
- Product, service, add-on, package, and trust copy use the provided source facts.
- `shopify theme check` passes with no offenses.
- Store preview/push waits on fresh-store Shopify auth.
- Refresh-base migration support exists at `/Users/vilovieta/Documents/Shopify/refresh-overlay`.

## Refresh Base Path

The active project direction is to use Shopify Refresh as the final base theme. Refresh is installed or pulled from a Shopify store; `shopify theme init` does not expose Refresh as a local starter.

After the fresh store exists:

```bash
shopify theme list --store STORE.myshopify.com
shopify theme pull --store STORE.myshopify.com --theme REFRESH_THEME_ID --path /Users/vilovieta/Documents/Shopify/refresh-theme
cd /Users/vilovieta/Documents/Shopify
scripts/apply-refresh-overlay.sh /Users/vilovieta/Documents/Shopify/refresh-theme
cd /Users/vilovieta/Documents/Shopify/refresh-theme
shopify theme check
shopify theme dev --store STORE.myshopify.com --theme REFRESH_THEME_ID
```

The current `independence-phone-theme` folder remains a complete uploadable local package and a working source reference, but final Refresh compliance requires applying the overlay to a pulled Refresh theme.

## Fresh Store Setup

Create these Shopify products:

| Product | Price | Handle | Template |
| --- | ---: | --- | --- |
| Freedom Phone | `$99` | `freedom-phone` | `independence-phone` |
| Patriot Phone | `$149` | `patriot-phone` | `independence-phone` |

Create this collection:

| Collection | Handle | Template |
| --- | --- | --- |
| Phones | `phones` | `phones` |

Publish both products and the `Phones` collection to the Online Store sales channel. The setup helper can do this automatically when the Admin API token includes `read_publications` and `write_publications`; otherwise publish them from each product/collection admin page under Publishing.

Create this page:

| Page | Handle | Template |
| --- | --- | --- |
| Contact | `contact` | `contact` |

Primary URLs:

- `/`
- `/collections/phones`
- `/products/freedom-phone`
- `/products/patriot-phone`
- `/pages/contact`

## Theme Files

Main custom sections:

- `sections/ip-video-hero.liquid`
- `sections/ip-jtbd-story.liquid`
- `sections/ip-feature-strip.liquid`
- `sections/ip-product-comparison.liquid`
- `sections/ip-product-main.liquid`
- `sections/ip-service-plans.liquid`
- `sections/ip-add-ons.liquid`
- `sections/ip-capability-table.liquid`
- `sections/ip-package-band.liquid`
- `sections/ip-comparison-matrix.liquid`
- `sections/ip-faq.liquid`
- `sections/ip-trust-band.liquid`
- `sections/ip-contact-form.liquid`

Main templates:

- `templates/index.json`
- `templates/collection.phones.json`
- `templates/product.independence-phone.json`
- `templates/page.contact.json`

Fallback branded templates:

- `templates/collection.json`
- `templates/product.json`

Main design file:

- `assets/ip-theme.css`

## Assets

Theme-ready assets:

- `assets/ip-current-site-logo.png`
- `assets/ip-current-site-product-1.png`
- `assets/ip-current-site-product-2.png`
- `assets/ip-current-site-product-3.png`
- `assets/ip-current-site-product-4.png`
- `assets/ip-current-site-product-collage.png`
- `assets/ip-independence-phone-product-crunchy.png`
- `assets/ip-hero-video.mp4`
- `assets/ip-hero-video-poster.jpg`

Original hero video:

```bash
/Users/vilovieta/Documents/Shopify/brief-materials/assets/video/indy-phone-reel-1.mov
```

The theme includes a compressed packaged hero video fallback at `assets/ip-hero-video.mp4` and a generated poster fallback at `assets/ip-hero-video-poster.jpg`. You can still replace the video in Theme Editor through the `IP video hero` section's `Hero video` setting.

## CLI Commands

Validate:

```bash
shopify theme check
```

Run against the fresh store after Shopify auth exists:

```bash
shopify theme dev --store STORE.myshopify.com
```

Push to a development theme:

```bash
shopify theme push --store STORE.myshopify.com
```

Package the theme:

```bash
shopify theme package
```

## Editing Boundary

Client-editable in Theme Editor:

- Hero video/poster, headline, copy, CTAs, proof bullets.
- JTBD cards and feature strip.
- Product comparison copy and fallback images.
- Service plans and add-ons.
- Capability table rows.
- 250th Anniversary package copy.
- Comparison matrix rows.
- FAQ rows.
- Trust band rows.
- Contact form support copy.
- Theme colors in Theme settings.

Developer-owned:

- Liquid section logic.
- Responsive CSS.
- Product-template handle logic.
- JSON template structure.
- Shopify product handles and template assignment rules.
