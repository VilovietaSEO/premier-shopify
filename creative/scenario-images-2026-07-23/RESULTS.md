# Independence Phone Scenario Image Results

Generated with Fal.ai `fal-ai/nano-banana-pro/edit` using `references/classic-phone-canonical-front.jpg` as the sole hardware-identity reference. Both attempts used `resolution: 2K`, `aspect_ratio: 1:1`, `output_format: png`, `num_images: 1`, `limit_generations: true`, and `enable_web_search: false`. No Shopify theme files were edited, uploaded, published, or repointed.

> **Review status:** all four scenes were generated and compressed successfully, but none is marked strict-gate approved because the single targeted retry still left at least one hardware-identity defect. The files in `masters/` and `deliverables/` are best available review candidates, not automatic theme replacements.

## Contact sheets

- [Best WebP candidates](previews/deliverables-contact-sheet.jpg)
- [Initial 2K candidates](previews/initial-contact-sheet.jpg)
- [Targeted retry candidates](previews/retry-contact-sheet.jpg)

## Summary

| Scenario | Fal request IDs | Master | WebP | Strict acceptance |
|---|---|---:|---:|---|
| Bus days | `019f906d-4b30-78c1-a1f5-9adb6cda711c` / `019f9070-3b92-73b3-9bad-f769f83a0255` | 2048x2048, 5,621,463 B | 1200x1200, 63,820 B | **Fail** |
| Home-alone minutes | `019f906d-4b38-7e11-af6f-815ca47e130b` / `019f9070-3b94-75b0-aafb-a651fe7fbc3f` | 2048x2048, 5,859,663 B | 1200x1200, 62,248 B | **Fail** |
| Grandparents | `019f906d-4b3b-7442-bd08-6b02b5e27c41` / `019f9070-3b9c-7890-a8e6-69d03dc52a18` | 2048x2048, 6,159,778 B | 1200x1200, 97,310 B | **Fail** |
| Before the smartphone | `019f906d-4b33-74e2-8499-4d61d016e388` / `019f9070-3b99-70c3-bef4-25709d34054d` | 2048x2048, 6,202,447 B | 1200x1200, 72,518 B | **Fail** |

## Detailed judgments

### Bus days

- Review master: [`masters/bus-days.png`](masters/bus-days.png)
- Website candidate: [`deliverables/bus-days.webp`](deliverables/bus-days.webp)
- Attempt 1 request: `019f906d-4b30-78c1-a1f5-9adb6cda711c` — 74.753 s
- Attempt 2 request: `019f9070-3b92-73b3-9bad-f769f83a0255` — 37.39 s
- Judgment: **Fail — Generated and visually strong as a scene, but not strict-gate approved.**
- Failed gates:
  - Canonical handset fidelity: the upper screen remains oversized and reads closer to a hybrid touchscreen form than the reference handset.
  - No invented lettering: a tiny invented label remains on the lower-left keypad key in the 2K master.
- Passed gates:
  - Exactly 2048x2048
  - Bus-day scenario is clear without embedded copy
  - No Yealink wordmark or manufacturer logo
  - No separate smartphone or competing screen
  - Faces and handset stay above the lower text-safe region
  - No obvious anatomy or duplication artifact
  - Campaign lighting and palette are cohesive

#### Exact initial prompt

```text
Use case: photorealistic-natural. Asset type: square homepage lifestyle card in a cohesive four-image Independence Phone campaign. Create a NEW lifestyle photograph; the provided image is only the hardware-identity reference for the handset, not the scene, composition, studio background, or an edit target. Reproduce exactly one tall, narrow dark gray and black cordless handset with a silver-gray edge, realistic thickness and human scale, a dark screen in the same position and proportions, a circular navigation ring with center button, green call and red end-call buttons, and the same numeric keypad shape, spacing, and position. Remove the Yealink wordmark completely. Do not show any manufacturer name, brand logo, invented label, readable interface text, or watermark. Do not turn it into a smartphone, touchscreen, cellular slab, walkie-talkie, remote, or generic landline handset. Do not warp, bend, melt, duplicate, crop, float, or omit any part of the handset. No malformed keypad, extra buttons, missing navigation ring, implausible scale, or anatomy artifacts. Premium candid editorial family photography, believable rather than glossy stock imagery, contemporary American family life, soft natural daylight or warm practical home light, calm navy and warm-neutral palette with restrained red accents, natural 35–50 mm perspective, realistic depth of field. Square-safe composition: keep every essential face and the full handset within the central 70–75%, while leaving the bottom 25–30% relatively quiet and free of essential faces or handset details for overlaid homepage copy. No visible text, captions, signage, logos, flag backdrop, social-media UI, smartphone, tablet, laptop, television screen, or other competing screen.

Scene: a warm candid weekday morning near the front window or entryway of a comfortable family home. An elementary-school-aged child is ready for the school bus with a backpack and naturally holds the exact referenced handset as a practical way to call home. A yellow school bus is softly visible outside in the background. Show the full handset clearly enough to verify its proportions, navigation ring, call buttons, and keypad while keeping the moment believable. Frame the child and handset in the upper and middle areas; preserve a calm, uncluttered lower text-safe region.
```

