#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const {
  billingProducts,
  PHONE_PRODUCT_CATEGORY,
  productInputFromBillingProduct,
  productInputFromRow,
  variantInputFromBillingProduct,
} = require('./create-storefront-objects');
const {
  billingMediaPlan,
  mediaPlan,
  phoneMediaPlan,
} = require('./assign-product-media');

const root = path.resolve(__dirname, '..');
const themeAsset = path.join(root, 'independence-phone-theme', 'assets', 'ip-billing-flag.webp');

assert.equal(billingProducts.length, 7);
assert.equal(new Set(billingProducts.map((product) => product.handle)).size, 7);
assert.equal(new Set(billingProducts.map((product) => product.sku)).size, 7);
assert.equal(billingProducts.some((product) => /patriot/i.test(`${product.title} ${product.handle}`)), false);

const phoneProductInput = productInputFromRow({
  Title: 'Classic Phone',
  'URL handle': 'standard-phone',
  Description: 'Classic phone.',
  Vendor: 'Independence Phone',
  Type: 'Phone',
  Tags: 'independence-phone, standard-phone',
  'product.metafields.custom.product_deck': 'Everyday phone.',
  'product.metafields.custom.best_for': 'Home.',
  'product.metafields.custom.specs': 'Wi-Fi.',
});
assert.equal(phoneProductInput.category, PHONE_PRODUCT_CATEGORY.id);

for (const product of billingProducts) {
  assert.equal(product.checkoutPrice, '0.00');
  assert.equal(product.futurePriceCents > 0, true);
  assert.equal(Number(product.futurePrice).toFixed(2), (product.futurePriceCents / 100).toFixed(2));
  assert.equal(product.firstBillRule, 'first_day_of_next_month');

  const variantInput = variantInputFromBillingProduct(product, 'gid://shopify/ProductVariant/1');
  assert.equal(variantInput.price, '0.00');
  assert.equal(variantInput.taxable, false);
  assert.deepEqual(variantInput.inventoryItem, {
    sku: product.sku,
    requiresShipping: false,
    tracked: false,
  });

  const productInput = productInputFromBillingProduct(product);
  assert.equal(productInput.category, null);
  const metafields = Object.fromEntries(productInput.metafields.map((field) => [field.key, field.value]));
  assert.equal(metafields.future_price_cents, String(product.futurePriceCents));
  assert.equal(metafields.billing_cadence, product.billingCadence);
  assert.equal(metafields.first_bill_rule, product.firstBillRule);
  assert.equal(metafields.billing_role, product.role);
}

assert.equal(phoneMediaPlan.length, 2);
assert.deepEqual(
  phoneMediaPlan.flatMap((product) => product.files.map((file) => file.filename)),
  [
    'ip-classic-phone-front.webp',
    'ip-classic-phone-spin.mp4',
    'ip-classic-phone-buttons.webp',
    'ip-classic-phone-charger.webp',
    'ip-classic-phone-back.webp',
    'ip-rugged-phone-front.webp',
    'ip-rugged-phone-spin.mp4',
    'ip-rugged-phone-buttons.webp',
    'ip-rugged-phone-charger.webp',
    'ip-rugged-phone-back.webp',
  ],
);
for (const phone of phoneMediaPlan) {
  assert.equal(phone.files[0].contentType, 'IMAGE');
  assert.match(phone.files[0].filename, /-front\.webp$/);
  assert.equal(phone.files[1].contentType, 'VIDEO');
  assert.match(phone.files[1].filename, /-spin\.mp4$/);
}
assert.equal(billingMediaPlan.length, 7);
assert.equal(mediaPlan.length, 9);
for (const product of billingMediaPlan) {
  assert.equal(product.files.length, 1);
  assert.match(product.files[0].filename, /^ip-.+-billing-flag\.webp$/);
  assert.equal(product.files[0].sourceFilename, 'ip-billing-flag.webp');
  assert.equal(product.files[0].alt.endsWith(' billing item'), true);
}

for (const assetPath of [themeAsset]) {
  assert.equal(fs.existsSync(assetPath), true);
  assert.equal(fs.statSync(assetPath).size < 100_000, true);
  const probe = JSON.parse(execFileSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=codec_name,width,height',
      '-of',
      'json',
      assetPath,
    ],
    { encoding: 'utf8' },
  ));
  assert.equal(probe.streams[0].codec_name, 'webp');
  assert.equal(probe.streams[0].width, 576);
  assert.equal(probe.streams[0].height, 576);
}

for (const file of phoneMediaPlan.flatMap((phone) => phone.files)) {
  const themePath = path.join(root, 'independence-phone-theme', 'assets', file.filename);
  assert.equal(fs.existsSync(themePath), true);
  if (file.contentType === 'IMAGE') {
    assert.equal(fs.statSync(themePath).size < 100_000, true);
  }
}

for (const filename of ['ip-classic-phone-spin.mp4', 'ip-rugged-phone-spin.mp4']) {
  const assetPath = path.join(root, 'independence-phone-theme', 'assets', filename);
  const videoProbe = JSON.parse(execFileSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=codec_name,width,height,pix_fmt',
      '-of',
      'json',
      assetPath,
    ],
    { encoding: 'utf8' },
  ));
  assert.equal(videoProbe.streams[0].codec_name, 'h264');
  assert.equal(videoProbe.streams[0].width, 960);
  assert.equal(videoProbe.streams[0].height, 540);
  assert.equal(videoProbe.streams[0].pix_fmt, 'yuv420p');

  const audioProbe = JSON.parse(execFileSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-select_streams',
      'a',
      '-show_entries',
      'stream=index',
      '-of',
      'json',
      assetPath,
    ],
    { encoding: 'utf8' },
  ));
  assert.equal(audioProbe.streams.length, 0);
}

console.log(
  'Deferred billing catalog proof passed: seven zero-dollar non-taxable/non-shipping variants retain future prices and stable SKUs, each phone assigns Front/rotating/Buttons/Charger/Back in order, and canonical theme media is ready.',
);
