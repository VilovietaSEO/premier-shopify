# Shopify Store Setup Data

This folder contains reproducible source data for `jordan-mark-premier.myshopify.com`:

- `products.csv` — Classic Phone and Rugged Phone import data.
- `product-metafields.json` — product metafield definitions used by the theme.

The live store already contains additional hidden `$0.00` service and add-on products used by the deferred-billing order flow. Do not replace or delete live catalog objects solely from these starter files.

## Safe local checks

These commands do not require credentials and do not change Shopify:

```bash
npm run store:metafields:dry-run
npm run store:objects:dry-run
npm run store:media:dry-run
npm run store:objects:audit:test
npm run store:deferred-billing:test
```

## Shopify Admin helpers

- `scripts/create-product-metafields.js` creates missing product metafield definitions.
- `scripts/create-storefront-objects.js` creates or updates the two phones, the Phones collection, and required pages.
- `scripts/audit-storefront-objects.js` performs a read-only store audit.
- `scripts/assign-product-media.js` assigns approved theme-hosted media to Shopify products.

Real Shopify operations require an approved target store and either `SHOPIFY_ADMIN_ACCESS_TOKEN` or an explicitly selected Shopify CLI session. Run a dry run first. Media assignment additionally requires `SHOPIFY_PRODUCT_MEDIA_APPROVED=1` because product media is global store data, not theme-local data.

Use media from `independence-phone-theme/assets/`. For `SHOPIFY_THEME_ASSET_BASE`, copy the exact asset-directory base from a rendered Shopify theme asset URL; do not guess the `/cdn/shop/t/N/assets` segment.

## Current product and order rules

- Phone handles: `standard-phone` and `rugged-phone`
- Collection handle: `phones`
- Product template: `product.independence-phone`
- Phone category: `Electronics > Communications > Telephony > Cordless Phones`
- One `$15` shipping charge per order
- Service and add-on variants remain `$0.00`, non-shipping deferred-billing lines
- `Requested area code` is required on Order Now
- `Discount/referral/customer ID` is optional on Order Now

The Shopify lines preserve selections only. They do not activate Rev.io billing or provisioning.

For operating instructions, use the [Shopify Store Operations Guide](../guides/SHOPIFY_STORE_OPERATIONS_GUIDE.md). For future server-side billing work, use the [Rev.io Payment and Provisioning Guide](../guides/REVIO_PAYMENT_AND_PROVISIONING_GUIDE.md).