#### Exact targeted retry prompt

```text
Use case: precise-object-edit. Image 1 is the scene edit target. Image 2 is the sole hardware-identity reference. Replace only the malformed oversized phone in the child's hands, making only the minimal natural finger adjustment needed. Preserve the child, face, backpack, clothing, pose, bus, window, lighting, colors, depth of field, square composition, and quiet lower text-safe region exactly. The replacement must be one complete tall narrow cordless handset matching Image 2: dark gray/black body with silver-gray edge, small dark non-touch screen with earpiece above it, circular navigation ring and center button below the screen, green call and red end-call buttons, and a correctly spaced numeric keypad below. The screen must not dominate the phone and must not resemble a smartphone. Keep the full phone visibly within the frame and human-scale, with fingers around its edge rather than covering its defining controls. Remove the Yealink wordmark and show no logo, manufacturer name, invented lettering, readable interface text, watermark, or second device.
```

### Home-alone minutes

- Review master: [`masters/home-alone-minutes.png`](masters/home-alone-minutes.png)
- Website candidate: [`deliverables/home-alone-minutes.webp`](deliverables/home-alone-minutes.webp)
- Attempt 1 request: `019f906d-4b38-7e11-af6f-815ca47e130b` — 59.648 s
- Attempt 2 request: `019f9070-3b94-75b0-aafb-a651fe7fbc3f` — 30.19 s
- Judgment: **Fail — Generated and visually strong as a scene, but not strict-gate approved.**
- Failed gates:
  - Full handset verification: the earpiece and upper screen are hidden behind the child’s face and fingers, so the complete canonical silhouette cannot be verified.
  - No invented lettering: a tiny invented lower-key label remains in the 2K master.
- Passed gates:
  - Exactly 2048x2048
  - Safe home-alone scenario is clear without embedded copy
  - No Yealink wordmark or manufacturer logo
  - No smartphone or competing screen
  - Face and handset remain clear of the lower text-safe area
  - No obvious anatomy or duplication artifact
  - Campaign lighting and palette are cohesive

#### Exact initial prompt

```text
Use case: photorealistic-natural. Asset type: square homepage lifestyle card in a cohesive four-image Independence Phone campaign. Create a NEW lifestyle photograph; the provided image is only the hardware-identity reference for the handset, not the scene, composition, studio background, or an edit target. Reproduce exactly one tall, narrow dark gray and black cordless handset with a silver-gray edge, realistic thickness and human scale, a dark screen in the same position and proportions, a circular navigation ring with center button, green call and red end-call buttons, and the same numeric keypad shape, spacing, and position. Remove the Yealink wordmark completely. Do not show any manufacturer name, brand logo, invented label, readable interface text, or watermark. Do not turn it into a smartphone, touchscreen, cellular slab, walkie-talkie, remote, or generic landline handset. Do not warp, bend, melt, duplicate, crop, float, or omit any part of the handset. No malformed keypad, extra buttons, missing navigation ring, implausible scale, or anatomy artifacts. Premium candid editorial family photography, believable rather than glossy stock imagery, contemporary American family life, soft natural daylight or warm practical home light, calm navy and warm-neutral palette with restrained red accents, natural 35–50 mm perspective, realistic depth of field. Square-safe composition: keep every essential face and the full handset within the central 70–75%, while leaving the bottom 25–30% relatively quiet and free of essential faces or handset details for overlaid homepage copy. No visible text, captions, signage, logos, flag backdrop, social-media UI, smartphone, tablet, laptop, television screen, or other competing screen.

Scene: a calm late-afternoon moment at a kitchen island or dining table during a short, safe home-alone window. An elementary- or middle-school-aged child is making or answering a reassuring voice call with the exact referenced handset. The room feels warm, ordinary, secure, and lived-in, with a small amount of homework paper and a simple snack as subtle context. Keep the complete handset identifiable, avoid dramatic anxiety, and keep the lower quarter quiet for homepage copy.
```

#### Exact targeted retry prompt

