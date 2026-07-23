# Independence Phone Scenario Image Context

## Objective

Generate four cohesive, photorealistic homepage scenario images for Independence Phone:

1. Bus days
2. Home-alone minutes
3. Grandparents
4. Before the smartphone

These replace the rejected generic-phone images currently used by the Shopify theme. This task creates image assets only. Do not edit, upload, publish, or repoint the Shopify theme.

## Generation path

- Provider: Fal.ai
- Model: `fal-ai/nano-banana-pro/edit`
- Reason: quality-first Fal model with reference-image editing, semantic composition, and native 2K square output
- Resolution: `2K`
- Aspect ratio: `1:1`
- Output format: `png`
- Images per request: `1`
- Reference input: `references/classic-phone-canonical-front.jpg`
- Reference role: canonical hardware-identity reference, not an edit target or scene/background reference
- Retry budget: one targeted retry for a scene that fails a material acceptance gate

## Canonical handset

The handset in `references/classic-phone-canonical-front.jpg` is the sole hardware source of truth.

Preserve:

- tall, narrow cordless-handset proportions
- dark gray/black body and silver-gray edge
- screen placement and proportions
- circular navigation ring and center button
- green call and red end-call buttons
- numeric keypad shape, position, and spacing
- realistic handset thickness and human scale

Change:

- remove the visible `Yealink` manufacturer wordmark
- show no manufacturer name, brand logo, invented label, or readable interface text

Reject:

- smartphones, touchscreens, cellular slab phones, walkie-talkies, remotes, or generic landline handsets
- duplicated, warped, melted, bent, floating, or partly missing phones
- malformed keypads, extra buttons, missing navigation ring, or implausible scale
- a phone cropped so tightly that its physical identity cannot be verified

## Shared art direction

- Use case: `photorealistic-natural`
- Asset type: square homepage lifestyle card
- Look: premium candid editorial family photography, believable rather than glossy stock photography
- Setting: contemporary American family life
- Lighting: soft natural daylight or warm practical home light
- Palette: calm navy, warm neutral, restrained red accents; avoid flag backdrops in these lifestyle scenes
- Camera: natural 35–50 mm photographic perspective, realistic depth of field, no extreme wide-angle distortion
- Composition: square-safe at 2048×2048; keep important faces and the full phone inside the central 70–75%
- Text-safe region: leave the bottom 25–30% relatively quiet and free of essential faces or handset details because the homepage overlays a dark gradient and copy there
- People: natural expressions and age-appropriate family situations
- No visible text, captions, signage, logos, watermarks, app interfaces, or social-media UI
- No smartphone, tablet, laptop, or other screen competing with the Independence Phone
- One canonical handset per scene unless a second handset is physically necessary; default to one

## Scene prompts

### 1. Bus days

Create a warm, candid morning photograph of an elementary-school-aged child near the front window or entryway of a comfortable family home, ready for the school bus with a backpack. A yellow school bus may be softly visible outside in the background. The child is naturally holding the exact cordless handset from the reference image as a practical way to call home. Show the full handset clearly enough to verify its proportions and keypad while keeping the moment believable. Frame the child and handset in the upper and middle areas and preserve a calm, uncluttered lower text-safe region.

### 2. Home-alone minutes

Create a calm late-afternoon photograph of an elementary- or middle-school-aged child at a kitchen island or dining table during a short, safe home-alone window. The child is making or answering a reassuring call with the exact cordless handset from the reference image. The room should feel warm, ordinary, and secure, with homework or a small snack as subtle context. Keep the full handset identifiable, avoid dramatic anxiety, and leave the lower quarter quiet for homepage copy.

### 3. Grandparents

Create an affectionate, candid photograph of a child enjoying an easy voice call with a grandparent using the exact cordless handset from the reference image. The child may be seated in a cozy living room while a framed family photograph or softly suggested grandparent context supports the story, but do not add any other screen or video call. The handset must be physically accurate and clearly visible. Convey warmth and connection without staged smiles, and keep the lower quarter visually quiet.

### 4. Before the smartphone

Create a peaceful early-evening family photograph showing a child reading, drawing, or doing homework at a table while the exact cordless handset from the reference image rests within easy reach or is being picked up for a call. The story is communication before apps and social feeds. Do not include a smartphone, tablet, laptop, or television screen. Keep the handset fully identifiable, use calm natural family lighting, and reserve the lower quarter for overlaid copy.

## Acceptance gates

Every accepted master must:

- be exactly 2048×2048
- clearly communicate its named scenario without embedded words
- show the canonical handset with recognizable proportions and button layout
- show no `Yealink` wordmark, manufacturer logo, invented brand, or watermark
- contain no smartphone or competing screen
- keep the phone and essential faces clear of the lower text-safe region
- contain no obvious anatomy, hand, keypad, perspective, or duplication artifact
- feel like part of the same four-image photographic campaign

## Outputs

Save:

- 2K PNG masters to `masters/<scenario-slug>.png`
- Fal request/result metadata with prompts to `runs/<scenario-slug>.json`
- website-ready square WebP derivatives to `deliverables/<scenario-slug>.webp`

Web derivatives must:

- preserve the square aspect ratio
- retain enough handset detail for the homepage card
- be no larger than 100 KB each
- be visually inspected after compression

Do not replace files under `independence-phone-theme/assets/` during this task.
