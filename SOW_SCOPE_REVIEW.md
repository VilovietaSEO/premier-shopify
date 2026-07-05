# SOW Scope Review - Independence Phone Shopify

Date: 2026-07-05

Baseline: Statement of Work - IndependencePhone.com Redesign, draft dated 2026-06-15.

This review compares the original SOW against the current repo, live Shopify theme state, and saved launch-readiness proof. Some material details evolved after client feedback, especially product naming, add-on modeling, the Patriot Package, Rev.io handoff, and CRM/order capture expectations.

## Executive Verdict

The core storefront design/build scope is substantially delivered.

The current build includes:

- Direct Shopify theme, no WordPress interim.
- Live Shopify theme: `Independence Phone` / theme ID `150479208517`.
- Home page.
- Collection/product-selection page.
- Product template for both phone products.
- Guided order builder.
- Cart review and setup grouping.
- FAQ page.
- Contact page with CRM endpoint support. The current theme setting points to a placeholder until a real hosted ops URL is provided.
- Editable Shopify sections, product media, prices, descriptions, FAQs, and theme settings.
- Hidden billing products for service/add-ons/package line items.
- Local CRM/server path for leads, order webhooks, CSV export, Rev.io handoff, and automatic `llms.txt`.
- Developer handoff docs and client handoff packet.

The build is not fully launch-complete yet because these items still require owner/API/hosting action:

- Storefront password needs to be removed for public launch.
- Payment path must be chosen and proven: Shopify Checkout or Rev.io checkout.
- Ops server must be deployed to a public HTTPS host.
- Contact CRM endpoint must be changed from the placeholder host to the real hosted `/crm/capture` URL.
- Shopify order webhook must be configured to the hosted server.
- A real or approved test order must be captured and audited.
- Public `llms.txt`, sitemap, SEO metadata, JSON-LD, and crawler proof need to be rerun after password/proxy setup.
- Policies and final shipping/tax settings need owner confirmation.
- Recorded walkthrough video and PDF-format edit guide are not present in the repo.
- Live Lighthouse/Core Web Vitals proof is not yet present.

## Status Legend

- **Delivered**: implemented and locally or live-state verified.
- **Delivered, evolved**: implemented, but the final version intentionally differs from the SOW because client direction changed.
- **Partial / launch proof needed**: implemented in repo/theme, but not proven on the public launched site.
- **Client/API responsibility**: outside final web-design deliverable or requires client/API owner action.
- **Not delivered**: expected by original SOW and not currently present.

## SOW Comparison Table

