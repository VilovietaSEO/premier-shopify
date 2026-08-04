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

cat > "$tmp_theme/layout/password.liquid" <<'LIQUID'
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
	  "assets/ip-cart.js"
	  "assets/ip-product-gallery.js"
	  "assets/ip-hero-video.mp4"
	  "assets/ip-hero-video-desktop.mp4"
	  "assets/ip-hero-video-poster.jpg"
	  "assets/ip-hero-video-poster.webp"
	  "assets/ip-hero-video-poster-mobile.webp"
	  "assets/ip-classic-phone-buttons.webp"
	  "assets/ip-classic-phone-charger.webp"
	  "assets/ip-classic-phone-back.webp"
	  "assets/ip-classic-phone-front.webp"
	  "assets/ip-classic-phone-spin.mp4"
	  "assets/ip-rugged-phone-buttons.webp"
	  "assets/ip-rugged-phone-charger.webp"
	  "assets/ip-rugged-phone-back.webp"
	  "assets/ip-rugged-phone-front.webp"
	  "assets/ip-rugged-phone-spin.mp4"
	  "assets/ip-billing-flag.webp"
	  "sections/ip-announcement-banner.liquid"
	  "sections/ip-video-hero.liquid"
	  "sections/ip-order-builder.liquid"
	  "sections/cart.liquid"
	  "sections/footer.liquid"
	  "sections/page.liquid"
  "sections/ip-billing-item.liquid"
  "sections/ip-product-main.liquid"
  "sections/ip-service-plans.liquid"
  "sections/ip-contact-form.liquid"
  "sections/search.liquid"
  "snippets/ip-structured-data.liquid"
  "snippets/ip-order-builder-form.liquid"
  "templates/index.json"
  "templates/collection.phones.json"
  "templates/product.independence-phone.json"
  "templates/product.billing-item.json"
  "templates/page.order.json"
  "templates/page.faq.json"
  "templates/page.contact.json"
  "templates/robots.txt.liquid"
)

for file in "${required_files[@]}"; do
  if [ ! -f "$tmp_theme/$file" ]; then
    echo "Overlay smoke test missing copied file: $file" >&2
    exit 1
  fi
done

parity_files=(
  "assets/ip-billing-flag.webp"
  "assets/ip-classic-phone-spin.mp4"
  "assets/ip-rugged-phone-spin.mp4"
  "assets/ip-theme.css"
  "assets/ip-cart.js"
  "sections/cart.liquid"
  "sections/footer.liquid"
  "sections/ip-contact-form.liquid"
  "sections/ip-faq.liquid"
  "sections/ip-order-builder.liquid"
  "sections/ip-product-main.liquid"
  "sections/ip-service-plans.liquid"
  "sections/page.liquid"
  "snippets/ip-order-builder-form.liquid"
  "templates/page.contact.json"
  "templates/page.faq.json"
  "templates/page.order.json"
)

for file in "${parity_files[@]}"; do
  if ! cmp -s "$repo_root/independence-phone-theme/$file" "$repo_root/refresh-overlay/$file"; then
    echo "Theme and refresh overlay differ for $file" >&2
    exit 1
  fi
  if ! cmp -s "$repo_root/independence-phone-theme/$file" "$tmp_theme/$file"; then
    echo "Applied refresh overlay does not match the reviewed theme file: $file" >&2
    exit 1
  fi
done

stylesheet_count="$(grep -c "ip-theme.css" "$tmp_theme/layout/theme.liquid" || true)"
if [ "$stylesheet_count" -ne 1 ]; then
  echo "Expected one ip-theme.css include after repeated overlay application, found $stylesheet_count" >&2
  exit 1
fi

cart_script_count="$(grep -c "ip-cart.js" "$tmp_theme/layout/theme.liquid" || true)"
if [ "$cart_script_count" -ne 1 ]; then
  echo "Expected one ip-cart.js include after repeated overlay application, found $cart_script_count" >&2
  exit 1
fi

