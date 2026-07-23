# INDY CONTENT production-media workspace

The immutable client originals were received in `/Users/vilovieta/Downloads/INDY CONTENT` on 2026-06-27. They are intentionally not copied into Git because the set is approximately 223 MiB. Their exact identities are pinned in `manifests/source.sha256`.

Verify the external source set before every build:

```bash
cd "/Users/vilovieta/Downloads/INDY CONTENT"
shasum -a 256 -c "/Users/vilovieta/Documents/Shopify/brief-materials/assets/indy-content/manifests/source.sha256"
```

Directory roles:

- `retouched/`: reserved for any future approved full-resolution retouch masters; the approved Front workflow keeps the supplied Yealink lettering.
- `rejected/`: quarantined candidates that failed fidelity review; never use as build inputs or storefront assets.
- `production/images/`: 2000x1600 WebP gallery derivatives plus the two 800x640 patriotic Front selector cards.
- `production/videos/`: 1920x1080 H.264 product-spin derivatives with silent tracks removed.
- `production/posters/`: 1600x900 WebP spin posters.
- `manifests/`: source, build, retouch approval, and Shopify slot records.

The visual inspection of all ten supplied still photographs is recorded in
`manifests/source-visual-review.tsv`. Six angles contain no visible manufacturer
mark. On 2026-07-15 the client explicitly approved retaining Yealink on the two
Front photographs, so those originals are also approved for the patriotic
selector cards. The two Side photographs remain outside the approved scope.

No handset derivative may be generated from an already resized file. The original 5000x4000 photograph is always the source. The old logo-removal v1 candidates are 1402x1122 and remain only in `rejected/`; they are not inputs to the approved Front workflow.

`Rugged - Back.jpg` is a 5000x4000 PNG payload with a `.jpg` filename and no embedded color profile. Its no-logo visual inspection is recorded in `manifests/reproducibility.md`; the deterministic build assigns the system sRGB profile before resizing, just like the other safe stills.

The patriotic selector compositor is `scripts/build-indy-front-card-media.py`.
Its Python environment must provide rembg, Pillow, NumPy, and ONNX Runtime; it
uses the `birefnet-general` rembg model and the existing
`independence-phone-theme/assets/ip-bg-flag-subtle.png` background. The script
prints the active package/model versions after a successful build. Record the
exact approved versions and downloaded model hash from
`manifests/toolchain.txt`; the compositor rejects version or model drift. Set
`INDY_MEDIA_PYTHON` to the pinned Python environment when it is not the default
`python3` on the machine.

Run `scripts/build-indy-media.sh` from the repository root to verify source
hashes, rebuild the mechanically safe derivatives and Front selector cards, and
refresh `manifests/build.sha256`. The two new Front outputs are 800x640 opaque
WebPs targeted at 95,000 bytes and rejected at 100,000 bytes or above. Side and
spin media remain outside this storefront change.

Verify the production build from the repository root with:

```bash
shasum -a 256 -c brief-materials/assets/indy-content/manifests/build.sha256
```

After copying approved production files into the theme and refresh overlay, verify byte identity from the repository root with:

```bash
shasum -a 256 -c brief-materials/assets/indy-content/manifests/theme-assets.sha256
```

Run the complete source/status/dimension/codec/storefront-reference check with `npm run media:verify`.

The Front cards are selector-only theme assets. They intentionally remain out of
`scripts/assign-product-media.js` and `manifests/shopify-media.tsv` because that
helper performs a product-global Shopify media mutation rather than a QA-theme
change.
