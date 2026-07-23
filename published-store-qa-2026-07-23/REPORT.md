# Published Shopify Store QA — July 23, 2026

## Scope and live target

- Authenticated Shopify storefront checked: `https://jordan-mark-premier.myshopify.com`
- Published theme ID: `151266459717`
- Published theme: **Independence Phone QA 2026-07-15 Front Photos**
- The published theme contains the corrected 800×640 Classic and Rugged front-facing WebP assets.
- No theme, product, navigation, admin, DNS, or publishing changes were made.
- A neutral test identity and a public Nashville address were entered only far enough to calculate checkout shipping and tax. No order or payment was submitted.

## Important routing finding

**Fail:** `https://independencephone.com/` still resolves to the old WordPress/WooCommerce site, not Shopify. The Shopify storefront is still password-protected at its MyShopify address. A client visiting the custom domain will therefore see a different site.

## Results

| Area | Item | Result | What is live |
|---|---|---:|---|
| Theme | Published theme and theme ID | **Pass** | Theme `151266459717`, “Independence Phone QA 2026-07-15 Front Photos,” is current. |
| Theme | Correct front-facing source images | **Pass** | Corrected Classic and Rugged 800×640 WebP assets are served and used by Order Now. |
| Access | Shopify storefront without an authenticated/password session | **Blocked** | Every public MyShopify storefront route redirects to `/password`. |
| Access | Client-facing custom domain | **Fail** | `independencephone.com` still serves WordPress/WooCommerce. |
| Homepage | Initially muted with a slashed sound icon | **Fail** | Video is muted, but the initial icon is an unslashed speaker. |
| Homepage | Horizontal video plays and has sound | **Pass** | Desktop video autoplays, is 30 seconds at 1280×720, and contains AAC stereo audio. The button successfully unmutes it. |
| Homepage | Horizontal video on mobile | **Fail** | Mobile loads a separate 720×1280 vertical video. |
| Homepage | Four correct logo-free phone scenario images | **Fail** | All four cards use the same fallback image and show generic/non-AX83H hardware. |
| Homepage | “Established in 1984.” | **Fail** | Live text says “42 years in business, American owned, Family Focused.” |
| Homepage | “Give your child a phone, not the internet.” | **Fail** | Live heading says “Give them a phone. Not the internet.” |
| Homepage | No Patriot Package references | **Fail** | Patriot Package appears in the announcement, feature cards, and FAQ. |
| Homepage | Question-mark icon links to FAQ | **Fail** | Header has Account, Contact, and Cart; no FAQ question-mark control exists. |
| Homepage | Footer email and phone | **Fail** | Neither `info@independencephone.com` nor `(615) 704-1776` appears. |
| Order Now | Phone choices side-by-side on desktop | **Pass** | Both cards are equal-width and side-by-side. |
| Order Now | Balanced mobile phone choices | **Fail** | Cards stack without horizontal overflow, but their media/card heights differ (Classic 182 px, Rugged 204 px). |
| Order Now | Supplied rotating phone media | **Fail** | Both choices use static WebP images; no rotating MP4 is present. |
| Order Now | Correct, uncropped phone images | **Pass** | Both current order cards show the corrected full front views. |
| Order Now | No Patriot Package or policy text | **Fail** | The limited-offer Patriot Package block and Privacy/Terms paragraph remain. |
| Order Now | Requested heading, labels, colors, referral, summary, and button copy | **Fail** | Old H1 (“Build your Independence Phone setup.”), neutral cards, old referral/helper copy, old summary note, and “Add setup to cart” remain. |
| Order Now | Phone-description links preserve selection | **Fail** | No phone-description links exist. |
| Cart | Correct heading and no “Order review,” Product, or Total labels | **Fail** | “Order review,” “Your cart,” Product, and Total remain. |
| Cart | No unwanted “setup” wording | **Fail** | “Classic Phone setup” and “Remove setup” remain. |
| Cart | Correct Classic and Rugged imagery | **Fail** | The exercised Classic cart line uses the old `Standard Phone` product image/alt text, not the corrected order-card asset. |
| Cart | Shipping shows $15 | **Fail** | Cart says “Calculated at checkout.” |
| Cart | Due-today and future charges separated | **Fail** | Phone, Monthly Service, and Add-on Bundle are combined into a $127.76 subtotal. |
| Cart | Correct service timing and tax/checkout note | **Fail** | The old generic “finalized through the approved store setup” note remains. |
| Cart | Remove action | **Blocked** | The live button and JS handler exist, but the destructive click was not exercised so the existing browser cart would remain unchanged. |
| Checkout | Only phone, tax, and $15 shipping charged today | **Fail** | Monthly Service and Add-on Bundle are current priced line items; subtotal is $127.76 before shipping/tax. |
| Checkout | Service and add-ons are not charged today | **Fail** | They are charged as $17.76 and $10.00 checkout items. |
| Checkout | Only one shipping option | **Fail** | Valid address produces Standard **Free** and Express **$15.00**. |
| Checkout | Tax calculates after address | **Fail** | No tax line appeared after a validated Tennessee address. |
| Checkout | Service/add-on lines use American-flag image | **Fail** | Those two checkout lines have no image. |
| Checkout | Future charges visible | **Fail** | Checkout shows present line-item prices, not a separate future-charge schedule. |
| Checkout | Desired area code required | **Fail** | No desired-area-code field exists. |
| Checkout | Privacy and Terms appear once | **Fail** | Policy agreement is repeated as a product property while native Privacy/Terms controls also appear. |
| Checkout | Checkout can accept payment | **Fail** | Shopify says “This store can’t accept payments right now,” and Pay now is disabled. |
| FAQ | No Patriot Package reference | **Fail** | “What does the Patriot Package include?” remains. |
| FAQ | Referral answer present | **Pass** | Referral answer exists and describes the one-month service credit. |
| FAQ | Phone-comparison answer present | **Pass** | Classic-versus-Rugged answer exists. |
| Contact | Only Name, Email, Phone Number, and “How can we Help?” | **Fail** | Child age, use case, product, plan, Patriot interest, add-ons, marketing, and policy fields remain. |
| Contact | Button says “Send” | **Fail** | Button says “Send my question.” |
| Contact | No left panel or extra paragraphs | **Fail** | Intro panel, FAQ section, and large trust/experience section remain. |
| Footer | Email and phone on every page | **Fail** | Both are absent from all checked footers. |
| Responsive | No horizontal overflow at 390 px | **Pass** | Homepage, Order Now, Cart, FAQ, Contact, and Checkout remained within 390 px. |

## Screenshots

Overview:

- [Desktop overview](desktop-overview.png)
- [Mobile overview](mobile-overview.png)
- [Published-theme proof](admin-published-theme.png)

Full-page desktop:

- [Homepage](desktop-home.png)
- [Order Now](desktop-order-now.png)
- [Cart](desktop-cart.png)
- [Checkout](desktop-checkout.png)
- [FAQ](desktop-faq.png)
- [Contact](desktop-contact.png)

Full-page mobile:

- [Homepage](mobile-home.png)
- [Order Now](mobile-order-now.png)
- [Cart](mobile-cart.png)
- [Checkout](mobile-checkout.png)
- [Checkout after shipping calculation](mobile-checkout-shipping-test.png)
- [FAQ](mobile-faq.png)
- [Contact](mobile-contact.png)

Additional:

- [Privacy Policy](desktop-privacy.png)