gallery_script_count="$(grep -c "ip-product-gallery.js" "$tmp_theme/layout/theme.liquid" || true)"
if [ "$gallery_script_count" -ne 1 ]; then
  echo "Expected one ip-product-gallery.js include after repeated overlay application, found $gallery_script_count" >&2
  exit 1
fi

structured_data_count="$(grep -c "ip-structured-data" "$tmp_theme/layout/theme.liquid" || true)"
if [ "$structured_data_count" -ne 1 ]; then
  echo "Expected one ip-structured-data render after repeated overlay application, found $structured_data_count" >&2
  exit 1
fi

global_noindex_count="$(grep -c "Independence Phone indexing disabled until launch approval" "$tmp_theme/layout/theme.liquid" || true)"
if [ "$global_noindex_count" -ne 1 ]; then
  echo "Expected one global noindex marker after repeated overlay application, found $global_noindex_count" >&2
  exit 1
fi

if ! grep -q '<meta name="robots" content="noindex,nofollow">' "$tmp_theme/layout/theme.liquid"; then
  echo "Overlay smoke test is missing the global noindex meta tag" >&2
  exit 1
fi

password_noindex_count="$(grep -c "Independence Phone indexing disabled until launch approval" "$tmp_theme/layout/password.liquid" || true)"
if [ "$password_noindex_count" -ne 1 ]; then
  echo "Expected one password-layout noindex marker after repeated overlay application, found $password_noindex_count" >&2
  exit 1
fi

if ! grep -q '<meta name="robots" content="noindex,nofollow">' "$tmp_theme/layout/password.liquid"; then
  echo "Overlay smoke test is missing the password-layout noindex meta tag" >&2
  exit 1
fi

if ! grep -q "{{ content_for_header }}" "$tmp_theme/layout/theme.liquid"; then
  echo "Overlay smoke test removed content_for_header" >&2
  exit 1
fi

if ! grep -q "orderBillingConfigurationError" "$tmp_theme/assets/ip-cart.js"; then
  echo "Overlay smoke test is missing the fail-closed billing configuration guard" >&2
  exit 1
fi

for file in \
  "sections/ip-order-builder.liquid" \
  "sections/ip-product-main.liquid" \
  "sections/page.liquid" \
  "snippets/ip-order-builder-form.liquid" \
  "sections/cart.liquid"; do
  for policy_field in \
    'name="properties[Policy agreement]"' \
    'name="attributes[Policy agreement]"'; do
    if grep -Fq "$policy_field" "$tmp_theme/$file"; then
      echo "Overlay smoke test found pre-checkout policy collection in $file: $policy_field" >&2
      exit 1
    fi
  done
done

for file in \
  "sections/ip-order-builder.liquid" \
  "snippets/ip-order-builder-form.liquid" \
  "sections/cart.liquid"; do
  for policy_copy in \
    'Privacy Policy' \
    'Terms and Conditions'; do
    if grep -Fq "$policy_copy" "$tmp_theme/$file"; then
      echo "Overlay smoke test found duplicated policy copy before final checkout in $file: $policy_copy" >&2
      exit 1
    fi
  done
done

if ! grep -Fq 'formnovalidate' "$tmp_theme/sections/cart.liquid"; then
  echo "Overlay smoke test is missing formnovalidate on the cart Update action" >&2
  exit 1
fi

for hook in \
  'data-cart-setup' \
  'data-cart-setup-children' \
  'data-cart-setup-child' \
  'data-cart-setup-quantity' \
  'data-cart-setup-remove'; do
  if ! grep -Eq "${hook}([^[:alnum:]_-]|$)" "$tmp_theme/sections/cart.liquid"; then
    echo "Overlay smoke test is missing grouped cart hook: $hook" >&2
    exit 1
  fi
done

for phrase in \
  'validateAddedSetup' \
  'expectedItems.every' \
  'removeIncompleteSetup(validation)' \
  'Nothing was kept in your cart' \
  "window.location.assign(endpoint('cart'))"; do
  if ! grep -Fq "$phrase" "$tmp_theme/assets/ip-cart.js"; then
    echo "Overlay smoke test is missing cart completion/redirect guard: $phrase" >&2
    exit 1
  fi
done

