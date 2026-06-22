# Design Brief

Project: Independence Phone Shopify build

Date: 2026-06-22

## Design Objective

Create a Shopify-native storefront that sells a deliberately simple idea:

> Give them a phone. Not the internet.

The site should feel like a modern family utility, not a gadget store and not a political merchandise site. Parents should immediately understand that this is a phone-call-first product for the years before a smartphone.

## Page Type

Primary type: product marketing landing page.

Supporting types:

- Two-product comparison page.
- Reusable product detail template.
- Lead/contact form page.

## Strategic Frame

The design should support the JTBD:

- Functional job: give a child a way to call parents/caregivers without apps, browser, feeds, or a personal smartphone.
- Emotional job: help parents feel responsible and calm, not controlling or behind.
- Social job: help parents hold the line on smartphones without feeling unreasonable.

The design should make the product feel:

- Boring in the right way.
- Trustworthy.
- Easy to understand.
- Parent-owned, not kid-owned.
- A household tool, not a toy.

## Theme Base

Use Shopify `Refresh` as the base theme, then build custom editable sections through Liquid section schema.

The client must be able to visually maintain:

- Headlines.
- Body copy.
- CTAs.
- FAQ rows.
- Product comparison rows.
- Feature truth table rows.
- Plan/add-on copy.
- Trust-band copy.
- Images/video/posters.

Developer-owned:

- Section layout code.
- Responsive behavior.
- Theme tokens.
- Product template logic.
- Metafield wiring.
- Checkout/API assumptions.

## Visual Voice

Direction: warm practical Americana.

Tone:

- Parent-first.
- Clean.
- Calm.
- Slightly nostalgic.
- Confident, not alarmist.

Avoid:

- Loud flag wallpaper.
- Aggressive political styling.
- Tech startup gradients.
- Kid-toy colors.
- Generic ecommerce card grids.
- Smartphone-app imagery.
- Overly patriotic campaign-poster visuals except for small promotional moments.

## Palette Direction

Use a restrained OKLCH color system:

- Paper: warm off-white.
- Ink: deep navy/charcoal, not pure black.
- Primary accent: softened American red for CTAs and selected emphasis.
- Secondary accent: muted federal blue for rules, labels, and trust details.
- Flag treatment: low-opacity transparent red/blue striping in select bands only.

Accent should be wayfinding, not decoration.

Recommended token direction:

```css
--ip-paper: oklch(97% 0.012 86);
--ip-paper-2: color-mix(in oklab, var(--ip-paper) 94%, var(--ip-ink));
--ip-ink: oklch(20% 0.035 255);
--ip-ink-muted: color-mix(in oklab, var(--ip-ink) 62%, var(--ip-paper));
--ip-red: oklch(55% 0.18 28);
--ip-blue: oklch(38% 0.11 255);
--ip-rule: color-mix(in oklab, var(--ip-ink) 16%, var(--ip-paper));
```

## Typography Direction

Keep the type system mature and practical.

Recommended shape:

- Display/headings: strong condensed or semi-condensed sans.
- Body: legible humanist sans.
- Labels/specs: mono or utilitarian sans for proof, prices, and truth tables.
- Optional italic serif accent for one or two emotional phrases, not everywhere.

Avoid default ecommerce typography. The headline should feel authored.

## Layout Signature

First viewport:

- Dominant supplied hero video.
- Hero copy over or adjacent to the video depending crop quality.
- The product/child/family context must be visible above the fold.
- H1: `Give them a phone. Not the internet.`
- Proof strip: `No apps` / `No web browser` / `No social feeds` / `Simple phone service`
- Primary CTA: `Choose your phone`
- Secondary CTA: `How it works`

The homepage should read as a guided decision, not a catalog browse.

## Core Components

Build these as reusable Shopify sections where possible.

### Video Hero

Fields:

- Video.
- Poster image.
- Eyebrow.
- H1.
- Subhead.
- Primary CTA text/link.
- Secondary CTA text/link.
- Proof bullets.

