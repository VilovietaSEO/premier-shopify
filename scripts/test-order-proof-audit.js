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
            { name: 'Policy agreement', value: 'Agreed to Privacy Policy and Terms and Conditions' },
          ],
        },
      ],
    },
    {
      id: 202,
      name: '#2002',
      created_at: '2026-06-30T22:20:00-06:00',
      customer: {
        email: 'package.order@example.com',
      },
      displayFinancialStatus: 'PAID',
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
            'Call Recording': 'Included in Patriot Package',
            'Quiet Hours': 'Included in Patriot Package',
            'Voicemail to Email': 'Included in Patriot Package',
            'Auto Attendant': 'Included in Patriot Package',
            'Policy agreement': 'Agreed to Privacy Policy and Terms and Conditions',
          },
        },
      ],
    },
  ],
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

const savedReport = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
assert.equal(savedReport.status, 'pass');
assert.match(JSON.stringify(savedReport), /classic_monthly_addon/);
assert.match(JSON.stringify(savedReport), /classic_patriot_package/);

const csv = fs.readFileSync(csvOutputPath, 'utf8');
assert.match(csv, /setup_summary/);
assert.match(csv, /policy_agreement/);
assert.match(csv, /classic.order@example.com/);
assert.match(csv, /package.order@example.com/);
assert.match(csv, /saves \$13.12\/yr/);
assert.match(csv, /saves \$10\/mo/);

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
assert.equal(failingReport.failures.some((failure) => /policy agreement/i.test(failure)), true);
assert.equal(failingReport.failures.some((failure) => /Patriot Package/i.test(failure)), true);

console.log('Order proof audit passed: required scenarios, setup CSV, savings, policy, and failure detection verified.');
