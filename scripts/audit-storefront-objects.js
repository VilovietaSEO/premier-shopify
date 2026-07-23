#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { resolveAdminAuth } = require('./shopify-admin-auth');
const { billingProducts } = require('./storefront-billing-products');
const { PHONE_PRODUCT_CATEGORY } = require('./storefront-product-taxonomy');

const root = path.resolve(__dirname, '..');
const productsCsvPath = path.join(root, 'store-setup/products.csv');
const outputPath =
  process.env.STOREFRONT_OBJECT_AUDIT_OUTPUT ||
  path.join(root, 'tmp', 'shopify-live-proof', 'storefront-objects-audit.json');
const apiVersion = process.env.SHOPIFY_ADMIN_API_VERSION || '2026-04';

const requiredPages = [
  { handle: 'order-now', title: 'Order Now', templateSuffix: 'order' },
  { handle: 'faq', title: 'FAQ', templateSuffix: 'faq' },
  { handle: 'contact', title: 'Contact', templateSuffix: 'contact' },
];

const requiredBillingProducts = billingProducts.map((product) => ({
  ...product,
  mediaAlt: `${product.title} billing item`,
}));

const retiredProducts = [
  { handle: 'patriot-package', title: 'Patriot Package' },
];

const productByHandleQuery = `
query ProductByHandle($identifier: ProductIdentifierInput!) {
  productByIdentifier(identifier: $identifier) {
    id
    title
    handle
    status
    templateSuffix
    publishedAt
    onlineStoreUrl
    category {
      id
      fullName
    }
    variants(first: 10) {
      nodes {
        id
        title
        price
        taxable
        inventoryItem {
          id
          sku
          requiresShipping
        }
      }
    }
    metafields(first: 10, namespace: "custom") {
      nodes {
        key
        value
      }
    }
    media(first: 20) {
      nodes {
        alt
        mediaContentType
        preview {
          image {
            width
            height
            url
          }
        }
      }
    }
  }
}
`;

const collectionByHandleQuery = `
query CollectionByHandle($query: String!) {
  collections(first: 1, query: $query) {
    nodes {
      id
      title
      handle
      templateSuffix
      products(first: 20) {
        nodes {
          handle
          title
        }
      }
    }
  }
}
`;

const pageByHandleQuery = `
query PageByHandle($query: String!) {
  pages(first: 1, query: $query) {
    nodes {
      id
      title
      handle
      templateSuffix
      isPublished
    }
  }
}
`;

function usage(exitCode = 64) {
  console.error(`Usage:
  SHOPIFY_STORE=STORE.myshopify.com SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_... node scripts/audit-storefront-objects.js
  SHOPIFY_STORE=STORE.myshopify.com SHOPIFY_USE_CLI_SESSION=1 node scripts/audit-storefront-objects.js
  node scripts/audit-storefront-objects.js --fixture /path/to/snapshot.json

Required read scopes:
  read_products, read_content or read_online_store_pages`);
  process.exit(exitCode);
}

function normalizeStore(value) {
  if (!value) return '';
  return value
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .trim();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(field);
      field = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(field);
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
      field = '';
      continue;
    }

    field += char;
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    if (row.some((value) => value !== '')) rows.push(row);
  }

  return rows;
}

function rowObject(headers, row) {
  return Object.fromEntries(headers.map((header, index) => [header, row[index] || '']));
}

function readExpectedProducts() {
  const rows = parseCsv(fs.readFileSync(productsCsvPath, 'utf8'));
  const [headers, ...productRows] = rows;
  return productRows.map((row) => rowObject(headers, row));
}

function metafieldMap(product) {
  return Object.fromEntries((product?.metafields?.nodes || []).map((field) => [field.key, field.value || '']));
}

function normalizePrice(value) {
  return Number(value).toFixed(2);
}

