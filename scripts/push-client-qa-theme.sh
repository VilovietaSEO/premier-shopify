#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
theme_path="$repo_root/independence-phone-theme"
store="jordan-mark-premier.myshopify.com"
qa_theme_id="151553245253"
live_theme_id="151266459717"

files=(
  assets/ip-billing-flag.webp
  assets/ip-cart.js
  assets/ip-classic-phone-back.webp
  assets/ip-classic-phone-buttons.webp
  assets/ip-classic-phone-charger.webp
  assets/ip-classic-phone-front.webp
  assets/ip-classic-phone-spin.mp4
  assets/ip-hero-video-desktop.mp4
  assets/ip-hero-video-poster-mobile.webp
  assets/ip-hero-video-poster.webp
  assets/ip-hero-video.mp4
  assets/ip-rugged-phone-back.webp
  assets/ip-rugged-phone-buttons.webp
  assets/ip-rugged-phone-charger.webp
  assets/ip-rugged-phone-front.webp
  assets/ip-rugged-phone-spin.mp4
  assets/ip-theme.css
  config/settings_schema.json
  layout/password.liquid
  layout/theme.liquid
  sections/cart.liquid
  sections/footer.liquid
  sections/header-group.json
  sections/header.liquid
  sections/ip-add-ons.liquid
  sections/ip-announcement-banner.liquid
  sections/ip-contact-form.liquid
  sections/ip-faq.liquid
  sections/ip-feature-strip.liquid
  sections/ip-order-builder.liquid
  sections/ip-package-band.liquid
  sections/ip-product-comparison.liquid
  sections/ip-product-main.liquid
  sections/ip-service-plans.liquid
  sections/ip-trust-band.liquid
  sections/ip-video-hero.liquid
  sections/page.liquid
  snippets/ip-order-builder-form.liquid
  snippets/ip-product-card-gallery.liquid
  snippets/ip-structured-data.liquid
  snippets/meta-tags.liquid
  templates/collection.phones.json
  templates/gift_card.liquid
  templates/index.json
  templates/page.contact.json
  templates/page.faq.json
  templates/page.order.json
  templates/product.independence-phone.json
)

theme_role() {
  local theme_id="$1"
  shopify theme info \
    --store "$store" \
    --theme "$theme_id" \
    --json \
    --no-color | jq -r '.theme.role'
}

if [[ "$(theme_role "$qa_theme_id")" != "unpublished" ]]; then
  echo "Refusing to push: QA theme $qa_theme_id is not unpublished." >&2
  exit 1
fi

if [[ "$(theme_role "$live_theme_id")" != "live" ]]; then
  echo "Refusing to push: expected current theme $live_theme_id is not live." >&2
  exit 1
fi

push_args=(
  shopify theme push
  --store "$store"
  --theme "$qa_theme_id"
  --path "$theme_path"
  --strict
  --nodelete
)

for file in "${files[@]}"; do
  if [[ ! -f "$theme_path/$file" ]]; then
    echo "Refusing to push: allowlisted file is missing: $file" >&2
    exit 1
  fi
  push_args+=(--only "$file")
done

"${push_args[@]}"

if [[ "$(theme_role "$qa_theme_id")" != "unpublished" ]]; then
  echo "QA theme role changed unexpectedly after push." >&2
  exit 1
fi

if [[ "$(theme_role "$live_theme_id")" != "live" ]]; then
  echo "Current live theme role changed unexpectedly after QA push." >&2
  exit 1
fi

echo "QA-only allowlisted push completed; QA remains unpublished and the current theme remains live."
