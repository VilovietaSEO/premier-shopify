#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { runAudit } = require('./audit-order-proof');

const root = path.resolve(__dirname, '..');
const outputPath = path.join(root, 'tmp/order-proof-audit-test.json');
const csvOutputPath = path.join(root, 'tmp/order-proof-audit-test.csv');
fs.rmSync(outputPath, { force: true });
fs.rmSync(csvOutputPath, { force: true });

function visibleProperties(futureCharge) {
  return [
    { name: 'Future charge', value: futureCharge },
    { name: 'Billing starts', value: 'First day of the following month' },
  ];
}

const sampleOrders = {
  orders: [
    {
      id: 201,
      name: '#2001',
      created_at: '2026-06-30T22:00:00-06:00',
      email: 'classic.order@example.com',
      financial_status: 'paid',
      fulfillment_status: 'unfulfilled',
      line_items: [
        {
          title: 'Classic Phone',
          sku: 'PP-CLASSIC-PHONE',
          quantity: 1,
          properties: [
            { name: 'Phone', value: 'Classic Phone - $100' },
            { name: 'Service plan', value: 'Monthly service - $17.76/mo' },
            { name: 'Voicemail to Email', value: '$5/mo' },
            { name: '_setup_id', value: 'setup-classic' },
            { name: '_setup_role', value: 'phone' },
            { name: '_order_contract', value: 'deferred-billing-v2' },
          ],
        },
        {
          title: 'Monthly Service',
          sku: 'PP-MONTHLY-SERVICE',
          quantity: 1,
          price: '0.00',
          properties: [
            ...visibleProperties('$17.76/mo'),
            { name: '_setup_id', value: 'setup-classic' },
            { name: '_setup_parent', value: 'true' },
            { name: '_setup_role', value: 'service' },
            { name: '_setup_future_charge_cents', value: '1776' },
            { name: '_setup_billing_cadence', value: 'monthly' },
            { name: '_setup_first_bill_rule', value: 'first_day_of_next_month' },
          ],
        },
        {
          title: 'Voicemail to Email',
          sku: 'PP-ADDON-VOICEMAIL-TO-EMAIL',
          quantity: 1,
          price: '0.00',
          properties: [
            ...visibleProperties('$5.00/mo'),
            { name: '_setup_id', value: 'setup-classic' },
            { name: '_setup_parent', value: 'true' },
            { name: '_setup_role', value: 'addon' },
            { name: '_setup_future_charge_cents', value: '500' },
            { name: '_setup_billing_cadence', value: 'monthly' },
            { name: '_setup_first_bill_rule', value: 'first_day_of_next_month' },
          ],
        },
      ],
    },
    {
      id: 202,
      name: '#2002',
      created_at: '2026-06-30T22:20:00-06:00',
      customer: {
        email: 'rugged.order@example.com',
      },
      displayFinancialStatus: 'PAID',
      displayFulfillmentStatus: 'UNFULFILLED',
      line_items: [
        {
          title: 'Rugged Phone',
          sku: 'PP-RUGGED-PHONE',
          quantity: 1,
          properties: {
            Phone: 'Rugged Phone - $150',
            'Service plan': 'Annual service - $200/yr (saves $13.12/yr)',
            'Add-on Bundle': 'Add-on Bundle - $10/mo; includes Call Recording, Quiet Hours, Voicemail to Email, and Auto Attendant (saves $10/mo)',
            _setup_id: 'setup-rugged',
            _setup_role: 'phone',
            _order_contract: 'deferred-billing-v2',
          },
        },
        {
          title: 'Annual Service',
          sku: 'PP-ANNUAL-SERVICE',
          quantity: 1,
          price: '0.00',
          properties: [
            ...visibleProperties('$200.00/yr'),
            { name: '_setup_id', value: 'setup-rugged' },
            { name: '_setup_parent', value: 'true' },
            { name: '_setup_role', value: 'service' },
            { name: '_setup_future_charge_cents', value: '20000' },
            { name: '_setup_billing_cadence', value: 'annual' },
            { name: '_setup_first_bill_rule', value: 'first_day_of_next_month' },
          ],
        },
        {
          title: 'Add-on Bundle',
          sku: 'PP-ADDON-BUNDLE',
          quantity: 1,
          price: '0.00',
          properties: [
            ...visibleProperties('$10.00/mo'),
            { name: '_setup_id', value: 'setup-rugged' },
            { name: '_setup_parent', value: 'true' },
            { name: '_setup_role', value: 'addon_bundle' },
            { name: '_setup_future_charge_cents', value: '1000' },
            { name: '_setup_billing_cadence', value: 'monthly' },
            { name: '_setup_first_bill_rule', value: 'first_day_of_next_month' },
          ],
        },
      ],
    },
  ],
  revio_checkout_payload: {
    schema: 'independence_phone.revio_checkout.v2',
    source: 'shopify-theme-cart',
    consent: {
      collection_status: 'pending_checkout',
      privacy_terms_accepted: null,
    },
    customer: {
      desired_area_code: null,
      desired_area_code_collection_status: 'required_at_checkout',
    },
    cart: {
      immediate_subtotal_cents: 25000,
      flat_shipping_cents: 1500,
      tax_cents: null,
      tax_status: 'calculated_after_address',
      due_today_before_tax_cents: 26500,
      future_charge_cents: 23276,
    },
    setup_count: 2,
    lines: [
      {
        role: 'phone',
        title: 'Classic Phone',
        quantity: 1,
        checkout_price_cents: 10000,
        checkout_line_price_cents: 10000,
        future_charge_cents: 0,
        future_line_charge_cents: 0,
        visible_properties: [],
      },
      {
        role: 'service',
        title: 'Monthly Service',
        quantity: 1,
        checkout_price_cents: 0,
        checkout_line_price_cents: 0,
        future_charge_cents: 1776,
        future_line_charge_cents: 1776,
        billing_cadence: 'monthly',
        first_bill_rule: 'first_day_of_next_month',
        visible_properties: visibleProperties('$17.76/mo'),
      },
      {
        role: 'addon',
        title: 'Voicemail to Email',
        quantity: 1,
        checkout_price_cents: 0,
        checkout_line_price_cents: 0,
        future_charge_cents: 500,
        future_line_charge_cents: 500,
        billing_cadence: 'monthly',
        first_bill_rule: 'first_day_of_next_month',
        visible_properties: visibleProperties('$5.00/mo'),
      },
      {
        role: 'phone',
        title: 'Rugged Phone',
        quantity: 1,
        checkout_price_cents: 15000,
        checkout_line_price_cents: 15000,
        future_charge_cents: 0,
        future_line_charge_cents: 0,
        visible_properties: [],
      },
      {
        role: 'service',
        title: 'Annual Service',
        quantity: 1,
        checkout_price_cents: 0,
        checkout_line_price_cents: 0,
        future_charge_cents: 20000,
        future_line_charge_cents: 20000,
        billing_cadence: 'annual',
        first_bill_rule: 'first_day_of_next_month',
        visible_properties: visibleProperties('$200.00/yr'),
      },
      {
        role: 'addon_bundle',
        title: 'Add-on Bundle',
        quantity: 1,
        checkout_price_cents: 0,
        checkout_line_price_cents: 0,
        future_charge_cents: 1000,
        future_line_charge_cents: 1000,
        billing_cadence: 'monthly',
        first_bill_rule: 'first_day_of_next_month',
        visible_properties: visibleProperties('$10.00/mo'),
      },
    ],
  },
};

