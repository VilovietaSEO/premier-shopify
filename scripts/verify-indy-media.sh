#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKSPACE="$ROOT/brief-materials/assets/indy-content"
SOURCE_DIR="${INDY_CONTENT_SOURCE_DIR:-/Users/vilovieta/Downloads/INDY CONTENT}"

for command_name in ffprobe rg shasum; do
  command -v "$command_name" >/dev/null
done

cd "$ROOT"

if [ -d "$SOURCE_DIR" ]; then
  (
    cd "$SOURCE_DIR"
    shasum -a 256 -c "$WORKSPACE/manifests/source.sha256" >/dev/null
  )
else
  printf '%s\n' "Source-media hash check skipped: INDY_CONTENT_SOURCE_DIR is unavailable; committed derivatives remain fully verified."
fi

shasum -a 256 -c "$WORKSPACE/manifests/build.sha256" >/dev/null
shasum -a 256 -c "$WORKSPACE/manifests/theme-assets.sha256" >/dev/null

test "$(wc -l < "$WORKSPACE/manifests/source-visual-review.tsv" | tr -d ' ')" = "11"
test "$(rg -c $'\tapproved\t' "$WORKSPACE/manifests/source-visual-review.tsv")" = "8"
test "$(rg -c $'\tblocked\t' "$WORKSPACE/manifests/source-visual-review.tsv")" = "2"

while IFS=$'\t' read -r candidate expected_hash status _reason; do
  if [ "$candidate" = "candidate" ]; then
    continue
  fi
  test "$status" = "rejected"
  if [ -f "$WORKSPACE/$candidate" ]; then
    actual_hash="$(shasum -a 256 "$WORKSPACE/$candidate" | awk '{print $1}')"
    test "$actual_hash" = "$expected_hash"
  fi
done < "$WORKSPACE/manifests/retouch-review.tsv"

for image in "$WORKSPACE"/production/images/*.webp; do
  dimensions="$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$image")"
  codec="$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of csv=p=0 "$image")"
  test "$codec" = "webp"
  test "$(wc -c < "$image" | tr -d ' ')" -lt 100000
  case "$(basename "$image")" in
    ip-classic-phone-front.webp|ip-rugged-phone-front.webp)
      test "$dimensions" = "800x640"
      ;;
    *)
      test "$dimensions" = "2000x1600"
      ;;
  esac
done

for front_asset in ip-classic-phone-front.webp ip-rugged-phone-front.webp; do
  theme_asset="$ROOT/independence-phone-theme/assets/$front_asset"
  test -f "$theme_asset"
  test "$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$theme_asset")" = "1600x1280"
  test "$(wc -c < "$theme_asset" | tr -d ' ')" -lt 100000
done

for spin_asset in ip-classic-phone-spin.mp4 ip-rugged-phone-spin.mp4; do
  theme_asset="$ROOT/independence-phone-theme/assets/$spin_asset"
  test -f "$theme_asset"
  test "$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of csv=p=0 "$theme_asset")" = "h264"
  test "$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$theme_asset")" = "960x540"
  test "$(ffprobe -v error -select_streams v:0 -show_entries stream=pix_fmt -of csv=p=0 "$theme_asset")" = "yuv420p"
  test "$(ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$theme_asset" | wc -l | tr -d ' ')" = "0"
  test "$(wc -c < "$theme_asset" | tr -d ' ')" -lt 3000000
done

billing_theme_asset="$ROOT/independence-phone-theme/assets/ip-billing-flag.webp"
test -f "$billing_theme_asset"
test "$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of csv=p=0 "$billing_theme_asset")" = "webp"
test "$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$billing_theme_asset")" = "576x576"
test "$(wc -c < "$billing_theme_asset" | tr -d ' ')" -lt 100000

for poster in "$WORKSPACE"/production/posters/*.webp; do
  dimensions="$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$poster")"
  test "$dimensions" = "1600x900"
done

for video in "$WORKSPACE"/production/videos/*.mp4; do
  video_streams="$(ffprobe -v error -select_streams v -show_entries stream=index -of csv=p=0 "$video" | wc -l | tr -d ' ')"
  audio_streams="$(ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$video" | wc -l | tr -d ' ')"
  codec="$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of csv=p=0 "$video")"
  dimensions="$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$video")"
  pixel_format="$(ffprobe -v error -select_streams v:0 -show_entries stream=pix_fmt -of csv=p=0 "$video")"
  test "$video_streams" = "1"
  test "$audio_streams" = "0"
  test "$codec" = "h264"
  test "$dimensions" = "1920x1080"
  test "$pixel_format" = "yuv420p"
done

blocked_pattern='ip-(classic|rugged)-phone-side\.webp'
if rg -n "$blocked_pattern" \
  independence-phone-theme/sections \
  independence-phone-theme/snippets \
  visual-preview/index.html \
  scripts/assign-product-media.js; then
  echo "Blocked or rejected media is referenced by storefront code" >&2
  exit 1
fi

assignment_plan="$(node scripts/assign-product-media.js --dry-run)"
for required_asset in \
  ip-classic-phone-front.webp \
  ip-classic-phone-spin.mp4 \
  ip-classic-phone-buttons.webp \
  ip-classic-phone-charger.webp \
  ip-classic-phone-back.webp \
  ip-rugged-phone-front.webp \
  ip-rugged-phone-spin.mp4 \
  ip-rugged-phone-buttons.webp \
  ip-rugged-phone-charger.webp \
  ip-rugged-phone-back.webp \
  ip-billing-flag.webp; do
  rg -q "$required_asset" <<< "$assignment_plan"
done

for phone in classic rugged; do
  front_line="$(rg -n "ip-$phone-phone-front\\.webp" <<< "$assignment_plan" | head -n 1 | cut -d: -f1)"
  spin_line="$(rg -n "ip-$phone-phone-spin\\.mp4" <<< "$assignment_plan" | head -n 1 | cut -d: -f1)"
  buttons_line="$(rg -n "ip-$phone-phone-buttons\\.webp" <<< "$assignment_plan" | head -n 1 | cut -d: -f1)"
  test "$front_line" -lt "$spin_line"
  test "$spin_line" -lt "$buttons_line"
done

printf '%s\n' "INDY media verification passed"
