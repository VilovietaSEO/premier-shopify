# INDEPENDENCE PHONE Project Brief

## Project Context

INDEPENDENCE PHONE currently has a WordPress site at <https://independencephone.com/>. The current site contains useful pricing, product details, and images, but the client does not want to send prospects there because the visual direction feels wrong for the product.

The near-term need is a better public-facing website that can launch quickly. The likely next phase is moving the site to Shopify after a Rev.io database/API connection is ready, estimated by the client at 1 to 3 weeks from the note.

Updated strategic note from June 22, 2026:

- The primary ICP selling point is parents wanting their kids to have a 90s-style upbringing: no smart tech, no apps, no web, just a phone acting like a phone.
- Affordability is a primary sales point.
- American-made / made-in-America / patriotic positioning is secondary, used as trust and brand identity rather than the lead reason to buy.
- Use JTBD framing from `../strategy/jtbd-project-approach.md` for the project approach.

## Brand Requirements

- Always write `INDEPENDENCE PHONE` in all caps.
- Top branding should say `A PHONE PLUS Company`.
- Mention that the company has been around for 42 years.
- Position as American owned.
- Phone/product imagery should not mention or show `Yealink`.
- Client likes the phrase `The Family-First Wi-Fi Phone.`

## Visual Direction

- Mark wants the entire background to use a flag direction.
- Updated direction from June 22, 2026: the supplied video should be the hero asset.
- Earlier hero image concept remains useful as an art direction reference if a still fallback is needed: a kid using the phone, parents smiling in the background, possibly with a smaller picture-in-picture of a grandparent or friend on the other line.
- American flag treatment should be a transparent/background design element for selected sections, not the entire page.
- Flag artwork can be AI-generated or sourced online, but should be section-level design texture rather than full-page wallpaper.
- Use the supplied logo file in `assets/logo/`.
- Use the supplied reel/video in `assets/video/` as source material if helpful.
- Extracted Shopify product image is saved at `assets/product-images/independence-phone-product-crunchy.png`.
- The extracted product image currently shows `Yealink` on the phone screen. Treat it as reference only until cleaned or replaced.
- Current-site image assets are saved in `assets/site-images/`.
- The attached kid-phone reference thumbnail is saved at `assets/reference-images/kid-phone-ui-reference.png`.

## Product Names And Hardware

Updated direction from June 22, 2026:

- There are 2 actual products, with variants under those products.
- There will only ever be 2 products. Treat this as a two-product guided purchase flow, not a broad ecommerce catalog.
- Both product pages need to present service plans and add-ons.
- Each product needs its own specific URL.

Client-facing product names from the notes:

- `Freedom Phone` - standard Wi-Fi handset with charging base.
- `Patriot Phone` - rugged Wi-Fi handset with charging base.

Underlying hardware references from the client note:

- Standard option: Yealink AX83H.
- Rugged edition: AX86R.

Do not expose the Yealink brand in copy or images.

Recommended Shopify product URLs:

- `/products/freedom-phone`
- `/products/patriot-phone`

## Contact And Order Routing

- Product phone number: `(615) 704-1776`
- Orders should currently go to:
  - `mark@premiercompanies.com`
  - `jordan@premiercompanies.com`

## Offer And Pricing Notes

Equipment:

- Freedom Phone - heavy duty Wi-Fi handset with charging base: `$100`
- Patriot Phone - rugged Wi-Fi handset with charging base: `$150`

Service:

- Personal phone number plus monthly phone service: `$17.76/mo`
- Personal phone number plus annual phone service: `$200/yr` with `$13.12` savings

Add-ons:

- Call recording - record and store all calls for 90 days: `$5/mo`
- Time Conditions - set on/off times for incoming calls: `$5/mo`
- Voicemail to Email - unanswered calls go to voicemail and messages are sent to email: `$5/mo`
- Victory Bundle - Call Recording plus Time Conditions plus Voicemail to Email: `$10/mo`
- Auto Attendant to eliminate spam calls: `$5/mo`

Shipping:

- `$15/phone` anywhere in the USA.

Introductory package:

- `250th anniversary package`
- 1 Freedom Phone plus 1 year service plus Victory Bundle: `$250`
- Stated savings: `$73.12`

