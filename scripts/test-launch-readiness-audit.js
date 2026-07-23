#!/usr/bin/env node

const assert = require('node:assert/strict');

const { buildBundle } = require('./build-ops-deployment-bundle');
const {
  buildReport,
  opsBundleChecks,
  orderChecks,
  productChecks,
  requiredBillingProducts,
} = require('./audit-launch-readiness');

buildBundle();

const report = buildReport();
const bundleGroup = report.groups.find((group) => group.name === 'Ops deployment package');
assert.ok(bundleGroup, 'Ops deployment package group should exist');
assert.equal(bundleGroup.checks.length, 1);
assert.equal(bundleGroup.checks[0].status, 'pass');
assert.match(bundleGroup.checks[0].detail, /Shopify webhook/);
assert.equal(report.summary.pass >= 1, true);
assert.equal(report.groups.length, 8);

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

const storeObjectChecks = productChecks({
  missing: false,
  path: '/tmp/storefront-objects-audit.json',
  data: {
    products: [
      {
        handle: 'standard-phone',
        actualTitle: 'Classic Phone',
        price: '100.00',
        templateSuffix: 'independence-phone',
        status: 'ACTIVE',
        mediaCount: 2,
        mediaWithAltCount: 2,
        failures: [],
      },
      {
        handle: 'rugged-phone',
        actualTitle: 'Rugged Phone',
        price: '150.00',
        templateSuffix: 'independence-phone',
        status: 'ACTIVE',
        mediaCount: 2,
        mediaWithAltCount: 2,
        failures: [],
      },
    ],
    billingProducts: requiredBillingProducts.map((expected) => ({
      handle: expected.handle,
      actualTitle: expected.title,
      price: '0.00',
      templateSuffix: 'billing-item',
      status: 'ACTIVE',
      futurePriceCents: expected.futurePriceCents,
      billingCadence: expected.billingCadence,
      firstBillRule: expected.firstBillRule,
      role: expected.role,
      taxable: false,
      requiresShipping: false,
      mediaCount: 1,
      mediaWithAltCount: 1,
      failures: [],
    })),
    collection: {
      handle: 'phones',
      templateSuffix: 'phones',
      productHandles: ['standard-phone', 'rugged-phone'],
      failures: [],
    },
    failures: [],
  },
});
const billingChecks = storeObjectChecks.filter((item) => item.name.startsWith('billing product '));
assert.equal(billingChecks.length, 7);
assert.equal(billingChecks.every((item) => item.status === 'pass'), true);
assert.equal(billingChecks.some((item) => /Patriot Package/i.test(item.name + item.detail)), false);
assert.equal(billingChecks.every((item) => /\$0 checkout line/.test(item.detail)), true);

const stalePricedStoreObjects = {
  missing: false,
  path: '/tmp/stale-storefront-objects-audit.json',
  data: JSON.parse(JSON.stringify({
    products: [],
    billingProducts: requiredBillingProducts.map((expected) => ({
      handle: expected.handle,
      actualTitle: expected.title,
      price: expected.handle === 'monthly-service' ? '17.76' : '0.00',
      templateSuffix: 'billing-item',
      status: 'ACTIVE',
      futurePriceCents: expected.futurePriceCents,
      billingCadence: expected.billingCadence,
      firstBillRule: expected.firstBillRule,
      role: expected.role,
      taxable: false,
      requiresShipping: false,
      mediaCount: 1,
      mediaWithAltCount: 1,
      failures: [],
    })),
    collection: {
      handle: 'phones',
      templateSuffix: 'phones',
      productHandles: ['standard-phone', 'rugged-phone'],
      failures: [],
    },
    failures: [],
  })),
};
const staleBillingCheck = productChecks(stalePricedStoreObjects)
  .find((item) => item.name === 'billing product monthly-service data');
assert.equal(staleBillingCheck.status, 'blocker');
assert.match(staleBillingCheck.detail, /price is 17\.76/);

const deferredOrderCheck = orderChecks({
  missing: false,
  path: '/tmp/order-proof-audit.json',
  data: {
    status: 'pass',
    csvOutputPath: '/tmp/order-setup-details.csv',
    failures: [],
    deferredBillingContract: {
      schema: 'independence_phone.revio_checkout.v2',
      zeroDollarBillingLinesVerified: true,
      futureMetadataVerified: true,
      flatShippingCents: 1500,
      totalsSeparated: true,
      consentCollectionStatus: 'pending_checkout',
      desiredAreaCodeCollectionStatus: 'required_at_checkout',
    },
  },
});
assert.equal(deferredOrderCheck[0].status, 'pass');
assert.match(deferredOrderCheck[0].detail, /deferred-billing v2/);
assert.match(deferredOrderCheck[0].detail, /\$15 shipping/);
assert.match(deferredOrderCheck[0].detail, /pending checkout fields/);
assert.doesNotMatch(deferredOrderCheck[0].detail, /Patriot Package/);

const staleOrderCheck = orderChecks({
  missing: false,
  path: '/tmp/stale-order-proof-audit.json',
  data: {
    status: 'pass',
    failures: [],
    deferredBillingContract: {
      schema: 'independence_phone.revio_checkout.v1',
      zeroDollarBillingLinesVerified: false,
      futureMetadataVerified: false,
      flatShippingCents: 3000,
      totalsSeparated: false,
      consentCollectionStatus: 'complete',
      desiredAreaCodeCollectionStatus: 'complete',
    },
  },
});
assert.equal(staleOrderCheck[0].status, 'blocker');
assert.match(staleOrderCheck[0].detail, /deferred-billing v2 schema/);
assert.match(staleOrderCheck[0].detail, /zero-dollar service and add-on checkout lines/);
assert.match(staleOrderCheck[0].detail, /one \$15 per-order shipping/);

console.log(
  'Launch readiness audit proof passed: ops packaging and deferred-billing v2 product/order readiness are reported without Patriot, priced checkout billing lines, or cart-level consent.',
);
