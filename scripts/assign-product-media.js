#!/usr/bin/env node

const { resolveAdminAuth } = require('./shopify-admin-auth');

const apiVersion = process.env.SHOPIFY_ADMIN_API_VERSION || '2026-04';
const dryRun = process.argv.includes('--dry-run');

const mediaPlan = [
  {
    handle: 'standard-phone',
    files: [
      {
        filename: 'ip-current-site-product-1.png',
        alt: 'Classic Phone cordless Wi-Fi handset with charging base',
      },
      {
        filename: 'ip-current-site-product-3.png',
        alt: 'Classic Phone alternate product view',
      },
    ],
  },
  {
    handle: 'rugged-phone',
    files: [
      {
        filename: 'ip-current-site-product-2.png',
        alt: 'Rugged Phone cordless Wi-Fi handset with charging base',
      },
      {
        filename: 'ip-current-site-product-4.png',
        alt: 'Rugged Phone alternate product view',
      },
    ],
  },
];

const productSetMutation = `
mutation AssignProductMedia($identifier: ProductSetIdentifiers!, $input: ProductSetInput!, $synchronous: Boolean!) {
  productSet(identifier: $identifier, input: $input, synchronous: $synchronous) {
    product {
      id
      handle
      title
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
    productSetOperation {
      id
      status
    }
    userErrors {
      field
      message
    }
  }
}
`;

function usage(exitCode = 64) {
  console.error(`Usage:
  SHOPIFY_STORE=STORE.myshopify.com SHOPIFY_USE_CLI_SESSION=1 node scripts/assign-product-media.js
  SHOPIFY_STORE=STORE.myshopify.com SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_... node scripts/assign-product-media.js
  node scripts/assign-product-media.js --dry-run

Optional:
  SHOPIFY_THEME_ASSET_BASE=https://STORE.myshopify.com/cdn/shop/t/2/assets`);
  process.exit(exitCode);
}

function normalizeStore(value) {
  if (!value) return '';
  return value.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
}

function assetBase(store) {
  return (process.env.SHOPIFY_THEME_ASSET_BASE || `https://${store}/cdn/shop/t/2/assets`).replace(/\/+$/, '');
}

function fileInputs(store) {
  const base = assetBase(store);
  return mediaPlan.map((product) => ({
    handle: product.handle,
    files: product.files.map((file) => ({
      filename: file.filename,
      contentType: 'IMAGE',
      alt: file.alt,
      duplicateResolutionMode: 'REPLACE',
      originalSource: `${base}/${file.filename}`,
    })),
  }));
}

function formatUserErrors(errors) {
  return errors.map((error) => `${(error.field || []).join('.') || 'input'}: ${error.message}`).join('; ');
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

async function assignMedia({ store, auth, plan = fileInputs(store) }) {
  const results = [];

  for (const product of plan) {
    const result = await adminGraphql({
      store,
      auth,
      query: productSetMutation,
      variables: {
        identifier: { handle: product.handle },
        input: {
          handle: product.handle,
          files: product.files,
        },
        synchronous: true,
      },
    });

    const payload = result.productSet;
    if (payload.userErrors && payload.userErrors.length > 0) {
      throw new Error(`${product.handle}: ${formatUserErrors(payload.userErrors)}`);
    }

    const media = payload.product?.media?.nodes || [];
    results.push({
      handle: product.handle,
      mediaCount: media.length,
      altTexts: media.map((item) => item.alt || ''),
    });
  }

  return results;
}

async function main() {
  const store = normalizeStore(process.env.SHOPIFY_STORE || process.env.SHOPIFY_STORE_DOMAIN || 'jordan-mark-premier.myshopify.com');
  const plan = fileInputs(store);

  if (dryRun) {
    console.log(`Product media assignment ready: ${plan.length} products`);
    for (const product of plan) {
      console.log(`- ${product.handle}:`);
      for (const file of product.files) console.log(`  - ${file.originalSource} (${file.alt})`);
    }
    return;
  }

  const auth = resolveAdminAuth();
  if (!store || !store.endsWith('.myshopify.com') || !auth) usage();

  console.log(`Using Admin GraphQL auth source: ${auth.source}`);
  const results = await assignMedia({ store, auth, plan });
  for (const result of results) {
    console.log(`assigned ${result.mediaCount} media item(s) to ${result.handle}`);
    for (const alt of result.altTexts) console.log(`- alt: ${alt}`);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}

module.exports = {
  assignMedia,
  assetBase,
  fileInputs,
  mediaPlan,
};