| SOW item | Current status | Notes |
| --- | --- | --- |
| Direct-to-Shopify build, no WordPress interim | Delivered | Current build is a Shopify Online Store 2.0 theme. |
| Single-domain Shopify site | Partial / launch proof needed | Store exists at `jordan-mark-premier.myshopify.com`; final public domain and storefront password removal remain. |
| CRO-optimized Independence Phone storefront | Delivered, evolved | Home, product selection, product, order builder, package, cart, FAQ, and contact flows exist. |
| Home page | Delivered | Implemented as `templates/index.json` with custom IP sections. |
| Category / collection page | Delivered, evolved | Implemented through `/collections/all` and `collection.json`; `collection.phones.json` also exists. Sort/filter from the SOW is not a major current UI feature. |
| Product page template for both SKUs | Delivered | `product.independence-phone.json` serves Classic and Rugged products. |
| Freedom $100 / Patriot $150 naming | Delivered, evolved | Client later requested Classic Phone and Rugged Phone. Live product handles are `standard-phone` and `rugged-phone`; prices are $100 and $150. Patriot remains as package/brand language. |
| $17.76/month service | Delivered | Monthly Service exists at $17.76 and is featured in storefront/order flow. |
| 250th Anniversary narrative | Delivered, evolved | Patriot Package / anniversary language is represented in offer copy and launch docs. |
| Lead-gen form page Option B | Delivered, evolved | The current build uses a Contact page with CRM endpoint support plus order/checkout capture. It no longer only posts to a distributor API. |
| Success/failure form behavior | Partial | Native contact success/failure exists, CRM success redirect exists; public hosted CRM endpoint still must be deployed/proven. |
| About boilerplate page | Not delivered / owner setup | Theme has generic page support, but a distinct About page object/content is not currently part of the live object proof. Earlier project direction also moved About content into the main flow. |
| Contact page | Delivered | `/pages/contact` route passes launch-readiness route proof. |
| Privacy Policy | Client responsibility | Cart/form link to Shopify policy route; owner must add final policy in Shopify Admin. |
| Terms of Service | Client responsibility | Cart/form link to Shopify policy route; owner must add final terms in Shopify Admin. |
| 404 page | Delivered | `templates/404.json` and `sections/404.liquid` exist. |
| Hero image | Delivered, evolved | Current hero uses supplied video/poster/visual assets rather than only AI-generated hero art. |
| Product image set | Delivered | Product media exists and launch audit reports both phone products have media and alt text. |
| All on-page copy | Delivered, evolved | Copy has been revised through multiple client-feedback rounds. |
| Page copy editable in Shopify Theme Editor | Delivered | Custom sections use Shopify schema settings and blocks. |
| Product photos/prices/descriptions editable in Shopify Admin | Delivered | Product data lives in Shopify product objects and product media. |
| FAQ editable in a single block system | Delivered | `ip-faq.liquid` supports editable FAQ blocks and FAQPage JSON-LD. |
| Form fields configurable from Shopify admin | Partial | Contact form copy, labels, endpoint, opt-in, and notes are configurable; the exact field list is mostly fixed in Liquid. |
| Written guide PDF | Partial / not PDF | Theme Editor guide, client handoff packet, launch checklist, and runbook exist as Markdown. No PDF export is currently present. |
| Recorded walkthrough video | Not delivered | No walkthrough video file is present in the repo. |
| 30 days bug-fix support | Client/business process | Documented in SOW; not something the repo can prove. |
| WebP conversion with fallbacks | Partial / not proven | Theme uses Shopify image pipeline and responsive image helpers. Explicit WebP fallback proof is not present. |
| Lazy loading below-the-fold images | Delivered | Product/gallery snippets use lazy loading on non-hero imagery. |
| Responsive image sizing at 320/768/1280/1920 | Partial | Shopify image helpers and responsive `sizes` are used, but exact SOW breakpoint set is not explicitly proven for every image. |
| Defer non-critical JavaScript | Delivered | `ip-cart.js` and `ip-product-gallery.js` are loaded with `defer`. |
| Critical CSS inlined | Partial | `critical.css` is preloaded globally; not literally inlined in HTML. |
| LCP < 3s on 4G | Partial / launch proof needed | No final public Lighthouse/Core Web Vitals proof is present. |
| CLS < 0.1 | Partial / launch proof needed | No final public Lighthouse/Core Web Vitals proof is present. |
| FCP < 1.8s | Partial / launch proof needed | No final public Lighthouse/Core Web Vitals proof is present. |
| Lighthouse mobile scores | Partial / launch proof needed | Theme/local QA exists, but final Lighthouse proof is not present. |
| Keyword research 8-12 terms | Partial | Strategy/research docs exist, but no concise final keyword deliverable is currently packaged as a client-facing artifact. |
| On-page SEO metadata | Partial / launch proof needed | Meta tags exist; live SEO audit remains blocked by password page and public launch state. |
| Heading hierarchy | Delivered / local proof | Theme sections use semantic headings; final live audit after public launch still needed. |
| Alt text | Delivered | Product media audit reports media/alt text ready. |
| Internal linking | Delivered, evolved | Order/product/FAQ/contact/cart flows are linked; final public crawl proof still needed. |
| Product schema with Offer | Delivered | Product structured data is rendered through Shopify `product | structured_data`. |
| Organization schema | Delivered | `ip-structured-data.liquid` renders Organization JSON-LD. |
| FAQPage schema | Delivered | FAQ sections render FAQPage JSON-LD. |
| BreadcrumbList schema | Not delivered / not proven | No current evidence of BreadcrumbList JSON-LD. |
| sitemap.xml | Partial / launch proof needed | Shopify should provide sitemap behavior, but latest audit reports sitemap failure while public launch/proxy state is unresolved. |
| robots.txt | Delivered | Theme includes `templates/robots.txt.liquid` preserving Shopify defaults. |
| Google Business Profile alignment | Client responsibility / not delivered | No proof artifact confirms GBP alignment. |
| llms.txt | Partial / launch proof needed | Automatic generator/server exists and tests pass; public proxy/hosting not deployed, so live `llms.txt` fails. |
| sameAs links | Not delivered / not proven | Organization schema does not currently include sameAs links. |
| Source-citable FAQ block | Delivered | FAQ content and FAQPage schema exist. |
| Natural-language About copy/entity identity | Delivered, evolved | Entity story appears across homepage/FAQ/handoff docs rather than a standalone About page. |
| AEO top parent questions | Partial | FAQ and answer-style content exist; a distinct "top 5 parent questions" AEO proof artifact is not currently packaged. |
| AI bot directives | Partial / platform constrained | Robots template preserves Shopify defaults; explicit GPTBot/ClaudeBot/PerplexityBot/Google-Extended rate-limit directives are not proven. |
| Knowledge-graph checklist | Not delivered | No final checklist artifact is present beyond general SEO/AIO notes. |
| Hero with primary CTA above fold | Delivered | Homepage hero includes primary Order Now CTA and $17.76/mo callout. |
| Trust signals | Delivered | American-owned, 42 years, family-focused, and Patriot Package/anniversary copy are present. |
| Comparison vs Tin Can/Gabb/Pinwheel/Troomi/Bark | Not delivered / evolved | Competitor research exists, but the current storefront does not show the explicit competitor comparison table from the SOW. This appears to have evolved away from public competitor-comparison copy. |
| FAQ objection handling | Delivered | FAQ page and FAQ sections exist. |
| Warranty + 30-day return policy surfaced | Partial / owner policy needed | SOW calls for risk reversal; final warranty/return policy language needs owner confirmation/policy setup. |
| Mobile-first 320/768/1280 breakpoints | Delivered / local proof | Playwright preview covers responsive routes; final live public proof still needed. |
| Multi-step form | Delivered, evolved | Current order builder is multi-step: Patriot Package, choose phone, choose plan, choose add-ons. Contact form is not the only conversion path. |
| Multiple CTAs throughout | Delivered | Homepage/order/product paths include repeated Order Now/product CTAs. |
| Product data shape read by page | Delivered | Store object scripts, product metafields, product templates, and Rev.io payload contract define/read product data. |
| Form/order payload JSON shape | Delivered, evolved | CRM and Rev.io checkout payloads are documented and tested. |
| 1-page API developer handoff | Delivered, expanded | `REVIO_INTEGRATION_HANDOFF.md`, `ops/README.md`, and `CLIENT_HANDOFF_PACKET.md` exceed one page but give the API developer the needed details. |
| Actual distributor API wiring | Client/API responsibility | Original SOW says backend wiring is out of scope. Current build provides webhook-ready handoff but does not call Rev.io directly. |
| Payment gateway integration | Client/API responsibility | Original SOW says payment gateway integration is out of scope. Shopify Payments setup or Rev.io payment integration remains owner/API work. |
| Email marketing / drip / abandoned cart | Out of scope | Not implemented. |
| Blog/content publishing system | Out of scope | Not implemented. |
| Ongoing SEO management | Out of scope | Not implemented. |
| Premium Shopify apps | Out of scope | Not assumed. |
| Logo redesign | Out of scope | Existing assets used. |
| Translations | Out of scope | Not implemented. |
| Email notification setup | Out of scope / client responsibility | CRM/webhook paths exist; downstream email routing remains client-side. |

