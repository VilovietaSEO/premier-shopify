# Independence Phone Client QA Execution Spec

Status: deferred-billing v2 client QA implemented on an unpublished theme; GitHub integration pending
Store: `jordan-mark-premier.myshopify.com`
Live theme: `151266459717`
QA theme: `Independence Phone QA 2026-07-23 Deferred v2` (`151553245253`, unpublished)
Rollback theme: select and verify an unpublished candidate immediately before launch
Repository baseline commit: `ae392b648dedebed8bad8c7db5ed50042cead650`
Execution branch: `codex/independence-deferred-billing-main`
Owner: Andrew, continuing as developer/admin after client handoff

Current-role note (2026-07-23): theme `151266459717` was published outside this execution. Theme `151553245253` is the current unpublished deferred-billing QA target. Historical phase proofs below retain the roles that were true when those actions ran.

## 2026-07-23 delivery override

This section, `docs/decisions/2026-07-23-defer-service-and-add-on-charges.md`, and `GO_LIVE_RUNBOOK.md` supersede every older phase below where the requirements conflict.

- Customer journey: Homepage -> `/pages/order-now` -> `/cart` -> external final checkout.
- The Patriot Package is retired from the active offer and purchase contract.
- Shopify is prepared to charge only the phone, applicable tax, and one `$15` shipping charge per order today.
- Service and add-ons use `$0.00`, non-shipping, non-taxable Shopify lines with stable SKUs and future-charge metadata.
- Service and add-on billing begins on the first day of the following month after the external integration creates the schedule.
- Privacy Policy/Terms acceptance and desired area code are collected exactly once by the final external checkout, not Order Now or cart.
- Contact uses Shopify native delivery while `CRM endpoint URL` remains blank.
- The guarded theme helper may target only unpublished QA theme `151553245253` and must confirm live theme `151266459717` remains live.
- The July 23 generated scenario images remain review-only candidates because they did not pass the strict handset-fidelity gate; they are not automatic theme replacements.

## Historical canonical direction: 2026-07-14

This section and Phase J preserve the direction used during that earlier execution. They are superseded by the July 23 delivery override above.

The required customer journey is:

`Homepage -> Order Now -> guided setup builder -> Shopify cart review -> checkout`

Client-language clarification:

- In the feedback, "cart" first refers to the Bark-like guided setup page containing Patriot Package, Choose Phone, Choose Plan, and Choose Add-ons.
- The button labeled `Add setup to cart` must then open the actual Shopify `/cart` review page after a successful add.
- Standalone Classic and Rugged product-detail pages may remain as unlinked support routes, but they are not a required step in the primary purchase journey.
- The guided builder is intentionally simple and compact. It is not an Amazon-style product-detail gallery.
- Hidden Shopify service/add-on products remain pricing and integration records. They must not look like independent merchandise in the customer-facing cart.
- Policy acceptance occurs once, at the final cart/checkout decision point.

Reopened proof claims:

- E01, E03, E06, E10, H16, H21, and H22 are reopened by Phase J.
- Previous proof that a selection reached Shopify cart JSON is not proof that the customer was navigated to `/cart`.
- Previous proof that an image used `object-fit: contain` is not proof that the source image itself showed an uncropped full phone.
- Previous proof that separate billing lines existed is not proof that their cart presentation was acceptable.

## Locked decisions

- The current live theme remains untouched while this spec is executed.
- All storefront work goes to a new unpublished QA theme.
- Publishing requires Andrew's explicit approval after preview QA.
- Storefront password protection remains enabled for this delivery cycle.
- Every QA storefront layout emits `noindex,nofollow`; indexing stays disabled until Andrew explicitly approves removing it.
- Patriot Package savings copy is `$73.12` everywhere.
- The canonical hero master is `brief-materials/assets/video/indy-phone-reel-1.mov` with SHA-256 `aaf06895cee9a3b3009cc3d70e09966bf8f70969caadcf7e4383b32c23f06532`.
- Hero playback begins muted because browsers require it. The customer action is labeled `Play with sound` and must start audible playback.
- Product photography must use the supplied Classic and Rugged files and preserve the 5:4 source ratio. Andrew explicitly approved retaining the authentic Yealink mark on the two front selector photos on 2026-07-15.
- QA may use the three verified no-mark gallery angles plus the approved front selector composite for each phone. Side, spin, and spin-poster media remain blocked until separately approved.
- Jordan must retain full Shopify admin capability. Andrew must retain developer/admin access.
- Order notifications must reach `mark@premiercompanies.com` and `jordan@premiercompanies.com` before launch.
- The eight service/add-on products are Shopify product lines, not automatic subscriptions. Recurring billing is not launch-ready until Shopify selling plans or the approved Rev.io handoff is configured and tested.

## Execution rules

- One checkbox represents one state change followed by one recorded proof.
- Never push to current live theme `151228809285`.
- Never run `shopify theme publish` without explicit approval.
- Never delete an existing theme to make room without explicit approval.
- Never place API keys, Admin tokens, client passwords, or customer data in this file or Git.
- Keep original client media immutable. Generated derivatives go in controlled production paths.
- Stop before any paid checkout, external email test, or irreversible Admin action unless that exact action is approved.
- After each remote change, verify the target theme ID still has role `unpublished`.

## Phase A: Freeze, branch, and isolate

- [x] **A01** Confirm the repository is clean before execution.
  - Proof: `git status --short --branch` returned `main...origin/main` with no changed files on 2026-07-14.
- [x] **A02** Create `codex/independence-client-qa` from the locked repository baseline.
  - Proof: `git switch -c codex/independence-client-qa bece407b73753bbc24d376a0223fc2e3d67cb7dc` succeeded.
- [x] **A03** Confirm the authenticated Shopify source theme.
  - Proof: Shopify CLI 3.92.1 lists theme `150479208517` as `live`, named `Independence Phone`, with `processing: false`.
- [x] **A04** Duplicate live theme `150479208517` server-side as `Independence Phone QA 2026-07-14`.
  - Proof: Shopify returned theme `151228809285`; its ID differs from the live ID and its role is `unpublished`.
