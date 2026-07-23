#!/usr/bin/env node

const assert = require('node:assert/strict');
const {
  auditSnapshot,
  requiredBillingProducts,
} = require('./audit-storefront-objects');
const { PHONE_PRODUCT_CATEGORY } = require('./storefront-product-taxonomy');

const expectedProducts = [
  {
    Title: 'Classic Phone',
    'URL handle': 'standard-phone',
    SKU: 'PP-CLASSIC-PHONE',
    Price: '100.00',
    'Requires shipping': 'true',
    'product.metafields.custom.product_deck': 'Everyday family phone.',
    'product.metafields.custom.best_for': 'Best for home.',
    'product.metafields.custom.specs': 'Cordless Wi-Fi handset with charging base.;HD audio quality.',
  },
  {
    Title: 'Rugged Phone',
    'URL handle': 'rugged-phone',
    SKU: 'PP-RUGGED-PHONE',
    Price: '150.00',
    'Requires shipping': 'true',
    'product.metafields.custom.product_deck': 'Rugged family phone.',
    'product.metafields.custom.best_for': 'Best for tough days.',
    'product.metafields.custom.specs': 'Waterproof and dust-proof.;Drop-proof up to 1.8 meters.',
  },
];

function phoneFixture({
  id,
  title,
  handle,
  price,
  sku,
  deck,
  bestFor,
  specs,
  media,
}) {
  return {
    id: `gid://shopify/Product/${id}`,
    title,
    handle,
    status: 'ACTIVE',
    templateSuffix: 'independence-phone',
    category: { ...PHONE_PRODUCT_CATEGORY },
    publishedAt: '2026-07-14T19:05:00Z',
    onlineStoreUrl: `https://example.com/products/${handle}`,
    variants: {
      nodes: [{
        id: `gid://shopify/ProductVariant/${id}`,
        price,
        taxable: true,
        inventoryItem: {
          id: `gid://shopify/InventoryItem/${id}`,
          sku,
          requiresShipping: true,
        },
      }],
    },
    metafields: {
      nodes: [
        { key: 'product_deck', value: deck },
        { key: 'best_for', value: bestFor },
        { key: 'specs', value: specs },
      ],
    },
    media: { nodes: media },
  };
}

function billingFixture(expected, index) {
  return {
    id: `gid://shopify/Product/${index}`,
    title: expected.title,
    handle: expected.handle,
    status: 'ACTIVE',
    templateSuffix: 'billing-item',
    category: expected.handle === 'monthly-service'
      ? {
          id: 'gid://shopify/TaxonomyCategory/na',
          fullName: 'Uncategorized',
        }
      : null,
    publishedAt: '2026-07-14T19:05:00Z',
    onlineStoreUrl: `https://example.com/products/${expected.handle}`,
    variants: {
      nodes: [{
        id: `gid://shopify/ProductVariant/${index}`,
        price: expected.checkoutPrice,
        taxable: false,
        inventoryItem: {
          id: `gid://shopify/InventoryItem/${index}`,
          sku: expected.sku,
          requiresShipping: false,
        },
      }],
    },
    metafields: {
      nodes: [
        { key: 'future_price_cents', value: String(expected.futurePriceCents) },
        { key: 'billing_cadence', value: expected.billingCadence },
        { key: 'first_bill_rule', value: expected.firstBillRule },
        { key: 'billing_role', value: expected.role },
      ],
    },
    media: {
      nodes: [{
        alt: expected.mediaAlt,
        mediaContentType: 'IMAGE',
      }],
    },
  };
}

const goodSnapshot = {
  products: {
    'standard-phone': phoneFixture({
      id: 1,
      title: 'Classic Phone',
      handle: 'standard-phone',
      price: '100.00',
      sku: 'PP-CLASSIC-PHONE',
      deck: 'Everyday family phone.',
      bestFor: 'Best for home.',
      specs: 'Cordless Wi-Fi handset with charging base.;HD audio quality.',
      media: [
        { alt: 'Classic Phone handset', mediaContentType: 'IMAGE' },
        { alt: 'Classic Phone charging base', mediaContentType: 'IMAGE' },
      ],
    }),
    'rugged-phone': phoneFixture({
      id: 2,
      title: 'Rugged Phone',
      handle: 'rugged-phone',
      price: '150.00',
      sku: 'PP-RUGGED-PHONE',
      deck: 'Rugged family phone.',
      bestFor: 'Best for tough days.',
      specs: 'Waterproof and dust-proof.;Drop-proof up to 1.8 meters.',
      media: [{ alt: 'Rugged Phone handset', mediaContentType: 'IMAGE' }],
    }),
  },
  collections: {
    phones: {
      id: 'gid://shopify/Collection/1',
      title: 'Phones',
      handle: 'phones',
      templateSuffix: 'phones',
      onlineStoreUrl: 'https://example.com/collections/phones',
      products: {
        nodes: [
          { handle: 'standard-phone', title: 'Classic Phone' },
          { handle: 'rugged-phone', title: 'Rugged Phone' },
        ],
      },
    },
  },
  billingProducts: Object.fromEntries(
    requiredBillingProducts.map((expected, index) => [
      expected.handle,
      billingFixture(expected, index + 3),
    ]),
  ),
  retiredProducts: {
    'patriot-package': {
      id: 'gid://shopify/Product/10',
      title: 'Patriot Package',
      handle: 'patriot-package',
      status: 'ARCHIVED',
      publishedAt: null,
      onlineStoreUrl: null,
    },
  },
  pages: {
    'order-now': {
      id: 'gid://shopify/Page/1',
      title: 'Order Now',
      handle: 'order-now',
      templateSuffix: 'order',
      isPublished: true,
      onlineStoreUrl: 'https://example.com/pages/order-now',
    },
    faq: {
      id: 'gid://shopify/Page/2',
      title: 'FAQ',
      handle: 'faq',
      templateSuffix: 'faq',
      isPublished: true,
      onlineStoreUrl: 'https://example.com/pages/faq',
    },
    contact: {
      id: 'gid://shopify/Page/3',
      title: 'Contact',
      handle: 'contact',
      templateSuffix: 'contact',
      isPublished: true,
      onlineStoreUrl: 'https://example.com/pages/contact',
    },
  },
};