## Current Launch Audit Snapshot

Latest saved launch readiness artifact:

```text
tmp/shopify-live-proof/launch-readiness-audit.json
```

Generated:

```text
2026-07-05T20:08:16.027Z
```

Summary:

```text
Pass: 22
Pending: 1
Blockers: 6
Status: blocked
```

Passing areas include:

- Home, collection, order, FAQ, contact, product, and cart routes are not 404s.
- Classic and Rugged products exist with correct pricing.
- Hidden billing products exist.
- Phone collection includes the two launch products.
- Password-gated storefront access has been proven.
- Ops deployment bundle exists.
- Contact page has a CRM endpoint setting configured to a placeholder. This proves the theme has the setting, not that production CRM capture is live.

Remaining blockers:

- Public storefront still returns the password page to unauthenticated crawlers.
- Public `llms.txt` routes are not deployed/routed.
- Sitemap proof fails until public launch/proxy routing is resolved.
- Route SEO metadata and JSON-LD proof cannot pass while password page is returned.
- Ops deployment audit has not been run against a real public HTTPS endpoint.
- Contact CRM capture has not been proven against a real hosted endpoint.
- Real/test Shopify order proof has not been run.

## Material Scope Evolution

These changes are intentional evolution from the original SOW:

1. **Names changed**: Freedom/Patriot phone language became Classic/Rugged for product descriptors. Patriot remains in Patriot Package/brand context.
2. **Checkout model became more concrete**: instead of only a lead-gen form posting to a distributor API, the build now supports Shopify cart line items, hidden billing products, order setup grouping, CRM sale capture, and Rev.io handoff.
3. **Rev.io became the likely API target**: the handoff is now specifically aligned to Rev.io, but the repo intentionally does not store Rev.io tenant credentials or call Rev.io directly.
4. **Client wanted a Bark-like order builder**: the order flow now has package, phone, plan, and add-on choices rather than only product cards and a simple lead form.
5. **Homepage media changed**: current hero direction uses supplied video/media treatment instead of only a single AI hero image.
6. **`llms.txt` became more ambitious**: the repo now includes automatic route-level Markdown via a hosted ops service, but that service must be deployed before live proof passes.