- [x] **A05** Record the QA theme ID in this document.
  - Proof: `shopify theme info --theme 151228809285 --json` reports `unpublished` and returned a preview URL.
- [x] **A06** Open the untouched QA duplicate and capture baseline desktop and mobile screenshots.
  - Proof: `tmp/qa-baseline-desktop.png` is 1440x3171; `tmp/qa-baseline-mobile.png` is 390x4286. Both show the pre-change QA duplicate and its known hero defects.
- [x] **A07** Compare the live theme with the repository baseline before final QA and preserve server-side drift.
  - Proof: live `sections/ip-contact-form.liquid` contained a split CRM/native-form hotfix absent from the baseline; that behavior is merged into both the theme and refresh overlay. Three template differences were Shopify-generated comment headers only.

## Phase B: Canonical media and derivatives

- [x] **B01** Verify the two Drive downloads and repo master remain byte-identical.
  - Proof: `Indy Phone Reel #1.mov`, `Indy Phone Reel #1 (1).mov`, and the repo master all equal the locked SHA-256 above.
- [x] **B02** Create the desktop hero derivative from the canonical 9:16 master.
  - Required composition: 16:9 web-safe canvas, full uncropped portrait action centered, subtle blurred extension at the sides, foreground brightness unchanged.
  - Required encoding: H.264, 8-bit `yuv420p`, AAC stereo, 48 kHz, fast-start MP4.
- [x] **B03** Create the mobile hero derivative from the canonical master.
  - Required composition: native 9:16 framing with no crop.
  - Required encoding: H.264, 8-bit `yuv420p`, AAC stereo, 48 kHz, fast-start MP4.
- [x] **B04** Create matching desktop and mobile WebP posters.
  - Proof: `ip-hero-video-poster.webp` is 1280x720 and `ip-hero-video-poster-mobile.webp` is 720x1280.
- [x] **B05** Verify duration, frame count, resolution, audio presence, and audible levels for both hero derivatives.
  - Acceptance: 30 seconds, 720 frames at 24 fps, stereo audio present, no clipped/corrupt stream.
  - Proof: both derivatives are 30 seconds/720 frames at 24 fps with AAC stereo at 48 kHz; mean audio is -21.1 dB, peak is -0.2 dB, and decode verification passes.
- [x] **B06** Record the twelve immutable external originals without altering them.
  - Proof: `brief-materials/assets/indy-content/manifests/source.sha256` pins ten photographs and two spin videos from `/Users/vilovieta/Downloads/INDY CONTENT`.
- [x] **B07** Visually inspect every supplied photo and record all visible Yealink marks.
  - Proof: `manifests/source-visual-review.tsv` records eight approved photographs and two still-blocked side angles; the front entries record the explicit approval to retain Yealink.
- [x] **B08** Preserve the real front handsets and their approved Yealink marks while removing only the blue studio background and pedestal.
  - Proof: `rembg` 2.0.76 with the pinned BiRefNet General model generated full-resolution masks; the Classic contact edge receives a narrow deterministic luminance matte, and neither handset is regenerated or reshaped.
- [x] **B09** Export the three Classic gallery WebPs at 2000x1600 plus the approved 800x640 patriotic front-selector WebP, preserving 5:4.
  - Proof: `ip-classic-phone-front.webp` is a valid 800x640 WebP under 100 KB and retains the real Classic handset.
- [x] **B10** Export the three Rugged gallery WebPs at 2000x1600 plus the approved 800x640 patriotic front-selector WebP, preserving 5:4.
  - Proof: `ip-rugged-phone-front.webp` is a valid 800x640 WebP under 100 KB and retains the real Rugged handset.
- [x] **B11** Convert both supplied spin videos to 1920x1080 H.264, 8-bit, fast-start MP4, with their silent audio tracks removed.
  - Publish gate: technical derivatives are built but blocked from storefront references until manufacturer-mark review is approved.
- [x] **B12** Generate a 1600x900 WebP poster for each spin video.
  - Publish gate: posters follow the same block as their spin videos.
- [x] **B13** Write and verify production-media manifests containing source hash, output hash, dimensions, codec, intended slot, and publish status.

## Phase C: Hero repair

- [x] **C01** Add distinct desktop and mobile hero sources without changing the canonical master.
- [x] **C02** Keep the hero copy below the video as requested by the client.
- [x] **C03** Replace the 54rem crop-prone implementation with a wider responsive stage.
  - Desktop acceptance: the stage uses the available content width without returning to the original full-screen treatment.
  - Mobile acceptance: the full 9:16 video is visible without clipping.
- [x] **C04** Remove `object-fit: cover` from the foreground portrait presentation.
- [x] **C05** Move the sound button inside `.ip-hero__media`.
- [x] **C06** Position the sound button at a consistent top-right inset on all breakpoints.
  - Acceptance: at least 12px from both frame edges and a minimum 44x44px hit target.
- [x] **C07** Change the accessible action label to `Play with sound`.
- [x] **C08** On first activation, restart from the beginning so the full 30-second message plays, unmute, set volume to 1, disable looping for that play, and call `play()`.
- [x] **C09** Show truthful idle/playing/muted/ended/failed states and do not leave the control saying sound is on after playback ends.
- [x] **C10** Preserve keyboard operation, visible focus, and reduced-motion behavior.
- [x] **C11** Verify the foreground video is not darkened by an overlay or filter.

## Phase D: Client copy and terminology

- [x] **D01** Replace every customer-visible `$303.12` package-savings reference with `$73.12`.
- [x] **D02** Set package savings data attributes/calculations to `7312` cents per year.
- [x] **D03** Verify annual-plan savings remains independently stated as `$13.12`.
- [x] **D04** Remove remaining customer-visible `Patriot Phone` wording except the approved `Patriot Package` name.
- [x] **D05** Use `Classic Phone`, `Rugged Phone`, and `Independence Phone` consistently.
- [x] **D06** Preserve the approved two-line 250th-anniversary announcement with `$73.12` savings.
- [x] **D07** Verify the proof line reads `42 years in business, American owned, Family Focused`.
- [x] **D08** Verify all approved feature and family-use copy from the feedback matrix.
- [x] **D09** Verify the header uses the approved Independence Phone logo/lockup at a readable size.
  - Proof for D01-D09: goal-coverage audit passes 1,143 assertions; forbidden visible-string searches return no `$303.12`, `30312`, or `Patriot Phone` in storefront surfaces; multi-viewport preview passes.

