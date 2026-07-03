#!/usr/bin/env node

const assert = require('node:assert/strict');

const { buildBundle } = require('./build-ops-deployment-bundle');
const { buildReport, opsBundleChecks } = require('./audit-launch-readiness');

buildBundle();

const report = buildReport();
const bundleGroup = report.groups.find((group) => group.name === 'Ops deployment package');
assert.ok(bundleGroup, 'Ops deployment package group should exist');
assert.equal(bundleGroup.checks.length, 1);
assert.equal(bundleGroup.checks[0].status, 'pass');
assert.match(bundleGroup.checks[0].detail, /Shopify webhook/);
assert.equal(report.summary.pass >= 13, true);

const missingBundle = opsBundleChecks({
  missing: true,
  path: '/tmp/missing/deployment-manifest.json',
  data: null,
});
assert.equal(missingBundle[0].status, 'blocker');
assert.match(missingBundle[0].detail, /npm run ops:bundle/);

const invalidBundle = opsBundleChecks({
  missing: false,
  path: '/tmp/invalid/deployment-manifest.json',
  data: {
    service: 'wrong',
    entrypoint: 'wrong.js',
    requiredEnv: [],
    files: [],
  },
});
assert.equal(invalidBundle[0].status, 'blocker');
assert.match(invalidBundle[0].detail, /missing bundle file crm\/simple-crm\.js/);
assert.match(invalidBundle[0].detail, /shopifyOrderWebhookPath/);

console.log('Launch readiness audit proof passed: ops bundle readiness is reported separately from public deployment.');
