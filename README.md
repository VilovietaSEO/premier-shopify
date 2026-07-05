# Independence Phone Shopify Launch

This repo holds the Shopify theme and launch support files for the Independence Phone store.

Current store:

```text
jordan-mark-premier.myshopify.com
```

Current GitHub repo:

```text
https://github.com/VilovietaSEO/premier-shopify
```

## Plain-English Status

The storefront design and product flow are mostly built. The live Shopify theme is:

```text
Independence Phone / theme ID 150479208517
```

The store is still password-protected, so it is not fully public yet.

The public store should stay simple:

- Classic Phone
- Rugged Phone
- Patriot Package offer

The services and add-ons exist behind the scenes as Shopify line items so checkout, orders, and Rev.io can understand what the customer chose. They should not become a big public product grid.

## How The Business Can Take Payment

There are two choices.

### Fastest Launch: Use Shopify Checkout

This is the simplest way to start accepting cards.

The store owner goes to:

```text
Shopify Admin -> Settings -> Payments
```

Then they activate Shopify Payments, PayPal, or another Shopify-supported payment provider.

In this path:

- The customer checks out through Shopify.
- Shopify collects payment.
- Shopify creates the order.
- The CRM/server can receive the order after checkout.
- Rev.io can be updated later from the completed Shopify order.

For this path, leave this theme setting blank:

```text
Cart -> Rev.io checkout handoff URL
```

### Rev.io Checkout: Use After The API Work Is Ready

Rev.io should not be connected by putting an API key into Shopify.

If Rev.io is going to handle checkout or billing directly, the store needs the separate server/API handoff first. That server receives the cart details, saves a CRM record, and sends the setup to the Rev.io API implementer.

In this path:

- The customer chooses phone, plan, and add-ons on the site.
- The cart sends that setup to the hosted server.
- The server sends a signed handoff to the Rev.io API middleware.
- The Rev.io API implementer creates the customer, service, products, billing, or payment flow in Rev.io.

Only use this path after Rev.io sandbox testing is complete.

## What Still Has To Happen Before Launch

1. Add the store users.
2. Choose the payment path: Shopify Checkout now, or Rev.io checkout after API proof.
3. Add policy pages: privacy policy, terms, refund, and shipping policy.
4. Set shipping for the physical phones.
5. Confirm taxes and any telecom billing requirements.
6. Deploy the small server that handles CRM, order webhooks, Rev.io handoff, and `llms.txt`.
7. Replace any placeholder CRM endpoint with the real hosted `/crm/capture` URL.
8. Connect Shopify order webhooks to that server.
9. Test a real or approved test order.
10. Confirm the contact form creates a CRM lead in the hosted CRM viewer/export.
11. Turn off the storefront password only when the owner approves launch.

## What Each System Does

Shopify handles:

- Website pages
- Product photos and product details
- Cart
- Checkout if Shopify is the payment path
- Orders
- Fulfillment and tracking for shipped phones

The hosted server handles:

- Contact form records
- CRM viewer and CSV export
- Shopify order webhook capture
- Rev.io handoff
- Automatic raw Markdown `llms.txt` routes

Rev.io handles, once the API person wires it:

- Customer/service/billing records
- Rev.io products and packages
- Rev.io-hosted payment or billing flow, if that is the chosen path

## Product And Shipping Model

Physical products:

- Classic Phone: ships
- Rugged Phone: ships

Behind-the-scenes billing items:

- Monthly Service: does not ship
- Annual Service: does not ship
- Call Recording: does not ship
- Quiet Hours: does not ship
- Voicemail to Email: does not ship
- Auto Attendant: does not ship
- Add-on Bundle: does not ship
- Patriot Package: does not ship as its own separate box

Only the phones are shipped.

## Where To Edit Normal Store Content

Business owners should use Shopify Admin for normal edits:

- Products: names, descriptions, prices, photos, image alt text
- Theme Editor: homepage copy, video, logos, buttons, sections
- Pages: FAQ, Contact, policies
- Navigation: menus and footer links
- Orders: fulfillment, tracking, customer details

Developers should edit the repo for:

- Theme code
- Custom cart/order logic
- CRM/server code
- Rev.io handoff code
- Audit scripts

## Important Docs

Use these based on what you are doing:

- `CLIENT_HANDOFF_PACKET.md` - send this to the client as the main launch handoff packet
- `SOW_SCOPE_REVIEW.md` - compares the finished build and remaining launch tasks against the original SOW
- `GO_LIVE_RUNBOOK.md` - launch checklist and owner/developer sequence
- `store-setup/LAUNCH_CHECKLIST.md` - Shopify admin checklist
- `REVIO_INTEGRATION_HANDOFF.md` - what the Rev.io API implementer needs
- `ops/README.md` - how to host the CRM/Rev.io/llms server
- `independence-phone-theme/THEME_EDITOR_GUIDE.md` - where to edit theme content
- `spec.md` - full issue list, proof steps, and quality definition

## Developer Appendix

Run local proof before pushing changes:

```bash
cd /Users/vilovieta/Documents/Shopify
npm run verify:local
```

Check launch readiness against the live Shopify store:

```bash
cd /Users/vilovieta/Documents/Shopify
SHOPIFY_STORE=jordan-mark-premier.myshopify.com SHOPIFY_USE_CLI_SESSION=1 npm run launch:readiness
```

Push the theme only after reviewing the target theme:

```bash
shopify theme push --store jordan-mark-premier.myshopify.com --theme 150479208517 --path independence-phone-theme
```

Publish only after owner approval:

```bash
shopify theme publish --store jordan-mark-premier.myshopify.com --theme 150479208517
```

Do not commit secrets. Do not put Rev.io credentials in Shopify Liquid, JavaScript, or Theme Editor settings.