## Phase E: Product media and guided ordering

- [x] **E01** Use the complete supplied Classic and Rugged front handsets on matching American-flag backgrounds in the phone selector.
  - Proof: the selector uses `ip-classic-phone-front.webp` and `ip-rugged-phone-front.webp`, built from the named client originals with the explicitly approved Yealink marks intact.
  - Acceptance: both handsets are fully visible, the two products are distinct, the approved Yealink marks remain faithful, and neither image contains stale product copy.
- [x] **E02** Remove the byte-identical Classic/Rugged fallback defect.
- [x] **E03** Render selector images without CSS polygon crops or transforms and reject source images whose composition already cuts off the handset.
  - Proof: each 800x640 front composite contains the complete handset and baked patriotic treatment; CSS fills the matching 5:4 frame with no clipping or scaling workaround.
- [x] **E04** Keep the existing Buttons, Charger, and Back product-gallery assignment unchanged; use the approved Front composites only in the QA order selector and preview cart until a separate product-global media change is approved.
- [x] **E05** Keep the order sequence: Patriot Package, Choose Phone, Choose Plan, Choose Add-ons.
- [x] **E06** Route customer-facing Order Now links to `/pages/order-now`, then redirect a successful `Add setup to cart` action to the actual `/cart` page.
  - Proof: goal coverage, Playwright, and both reversible remote QA flows confirm successful setup validation navigates to canonical `/cart`; failed and partial adds stay on the builder.
- [x] **E07** Keep selected cards visibly highlighted with accessible selected-state semantics.
- [x] **E08** Label phone charges as one-time charges and service/add-ons with their actual billing cadence.
- [x] **E09** Add the optional referral-code/referring-customer field and preserve it as cart property `Referral`.
- [x] **E10** Verify the setup preserves phone, plan, add-ons, package savings, and referral while policy acceptance is captured once as the final cart/order consent state.
  - Proof: the builder contains legal links but zero acceptance checkboxes; cart contains exactly one required cart-attribute checkbox; order-export tests read REST `note_attributes` and GraphQL `customAttributes` with legacy line-property fallback only.
- [x] **E11** Audit the eight required billing products without changing them.
  - Proof: `tmp/shopify-live-proof/storefront-objects-audit.json` records all eight as ACTIVE with the required handles, titles, prices, `billing-item` template, and non-shipping variants.
- [x] **E12** Publish exactly the eight existing billing products to the Online Store channel.
  - Proof: Shopify Admin changed each from zero channels to one channel on 2026-07-14; no phone product, page, collection, or theme was rewritten by this action.
- [x] **E13** Reload the unpublished QA Order Now page and verify all eight billing variant IDs resolve.
  - Proof: the rendered QA form contains eight nonblank `data-billing-variant` values; the eight former 404 routes now resolve.
- [x] **E14** Perform a reversible real-cart proof for the Patriot Package.
  - Proof: the QA cart added Classic Phone `$100` plus Patriot Package `$150`, displayed `$250`, and preserved `$73.12`, referral `QA-REFERRAL-73`, and policy agreement. The two temporary lines were removed and the pre-existing one-item cart was restored.
- [x] **E15** Perform a reversible real-cart proof for a standard phone/service/add-on setup.
  - Proof: the QA cart added Classic Phone `$100`, Monthly Service `$17.76`, and Call Recording `$5`, preserving `QA-MONTHLY-73` and policy agreement. All three temporary lines were removed and the pre-existing one-item cart was restored.
- [x] **E16** Fail closed when a selected phone or billing product variant is unavailable.
  - Proof: `ip-cart.js` blocks submission with an explicit configuration error instead of silently adding a phone-only or partially priced setup; overlay validation covers the guard.
- [x] **E17** Keep published billing products out of the public discovery flow.
  - Proof: they retain `hidden-from-catalog`, search excludes that tag, `/collections/all` uses the explicit two-phone comparison template, billing-item pages expose no purchase form, and global noindex remains active.
- [ ] **E18** Configure and test the recurring-billing authority.
  - Blocker: the current Shopify cart lines are one-time charges even though the UI describes monthly/yearly cadence. Andrew/client must choose approved Shopify selling plans/subscriptions or provide the production Rev.io middleware URL and credentials. Until then, do not describe checkout as automatic recurring billing.
- Proof for E01-E17: media verification, read-only Admin audit, two reversible remote cart flows, fail-closed guard, and exact-viewport preview tests pass.

## Phase F: FAQ, legal, contact, and notifications

- [x] **F01** Replace unfinished FAQ referral language with approved operational instructions.
- [x] **F02** Ensure the standalone FAQ covers install, use, referral, and troubleshooting without customer-visible `Patriot Phone` terminology.
- [x] **F03** Replace the 404 Terms destination with populated terms content.
  - Proof: on 2026-07-14, Shopify's Terms of Service policy was populated from the company-published `https://independencephone.com/terms/` source (source modified 2026-06-02) and the Admin confirmed `Store policy saved`.
- [x] **F04** Replace the generic `jordan-mark-premier` privacy text with approved Independence Phone/PCI-specific content.
  - Proof: on 2026-07-14, Shopify's automated generic policy was disabled and replaced with the PCI/Independence Phone policy from `https://independencephone.com/privacy/` (source modified 2026-06-02); the Admin confirmed `Store policy saved`.
- [x] **F05** Verify Privacy and Terms links from footer, order page, and cart.
  - Proof: all canonical links are present in exact-viewport tests and the remote QA route audit; both policy destinations are now populated and verified by H25-H26.
