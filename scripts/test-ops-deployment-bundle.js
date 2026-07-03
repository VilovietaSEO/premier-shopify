#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { buildBundle, optionalEnv, requiredEnv, requiredFiles } = require('./build-ops-deployment-bundle');

const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'tmp', 'ops-deployment-bundle-test');
fs.rmSync(outputDir, { recursive: true, force: true });

const manifest = buildBundle({ outputDir });

assert.equal(manifest.service, 'patriot-phone-storefront-ops');
assert.equal(manifest.entrypoint, 'ops/storefront-ops-server.js');
assert.equal(manifest.shopifyOrderWebhookPath, '/crm/shopify/orders/create');
assert.equal(manifest.orderBackfillPath, '/crm/orders/import');
assert.equal(manifest.revioCheckoutPath, '/revio/checkout');
assert.equal(manifest.llmsRootPath, '/llms.txt');

for (const relativePath of requiredFiles) {
  assert.equal(fs.existsSync(path.join(outputDir, relativePath)), true, `${relativePath} should exist in bundle`);
}

for (const envLine of requiredEnv) {
  assert.equal(manifest.requiredEnv.includes(envLine), true, `${envLine} should be listed in manifest`);
}
for (const envLine of optionalEnv) {
  assert.equal(manifest.optionalEnv.includes(envLine), true, `${envLine} should be listed as optional in manifest`);
}

const deploymentReadme = fs.readFileSync(path.join(outputDir, 'DEPLOYMENT.md'), 'utf8');
assert.match(deploymentReadme, /CRM_VIEWER_TOKEN=<staff-token>/);
assert.match(deploymentReadme, /SHOPIFY_ORDER_WEBHOOK_SECRET=<Shopify order webhook signing secret>/);
assert.match(deploymentReadme, /CRM_LEAD_WEBHOOK_URLS=https:\/\/hooks\.example\.com\/leads/);
assert.match(deploymentReadme, /REVIO_CHECKOUT_WEBHOOK_URLS=https:\/\/hooks\.example\.com\/revio-checkout/);
assert.match(deploymentReadme, /crm\.lead\.created/);
assert.match(deploymentReadme, /crm\.sale\.created/);
assert.match(deploymentReadme, /revio\.checkout\.requested/);
assert.match(deploymentReadme, /https:\/\/OPS_HOST\/crm\/capture/);
assert.match(deploymentReadme, /https:\/\/OPS_HOST\/crm\/shopify\/orders\/create/);
assert.match(deploymentReadme, /https:\/\/OPS_HOST\/revio\/checkout/);
assert.match(deploymentReadme, /npm run ops:deployment:audit/);

const manifestFromDisk = JSON.parse(fs.readFileSync(path.join(outputDir, 'deployment-manifest.json'), 'utf8'));
assert.equal(manifestFromDisk.files.length, requiredFiles.length + 1);
assert.equal(manifestFromDisk.requiredEnv.includes('NODE_ENV=production'), true);
assert.equal(manifestFromDisk.optionalEnv.includes('CRM_WEBHOOK_SECRET=<long random outbound signing secret>'), true);
assert.equal(manifestFromDisk.optionalEnv.includes('REVIO_CHECKOUT_WEBHOOK_URLS=https://hooks.example.com/revio-checkout'), true);

console.log('Ops deployment bundle proof passed: runtime files, env requirements, optional outbound webhook settings, Rev.io handoff path, webhook paths, and proof commands verified.');