for phrase in \
  "schema: 'independence_phone.revio_checkout.v2'" \
  "collection_status: 'pending_checkout'" \
  'privacy_terms_accepted: null' \
  'desired_area_code: null' \
  "desired_area_code_collection_status: 'required_at_checkout'" \
  'flat_shipping_cents: shippingCents' \
  'const shippingCents = cartDisplayCount(cart) > 0 ? 1500 : 0;' \
  'due_today_before_tax_cents: immediateSubtotalCents + shippingCents' \
  'future_charge_cents: futureChargeCents' \
  "first_bill_rule: 'first_day_of_next_month'" \
  '_setup_future_charge_cents' \
  '_setup_billing_cadence' \
  '_setup_first_bill_rule'; do
  if ! grep -Fq "$phrase" "$tmp_theme/assets/ip-cart.js"; then
    echo "Overlay smoke test is missing deferred-billing v2 contract content: $phrase" >&2
    exit 1
  fi
done

for retired_phrase in \
  "schema: 'independence_phone.revio_checkout.v1'" \
  'validateCartPolicy' \
  'data-cart-policy-error'; do
  if grep -Fq "$retired_phrase" "$tmp_theme/assets/ip-cart.js"; then
    echo "Overlay smoke test still contains retired checkout contract behavior: $retired_phrase" >&2
    exit 1
  fi
done

for phrase in \
  'Build your Independence Phone order now.' \
  'Choose your service plan — Billed on the 1st of the next month' \
  'Choose add-ons — Billed on the 1st of the next month' \
  'Discount/referral code' \
  'Taxes, shipping, and recurring billing will be shown in the cart.' \
  '"default": "Add order to cart"' \
  "data-order-image=\"{{ 'ip-classic-phone-front.webp' | asset_url }}\"" \
  "data-order-image=\"{{ 'ip-rugged-phone-front.webp' | asset_url }}\"" \
  "src=\"{{ 'ip-classic-phone-spin.mp4' | asset_url }}\"" \
  "src=\"{{ 'ip-rugged-phone-spin.mp4' | asset_url }}\"" \
  'data-future-charge-cents="1776"' \
  'data-future-charge-cents="20000"' \
  'data-first-bill-rule="first_day_of_next_month"'; do
  if ! grep -Fq "$phrase" "$tmp_theme/snippets/ip-order-builder-form.liquid" \
    && ! grep -Fq "$phrase" "$tmp_theme/sections/ip-order-builder.liquid"; then
    echo "Overlay smoke test is missing accepted Order Now content: $phrase" >&2
    exit 1
  fi
done

for retired_phrase in \
  'Patriot Package' \
  'data-order-package' \
  'If another customer referred you'; do
  if grep -Fq "$retired_phrase" "$tmp_theme/sections/ip-order-builder.liquid" \
    || grep -Fq "$retired_phrase" "$tmp_theme/snippets/ip-order-builder-form.liquid" \
    || grep -Fq "$retired_phrase" "$tmp_theme/templates/page.order.json"; then
    echo "Overlay smoke test still contains retired Order Now content: $retired_phrase" >&2
    exit 1
  fi
done

comparison_trigger_count="$(grep -c 'data-phone-comparison-open' "$tmp_theme/snippets/ip-order-builder-form.liquid" || true)"
if [ "$comparison_trigger_count" -ne 1 ]; then
  echo "Expected one phone comparison control, found $comparison_trigger_count" >&2
  exit 1
fi

for phrase in \
  'Compare Classic and Rugged phones' \
  'data-phone-comparison-dialog' \
  '<th scope="row">Waterproof</th>' \
  '<th scope="row">Drop proof</th>'; do
  if ! grep -Fq "$phrase" "$tmp_theme/snippets/ip-order-builder-form.liquid"; then
    echo "Overlay smoke test is missing phone comparison content: $phrase" >&2
    exit 1
  fi
done

if grep -Fq 'data-phone-description-link' "$tmp_theme/snippets/ip-order-builder-form.liquid"; then
  echo "Overlay smoke test still contains the retired per-phone description links" >&2
  exit 1
fi

