#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { resolveAdminAuth } = require('./shopify-admin-auth');

const root = path.resolve(__dirname, '..');
const definitionsPath = path.join(root, 'store-setup/product-metafields.json');
const dryRun = process.argv.includes('--dry-run');
const apiVersion = process.env.SHOPIFY_ADMIN_API_VERSION || '2026-04';

const mutation = `
mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
  metafieldDefinitionCreate(definition: $definition) {
    createdDefinition {
      id
      name
    }
    userErrors {
      field
      message
      code
    }
  }
}
`;

function usage(exitCode = 64) {
  console.error(`Usage:
  SHOPIFY_STORE=STORE.myshopify.com SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_... node scripts/create-product-metafields.js
  SHOPIFY_STORE=STORE.myshopify.com SHOPIFY_USE_CLI_SESSION=1 node scripts/create-product-metafields.js
  node scripts/create-product-metafields.js --dry-run

Optional:
  SHOPIFY_ADMIN_API_VERSION=${apiVersion}`);
  process.exit(exitCode);
}

function readDefinitions() {
  if (!fs.existsSync(definitionsPath)) {
    throw new Error(`Missing definitions file: ${definitionsPath}`);
  }

  const definitions = JSON.parse(fs.readFileSync(definitionsPath, 'utf8'));
  if (!Array.isArray(definitions) || definitions.length === 0) {
    throw new Error('Expected store-setup/product-metafields.json to contain definitions.');
  }

  return definitions;
}

function normalizeStore(value) {
  if (!value) return '';
  return value
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .trim();
}

function isAlreadyCreated(userErrors) {
  return userErrors.some((error) => {
    const code = String(error.code || '').toUpperCase();
    const message = String(error.message || '').toLowerCase();
    return code === 'TAKEN' || message.includes('already exists') || message.includes('already been taken');
  });
}

async function createDefinition({ store, auth, definition }) {
  const response = await fetch(`https://${store}/admin/api/${apiVersion}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...auth.headers,
    },
    body: JSON.stringify({
      query: mutation,
      variables: { definition },
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(payload)}`);
  }

  if (payload.errors && payload.errors.length > 0) {
    throw new Error(`GraphQL errors: ${JSON.stringify(payload.errors)}`);
  }

  const result = payload.data && payload.data.metafieldDefinitionCreate;
  if (!result) {
    throw new Error(`Unexpected response: ${JSON.stringify(payload)}`);
  }

  if (result.userErrors && result.userErrors.length > 0) {
    if (isAlreadyCreated(result.userErrors)) {
      return { status: 'exists', userErrors: result.userErrors };
    }
    return { status: 'error', userErrors: result.userErrors };
  }

  return { status: 'created', createdDefinition: result.createdDefinition };
}

async function main() {
  const definitions = readDefinitions();

  if (dryRun) {
    console.log(`Product metafield definitions ready: ${definitions.length}`);
    for (const definition of definitions) {
      console.log(`- ${definition.namespace}.${definition.key}: ${definition.type} (${definition.ownerType})`);
    }
    return;
  }

  const store = normalizeStore(process.env.SHOPIFY_STORE || process.env.SHOPIFY_STORE_DOMAIN);
  const auth = resolveAdminAuth();

  if (!store || !store.endsWith('.myshopify.com') || !auth) {
    usage();
  }

  console.log(`Using Admin GraphQL auth source: ${auth.source}`);

  let failed = false;
  for (const definition of definitions) {
    const label = `${definition.namespace}.${definition.key}`;
    const result = await createDefinition({ store, auth, definition });

    if (result.status === 'created') {
      console.log(`created ${label}: ${result.createdDefinition.id}`);
    } else if (result.status === 'exists') {
      console.log(`exists ${label}`);
    } else {
      failed = true;
      console.error(`failed ${label}: ${JSON.stringify(result.userErrors)}`);
    }
  }

  if (failed) process.exit(1);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