const report = auditSnapshot(goodSnapshot, expectedProducts);
assert.equal(report.failures.length, 0);
assert.equal(report.products.length, 2);
assert.equal(report.products.every((product) => product.categoryId === PHONE_PRODUCT_CATEGORY.id), true);
assert.equal(report.billingProducts.length, 7);
assert.equal(report.billingProducts.find((product) => product.handle === 'monthly-service').price, '0.00');
assert.equal(
  report.billingProducts.find((product) => product.handle === 'monthly-service').categoryId,
  'gid://shopify/TaxonomyCategory/na',
);
assert.equal(report.billingProducts.find((product) => product.handle === 'monthly-service').futurePrice, '17.76');
assert.equal(report.billingProducts.find((product) => product.handle === 'annual-service').futurePrice, '200.00');
assert.equal(report.billingProducts.find((product) => product.handle === 'add-on-bundle').futurePrice, '10.00');
assert.equal(report.billingProducts.some((product) => product.handle === 'patriot-package'), false);
assert.equal(report.retiredProducts.length, 1);
assert.equal(report.retiredProducts[0].status, 'ARCHIVED');
assert.equal(report.collection.productHandles.includes('rugged-phone'), true);
assert.equal(report.pages.length, 3);

const badSnapshot = JSON.parse(JSON.stringify(goodSnapshot));
badSnapshot.products['standard-phone'].variants.nodes[0].price = '99.00';
badSnapshot.products['standard-phone'].category = null;
badSnapshot.billingProducts['annual-service'].publishedAt = null;
badSnapshot.billingProducts['monthly-service'].templateSuffix = 'independence-phone';
badSnapshot.billingProducts['monthly-service'].category = { ...PHONE_PRODUCT_CATEGORY };
badSnapshot.billingProducts['monthly-service'].variants.nodes[0].price = '17.76';
badSnapshot.billingProducts['monthly-service'].variants.nodes[0].taxable = true;
badSnapshot.billingProducts['monthly-service'].variants.nodes[0].inventoryItem.sku = '';
badSnapshot.billingProducts['monthly-service'].variants.nodes[0].inventoryItem.requiresShipping = true;
badSnapshot.billingProducts['monthly-service'].metafields.nodes = [];
badSnapshot.billingProducts['monthly-service'].media.nodes = [];
badSnapshot.billingProducts['annual-service'].category = {
  id: 'gid://shopify/TaxonomyCategory/na',
  fullName: 'Not Uncategorized',
};
badSnapshot.retiredProducts['patriot-package'].status = 'ACTIVE';
badSnapshot.retiredProducts['patriot-package'].publishedAt = '2026-07-14T19:05:00Z';
badSnapshot.collections.phones.products.nodes = [{ handle: 'standard-phone', title: 'Classic Phone' }];
badSnapshot.pages.faq.isPublished = false;

const badReport = auditSnapshot(badSnapshot, expectedProducts);
assert.equal(badReport.failures.includes('product standard-phone: price is 99.00'), true);
assert.equal(badReport.failures.includes('product standard-phone: category is (blank)'), true);
assert.equal(badReport.failures.includes('product standard-phone: category full name is (blank)'), true);
assert.equal(badReport.failures.includes('billing product annual-service: not published to the Online Store'), true);
assert.equal(badReport.failures.includes('billing product monthly-service: template is independence-phone'), true);
assert.equal(
  badReport.failures.includes(
    `billing product monthly-service: billing product category is ${PHONE_PRODUCT_CATEGORY.fullName}; expected uncategorized`,
  ),
  true,
);
assert.equal(
  badReport.failures.includes(
    'billing product annual-service: billing product category is Not Uncategorized; expected uncategorized',
  ),
  true,
);
assert.equal(badReport.failures.includes('billing product monthly-service: price is 17.76'), true);
assert.equal(badReport.failures.includes('billing product monthly-service: billing product is taxable'), true);
assert.equal(badReport.failures.includes('billing product monthly-service: SKU is (blank)'), true);
assert.equal(badReport.failures.includes('billing product monthly-service: billing product requires shipping'), true);
assert.equal(badReport.failures.includes('billing product monthly-service: future_price_cents is (blank)'), true);
assert.equal(
  badReport.failures.includes('billing product monthly-service: missing billing media alt "Monthly Service billing item"'),
  true,
);
assert.equal(
  badReport.failures.includes('retired product patriot-package: is ACTIVE; archive or draft the retired product'),
  true,
);
assert.equal(
  badReport.failures.includes('retired product patriot-package: is still published to the Online Store'),
  true,
);
assert.equal(badReport.failures.includes('collection phones: missing product rugged-phone'), true);
assert.equal(badReport.failures.includes('page faq: page is not published'), true);

console.log(
  'Storefront object audit proof passed: phone taxonomy, zero-dollar deferred billing products, future-charge metadata, stable SKUs, media, retired-package state, collection, and pages are validated read-only.',
);