## What Is Needed To Call This Fully Complete

From the web-design/build side, the theme and handoff docs are ready for launch setup. To close the SOW at a production level:

1. Export or produce the written edit guide as a PDF, if PDF format is required.
2. Record the approximately 10-minute walkthrough video.
3. Add/confirm Shopify policy pages.
4. Confirm shipping/tax settings.
5. Choose Shopify Checkout or Rev.io checkout.
6. If using Shopify Checkout, activate the payment provider and place a test order.
7. If using Rev.io checkout, deploy ops server, configure Rev.io middleware, and complete sandbox proof.
8. Deploy the ops server to public HTTPS.
9. Replace the current placeholder CRM endpoint with the real hosted `/crm/capture` URL.
10. Submit a real test contact form and verify it appears in the CRM viewer/export.
11. Configure Shopify order webhook to the hosted server.
12. Route `llms.txt` and CRM/Rev.io paths through the final domain or ops subdomain.
13. Remove storefront password when approved.
14. Rerun live SEO, `llms.txt`, launch readiness, and order proof audits.
15. Run final Lighthouse/Core Web Vitals proof on the public store.

## Client-Facing Summary

The project has delivered the custom Shopify storefront and the technical handoff needed for launch. The remaining items are not a redesign backlog; they are launch operations: owner Shopify settings, payment choice, hosted server deployment, Rev.io API finalization if Rev.io is used for checkout, public SEO/LLMS proof, and one real/test order proof.