```text
Use case: precise-object-edit. Image 1 is the scene edit target. Image 2 is the sole hardware-identity reference. Replace only the partly obscured handset beside the child's face and make the minimal natural hand adjustment needed so the entire handset is clearly visible beside the cheek from earpiece to bottom edge. Preserve the child, facial expression, clothing, kitchen, homework, snack, lighting, colors, square composition, and quiet lower text-safe region exactly. The replacement must match Image 2: tall narrow dark gray/black cordless body with silver-gray edge, small dark screen, circular navigation ring and center button, green call and red end-call buttons, and correctly spaced numeric keypad. Fingers may hold the side edge but must not cover the screen, navigation ring, or keypad. No smartphone shape, touchscreen, logo, manufacturer name, invented lettering, readable interface text, watermark, or second device.
```

### Grandparents

- Review master: [`masters/grandparents.png`](masters/grandparents.png)
- Website candidate: [`deliverables/grandparents.webp`](deliverables/grandparents.webp)
- Attempt 1 request: `019f906d-4b3b-7442-bd08-6b02b5e27c41` — 50.444 s
- Attempt 2 request: `019f9070-3b9c-7890-a8e6-69d03dc52a18` — 30.324 s
- Judgment: **Fail — Generated and visually strong as a scene, but not strict-gate approved.**
- Failed gates:
  - Full handset verification: the upper screen/earpiece silhouette is obscured against the child’s cheek.
  - No invented lettering: an invented ZR-like label remains on the lower-left keypad key in the 2K master.
- Passed gates:
  - Exactly 2048x2048
  - Grandparent-call context is clear through the framed portrait
  - No Yealink wordmark or manufacturer logo
  - No smartphone or competing screen
  - Face and handset remain above the lower text-safe area
  - No obvious anatomy or duplication artifact
  - Campaign lighting and palette are cohesive

#### Exact initial prompt

```text
Use case: photorealistic-natural. Asset type: square homepage lifestyle card in a cohesive four-image Independence Phone campaign. Create a NEW lifestyle photograph; the provided image is only the hardware-identity reference for the handset, not the scene, composition, studio background, or an edit target. Reproduce exactly one tall, narrow dark gray and black cordless handset with a silver-gray edge, realistic thickness and human scale, a dark screen in the same position and proportions, a circular navigation ring with center button, green call and red end-call buttons, and the same numeric keypad shape, spacing, and position. Remove the Yealink wordmark completely. Do not show any manufacturer name, brand logo, invented label, readable interface text, or watermark. Do not turn it into a smartphone, touchscreen, cellular slab, walkie-talkie, remote, or generic landline handset. Do not warp, bend, melt, duplicate, crop, float, or omit any part of the handset. No malformed keypad, extra buttons, missing navigation ring, implausible scale, or anatomy artifacts. Premium candid editorial family photography, believable rather than glossy stock imagery, contemporary American family life, soft natural daylight or warm practical home light, calm navy and warm-neutral palette with restrained red accents, natural 35–50 mm perspective, realistic depth of field. Square-safe composition: keep every essential face and the full handset within the central 70–75%, while leaving the bottom 25–30% relatively quiet and free of essential faces or handset details for overlaid homepage copy. No visible text, captions, signage, logos, flag backdrop, social-media UI, smartphone, tablet, laptop, television screen, or other competing screen.

Scene: an affectionate candid moment of a child enjoying an easy voice call with a grandparent, seated in a cozy living room and naturally holding the exact referenced handset to one ear. A softly focused framed family photograph of the child's grandparents supports the story without becoming another screen. The handset is physically accurate, fully visible, and clearly identifiable. Convey warmth and connection without a staged smile; keep the lower quarter visually quiet.
```

#### Exact targeted retry prompt

```text
Use case: precise-object-edit. Image 1 is the scene edit target. Image 2 is the sole hardware-identity reference. Replace only the handset and make the minimal natural hand adjustment needed so its complete physical silhouette and controls are visible beside the child's cheek. Preserve the child, expression, sweater, armchair, framed grandparents photograph, lighting, colors, square composition, and quiet lower text-safe region exactly. The replacement must match Image 2: tall narrow dark gray/black cordless body with silver-gray edge, small dark screen, circular navigation ring and center button, green call and red end-call buttons, and correctly spaced numeric keypad. Eliminate the invented TRAALT-like lettering and all other letter labels. Keep only ordinary keypad numerals and simple key symbols; no logo, manufacturer name, invented words, readable interface text, watermark, smartphone shape, or second device.
```

### Before the smartphone

