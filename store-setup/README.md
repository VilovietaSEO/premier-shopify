# Fresh Store Setup Data

This folder contains the Independence Phone product data needed after the fresh Shopify store exists.

Files:

- `product-metafields.json` - product metafield definitions the theme reads.
- `products.csv` - two-product starter import file.
- `LAUNCH_CHECKLIST.md` - store-by-store checklist to execute after access exists.

## Setup Order

1. Add Shopify `Refresh` to the fresh store.
2. Pull Refresh and apply `/Users/vilovieta/Documents/Shopify/refresh-overlay` with `/Users/vilovieta/Documents/Shopify/scripts/bootstrap-refresh-store.sh`.
3. Create the product metafields in Shopify admin.
4. Import `products.csv`.
5. Assign product templates and upload/select product images.
6. Open Theme Editor and select the product objects in the product comparison section.

## Product Metafields

In Shopify admin:

```text
Settings -> Custom data -> Products -> Add definition
```

Create these definitions:

| Name | Namespace and key | Type | Used by |
| --- | --- | --- | --- |
| Product deck | `custom.product_deck` | Single line text | Product hero deck |
| Best for | `custom.best_for` | Single line text | Product hero and product comparison |
| Specs | `custom.specs` | Multi-line text | Product specs list |

The `Specs` value is semicolon-separated because it needs to work predictably in both CSV import and Liquid rendering.

## Product Import

Import:

```bash
/Users/vilovieta/Documents/Shopify/store-setup/products.csv
```

Shopify's product CSV format requires the first line to use supported column headers, and Shopify supports product metafields in product CSV import/export after the metafields are defined. The CSV uses current column names such as `Title`, `URL handle`, `Description`, `Option1 name`, `Option1 value`, `Price`, `Product image URL`, and custom metafield columns in the `product.metafields.custom.KEY` format.

Important image note:

- The CSV intentionally leaves image URLs out.
- Shopify product CSV image fields require public image URLs.
- Upload the local product images directly to products after import:
  - `/Users/vilovieta/Documents/Shopify/brief-materials/assets/site-images/current-site-product-1.png`
  - `/Users/vilovieta/Documents/Shopify/brief-materials/assets/site-images/current-site-product-2.png`
  - `/Users/vilovieta/Documents/Shopify/brief-materials/assets/site-images/current-site-product-3.png`
  - `/Users/vilovieta/Documents/Shopify/brief-materials/assets/site-images/current-site-product-4.png`
  - `/Users/vilovieta/Documents/Shopify/brief-materials/assets/product-images/independence-phone-product-crunchy.png`

## Product Template Assignment

After import, set both products to:

```text
Theme template: independence-phone
```

Required handles:

- `freedom-phone`
- `patriot-phone`

Required collection:

- Title: `Phones`
- Handle: `phones`
- Template: `collection.phones`

## Canonical Product Data

### Freedom Phone

- Price: `$99`
- URL: `/products/freedom-phone`
- Product deck: `The everyday family phone for kids who need to call home without stepping into smartphone life.`
- Best for: `Best for home, grandparents, short independence windows, and everyday family calling.`
- Specs:
  - Heavy-duty cordless Wi-Fi handset with charging base.
  - HD audio quality.
  - Smart noise filtering.
  - Encrypted data transmission and storage.
  - Built-in Bluetooth 5.0.
  - 9-hour talk time.
  - 200-hour standby battery.

### Patriot Phone

- Price: `$149`
- URL: `/products/patriot-phone`
- Product deck: `The rugged family phone for busier homes, tougher handling, and longer days.`
- Best for: `Best for families who want rugged durability, longer battery life, and a more resilient handset.`
- Specs:
  - Rugged cordless Wi-Fi handset with charging base.
  - Waterproof and dust-proof.
  - Drop-proof up to 1.8 meters.
  - Non-slip, anti-scratch, anti-bacterial construction.
  - HD Voice, AI Noise Cancellation, and Acoustic Shield.
  - Encrypted data transmission and storage.
  - Built-in Bluetooth 5.0.
  - 13-hour talk time.
  - 300-hour standby battery.
