# Unpublished QA Theme Verification — July 23, 2026

## Target

- Store: `jordan-mark-premier.myshopify.com`
- Unpublished QA theme: `151553245253`
- Theme name: `Independence Phone QA 2026-07-23 Deferred v2`
- Published theme left unchanged: `151266459717`

## Verified

- Homepage video autoplays muted, contains audio, and the in-frame sound control unmutes it.
- Homepage copy, FAQ header link, and global footer contact details match the approved direction.
- Order Now uses balanced Classic and Rugged choices, rotating media, deferred-billing copy, and responsive step headings.
- Cart separates phone charges due today from future service and add-on charges.
- Cart removal works for both a complete setup and optional add-ons.
- Checkout charges the phone and one $15 shipping rate today while presenting service as a future charge.
- FAQ and Contact use the simplified approved content and fields.
- Desktop and mobile layouts were exercised for Homepage, Order Now, Cart, FAQ, and Contact.
- No test order or payment was submitted, and the test cart was cleared after verification.

## Remaining blockers

- The four homepage scenario images still use an inaccurate fallback handset. Generated replacements failed the strict handset-accuracy gate and were not uploaded.
- Payment, desired area code, final consent, and provisioning depend on the future Rev.io integration.
- Tax calculation depends on the merchant's legal address, tax registrations, and Shopify tax configuration.
- `independencephone.com` remains on the client's existing WordPress hosting and DNS.
- Storefront password protection remains enabled by request.

## Validation

- Local contract checks: 1,496 passed, 0 failed.
- Browser suite: 31 passed.
- Shopify Theme Check: 65 files, zero offenses.

## Screenshots

- [Homepage desktop](homepage-desktop.png)
- [Homepage mobile](homepage-mobile.png)
- [Order Now desktop](order-now-desktop.png)
- [Order Now mobile](order-now-mobile.png)
- [Cart desktop](cart-classic-monthly-bundle-desktop.png)
- [Cart mobile](cart-classic-monthly-bundle-mobile.png)
- [Checkout desktop](checkout-classic-monthly-desktop.png)
- [FAQ desktop](faq-desktop.png)
- [FAQ mobile](faq-mobile.png)
- [Contact desktop](contact-desktop.png)
- [Contact mobile](contact-mobile.png)