function productAudit(product, expected) {
  const failures = [];
  const metafields = metafieldMap(product);
  const firstVariant = product?.variants?.nodes?.[0];
  const media = product?.media?.nodes || [];

  if (!product) {
    failures.push('missing product');
  } else {
    if (product.title !== expected.Title) failures.push(`title is ${product.title || '(blank)'}`);
    if (product.handle !== expected['URL handle']) failures.push(`handle is ${product.handle || '(blank)'}`);
    if (product.status !== 'ACTIVE') failures.push(`status is ${product.status || '(blank)'}`);
    if (!product.publishedAt) failures.push('not published to the Online Store');
    if (product.templateSuffix !== 'independence-phone') failures.push(`template is ${product.templateSuffix || '(blank)'}`);
    if (product.category?.id !== PHONE_PRODUCT_CATEGORY.id) {
      failures.push(`category is ${product.category?.id || '(blank)'}`);
    }
    if (product.category?.fullName !== PHONE_PRODUCT_CATEGORY.fullName) {
      failures.push(`category full name is ${product.category?.fullName || '(blank)'}`);
    }
    if (!firstVariant) failures.push('missing variant');
    if (firstVariant && normalizePrice(firstVariant.price) !== normalizePrice(expected.Price)) {
      failures.push(`price is ${firstVariant.price}`);
    }
    if (firstVariant?.inventoryItem?.sku !== expected.SKU) {
      failures.push(`SKU is ${firstVariant?.inventoryItem?.sku || '(blank)'}`);
    }
    if (firstVariant?.inventoryItem?.requiresShipping !== (expected['Requires shipping'] === 'true')) {
      failures.push(`requiresShipping is ${Boolean(firstVariant?.inventoryItem?.requiresShipping)}`);
    }
    if (metafields.product_deck !== expected['product.metafields.custom.product_deck']) failures.push('product_deck metafield mismatch');
    if (metafields.best_for !== expected['product.metafields.custom.best_for']) failures.push('best_for metafield mismatch');
    if (metafields.specs !== expected['product.metafields.custom.specs']) failures.push('specs metafield mismatch');
  }

  return {
    handle: expected['URL handle'],
    expectedTitle: expected.Title,
    actualTitle: product?.title || '',
    status: product?.status || '',
    templateSuffix: product?.templateSuffix || '',
    categoryId: product?.category?.id || '',
    categoryFullName: product?.category?.fullName || '',
    price: firstVariant?.price || '',
    sku: firstVariant?.inventoryItem?.sku || '',
    requiresShipping: Boolean(firstVariant?.inventoryItem?.requiresShipping),
    publishedAt: product?.publishedAt || '',
    onlineStoreUrl: product?.onlineStoreUrl || '',
    mediaCount: media.length,
    mediaWithAltCount: media.filter((item) => String(item.alt || '').trim()).length,
    failures,
  };
}

function billingProductAudit(product, expected) {
  const failures = [];
  const firstVariant = product?.variants?.nodes?.[0];
  const metafields = metafieldMap(product);
  const media = product?.media?.nodes || [];

  if (!product) {
    failures.push('missing billing product');
  } else {
    if (product.title !== expected.title) failures.push(`title is ${product.title || '(blank)'}`);
    if (product.handle !== expected.handle) failures.push(`handle is ${product.handle || '(blank)'}`);
    if (product.status !== 'ACTIVE') failures.push(`status is ${product.status || '(blank)'}`);
    if (!product.publishedAt) failures.push('not published to the Online Store');
    if (product.templateSuffix !== 'billing-item') failures.push(`template is ${product.templateSuffix || '(blank)'}`);
    const usesShopifyUncategorizedSentinel =
      product.category?.id === 'gid://shopify/TaxonomyCategory/na'
      && product.category?.fullName === 'Uncategorized';
    if (product.category && !usesShopifyUncategorizedSentinel) {
      failures.push(`billing product category is ${product.category.fullName || product.category.id}; expected uncategorized`);
    }
    if (!firstVariant) failures.push('missing variant');
    if (firstVariant && normalizePrice(firstVariant.price) !== normalizePrice(expected.checkoutPrice)) {
      failures.push(`price is ${firstVariant.price}`);
    }
    if (firstVariant?.taxable !== false) failures.push('billing product is taxable');
    if (firstVariant?.inventoryItem?.sku !== expected.sku) {
      failures.push(`SKU is ${firstVariant?.inventoryItem?.sku || '(blank)'}`);
    }
    if (firstVariant?.inventoryItem?.requiresShipping) {
      failures.push('billing product requires shipping');
    }
    if (metafields.future_price_cents !== String(expected.futurePriceCents)) {
      failures.push(`future_price_cents is ${metafields.future_price_cents || '(blank)'}`);
    }
    if (metafields.billing_cadence !== expected.billingCadence) {
      failures.push(`billing_cadence is ${metafields.billing_cadence || '(blank)'}`);
    }
    if (metafields.first_bill_rule !== expected.firstBillRule) {
      failures.push(`first_bill_rule is ${metafields.first_bill_rule || '(blank)'}`);
    }
    if (metafields.billing_role !== expected.role) {
      failures.push(`billing_role is ${metafields.billing_role || '(blank)'}`);
    }
    if (!media.some((item) => item.mediaContentType === 'IMAGE' && item.alt === expected.mediaAlt)) {
      failures.push(`missing billing media alt "${expected.mediaAlt}"`);
    }
  }

  return {
    handle: expected.handle,
    expectedTitle: expected.title,
    actualTitle: product?.title || '',
    status: product?.status || '',
    templateSuffix: product?.templateSuffix || '',
    categoryId: product?.category?.id || '',
    categoryFullName: product?.category?.fullName || '',
    price: firstVariant?.price || '',
    checkoutPrice: firstVariant?.price || '',
    futurePrice: expected.futurePrice,
    futurePriceCents: expected.futurePriceCents,
    billingCadence: expected.billingCadence,
    firstBillRule: expected.firstBillRule,
    role: expected.role,
    sku: firstVariant?.inventoryItem?.sku || '',
    taxable: firstVariant?.taxable,
    requiresShipping: Boolean(firstVariant?.inventoryItem?.requiresShipping),
    mediaCount: media.length,
    mediaWithAltCount: media.filter((item) => String(item.alt || '').trim()).length,
    publishedAt: product?.publishedAt || '',
    onlineStoreUrl: product?.onlineStoreUrl || '',
    failures,
  };
}