const report = runAudit({
  input: sampleOrders,
  outputPath,
  csvOutputPath,
});

assert.equal(report.status, 'pass');
assert.equal(report.failures.length, 0);
assert.equal(report.rowsChecked, 2);
assert.equal(report.scenarios.length, 2);
assert.equal(report.scenarios.every((scenario) => scenario.status === 'pass'), true);
assert.equal(report.csvColumnsVerified, true);
assert.equal(report.deferredBillingContract.status, 'pass');
assert.equal(report.deferredBillingContract.schema, 'independence_phone.revio_checkout.v2');
assert.equal(report.deferredBillingContract.zeroDollarBillingLinesVerified, true);
assert.equal(report.deferredBillingContract.futureMetadataVerified, true);
assert.equal(report.deferredBillingContract.flatShippingCents, 1500);
assert.equal(report.deferredBillingContract.dueTodayBeforeTaxCents, 26500);
assert.equal(report.deferredBillingContract.futureChargeCents, 23276);
assert.equal(report.deferredBillingContract.totalsSeparated, true);
assert.equal(report.deferredBillingContract.consentCollectionStatus, 'pending_checkout');
assert.equal(report.deferredBillingContract.desiredAreaCodeCollectionStatus, 'required_at_checkout');

const savedReport = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
assert.equal(savedReport.status, 'pass');
assert.match(JSON.stringify(savedReport), /classic_monthly_addon/);
assert.match(JSON.stringify(savedReport), /rugged_annual_bundle/);

