# Source Manifest

## Copied Files

| Organized file | Original source | Notes |
| --- | --- | --- |
| `assets/video/indy-phone-reel-1.mov` | `/Users/vilovieta/Downloads/Indy Phone Reel #1.mov` | Supplied reel/video asset. About 105 MB. Use Git LFS if committed. |
| `documents/independence-phone-sow-v1.pdf` | `/Users/vilovieta/Downloads/Independence-Phone-SOW-v1.pdf` | Supplied SOW PDF. 8 pages. |
| `documents/independence-phone-sow-v1.txt` | Extracted from `documents/independence-phone-sow-v1.pdf` using `pdftotext -layout` | Text extraction for quick search and planning. |
| `documents/sow-summary.md` | Derived from the SOW PDF and text extraction | Structured scope, dependencies, pricing, and build implications. |
| `assets/logo/independence-phone-logo.ai` | `/Users/vilovieta/Downloads/IndependencePhone_Logo.ai` | Supplied logo source file. Detected as a PDF-compatible Illustrator file. |
| `assets/logo/independence-phone-logo-export.png` | Derived from `assets/logo/independence-phone-logo.ai` using macOS Quick Look preview export and transparent-background processing | Shopify-ready PNG logo export used by the local theme and available for upload/selection in the Refresh header. |
| `notes/raw-client-notes.txt` | `/Users/vilovieta/.codex/attachments/32322822-82fc-4c47-8fed-d1d275371f6a/pasted-text.txt` | Raw pasted client notes, URLs, pricing, and requirements. |
| `assets/product-images/independence-phone-product-crunchy.png` | `https://freedom-phone-2.myshopify.com/cdn/shop/files/Crunchy.png?v=1777306321&width=3840` | Extracted Shopify product image from product page. Download resolved to 1024 x 1536 PNG with no alpha channel. |
| `research/shopify-product-page/product-page-screenshot.png` | MCP Scraper screenshot of `https://freedom-phone-2.myshopify.com/products/independence-phone?variant=62779145290099` | Product page screenshot captured during image extraction. |
| `research/shopify-product-page/mcp-extract-report.md` | MCP Scraper URL extraction report for Shopify product page | Product page extraction evidence, including page headings, schema, and logo/media references. |
| `research/shopify-product-page/product-page-observations.md` | Derived from MCP extraction, page markup, and visual inspection | Notes product image/placeholder data caveats. |
| `research/reddit-voc/source-log.md` | MCP Scraper SERP/PAA discovery and browser-agent reads of Reddit threads | Source log with thread URLs, relevant buyer language, and implications. |
| `research/reddit-voc/voc-snippets.yaml` | Derived from Reddit source log | Structured ICP, JTBD, pain point, objection, and copy bank data. |
| `research/reddit-voc/buyer-research-report.md` | Derived from Reddit source log and PAA demand language | Strategic buyer-research report for Shopify copy and product-page direction. |
| `research/reddit-voc/coverage-review.md` | Derived from Reddit research plan | Coverage audit for requested VOC, pain points, objections, ICP, and copy implications. |
| `research/reddit-voc/verification.md` | MCP Scraper tool notes | Verification notes and known research limitations. |
| `assets/reference-images/kid-phone-ui-reference.png` | `/var/folders/_g/brz0xklj4v10m9pmtgg_7fdw0000gn/T/codex-clipboard-9a82de46-71d4-42d1-a2af-ef5aa7fa3738.png` | User-supplied 100 x 100 reference thumbnail showing child with phone and excluded app list. |
| `assets/site-images/current-site-product-1.png` | `https://independencephone.com/wp-content/uploads/2026/05/1-1.png` | Current live site product/gallery image. |
| `assets/site-images/current-site-product-2.png` | `https://independencephone.com/wp-content/uploads/2026/05/2.png` | Current live site product/gallery image. |
| `assets/site-images/current-site-product-3.png` | `https://independencephone.com/wp-content/uploads/2026/05/3.png` | Current live site product/gallery image. |
| `assets/site-images/current-site-product-4.png` | `https://independencephone.com/wp-content/uploads/2026/05/4.png` | Current live site kid-with-phone image; strong ICP/message reference. |
| `assets/site-images/current-site-product-collage.png` | `https://independencephone.com/wp-content/uploads/2026/05/IP-product-images.png` | Current live site brand/product collage. |
| `assets/site-images/current-site-logo.png` | `https://independencephone.com/wp-content/uploads/2026/05/Independence-Phone-Logo.png` | Current live site logo export. |
| `assets/site-images/current-site-homepage-screenshot.png` | MCP Scraper screenshot of `https://independencephone.com/` | Current homepage screenshot. |
| `assets/site-images/current-site-mcp-extract-report.md` | MCP Scraper URL extraction report for `https://independencephone.com/` | Current homepage copy, media, branding, and schema extraction. |
| `assets/site-images/source-list.md` | Derived source list for current live site assets | Tracks downloaded image sources and QA notes. |
| `assets/site-images/current-site-assets-contact-sheet.jpg` | Local derived contact sheet | Quick visual index of downloaded current-site images and reference thumbnail. |
| `strategy/jtbd-project-approach.md` | Derived from user notes, SOW, live site, and brief materials | Jobs-to-be-done project approach and messaging strategy. |
| `strategy/design-brief.md` | Derived from JTBD, Reddit VOC, theme decision, and design-system guidance | Design direction, visual system, editable-section requirements, and Shopify maintainability rules. |
| `strategy/copy-brief.md` | Derived from JTBD, Reddit VOC, product model, and client notes | Copy strategy, page copy outline, voice/tone, CTAs, objections, and claim guardrails. |
| `strategy/limited-sitemap.md` | Derived from user constraint and Shopify product model | Four-page custom sitemap and fallback scope path. |
| `strategy/product-model-and-theme-direction.md` | Derived from clarified product/pricing/add-on details | Two-product Shopify catalog model and theme direction. |
| `strategy/goal-prompt.md` | Derived from all organized brief materials | Paste-ready `/goal` prompt for invoking the full Shopify build with file paths and canonical product facts. |
| `template-research/theme-decision.md` | Derived from theme research, JTBD notes, Reddit VOC, and official Shopify theme documentation | Final theme/base decision: use Refresh with custom editable Shopify sections. |

## Duplicate Inputs

| Input | Status |
| --- | --- |
| `/Users/vilovieta/Downloads/Independence-Phone-SOW-v1 (1).pdf` | Duplicate of `/Users/vilovieta/Downloads/Independence-Phone-SOW-v1.pdf`; SHA-256 hashes match, so it was not copied separately. |

## External References

- Current website: <https://independencephone.com/>
- Terms page: <https://independencephone.com/terms/>
- Privacy page: <https://independencephone.com/privacy/>
- Facebook page: <https://www.facebook.com/profile.php?id=61590915621714>
- Shopify product page used for image extraction: <https://freedom-phone-2.myshopify.com/products/independence-phone?variant=62779145290099>

## Handling Notes

- Preserve original files in Downloads and Codex attachments.
- Work from the organized copies in this folder.
- Do not commit raw secrets, Shopify credentials, customer data, payment data, or API keys.
- Use Git LFS before committing video files.