function retiredProductAudit(product, expected) {
  const failures = [];

  if (product?.status === 'ACTIVE') {
    failures.push('is ACTIVE; archive or draft the retired product');
  }
  if (product?.publishedAt) {
    failures.push('is still published to the Online Store');
  }

  return {
    handle: expected.handle,
    expectedTitle: expected.title,
    exists: Boolean(product),
    actualTitle: product?.title || '',
    status: product?.status || '',
    publishedAt: product?.publishedAt || '',
    onlineStoreUrl: product?.onlineStoreUrl || '',
    failures,
  };
}

function collectionAudit(collection, expectedHandles) {
  const failures = [];
  const handles = new Set((collection?.products?.nodes || []).map((product) => product.handle));

  if (!collection) {
    failures.push('missing collection');
  } else {
    if (collection.title !== 'Phones') failures.push(`title is ${collection.title || '(blank)'}`);
    if (collection.handle !== 'phones') failures.push(`handle is ${collection.handle || '(blank)'}`);
    if (collection.templateSuffix !== 'phones') failures.push(`template is ${collection.templateSuffix || '(blank)'}`);
    for (const handle of expectedHandles) {
      if (!handles.has(handle)) failures.push(`missing product ${handle}`);
    }
  }

  return {
    handle: 'phones',
    title: collection?.title || '',
    templateSuffix: collection?.templateSuffix || '',
    onlineStoreUrl: collection?.onlineStoreUrl || '',
    productHandles: [...handles],
    failures,
  };
}

function pageAudit(page, expected) {
  const failures = [];

  if (!page) {
    failures.push('missing page');
  } else if (page.accessSkipped) {
    failures.push('not verified: page access denied');
  } else {
    if (page.title !== expected.title) failures.push(`title is ${page.title || '(blank)'}`);
    if (page.handle !== expected.handle) failures.push(`handle is ${page.handle || '(blank)'}`);
    if (page.templateSuffix !== expected.templateSuffix) failures.push(`template is ${page.templateSuffix || '(blank)'}`);
    if (!page.isPublished) failures.push('page is not published');
  }

  return {
    handle: expected.handle,
    expectedTitle: expected.title,
    actualTitle: page?.title || '',
    templateSuffix: page?.templateSuffix || '',
    isPublished: Boolean(page?.isPublished),
    onlineStoreUrl: page?.onlineStoreUrl || '',
    failures,
  };
}

function auditSnapshot(snapshot, expectedProducts = readExpectedProducts()) {
  const expectedHandles = expectedProducts.map((product) => product['URL handle']);
  const productResults = expectedProducts.map((expected) =>
    productAudit(snapshot.products?.[expected['URL handle']], expected)
  );
  const billingProductResults = requiredBillingProducts.map((expected) =>
    billingProductAudit(snapshot.billingProducts?.[expected.handle], expected)
  );
  const retiredProductResults = retiredProducts.map((expected) =>
    retiredProductAudit(
      snapshot.retiredProducts?.[expected.handle] || snapshot.billingProducts?.[expected.handle],
      expected,
    )
  );
  const collectionResult = collectionAudit(snapshot.collections?.phones, expectedHandles);
  const pageResults = requiredPages.map((expected) => pageAudit(snapshot.pages?.[expected.handle], expected));
  const failures = [
    ...(snapshot.pageAccessError ? [`pages: ${snapshot.pageAccessError}`] : []),
    ...productResults.flatMap((result) => result.failures.map((failure) => `product ${result.handle}: ${failure}`)),
    ...billingProductResults.flatMap((result) => result.failures.map((failure) => `billing product ${result.handle}: ${failure}`)),
    ...retiredProductResults.flatMap((result) => result.failures.map((failure) => `retired product ${result.handle}: ${failure}`)),
    ...collectionResult.failures.map((failure) => `collection phones: ${failure}`),
    ...pageResults.flatMap((result) => result.failures.map((failure) => `page ${result.handle}: ${failure}`)),
  ];

  return {
    generatedAt: new Date().toISOString(),
    products: productResults,
    billingProducts: billingProductResults,
    retiredProducts: retiredProductResults,
    collection: collectionResult,
    pages: pageResults,
    failures,
  };
}

