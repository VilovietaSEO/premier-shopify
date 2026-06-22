# Premier Shopify

Private working repository for building and operating a client Shopify storefront from the CLI while keeping the client-editable Shopify theme builder intact.

## Current Project

Independence Phone fresh-store theme build:

- Theme path: `/Users/vilovieta/Documents/Shopify/independence-phone-theme`
- Refresh overlay path: `/Users/vilovieta/Documents/Shopify/refresh-overlay`
- Refresh overlay script: `/Users/vilovieta/Documents/Shopify/scripts/apply-refresh-overlay.sh`
- Brief/source path: `/Users/vilovieta/Documents/Shopify/brief-materials`
- Handoff checklist: `/Users/vilovieta/Documents/Shopify/independence-phone-theme/SHOPIFY_HANDOFF.md`
- Goal prompt: `/Users/vilovieta/Documents/Shopify/brief-materials/strategy/goal-prompt.md`
- GitHub remote: `https://github.com/VilovietaSEO/premier-shopify`

Local validation currently passes:

```bash
cd /Users/vilovieta/Documents/Shopify/independence-phone-theme
shopify theme check
```

Refresh-base path for the fresh store:

1. Add Shopify `Refresh` to the new store.
2. Pull that Refresh theme locally.
3. Apply `/Users/vilovieta/Documents/Shopify/refresh-overlay` with:

```bash
cd /Users/vilovieta/Documents/Shopify
scripts/apply-refresh-overlay.sh /path/to/pulled-refresh-theme
```

## Operating Model

Build the site as a Shopify Online Store 2.0 theme.

- Codex/developer controls theme code from this repo: Liquid, JSON templates, sections, snippets, assets, CSS, JavaScript, schema, and theme settings.
- Client controls normal content in Shopify: section text, images, products, collections, menus, pages, theme settings, and section order.
- Avoid third-party page builders unless the client explicitly requires one. Native Shopify sections keep the storefront editable without hiding layout data inside an app.
- Treat Shopify admin edits as real source changes. Pull them before overwriting a remote theme.

## Local Requirements

This machine already has the required base tooling:

```bash
node -v
npm -v
shopify version
```

Expected current Shopify CLI version on this machine:

```bash
3.92.1
```

## Access Needed From The Client

Minimum handoff needed so Codex can operate end-to-end:

- Shopify store domain, usually `client-store.myshopify.com`.
- Staff or collaborator access with theme permissions.
- Theme Access password from the Shopify Theme Access app if CLI login is not preferred.
- Brand assets: logo, fonts, color direction, photography, product imagery.
- Product, collection, policy, shipping, tax, and payment requirements.
- App list, if the client already relies on reviews, subscriptions, bundles, loyalty, forms, or email capture apps.

Do not paste permanent secrets into chat or commit them to the repo. Use a local `.env` file or password manager when needed.

## Starting From A New Theme

Use this when the client does not already have a theme that must be preserved.

```bash
shopify theme init
shopify theme dev --store client-store.myshopify.com
```

`shopify theme dev` creates a development theme and prints preview/theme-editor URLs. Changes pushed from this repo update the development theme in real time.

## Starting From An Existing Shopify Theme

Use this when the client already has a store/theme and we need to take control safely.

```bash
shopify theme list --store client-store.myshopify.com
shopify theme pull --store client-store.myshopify.com --theme THEME_ID
shopify theme dev --store client-store.myshopify.com --theme THEME_ID
```

Before making code changes, duplicate the live theme in Shopify or through the CLI:

```bash
shopify theme duplicate --store client-store.myshopify.com --theme LIVE_THEME_ID
```

Work against the duplicate or a development theme until publishing is approved.

## Daily Development Loop

```bash
git pull
shopify theme pull --store client-store.myshopify.com --theme THEME_ID
shopify theme dev --store client-store.myshopify.com --theme THEME_ID
shopify theme check
git status
git add README.md sections snippets templates assets config layout locales
git commit -m "Describe the storefront change"
git push
```

Pull first if the client has edited the theme in Shopify admin. This prevents overwriting their builder changes.

## Deployment

Push to a non-live theme first:

```bash
shopify theme push --store client-store.myshopify.com --theme THEME_ID
```

Publish only after preview approval:

```bash
shopify theme publish --store client-store.myshopify.com --theme THEME_ID
```

Never publish a theme directly from an unreviewed local state.

## GitHub Sync Option

Shopify can connect a theme to a GitHub branch. If enabled, Shopify will update the theme when the branch changes and can commit Shopify admin edits back to GitHub.

Recommended branch model:

- `main`: approved production source.
- `staging`: preview or pre-launch theme.
- `codex/*`: implementation branches for larger work.

If Shopify GitHub sync is enabled, pull before coding and review Shopify-generated commits before pushing over the same branch.

## Theme Architecture Rules

- Prefer reusable sections with clear schema settings.
- Use JSON templates so pages are editable in the Shopify theme editor.
- Put repeated markup in snippets.
- Put client-editable content in section settings, blocks, metafields, or metaobjects.
- Do not hardcode content that the client reasonably expects to edit.
- Keep product/catalog data in Shopify, not in theme files.
- Use metafields/metaobjects for structured content such as badges, specs, FAQs, comparison rows, testimonials, or ingredient/details tables.

## Client Editing Boundary

The client should edit:

- Theme editor section settings.
- Products and variants.
- Collections.
- Navigation menus.
- Pages and blog posts.
- Metaobjects/metafields when configured.

The client should not edit:

- Liquid files.
- Theme JavaScript/CSS.
- JSON templates without coordination.
- App embed settings that affect global storefront behavior without telling us.

## Codex Directives

When operating this repo:

- Verify the active store and theme ID before pushing.
- Pull remote theme changes before editing if Shopify admin changes may have happened.
- Use development or duplicate themes for risky work.
- Run `shopify theme check` before pushing/publishing.
- Keep secrets out of Git.
- Commit only intentional files.
- Preserve client-editable schema instead of baking content into code.
- Publish only after explicit approval.

## Useful Commands

```bash
shopify theme list --store client-store.myshopify.com
shopify theme info --store client-store.myshopify.com --theme THEME_ID
shopify theme dev --store client-store.myshopify.com --theme THEME_ID
shopify theme pull --store client-store.myshopify.com --theme THEME_ID
shopify theme push --store client-store.myshopify.com --theme THEME_ID
shopify theme check
shopify theme open --store client-store.myshopify.com --theme THEME_ID
shopify theme publish --store client-store.myshopify.com --theme THEME_ID
```