- Review master: [`masters/before-the-smartphone.png`](masters/before-the-smartphone.png)
- Website candidate: [`deliverables/before-the-smartphone.webp`](deliverables/before-the-smartphone.webp)
- Attempt 1 request: `019f906d-4b33-74e2-8499-4d61d016e388` — 34.569 s
- Attempt 2 request: `019f9070-3b99-70c3-bef4-25709d34054d` — 28.514 s
- Judgment: **Fail — Generated and visually strong as a scene, but not strict-gate approved.**
- Failed gates:
  - No invented lettering: a TRSLN-like invented label remains on the lower-left keypad key in the 2K master.
- Passed gates:
  - Exactly 2048x2048
  - Drawing-before-smartphone scenario is clear without embedded copy
  - Full handset silhouette, ring, call keys, and keypad are visible
  - No Yealink wordmark or manufacturer logo
  - No smartphone or competing screen
  - Face and handset stay above the lower text-safe region
  - No obvious anatomy or duplication artifact
  - Campaign lighting and palette are cohesive

#### Exact initial prompt

```text
Use case: photorealistic-natural. Asset type: square homepage lifestyle card in a cohesive four-image Independence Phone campaign. Create a NEW lifestyle photograph; the provided image is only the hardware-identity reference for the handset, not the scene, composition, studio background, or an edit target. Reproduce exactly one tall, narrow dark gray and black cordless handset with a silver-gray edge, realistic thickness and human scale, a dark screen in the same position and proportions, a circular navigation ring with center button, green call and red end-call buttons, and the same numeric keypad shape, spacing, and position. Remove the Yealink wordmark completely. Do not show any manufacturer name, brand logo, invented label, readable interface text, or watermark. Do not turn it into a smartphone, touchscreen, cellular slab, walkie-talkie, remote, or generic landline handset. Do not warp, bend, melt, duplicate, crop, float, or omit any part of the handset. No malformed keypad, extra buttons, missing navigation ring, implausible scale, or anatomy artifacts. Premium candid editorial family photography, believable rather than glossy stock imagery, contemporary American family life, soft natural daylight or warm practical home light, calm navy and warm-neutral palette with restrained red accents, natural 35–50 mm perspective, realistic depth of field. Square-safe composition: keep every essential face and the full handset within the central 70–75%, while leaving the bottom 25–30% relatively quiet and free of essential faces or handset details for overlaid homepage copy. No visible text, captions, signage, logos, flag backdrop, social-media UI, smartphone, tablet, laptop, television screen, or other competing screen.

Scene: a peaceful early-evening family-home moment. A child is reading, drawing, or doing homework at a table while the exact referenced handset rests upright within easy reach and is being naturally picked up for a call. The story is communication before apps and social feeds. Include no smartphone, tablet, laptop, television screen, or other digital device. Keep the entire handset fully identifiable, use calm warm family lighting, and reserve the lower quarter for overlaid copy.
```

#### Exact targeted retry prompt

```text
Use case: precise-object-edit. Image 1 is the scene edit target. Image 2 is the sole hardware-identity reference. Replace only the handset in the adult hand while preserving the child, adult hand and ring, drawing, pencils, table, living room, lighting, colors, square composition, and quiet lower text-safe region exactly. The replacement must match Image 2 in full silhouette and proportions: tall narrow dark gray/black cordless body with silver-gray edge, small dark screen rather than a large smartphone-like display, circular navigation ring and center button, green call and red end-call buttons, and correctly spaced numeric keypad. Eliminate the invented ODER-like lettering and all other letter labels. Keep only ordinary keypad numerals and simple key symbols; no logo, manufacturer name, invented words, readable interface text, watermark, smartphone shape, or second device.
```

## Artifact map

- `masters/*.png`: best 2048×2048 review candidates selected after retry.
- `deliverables/*.webp`: visually reviewed 1200×1200 WebP derivatives, each under 100 KB.
- `runs/*-attempt1.json` and `runs/*-attempt2.json`: exact prompts, safe Fal request/result metadata, request IDs, and timings.
- `runs/*-attempt1.png` and `runs/*-attempt2.png`: retained attempt candidates.
- `runs/<slug>.json`: per-scene summary, checksums, dimensions, and acceptance judgment.
- `previews/*.jpg`: contact sheets for visual comparison.

## Recommended next move

Do not upload these automatically. The most reliable next pass is to create a clean logo-free canonical handset cutout first and use a masked phone-region replacement or compositing workflow, because free-form reference generation repeatedly reproduces the handset silhouette but invents tiny keypad lettering and hides the upper body in phone-to-ear poses.
