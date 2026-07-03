#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { createServer } = require('../ops/storefront-ops-server');
const { runAudit } = require('./audit-ops-deployment');

const root = path.resolve(__dirname, '..');
const storagePath = path.join(root, 'tmp/ops-deployment-audit-test-submissions.jsonl');
const outputPath = path.join(root, 'tmp/ops-deployment-audit-test.json');
fs.rmSync(storagePath, { force: true });
fs.rmSync(outputPath, { force: true });

async function main() {
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
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  console.log('Ops deployment audit proof passed: health, CRM lead/sale import, Shopify order webhook, llms, redirects, CSV, and secret redaction verified.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