Required disclosures:

- All products and services are subject to federal, state, and local taxes.
- Refer a friend and earn 1 free month of service.
- Include opt-in language for text or email updates and marketing information, with opt-out.
- Explain that provided payment information will be stored securely and used each month to pay the bill.

## Order Form Requirements

- Order form should create an account.
- First product choice should say `one time fee`.
- Product choice should show pictures of both phones and include specs.
- Include referral code field.
- Include terms and conditions visibly at signup, either as a linked page or visible details.
- Privacy Policy should be linked at the bottom of the page.
- There may be duplicate check marks at the bottom of the existing page; likely consolidate into one if it is redundant.

## Required Links

- Terms: <https://independencephone.com/terms/>
- Privacy: <https://independencephone.com/privacy/>

## Copy Bank

Primary liked line:

- The Family-First Wi-Fi Phone.

Possible headlines and supporting copy:

- Your child needs a phone eventually. They probably do not need TikTok yet.
- Every parent wants to know their child is safe. Not every parent wants to hand them the internet.
- Freedom for kids. Confidence for parents.
- Real connection. No endless scrolling.
- The phone that keeps childhood intact.
- Talk more. Scroll less.
- Give them independence - not the internet.
- A first phone without the smartphone problems.
- All the connection. None of the chaos.
- Simple calling. Safer growing up.
- Because kids need freedom, not feeds.
- Stay connected without social media.
- The smarter alternative to smartphones.
- Built for conversation, not distraction.
- Peace of mind in the palm of their hand.
- For families who want less screen time.
- A phone made for kids - and parents.
- Childhood first. Technology second.
- The phone that protects their attention.
- Keep them reachable without handing over the internet.
- Calls, connection, and confidence.
- Finally - a kid phone that acts like a phone.
- Remember when phones were just for talking?
- Bring back a simpler childhood.
- Give your child room to grow without handing over the entire internet.
- Technology should support childhood, not replace it.
- Your child's first phone does not have to become their whole world.
- Childhood goes fast. Protect their attention while you still can.
- INDEPENDENCE PHONE helps families stay connected the old-fashioned way.
- A first phone should build independence - not addiction.

## Competitors

Competitor URLs are organized separately in `../research/competitors/competitor-links.md`.

## Build Implications

- SOW direction says build direct to Shopify, no WordPress interim.
- Native Shopify sections are preferred over a third-party builder so the client can edit content while code remains CLI-controlled.
- Use Shopify metafields/metaobjects for structured specs, FAQs, product comparisons, offer details, and package details.
- Model the catalog around 2 real products and their variants, not many separate products for every option.
- Avoid catalog-heavy themes, mega menus, and advanced collection filtering. The site needs product storytelling, comparison, package clarity, and a guided order flow.
- Hero section should support video as the primary media asset, with a still image fallback.
- Design sections should support optional transparent flag texture/background overlays.
- Current Shopify product page at `freedom-phone-2.myshopify.com` appears to contain placeholder product data: `$1.00` price and one default variant at the tested URL.

## SOW Requirements

- Custom pages: Home, Category/collection, Product template, and lead-gen form page.
- Boilerplate pages: About, Contact, Privacy Policy, Terms of Service, 404.
- Site must be editable through Shopify admin: copy, product photos, prices, descriptions, FAQ items, and form fields.
- Deliver a written edit guide and recorded walkthrough video.
- Speed targets: mobile LCP under 3 seconds on 4G, CLS under 0.1, FCP under 1.8 seconds, Lighthouse mobile Performance over 85, Accessibility/Best Practices/SEO over 90.
- SEO/AIO/AEO deliverables include keyword research, metadata, schema, sitemap, robots, llms.txt, FAQ answer blocks, AI bot directives, and knowledge-graph checklist.
- CRO requirements include single hero CTA, trust signals, competitor comparison, objection-handling FAQs, risk reversal, mobile-first design, multi-step form, and repeated CTAs.
- Backend/API wiring, auth, retries, payment gateway integration, and email routing are not in scope. The build should provide data-shape handoff and mock data if API docs are not ready.