- [ ] **F06** Verify the native contact form is addressed to the intended support recipient in Shopify Admin.
  - Partial proof: Shopify Sender email is `jordan@premiercompanies.com`, but its status is `Unverified`. Sending a verification email requires explicit approval.
- [x] **F07** Configure order notifications for Mark and Jordan without removing Andrew's administrative access.
  - Proof: staff recipients now include Andrew Ansley, Jordan Grindell (`jordan@premiercompanies.com`), and `mark@premiercompanies.com`, all for all orders.
- [ ] **F08** Obtain approval, then submit one labeled contact-form test and record delivery proof.
- [ ] **F09** Obtain approval, then place an approved test order or Shopify test-mode order and record notification/cart-property proof.
- [x] **F10** Add global `noindex,nofollow` to the normal storefront and password layouts.
  - Proof: both local layout files contain the robots meta directive; remote proof follows H02.

## Phase G: Local validation

- [x] **G01** Run `npm run verify:local` and record the result.
  - Proof: full command completed with exit code 0 on 2026-07-14.
- [x] **G02** Run `shopify theme check --path independence-phone-theme` and record the result.
  - Proof: 64 files inspected with zero offenses.
- [x] **G03** Run the repository's goal-coverage and refresh-overlay checks.
  - Proof: goal coverage passed 1,143 assertions; refresh overlay smoke test passed.
- [x] **G04** Search for forbidden visible strings and old savings values.
  - Proof: storefront search returns no `$303.12`, `30312`, or customer-visible `Patriot Phone`; `$13.12` and `1312` remain present for annual-plan savings.
- [x] **G05** Verify all production media hashes, dimensions, codecs, and formats.
  - Proof: `npm run media:verify` passes source, build, theme-copy, retouch-quarantine, dimension, codec, and storefront-reference checks.
- [x] **G06** Review the final Git diff against this spec and confirm no secret or unrelated file entered the branch.
  - Proof: `git diff --check` passes; the generic Shopify secret scan passes; the ignored token/tmp path scan passes; every changed path is scoped to the theme, media, QA, tests, setup, and handoff documentation.

## Phase H: Unpublished-theme deployment and QA

- [x] **H01** Reconfirm QA theme `151228809285` is `unpublished` immediately before the final push.
- [x] **H02** Push the reviewed file allowlist to QA theme `151228809285` with `--nodelete`; do not perform a whole-theme push.
- [x] **H03** Reconfirm QA theme `151228809285` remains `unpublished` immediately after the push.
- [x] **H04** Reconfirm theme `150479208517` remains `live` after the QA-only push.
  - Proof for H01-H04: `scripts/push-client-qa-theme.sh` performed both role gates, uploaded the fixed allowlist with `--nodelete` and repeated `--only`, and completed with `QA remains unpublished and live theme remains live`.
- [x] **H05** Verify the final local build at exactly 1440x900.
- [x] **H06** Verify the final remote QA home at approximately 2300x1200.
  - Proof: remote viewport was 2300x1200; hero media was 1248x702, centered, uncropped, and 16:9 with the 54px sound control inset 16px inside the frame.
- [x] **H07** Verify the final local build at exactly 768x1024.
- [x] **H08** Verify the final local build at exactly 390x844.
- [x] **H09** Verify the final local build at exactly 430x932.
  - Proof for H05-H09: the exact-viewport Playwright reports record matching `viewportWidth`/`viewportHeight`, zero overflow, zero broken images, and home CLS 0.
- [x] **H10** Verify the hero foreground preserves the full portrait action without `object-fit: cover` cropping.
- [x] **H11** Verify the hero foreground has no darkness overlay or filter.
- [x] **H12** Verify the sound control is inside the video frame with a minimum 44x44px target.
- [x] **H13** Verify first sound activation restarts at zero, unmutes, sets volume to 1, disables loop, and plays.
- [x] **H14** Verify muted, playing, paused, ended, replay, and failed labels/states are truthful.
- [x] **H15** Verify keyboard focus styling and reduced-motion behavior.
  - Proof: keyboard traversal returns a 3px visible focus outline to the sound button; the dedicated reduced-motion test pauses passive autoplay and permits explicit sound playback.
- [x] **H16** Verify Classic and Rugged selector images are distinct, complete, flag-backed, correctly labeled, faithfully branded, and visually balanced at desktop and mobile sizes.
  - Proof: the exact-viewport suite verifies 800x640 front WebPs, matching baked flag treatments, approved labels, no crop/transform, selected borders, and zero overlap/overflow; final remote QA screenshots are captured after deployment.
- [x] **H17** Verify all visible Order Now links resolve to `/pages/order-now` on the final QA push.
  - Proof: remote Home returned three `/pages/order-now` links; Order, FAQ, Contact, Cart, and all billing-item routes returned the same destination.
- [x] **H18** Verify phone, plan, package, bundle, and add-on selected states update accessibly.
- [x] **H19** Verify `$73.12`, `$13.12`, and `$10/mo` savings displays update correctly.
- [x] **H20** Verify Privacy and Terms links are present in the order/cart forms.
- [x] **H21** Verify the Patriot Package adds the correct priced lines, redirects to `/cart`, and renders as one customer-facing setup group totaling `$250`.
  - Proof: remote QA added Classic Phone plus the internal package line, redirected to `/cart`, rendered one `$250.00` setup with `Patriot Package` nested as `Included in setup total`, preserved referral `QA-PHASE-J-PACKAGE`, and displayed `$73.12/yr` savings.
- [x] **H22** Verify a standard setup adds the correct phone, service, and add-on billing lines, redirects to `/cart`, and renders them as one customer-facing setup group.
  - Proof: remote QA added Rugged Phone `$150`, Annual Service `$200`, and Call Recording `$5`, redirected to `/cart`, rendered one `$355.00` setup with one image/quantity/Remove, preserved referral `QA-PHASE-J-STANDARD`, and displayed `$13.12/yr` savings.
