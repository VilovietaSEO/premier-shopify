#!/usr/bin/env node

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const defaultOutputPath = path.join(root, 'tmp', 'shopify-live-proof', 'ops-deployment-audit.json');

const requiredLlmsRoutes = [
  { path: '/llms.txt', expected: ['# Independence Phone', '## Pages', '## Products'] },
  { path: '/products/standard-phone/llms.txt', expected: ['# Classic Phone', '## Key Facts'] },
  { path: '/products/rugged-phone/llms.txt', expected: ['# Rugged Phone', '## Key Facts'] },
  { path: '/pages/order-now/llms.txt', expected: ['# Order Now', 'guided order builder'] },
  { path: '/a/llms.txt?path=/pages/faq', expected: ['# FAQ', 'Support and buying FAQ'] },
];

function usage() {
  console.error('Usage: OPS_BASE_URL=https://ops.example.com CRM_VIEWER_TOKEN=... node scripts/audit-ops-deployment.js');
  console.error('Required for sale CRM proof: CRM_ORDER_INGEST_TOKEN=... SHOPIFY_ORDER_WEBHOOK_SECRET=...');
  console.error('Optional: SHOPIFY_STORE_URL=https://jordan-mark-premier.myshopify.com');
  console.error('Optional: OPS_AUDIT_OUTPUT=/absolute/path/ops-deployment-audit.json');
}

function normalizeBaseUrl(value) {
  if (!value) return null;
  const withProtocol = /^https?:\/\//.test(value) ? value : `https://${value}`;
  const url = new URL(withProtocol);
  url.pathname = '/';
  url.search = '';
  url.hash = '';
  return url;
}

function urlFor(baseUrl, routePath) {
  return new URL(routePath, baseUrl).href;
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: options.headers || {},
    body: options.body,
    redirect: options.redirect || 'follow',
  });

  return {
    status: response.status,
    ok: response.ok,
    contentType: response.headers.get('content-type') || '',
    location: response.headers.get('location') || '',
    body: await response.text(),
  };
}

function buildLead(shopifyStoreUrl, label) {
  const params = new URLSearchParams();
  params.set('crm[source_url]', urlFor(shopifyStoreUrl, '/pages/contact?utm_source=ops-deployment-audit'));
  params.set('crm[source_path]', '/pages/contact');
  params.set('crm[utm_source]', 'ops-deployment-audit');
  params.set('crm[return_to]', '/pages/contact?crm=received');
  params.set('contact[name]', label);
  params.set('contact[email]', 'ops.audit@example.com');
  params.set('contact[phone]', '555-0199');
  params.set('contact[Child age range]', '11-13');
  params.set('contact[Main use case]', 'Deployment proof');
  params.set('contact[Interested product]', 'Classic Phone');
  params.set('contact[Preferred service plan]', 'Monthly service - $17.76/mo');
  params.set('contact[Patriot Package interest]', 'Need help deciding');
  params.append('contact[Selected add-ons]', 'Voicemail to Email');
  params.set('contact[body]', `Deployment audit lead ${label}`);
  params.set('contact[Marketing opt-in]', 'No');
  params.set('contact[Privacy and terms consent]', 'Yes');
  return params;
}

function buildOrderPayload(label) {
  return {
    orders: [
      {
        id: `ops-audit-${Date.now()}`,
        name: label,
        created_at: new Date().toISOString(),
        email: 'ops.sale.audit@example.com',
        financial_status: 'paid',
        fulfillment_status: 'unfulfilled',
        line_items: [
          {
            title: 'Classic Phone',
            sku: 'PP-CLASSIC-PHONE',
            quantity: 1,
            properties: {
              Phone: 'Classic Phone - $100',
              'Service plan': 'Annual service - $200/yr (saves $13.12/yr)',
              'Patriot Package': 'Patriot Package - $250; Classic Phone, 1 year phone service, and all 4 add-ons (saves $303.12)',
              'Add-on Bundle': 'Add-on Bundle - $10/mo; includes Call Recording, Quiet Hours, Voicemail to Email, and Auto Attendant (saves $10/mo)',
              'Policy agreement': 'Agreed to Privacy Policy and Terms and Conditions',
            },
          },
        ],
      },
    ],
  };
}