const csv = fs.readFileSync(csvOutputPath, 'utf8');
assert.match(csv, /setup_summary/);
assert.match(csv, /classic.order@example.com/);
assert.match(csv, /rugged.order@example.com/);
assert.match(csv, /saves \$13.12\/yr/);
assert.match(csv, /saves \$10\/mo/);
assert.doesNotMatch(csv, /Patriot Package/);
assert.doesNotMatch(csv, /Privacy Policy and Terms and Conditions/);

const failingReport = runAudit({
  input: {
    orders: [
      {
        id: 203,
        name: '#2003',
        financial_status: 'paid',
        fulfillment_status: 'unfulfilled',
        line_items: [
          {
            title: 'Classic Phone',
            properties: [
              { name: 'Phone', value: 'Classic Phone - $100' },
              { name: 'Service plan', value: 'Monthly service - $17.76/mo' },
              { name: 'Voicemail to Email', value: '$5/mo' },
            ],
          },
        ],
      },
    ],
  },
  outputPath: path.join(root, 'tmp/order-proof-audit-failing-test.json'),
  csvOutputPath: path.join(root, 'tmp/order-proof-audit-failing-test.csv'),
});

assert.equal(failingReport.status, 'fail');
assert.equal(
  failingReport.failures.some((failure) => /deferred-billing v2 checkout handoff payload is missing/i.test(failure)),
  true
);
assert.equal(failingReport.failures.some((failure) => /Rugged Phone/i.test(failure)), true);
assert.equal(failingReport.failures.some((failure) => /policy agreement/i.test(failure)), false);
assert.equal(failingReport.failures.some((failure) => /Patriot Package/i.test(failure)), false);

const pricedBillingPayload = JSON.parse(JSON.stringify(sampleOrders));
pricedBillingPayload.revio_checkout_payload.lines[1].checkout_price_cents = 1776;
pricedBillingPayload.revio_checkout_payload.lines[1].checkout_line_price_cents = 1776;
pricedBillingPayload.revio_checkout_payload.cart.immediate_subtotal_cents = 26776;
pricedBillingPayload.revio_checkout_payload.cart.due_today_before_tax_cents = 28276;
const pricedBillingReport = runAudit({
  input: pricedBillingPayload,
  outputPath: path.join(root, 'tmp/order-proof-audit-priced-billing-test.json'),
  csvOutputPath: path.join(root, 'tmp/order-proof-audit-priced-billing-test.csv'),
});
assert.equal(pricedBillingReport.status, 'fail');
assert.equal(
  pricedBillingReport.failures.some((failure) => /Monthly Service must be zero-dollar at checkout/i.test(failure)),
  true
);

console.log(
  'Order proof audit passed: active phone scenarios, zero-dollar deferred lines, v2 metadata, one $15 shipping charge, separated totals, and pending checkout fields verified.',
);
