#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const productsCsvPath = path.join(root, 'store-setup/products.csv');
const dryRun = process.argv.includes('--dry-run');
const apiVersion = process.env.SHOPIFY_ADMIN_API_VERSION || '2026-04';

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
  node scripts/create-storefront-objects.js --dry-run

Required token scopes:
  read_products, write_products, read_content, write_content or write_online_store_pages

Optional:
  SHOPIFY_ADMIN_API_VERSION=${apiVersion}`);
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

function variantInputFromRow(row, variantId) {
  return {
    id: variantId,
    price: row.Price,
    taxable: row['Charge tax'] === 'true',
    inventoryPolicy: row['Continue selling when out of stock'] === 'continue' ? 'CONTINUE' : 'DENY',
  };
}

function formatUserErrors(errors) {
  return errors.map((error) => `${(error.field || []).join('.') || 'input'}: ${error.message}`).join('; ');
}

async function adminGraphql({ store, token, query, variables }) {
  const response = await fetch(`https://${store}/admin/api/${apiVersion}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
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

async function upsertProduct({ store, token, row }) {
  const handle = row['URL handle'];
  const existingData = await adminGraphql({
    store,
    token,
    query: productByIdentifierQuery,
    variables: { identifier: { handle } },
  });

  const existing = existingData.productByIdentifier;
  const mutation = existing ? productUpdateMutation : productCreateMutation;
  const productInput = productInputFromRow(row, existing && existing.id);
  const mutationName = existing ? 'productUpdate' : 'productCreate';
  const result = await adminGraphql({
    store,
    token,
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
    token,
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

  console.log(`${existing ? 'updated' : 'created'} product ${handle}: ${product.id}`);
  return product.id;
}

async function ensurePhonesCollection({ store, token, productIds }) {
  const existingData = await adminGraphql({
    store,
    token,
    query: collectionByHandleQuery,
    variables: { query: 'handle:phones' },
  });
  let collection = existingData.collections.nodes[0];

  if (!collection) {
    const result = await adminGraphql({
      store,
      token,
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
      token,
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

async function ensureContactPage({ store, token }) {
  const existingData = await adminGraphql({
    store,
    token,
    query: pageByHandleQuery,
    variables: { query: 'handle:contact' },
  });
  const existing = existingData.pages.nodes[0];
  if (existing) {
    console.log(`exists page contact: ${existing.id}`);
    return existing.id;
  }

  const result = await adminGraphql({
    store,
    token,
    query: pageCreateMutation,
    variables: {
      page: {
        title: 'Contact',
        handle: 'contact',
        body: '<p>Questions about Independence Phone, service, or setup? Use the form below and the team will follow up.</p>',
        isPublished: true,
        templateSuffix: 'contact',
      },
    },
  });

  const payload = result.pageCreate;
  if (payload.userErrors && payload.userErrors.length > 0) {
    throw new Error(`page contact: ${formatUserErrors(payload.userErrors)}`);
  }
  console.log(`created page contact: ${payload.page.id}`);
  return payload.page.id;
}

async function main() {
  const products = readProducts();

  if (dryRun) {
    console.log(`Storefront objects ready: ${products.length} products, 1 collection, 1 page`);
    for (const product of products) {
      console.log(`- product ${product['URL handle']}: $${product.Price}, template product.independence-phone`);
    }
    console.log('- collection phones: template collection.phones');
    console.log('- page contact: template page.contact');
    return;
  }

  const store = normalizeStore(process.env.SHOPIFY_STORE || process.env.SHOPIFY_STORE_DOMAIN);
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

  if (!store || !store.endsWith('.myshopify.com') || !token) {
    usage();
  }

  const productIds = [];
  for (const row of products) {
    productIds.push(await upsertProduct({ store, token, row }));
  }

  await ensurePhonesCollection({ store, token, productIds });
  await ensureContactPage({ store, token });
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
