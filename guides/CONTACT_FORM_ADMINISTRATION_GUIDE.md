# Contact Form Administration Guide

Last reviewed: August 27, 2026

The approved current contact path is Shopify's native contact form. No separate CRM is required for normal delivery.

## Current configuration

- Store page: `/pages/contact`
- Theme template: `page.contact`
- Theme section: `IP contact form`
- Visible fields: Name, Email, optional Phone Number, and “How can we Help?”
- **CRM endpoint URL:** leave blank
- Delivery destination: the Shopify **Sender email** configured in **Settings → Notifications**
- Handoff address documented for this store: `jordan@premiercompanies.com`

Shopify states that native contact-form submissions are delivered to the store's Sender email. The Sender email also appears as the customer-facing From address for store notifications, so the client must approve any change.

## Change the visible form

1. In Shopify Admin, open **Online Store → Themes**.
2. Confirm you are editing the live theme listed in the repository README.
3. Click **Customize**.
4. Open **Pages → Contact**.
5. Select **IP contact form**.
6. Edit only the requested heading, body, helper text, button label, or notes.
7. Keep **CRM endpoint URL** blank unless a separately approved and hosted CRM endpoint exists.
8. Preview desktop and mobile, then save.

Theme settings can change labels and supporting copy. Adding new durable fields or changing submission behavior is a code change and should be tested before it reaches the live theme.

## Change or verify the receiving email

1. In Shopify Admin, open **Settings → Notifications**.
2. Review **Sender email**.
3. Confirm the mailbox is controlled by the client and monitored.
4. If a branded domain is used, complete Shopify's email-domain authentication steps so messages are less likely to be rewritten or filtered.
5. Save only after the client confirms the address.

The Store email in **Settings → General** is used for Shopify account contact and exports. It is not a substitute for checking the Sender email used by the contact form.

## Approved delivery test

Do not send an external test without client approval. When approved:

1. Submit one uniquely labeled message from `/pages/contact`.
2. Confirm the success state appears in the browser.
3. Confirm the message reaches the configured Sender email inbox.
4. Check spam/junk if it does not appear.
5. Confirm Name, Email, Phone Number, and message content are readable.
6. Record the test label, submission time, delivery time, and recipient. Do not publish the customer's data.

## Optional CRM path

Use a CRM endpoint only when the client has approved the storage location, access controls, retention policy, export procedure, and hosting owner. The endpoint must be HTTPS, server-side, authenticated where appropriate, spam-resistant, and able to record a timestamp plus every submitted field.

Before entering a CRM URL in Theme Editor, test the endpoint outside production and verify its staff viewer and CSV export. Leaving the field blank safely returns the form to Shopify-native delivery.

## Troubleshooting

- **No email received:** verify the Sender email, search spam/junk, and check domain authentication.
- **Wrong recipient:** change **Settings → Notifications → Sender email** with client approval.
- **Form error:** clear an unapproved CRM endpoint and test the native path.
- **Order alerts missing:** order notifications are separate; manage them under Shopify staff notifications.
- **Need a different subject line:** Shopify does not allow changing the native contact-form email subject line.

## Official references

- [Add a Contact Us page](https://help.shopify.com/en/manual/online-store/themes/customizing-themes/common-customizations/add-contact-page)
- [Set up Shopify email](https://help.shopify.com/en/manual/intro-to-shopify/initial-setup/setup-your-email)
- [Store notifications](https://help.shopify.com/en/manual/fulfillment/setup/notifications)
