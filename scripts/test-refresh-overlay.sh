#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tmp_theme="$(mktemp -d "${TMPDIR:-/tmp}/ip-refresh-overlay-test.XXXXXX")"

cleanup() {
  rm -rf "$tmp_theme"
}
trap cleanup EXIT

mkdir -p "$tmp_theme/assets" "$tmp_theme/sections" "$tmp_theme/snippets" "$tmp_theme/templates" "$tmp_theme/layout"

cat > "$tmp_theme/layout/theme.liquid" <<'LIQUID'
<!doctype html>
<html>
  <head>
    {{ content_for_header }}
  </head>
  <body>
    {{ content_for_layout }}
  </body>
</html>
LIQUID

"$repo_root/scripts/apply-refresh-overlay.sh" "$tmp_theme" >/dev/null
"$repo_root/scripts/apply-refresh-overlay.sh" "$tmp_theme" >/dev/null

required_files=(
  "assets/ip-theme.css"
	  "assets/ip-hero-video.mp4"
	  "assets/ip-hero-video-poster.jpg"
	  "sections/ip-announcement-banner.liquid"
	  "sections/ip-video-hero.liquid"
  "sections/ip-product-main.liquid"
  "sections/ip-contact-form.liquid"
  "snippets/ip-structured-data.liquid"
  "templates/index.json"
  "templates/collection.phones.json"
  "templates/product.independence-phone.json"
  "templates/page.contact.json"
)

for file in "${required_files[@]}"; do
  if [ ! -f "$tmp_theme/$file" ]; then
    echo "Overlay smoke test missing copied file: $file" >&2
    exit 1
  fi
done

stylesheet_count="$(grep -c "ip-theme.css" "$tmp_theme/layout/theme.liquid" || true)"
if [ "$stylesheet_count" -ne 1 ]; then
  echo "Expected one ip-theme.css include after repeated overlay application, found $stylesheet_count" >&2
  exit 1
fi

structured_data_count="$(grep -c "ip-structured-data" "$tmp_theme/layout/theme.liquid" || true)"
if [ "$structured_data_count" -ne 1 ]; then
  echo "Expected one ip-structured-data render after repeated overlay application, found $structured_data_count" >&2
  exit 1
fi

if ! grep -q "{{ content_for_header }}" "$tmp_theme/layout/theme.liquid"; then
  echo "Overlay smoke test removed content_for_header" >&2
  exit 1
fi

echo "Refresh overlay smoke test passed"
