#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { resolveAdminAuth } = require('./shopify-admin-auth');

const root = path.resolve(__dirname, '..');
const productsCsvPath = path.join(root, 'store-setup/products.csv');
const dryRun = process.argv.includes('--dry-run');
const apiVersion = process.env.SHOPIFY_ADMIN_API_VERSION || '2026-04';
const legacyProductHandles = {
  'standard-phone': ['freedom-phone'],
  'rugged-phone': ['patriot-phone'],
};

const billingProducts = [
  {
    title: 'Monthly Service',
    handle: 'monthly-service',
    description: 'Personal phone number and monthly Independence Phone service.',
    sku: 'PP-MONTHLY-SERVICE',
    price: '17.76',
  },
  {
    title: 'Annual Service',
    handle: 'annual-service',
    description: 'Personal phone number and annual Independence Phone service.',
    sku: 'PP-ANNUAL-SERVICE',
    price: '200.00',
  },
  {
    title: 'Call Recording',
    handle: 'call-recording',
    description: 'Call recording add-on for an Independence Phone setup.',
    sku: 'PP-ADDON-CALL-RECORDING',
    price: '5.00',
  },
  {
    title: 'Quiet Hours',
    handle: 'family-quiet-hours',
    description: 'Quiet Hours add-on for an Independence Phone setup.',
    sku: 'PP-ADDON-FAMILY-QUIET-HOURS',
    price: '5.00',
  },
  {
    title: 'Voicemail to Email',
    handle: 'voicemail-to-email',
    description: 'Voicemail to Email add-on for an Independence Phone setup.',
    sku: 'PP-ADDON-VOICEMAIL-TO-EMAIL',
    price: '5.00',
  },
  {
    title: 'Auto Attendant',
    handle: 'auto-attendant',
    description: 'Auto Attendant add-on for an Independence Phone setup.',
    sku: 'PP-ADDON-AUTO-ATTENDANT',
    price: '5.00',
  },
  {
    title: 'Add-on Bundle',
    handle: 'add-on-bundle',
    description: 'Bundled add-ons for an Independence Phone setup.',
    sku: 'PP-ADDON-BUNDLE',
    price: '10.00',
  },
  {
    title: 'Patriot Package',
    handle: 'patriot-package',
    description: 'Package balance for the limited Patriot Package offer.',
    sku: 'PP-PATRIOT-PACKAGE',
    price: '150.00',
  },
];

const productByIdentifierQuery = `
query ProductByIdentifier($identifier: ProductIdentifierInput!) {
  productByIdentifier(identifier: $identifier) {
    id
    handle
    title
    variants(first: 1) {
      nodes {
        id
        price
        inventoryItem {
          id
          requiresShipping
        }
      }
    }
  }
}
`;

const productCreateMutation = `
mutation CreateProduct($product: ProductCreateInput!) {
  productCreate(product: $product) {
    product {
      id
      handle
      title
      variants(first: 1) {
        nodes {
          id
          price
          inventoryItem {
            id
            requiresShipping
          }
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}
`;

const productUpdateMutation = `
mutation UpdateProduct($product: ProductUpdateInput!) {
  productUpdate(product: $product) {
    product {
      id
      handle
      title
      variants(first: 1) {
        nodes {
          id
          price
          inventoryItem {
            id
            requiresShipping
          }
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}
`;

const productVariantUpdateMutation = `
mutation UpdateProductVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $productId, variants: $variants) {
    productVariants {
      id
      price
      taxable
      inventoryItem {
        id
        requiresShipping
      }
    }
    userErrors {
      field
      message
    }
  }
}
`;

const inventoryItemUpdateMutation = `
mutation InventoryItemUpdate($id: ID!, $input: InventoryItemInput!) {
  inventoryItemUpdate(id: $id, input: $input) {
    inventoryItem {
      id
      requiresShipping
    }
    userErrors {
      field
      message
    }
  }
}
`;

const collectionByHandleQuery = `
query CollectionByHandle($query: String!) {
  collections(first: 1, query: $query) {
    nodes {
      id
      handle
      title
      products(first: 10) {
        nodes {
          id
        }
      }
    }
  }
}
`;

const collectionCreateMutation = `
mutation CollectionCreate($input: CollectionInput!) {
  collectionCreate(input: $input) {
    collection {
      id
      handle
      title
    }
    userErrors {
      field
      message
    }
  }
}
`;