- [x] **H23** Verify the FAQ route renders approved install/use/referral/troubleshooting content.
- [x] **H24** Verify the Contact route renders the native Shopify form without CRM-only hidden fields.
  - Proof: the remote FAQ begins with the approved support heading; the remote Contact page has a native `/contact` form with zero `crm[...]` inputs.
- [x] **H25** Verify the Privacy route is populated with approved Independence Phone policy content.
  - Proof: `/policies/privacy-policy` renders `Privacy policy – Independence Phone`, begins with `This Privacy Policy describes how PCI, Inc.`, contains 8,306 visible characters, emits `noindex,nofollow`, and has zero horizontal overflow.
- [x] **H26** Verify the Terms route is populated and no longer returns 404.
  - Proof: `/policies/terms-of-service` renders `Terms of service – Independence Phone`, contains 66,279 visible characters through the Refund/Return policy, emits `noindex,nofollow`, and has zero horizontal overflow.
- [x] **H27** Verify the account route opens the intended Shopify customer-account flow.
  - Proof: `/account` redirects to Shopify's customer sign-in/create-account page with email and Shop options.
- [x] **H28** Verify the cart route renders and preserves an existing customer cart during reversible QA.
- [x] **H29** Verify no new console errors occur on Home, Order Now, FAQ, Contact, and Cart.
  - Proof: remote console log contains only Shopify preview-bar debug/info and hot-reload-disabled info; no warning/error entries.
- [x] **H30** Verify no horizontal overflow occurs at the five exact acceptance viewports.
- [x] **H31** Verify no visible image is broken on the five exact acceptance viewports.
- [x] **H32** Verify no material layout shift occurs after hero/media load.
  - Proof for H30-H32: 25 exact-viewport/route reports contain zero overflowing elements and zero broken visible images; all five home reports record CLS 0.
- [x] **H33** Capture and correctly name final desktop evidence.
  - Proof: `visual-preview/screenshots/desktop-1440x900-home.png` and `tmp/qa-final-wide-2300x1200.jpg`.
- [x] **H34** Capture and correctly name final tablet evidence.
  - Proof: `visual-preview/screenshots/tablet-768x1024-home.png`.
- [x] **H35** Capture and correctly name final mobile evidence.
  - Proof: `visual-preview/screenshots/mobile-390x844-home.png` and `visual-preview/screenshots/mobile-430x932-home.png`.
- [x] **H36** Record the password-protected preview URL.
  - Proof: `https://jordan-mark-premier.myshopify.com?preview_theme_id=151228809285`.

## Phase I: Approval, publish, and rollback

- [x] **I01** Send the unpublished preview and concise change log to Andrew for review.
  - Proof: the preview URL is recorded under H36 and left open as the browser deliverable for this handoff.
- [ ] **I02** Record client approval or requested revisions against action IDs.
- [ ] **I03** Apply and re-verify approved revisions on the unpublished QA theme.
- [ ] **I04** Obtain explicit approval to publish.
- [ ] **I05** Publish the QA theme once.
- [ ] **I06** Confirm the former live theme remains available as the rollback theme.
- [x] **I07** Verify Jordan and Andrew retain the intended admin/developer access.
  - Proof: Andrew Ansley is active Organization owner + Store owner; Jordan Grindell is active Store administrator.
- [x] **I08** Deliver the final theme ID, rollback theme ID, access notes, media manifest, and maintenance instructions.
  - Proof: this spec, `GO_LIVE_RUNBOOK.md`, `independence-phone-theme/SHOPIFY_HANDOFF.md`, the `brief-materials/assets/indy-content/manifests` directory, and the regenerated theme ZIP form the handoff package.

## Phase J: Canonical purchase-flow correction

Phase J is atomic. Execute in order and do not mark an action complete without its named proof.

### J1. Freeze the intended route and content model

- [x] **J01** Record the canonical journey as Homepage -> `/pages/order-now` -> `/cart` -> checkout.
  - Proof: `Current canonical direction` in this document.
- [x] **J02** Record that standalone product-detail pages are optional support routes, not required purchase steps.
- [x] **J03** Record that the supplied spin MP4s and rich product galleries are outside the primary builder scope and remain subject to their existing Yealink-logo publish gate.
  - Proof for J01-J03: `Current canonical direction` defines the route boundary; the INDY media manifests retain the spin/gallery publish gates without referencing them from the builder.
- [x] **J04** Search every customer-facing Order Now CTA and confirm it resolves to `/pages/order-now`.
- [x] **J05** Confirm no primary-flow CTA requires visiting `/products/standard-phone` or `/products/rugged-phone`.
  - Proof for J04-J05: goal-coverage audit passed 1,301 assertions; remote QA builder/footer and route checks expose `/pages/order-now` as the purchase CTA, with product routes remaining optional support links only.

### J2. Repair the phone selector

- [x] **J06** Replace the close-cropped Buttons selector assets with a complete Classic handset and complete Rugged handset on matching American-flag backgrounds.
  - Do not generate product geometry that differs from the supplied phones.
  - Preserve the visible Yealink marks exactly as approved on 2026-07-15.
  - Do not use the old Rugged artwork containing `Patriot Phone` or `Rugged Edition` marketing copy.
- [x] **J07** Preserve the approved customer-facing labels exactly: `Classic Phone` and `Rugged Phone`.
- [x] **J08** Present Classic phone facts only as: Wi-Fi, Bluetooth, encrypted data transmission and storage, and 9-hour talk time.
- [x] **J09** Present the same Rugged facts plus waterproof and drop proof.
- [x] **J10** Present `$100 one-time` for Classic and `$150 one-time` for Rugged.
- [x] **J11** Build a compact desktop card composition with selection control, complete phone image, and short copy in one deliberate row.
  - Acceptance: the radio control aligns with the card title, not the vertical center of the entire copy block.
  - Acceptance: the image is smaller than a product-page hero but large enough to identify the full handset.
