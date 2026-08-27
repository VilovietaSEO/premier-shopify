# Shopify Store Operations Guide

Last reviewed: August 27, 2026

This is the day-to-day administrator guide for `jordan-mark-premier.myshopify.com`.

## Current storefront contract

The customer path is:

```text
Homepage → /pages/order-now → /cart → final checkout/handoff
```

The public phone catalog is intentionally limited to Classic Phone (`$100`) and Rugged Phone (`$150`). The order builder also records service, add-ons, requested area code, and an optional discount/referral/customer ID. Shopify charges the physical phone, applicable tax, and one `$15` shipping charge today. Rev.io is responsible for later service billing only after the separate integration is live.

## Start-of-day checks

1. Open **Orders** and review new, paid, unfulfilled, canceled, and high-risk orders.
2. Confirm the selected phone and quantity.
3. Review the order's line-item properties for service, add-ons, `Requested area code`, and referral/customer ID.
4. Do not treat `$0.00` service lines as proof that Rev.io billing or provisioning succeeded.
5. Check the Rev.io/reconciliation system separately when that integration is active.
6. Review contact-form messages in the configured Sender email inbox.

## Fulfill a phone order

1. Open the order and confirm payment status before shipping.
2. Confirm the shipping address and selected phone model.
3. Pack the phone and required accessories.
4. Buy or enter the shipping label according to the client's carrier process.
5. Add the tracking number and carrier in Shopify.
6. Mark only the shipped physical items fulfilled.
7. Send the shipping notification unless the client has a documented exception.
8. Record any serial number or provisioning identifier in the approved private operations system, not in public order notes.

## Cancellations, refunds, and changes

- Check whether the order has shipped, been provisioned, or entered Rev.io before making changes.
- Use Shopify's cancel/refund controls for the physical order.
- Coordinate any service cancellation, payment reversal, or number release with the Rev.io operator.
- Avoid duplicate manual retries after an integration error.
- Tell the customer what was canceled or refunded and what remains active.

## Products and content

Edit product titles, prices, inventory, images, descriptions, categories, taxability, and shipping status in **Products**. Edit homepage, FAQ, Order Now, and Contact presentation in **Online Store → Themes → Customize**.

Before changing a live page:

1. Confirm the current live theme ID with Shopify Admin or `shopify theme list`.
2. Duplicate the live theme in Shopify for rollback when the change is more than a trivial copy edit.
3. Preview desktop and mobile.
4. Save the smallest requested change.
5. Verify the public URL.
6. Pull the live theme back into `independence-phone-theme/` and commit that snapshot so GitHub remains the canonical copy of what is live.

Do not create a second theme source or run old scripts that assume fixed live and QA theme IDs. Theme roles can change whenever a theme is published.

## Live-theme synchronization

The only canonical GitHub theme directory is `independence-phone-theme/`. The live theme is the source of truth for deployable files.

```bash
shopify theme list --store jordan-mark-premier.myshopify.com
shopify theme pull \
  --store jordan-mark-premier.myshopify.com \
  --live \
  --path /tmp/independence-phone-live
shopify theme check --path /tmp/independence-phone-live
```

Compare and synchronize Shopify deployable directories—`assets`, `blocks`, `config`, `layout`, `locales`, `sections`, `snippets`, and `templates`—without overwriting repository documentation. Shopify CLI can omit `config/settings_data.json`; treat it as store-managed customization data and never replace it blindly.

Never push directly to a live theme merely to make GitHub match it. Pulling live is read-only; pushing changes the storefront and requires separate approval and verification.

## Notifications and contact

- Configure customer and staff notifications under **Settings → Notifications**.
- Confirm the client-approved staff recipients for new orders.
- Keep the Contact page's **CRM endpoint URL** blank for Shopify-native delivery unless an approved CRM is hosted.
- Follow [`CONTACT_FORM_ADMINISTRATION_GUIDE.md`](CONTACT_FORM_ADMINISTRATION_GUIDE.md) for form and email changes.

## Taxes and Rev.io

- Follow [`STATE_SALES_TAX_SETUP_GUIDE.md`](STATE_SALES_TAX_SETUP_GUIDE.md) before enabling any state.
- Follow [`REVIO_PAYMENT_AND_PROVISIONING_GUIDE.md`](REVIO_PAYMENT_AND_PROVISIONING_GUIDE.md) for future billing and provisioning.
- Reconcile Shopify physical-order status and Rev.io service status separately.

## Weekly checks

- Review unfulfilled, refunded, and failed orders.
- Confirm inventory and phone pricing.
- Test public navigation, Order Now, cart, FAQ, and Contact pages on desktop and mobile without placing an unauthorized order.
- Confirm the live theme ID and that the GitHub canonical snapshot still matches its deployable files.
- Review tax reports and Rev.io reconciliation exceptions.
- Review user access and remove accounts that no longer require store access.

## Official references

- [Managing orders](https://help.shopify.com/en/manual/fulfillment/managing-orders)
- [Store notifications](https://help.shopify.com/en/manual/fulfillment/setup/notifications)
- [Managing themes](https://help.shopify.com/en/manual/online-store/themes/managing-themes)
- [Customizing themes](https://help.shopify.com/en/manual/online-store/themes/customizing-themes)
