# Product Model And Theme Direction

## Core Decision

This is not a broad ecommerce catalog. It is a two-product guided purchase flow.

That makes the template choice easier. The site does not need heavy collection browsing, mega menus, advanced filtering, or marketplace-style discovery. It needs a strong homepage, two product pages with specific URLs, a simple product comparison, a clear plan/add-on selector, and a lead-gen/order flow that is easy for the client to edit.

## Products

### Freedom Phone

- Price: `$99` or `$100` depending final approved pricing.
- Type: heavy-duty cordless Wi-Fi handset with charging base.
- Features:
  - HD audio quality.
  - Smart noise filtering.
  - Encrypted data transmission and storage.
  - Built-in Bluetooth 5.0.
  - 9-hour talk time.
  - 200-hour standby battery.

Recommended URL:

- `/products/freedom-phone`

### Patriot Phone

- Price: `$149` or `$150` depending final approved pricing.
- Type: rugged edition cordless Wi-Fi handset with charging base.
- Features:
  - Waterproof and dust-proof.
  - Drop-proof up to 1.8 meters.
  - Non-slip, anti-scratch, anti-bacterial construction.
  - HD Voice, AI Noise Cancellation, and Acoustic Shield.
  - Encrypted data transmission and storage.
  - Built-in Bluetooth 5.0.
  - 13-hour talk time.
  - 300-hour standby battery.

Recommended URL:

- `/products/patriot-phone`

## Service Plans

Both products should present the same service options:

- Personal phone number plus monthly phone service: `$17.76/mo`.
- Personal phone number plus annual phone service: `$200/yr`, with `$13.12` savings.

## Add-ons

Both products should present the same add-ons:

- Call Recording: record and store all calls for 90 days, `$5/mo`.
- Time Conditions: set on/off times for incoming calls, `$5/mo`.
- Voicemail to Email: unanswered calls go to voicemail and messages are sent to email, `$5/mo`.
- Victory Bundle: Call Recording plus Time Conditions plus Voicemail to Email, `$10/mo`.
- Auto Attendant: eliminate spam calls, `$5/mo`.

## Shipping

- `$15/phone` anywhere in the USA.

## Introductory Package

250th Anniversary package:

- 1 Freedom Phone.
- 1 year service.
- Victory Bundle.
- Price: `$250`.
- Stated savings: `$73.12`.

## Required Disclosures

- All products and services are subject to federal, state, and local taxes.
- Refer a friend and earn 1 free month of service.
- Marketing opt-in: receive text or email updates and marketing information, with opt-out.
- Payment disclosure: provided payment information will be stored securely and used each month to pay the bill.

## Shopify Modeling Direction

Recommended Shopify structure:

- Product 1: `Freedom Phone`.
- Product 2: `Patriot Phone`.
- Product URLs:
  - `/products/freedom-phone`
  - `/products/patriot-phone`
- Service plan selection should be presented on both product pages.
- Add-ons should be presented on both product pages.
- 250th Anniversary package can be handled as:
  - a bundle/product package if Shopify/Rev.io supports it cleanly, or
  - a guided checkout/order form path with line-item properties and backend mapping.

Do not model each add-on as a top-level standalone product unless the Rev.io/API integration requires it. Top-level product clutter would make the store harder for the client and customer.

## Template Implications

The theme needs:

- Strong video hero support.
- Strong product-page media.
- Editable sections.
- FAQ blocks.
- Comparison blocks.
- Product spec tables.
- Bundle/package presentation.
- Lightweight collection page for exactly two products.

The theme does not need:

- Advanced catalog filtering.
- Mega menus.
- Marketplace-style homepages.
- Large collection merchandising.
- Dozens of product-card layouts.

## Recommended Theme Direction

Best candidates from prior research:

1. `Spotlight` - best simple two-product launch base.
2. `Refresh` - best product details/specs/add-ons base.
3. `Dawn` - best blank canvas if custom sections will carry the brand.

`Craft` remains viable for storytelling, but the clarified two-product structure makes `Refresh` and `Spotlight` more practical.

Avoid buying a third-party theme unless the native free themes fail during a real Shopify dev-theme test.

