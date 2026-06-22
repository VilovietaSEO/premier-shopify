# SOW Summary

Source PDF: `independence-phone-sow-v1.pdf`

## Metadata

- Title: `Statement of Work - IndependencePhone.com Redesign`
- Project code: `IP-WEB-2026-Q2`
- Client: Premier Companies, Franklin, TN
- Client contact: Jordan Grindell
- Builder: Andrew Ansley
- Date: 2026-06-15
- Status: draft, pending Andrew review before sending to Jordan
- Pages: 8

## Core Direction

- Build direct to Shopify.
- No WordPress interim.
- Site should be editable through Shopify admin so Jordan can run it without a developer.
- Main storefront scope is a CRO-optimized Independence Phone site with SEO, AIO/AEO, speed, and image optimization foundations.

## Custom Page Scope

- Home - main conversion page.
- Category/collection - holds Freedom and Patriot.
- Product template - serves both Freedom and Patriot SKUs/products.
- Lead-gen form page - Option B, posts to distributor API, with success and retry states.

## Boilerplate Page Scope

- About.
- Contact.
- Privacy Policy.
- Terms of Service.
- 404.

## Editability Requirements

- Page copy editable through Shopify online store editor.
- Product photos, prices, and descriptions swappable in Shopify admin.
- FAQ items editable in a single block.
- Form fields configurable from Shopify admin.
- Written PDF guide required.
- Recorded walkthrough video required.

## Performance And Optimization Requirements

- WebP conversion with fallbacks.
- Lazy loading below the fold.
- Responsive image sizing at 320, 768, 1280, and 1920 px.
- Defer non-critical JavaScript.
- Inline critical CSS.
- Target mobile LCP under 3 seconds on 4G.
- Target CLS under 0.1.
- Target FCP under 1.8 seconds.
- Target Lighthouse mobile scores: Performance over 85, Accessibility over 90, Best Practices over 90, SEO over 90.

## SEO, AIO, And AEO Requirements

- Keyword research for 8-12 primary and long-tail kid-safe phone / parental control terms.
- Title tags, meta descriptions, heading hierarchy, alt text, internal linking.
- Schema: Product with Offer, Organization, FAQPage, BreadcrumbList.
- sitemap.xml and robots.txt.
- Google Business Profile alignment for Premier Companies in Franklin, TN.
- llms.txt.
- SameAs links where valid.
- Source-citable FAQ block.
- Answer blocks for top 5 parent questions.
- AI bot directives.
- Knowledge-graph alignment checklist.

## CRO Requirements

- Hero with a single primary CTA above the fold.
- Trust signals: American-made, 42-year-old company, 250th Anniversary.
- Comparison table vs Tin Can, Gabb, Pinwheel, Troomi, and Bark.
- FAQ objection handling.
- Warranty and 30-day return policy surfaced.
- Mobile-first responsive design at 320, 768, and 1280 px breakpoints.
- Multi-step form.
- Multiple CTAs throughout.

## API / Backend Boundary

- Andrew defines data shapes the page reads: product data, pricing, stock state.
- Andrew defines data shape the form writes: order inquiry payload as JSON.
- Andrew delivers a 1-page API developer handoff document.
- Actual API endpoint wiring is not in scope.
- Backend wiring, auth, retries, error handling, payment gateway integration, and email routing are not in scope.
- Later mock-data to live-data swap is estimated separately at 2-4 hours once a stable endpoint and test data exist.

## Timeline And Dependencies

- Delivery target: 2 weeks from kickoff.
- Shopify store access is required by Day 1.
- Brand assets and current photos are required by Day 1.
- Slogan choice is needed by Day 1 or Andrew chooses based on SEO research.
- API documentation is needed by Day 5 or front end uses documented mock data.
- Lead-gen form is default. Shopify checkout instead is a scope change.

## Pricing In SOW

- Base price: $11,000.
- Family and friends rate: $5,500.
- Family and friends payment terms: $2,750 deposit and $2,750 on launch.
- Iteration rate: $100/hour.
- Photo/video edits: $60/hour.
- Backend integration: $100/hour, estimated 2-4 hours after API readiness.

