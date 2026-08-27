# State Sales-Tax Setup Guide

Last reviewed: August 27, 2026

This guide covers the physical phone sale processed by Shopify. It does not configure telecommunications taxes on future Rev.io service bills and is not legal or tax advice.

## Last verified store state

The Shopify Admin configuration was last directly verified on August 4, 2026:

- Shopify Tax was active.
- United States showed **Not collecting** because no states had been enabled.
- Classic Phone and Rugged Phone were taxable physical products.
- Both phones used the Shopify category **Cordless Phones in Telephony**.
- Monthly Service, Annual Service, and all add-ons were non-taxable and non-shipping `$0.00` Shopify lines.

Recheck this screen before relying on the status; tax settings can change independently of the theme and GitHub repository.

## The rule

Do not enable every state. A qualified accountant or the relevant state authority must determine where the business must register. Add a state to Shopify only after the business is registered or the accountant explicitly instructs the administrator to begin collection.

Ask the accountant:

> Which states is INDEPENDENCE PHONE currently registered to collect sales tax in? Please provide each state, sales-tax registration number, effective date, and filing frequency for entry into Shopify.

For each state, retain the state name, registration number, effective date, filing schedule, and responsible filer outside the public repository.

## Enable an approved state

1. Sign in to Shopify Admin.
2. Open **Settings → Taxes and duties**.
3. Under sales-tax collection, open **United States**.
4. Choose **Collect sales tax** or **Add new state**.
5. Select only a state confirmed by the accountant.
6. Enter the state sales-tax ID when requested.
7. Review shipping-tax options with the accountant; leave Shopify's default when no different instruction exists.
8. Save and confirm the state appears in the regions where the store collects.

Shopify calculates tax after registration is configured, but the business remains responsible for registrations, correct product treatment, filing, and remittance unless it separately contracts for automated filing.

## Product check

Before testing, confirm in **Products**:

- Classic Phone and Rugged Phone remain taxable and use the correct product category.
- Physical phones require shipping.
- Monthly Service, Annual Service, and add-ons remain `$0.00`, non-shipping, and non-taxable in Shopify.

Do not use the Shopify service-line configuration to decide Rev.io telecom tax. The Rev.io implementer and tax adviser must separately configure recurring telecommunications charges.

## Test each enabled state

Do not complete a paid test order without client approval.

1. Add one Classic Phone and a service plan.
2. Enter a valid address in the enabled state at checkout.
3. Confirm the phone price and one `$15` shipping charge appear.
4. Confirm Shopify calculates tax after the address is entered.
5. Confirm the `$0.00` service and add-on lines add no tax today.
6. Repeat with the Rugged Phone.
7. When practical, test two addresses in different tax jurisdictions within the state.
8. Record the address jurisdiction, merchandise subtotal, shipping, tax, and total without exposing customer data.

If tax does not appear, verify the destination state is enabled, the full address is valid, the phone is taxable and categorized, and no override changes the result.

## Monthly administration

- Reconcile Shopify tax reports to orders and refunds.
- Give reports to the responsible accountant or filer.
- File and remit on the assigned schedule.
- Review Shopify's tax-liability insights, but do not treat them as a registration decision.
- Add, edit, or stop collection only on documented professional instruction.
- Recheck Rev.io telecom-tax reporting separately.

## Official references

- [Setting up US taxes](https://help.shopify.com/en/manual/taxes/us/us-tax-setup)
- [Shopify taxes overview](https://help.shopify.com/en/manual/taxes/)
- [Choose a tax service](https://help.shopify.com/en/manual/taxes/shopify-tax/choose-tax-service)
- [Shopify Tax pricing](https://help.shopify.com/en/manual/taxes/shopify-tax/pricing)
