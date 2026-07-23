#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="${INDY_CONTENT_SOURCE_DIR:-/Users/vilovieta/Downloads/INDY CONTENT}"
WORKSPACE="$ROOT/brief-materials/assets/indy-content"
MANIFEST="$WORKSPACE/manifests/source.sha256"
IMAGE_OUT="$WORKSPACE/production/images"
VIDEO_OUT="$WORKSPACE/production/videos"
POSTER_OUT="$WORKSPACE/production/posters"
BUILD_MANIFEST="$WORKSPACE/manifests/build.sha256"
SRGB_PROFILE="/System/Library/ColorSync/Profiles/sRGB Profile.icc"
SRGB_PROFILE_SHA256="2b3aa1645779a9e634744faf9b01e9102b0c9b88fd6deced7934df86b949af7e"

PYTHON_BIN="${INDY_MEDIA_PYTHON:-python3}"

for command_name in cwebp ffmpeg ffprobe "$PYTHON_BIN" shasum sips; do
  command -v "$command_name" >/dev/null
done

test -d "$SOURCE_DIR"
test -f "$MANIFEST"
test -f "$SRGB_PROFILE"
test "$(shasum -a 256 "$SRGB_PROFILE" | awk '{print $1}')" = "$SRGB_PROFILE_SHA256"

(
  cd "$SOURCE_DIR"
  shasum -a 256 -c "$MANIFEST"
)

mkdir -p "$IMAGE_OUT" "$VIDEO_OUT" "$POSTER_OUT"

TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/indy-media.XXXXXX")"
trap 'rm -rf "$TEMP_DIR"' EXIT

build_image() {
  local input_name="$1"
  local output_name="$2"
  local normalized="$TEMP_DIR/${output_name%.webp}.png"

  sips \
    --matchTo "$SRGB_PROFILE" \
    --resampleHeightWidth 1600 2000 \
    "$SOURCE_DIR/$input_name" \
    --out "$normalized" >/dev/null

  cwebp \
    -quiet \
    -q 82 \
    -m 6 \
    -sharp_yuv \
    -metadata none \
    "$normalized" \
    -o "$IMAGE_OUT/$output_name"
}

build_spin() {
  local input_name="$1"
  local output_stem="$2"
  local output_video="$VIDEO_OUT/${output_stem}.mp4"
  local output_poster="$POSTER_OUT/${output_stem}-poster.webp"

  ffmpeg -hide_banner -nostdin -loglevel error -y \
    -i "$SOURCE_DIR/$input_name" \
    -map 0:v:0 \
    -an \
    -map_metadata -1 \
    -map_chapters -1 \
    -vf "scale=1920:1080:flags=lanczos,format=yuv420p,setsar=1" \
    -c:v libx264 \
    -preset slow \
    -crf 20 \
    -profile:v high \
    -level:v 4.1 \
    -tag:v avc1 \
    -r 24000/1001 \
    -fps_mode cfr \
    -x264-params "keyint=48:min-keyint=48:scenecut=0:open-gop=0" \
    -color_primaries bt709 \
    -color_trc bt709 \
    -colorspace bt709 \
    -color_range tv \
    -movflags +faststart \
    "$output_video"

  ffmpeg -hide_banner -nostdin -loglevel error -y \
    -ss 0 \
    -i "$output_video" \
    -frames:v 1 \
    -vf "scale=1600:900:flags=lanczos" \
    -c:v libwebp \
    -quality 82 \
    -compression_level 6 \
    "$output_poster"
}

# These six photographs contain no identified Yealink mark and can be built mechanically.
build_image "Non-Rugged - Back.jpg" "ip-classic-phone-back.webp"
build_image "Non-Rugged - Buttons.jpg" "ip-classic-phone-buttons.webp"
build_image "Non-Rugged - Charger.jpg" "ip-classic-phone-charger.webp"
build_image "Rugged - Back.jpg" "ip-rugged-phone-back.webp"
build_image "Rugged - Buttons.jpg" "ip-rugged-phone-buttons.webp"
build_image "Rugged - Charger.jpg" "ip-rugged-phone-charger.webp"

# The client explicitly approved retaining the Yealink mark on the two Front photographs.
# rembg supplies only the handset alpha mask; the Python compositor preserves the real
# handset pixels, applies the reviewed pedestal cleanup, and builds matching patriotic
# 800x640 selector cards with a strict sub-100000-byte WebP contract.
"$PYTHON_BIN" "$ROOT/scripts/build-indy-front-card-media.py" \
  --classic-source "$SOURCE_DIR/Non-Rugged - Front.jpg" \
  --rugged-source "$SOURCE_DIR/Rugged - Front.jpg" \
  --background "$ROOT/independence-phone-theme/assets/ip-bg-flag-subtle.png" \
  --output-dir "$IMAGE_OUT" \
  --cwebp "$(command -v cwebp)" \
  --target-bytes 95000 \
  --max-bytes 100000

# The technical spin derivatives remain outside the approved front-card storefront scope.
build_spin "Non-Rugged Spin.mp4" "ip-classic-phone-spin"
build_spin "Rugged Spin.mp4" "ip-rugged-phone-spin"

(
  cd "$ROOT"
  shasum -a 256 \
    brief-materials/assets/indy-content/production/images/ip-classic-phone-back.webp \
    brief-materials/assets/indy-content/production/images/ip-classic-phone-buttons.webp \
    brief-materials/assets/indy-content/production/images/ip-classic-phone-charger.webp \
    brief-materials/assets/indy-content/production/images/ip-classic-phone-front.webp \
    brief-materials/assets/indy-content/production/images/ip-rugged-phone-back.webp \
    brief-materials/assets/indy-content/production/images/ip-rugged-phone-buttons.webp \
    brief-materials/assets/indy-content/production/images/ip-rugged-phone-charger.webp \
    brief-materials/assets/indy-content/production/images/ip-rugged-phone-front.webp \
    brief-materials/assets/indy-content/production/posters/ip-classic-phone-spin-poster.webp \
    brief-materials/assets/indy-content/production/posters/ip-rugged-phone-spin-poster.webp \
    brief-materials/assets/indy-content/production/videos/ip-classic-phone-spin.mp4 \
    brief-materials/assets/indy-content/production/videos/ip-rugged-phone-spin.mp4 \
    > "$BUILD_MANIFEST"
)

printf '%s\n' "INDY CONTENT derivatives and patriotic front-card media built successfully."