async function adminGraphql({ store, auth, query, variables }) {
  const response = await fetch(`https://${store}/admin/api/${apiVersion}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...auth.headers,
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${JSON.stringify(payload)}`);
  if (payload.errors && payload.errors.length > 0) throw new Error(`GraphQL errors: ${JSON.stringify(payload.errors)}`);
  return payload.data;
}

async function fetchSnapshot({ store, auth, expectedProducts = readExpectedProducts() }) {
  const products = {};
  for (const expected of expectedProducts) {
    const data = await adminGraphql({
      store,
      auth,
      query: productByHandleQuery,
      variables: { identifier: { handle: expected['URL handle'] } },
    });
    products[expected['URL handle']] = data.productByIdentifier;
  }

  const billingProducts = {};
  for (const expected of requiredBillingProducts) {
    const data = await adminGraphql({
      store,
      auth,
      query: productByHandleQuery,
      variables: { identifier: { handle: expected.handle } },
    });
    billingProducts[expected.handle] = data.productByIdentifier;
  }

  const retiredProductResults = {};
  for (const expected of retiredProducts) {
    const data = await adminGraphql({
      store,
      auth,
      query: productByHandleQuery,
      variables: { identifier: { handle: expected.handle } },
    });
    retiredProductResults[expected.handle] = data.productByIdentifier;
  }

  const collectionData = await adminGraphql({
    store,
    auth,
    query: collectionByHandleQuery,
    variables: { query: 'handle:phones' },
  });

  const pages = {};
  let pageAccessError = '';
  for (const expected of requiredPages) {
    if (pageAccessError) {
      pages[expected.handle] = { handle: expected.handle, accessSkipped: true };
      continue;
    }

    try {
      const data = await adminGraphql({
        store,
        auth,
        query: pageByHandleQuery,
        variables: { query: `handle:${expected.handle}` },
      });
      pages[expected.handle] = data.pages.nodes[0] || null;
    } catch (error) {
      if (!/Access denied for pages field|read_content|read_online_store_pages|ACCESS_DENIED/i.test(error.message || '')) {
        throw error;
      }
      pageAccessError = 'current Admin auth cannot read pages; use a token/session with read_content or read_online_store_pages to verify required pages';
      pages[expected.handle] = { handle: expected.handle, accessSkipped: true };
    }
  }

  return {
    store,
    products,
    billingProducts,
    retiredProducts: retiredProductResults,
    collections: {
      phones: collectionData.collections.nodes[0] || null,
    },
    pages,
    pageAccessError,
  };
}

function writeReport(report) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  return outputPath;
}

async function main() {
  const fixtureIndex = process.argv.indexOf('--fixture');
  let snapshot;

  if (fixtureIndex !== -1) {
    const fixturePath = process.argv[fixtureIndex + 1];
    if (!fixturePath) usage();
    snapshot = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  } else {
    const store = normalizeStore(process.env.SHOPIFY_STORE || process.env.SHOPIFY_STORE_DOMAIN);
    const auth = resolveAdminAuth();
    if (!store || !store.endsWith('.myshopify.com') || !auth) usage();
    console.log(`Using Admin GraphQL auth source: ${auth.source}`);
    snapshot = await fetchSnapshot({ store, auth });
  }

  const report = auditSnapshot(snapshot);
  writeReport(report);
  console.log(`Storefront object audit wrote ${path.relative(root, outputPath)}`);
  console.log(`Products checked: ${report.products.length}`);
  console.log(`Billing products checked: ${report.billingProducts.length}`);
  console.log(`Retired products checked: ${report.retiredProducts.length}`);
  console.log(`Pages checked: ${report.pages.length}`);
  console.log(`Failures: ${report.failures.length}`);

  if (report.failures.length > 0) {
    for (const failure of report.failures) console.error(`FAIL ${failure}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}

module.exports = {
  auditSnapshot,
  collectionAudit,
  fetchSnapshot,
  billingProductAudit,
  retiredProductAudit,
  pageAudit,
  productAudit,
  requiredBillingProducts,
  retiredProducts,
  requiredPages,
};