for phrase in \
  'data-phone-comparison-open' \
  "typeof dialog.showModal === 'function'" \
  'data-phone-comparison-close'; do
  if ! grep -Fq "$phrase" "$tmp_theme/assets/ip-cart.js"; then
    echo "Overlay smoke test is missing phone comparison behavior: $phrase" >&2
    exit 1
  fi
done

for phrase in \
  'Your Independence Phone Cart' \
  "approved_phone_asset = 'ip-story-before-smartphone.webp'" \
  "approved_phone_asset = 'ip-rugged-phone-front.webp'" \
  '{% assign flat_shipping = 1500 %}' \
  'data-cart-subtotal' \
  'data-cart-shipping' \
  'data-cart-due-today' \
  'data-cart-future-charge' \
  'Due today before tax' \
  'Due on the first of next month' \
  'Taxes and recurring billing are shown in checkout.' \
  'setup_has_service' \
  'data-cart-incomplete-setup'; do
  if ! grep -Fq "$phrase" "$tmp_theme/sections/cart.liquid"; then
    echo "Overlay smoke test is missing accepted cart contract content: $phrase" >&2
    exit 1
  fi
done

for retired_phrase in \
  'Order review' \
  '<th scope="col">Product</th>' \
  '<th scope="col">Total</th>' \
  'Remove setup'; do
  if grep -Fq "$retired_phrase" "$tmp_theme/sections/cart.liquid"; then
    echo "Overlay smoke test still contains retired cart content: $retired_phrase" >&2
    exit 1
  fi
done

if ! grep -q "capture crm_fields" "$tmp_theme/sections/ip-contact-form.liquid"; then
  echo "Overlay smoke test is missing isolated CRM fields for the optional CRM form" >&2
  exit 1
fi

if grep -q 'name="crm\[' "$tmp_theme/sections/ip-contact-form.liquid" \
  && ! grep -q "{{ crm_fields }}" "$tmp_theme/sections/ip-contact-form.liquid"; then
  echo "Overlay smoke test found CRM fields without an explicit CRM-only render" >&2
  exit 1
fi

for phrase in \
  'Phone Number' \
  'How can we Help?' \
  '"default": "Send"' \
  'ip-contact--simple'; do
  if ! grep -Fq "$phrase" "$tmp_theme/sections/ip-contact-form.liquid"; then
    echo "Overlay smoke test is missing simplified contact form content: $phrase" >&2
    exit 1
  fi
done

for phrase in \
  'Child age range' \
  'Patriot Package interest' \
  'Selected add-ons' \
  'Privacy and terms consent' \
  'Send my question'; do
  if grep -Fq "$phrase" "$tmp_theme/sections/ip-contact-form.liquid"; then
    echo "Overlay smoke test still contains removed contact content: $phrase" >&2
    exit 1
  fi
done

if grep -Fq 'Patriot Package' "$tmp_theme/templates/page.faq.json"; then
  echo "Overlay smoke test still contains Patriot Package FAQ content" >&2
  exit 1
fi

for phrase in \
  'How does the referral offer work?' \
  '"anchor_id": "phone-comparison"'; do
  if ! grep -Fq "$phrase" "$tmp_theme/templates/page.faq.json"; then
    echo "Overlay smoke test is missing FAQ content: $phrase" >&2
    exit 1
  fi
done

if ! grep -q "pages/order-now" "$tmp_theme/sections/footer.liquid"; then
  echo "Overlay smoke test is missing the guided Order Now footer route" >&2
  exit 1
fi

for phrase in \
  '<address class="footer__contact"' \
  'section.settings.contact_email' \
  'section.settings.contact_phone' \
  'section.settings.contact_phone_link' \
  "'mailto:' | append: footer_email" \
  "'tel:' | append: footer_phone_link" \
  '"default": "info@independencephone.com"' \
  '"default": "(615) 704-1776"' \
  '"default": "+16157041776"'; do
  if ! grep -Fq "$phrase" "$tmp_theme/sections/footer.liquid"; then
    echo "Overlay smoke test is missing footer contact requirement: $phrase" >&2
    exit 1
  fi
done

echo "Refresh overlay smoke test passed"
