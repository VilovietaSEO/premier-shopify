#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { resolveAdminAuth } = require('./shopify-admin-auth');
const { billingProducts } = require('./storefront-billing-products');

const apiVersion = process.env.SHOPIFY_ADMIN_API_VERSION || '2026-04';
const dryRun = process.argv.includes('--dry-run');
const assignmentApproved = process.env.SHOPIFY_PRODUCT_MEDIA_APPROVED === '1';

const phoneMediaPlan = [
  {
    handle: 'standard-phone',
    files: [
      {
        filename: 'ip-classic-phone-front.webp',
        contentType: 'IMAGE',
        alt: 'Classic Phone front view',
      },
      {
        filename: 'ip-classic-phone-spin.mp4',
        contentType: 'VIDEO',
        alt: 'Classic Phone rotating view',
      },
      {
        filename: 'ip-classic-phone-buttons.webp',
        contentType: 'IMAGE',
        alt: 'Classic Phone keypad and controls',
      },
      {
        filename: 'ip-classic-phone-charger.webp',
        contentType: 'IMAGE',
        alt: 'Classic Phone handset and charging base',
      },
      {
        filename: 'ip-classic-phone-back.webp',
        contentType: 'IMAGE',
        alt: 'Classic Phone back view',
      },
    ],
  },
  {
    handle: 'rugged-phone',
    files: [
      {
        filename: 'ip-rugged-phone-front.webp',
        contentType: 'IMAGE',
        alt: 'Rugged Phone front view',
      },
      {
        filename: 'ip-rugged-phone-spin.mp4',
        contentType: 'VIDEO',
        alt: 'Rugged Phone rotating view',
      },
      {
        filename: 'ip-rugged-phone-buttons.webp',
        contentType: 'IMAGE',
        alt: 'Rugged Phone keypad and controls',
      },
      {
        filename: 'ip-rugged-phone-charger.webp',
        contentType: 'IMAGE',
        alt: 'Rugged Phone handset and charging base',
      },
      {
        filename: 'ip-rugged-phone-back.webp',
        contentType: 'IMAGE',
        alt: 'Rugged Phone back view',
      },
    ],
  },
];

const billingMediaPlan = billingProducts.map((product) => ({
  handle: product.handle,
  files: [
    {
      filename: `ip-${product.handle}-billing-flag.webp`,
      sourceFilename: 'ip-billing-flag.webp',
      contentType: 'IMAGE',
      alt: `${product.title} billing item`,
    },
  ],
}));

const mediaPlan = [
  ...phoneMediaPlan,
  ...billingMediaPlan,
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

const stagedUploadsCreateMutation = `
mutation StageProductVideo($input: [StagedUploadInput!]!) {
  stagedUploadsCreate(input: $input) {
    stagedTargets {
      url
      resourceUrl
      parameters {
        name
        value
      }
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
  SHOPIFY_THEME_ASSET_BASE=https://cdn.shopify.com/s/files/.../assets

Safety gate for a real assignment:
  SHOPIFY_PRODUCT_MEDIA_APPROVED=1

Each phone plan assigns Front first, followed by the optimized rotating MP4,
then the approved Buttons, Charger, and Back media.
The seven deferred service/add-on products receive ip-billing-flag.webp.`);
  process.exit(exitCode);
}

function normalizeStore(value) {
  if (!value) return '';
  return value.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
}

function assetBase(store) {
  const configuredBase = String(process.env.SHOPIFY_THEME_ASSET_BASE || '').trim();
  if (configuredBase) return configuredBase.replace(/\/+$/, '');
  if (!dryRun) {
    throw new Error('SHOPIFY_THEME_ASSET_BASE is required for a real assignment. Copy the exact base from a rendered Shopify theme asset URL; do not assume a /cdn/shop/t/N/assets path.');
  }
  return `https://${store}/cdn/shop/t/VERIFY_RENDERED_THEME_ASSET_BASE/assets`;
}

function fileInputs(store) {
  const base = assetBase(store);
  return mediaPlan.map((product) => ({
    handle: product.handle,
    files: product.files.map((file) => {
      const input = {
        filename: file.filename,
        contentType: file.contentType,
        alt: file.alt,
        originalSource: `${base}/${file.sourceFilename || file.filename}`,
      };

      // Shopify supports duplicate replacement for images, but rejects the
      // option for videos. ProductSet itself still replaces the product's
      // complete media list with this ordered file input.
      if (file.contentType === 'IMAGE') input.duplicateResolutionMode = 'REPLACE';

      return input;
    }),
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

async function stageVideo({ store, auth, file }) {
  const localPath = path.resolve(__dirname, '..', 'independence-phone-theme', 'assets', file.filename);
  const bytes = await fs.promises.readFile(localPath);
  const result = await adminGraphql({
    store,
    auth,
    query: stagedUploadsCreateMutation,
    variables: {
      input: [{
        resource: 'VIDEO',
        filename: file.filename,
        mimeType: 'video/mp4',
        fileSize: String(bytes.length),
        httpMethod: 'POST',
      }],
    },
  });

  const payload = result.stagedUploadsCreate;
  if (payload.userErrors && payload.userErrors.length > 0) {
    throw new Error(`${file.filename}: ${formatUserErrors(payload.userErrors)}`);
  }

  const target = payload.stagedTargets?.[0];
  if (!target?.url || !target?.resourceUrl) {
    throw new Error(`${file.filename}: Shopify did not return a staged video upload target.`);
  }

  const form = new FormData();
  for (const parameter of target.parameters || []) form.append(parameter.name, parameter.value);
  form.append('file', new Blob([bytes], { type: 'video/mp4' }), file.filename);

  const uploadResponse = await fetch(target.url, {
    method: 'POST',
    body: form,
  });
  if (!uploadResponse.ok) {
    const body = await uploadResponse.text().catch(() => '');
    throw new Error(`${file.filename}: staged upload failed with HTTP ${uploadResponse.status}: ${body.slice(0, 300)}`);
  }

  return target.resourceUrl;
}

async function stageVideoSources({ store, auth, plan }) {
  const stagedSources = new Map();

  for (const product of mediaPlan) {
    for (const file of product.files) {
      if (file.contentType !== 'VIDEO' || stagedSources.has(file.filename)) continue;
      stagedSources.set(file.filename, await stageVideo({ store, auth, file }));
    }
  }

  return plan.map((product) => ({
    ...product,
    files: product.files.map((file) => (
      file.contentType === 'VIDEO'
        ? {
            contentType: file.contentType,
            alt: file.alt,
            originalSource: stagedSources.get(file.filename),
          }
        : file
    )),
  }));
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

  if (!assignmentApproved) {
    throw new Error(
      'Product media assignment is gated. Confirm the approved Front/rotating/Buttons/Charger/Back phone media and deferred billing flag asset, then set SHOPIFY_PRODUCT_MEDIA_APPROVED=1.',
    );
  }

  const auth = resolveAdminAuth();
  if (!store || !store.endsWith('.myshopify.com') || !auth) usage();

  console.log(`Using Admin GraphQL auth source: ${auth.source}`);
  console.log('Staging Shopify-hosted product videos...');
  const stagedPlan = await stageVideoSources({ store, auth, plan });
  const results = await assignMedia({ store, auth, plan: stagedPlan });
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
  billingMediaPlan,
  fileInputs,
  mediaPlan,
  phoneMediaPlan,
  stageVideo,
  stageVideoSources,
};