- [x] **J12** Build the mobile card composition without clipped images, overlapping copy, or horizontal overflow.
- [x] **J13** Keep the entire card/image clickable and expose a visible selected border plus native checked semantics.
- [x] **J14** Verify selection changes update the order summary, variant ID, price, and accessible checked state.
  - Proof for J06-J14: `ip-order-builder.liquid`, `page.liquid`, and `ip-theme.css` use the approved Front composites and compact responsive card system; 1440/900/768/430/390 tests confirm layout, copy, imagery, click target, checked state, summary, price, and variant updates.

### J3. Complete the builder-to-cart transition

- [x] **J15** Preserve the grouped multi-line `/cart/add.js` payload for the phone and selected billing variants.
- [x] **J16** After the add request succeeds and the returned cart is valid, navigate to Shopify's canonical `/cart` route.
- [x] **J17** Do not redirect after a failed or partial add; show an actionable builder error instead.
- [x] **J18** Keep the submit control disabled while the add is in flight so a double-click cannot duplicate the setup.
- [x] **J19** Verify the Patriot Package, monthly/annual plan, bundle, individual add-ons, savings, and referral selections survive the redirect.
  - Proof for J15-J19: `ip-cart.js` builds and validates one-to-one `_setup_id` payloads, retries partial cleanup twice, discloses cleanup failure, disables all form controls in flight, and redirects only after complete validation; the 22-test suite covers monthly, annual, bundle, individual add-on, Patriot Package, savings, referral, 422, cleanup success, and cleanup failure; two remote QA flows passed.

### J4. Render one customer-facing setup in cart

- [x] **J20** Retain separate hidden billing-product lines internally so Shopify totals and Rev.io reconciliation remain correct.
- [x] **J21** Group cart lines by `_setup_id` before presentation.
- [x] **J22** Render the phone parent first as the setup header, regardless of Shopify's raw cart-line order.
- [x] **J23** Render the phone's Shopify image once; do not create or reserve image boxes for service, package, or add-on billing lines.
- [x] **J24** Render the selected service/package/add-ons as nested name-and-price rows inside the phone setup card.
- [x] **J25** Suppress empty property containers when a line contains only private underscore-prefixed setup metadata.
- [x] **J26** Do not expose standalone quantity or Remove controls for billing-child lines.
- [x] **J27** Keep one setup-level quantity control and one setup-level Remove action; update/remove every line sharing the setup ID together.
- [x] **J28** Preserve Shopify cart subtotal and savings calculations from the underlying priced lines.
- [x] **J29** Preserve the existing cart badge behavior that counts customer setups rather than hidden billing children.
- [x] **J30** Verify the customer never sees the internal Patriot Package balancing SKU as a separate piece of merchandise.
  - Proof for J20-J30: `sections/cart.liquid` groups child-first raw lines, nests billing rows, renders one parent image/action set, handles orphans fail-closed, and labels package balancing as `Included in setup total`; `ip-cart.js` synchronizes group quantity/removal, calculates quantity-aware savings, and corrects native Refresh counts without stale-response races; local child-first and remote standard/package carts passed.

### J5. Consolidate legal consent

- [x] **J31** Remove the required policy checkbox from the guided builder.
- [x] **J32** Keep visible Privacy Policy and Terms and Conditions links on the builder/footer without presenting a second acceptance action.
- [x] **J33** Stop saving `Policy agreement` as a visible phone line-item property.
- [x] **J34** Keep one required policy checkbox in the actual cart immediately before Checkout.
- [x] **J35** Save the single acceptance as the cart/order consent state used by the native checkout or Rev.io handoff.
- [x] **J36** Allow Update and other non-checkout cart actions without forcing policy acceptance.
- [x] **J37** Block Checkout until the single checkbox is accepted and show a clear inline error.
- [x] **J38** Verify the cart does not print `Policy agreement` inside the phone's product properties.
  - Proof for J31-J38: builder/product surfaces contain legal links and no policy inputs; cart renders one required checkbox plus an empty reset input, Update uses `formnovalidate`, Checkout validates inline, Rev.io persists the cart attribute first, and exporter tests normalize order-level consent; remote QA reported zero builder acceptance checkboxes and exactly one checked required cart checkbox.

### J6. Local verification and QA deployment

- [x] **J39** Add regression coverage for successful add -> `/cart` navigation.
- [x] **J40** Add regression coverage for failed add -> builder error with no navigation.
- [x] **J41** Add regression coverage for complete phone imagery and selected-card layout at 1440, 768, 430, and 390 CSS pixels.
- [x] **J42** Add regression coverage proving billing children have no media shell, empty property shell, standalone quantity control, or standalone Remove action.
- [x] **J43** Add regression coverage proving one—and only one—required purchase-flow policy checkbox exists.
- [x] **J44** Add regression coverage proving Update works before consent and Checkout requires consent.
  - Proof for J39-J44: `visual-preview/preview.spec.js` contains 22 passing Chromium tests, including grouped success, Patriot Package, 422, partial cleanup, dual cleanup failure, child-first grouping, consent ownership/gating, four selector viewports, missing Refresh badge creation, 100-plus accessibility, no-JS Remove hiding, custom mutation race, and native icon-replacement race.
- [x] **J45** Run `npm run verify:local`, Shopify Theme Check, goal coverage, and `git diff --check`.
  - Proof: final `npm run verify:local` exited 0; goal coverage passed 1,301 assertions; Shopify Theme Check inspected 64 files with zero offenses; Playwright passed 22/22; refresh-overlay parity, media verification, order proofs, and `git diff --check` passed.
- [x] **J46** Perform reversible QA cart tests for one standard setup and one Patriot Package setup; restore the pre-test cart afterward.
  - Proof: remote QA standard flow rendered Rugged + Annual + Call Recording as one `$355.00` setup; package flow rendered one `$250.00` setup with `$73.12/yr`; both temporary groups were removed. Final cart proof matched the original setup ID `1df9c31a-4e33-45e4-9ef6-e2f8fb5a04f7`, one setup, badge `1`, subtotal `$127.76`, one checked cart consent, and zero `QA-PHASE-J-` references.
