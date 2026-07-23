#!/usr/bin/env node

const { resolveAdminAuth } = require('./shopify-admin-auth');

const apiVersion = process.env.SHOPIFY_ADMIN_API_VERSION || '2026-04';
const apply = process.argv.includes('--apply');
const retirementApproved = process.env.SHOPIFY_RETIRED_PRODUCT_ARCHIVE_APPROVED === '1';
const retiredHandle = 'patriot-package';

const productQuery = `
query RetiredProduct($identifier: ProductIdentifierInput!) {
  productByIdentifier(identifier: $identifier) {
    id
    handle
    title
    status
    publishedAt
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

const unpublishMutation = `
mutation UnpublishRetiredProduct($id: ID!, $input: [PublicationInput!]!) {
  publishableUnpublish(id: $id, input: $input) {
    userErrors {
      field
      message
    }
  }
}
`;

const productUpdateMutation = `
mutation ArchiveRetiredProduct($product: ProductUpdateInput!) {
  productUpdate(product: $product) {
    product {
      id
      handle
      status
      publishedAt
    }
    userErrors {
      field
      message
    }
  }
}
`;

function normalizeStore(value) {
  if (!value) return '';
  return value.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
}

function formatUserErrors(errors) {
  return (errors || [])
    .map((error) => `${(error.field || []).join('.') || 'input'}: ${error.message}`)
    .join('; ');
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
  if (payload.errors && payload.errors.length > 0) {
    throw new Error(`GraphQL errors: ${JSON.stringify(payload.errors)}`);
  }
  return payload.data;
}

async function retireProduct({ store, auth }) {
  const productData = await adminGraphql({
    store,
    auth,
    query: productQuery,
    variables: { identifier: { handle: retiredHandle } },
  });
  const product = productData.productByIdentifier;

  if (!product) {
    return {
      handle: retiredHandle,
      status: 'missing',
      unpublished: false,
      archived: false,
    };
  }

  let unpublished = false;
  if (product.publishedAt) {
    const publicationData = await adminGraphql({
      store,
      auth,
      query: publicationsQuery,
      variables: {},
    });
    const onlineStore = publicationData.publications.nodes.find(
      (publication) => publication.name === 'Online Store',
    );
    if (!onlineStore) throw new Error('Online Store publication was not found.');

    const unpublishData = await adminGraphql({
      store,
      auth,
      query: unpublishMutation,
      variables: {
        id: product.id,
        input: [{ publicationId: onlineStore.id }],
      },
    });
    const unpublishErrors = unpublishData.publishableUnpublish.userErrors;
    if (unpublishErrors.length > 0) {
      throw new Error(`retired product unpublish: ${formatUserErrors(unpublishErrors)}`);
    }
    unpublished = true;
  }

  let archived = false;
  if (product.status !== 'ARCHIVED') {
    const updateData = await adminGraphql({
      store,
      auth,
      query: productUpdateMutation,
      variables: {
        product: {
          id: product.id,
          status: 'ARCHIVED',
        },
      },
    });
    const updatePayload = updateData.productUpdate;
    if (updatePayload.userErrors.length > 0) {
      throw new Error(`retired product archive: ${formatUserErrors(updatePayload.userErrors)}`);
    }
    archived = true;
  }

  const verificationData = await adminGraphql({
    store,
    auth,
    query: productQuery,
    variables: { identifier: { handle: retiredHandle } },
  });
  const verifiedProduct = verificationData.productByIdentifier;
  if (verifiedProduct?.status !== 'ARCHIVED' || verifiedProduct?.publishedAt) {
    throw new Error(
      `Retired product verification failed: status=${verifiedProduct?.status || '(missing)'}, `
      + `publishedAt=${verifiedProduct?.publishedAt || '(blank)'}`,
    );
  }

  return {
    handle: retiredHandle,
    status: verifiedProduct.status,
    publishedAt: verifiedProduct.publishedAt,
    unpublished,
    archived,
  };
}

async function main() {
  if (!apply) {
    console.log('DRY RUN: retire patriot-package by unpublishing it from Online Store and setting status ARCHIVED.');
    console.log('No Shopify Admin request was made.');
    console.log(
      'To apply: set SHOPIFY_RETIRED_PRODUCT_ARCHIVE_APPROVED=1, provide Shopify Admin auth, and rerun with --apply.',
    );
    return;
  }

  if (!retirementApproved) {
    throw new Error(
      'Retired-product mutation is gated. Set SHOPIFY_RETIRED_PRODUCT_ARCHIVE_APPROVED=1 only after approving the non-destructive unpublish/archive action.',
    );
  }

  const store = normalizeStore(
    process.env.SHOPIFY_STORE
      || process.env.SHOPIFY_STORE_DOMAIN
      || 'jordan-mark-premier.myshopify.com',
  );
  const auth = resolveAdminAuth();
  if (!store.endsWith('.myshopify.com') || !auth) {
    throw new Error(
      'Set SHOPIFY_STORE and either SHOPIFY_ADMIN_ACCESS_TOKEN or SHOPIFY_USE_CLI_SESSION=1.',
    );
  }

  const result = await retireProduct({ store, auth });
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}

module.exports = {
  apply,
  retireProduct,
  retiredHandle,
  retirementApproved,
};
