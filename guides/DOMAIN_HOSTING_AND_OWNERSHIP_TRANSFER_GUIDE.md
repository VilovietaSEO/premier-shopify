# Domain, Hosting, and Ownership Transfer Guide

Last reviewed: August 27, 2026

The INDEPENDENCE PHONE storefront is a Shopify theme. Moving administration to the client's accounts does not require rebuilding or self-hosting the storefront.

## Recommended ownership model

- Shopify continues hosting the storefront and checkout.
- The client becomes or remains Shopify store owner.
- The client owns the custom domain and DNS account.
- The client controls the branded Sender email and its DNS authentication.
- The client organization owns or has administrator access to the GitHub repository.
- The client owns the hosting account for the optional operations bridge, Rev.io handoff, CRM, and other server-side routes.
- Developers use named Shopify collaborator/user access and named GitHub access, not shared passwords.

If “move this to their own hosted website” means leaving Shopify completely, that is a new migration project. A Shopify theme cannot simply be copied to generic web hosting and retain Shopify products, cart, checkout, Admin, or Theme Editor behavior.

## Connect the client's domain to Shopify

Connecting is normally the lowest-risk option because the domain stays with its current registrar while DNS points the storefront to Shopify.

1. Confirm who owns the registrar account and who can edit DNS.
2. Export or screenshot the current DNS zone, including email records.
3. In Shopify Admin, open **Settings → Domains** and choose to connect an existing domain.
4. Follow the exact DNS records Shopify displays for that domain.
5. Do not delete MX, DKIM, SPF, DMARC, verification, or unrelated subdomain records.
6. Wait for Shopify to verify the connection and issue SSL.
7. Set the intended primary domain and redirect the other storefront domains to it.
8. Verify homepage, Order Now, cart, FAQ, Contact, policies, and checkout on the custom domain.

Shopify recommends connecting first when uncertain. Registrar transfer can happen later and can take longer.

## Transfer the Shopify store to the client

Only the current store owner can change or transfer ownership.

Before transfer:

- Confirm inventory, orders, theme, notifications, domains, and billing are current.
- Export any financial, billing, payout, and order records the current owner must retain.
- Add the new owner as a user when using the existing-user ownership path.
- Update store contact, billing, payout, tax, domain, app, and third-party provider information to client-controlled details.
- Inventory all apps and external contracts, including Rev.io and the operations bridge.
- Confirm who will pay outstanding Shopify and app charges.

Then use Shopify's current ownership workflow under **Settings → Users** for an existing user or **Settings → General** for a transfer outside the business. The recipient must accept the transfer. After acceptance, review every user's permissions and remove obsolete access.

## Transfer GitHub administration

1. Create or select a client-owned GitHub organization or repository.
2. Add at least two client-controlled administrators when possible.
3. Transfer the repository or mirror it to the approved client location.
4. Confirm `main` contains the current README, guides, and only one canonical theme directory: `independence-phone-theme/`.
5. Reconfigure branch protection, deploy keys, Actions secrets, webhooks, and integrations in the client-owned location.
6. Clone the transferred repository into a clean directory and run the documented checks.
7. Remove old users and credentials only after the client proves access and a rollback copy exists.

GitHub is the version history for the live theme snapshot; it does not host the Shopify storefront and a Git push does not publish a Shopify theme.

## Transfer the server-side hosting

The operations bridge is separate from Shopify theme hosting. For any `/revio`, `/crm`, webhook, or similar server route:

1. Create the production project in the client's hosting account.
2. Move source code through Git, not by copying secrets.
3. Re-enter secrets in the client's encrypted secret manager.
4. Configure the custom subdomain and TLS.
5. Restrict allowed origins and validate Shopify/App Proxy signatures as applicable.
6. Test health, authentication rejection, signed Shopify evidence, Rev.io sandbox behavior, logs, backups, and alerts.
7. Switch DNS or endpoint settings only after the client-owned deployment passes.
8. Keep the previous deployment available for rollback until production proof is complete.
9. Rotate old credentials and remove the previous account's access after cutover.

## Handoff acceptance checklist

- Client can sign in as Shopify store owner.
- Client controls billing, payouts, tax settings, users, domains, and notifications.
- Custom domain resolves securely and email DNS still works.
- Client can administer the GitHub repository and clone it.
- GitHub contains the same deployable theme files as the live Shopify theme.
- Client controls Rev.io, gateway, hosting, logs, alerts, and secrets.
- An approved test proves storefront → payment → Rev.io → fulfillment/reconciliation, or the handoff explicitly records which integration remains incomplete.
- Rollback owners and steps are written down.
- Agency/developer access is reduced to the approved continuing role.

## Official references

- [Connect versus transfer a domain to Shopify](https://help.shopify.com/en/manual/domains/add-a-domain/connecting-domains/connect-vs-transfer)
- [Change or transfer Shopify ownership](https://help.shopify.com/en/manual/your-account/manage-orgs-and-stores/change-transfer-ownership)
- [Manage Shopify users](https://help.shopify.com/en/manual/your-account/users)
- [Manage Shopify themes](https://help.shopify.com/en/manual/online-store/themes/managing-themes)