- [x] **J47** Capture builder and cart screenshots at desktop, tablet, and mobile acceptance sizes.
  - Proof: `tmp/qa-phasej/qa-order-builder-1440x900.png`, `tmp/qa-phasej/qa-cart-standard-1440x900.png`, `tmp/qa-phasej/qa-order-builder-768x1024.png`, `tmp/qa-phasej/qa-cart-restored-768x1024.png`, `tmp/qa-phasej/qa-order-builder-390x844.png`, and `tmp/qa-phasej/qa-cart-restored-390x844.png`.
- [x] **J48** Reconfirm QA theme `151228809285` is unpublished immediately before deployment.
- [x] **J49** Push only the reviewed Phase J allowlist to QA theme `151228809285` with `--nodelete`.
- [x] **J50** Reconfirm QA remains unpublished and live theme `150479208517` remains untouched.
  - Proof for J48-J50: `scripts/push-client-qa-theme.sh` enforced both preflight roles, ran strict allowlisted repeated `--only` uploads with `--nodelete`, and postflight `shopify theme info --json` confirmed QA `151228809285` is `unpublished` while theme `150479208517` remains `live`.
- [x] **J51** Record proof paths, commands, theme IDs, and observed results beside every completed Phase J item.
  - Proof: the Phase J subsection proof entries above are the canonical ledger; the unpublished builder is left open at `https://jordan-mark-premier.myshopify.com/pages/order-now?preview_theme_id=151228809285` for review.

## Phase K: Responsive balance and one-setup-card refinement

Phase K preserves the approved purchase model. The cart remains one customer-facing phone setup card with one phone image; service, package, and add-on billing lines remain text rows inside that setup and do not receive product-image placeholders.

- [x] **K01** Fix the phone-choice control/media/copy tracks so the selection control cannot consume unused width and starve the approved specs.
  - Acceptance: the control uses a fixed 20px visual track, phone media stays at or below 30% of its card, and copy retains at least 38%.
- [x] **K02** Keep phone choices two-up where there is enough room, stack the two cards below 870px, and retain a compact horizontal thumbnail/copy row on phones.
- [x] **K03** Keep the American-flag treatment on the phone media only, cap selector thumbnails at 112px, and remove the redundant flag wash from the complete option card.
- [x] **K04** Recompose the mobile cart setup as a phone-image/title top row followed by full-width referral, service, add-on, quantity, and Remove rows inside the same card.
  - Acceptance: at 390px the setup body and billing rows use at least 84% of the complete card width; no empty image gutter continues beside the billing rows.
- [x] **K05** Render grouped cart children in deterministic customer order: service, bundle, individual add-ons, then package balancing line.
- [x] **K06** Refine hierarchy and interaction balance: stronger numbered step legends, approximately 69/31 desktop cart-to-summary proportion, a quieter setup total, flattened nested metadata/consent surfaces, whole-card keyboard focus, and 44px minimum action targets.
- [x] **K06A** Keep the announcement to exactly two visible rows on compact screens instead of allowing the long desktop copy to wrap into a tall block.
  - Acceptance: at 1100px and below, render the editable compact two-line message with no wrapping and a banner height no greater than 44px; above 1100px retain the full approved two-line wording.
- [x] **K07** Add geometry regressions at 1440, 900, 768, 430, and 390 CSS pixels for selector arrangement, media/copy ratios, one-card cart composition, service-first ordering, overflow, and touch targets.
  - Local proof: Playwright passes 28/28 tests, including the new 900px transition viewport and one-setup-card breakpoint tests.
- [x] **K08** Run the complete local verification suite, Shopify Theme Check, goal coverage, overlay parity, and `git diff --check` after the responsive refinement.
  - Proof: `npm run verify:local` exited 0 after the core refinement; after the announcement fallback was added, every affected gate was rerun separately and passed. Goal coverage passed 1,301/1,301; Theme Check inspected 64 files with zero offenses; overlay parity and media verification passed; Playwright passed 28/28; `git diff --check` passed.
- [x] **K09** Reconfirm QA theme `151228809285` is unpublished, deploy only the guarded allowlist with `--nodelete`, and reconfirm live theme `150479208517` remains untouched.
  - Proof: `scripts/push-client-qa-theme.sh` completed its preflight checks, pushed the reviewed allowlist to `Independence Phone QA 2026-07-14` (`151228809285`), and completed postflight with QA still unpublished and `150479208517` still live.
- [x] **K10** Verify the real QA builder and restored one-setup cart at 1440x900, 768x1024, and 390x844; record measured ratios and screenshots.
  - Proof: real-QA announcement heights were 54.38px at 1440 (full approved copy, two rows), 40.38px at 768 (compact copy, two rows), and 35.69px at 390 (compact copy, two rows), with document width equal to viewport width at all three sizes. Desktop builder phone media measured 23% and copy 52.3% of each card; at 390 they measured 27.4% and 53.1%. Desktop cart retained an approximately 69/29 items-to-summary split; the mobile setup body used 90.3% of the card width. Screenshots: `tmp/qa-balance/qa-order-builder-1440x900.png`, `tmp/qa-balance/qa-cart-1440x900.png`, `tmp/qa-balance/qa-order-builder-768x1024.png`, `tmp/qa-balance/qa-cart-768x1024.png`, `tmp/qa-balance/qa-order-builder-390x844.png`, and `tmp/qa-balance/qa-cart-390x844.png`.
- [x] **K11** Confirm responsive QA leaves the existing cart unchanged: one setup, subtotal `$127.76`, one phone image, one consent checkbox, and no temporary QA references.
  - Proof: the real QA cart rendered one `Classic Phone setup`, contained `$127.76`, one phone image, one checked policy agreement, and zero temporary QA references after the deployment and responsive screenshot pass.

## Phase L: Order-builder hierarchy and media correction

Phase L corrects the visual defects identified from the real QA screenshot. Semantic fieldsets remain for accessible choice grouping, but their labels must read as intentional headers rather than browser-notched border text.

