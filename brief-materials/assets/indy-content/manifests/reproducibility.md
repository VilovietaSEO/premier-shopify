# INDY media reproducibility record

Canonical originals are external and immutable. `source.sha256` is verified before every build. `scripts/build-indy-media.sh` performs every mechanical conversion and writes `build.sha256`; no production derivative is edited by hand.

The exact local build-tool snapshot is recorded in `toolchain.txt`. Rebuilding with a different encoder or operating-system image may preserve the visual/codec contract without reproducing identical bytes, so compare both the hashes and the declared media properties.

Gallery-image conversion contract:

- Match the source to `/System/Library/ColorSync/Profiles/sRGB Profile.icc` with `sips`.
- Resize to 2000x1600, preserving the original 5:4 relationship.
- Encode WebP with `cwebp -q 82 -m 6 -sharp_yuv -metadata none`.
- The source named `Rugged - Back.jpg` is actually an untagged 5000x4000 RGB PNG. Visual inspection found no Yealink lettering and normal color. The build therefore assigns sRGB as the explicit working-profile assumption before resizing.

Patriotic Front-card contract:

- Use the immutable 5000x4000 `Non-Rugged - Front.jpg` and `Rugged - Front.jpg` originals. Preserve the supplied Yealink lettering and every handset pixel.
- Use rembg with the `birefnet-general` model and CPU execution on the original JPEG RGB values to generate only the handset alpha mask. rembg must not generate or replace RGB handset pixels.
- Keep the Rugged rembg mask unchanged.
- For Classic only, at source rows `3400:3590`, multiply alpha by `clip((170 - grayscale) / 25, 0, 1)`; set alpha to zero at rows `3590:`; then apply `GaussianBlur(0.65)`.
- Compute that Classic grayscale matte from the original JPEG RGB values, before color-profile conversion, because the 170/25 thresholds were tuned against those exact encoded values. Apply the finished mask to a separately Display-P3-to-sRGB-converted copy of the source for compositing.
- Crop to the nonzero alpha bounds, scale each handset to exactly 580 pixels high, place its top at y=30/baseline at y=610, and center it at x=520 on an 800x640 canvas.
- Build the canvas with `ImageOps.fit(..., (800, 640), centering=(0.5, 0.5))` from the existing `ip-bg-flag-subtle.png` source.
- Create the shadow from the full-canvas handset alpha, offset it by +3,+7, apply `GaussianBlur(9)`, and composite navy `(10, 24, 48)` at 20 percent of the blurred alpha before compositing the handset. The full-canvas mask prevents the soft shadow from being clipped at the handset crop.
- Encode an opaque WebP with `cwebp -preset photo -size 95000 -pass 10 -m 6 -sharp_yuv -metadata none -noalpha`.
- Reject any Front output that is not WebP, is not exactly 800x640, or is 100000 bytes or larger.
- Both phones use the same handset height, top, baseline, center, background crop, shadow, and encoding contract.

Spin-video conversion contract:

- Use the first video stream only; remove audio, metadata, and chapters.
- Scale to 1920x1080, square pixels, yuv420p, H.264 High 4.1, CRF 20, slow preset, constant 24000/1001 fps, BT.709, and fast-start metadata.
- Generate a 1600x900 WebP poster from the first encoded frame.
- Spin files and posters remain outside the approved Front-card storefront scope.

Manufacturer-mark decision:

- The client explicitly approved retaining Yealink on the Classic and Rugged Front cards on 2026-07-15.
- Side sources are still blocked because they were not selected for this change, not because the Front approval authorizes additional product-global media.
- The original, output, and theme-copy hashes are recorded in `production-media.tsv`, `build.sha256`, and `theme-assets.sha256`; both Front cards are ready.

Rejected-retouch record:

- The four 1402x1122 `*-logo-free-imagegen-v1.png` candidates failed fidelity review and are quarantined in `rejected/` only.
- Their hashes and rejection state are pinned in `retouch-review.tsv`.
- They are not production masters, are not copied into theme assets, and must not be referenced by Liquid, preview HTML, or the Shopify media assignment plan.
- The rejected files remain historical evidence only. The approved selector path uses the original Front photographs with the real Yealink mark retained; existing Buttons, Charger, and Back gallery media is unchanged.