Design notes:

- Use video as actual content, not background noise.
- Ensure text remains readable over all video frames.
- Provide static fallback poster.

### JTBD Problem/Solution Section

Purpose: validate the parent conflict.

Content shape:

- Kids need independence.
- Parents need reachability.
- Smartphones add apps, feeds, and constant negotiation.
- Independence Phone gives the calling layer first.

Design notes:

- Use editorial rows or split statements.
- Avoid fear-mongering imagery.

### Product Comparison

Purpose: make Freedom vs Patriot easy.

Rows:

- Best for.
- Price.
- Durability.
- Battery.
- Audio/noise features.
- Bluetooth.
- Charging base.

Design notes:

- Product cards are acceptable here because they are repeated product items.
- Do not put cards inside another card.
- Use clear CTAs for each product.

### Capability Truth Table

Purpose: answer parent objections plainly.

Rows to include:

- Calls.
- Wi-Fi.
- Web browser.
- App store.
- Social media.
- YouTube.
- SMS/texting.
- GPS.
- Camera.
- 911/emergency calling.
- Spam screening / Auto Attendant.

Design notes:

- Unknown features should be marked `Verify before launch`.
- This table should feel factual, not decorative.

### Plans And Add-ons

Purpose: explain one-time hardware plus service.

Content:

- Monthly service: `$17.76/mo`.
- Annual service: `$200/yr`.
- Victory Bundle.
- Add-ons.
- Shipping and taxes disclosure.

Design notes:

- Keep pricing readable.
- Avoid hiding monthly fees.
- Make add-ons sound parent-useful, not telecom-jargony.

### FAQ Accordion

Purpose: reduce anxiety before purchase/contact.

Design notes:

- Use accessible buttons with open/closed state.
- Client-editable rows.
- Place high-risk questions near product/checkout points.

### Trust Band

Purpose: use Americana as trust layer.

Content:

- American-owned.
- 42 years of communication experience.
- Phone Plus company context.
- 250th Anniversary package.

Design notes:

- Use subtle flag texture or rule treatment.
- Do not make patriotism the whole page.

## Asset Direction

Use:

- Supplied hero video as homepage hero.
- Current-site child-with-phone imagery for strategic reference.
- Product imagery for comparison and product pages.
- AI-generated transparent flag texture if needed for section-level art.

Avoid:

- Product images with visible manufacturer branding unless approved.
- Stock photos of families staring at smartphones.
- Dark, blurry, generic hero overlays.

## Responsive Behavior

Desktop:

- Max content width around 1240-1440px depending section.
- Hero can use asymmetry: video dominant, copy anchored.
- Product comparison can be two columns.

Tablet:

- Product comparison remains two columns if space allows.
- Truth table may become horizontally scrollable only if labels stay readable.

Mobile:

- Hero copy comes before or over a stable cropped video/poster.
- Product comparison stacks.
- Truth table becomes grouped rows.
- CTAs must be 44px minimum.
- No overlapping text on video.

## Shopify Maintainability Rules

Every custom section should expose only meaningful controls:

- Text.
- Image/video.
- CTA.
- Row/block items.
- Section tone/background variant.

Do not expose arbitrary spacing, font sizes, shadows, or layout knobs.

Use:

- Section schema blocks.
- Product metafields.
- Metaobjects if FAQs/add-ons become shared data.
- JSON templates.
- Theme settings for brand colors and typography.

## Accessibility Requirements

- All buttons and accordions keyboard accessible.
- Video must not autoplay with sound.
- Provide fallback image and alt text.
- Maintain contrast over video.
- Do not rely on color alone in truth tables.
- Ensure FAQ controls use `aria-expanded`.

## Open Design Questions

- Final logo usage and whether a simplified web SVG export is needed.
- Whether the hero video has enough clean space for text overlay.
- Whether manufacturer branding must be retouched out of product images.
- Whether the phone supports SMS, GPS, camera, or 911.
- Whether Auto Attendant can be honestly marketed as spam reduction.

