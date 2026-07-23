#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { createServer } = require('../ops/storefront-ops-server');
const {
  buildLead,
  buildOrderPayload,
  buildShopifyWebhookOrder,
  runAudit,
} = require('./audit-ops-deployment');

const root = path.resolve(__dirname, '..');
const storagePath = path.join(root, 'tmp/ops-deployment-audit-test-submissions.jsonl');
const outputPath = path.join(root, 'tmp/ops-deployment-audit-test.json');
fs.rmSync(storagePath, { force: true });
fs.rmSync(outputPath, { force: true });

function assertDeferredBillingFixture(order, expectedSkus) {
  assert.deepEqual(order.line_items.map((line) => line.sku), expectedSkus);
  assert.equal(order.line_items[0].properties._setup_role, 'phone');
  assert.equal(order.line_items[0].properties._order_contract, 'deferred-billing-v2');
  assert.equal(order.line_items[0].properties['Service plan'], undefined);
  assert.equal(order.line_items[0].properties['Add-on Bundle'], undefined);

  const setupId = order.line_items[0].properties._setup_id;
  for (const line of order.line_items.slice(1)) {
    assert.equal(line.price, '0.00');
    assert.equal(line.properties._setup_id, setupId);
    assert.equal(line.properties._setup_parent, 'true');
    assert.equal(line.properties._order_contract, 'deferred-billing-v2');
    assert.match(line.properties._setup_billing_name, /\S/);
    assert.match(line.properties._setup_billing_value, /^\$/);
    assert.match(line.properties._setup_future_charge_cents, /^[1-9]\d*$/);
    assert.match(line.properties._setup_billing_cadence, /^(monthly|annual)$/);
    assert.equal(line.properties._setup_first_bill_rule, 'first_day_of_next_month');
    assert.equal(line.properties['Billing starts'], 'First day of the following month');
  }

  const serialized = JSON.stringify(order);
  assert.doesNotMatch(serialized, /Patriot Package/i);
  assert.doesNotMatch(serialized, /Policy agreement|Privacy Policy and Terms and Conditions/i);
}

async function main() {
  const lead = buildLead(new URL('https://jordan-mark-premier.myshopify.com'), 'fixture-proof');
  const leadKeys = [...lead.keys()];
  assert.equal(leadKeys.some((key) => /Patriot Package/i.test(key)), false);
  for (const retiredField of [
    'contact[Child age range]',
    'contact[Main use case]',
    'contact[Interested product]',
    'contact[Preferred service plan]',
    'contact[Selected add-ons]',
    'contact[Marketing opt-in]',
    'contact[Privacy and terms consent]',
  ]) {
    assert.equal(leadKeys.includes(retiredField), false);
  }
  for (const visibleField of [
    'contact[name]',
    'contact[email]',
    'contact[phone]',
    'contact[body]',
  ]) {
    assert.equal(leadKeys.includes(visibleField), true);
  }

  const importFixture = buildOrderPayload('fixture-import').orders[0];
  assertDeferredBillingFixture(importFixture, [
    'PP-RUGGED-PHONE',
    'PP-ANNUAL-SERVICE',
    'PP-ADDON-BUNDLE',
  ]);

  const webhookFixture = buildShopifyWebhookOrder('fixture-webhook');
  assertDeferredBillingFixture(webhookFixture, [
    'PP-CLASSIC-PHONE',
    'PP-MONTHLY-SERVICE',
    'PP-ADDON-CALL-RECORDING',
    'PP-ADDON-FAMILY-QUIET-HOURS',
    'PP-ADDON-VOICEMAIL-TO-EMAIL',
  ]);

  const server = createServer({
    crmStoragePath: storagePath,
    crmViewerToken: 'test-token',
    crmOrderIngestToken: 'order-token',
    shopifyOrderWebhookSecret: 'webhook-secret',
    llmsSiteUrl: 'https://jordan-mark-premier.myshopify.com',
    llmsTimeZone: 'America/Denver',
  });

  server.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));

  try {
    const { port } = server.address();
    const report = await runAudit({
      opsBaseUrl: `http://127.0.0.1:${port}`,
      crmViewerToken: 'test-token',
      crmOrderIngestToken: 'order-token',
      shopifyOrderWebhookSecret: 'webhook-secret',
      shopifyStoreUrl: 'https://jordan-mark-premier.myshopify.com',
      outputPath,
    });

    assert.equal(report.failures.length, 0);
    assert.equal(report.health.serviceNamed, true);
    assert.equal(report.llms.length, 5);
    assert.equal(report.crm.capture.status, 303);
    assert.equal(report.crm.capture.location, 'https://jordan-mark-premier.myshopify.com/pages/contact?crm=received');
    assert.equal(report.crm.viewer.containsLead, true);
    assert.equal(report.crm.viewer.containsImportedSale, true);
    assert.equal(report.crm.viewer.containsWebhookSale, true);
    assert.equal(report.crm.viewer.exportLinkKeepsToken, true);
    assert.equal(report.crm.csv.containsLead, true);
    assert.equal(report.crm.csv.containsImportedSale, true);
    assert.equal(report.crm.csv.containsWebhookSale, true);
    assert.equal(report.crmViewerTokenStoredInProof, false);
    assert.equal(report.crmOrderIngestTokenStoredInProof, false);
    assert.equal(report.shopifyOrderWebhookSecretStoredInProof, false);

    const saved = fs.readFileSync(outputPath, 'utf8');
    assert.equal(saved.includes('test-token'), false);
    assert.equal(saved.includes('order-token'), false);
    assert.equal(saved.includes('webhook-secret'), false);
    assert.equal(saved.includes('/crm/leads?token=<redacted>'), true);
    assert.equal(saved.includes('/crm/leads.csv?token=<redacted>'), true);
    assert.equal(saved.includes('/crm/orders/import?token=<redacted>'), true);
    assert.equal(saved.includes('/crm/shopify/orders/create'), true);

    const storedRecords = fs.readFileSync(storagePath, 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    const saleTypes = storedRecords
      .filter((record) => record.fields.recordType === 'sale')
      .map((record) => record.fields.saleType)
      .sort();
    assert.deepEqual(saleTypes, ['classic_monthly_addon_sale', 'phone_setup_sale']);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  console.log('Ops deployment audit proof passed: health, CRM lead/sale import, Shopify order webhook, llms, redirects, CSV, and secret redaction verified.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