- [x] **L01** Remove the background, border, and padding from the package and step fieldsets so native legends cannot cut through a visible border.
- [x] **L02** Render each ordered step as a normal-flow 20px-or-larger header with an intentional numbered marker and at least 10px separation from its choices.
- [x] **L03** Move `Limited offer` inside the Patriot Package card as a readable badge while retaining a locally defined screen-reader-only legend.
- [x] **L04** Increase phone price/specification copy to at least 15px and keep phone titles at least 19px across target viewports.
- [x] **L05** Stretch each phone media panel and its copy across the same grid row, remove the 7rem media cap, and keep their top and bottom edges within 2px.
- [x] **L06** Make the phone grid stack automatically when two readable cards no longer fit, while retaining a two-up desktop composition and no horizontal overflow.
- [x] **L07** Add regressions at 1440, 900, 768, 430, and 390 CSS pixels for borderless fieldsets, header hierarchy, offer-badge inset, readable type, media/copy height parity, source-image integrity, selection, focus, and containment.
  - Local proof: the focused five-viewport order-builder suite passes 5/5 after replacing the former compression-oriented media and card-height assertions.
- [x] **L08** Run the complete local verification suite and Shopify Theme Check after the visual correction.
  - Proof: goal coverage passed 1,301/1,301; refresh-overlay parity and media verification passed; Shopify Theme Check inspected 64 files with zero offenses; Playwright's final run status passed all 28 tests; `git diff --check` passed.
- [x] **L09** Push only the guarded reviewed allowlist to unpublished QA theme `151228809285`; reconfirm live theme `150479208517` remains untouched.
  - Proof: `./scripts/push-client-qa-theme.sh` completed its preflight, allowlisted upload, and postflight checks against unpublished theme `151228809285`; live theme `150479208517` remained published and untouched.
- [x] **L10** Verify and capture the real QA order builder at 1440x900 and 390x844, including measured header/type/media geometry.
  - Desktop proof: `tmp/qa-phase-l/qa-order-builder-1440x900.png`; 23.04px/850 step headings, 13.59px heading-to-options gap, zero fieldset border, 15.2px detail copy, and 1.000 media-to-copy height ratios with zero top/bottom delta for both phone cards.
  - Mobile proof: `tmp/qa-phase-l/qa-order-builder-390x844.png`; 20px/850 step headings, 13.59px heading-to-options gap, zero fieldset border, 15.2px detail copy, 19.2px phone titles, 1.000 media-to-copy height ratios, and no horizontal overflow at 390px.

## Phase M: Faithful front-photo selector correction

Phase M uses the client-supplied `Non-Rugged - Front.jpg` and `Rugged - Front.jpg` as the only handset sources. The approved Yealink marks remain authentic. Background removal and patriotic compositing must not redraw, reshape, crop, or invent handset geometry.

- [x] **M01** Create faithful Classic and Rugged selector composites from the supplied front photographs, removing the blue studio background and pedestal while preserving the complete phones and visible Yealink marks.
  - Proof: `scripts/build-indy-front-card-media.py` uses local BiRefNet segmentation and deterministic compositing; final review shows complete authentic handsets on the existing flag treatment.
- [x] **M02** Encode both selector assets as 800x640 WebP files below 100,000 bytes and pin hashes in the media manifests.
  - Proof: Classic is 85,226 bytes with SHA-256 `418201de78aaffdcdb8ef061fa6323e9bbff0459d07feab155d0fb0acb3115a2`; Rugged is 93,730 bytes with SHA-256 `32f487f4a573aefd5aa194ee69496ab5738566d811624f24fafbf7c85831f8a0`.
- [x] **M03** Replace only guided-builder/fallback selector imagery; leave product-global galleries and Shopify product/cart media unchanged.
  - Proof: builder and fallback sections reference the new `*-front.webp` assets; `scripts/assign-product-media.js` and product gallery assignments are unchanged.
- [x] **M04** Verify source integrity, asset budgets, responsive selection cards, and overlay parity locally at 1440, 900, 768, 430, and 390 CSS pixels.
  - Proof: media verification, goal coverage, overlay parity, Theme Check, and the 29-test Chromium preview suite pass; local proof screenshots are `visual-preview/screenshots/desktop-1440x900-order.png` and `visual-preview/screenshots/mobile-390x844-order.png`.
- [x] **M05** Detect the remote theme-role change before upload and isolate this revision in a fresh duplicate of the current live theme.
  - Proof: the guarded push refused theme `151228809285` after it became live. A server-side duplicate created unpublished theme `151266459717`; read-only role checks show `151228809285` live and rollback `150479208517` unpublished.
- [x] **M06** Push the reviewed allowlist only to unpublished QA theme `151266459717`, then reconfirm QA, live, and rollback roles.
  - Proof: `./scripts/push-client-qa-theme.sh` passed Theme Check, uploaded only its reviewed `--only` allowlist with `--nodelete`, and completed its postflight with QA `151266459717` unpublished, current theme `151228809285` live, and rollback `150479208517` unpublished.
- [x] **M07** Verify the real QA builder at desktop and mobile sizes, including exact source files, 800x640 natural dimensions, complete-handset rendering, card containment, and selection behavior.
  - Proof: at 1440x900 and 390x844, both image URLs resolve to `ip-classic-phone-front.webp` / `ip-rugged-phone-front.webp`, report 800x640 natural dimensions, load completely, use `object-fit: cover`, `clip-path: none`, and `transform: none`, and have zero card overflow. Selecting Rugged changed the checked radio and order-summary heading to `Rugged Phone`; Classic was then restored. Browser diagnostics contained zero warnings or errors.
- [x] **M08** Record final remote screenshot paths, test results, and preview URL; leave the unpublished QA preview open for client review.
  - Proof: remote screenshots are `tmp/qa-front-photos/qa-front-photos-1440x900.png` and `tmp/qa-front-photos/qa-front-photos-mobile-viewport-top.png`; the client-review URL is `https://jordan-mark-premier.myshopify.com/pages/order-now?preview_theme_id=151266459717`.

## Completion definition

This spec is complete only when every applicable checkbox is checked with evidence, all blocked items name the missing approval or external dependency, Phase J has no unresolved purchase-flow defects, the client preview is approved, and the live publish action has been explicitly authorized.
