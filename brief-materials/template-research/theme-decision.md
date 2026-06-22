# Shopify Theme Decision

Date: 2026-06-22

## Decision

Use Shopify's free `Refresh` theme as the base, then build custom editable Shopify sections on top of it.

Do not build a headless/custom frontend. Do not buy a third-party ThemeForest-style theme unless the official Shopify base fails a real dev-theme test.

## Why Refresh

Independence Phone is a two-product guided purchase flow, not a broad ecommerce catalog. The site needs product proof, clear specifications, plan/add-on explanation, comparison tables, FAQs, and trust-building sections. Refresh is a better fit than Spotlight because it is designed around product quality and brand storytelling, not only fast setup.

Refresh should carry:

- Product proof/spec layouts.
- FAQ and accordions.
- Testimonials/trust sections.
- Product-detail depth.
- Clean modern typography that can be restyled into the Independence Phone visual system.

## Why Not Spotlight As Primary

Spotlight is still the backup if we need the fastest possible setup or the Shopify plan forces it, but it is too lightweight for this project as the primary base. It would require more custom work to support the parent-research story, feature truth tables, add-ons, service plans, and comparison sections.

## Why Not Dawn As Primary

Dawn is a good blank canvas, but using it here gives us less strategic leverage. We would spend more effort recreating product-detail and storytelling patterns that Refresh already encourages.

## Why Not Fully Custom

A fully custom or headless frontend would give maximum design control but would weaken the client's requirement: they need a drag-and-drop, visually maintainable editing experience.

The right compromise is:

- Shopify Theme Store theme as the updateable base.
- Custom Liquid sections with schema settings and blocks.
- Product metafields for structured content.
- JSON templates for Home, Product, Collection, About, Contact, FAQ, and lead-gen pages.
- Client edits content/layout in Shopify Theme Editor.
- Developer controls section code through Shopify CLI and GitHub.

This keeps the client independent for content edits without forcing them into a fragile custom website.

## Design Direction

Voice: warm, practical, parent-first, quiet Americana.

Avoid a loud patriotic ecommerce look. Patriotism should be the trust layer, not the visual theme. The primary visual story is a child in a normal family setting using a phone that behaves like a phone.

First viewport:

- Full-bleed or dominant supplied hero video.
- H1: `Give them a phone. Not the internet.`
- Subcopy: `A shared family phone for the smartphone-free years. Kids can call home without apps, browsers, social media, or a personal screen.`
- Primary CTA: `Choose your phone`
- Secondary CTA: `How it works`

Visual system:

- Warm off-white background, deep ink text, restrained red/blue accents.
- American flag as a subtle transparent section treatment only.
- Large product/child imagery, not generic icons.
- Dense product truth tables where parents need clarity.
- Simple spec comparison for Freedom Phone vs Patriot Phone.

## Required Custom Editable Sections

Build these as Shopify sections with schema settings/blocks so the client can rearrange and edit them visually:

1. Video hero with overlay copy, CTAs, poster image, and proof bullets.
2. "Phone, not internet" feature strip.
3. "Built for the in-between years" JTBD section.
4. Product comparison: Freedom Phone vs Patriot Phone.
5. Capability truth table: calls, Wi-Fi, browser, social, app store, SMS, GPS, camera, 911, spam screening.
6. Service plan block: monthly vs annual.
7. Add-on selector/explainer: Call Recording, Time Conditions, Voicemail to Email, Victory Bundle, Auto Attendant.
8. 250th Anniversary package feature band.
9. Comparison section: landline vs flip phone vs restricted smartphone vs Independence Phone.
10. FAQ accordion.
11. Patriot/American-owned trust band.
12. Lead-gen/contact form section.

## Shopify Data Model

Use product metafields and theme settings for repeatable content instead of hardcoding:

- Product specs.
- Best-for labels.
- Feature flags.
- Service plan copy.
- Add-on copy.
- FAQ content.
- Trust statements.
- Hero video/poster references.

Hardcode as little commercial copy as possible. If a field changes often or should be client-owned, expose it through the theme editor or metafields.

## Guardrails

- Do not imply SMS, GPS, camera, cellular mobility, or 911 support until the provider confirms those facts.
- Do not describe it as a "kid smartphone."
- Do not center the brand around politics first.
- Do not make add-ons look like unrelated products unless the API/checkout architecture requires it.
- Do not make a large catalog experience for two products.

## Fallback Path

If Refresh fails in dev testing:

1. Test Spotlight as the simplest official fallback.
2. Test Dawn if custom sections need maximum blank-canvas control.
3. Only then evaluate a paid Shopify Theme Store theme.
4. Avoid unsupported third-party themes outside Shopify Theme Store.

