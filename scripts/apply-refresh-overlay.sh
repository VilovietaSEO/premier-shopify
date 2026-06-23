#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: scripts/apply-refresh-overlay.sh /path/to/pulled-refresh-theme" >&2
  exit 64
fi

target_theme="$1"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
overlay="$repo_root/refresh-overlay"

if [ ! -d "$target_theme" ]; then
  echo "Target theme directory does not exist: $target_theme" >&2
  exit 66
fi

for required_dir in assets sections templates layout; do
  if [ ! -d "$target_theme/$required_dir" ]; then
    echo "Target does not look like a Shopify theme. Missing: $required_dir" >&2
    exit 65
  fi
done

cp -R "$overlay/assets/." "$target_theme/assets/"
cp -R "$overlay/sections/." "$target_theme/sections/"
cp -R "$overlay/templates/." "$target_theme/templates/"

if [ -d "$overlay/snippets" ]; then
  if [ ! -d "$target_theme/snippets" ]; then
    echo "Target does not look like a Shopify theme. Missing: snippets" >&2
    exit 65
  fi
  cp -R "$overlay/snippets/." "$target_theme/snippets/"
fi

theme_layout="$target_theme/layout/theme.liquid"
if ! grep -q "ip-theme.css" "$theme_layout"; then
  perl -0pi -e "s#(\\s*\\{\\{ content_for_header \\}\\})#    {{ 'ip-theme.css' | asset_url | stylesheet_tag }}\\n\\1#" "$theme_layout"
fi

if ! grep -q "ip-cart.js" "$theme_layout"; then
  perl -0pi -e "s#(\\s*\\{\\{ content_for_header \\}\\})#    <script src=\"{{ 'ip-cart.js' | asset_url }}\" defer></script>\\n\\1#" "$theme_layout"
fi

if ! grep -q "ip-product-gallery.js" "$theme_layout"; then
  perl -0pi -e "s#(\\s*\\{\\{ content_for_header \\}\\})#    <script src=\"{{ 'ip-product-gallery.js' | asset_url }}\" defer></script>\\n\\1#" "$theme_layout"
fi

if ! grep -q "ip-structured-data" "$theme_layout"; then
  perl -0pi -e "s#(\\s*\\{\\{ content_for_header \\}\\})#    {% render 'ip-structured-data' %}\\n\\1#" "$theme_layout"
fi

echo "Applied Independence Phone overlay to: $target_theme"
echo "Run from that theme directory next: shopify theme check"
