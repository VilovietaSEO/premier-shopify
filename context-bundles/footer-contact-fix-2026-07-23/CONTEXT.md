# Independence Phone Global Footer Contact Fix

## Objective

Implement the client’s explicit footer request:

> “At the bottom of all pages, please have our phone number and email address.”

Required public contact details:

- Email: `info@independencephone.com`
- Display phone: `(615) 704-1776`
- Public phone target: `tel:+16157041776`
- Public email target: `mailto:info@independencephone.com`

This is a local theme implementation task. Do not push, publish, upload, or change Shopify Admin state.

## Scope

The footer is global, so one section implementation must make the contact details visible on every storefront page that uses the normal footer group.

Primary files:

- `independence-phone-theme/sections/footer.liquid`
- `independence-phone-theme/assets/ip-theme.css`
- `refresh-overlay/sections/footer.liquid`
- `refresh-overlay/assets/ip-theme.css`

Focused tests may also be updated:

- `scripts/audit-goal-coverage.js`
- `scripts/test-refresh-overlay.sh`

Keep the reviewed theme and Refresh overlay copies identical for the footer and stylesheet.

## Existing behavior to preserve

- Brand link, copyright year, and editable footer note
- Footer navigation
- Order Now fallback link behavior
- FAQ and Contact fallback links
- Privacy Policy and Terms and Conditions links without duplicates
- Optional Shopify payment icons
- Red/white/blue top rule
- Current global footer placement

Do not remove or rename existing settings.

## Required implementation

1. Add a semantic contact block to the global footer.
2. Render both contact values as actual links:
   - email uses `mailto:`
   - phone uses `tel:+16157041776`
3. Never use or expose the Nuso administration-portal URL that happened to be attached to the phone number in the client’s message.
4. Make the displayed email and phone merchant-editable in the Theme Editor with the exact requested values as schema defaults.
5. If a separate phone-link value is needed for safe formatting, make it editable with `+16157041776` as its default.
6. Escape merchant-editable values in rendered attributes and text.
7. If an individual contact value is blank, omit that link cleanly.
8. Use semantic, accessible markup such as an `address` element with normal font styling.
9. Use durable class names under the existing footer namespace.

## Layout and design

Desktop:

- Keep a visually balanced two-column footer.
- Keep brand, year, note, and contact information together in the left information column.
- Keep navigation and optional payment icons aligned in the right column.
- Contact details should be clearly readable but should not overpower the navigation or brand.

Mobile:

- Stack cleanly in one column at the existing breakpoint.
- Allow the email and phone to wrap or stack without overflow.
- Maintain comfortable touch targets.
- Preserve the existing footer’s visual rhythm and page margins.

Use the established theme tokens:

- `--ip-ink`
- `--ip-muted`
- `--ip-red`
- `--ip-blue`
- `--ip-paper`

Do not introduce unrelated colors, icons, JavaScript, images, dependencies, or layout systems.

## Acceptance criteria

- `info@independencephone.com` appears in the rendered global footer source.
- `(615) 704-1776` appears in the rendered global footer source.
- Email target is `mailto:info@independencephone.com`.
- Phone target is `tel:+16157041776`.
- Values are editable through footer section settings and have correct defaults.
- Existing footer navigation and policy logic remains intact.
- Empty contact settings do not create empty links.
- Desktop remains balanced.
- Mobile has no horizontal overflow and contact links remain easy to tap.
- Canonical theme and Refresh overlay footer/CSS copies are byte-identical after the change.
- `npm run theme:check` passes.
- `npm run audit:coverage` passes.
- `npm run overlay:test` passes.

## Boundaries

- Do not modify header, homepage, Contact page, cart, checkout, product data, or generated scenario images.
- Do not modify the client’s wording beyond normal public link formatting.
- Do not change Git branches.
- Do not commit, push, upload, or publish.
- Preserve all unrelated dirty-worktree files.