const collectionAddProductsMutation = `
mutation CollectionAddProducts($id: ID!, $productIds: [ID!]!) {
  collectionAddProducts(id: $id, productIds: $productIds) {
    collection {
      id
      title
      products(first: 10) {
        nodes {
          id
          title
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}
`;

const publicationsQuery = `
query Publications {
  publications(first: 20) {
    nodes {
      id
      name
    }
  }
}
`;

const publishablePublishMutation = `
mutation PublishablePublish($id: ID!, $input: [PublicationInput!]!) {
  publishablePublish(id: $id, input: $input) {
    publishable {
      __typename
      ... on Product {
        id
      }
      ... on Collection {
        id
      }
    }
    userErrors {
      field
      message
    }
  }
}
`;

const pageByHandleQuery = `
query PageByHandle($query: String!) {
  pages(first: 1, query: $query) {
    nodes {
      id
      handle
      title
    }
  }
}
`;

const pageCreateMutation = `
mutation CreatePage($page: PageCreateInput!) {
  pageCreate(page: $page) {
    page {
      id
      title
      handle
    }
    userErrors {
      code
      field
      message
    }
  }
}
`;

function usage(exitCode = 64) {
  console.error(`Usage:
  SHOPIFY_STORE=STORE.myshopify.com SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_... node scripts/create-storefront-objects.js
  SHOPIFY_STORE=STORE.myshopify.com SHOPIFY_USE_CLI_SESSION=1 node scripts/create-storefront-objects.js
  node scripts/create-storefront-objects.js --dry-run

Required token scopes:
  read_products, write_products, read_content, write_content or write_online_store_pages
  read_publications and write_publications to publish products/collections to Online Store
  write_inventory to automatically mark hidden billing products as non-shipping

Optional:
  SHOPIFY_ADMIN_API_VERSION=${apiVersion}
  SHOPIFY_ONLINE_STORE_PUBLICATION_ID=gid://shopify/Publication/...`);
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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function rowObject(headers, row) {
  return Object.fromEntries(headers.map((header, index) => [header, row[index] || '']));
}

function readProducts() {
  const rows = parseCsv(fs.readFileSync(productsCsvPath, 'utf8'));
  const [headers, ...productRows] = rows;
  return productRows.map((row) => rowObject(headers, row));
}

function productInputFromRow(row, id) {
  const tags = row.Tags.split(',').map((tag) => tag.trim()).filter(Boolean);
  const metafields = [
    ['product_deck', 'single_line_text_field'],
    ['best_for', 'single_line_text_field'],
    ['specs', 'multi_line_text_field'],
  ].map(([key, type]) => ({
    namespace: 'custom',
    key,
    type,
    value: row[`product.metafields.custom.${key}`],
  }));

  const input = {
    title: row.Title,
    handle: row['URL handle'],
    descriptionHtml: `<p>${escapeHtml(row.Description)}</p>`,
    vendor: row.Vendor,
    productType: row.Type,
    status: 'ACTIVE',
    tags,
    templateSuffix: 'independence-phone',
    metafields,
    seo: {
      title: `${row.Title} | Independence Phone`,
      description: row.Description,
    },
  };

  if (id) input.id = id;
  return input;
}

function productInputFromBillingProduct(item, id) {
  const input = {
    title: item.title,
    handle: item.handle,
    descriptionHtml: `<p>${escapeHtml(item.description)}</p>`,
    vendor: 'Independence Phone',
    productType: 'Billing Item',
    status: 'ACTIVE',
    tags: ['patriot-phone', 'billing-item', 'hidden-from-catalog'],
    templateSuffix: 'billing-item',
    seo: {
      title: `${item.title} | Independence Phone`,
      description: item.description,
    },
  };

  if (id) input.id = id;
  return input;
}

function variantInputFromRow(row, variantId) {
  return {
    id: variantId,
    price: row.Price,
    taxable: row['Charge tax'] === 'true',
    inventoryPolicy: row['Continue selling when out of stock'] === 'continue' ? 'CONTINUE' : 'DENY',
  };
}

function variantInputFromBillingProduct(item, variantId) {
  return {
    id: variantId,
    price: item.price,
    taxable: true,
    inventoryPolicy: 'CONTINUE',
  };
}

function formatUserErrors(errors) {
  return errors.map((error) => `${(error.field || []).join('.') || 'input'}: ${error.message}`).join('; ');
}

function isPublicationAccessError(error) {
  return /read_publications|write_publications|ACCESS_DENIED|Access denied/i.test(error.message);
}

function isInventoryAccessError(error) {
  return /write_inventory|inventoryItemUpdate|inventory item|ACCESS_DENIED|Access denied/i.test(error.message);
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
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(payload)}`);
  }
  if (payload.errors && payload.errors.length > 0) {
    throw new Error(`GraphQL errors: ${JSON.stringify(payload.errors)}`);
  }
  return payload.data;
}

async function onlineStorePublicationId({ store, auth }) {
  if (process.env.SHOPIFY_ONLINE_STORE_PUBLICATION_ID) {
    return process.env.SHOPIFY_ONLINE_STORE_PUBLICATION_ID;
  }

  const data = await adminGraphql({
    store,
    auth,
    query: publicationsQuery,
    variables: {},
  });

  const onlineStore = data.publications.nodes.find((publication) => publication.name === 'Online Store')
    || data.publications.nodes.find((publication) => publication.name.toLowerCase().includes('online store'));

  if (!onlineStore) {
    throw new Error('Online Store publication was not found. Set SHOPIFY_ONLINE_STORE_PUBLICATION_ID and rerun.');
  }

  return onlineStore.id;
}

async function publishToOnlineStore({ store, auth, publicationId, resourceId, label }) {
  const result = await adminGraphql({
    store,
    auth,
    query: publishablePublishMutation,
    variables: {
      id: resourceId,
      input: [{ publicationId }],
    },
  });

  const payload = result.publishablePublish;
  if (payload.userErrors && payload.userErrors.length > 0) {
    throw new Error(`${label} publication: ${formatUserErrors(payload.userErrors)}`);
  }

  console.log(`published ${label} to Online Store`);
}

async function publishResourcesToOnlineStore({ store, auth, resources }) {
  let publicationId;
  try {
    publicationId = await onlineStorePublicationId({ store, auth });
  } catch (error) {
    if (!isPublicationAccessError(error)) throw error;
    console.warn('Skipped Online Store publishing: token needs read_publications/write_publications, or set SHOPIFY_ONLINE_STORE_PUBLICATION_ID with write_publications. Publish products and collection manually in Shopify admin.');
    return;
  }

  for (const resource of resources) {
    try {
      await publishToOnlineStore({
        store,
        auth,
        publicationId,
        resourceId: resource.id,
        label: resource.label,
      });
    } catch (error) {
      if (!isPublicationAccessError(error)) throw error;
      console.warn(`Skipped ${resource.label} Online Store publishing: token needs write_publications. Publish it manually in Shopify admin.`);
    }
  }
}

async function markInventoryItemNonShipping({ store, auth, inventoryItemId, label }) {
  if (!inventoryItemId) {
    console.warn(`Skipped ${label} non-shipping update: billing product variant has no inventory item id.`);
    return;
  }

  try {
    const result = await adminGraphql({
      store,
      auth,
      query: inventoryItemUpdateMutation,
      variables: {
        id: inventoryItemId,
        input: {
          requiresShipping: false,
          tracked: false,
        },
      },
    });

    const payload = result.inventoryItemUpdate;
    if (payload.userErrors && payload.userErrors.length > 0) {
      throw new Error(`${label} inventory item: ${formatUserErrors(payload.userErrors)}`);
    }
    console.log(`marked ${label} as non-shipping`);
  } catch (error) {
    if (!isInventoryAccessError(error)) throw error;
    console.warn(`Skipped ${label} non-shipping update: token needs write_inventory. Mark this billing product as not requiring shipping in Shopify admin.`);
  }
}

async function findProductByHandle({ store, auth, handle }) {
  const data = await adminGraphql({
    store,
    auth,
    query: productByIdentifierQuery,
    variables: { identifier: { handle } },
  });

  return data.productByIdentifier;
}

async function upsertProduct({ store, auth, row }) {
  const handle = row['URL handle'];
  let existing = await findProductByHandle({ store, auth, handle });
  let sourceHandle = handle;

  if (!existing) {
    for (const legacyHandle of legacyProductHandles[handle] || []) {
      const legacyProduct = await findProductByHandle({ store, auth, handle: legacyHandle });
      if (legacyProduct) {
        existing = legacyProduct;
        sourceHandle = legacyHandle;
        break;
      }
    }
  }

  const mutation = existing ? productUpdateMutation : productCreateMutation;
  const productInput = productInputFromRow(row, existing && existing.id);
  const mutationName = existing ? 'productUpdate' : 'productCreate';
  const result = await adminGraphql({
    store,
    auth,
    query: mutation,
    variables: { product: productInput },
  });

  const payload = result[mutationName];
  if (payload.userErrors && payload.userErrors.length > 0) {
    throw new Error(`${handle}: ${formatUserErrors(payload.userErrors)}`);
  }

  const product = payload.product;
  const variant = product.variants.nodes[0];
  if (!variant) {
    throw new Error(`${handle}: product has no default variant to price.`);
  }

  const variantResult = await adminGraphql({
    store,
    auth,
    query: productVariantUpdateMutation,
    variables: {
      productId: product.id,
      variants: [variantInputFromRow(row, variant.id)],
    },
  });

  const variantPayload = variantResult.productVariantsBulkUpdate;
  if (variantPayload.userErrors && variantPayload.userErrors.length > 0) {
    throw new Error(`${handle} variant: ${formatUserErrors(variantPayload.userErrors)}`);
  }

  if (existing && sourceHandle !== handle) {
    console.log(`updated legacy product ${sourceHandle} to ${handle}: ${product.id}`);
  } else {
    console.log(`${existing ? 'updated' : 'created'} product ${handle}: ${product.id}`);
  }
  return product.id;
}

async function upsertBillingProduct({ store, auth, item }) {
  const existing = await findProductByHandle({ store, auth, handle: item.handle });
  const mutation = existing ? productUpdateMutation : productCreateMutation;
  const mutationName = existing ? 'productUpdate' : 'productCreate';
  const result = await adminGraphql({
    store,
    auth,
    query: mutation,
    variables: { product: productInputFromBillingProduct(item, existing && existing.id) },
  });

  const payload = result[mutationName];
  if (payload.userErrors && payload.userErrors.length > 0) {
    throw new Error(`${item.handle}: ${formatUserErrors(payload.userErrors)}`);
  }

  const product = payload.product;
  const variant = product.variants.nodes[0];
  if (!variant) {
    throw new Error(`${item.handle}: product has no default variant to price.`);
  }

  const variantResult = await adminGraphql({
    store,
    auth,
    query: productVariantUpdateMutation,
    variables: {
      productId: product.id,
      variants: [variantInputFromBillingProduct(item, variant.id)],
    },
  });

  const variantPayload = variantResult.productVariantsBulkUpdate;
  if (variantPayload.userErrors && variantPayload.userErrors.length > 0) {
    throw new Error(`${item.handle} variant: ${formatUserErrors(variantPayload.userErrors)}`);
  }

  const updatedVariant = variantPayload.productVariants[0] || variant;
  await markInventoryItemNonShipping({
    store,
    auth,
    inventoryItemId: updatedVariant.inventoryItem?.id || variant.inventoryItem?.id,
    label: `billing product ${item.handle}`,
  });

  console.log(`${existing ? 'updated' : 'created'} billing product ${item.handle}: ${product.id}`);
  return product.id;
}

async function ensurePhonesCollection({ store, auth, productIds }) {
  const existingData = await adminGraphql({
    store,
    auth,
    query: collectionByHandleQuery,
    variables: { query: 'handle:phones' },
  });
  let collection = existingData.collections.nodes[0];

  if (!collection) {
    const result = await adminGraphql({
      store,
      auth,
      query: collectionCreateMutation,
      variables: {
        input: {
          title: 'Phones',
          handle: 'phones',
          descriptionHtml: '<p>Choose between the two Independence Phone handsets.</p>',
          templateSuffix: 'phones',
        },
      },
    });

    const payload = result.collectionCreate;
    if (payload.userErrors && payload.userErrors.length > 0) {
      throw new Error(`collection phones: ${formatUserErrors(payload.userErrors)}`);
    }
    collection = payload.collection;
    collection.products = { nodes: [] };
    console.log(`created collection phones: ${collection.id}`);
  } else {
    console.log(`exists collection phones: ${collection.id}`);
  }

  const existingProductIds = new Set((collection.products && collection.products.nodes || []).map((product) => product.id));
  const missingProductIds = productIds.filter((productId) => !existingProductIds.has(productId));
  if (missingProductIds.length > 0) {
    const addResult = await adminGraphql({
      store,
      auth,
      query: collectionAddProductsMutation,
      variables: {
        id: collection.id,
        productIds: missingProductIds,
      },
    });
    const addPayload = addResult.collectionAddProducts;
    if (addPayload.userErrors && addPayload.userErrors.length > 0) {
      throw new Error(`collection phones products: ${formatUserErrors(addPayload.userErrors)}`);
    }
    console.log(`added ${missingProductIds.length} product(s) to collection phones`);
  }

  return collection.id;
}

async function ensurePage({ store, auth, title, handle, body, templateSuffix }) {
  const existingData = await adminGraphql({
    store,
    auth,
    query: pageByHandleQuery,
    variables: { query: `handle:${handle}` },
  });
  const existing = existingData.pages.nodes[0];
  if (existing) {
    console.log(`exists page ${handle}: ${existing.id}`);
    return existing.id;
  }

  const result = await adminGraphql({
    store,
    auth,
    query: pageCreateMutation,
    variables: {
      page: {
        title,
        handle,
        body,
        isPublished: true,
        templateSuffix,
      },
    },
  });

  const payload = result.pageCreate;
  if (payload.userErrors && payload.userErrors.length > 0) {
    throw new Error(`page ${handle}: ${formatUserErrors(payload.userErrors)}`);
  }
  console.log(`created page ${handle}: ${payload.page.id}`);
  return payload.page.id;
}

async function ensureStorePages({ store, auth }) {
  await ensurePage({
    store,
    auth,
    title: 'Order Now',
    handle: 'order-now',
    body: '<p>Build your Independence Phone setup by choosing a phone, service plan, and add-ons.</p>',
    templateSuffix: 'order',
  });
  await ensurePage({
    store,
    auth,
    title: 'FAQ',
    handle: 'faq',
    body: '<p>Install, use, refer, and troubleshoot Independence Phone.</p>',
    templateSuffix: 'faq',
  });
  await ensurePage({
    store,
    auth,
    title: 'Contact',
    handle: 'contact',
    body: '<p>Questions about Independence Phone, service, or setup? Use the form below and the team will follow up.</p>',
    templateSuffix: 'contact',
  });
}

function isPageAccessDeniedError(error) {
  return /access denied.*pages field|pages field|read_content|write_content|write_online_store_pages|ACCESS_DENIED/i.test(
    error.message || '',
  );
}

async function main() {
  const products = readProducts();

  if (dryRun) {
    console.log(`Storefront objects ready: ${products.length} products, ${billingProducts.length} hidden billing products, 1 collection, 3 pages`);
    for (const product of products) {
      console.log(`- product ${product['URL handle']}: $${product.Price}, template product.independence-phone`);
    }
    for (const product of billingProducts) {
      console.log(`- hidden billing product ${product.handle}: $${product.price}, template product.billing-item`);
    }
    console.log('- legacy product handles are updated in place when found: freedom-phone -> standard-phone, patriot-phone -> rugged-phone');
    console.log('- collection phones: template collection.phones');
    console.log('- publish phone products, billing products, and collection to Online Store when read_publications/write_publications are available');
    console.log('- page order-now: template page.order');
    console.log('- page faq: template page.faq');
    console.log('- page contact: template page.contact');
    return;
  }

  const store = normalizeStore(process.env.SHOPIFY_STORE || process.env.SHOPIFY_STORE_DOMAIN);
  const auth = resolveAdminAuth();

  if (!store || !store.endsWith('.myshopify.com') || !auth) {
    usage();
  }

  console.log(`Using Admin GraphQL auth source: ${auth.source}`);

  const createdProducts = [];
  for (const row of products) {
    const productId = await upsertProduct({ store, auth, row });
    createdProducts.push({
      id: productId,
      label: `product ${row['URL handle']}`,
    });
  }

  const createdBillingProducts = [];
  for (const item of billingProducts) {
    const productId = await upsertBillingProduct({ store, auth, item });
    createdBillingProducts.push({
      id: productId,
      label: `billing product ${item.handle}`,
    });
  }

  const collectionId = await ensurePhonesCollection({
    store,
    auth,
    productIds: createdProducts.map((product) => product.id),
  });
  await publishResourcesToOnlineStore({
    store,
    auth,
    resources: [
      ...createdProducts,
      ...createdBillingProducts,
      { id: collectionId, label: 'collection phones' },
    ],
  });
  try {
    await ensureStorePages({ store, auth });
  } catch (error) {
    if (!isPageAccessDeniedError(error)) {
      throw error;
    }

    console.warn(
      'Skipped Online Store page creation: the current Shopify CLI session cannot access pages. Create visible pages for /pages/order-now, /pages/faq, and /pages/contact in Shopify admin.',
    );
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
