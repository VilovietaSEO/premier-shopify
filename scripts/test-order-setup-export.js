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

const sample = {
  orders: [
    {
      id: 101,
      name: '#1001',
      created_at: '2026-06-30T20:45:00-06:00',
      email: 'classic.parent@example.com',
      financial_status: 'pending',
      fulfillment_status: 'unfulfilled',
      line_items: [
        {
          title: 'Classic Phone',
          sku: 'PP-CLASSIC-PHONE',
          quantity: 1,
          properties: [
            { name: 'Phone', value: 'Classic Phone - $100' },
            { name: 'Service plan', value: 'Monthly service - $17.76/mo' },
            { name: 'Call Recording', value: '$5/mo' },
            { name: 'Policy agreement', value: 'Agreed to Privacy Policy and Terms and Conditions' },
          ],
        },
        {
          title: 'Monthly Service',
          sku: 'PP-MONTHLY-SERVICE',
          quantity: 1,
          properties: [
            { name: '_setup_id', value: 'setup-1001' },
            { name: '_setup_parent', value: 'true' },
            { name: '_setup_role', value: 'service' },
            { name: '_setup_billing_name', value: 'Service plan' },
          ],
        },
      ],
    },
    {
      id: 102,
      name: '#1002',
      created_at: '2026-06-30T21:10:00-06:00',
      customer: {
        email: 'package.parent@example.com',
      },
      displayFinancialStatus: 'AUTHORIZED',
      displayFulfillmentStatus: 'UNFULFILLED',
      line_items: [
        {
          title: 'Classic Phone',
          sku: 'PP-CLASSIC-PHONE',
          quantity: 1,
          properties: {
            Phone: 'Classic Phone - $100',
            'Service plan': 'Annual service - $200/yr (saves $13.12/yr)',
            'Patriot Package': 'Patriot Package - $250; Classic Phone, 1 year phone service, and all 4 add-ons (saves $303.12)',
            'Add-on Bundle': 'Add-on Bundle - $10/mo; includes Call Recording, Quiet Hours, Voicemail to Email, and Auto Attendant (saves $10/mo)',
            'Quiet Hours': '$5/mo',
            'Voicemail to Email': '$5/mo',
            'Auto Attendant': '$5/mo',
            'Policy agreement': 'Agreed to Privacy Policy and Terms and Conditions',
          },
        },
        {
          title: 'Annual Service',
          sku: 'PP-ANNUAL-SERVICE',
          quantity: 1,
          properties: {
            _setup_id: 'setup-1002',
            _setup_parent: 'true',
            _setup_role: 'service',
            _setup_billing_name: 'Service plan',
          },
        },
        {
          title: 'Add-on Bundle',
          sku: 'PP-ADDON-BUNDLE',
          quantity: 1,
          properties: {
            _setup_id: 'setup-1002',
            _setup_parent: 'true',
            _setup_role: 'addon_bundle',
            _setup_billing_name: 'Add-on Bundle',
          },
        },
      ],
    },
  ],
};

const rows = extractSetupRows(sample);
assert.equal(rows.length, 2);

assert.equal(rows[0].order_name, '#1001');
assert.equal(rows[0].line_item_title, 'Classic Phone');
assert.equal(rows[0].phone, 'Classic Phone - $100');
assert.equal(rows[0].service_plan, 'Monthly service - $17.76/mo');
assert.equal(rows[0].call_recording, '$5/mo');
assert.match(rows[0].setup_summary, /Policy agreement/);

assert.equal(rows[1].order_name, '#1002');
assert.equal(rows[1].line_item_title, 'Classic Phone');
assert.match(rows[1].patriot_package, /Patriot Package/);
assert.match(rows[1].add_on_bundle, /Voicemail to Email/);
assert.equal(rows[1].family_quiet_hours, '$5/mo');
assert.equal(rows[1].voicemail_to_email, '$5/mo');
assert.equal(rows[1].auto_attendant, '$5/mo');
assert.match(rows[1].setup_summary, /Annual service/);
assert.match(rows[1].setup_summary, /Auto Attendant/);

const csv = setupRowsToCsv(rows);
assert.match(csv, /order_id,order_name,created_at/);
assert.match(csv, /classic.parent@example.com/);
assert.match(csv, /package.parent@example.com/);
assert.match(csv, /Call Recording/);
assert.match(csv, /Quiet Hours/);
assert.match(csv, /Policy agreement/);
assert.doesNotMatch(csv, /PP-MONTHLY-SERVICE/);
assert.doesNotMatch(csv, /PP-ADDON-BUNDLE/);

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
                quantity: 1,
                variant: {
                  sku: 'PP-CLASSIC-PHONE',
                },
                customAttributes: [
                  { key: 'Phone', value: 'Classic Phone - $100' },
                  { key: 'Service plan', value: 'Monthly service - $17.76/mo' },
                  { key: 'Voicemail to Email', value: '$5/mo' },
                  { key: 'Policy agreement', value: 'Agreed to Privacy Policy and Terms and Conditions' },
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
assert.equal(graphQlRows[0].voicemail_to_email, '$5/mo');

fs.writeFileSync(inputPath, JSON.stringify(sample, null, 2));
runCli([inputPath], { ORDER_SETUP_EXPORT_OUTPUT: outputPath });
const writtenCsv = fs.readFileSync(outputPath, 'utf8');
assert.equal(writtenCsv, csv);

console.log('Order setup export proof passed: setup properties normalize to staff-readable CSV.');
