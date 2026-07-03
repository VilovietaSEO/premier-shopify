#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const defaultOutputDir = path.join(root, 'tmp', 'patriot-phone-ops-deployment');

const requiredFiles = [
  'package.json',
  'package-lock.json',
  'crm/README.md',
  'crm/simple-crm.js',
  'llms/automatic-llms.js',
  'ops/README.md',
  'ops/cloudflare-worker.example.js',
  'ops/patriot-phone-ops.env.example',
  'ops/patriot-phone-ops.service.example',
  'ops/storefront-ops-server.js',
  'ops/wrangler.toml.example',
  'orders/setup-export.js',
];

const requiredEnv = [
  'NODE_ENV=production',
  'PORT=8786',
  'CRM_SUBMISSIONS_PATH=/opt/patriot-phone/data/crm-submissions.jsonl',
  'CRM_VIEWER_TOKEN=<long random staff token>',
  'CRM_ORDER_INGEST_TOKEN=<different long random order-ingest token>',
  'SHOPIFY_ORDER_WEBHOOK_SECRET=<Shopify order webhook signing secret>',
  'CRM_STORE_TIMEZONE=America/Denver',
  'LLMS_SITE_URL=https://jordan-mark-premier.myshopify.com',
  'LLMS_TIME_ZONE=America/Denver',
];

const optionalEnv = [
  'CRM_LEAD_WEBHOOK_URLS=https://hooks.example.com/leads',
  'CRM_SALE_WEBHOOK_URLS=https://hooks.example.com/sales',
  'CRM_WEBHOOK_SECRET=<long random outbound signing secret>',
  'REVIO_CHECKOUT_WEBHOOK_URLS=https://hooks.example.com/revio-checkout',
  'REVIO_WEBHOOK_SECRET=<long random Rev.io handoff signing secret>',
  'REVIO_CHECKOUT_SUCCESS_URL=https://jordan-mark-premier.myshopify.com/cart?revio_checkout=received',
  'REVIO_CHECKOUT_ALLOWED_ORIGINS=https://jordan-mark-premier.myshopify.com',
];

function copyFile(relativePath, outputDir) {
  const source = path.join(root, relativePath);
  const destination = path.join(outputDir, relativePath);
  if (!fs.existsSync(source)) {
    throw new Error(`Required deployment file is missing: ${relativePath}`);
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  return {
    path: relativePath,
    bytes: fs.statSync(destination).size,
  };
}

function writeDeploymentReadme(outputDir) {
  const body = `# Patriot Phone Ops Deployment Bundle

This bundle contains only the server-side files needed to run the storefront ops service on a persistent host.

## Required Production Environment

\`\`\`text
${requiredEnv.join('\n')}
\`\`\`

## Optional Outbound Webhooks

\`\`\`text
${optionalEnv.join('\n')}
\`\`\`

Use these when leads, sales, or Rev.io checkout handoffs should also be sent to Zapier, Make, Rev.io middleware, a custom CRM, or another owner-controlled endpoint. Lead destinations receive \`crm.lead.created\`; sale destinations receive \`crm.sale.created\`; Rev.io checkout destinations receive \`revio.checkout.requested\`. If either CRM outbound URL variable is configured in production, \`CRM_WEBHOOK_SECRET\` must be a long random signing secret. If \`REVIO_CHECKOUT_WEBHOOK_URLS\` is configured, set \`REVIO_WEBHOOK_SECRET\` or reuse \`CRM_WEBHOOK_SECRET\`.

## Persistent Host Install Sketch

\`\`\`bash
sudo mkdir -p /opt/patriot-phone/shopify /opt/patriot-phone/data
sudo chown -R patriot-phone:patriot-phone /opt/patriot-phone
rsync -a ./ /opt/patriot-phone/shopify/
cd /opt/patriot-phone/shopify
npm ci --omit=dev
sudo cp ops/patriot-phone-ops.service.example /etc/systemd/system/patriot-phone-ops.service
sudo cp ops/patriot-phone-ops.env.example /etc/patriot-phone-ops.env
sudo editor /etc/patriot-phone-ops.env
sudo systemctl daemon-reload
sudo systemctl enable --now patriot-phone-ops
sudo systemctl status patriot-phone-ops
\`\`\`

## Proof Commands

\`\`\`bash
curl -i https://OPS_HOST/healthz
curl -i https://OPS_HOST/llms.txt
curl -i 'https://OPS_HOST/crm/leads?token=<staff-token>'
curl -i -X POST https://OPS_HOST/revio/checkout

OPS_BASE_URL=https://OPS_HOST \\
CRM_VIEWER_TOKEN=<staff-token> \\
CRM_ORDER_INGEST_TOKEN=<order-ingest-token> \\
SHOPIFY_ORDER_WEBHOOK_SECRET=<Shopify order webhook signing secret> \\
SHOPIFY_STORE_URL=https://jordan-mark-premier.myshopify.com \\
npm run ops:deployment:audit
\`\`\`

Shopify still needs the live contact form setting pointed to \`https://OPS_HOST/crm/capture\`, an \`orders/create\` webhook pointed to \`https://OPS_HOST/crm/shopify/orders/create\`, and the cart section \`Rev.io checkout handoff URL\` pointed to \`https://OPS_HOST/revio/checkout\` when Rev.io is the payment handoff path.
`;
  fs.writeFileSync(path.join(outputDir, 'DEPLOYMENT.md'), body);
  return 'DEPLOYMENT.md';
}

function buildBundle(options = {}) {
  const outputDir = path.resolve(options.outputDir || process.env.OPS_BUNDLE_OUTPUT || defaultOutputDir);
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });

  const files = requiredFiles.map((relativePath) => copyFile(relativePath, outputDir));
  files.push({
    path: writeDeploymentReadme(outputDir),
    bytes: fs.statSync(path.join(outputDir, 'DEPLOYMENT.md')).size,
  });

  const manifest = {
    generatedAt: new Date().toISOString(),
    outputDir,
    service: 'patriot-phone-storefront-ops',
    entrypoint: 'ops/storefront-ops-server.js',
    healthPath: '/healthz',
    crmCapturePath: '/crm/capture',
    crmViewerPath: '/crm/leads',
    crmCsvPath: '/crm/leads.csv',
    shopifyOrderWebhookPath: '/crm/shopify/orders/create',
    orderBackfillPath: '/crm/orders/import',
    revioCheckoutPath: '/revio/checkout',
    llmsRootPath: '/llms.txt',
    requiredEnv,
    optionalEnv,
    files,
  };

  fs.writeFileSync(path.join(outputDir, 'deployment-manifest.json'), JSON.stringify(manifest, null, 2));
  return manifest;
}

function main() {
  const outputArg = process.argv.find((arg) => arg.startsWith('--output='));
  const outputDir = outputArg ? outputArg.slice('--output='.length) : undefined;
  const manifest = buildBundle({ outputDir });
  console.log(`Ops deployment bundle wrote ${path.relative(root, manifest.outputDir)}`);
  console.log(`Files: ${manifest.files.length}`);
  console.log(`Entrypoint: ${manifest.entrypoint}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.stack || error.message);
    process.exit(1);
  }
}

module.exports = {
  buildBundle,
  optionalEnv,
  requiredEnv,
  requiredFiles,
};