function buildShopifyWebhookOrder(label) {
  return {
    id: `ops-webhook-${Date.now()}`,
    name: label,
    created_at: new Date().toISOString(),
    email: 'ops.webhook.sale.audit@example.com',
    financial_status: 'paid',
    fulfillment_status: 'unfulfilled',
    line_items: [
      {
        title: 'Classic Phone',
        sku: 'PP-CLASSIC-PHONE',
        quantity: 1,
        properties: {
          Phone: 'Classic Phone - $100',
          'Service plan': 'Monthly service - $17.76/mo',
          'Call Recording': 'Call Recording - $5/mo',
          'Quiet Hours': 'Quiet Hours - $5/mo',
          'Voicemail to Email': 'Voicemail to Email - $5/mo',
          'Policy agreement': 'Agreed to Privacy Policy and Terms and Conditions',
        },
      },
    ],
  };
}

function shopifyWebhookHmac(body, secret) {
  return crypto.createHmac('sha256', secret).update(body).digest('base64');
}

function checkLlms(route, result) {
  const failures = [];
  if (!result.ok) failures.push(`HTTP ${result.status}`);
  if (!/text\/plain/i.test(result.contentType)) failures.push('content type is not text/plain');
  if (!/^#\s+/m.test(result.body)) failures.push('body does not start with a Markdown heading');
  if (/<html\b|<!doctype html/i.test(result.body)) failures.push('HTML shell returned instead of raw Markdown');
  for (const expected of route.expected) {
    if (!result.body.includes(expected)) failures.push(`missing expected text: ${expected}`);
  }
  return failures;
}

async function runAudit(options = {}) {
  const opsBaseUrl = normalizeBaseUrl(options.opsBaseUrl || process.env.OPS_BASE_URL);
  const shopifyStoreUrl = normalizeBaseUrl(
    options.shopifyStoreUrl || process.env.SHOPIFY_STORE_URL || 'https://jordan-mark-premier.myshopify.com'
  );
  const viewerToken = options.crmViewerToken || process.env.CRM_VIEWER_TOKEN || '';
  const orderIngestToken = options.crmOrderIngestToken || process.env.CRM_ORDER_INGEST_TOKEN || '';
  const shopifyOrderWebhookSecret = options.shopifyOrderWebhookSecret || process.env.SHOPIFY_ORDER_WEBHOOK_SECRET || '';
  const outputPath = options.outputPath || process.env.OPS_AUDIT_OUTPUT || defaultOutputPath;

  if (!opsBaseUrl) {
    throw new Error('OPS_BASE_URL is required');
  }

  const report = {
    generatedAt: new Date().toISOString(),
    opsBaseUrl: opsBaseUrl.origin,
    shopifyStoreUrl: shopifyStoreUrl.origin,
    crmViewerTokenProvided: Boolean(viewerToken),
    crmViewerTokenLength: viewerToken.length,
    crmOrderIngestTokenProvided: Boolean(orderIngestToken),
    crmOrderIngestTokenLength: orderIngestToken.length,
    shopifyOrderWebhookSecretProvided: Boolean(shopifyOrderWebhookSecret),
    shopifyOrderWebhookSecretLength: shopifyOrderWebhookSecret.length,
    crmViewerTokenStoredInProof: false,
    crmOrderIngestTokenStoredInProof: false,
    shopifyOrderWebhookSecretStoredInProof: false,
    health: null,
    llms: [],
    crm: null,
    failures: [],
  };

  const health = await fetchText(urlFor(opsBaseUrl, '/healthz'));
  report.health = {
    status: health.status,
    contentType: health.contentType,
    serviceNamed: health.body.includes('patriot-phone-storefront-ops'),
    failures: [],
  };
  if (!health.ok) report.health.failures.push(`HTTP ${health.status}`);
  if (!report.health.serviceNamed) report.health.failures.push('health response missing service name');
  report.failures.push(...report.health.failures.map((failure) => `/healthz: ${failure}`));

  for (const route of requiredLlmsRoutes) {
    const result = await fetchText(urlFor(opsBaseUrl, route.path));
    const failures = checkLlms(route, result);
    report.llms.push({
      path: route.path,
      status: result.status,
      contentType: result.contentType,
      failures,
    });
    report.failures.push(...failures.map((failure) => `${route.path}: ${failure}`));
  }

  const leadLabel = `Ops Deployment Audit ${new Date().toISOString()}`;
  const capture = await fetchText(urlFor(opsBaseUrl, '/crm/capture'), {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      origin: shopifyStoreUrl.origin,
    },
    body: buildLead(shopifyStoreUrl, leadLabel).toString(),
  });

  const expectedRedirect = urlFor(shopifyStoreUrl, '/pages/contact?crm=received');
  report.crm = {
    leadLabel,
    capture: {
      status: capture.status,
      location: capture.location,
      expectedRedirect,
      failures: [],
    },
    viewer: null,
    csv: null,
    orderImport: null,
    orderWebhook: null,
  };

  if (capture.status !== 303) report.crm.capture.failures.push(`expected 303, got ${capture.status}`);
  if (capture.location !== expectedRedirect) {
    report.crm.capture.failures.push('capture did not redirect back to the Shopify contact page');
  }
  report.failures.push(...report.crm.capture.failures.map((failure) => `/crm/capture: ${failure}`));

  if (!viewerToken) {
    report.failures.push('/crm/leads: CRM_VIEWER_TOKEN is required for deployment audit');
  } else {
    if (!orderIngestToken) {
      report.failures.push('/crm/orders/import: CRM_ORDER_INGEST_TOKEN is required for sale CRM deployment audit');
    } else {
      const saleLabel = `Ops Deployment Sale ${new Date().toISOString()}`;
      const orderImport = await fetchText(urlFor(opsBaseUrl, `/crm/orders/import?token=${encodeURIComponent(orderIngestToken)}`), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(buildOrderPayload(saleLabel)),
      });
      let parsedOrderImport = {};
      try {
        parsedOrderImport = JSON.parse(orderImport.body);
      } catch {
        parsedOrderImport = {};
      }
      report.crm.orderImport = {
        path: '/crm/orders/import?token=<redacted>',
        saleLabel,
        status: orderImport.status,
        imported: parsedOrderImport.imported ?? null,
        skipped: parsedOrderImport.skipped ?? null,
        failures: [],
      };
      if (!orderImport.ok) report.crm.orderImport.failures.push(`HTTP ${orderImport.status}`);
      if ((parsedOrderImport.imported || 0) < 1 && (parsedOrderImport.skipped || 0) < 1) {
        report.crm.orderImport.failures.push('order import did not import or dedupe a sale record');
      }
      report.failures.push(...report.crm.orderImport.failures.map((failure) => `/crm/orders/import: ${failure}`));
    }

    if (!shopifyOrderWebhookSecret) {
      report.failures.push('/crm/shopify/orders/create: SHOPIFY_ORDER_WEBHOOK_SECRET is required for automatic sale CRM deployment audit');
    } else {
      const saleLabel = `Ops Deployment Webhook Sale ${new Date().toISOString()}`;
      const webhookBody = JSON.stringify(buildShopifyWebhookOrder(saleLabel));
      const orderWebhook = await fetchText(urlFor(opsBaseUrl, '/crm/shopify/orders/create'), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-shopify-hmac-sha256': shopifyWebhookHmac(webhookBody, shopifyOrderWebhookSecret),
          'x-shopify-topic': 'orders/create',
          'x-shopify-shop-domain': shopifyStoreUrl.hostname,
        },
        body: webhookBody,
      });
      let parsedOrderWebhook = {};
      try {
        parsedOrderWebhook = JSON.parse(orderWebhook.body);
      } catch {
        parsedOrderWebhook = {};
      }
      report.crm.orderWebhook = {
        path: '/crm/shopify/orders/create',
        saleLabel,
        status: orderWebhook.status,
        imported: parsedOrderWebhook.imported ?? null,
        skipped: parsedOrderWebhook.skipped ?? null,
        failures: [],
      };
      if (!orderWebhook.ok) report.crm.orderWebhook.failures.push(`HTTP ${orderWebhook.status}`);
      if ((parsedOrderWebhook.imported || 0) < 1 && (parsedOrderWebhook.skipped || 0) < 1) {
        report.crm.orderWebhook.failures.push('signed Shopify order webhook did not import or dedupe a sale record');
      }
      report.failures.push(...report.crm.orderWebhook.failures.map((failure) => `/crm/shopify/orders/create: ${failure}`));
    }

    const viewer = await fetchText(urlFor(opsBaseUrl, `/crm/leads?token=${encodeURIComponent(viewerToken)}`));
    report.crm.viewer = {
      path: '/crm/leads?token=<redacted>',
      status: viewer.status,
      contentType: viewer.contentType,
      containsLead: viewer.body.includes(leadLabel),
      containsImportedSale: report.crm.orderImport ? viewer.body.includes('classic_patriot_package_sale') : false,
      containsWebhookSale: report.crm.orderWebhook ? viewer.body.includes('classic_monthly_addon_sale') : false,
      exportLinkKeepsToken: viewer.body.includes('/crm/leads.csv?token='),
      failures: [],
    };
    if (!viewer.ok) report.crm.viewer.failures.push(`HTTP ${viewer.status}`);
    if (!report.crm.viewer.containsLead) report.crm.viewer.failures.push('viewer does not contain audit lead');
    if (report.crm.orderImport && !report.crm.viewer.containsImportedSale) {
      report.crm.viewer.failures.push('viewer does not contain imported sale type');
    }
    if (report.crm.orderWebhook && !report.crm.viewer.containsWebhookSale) {
      report.crm.viewer.failures.push('viewer does not contain webhook sale type');
    }
    if (!report.crm.viewer.exportLinkKeepsToken) report.crm.viewer.failures.push('viewer CSV link does not include token query');
    report.failures.push(...report.crm.viewer.failures.map((failure) => `/crm/leads: ${failure}`));

    const csv = await fetchText(urlFor(opsBaseUrl, `/crm/leads.csv?token=${encodeURIComponent(viewerToken)}`));
    report.crm.csv = {
      path: '/crm/leads.csv?token=<redacted>',
      status: csv.status,
      contentType: csv.contentType,
      containsLead: csv.body.includes(leadLabel),
      containsImportedSale: report.crm.orderImport ? csv.body.includes('classic_patriot_package_sale') : false,
      containsWebhookSale: report.crm.orderWebhook ? csv.body.includes('classic_monthly_addon_sale') : false,
      containsUtm: csv.body.includes('ops-deployment-audit'),
      failures: [],
    };
    if (!csv.ok) report.crm.csv.failures.push(`HTTP ${csv.status}`);
    if (!/text\/csv/i.test(csv.contentType)) report.crm.csv.failures.push('content type is not text/csv');
    if (!report.crm.csv.containsLead) report.crm.csv.failures.push('CSV does not contain audit lead');
    if (report.crm.orderImport && !report.crm.csv.containsImportedSale) {
      report.crm.csv.failures.push('CSV does not contain imported sale type');
    }
    if (report.crm.orderWebhook && !report.crm.csv.containsWebhookSale) {
      report.crm.csv.failures.push('CSV does not contain webhook sale type');
    }
    if (!report.crm.csv.containsUtm) report.crm.csv.failures.push('CSV does not contain UTM source');
    report.failures.push(...report.crm.csv.failures.map((failure) => `/crm/leads.csv: ${failure}`));
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  return report;
}

async function main() {
  try {
    const report = await runAudit();
    console.log(`Ops deployment audit wrote ${path.relative(root, process.env.OPS_AUDIT_OUTPUT || defaultOutputPath)}`);
    console.log(`OPS base: ${report.opsBaseUrl}`);
    console.log(`LLMS routes checked: ${report.llms.length}`);
    console.log(`CRM viewer token stored in proof: ${report.crmViewerTokenStoredInProof ? 'yes' : 'no'}`);
    console.log(`CRM order ingest token stored in proof: ${report.crmOrderIngestTokenStoredInProof ? 'yes' : 'no'}`);
    console.log(`Shopify order webhook secret stored in proof: ${report.shopifyOrderWebhookSecretStoredInProof ? 'yes' : 'no'}`);
    console.log(`Failures: ${report.failures.length}`);
    if (report.failures.length > 0) {
      for (const failure of report.failures) console.error(`FAIL ${failure}`);
      process.exit(1);
    }
  } catch (error) {
    usage();
    console.error(error.message);
    process.exit(2);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  buildLead,
  buildShopifyWebhookOrder,
  checkLlms,
  runAudit,
  shopifyWebhookHmac,
};
