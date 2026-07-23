#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  extractSetupRows,
  runCli,
  setupRowsToCsv,
} = require('../orders/setup-export');

const root = path.resolve(__dirname, '..');
const inputPath = path.join(root, 'tmp/order-setup-export-test-input.json');
const outputPath = path.join(root, 'tmp/order-setup-export-test-output.csv');
fs.mkdirSync(path.dirname(inputPath), { recursive: true });
fs.rmSync(outputPath, { force: true });

const billingProperties = ({
  setupId,
  role,
  name,
  value,
  cents,
  cadence = 'monthly',
  savings = '',
}) => ({
  'Future charge': value,
  'Billing starts': 'First day of the following month',
  ...(savings ? { Savings: savings } : {}),
  _setup_id: setupId,
  _order_contract: 'deferred-billing-v2',
  _setup_parent: 'true',
  _setup_role: role,
  _setup_billing_name: name,
  _setup_billing_value: value,
  _setup_future_charge_cents: String(cents),
  _setup_billing_cadence: cadence,
  _setup_first_bill_rule: 'first_day_of_next_month',
});

const phoneProperties = (setupId, phone) => ({
  Phone: phone,
  _setup_id: setupId,
  _setup_role: 'phone',
  _order_contract: 'deferred-billing-v2',
});

const sample = {
  orders: [
    {
      id: 101,
      name: '#1001',
      created_at: '2026-06-30T20:45:00-06:00',
      email: 'rugged.annual@example.com',
      financial_status: 'paid',
      fulfillment_status: 'unfulfilled',
      line_items: [
        {
          title: 'Add-on Bundle',
          sku: 'PP-ADDON-BUNDLE',
          quantity: 2,
          price: '0.00',
          properties: billingProperties({
            setupId: 'setup-annual',
            role: 'addon_bundle',
            name: 'Add-on Bundle',
            value: '$10/mo',
            cents: 1000,
            savings: 'Save $10/mo',
          }),
        },
        {
          title: 'Rugged Phone',
          sku: 'PP-RUGGED-PHONE',
          quantity: 2,
          properties: phoneProperties('setup-annual', 'Rugged Phone - $150'),
        },
        {
          title: 'Annual Service',
          sku: 'PP-ANNUAL-SERVICE',
          quantity: 2,
          price: '0.00',
          properties: billingProperties({
            setupId: 'setup-annual',
            role: 'service',
            name: 'Service plan',
            value: '$200/yr',
            cents: 20000,
            cadence: 'annual',
            savings: 'Save $13.12/yr',
          }),
        },
      ],
    },
    {
      id: 102,
      name: '#1002',
      created_at: '2026-06-30T21:10:00-06:00',
      customer: { email: 'distinct.setups@example.com' },
      displayFinancialStatus: 'AUTHORIZED',
      displayFulfillmentStatus: 'UNFULFILLED',
      line_items: [
        {
          title: 'Voicemail to Email',
          sku: 'PP-ADDON-VOICEMAIL-TO-EMAIL',
          quantity: 1,
          price: '0.00',
          properties: billingProperties({
            setupId: 'setup-monthly',
            role: 'addon',
            name: 'Voicemail to Email',
            value: '$5/mo',
            cents: 500,
          }),
        },
        {
          title: 'Classic Phone',
          sku: 'PP-CLASSIC-PHONE',
          quantity: 1,
          properties: phoneProperties('setup-monthly', 'Classic Phone - $100'),
        },
        {
          title: 'Monthly Service',
          sku: 'PP-MONTHLY-SERVICE',
          quantity: 1,
          price: '0.00',
          properties: billingProperties({
            setupId: 'setup-monthly',
            role: 'service',
            name: 'Service plan',
            value: '$17.76/mo',
            cents: 1776,
          }),
        },
        {
          title: 'Call Recording',
          sku: 'PP-ADDON-CALL-RECORDING',
          quantity: 1,
          price: '0.00',
          properties: billingProperties({
            setupId: 'setup-monthly',
            role: 'addon',
            name: 'Call Recording',
            value: '$5/mo',
            cents: 500,
          }),
        },
        {
          title: 'Rugged Phone',
          sku: 'PP-RUGGED-PHONE',
          quantity: 1,
          properties: phoneProperties('setup-missing', 'Rugged Phone - $150'),
        },
        {
          title: 'Auto Attendant',
          sku: 'PP-ADDON-AUTO-ATTENDANT',
          quantity: 1,
          price: '0.00',
          properties: billingProperties({
            setupId: 'orphan-setup',
            role: 'addon',
            name: 'Auto Attendant',
            value: '$5/mo',
            cents: 500,
          }),
        },
      ],
    },
  ],
};

const rows = extractSetupRows(sample);
assert.equal(rows.length, 3);

assert.equal(rows[0].order_name, '#1001');
assert.equal(rows[0].line_item_title, 'Rugged Phone');
assert.equal(rows[0].quantity, 2);
assert.equal(rows[0].phone, 'Rugged Phone - $150');
assert.equal(rows[0].service_plan, 'Annual Service - $200/yr (Save $13.12/yr)');
assert.equal(rows[0].add_on_bundle, 'Add-on Bundle - $10/mo (Save $10/mo)');
assert.match(rows[0].setup_summary, /Annual Service/);
assert.match(rows[0].setup_summary, /Add-on Bundle/);

assert.equal(rows[1].order_name, '#1002');
assert.equal(rows[1].line_item_title, 'Classic Phone');
assert.equal(rows[1].service_plan, 'Monthly Service - $17.76/mo');
assert.equal(rows[1].call_recording, '$5/mo');
assert.equal(rows[1].voicemail_to_email, '$5/mo');
assert.equal(rows[1].auto_attendant, '');
assert.equal(rows[1].add_on_bundle, '');
assert.equal(Object.prototype.hasOwnProperty.call(rows[1], 'patriot_package'), false);

