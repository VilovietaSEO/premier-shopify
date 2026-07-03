#!/usr/bin/env node

const assert = require('node:assert/strict');
const {
  auditSnapshot,
} = require('./audit-storefront-objects');

const expectedProducts = [
  {
    Title: 'Classic Phone',
    'URL handle': 'standard-phone',
    Price: '100.00',
    'product.metafields.custom.product_deck': 'Everyday family phone.',
    'product.metafields.custom.best_for': 'Best for home.',
    'product.metafields.custom.specs': 'Cordless Wi-Fi handset with charging base.;HD audio quality.',
  },
  {
    Title: 'Rugged Phone',
    'URL handle': 'rugged-phone',
    Price: '150.00',
    'product.metafields.custom.product_deck': 'Rugged family phone.',
    'product.metafields.custom.best_for': 'Best for tough days.',
    'product.metafields.custom.specs': 'Waterproof and dust-proof.;Drop-proof up to 1.8 meters.',
  },
];

const goodSnapshot = {
  products: {
    'standard-phone': {
      id: 'gid://shopify/Product/1',
      title: 'Classic Phone',
      handle: 'standard-phone',
      status: 'ACTIVE',
      templateSuffix: 'independence-phone',
      onlineStoreUrl: 'https://example.com/products/standard-phone',
      variants: {
        nodes: [{ id: 'gid://shopify/ProductVariant/1', price: '100.00', taxable: true }],
      },
      metafields: {
        nodes: [
          { key: 'product_deck', value: 'Everyday family phone.' },
          { key: 'best_for', value: 'Best for home.' },
          { key: 'specs', value: 'Cordless Wi-Fi handset with charging base.;HD audio quality.' },
        ],
      },
      media: {
        nodes: [
          { alt: 'Classic Phone handset', mediaContentType: 'IMAGE' },
          { alt: 'Classic Phone charging base', mediaContentType: 'IMAGE' },
        ],
      },
    },
    'rugged-phone': {
      id: 'gid://shopify/Product/2',
      title: 'Rugged Phone',
      handle: 'rugged-phone',
      status: 'ACTIVE',
      templateSuffix: 'independence-phone',
      onlineStoreUrl: 'https://example.com/products/rugged-phone',
      variants: {
        nodes: [{ id: 'gid://shopify/ProductVariant/2', price: '150.00', taxable: true }],
      },
      metafields: {
        nodes: [
          { key: 'product_deck', value: 'Rugged family phone.' },
          { key: 'best_for', value: 'Best for tough days.' },
          { key: 'specs', value: 'Waterproof and dust-proof.;Drop-proof up to 1.8 meters.' },
        ],
      },
      media: {
        nodes: [{ alt: 'Rugged Phone handset', mediaContentType: 'IMAGE' }],
      },
    },
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
  billingProducts: {
    'monthly-service': {
      id: 'gid://shopify/Product/3',
      title: 'Monthly Service',
      handle: 'monthly-service',
      status: 'ACTIVE',
      templateSuffix: 'billing-item',
      onlineStoreUrl: 'https://example.com/products/monthly-service',
      variants: {
        nodes: [{ id: 'gid://shopify/ProductVariant/3', price: '17.76', taxable: true, inventoryItem: { id: 'gid://shopify/InventoryItem/3', requiresShipping: false } }],
      },
      metafields: { nodes: [] },
      media: { nodes: [] },
    },
    'annual-service': {
      id: 'gid://shopify/Product/4',
      title: 'Annual Service',
      handle: 'annual-service',
      status: 'ACTIVE',
      templateSuffix: 'billing-item',
      onlineStoreUrl: 'https://example.com/products/annual-service',
      variants: {
        nodes: [{ id: 'gid://shopify/ProductVariant/4', price: '200.00', taxable: true }],
      },
      metafields: { nodes: [] },
      media: { nodes: [] },
    },
    'call-recording': {
      id: 'gid://shopify/Product/5',
      title: 'Call Recording',
      handle: 'call-recording',
      status: 'ACTIVE',
      templateSuffix: 'billing-item',
      onlineStoreUrl: 'https://example.com/products/call-recording',
      variants: {
        nodes: [{ id: 'gid://shopify/ProductVariant/5', price: '5.00', taxable: true }],
      },
      metafields: { nodes: [] },
      media: { nodes: [] },
    },
    'family-quiet-hours': {
      id: 'gid://shopify/Product/6',
      title: 'Quiet Hours',
      handle: 'family-quiet-hours',
      status: 'ACTIVE',
      templateSuffix: 'billing-item',
      onlineStoreUrl: 'https://example.com/products/family-quiet-hours',
      variants: {
        nodes: [{ id: 'gid://shopify/ProductVariant/6', price: '5.00', taxable: true }],
      },
      metafields: { nodes: [] },
      media: { nodes: [] },
    },
    'voicemail-to-email': {
      id: 'gid://shopify/Product/7',
      title: 'Voicemail to Email',
      handle: 'voicemail-to-email',
      status: 'ACTIVE',
      templateSuffix: 'billing-item',
      onlineStoreUrl: 'https://example.com/products/voicemail-to-email',
      variants: {
        nodes: [{ id: 'gid://shopify/ProductVariant/7', price: '5.00', taxable: true }],
      },
      metafields: { nodes: [] },
      media: { nodes: [] },
    },
    'auto-attendant': {
      id: 'gid://shopify/Product/8',
      title: 'Auto Attendant',
      handle: 'auto-attendant',
      status: 'ACTIVE',
      templateSuffix: 'billing-item',
      onlineStoreUrl: 'https://example.com/products/auto-attendant',
      variants: {
        nodes: [{ id: 'gid://shopify/ProductVariant/8', price: '5.00', taxable: true }],
      },
      metafields: { nodes: [] },
      media: { nodes: [] },
    },
    'add-on-bundle': {
      id: 'gid://shopify/Product/9',
      title: 'Add-on Bundle',
      handle: 'add-on-bundle',
      status: 'ACTIVE',
      templateSuffix: 'billing-item',
      onlineStoreUrl: 'https://example.com/products/add-on-bundle',
      variants: {
        nodes: [{ id: 'gid://shopify/ProductVariant/9', price: '10.00', taxable: true }],
      },
      metafields: { nodes: [] },
      media: { nodes: [] },
    },
    'patriot-package': {
      id: 'gid://shopify/Product/10',
      title: 'Patriot Package',
      handle: 'patriot-package',
      status: 'ACTIVE',
      templateSuffix: 'billing-item',
      onlineStoreUrl: 'https://example.com/products/patriot-package',
      variants: {
        nodes: [{ id: 'gid://shopify/ProductVariant/10', price: '150.00', taxable: true }],
      },
      metafields: { nodes: [] },
      media: { nodes: [] },
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
assert.equal(report.billingProducts.length, 8);
assert.equal(report.billingProducts.find((product) => product.handle === 'add-on-bundle').price, '10.00');
assert.equal(report.billingProducts.find((product) => product.handle === 'patriot-package').price, '150.00');
assert.equal(report.collection.productHandles.includes('rugged-phone'), true);
assert.equal(report.pages.length, 3);

const badSnapshot = JSON.parse(JSON.stringify(goodSnapshot));
badSnapshot.products['standard-phone'].variants.nodes[0].price = '99.00';
badSnapshot.billingProducts['monthly-service'].templateSuffix = 'independence-phone';
badSnapshot.billingProducts['monthly-service'].variants.nodes[0].inventoryItem.requiresShipping = true;
badSnapshot.collections.phones.products.nodes = [{ handle: 'standard-phone', title: 'Classic Phone' }];
badSnapshot.pages.faq.isPublished = false;

const badReport = auditSnapshot(badSnapshot, expectedProducts);
assert.equal(badReport.failures.includes('product standard-phone: price is 99.00'), true);
assert.equal(badReport.failures.includes('billing product monthly-service: template is independence-phone'), true);
assert.equal(badReport.failures.includes('billing product monthly-service: billing product requires shipping'), true);
assert.equal(badReport.failures.includes('collection phones: missing product rugged-phone'), true);
assert.equal(badReport.failures.includes('page faq: page is not published'), true);

console.log('Storefront object audit proof passed: products, hidden billing products, collection, and pages are validated read-only.');