assert.equal(rows[2].line_item_title, 'Rugged Phone');
assert.equal(rows[2].service_plan, 'Missing service selection');
assert.equal(rows[2].auto_attendant, '');
assert.match(rows[2].setup_summary, /Missing service selection/);
assert.equal(rows.some((row) => row.sku === 'PP-ADDON-AUTO-ATTENDANT'), false);

const csv = setupRowsToCsv(rows);
assert.match(csv, /order_id,order_name,created_at/);
assert.match(csv, /rugged.annual@example.com/);
assert.match(csv, /distinct.setups@example.com/);
assert.match(csv, /Call Recording/);
assert.match(csv, /Save \$13\.12\/yr/);
assert.match(csv, /Missing service selection/);
assert.doesNotMatch(csv, /patriot_package/);
assert.doesNotMatch(csv, /Patriot Package/);
assert.doesNotMatch(csv, /PP-MONTHLY-SERVICE/);
assert.doesNotMatch(csv, /PP-ADDON-BUNDLE/);
assert.doesNotMatch(csv, /PP-ADDON-AUTO-ATTENDANT/);

const graphQlRows = extractSetupRows({
  data: {
    orders: {
      nodes: [
        {
          id: 'gid://shopify/Order/103',
          name: '#1003',
          createdAt: '2026-06-30T22:30:00Z',
          customer: {
            email: 'graphql.parent@example.com',
          },
          displayFinancialStatus: 'PAID',
          displayFulfillmentStatus: 'UNFULFILLED',
          lineItems: {
            nodes: [
              {
                name: 'Classic Phone',
                quantity: 3,
                variant: {
                  sku: 'PP-CLASSIC-PHONE',
                },
                customAttributes: [
                  { key: 'Phone', value: 'Classic Phone - $100' },
                  { key: '_setup_id', value: 'graphql-setup' },
                  { key: '_setup_role', value: 'phone' },
                  { key: '_order_contract', value: 'deferred-billing-v2' },
                ],
              },
              {
                name: 'Monthly Service',
                quantity: 3,
                variant: {
                  sku: 'PP-MONTHLY-SERVICE',
                },
                customAttributes: [
                  ...Object.entries(billingProperties({
                    setupId: 'graphql-setup',
                    role: 'service',
                    name: 'Service plan',
                    value: '$17.76/mo',
                    cents: 1776,
                  })).map(([key, value]) => ({ key, value })),
                ],
              },
              {
                name: 'Quiet Hours',
                quantity: 3,
                variant: {
                  sku: 'PP-ADDON-FAMILY-QUIET-HOURS',
                },
                customAttributes: [
                  ...Object.entries(billingProperties({
                    setupId: 'graphql-setup',
                    role: 'addon',
                    name: 'Quiet Hours',
                    value: '$5/mo',
                    cents: 500,
                  })).map(([key, value]) => ({ key, value })),
                ],
              },
            ],
          },
        },
      ],
    },
  },
});
assert.equal(graphQlRows.length, 1);
assert.equal(graphQlRows[0].order_name, '#1003');
assert.equal(graphQlRows[0].line_item_title, 'Classic Phone');
assert.equal(graphQlRows[0].sku, 'PP-CLASSIC-PHONE');
assert.equal(graphQlRows[0].quantity, 3);
assert.equal(graphQlRows[0].service_plan, 'Monthly Service - $17.76/mo');
assert.equal(graphQlRows[0].family_quiet_hours, '$5/mo');
assert.equal(graphQlRows[0].policy_agreement, '');

const legacyRows = extractSetupRows({
  id: 104,
  name: '#1004',
  line_items: [
    {
      title: 'Classic Phone',
      quantity: 4,
      properties: [
        { name: 'Phone', value: 'Classic Phone - $100' },
        { name: 'Service plan', value: 'Monthly service - $17.76/mo' },
        { name: 'Voicemail to Email', value: 'Legacy add-on' },
        { name: 'Policy agreement', value: 'Legacy line-level agreement' },
      ],
    },
  ],
});
assert.equal(legacyRows.length, 1);
assert.equal(legacyRows[0].quantity, 4);
assert.equal(legacyRows[0].service_plan, 'Monthly service - $17.76/mo');
assert.equal(legacyRows[0].voicemail_to_email, 'Legacy add-on');
assert.equal(legacyRows[0].policy_agreement, 'Legacy line-level agreement');

const precedenceRows = extractSetupRows({
  id: 105,
  name: '#1005',
  note_attributes: [
    { name: 'Policy agreement', value: 'Order-level agreement' },
  ],
  line_items: [
    {
      title: 'Classic Phone',
      properties: [
        { name: 'Phone', value: 'Classic Phone - $100' },
        { name: 'Service plan', value: 'Annual service - $200/yr' },
        { name: 'Policy agreement', value: 'Legacy line-level agreement' },
      ],
    },
  ],
});
assert.equal(precedenceRows.length, 1);
assert.equal(precedenceRows[0].policy_agreement, 'Order-level agreement');

fs.writeFileSync(inputPath, JSON.stringify(sample, null, 2));
runCli([inputPath], { ORDER_SETUP_EXPORT_OUTPUT: outputPath });
const writtenCsv = fs.readFileSync(outputPath, 'utf8');
assert.equal(writtenCsv, csv);

console.log('Order setup export proof passed: v2 setup groups, canonical billing children, GraphQL attributes, quantities, orphan handling, missing service, and legacy fallback normalize to one row per phone.');
