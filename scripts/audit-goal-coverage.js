#!/usr/bin/env node

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const failures = [];
const passes = [];
const verbose = process.argv.includes('--verbose') || process.env.AUDIT_VERBOSE === '1';

function rel(filePath) {
  return path.relative(root, filePath);
}

function pass(message) {
  passes.push(message);
}

function fail(message) {
  failures.push(message);
}

function assertFile(filePath, label = filePath) {
  const absolute = path.join(root, filePath);
  if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) {
    pass(`${label}: present`);
    return absolute;
  }
  fail(`${label}: missing file ${filePath}`);
  return null;
}

function assertExecutable(filePath, label = filePath) {
  const absolute = assertFile(filePath, label);
  if (!absolute) return;
  const mode = fs.statSync(absolute).mode;
  if ((mode & 0o111) !== 0) {
    pass(`${label}: executable`);
  } else {
    fail(`${label}: not executable`);
  }
}

function readJson(filePath) {
  const absolute = assertFile(filePath);
  if (!absolute) return null;
  try {
    return JSON.parse(fs.readFileSync(absolute, 'utf8'));
  } catch (error) {
    fail(`${filePath}: invalid JSON (${error.message})`);
    return null;
  }
}

function assertFileIncludes(filePath, phrases, label = filePath) {
  const absolute = assertFile(filePath, label);
  if (!absolute) return;
  const source = fs.readFileSync(absolute, 'utf8');

  for (const phrase of phrases) {
    if (source.includes(phrase)) {
      pass(`${label}: includes ${phrase}`);
    } else {
      fail(`${label}: missing ${phrase}`);
    }
  }
}

function extractSectionSchema(section) {
  const filePath = `independence-phone-theme/sections/${section}.liquid`;
  const absolute = path.join(root, filePath);
  if (!fs.existsSync(absolute)) {
    fail(`${section}: cannot inspect missing section schema`);
    return null;
  }

  const source = fs.readFileSync(absolute, 'utf8');
  const match = source.match(/{% schema %}([\s\S]*?){% endschema %}/);
  if (!match) {
    fail(`${section}: missing Theme Editor schema`);
    return null;
  }

  try {
    const schema = JSON.parse(match[1]);
    pass(`${section}: Theme Editor schema parses`);
    return schema;
  } catch (error) {
    fail(`${section}: invalid Theme Editor schema JSON (${error.message})`);
    return null;
  }
}

function schemaSettingIds(schema) {
  return new Set((schema.settings || []).map((setting) => setting.id).filter(Boolean));
}

function schemaBlockByType(schema, type) {
  return (schema.blocks || []).find((block) => block.type === type);
}

function assertSectionSchema(section, requirement) {
  requirement = requirement || {};
  const schema = extractSectionSchema(section);
  if (!schema) return;

  const hasSettings = Array.isArray(schema.settings) && schema.settings.length > 0;
  const hasBlocks = Array.isArray(schema.blocks) && schema.blocks.length > 0;
  if (hasSettings || hasBlocks) {
    pass(`${section}: exposes editable schema surface`);
  } else {
    fail(`${section}: has no editable settings or blocks`);
  }

  const settingIds = schemaSettingIds(schema);
  for (const setting of requirement.settings || []) {
    if (settingIds.has(setting)) {
      pass(`${section}: editable setting ${setting}`);
    } else {
      fail(`${section}: missing editable setting ${setting}`);
    }
  }

  for (const [blockType, requiredSettings] of Object.entries(requirement.blocks || {})) {
    const block = schemaBlockByType(schema, blockType);
    if (!block) {
      fail(`${section}: missing editable block type ${blockType}`);
      continue;
    }

    pass(`${section}: editable block type ${blockType}`);
    const blockSettingIds = new Set((block.settings || []).map((setting) => setting.id).filter(Boolean));
    for (const setting of requiredSettings) {
      if (blockSettingIds.has(setting)) {
        pass(`${section}: block ${blockType} setting ${setting}`);
      } else {
        fail(`${section}: block ${blockType} missing setting ${setting}`);
      }
    }
  }

  if (requirement.requiresPreset) {
    if (Array.isArray(schema.presets) && schema.presets.length > 0) {
      pass(`${section}: can be added from Theme Editor section picker`);
    } else {
      fail(`${section}: missing Theme Editor preset`);
    }
  }

  if (requirement.templateBound) {
    if (!schema.presets) {
      pass(`${section}: template-bound section is not exposed as a general preset`);
    } else {
      fail(`${section}: template-bound section should not be exposed as a general preset`);
    }
  }
}

function hashFile(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function assertFilesMatch(source, target) {
  const sourceAbsolute = assertFile(source, `source ${source}`);
  const targetAbsolute = assertFile(target, `overlay ${target}`);
  if (!sourceAbsolute || !targetAbsolute) return;

  const sourceHash = hashFile(sourceAbsolute);
  const targetHash = hashFile(targetAbsolute);
  if (sourceHash === targetHash) {
    pass(`${source} matches ${target}`);
  } else {
    fail(`${source} does not match ${target}`);
  }
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

function assertTemplateTypes(templatePath, expectedTypes) {
  const template = readJson(templatePath);
  if (!template) return;
  const actualTypes = new Set(Object.values(template.sections || {}).map((section) => section.type));

  for (const type of expectedTypes) {
    if (actualTypes.has(type)) {
      pass(`${templatePath}: includes ${type}`);
    } else {
      fail(`${templatePath}: missing section type ${type}`);
    }
  }
}

const sourceFiles = [
  'brief-materials/source-manifest.md',
  'brief-materials/README.md',
  'brief-materials/strategy/design-brief.md',
  'brief-materials/strategy/copy-brief.md',
  'brief-materials/strategy/limited-sitemap.md',
  'brief-materials/strategy/jtbd-project-approach.md',
  'brief-materials/strategy/product-model-and-theme-direction.md',
  'brief-materials/template-research/theme-decision.md',
  'brief-materials/research/reddit-voc/buyer-research-report.md',
  'brief-materials/research/reddit-voc/voc-snippets.yaml',
  'brief-materials/documents/sow-summary.md',
  'brief-materials/notes/project-brief.md',
  'brief-materials/notes/raw-client-notes.txt',
];

const sourceAssets = [
  'brief-materials/assets/video/indy-phone-reel-1.mov',
  'brief-materials/assets/logo/independence-phone-logo.ai',
  'brief-materials/assets/product-images/independence-phone-product-crunchy.png',
  'brief-materials/assets/site-images/current-site-logo.png',
  'brief-materials/assets/site-images/current-site-product-1.png',
  'brief-materials/assets/site-images/current-site-product-2.png',
  'brief-materials/assets/site-images/current-site-product-3.png',
  'brief-materials/assets/site-images/current-site-product-4.png',
  'brief-materials/assets/site-images/current-site-product-collage.png',
  'brief-materials/assets/reference-images/kid-phone-ui-reference.png',
  'brief-materials/assets/logo/independence-phone-logo-export.png',
];

const customSections = [
  'ip-announcement-banner',
  'ip-video-hero',
  'ip-jtbd-story',
  'ip-feature-strip',
  'ip-product-comparison',
  'ip-product-main',
  'ip-order-builder',
  'ip-service-plans',
  'ip-add-ons',
  'ip-capability-table',
  'ip-package-band',
  'ip-comparison-matrix',
  'ip-faq',
  'ip-trust-band',
  'ip-contact-form',
];

const sectionSchemaRequirements = {
  'ip-announcement-banner': {
    settings: ['enabled', 'text', 'link'],
    requiresPreset: true,
  },
	  'ip-video-hero': {
	    settings: [
	      'hero_video',
	      'poster_image',
	      'heading',
	      'subheading',
	      'primary_label',
	      'price_callout',
	      'sound_label',
      'primary_link',
    ],
    requiresPreset: true,
  },
  'ip-jtbd-story': {
    settings: ['anchor_id', 'eyebrow', 'heading', 'body', 'note'],
    blocks: { moment: ['title', 'body'] },
    requiresPreset: true,
  },
  'ip-feature-strip': {
    settings: ['eyebrow', 'heading'],
    blocks: { feature: ['title', 'body', 'included_label', 'icon'] },
    requiresPreset: true,
  },
  'ip-product-comparison': {
    settings: [
      'eyebrow',
      'heading',
      'body',
      'freedom_product',
      'freedom_image',
      'freedom_summary',
      'patriot_product',
      'patriot_image',
      'patriot_summary',
    ],
    requiresPreset: true,
  },
  'ip-product-main': {
    settings: [
      'eyebrow',
      'purchase_options_heading',
      'service_options_heading',
      'addon_options_heading',
      'product_info_heading',
      'purchase_options_note',
      'show_dynamic_checkout',
    ],
    blocks: {
      service_plan: ['title', 'price', 'billing_product', 'default_selected'],
      addon_option: ['title', 'price', 'billing_product'],
      info_accordion: ['title', 'source', 'body', 'open_by_default'],
    },
    templateBound: true,
  },
  'ip-order-builder': {
    settings: [
      'eyebrow',
      'heading',
      'body',
      'standard_product',
      'rugged_product',
      'monthly_service_product',
      'annual_service_product',
      'call_recording_product',
      'family_quiet_hours_product',
      'voicemail_to_email_product',
      'auto_attendant_product',
      'addon_bundle_product',
      'package_heading',
      'package_title',
      'package_price',
      'package_value',
      'package_descriptor',
      'checkout_note',
      'button_label',
    ],
    requiresPreset: true,
  },
  'ip-service-plans': {
    settings: ['eyebrow', 'heading', 'body', 'disclosure'],
    blocks: { plan: ['label', 'title', 'price', 'body'] },
    requiresPreset: true,
  },
  'ip-add-ons': {
    settings: ['eyebrow', 'heading', 'body'],
    blocks: { addon: ['title', 'price', 'body', 'included_label'] },
    requiresPreset: true,
  },
  'ip-capability-table': {
    settings: ['eyebrow', 'heading', 'body'],
    blocks: { capability: ['capability', 'status', 'status_style', 'explanation'] },
    requiresPreset: true,
  },
  'ip-package-band': {
    settings: [
      'eyebrow',
      'heading',
      'body',
      'price_label',
      'price',
      'includes',
      'disclosure',
      'cta_label',
      'cta_link',
    ],
    requiresPreset: true,
  },
  'ip-comparison-matrix': {
    settings: ['eyebrow', 'heading', 'body'],
    blocks: { row: ['feature', 'independence', 'smartphone', 'flip', 'landline'] },
    requiresPreset: true,
  },
  'ip-faq': {
    settings: ['eyebrow', 'heading', 'body', 'open_first'],
    blocks: { faq: ['question', 'answer'] },
    requiresPreset: true,
  },
  'ip-trust-band': {
    settings: ['eyebrow', 'heading', 'body'],
    blocks: { trust_item: ['title', 'body'] },
    requiresPreset: true,
  },
  'ip-contact-form': {
    settings: [
      'eyebrow',
      'heading',
      'body',
      'helper',
      'button_label',
      'crm_endpoint_url',
      'opt_in_text',
      'payment_note',
    ],
    requiresPreset: true,
  },
};

const customTemplates = [
  'index.json',
  'collection.phones.json',
  'product.independence-phone.json',
  'page.contact.json',
];

const customSnippets = [
  'ip-structured-data.liquid',
  'ip-product-card-gallery.liquid',
];

const themeAssets = [
  'ip-theme.css',
  'ip-independence-phone-logo.png',
  'ip-current-site-logo.png',
  'ip-current-site-product-1.png',
  'ip-current-site-product-2.png',
  'ip-current-site-product-3.png',
  'ip-current-site-product-4.png',
  'ip-current-site-product-collage.png',
  'ip-independence-phone-product-crunchy.png',
  'ip-hero-video.mp4',
  'ip-hero-video-poster.jpg',
  'ip-phone-cutout-freedom.png',
  'ip-bg-flag-subtle.png',
  'ip-story-bus-days.png',
  'ip-story-home-alone.png',
  'ip-story-grandparents.png',
  'ip-story-before-smartphone.png',
  'ip-product-gallery.js',
  'icon-account.svg',
  'icon-contact.svg',
  'icon-cart.svg',
  'ip-tool-icon-auto-attendant.svg',
  'ip-tool-icon-call-recording.svg',
  'ip-tool-icon-phone-times.svg',
  'heroicons-license.txt',
];

for (const file of sourceFiles) assertFile(file, `brief source ${file}`);
for (const file of sourceAssets) assertFile(file, `brief asset ${file}`);

for (const section of customSections) {
  assertFile(`independence-phone-theme/sections/${section}.liquid`, `theme section ${section}`);
  assertFilesMatch(
    `independence-phone-theme/sections/${section}.liquid`,
    `refresh-overlay/sections/${section}.liquid`
  );
  assertSectionSchema(section, sectionSchemaRequirements[section]);
}

for (const template of customTemplates) {
  assertFile(`independence-phone-theme/templates/${template}`, `theme template ${template}`);
  assertFilesMatch(
    `independence-phone-theme/templates/${template}`,
    `refresh-overlay/templates/${template}`
  );
}

assertFilesMatch(
  'independence-phone-theme/templates/robots.txt.liquid',
  'refresh-overlay/templates/robots.txt.liquid'
);

for (const snippet of customSnippets) {
  assertFile(`independence-phone-theme/snippets/${snippet}`, `theme snippet ${snippet}`);
  assertFilesMatch(
    `independence-phone-theme/snippets/${snippet}`,
    `refresh-overlay/snippets/${snippet}`
  );
}

for (const asset of themeAssets) {
  assertFile(`independence-phone-theme/assets/${asset}`, `theme asset ${asset}`);
  assertFilesMatch(`independence-phone-theme/assets/${asset}`, `refresh-overlay/assets/${asset}`);
}

assertExecutable('scripts/apply-refresh-overlay.sh', 'Refresh overlay script');
assertExecutable('scripts/bootstrap-refresh-store.sh', 'Refresh store bootstrap script');
assertExecutable('scripts/test-refresh-overlay.sh', 'Refresh overlay smoke test');
assertExecutable('scripts/create-product-metafields.js', 'Product metafield creation script');
assertExecutable('scripts/create-storefront-objects.js', 'Storefront object creation script');
assertExecutable('scripts/audit-live-seo.js', 'Live SEO audit script');
assertFile('scripts/audit-storefront-objects.js', 'Read-only storefront object audit script');
assertFile('scripts/test-storefront-object-audit.js', 'Read-only storefront object audit proof script');
assertFile('scripts/assign-product-media.js', 'Product media assignment script');
assertFile('crm/simple-crm.js', 'Simple CRM module');
assertFile('crm/README.md', 'Simple CRM README');
assertFile('scripts/test-simple-crm.js', 'Simple CRM proof script');
assertFile('llms/automatic-llms.js', 'Automatic llms.txt module');
assertFile('scripts/test-automatic-llms.js', 'Automatic llms.txt proof script');
assertFile('ops/storefront-ops-server.js', 'Storefront ops service');
assertFile('ops/README.md', 'Storefront ops service README');
assertFile('ops/patriot-phone-ops.service.example', 'Storefront ops systemd example');
assertFile('ops/cloudflare-worker.example.js', 'Storefront ops edge proxy example');
assertFile('scripts/test-storefront-ops-server.js', 'Storefront ops proof script');
assertFile('scripts/build-ops-deployment-bundle.js', 'Ops deployment bundle builder');
assertFile('scripts/test-ops-deployment-bundle.js', 'Ops deployment bundle proof script');
assertFile('scripts/test-launch-readiness-audit.js', 'Launch readiness audit proof script');
assertFile('orders/setup-export.js', 'Order setup export module');
assertFile('scripts/test-order-setup-export.js', 'Order setup export proof script');
assertFileIncludes('scripts/create-storefront-objects.js', [
  'productByIdentifier',
  'productCreate',
  'productUpdate',
  'productVariantsBulkUpdate',
  'collectionCreate',
  'collectionAddProducts',
  'publications',
  'publishablePublish',
  'read_publications',
  'write_publications',
  'pageCreate',
  'hidden billing products',
  'billing-item',
  'inventoryItemUpdate',
  'requiresShipping: false',
  'write_inventory',
  'monthly-service',
  'add-on-bundle',
  'patriot-package',
], 'Storefront object creation script');
assertFileIncludes('scripts/audit-storefront-objects.js', [
  'auditSnapshot',
  'productByIdentifier',
  'requiredBillingProducts',
  'billingProductAudit',
  'requiresShipping',
  'templateSuffix',
  'onlineStoreUrl',
  'mediaWithAltCount',
  'page is not published',
  'STOREFRONT_OBJECT_AUDIT_OUTPUT',
  'storefront-objects-audit.json',
], 'Read-only storefront object audit script');
assertFileIncludes('scripts/test-storefront-object-audit.js', [
  'Storefront object audit proof passed',
  'Classic Phone',
  'Rugged Phone',
  'hidden billing products',
  'monthly-service',
  'billing product requires shipping',
  'price is 99.00',
  'missing product rugged-phone',
  'page faq: page is not published',
], 'Read-only storefront object audit proof script');
assertFileIncludes('scripts/assign-product-media.js', [
  'productSet',
  'SHOPIFY_THEME_ASSET_BASE',
  '/cdn/shop/t/2/assets',
  'ip-current-site-product-1.png',
  'ip-current-site-product-2.png',
  'ip-current-site-product-3.png',
  'ip-current-site-product-4.png',
  'Classic Phone cordless Wi-Fi handset with charging base',
  'Rugged Phone cordless Wi-Fi handset with charging base',
  'duplicateResolutionMode',
  'Product media assignment ready',
], 'Product media assignment script');
assertFileIncludes('scripts/audit-live-seo.js', [
  'SHOPIFY_STORE_URL',
  'SHOPIFY_PREVIEW_THEME_ID',
  'SHOPIFY_STOREFRONT_PASSWORD',
  'LLMS_BASE_URL',
  'passwordStoredInProof',
  'createCookieJar',
  'unlockStorefront',
  '/sitemap.xml',
  '/robots.txt',
  'requiredLlmsRoutes',
  '/llms.txt',
  '/products/standard-phone/llms.txt',
  '/collections/all/llms.txt',
  'auditLlmsRoute',
  'text/plain',
  'HTML storefront shell returned instead of raw Markdown',
  'jsonLdTypes',
  'Product',
  'FAQPage',
  'seo-ops-audit.json',
], 'Live SEO audit script');
assertFileIncludes('llms/automatic-llms.js', [
  'renderRootLlmsTxt',
  'renderEntryLlmsTxt',
  'pathFromLlmsRequest',
  'readProducts',
  '/llms.txt',
  '/a/llms.txt',
  '/products/standard-phone',
  '/collections/all',
  'text/plain; charset=utf-8',
  'Claims Discipline',
], 'Automatic llms.txt module');
assertFileIncludes('scripts/test-automatic-llms.js', [
  'Automatic llms.txt proof passed',
  '/llms.txt',
  '/a/llms.txt',
  '/products/standard-phone/llms.txt',
  '/products/rugged-phone/llms.txt',
  'content-type',
  'Classic Phone',
  'Rugged Phone',
  'Order Now',
], 'Automatic llms.txt proof script');
assertFileIncludes('ops/storefront-ops-server.js', [
  'patriot-phone-storefront-ops',
  '/healthz',
  '/crm/capture',
  '/crm/shopify/orders/create',
  '/crm/leads',
  '/llms.txt',
  'endsWith',
  'CRM_SUBMISSIONS_PATH',
  'CRM_VIEWER_TOKEN',
  'CRM_LEAD_WEBHOOK_URLS',
  'CRM_WEBHOOK_SECRET',
  'REVIO_CHECKOUT_WEBHOOK_URLS',
  '/revio/checkout',
  'SHOPIFY_ORDER_WEBHOOK_SECRET',
  'LLMS_SITE_URL',
  'validateProductionConfig',
  'Production storefront ops config is incomplete',
], 'Storefront ops service');
assertFileIncludes('scripts/test-storefront-ops-server.js', [
  'Storefront ops proof passed',
  'validateProductionConfig',
  '/healthz',
  '/crm/capture',
  '/crm/leads',
  '/crm/leads.csv',
  '/revio/checkout',
  '/llms.txt',
  '/products/rugged-phone/llms.txt',
  '/a/llms.txt?path=/pages/faq',
  'crm.lead.created',
  'crm.sale.created',
  'revio.checkout.requested',
  'test-token',
], 'Storefront ops proof script');
assertFileIncludes('ops/README.md', [
  'persistent host',
  'CRM_SUBMISSIONS_PATH=/opt/patriot-phone/data/crm-submissions.jsonl',
  'CRM_VIEWER_TOKEN=<long random staff token>',
  'SHOPIFY_ORDER_WEBHOOK_SECRET',
  'CRM_LEAD_WEBHOOK_URLS',
  'CRM_SALE_WEBHOOK_URLS',
  'CRM_WEBHOOK_SECRET',
  'REVIO_CHECKOUT_WEBHOOK_URLS',
  'crm.lead.created',
  'crm.sale.created',
  'revio.checkout.requested',
  '/crm/shopify/orders/create',
  '/revio/checkout',
  'refuses to start unless',
  'Set `CRM endpoint URL` to the HTTPS capture URL',
  'Edge/Cloudflare Worker routes',
  'SHOPIFY_STORE_URL=https://jordan-mark-premier.myshopify.com LLMS_BASE_URL=https://www.example.com npm run seo:live',
], 'Storefront ops README');
assertFileIncludes('scripts/build-ops-deployment-bundle.js', [
  'buildBundle',
  'deployment-manifest.json',
  'DEPLOYMENT.md',
  'ops/storefront-ops-server.js',
  '/crm/shopify/orders/create',
  'SHOPIFY_ORDER_WEBHOOK_SECRET',
  'optionalEnv',
  'CRM_LEAD_WEBHOOK_URLS',
], 'Ops deployment bundle builder');
assertFileIncludes('scripts/test-ops-deployment-bundle.js', [
  'Ops deployment bundle proof passed',
  'requiredFiles',
  'SHOPIFY_ORDER_WEBHOOK_SECRET',
  'optional outbound webhook settings',
  'CRM_LEAD_WEBHOOK_URLS',
  '/crm/shopify/orders/create',
], 'Ops deployment bundle proof script');
assertFileIncludes('scripts/audit-launch-readiness.js', [
  'Ops deployment package',
  'opsBundleChecks',
  'tmp/patriot-phone-ops-deployment/deployment-manifest.json',
  'run npm run ops:bundle',
  '/crm/shopify/orders/create',
], 'Launch readiness audit script');
assertFileIncludes('scripts/test-launch-readiness-audit.js', [
  'Launch readiness audit proof passed',
  'Ops deployment package',
  'opsBundleChecks',
  'public deployment',
], 'Launch readiness audit proof script');
assertFileIncludes('package.json', [
  'ops:bundle',
  'ops:bundle:test',
  'launch:readiness:test',
], 'Package ops bundle scripts');
assertFileIncludes('ops/patriot-phone-ops.service.example', [
  'ExecStart=/usr/bin/npm run ops:server',
  'EnvironmentFile=-/etc/patriot-phone-ops.env',
  'ReadWritePaths=/opt/patriot-phone/data',
], 'Storefront ops systemd example');
assertFileIncludes('ops/cloudflare-worker.example.js', [
  'OPS_ORIGIN',
  "pathname === '/llms.txt'",
  "pathname.endsWith('/llms.txt')",
  "pathname.startsWith('/crm/')",
  "pathname.startsWith('/revio/')",
  'x-forwarded-host',
], 'Storefront ops edge proxy example');
assertFileIncludes('orders/setup-export.js', [
  'extractSetupRows',
  'setupRowsToCsv',
  'Service plan',
  'Patriot Package',
  'Add-on Bundle',
  'Policy agreement',
  'all_properties_json',
  'ORDER_SETUP_EXPORT_OUTPUT',
  '_setup_parent',
  'hasHiddenProperty',
], 'Order setup export module');
assertFileIncludes('scripts/test-order-setup-export.js', [
  'Order setup export proof passed',
  'Classic Phone - $100',
  'Patriot Package - $250',
  'Monthly service - $17.76/mo',
  'Annual service - $200/yr',
  'Call Recording',
  'Voicemail to Email',
  'Policy agreement',
  'PP-MONTHLY-SERVICE',
  '_setup_parent',
], 'Order setup export proof script');
assertFileIncludes('crm/simple-crm.js', [
  'submitted_at',
  'submitted_at_store_timezone',
  'contact[Selected add-ons]',
  'contact[Privacy and terms consent]',
  'MemoryRateLimiter',
  'honeypot field was completed',
  'submissionsToCsv',
  'renderViewer',
  'Raw submitted fields',
  'raw_form_fields_json',
  'Total records',
  '/crm/capture',
  '/crm/leads',
  '/crm/leads.csv',
  'CRM_VIEWER_TOKEN',
  'dispatchRecordWebhooks',
  'crm.lead.created',
  'crm.sale.created',
  'x-patriot-phone-signature',
], 'Simple CRM module');
assertFileIncludes('scripts/test-simple-crm.js', [
  'Simple CRM proof passed',
  'submitted_at_store_timezone',
  'QA Parent',
  'Call Recording',
  'Voicemail to Email',
  'Raw submitted fields',
  'raw_form_fields_json',
  'Total records',
  'honeypot field was completed',
  'MemoryRateLimiter',
  'signed outbound webhooks',
  'x-patriot-phone-signature',
], 'Simple CRM proof script');
assertFileIncludes('crm/README.md', [
  'CRM endpoint URL',
  '/crm/capture',
  '/crm/leads',
  '/crm/leads.csv',
  'submitted timestamp in ISO format',
  'privacy and terms consent',
  'CRM_VIEWER_TOKEN',
  'Outbound Webhooks',
  'CRM_LEAD_WEBHOOK_URLS',
  'crm.lead.created',
  'crm.sale.created',
  'Production Storage Note',
], 'Simple CRM README');
assertFileIncludes('.gitignore', ['refresh-theme/'], 'Repo gitignore');
assertFileIncludes('independence-phone-theme/.shopifyignore', [
  '*.swp',
  'README.md',
  'SHOPIFY_HANDOFF.md',
  'THEME_EDITOR_GUIDE.md',
  '*.zip',
], 'Theme Shopify ignore');
assertFileIncludes('independence-phone-theme/layout/theme.liquid', [
  "{% render 'ip-structured-data' %}",
  'ip-product-gallery.js',
  "product.template_suffix == 'billing-item'",
  'noindex,nofollow',
], 'Theme layout');
assertFileIncludes('independence-phone-theme/config/settings_schema.json', [
  '"type": "font_picker"',
  '"id": "max_page_width"',
  '"id": "min_page_margin"',
  '"id": "ip_paper_color"',
  '"id": "input_corner_radius"',
], 'Theme editable design controls');
assertFileIncludes('independence-phone-theme/snippets/meta-tags.liquid', [
  'property="og:title"',
  'property="og:description"',
  'name="twitter:card"',
  '<title>',
  'rel="canonical"',
  'name="description"',
  '{{ product | structured_data }}',
], 'Theme SEO meta tags');
assertFileIncludes('independence-phone-theme/snippets/ip-structured-data.liquid', [
  '"@type": "Organization"',
  '"@type": "WebSite"',
  'Give them a phone. Not the internet.',
], 'Structured data snippet');
assertFileIncludes('independence-phone-theme/snippets/ip-product-card-gallery.liquid', [
  'card_product.media.size',
  'media.alt | default: gallery_title',
  'block.settings.image.alt | default: gallery_title',
  'data-gallery-open',
  'image_tag:',
], 'Product card gallery media and alt text');
assertFileIncludes('independence-phone-theme/sections/ip-faq.liquid', [
  '"@type": "FAQPage"',
  '"mainEntity"',
  '"acceptedAnswer"',
  'block.settings.question | strip_html | json',
  'block.settings.answer | strip_html | json',
], 'FAQ structured data section');
assertFileIncludes('independence-phone-theme/sections/search.liquid', [
  'hidden-from-catalog',
  '{% continue %}',
], 'Search hides billing products');
assertFileIncludes('scripts/apply-refresh-overlay.sh', [
  'cp -R "$overlay/snippets/." "$target_theme/snippets/"',
  'ip-product-gallery.js',
  "{% render 'ip-structured-data' %}",
  "product.template_suffix == 'billing-item'",
], 'Refresh overlay script');
assertFileIncludes('scripts/bootstrap-refresh-store.sh', [
  'shopify theme pull --store "$store" --theme "$theme_id" --path "$target_theme"',
  '"$repo_root/scripts/apply-refresh-overlay.sh" "$target_theme"',
  'shopify theme check --path "$target_theme"',
  'shopify theme dev --store "$store" --theme "$theme_id"',
], 'Refresh store bootstrap script');
assertFileIncludes('scripts/test-refresh-overlay.sh', [
	  'scripts/apply-refresh-overlay.sh',
	  'sections/ip-announcement-banner.liquid',
	  'sections/ip-video-hero.liquid',
	  'sections/ip-order-builder.liquid',
  'sections/ip-billing-item.liquid',
  'sections/search.liquid',
  'snippets/ip-structured-data.liquid',
  'templates/page.order.json',
  'templates/product.billing-item.json',
  'templates/page.faq.json',
  'templates/product.independence-phone.json',
  'ip-theme.css',
  'ip-structured-data',
  'templates/robots.txt.liquid',
], 'Refresh overlay smoke test');
assertFile('independence-phone-theme/SHOPIFY_HANDOFF.md', 'Shopify handoff');
assertFileIncludes('independence-phone-theme/SHOPIFY_HANDOFF.md', [
  'Patriot Phone `Organization`, home-page `WebSite`, and FAQ accordion `FAQPage` JSON-LD',
  '/collections/all',
  '/pages/order-now',
  '/pages/faq',
  'automatic route-level `llms.txt`',
  '64 files inspected with no offenses found.',
  'shopify theme push --store STORE.myshopify.com --theme REFRESH_THEME_ID',
  'shopify theme publish --store STORE.myshopify.com --theme REFRESH_THEME_ID',
], 'Shopify handoff');
assertFile('independence-phone-theme/THEME_EDITOR_GUIDE.md', 'Theme Editor guide');
assertFileIncludes('independence-phone-theme/THEME_EDITOR_GUIDE.md', [
  'durable CRM capture requires the approved server-side capture path',
  'A Liquid theme cannot securely store CRM records by itself.',
  'submitted date/time plus every submitted form field',
  'CRM viewer and CSV export',
  'Product image alt text',
  'Search engine listing titles and meta descriptions',
  'Order list, order detail, fulfillment, tracking numbers, and order export',
  'SEO And Operations Boundary',
  '/sitemap.xml',
  '/robots.txt',
  'Automatic route-level `llms.txt`',
  '/products/standard-phone/llms.txt',
  '/collections/all/llms.txt',
], 'Theme Editor operations and SEO guide');
assertFile('refresh-overlay/README.md', 'Refresh overlay README');
assertFileIncludes('refresh-overlay/README.md', [
  'shopify theme push --store STORE.myshopify.com --theme REFRESH_THEME_ID',
  'shopify theme publish --store STORE.myshopify.com --theme REFRESH_THEME_ID',
], 'Refresh overlay README');
assertFile('store-setup/README.md', 'Store setup README');
assertFileIncludes('store-setup/README.md', [
  'Add descriptive alt text to meaningful product images',
  'Product pages and collection product cards read Shopify product media first.',
  'Use Shopify media/file details to check image dimensions and file sizes before launch.',
  'adds the matching service/add-on products as real priced cart items',
  'hidden setup id',
  'confirm Shopify Admin order detail and order CSV export show the setup details',
  'SEO And Form Operations Boundary',
  'SHOPIFY_STORE_URL=https://STORE.myshopify.com npm run seo:live',
  'SHOPIFY_PREVIEW_THEME_ID=THEME_ID',
  'it does not store the password',
  'tmp/shopify-live-proof/seo-ops-audit.json',
  'Automatic `llms.txt` output is generated by `/Users/vilovieta/Documents/Shopify/llms/automatic-llms.js`.',
  'Route-level raw Markdown is available for homepage, collections, products, pages, and cart-style routes through the llms service.',
  'Root `/llms.txt` requires an edge/proxy or custom domain route in front of Shopify.',
  'The contact page should post to the approved CRM capture endpoint before launch.',
  'npm run crm:test',
  'Native contact form behavior is not enough for launch',
], 'Store setup SEO and operations boundary');
assertFileIncludes('independence-phone-theme/templates/robots.txt.liquid', [
  'robots.default_groups',
  'group.user_agent',
  'group.rules',
  'group.sitemap',
], 'Robots template preserves Shopify default groups');
assertFileIncludes('independence-phone-theme/sections/ip-contact-form.liquid', [
  'crm_endpoint_url',
  'data-crm-capture="true"',
  'crm[source_url]',
  'crm[referrer]',
  'crm[utm_source]',
  'company_website',
  'contact[Patriot Package interest]',
  'contact[Selected add-ons]',
  'contact[Privacy and terms consent]',
  'Privacy Policy',
  'Terms and Conditions',
], 'Contact form CRM capture wiring');
assertFileIncludes('independence-phone-theme/sections/cart.liquid', [
  'item.properties',
  '_setup_id',
  '_setup_parent',
  'ip-cart-properties',
  'ip-cart-addons',
  'data-cart-addon-selector',
  'data-cart-addon-option',
  'data-cart-key',
  'data-setup-id',
  'data-billing-variant',
  'Selected service and add-ons',
  'Available add-ons',
  'Billed with this phone setup',
  'data-cart-savings',
  'Privacy Policy',
  'Terms and Conditions',
], 'Local cart section');
assertFileIncludes('independence-phone-theme/templates/cart.json', [
  'addon_recording',
  'billing_product',
  'call-recording',
  'addon_quiet_hours',
  'addon_voicemail',
  'addon_bundle',
  'addon_attendant',
], 'Cart template add-on blocks');
assertFileIncludes('independence-phone-theme/sections/ip-order-builder.liquid', [
  'monthly_service_product',
  'annual_service_product',
  'call_recording_product',
  'data-billing-variant',
  'data-billing-role',
  'data-order-package',
], 'Order builder billable setup controls');
assertFileIncludes('independence-phone-theme/templates/page.order.json', [
  'monthly-service',
  'annual-service',
  'call-recording',
  'family-quiet-hours',
  'voicemail-to-email',
  'auto-attendant',
  'add-on-bundle',
  'patriot-package',
], 'Order page billing product defaults');
assertFileIncludes('independence-phone-theme/assets/ip-cart.js', [
  'buildSetupCartPayload',
  'selectedBillingInputs',
  'data-billing-variant',
  '_setup_id',
  '_setup_parent',
  'cart/update.js',
  'cartDisplayCount',
], 'Cart JS grouped billing item behavior');
assertFile('independence-phone-theme/templates/product.billing-item.json', 'Hidden billing item product template');
assertFileIncludes('independence-phone-theme/sections/ip-billing-item.liquid', [
  'Setup billing item',
  'only available through the guided order flow',
  '/pages/order-now',
], 'Hidden billing item section');
assertFileIncludes('independence-phone-theme/sections/header.liquid', [
  'ip-independence-phone-logo.png',
  'routes.root_url }}pages/contact',
  'icon-contact.svg',
  'aria-label="Store actions"',
  'aria-label="Cart"',
  'data-cart-count',
], 'Local header section');
assertFileIncludes('independence-phone-theme/sections/ip-feature-strip.liquid', [
  'block.settings.icon',
  'block.settings.included_label',
  'inline_asset_content',
  'ip-tool-icon-auto-attendant.svg',
  'ip-tool-icon-call-recording.svg',
  'ip-tool-icon-phone-times.svg',
], 'Feature strip editable icon blocks');
assertFileIncludes('independence-phone-theme/templates/index.json', [
  '"icon": "shield_check"',
  '"icon": "microphone"',
  '"icon": "clock"',
], 'Home template feature strip icon defaults');
assertFileIncludes('independence-phone-theme/assets/ip-tool-icon-auto-attendant.svg', [
  'viewBox="0 0 24 24"',
  'currentColor',
  'M9 12.75',
], 'Heroicons shield-check asset');
assertFileIncludes('independence-phone-theme/assets/ip-tool-icon-call-recording.svg', [
  'viewBox="0 0 24 24"',
  'currentColor',
  'M12 18.75',
], 'Heroicons microphone asset');
assertFileIncludes('independence-phone-theme/assets/ip-tool-icon-phone-times.svg', [
  'viewBox="0 0 24 24"',
  'currentColor',
  'M12 6v6h4.5',
], 'Heroicons clock asset');
assertFileIncludes('independence-phone-theme/sections/footer.liquid', [
  'aria-label="Footer menu"',
  'routes.all_products_collection_url',
  'routes.root_url }}pages/faq',
  'routes.root_url }}pages/contact',
  'routes.root_url }}policies/privacy-policy',
  'routes.root_url }}policies/terms-of-service',
], 'Local footer section');
assertFileIncludes('store-setup/LAUNCH_CHECKLIST.md', [
  'STORE.myshopify.com',
  'Shopify `Refresh` theme',
  'brief-materials/assets/logo/independence-phone-logo-export.png',
  'node scripts/create-product-metafields.js',
  'node scripts/create-storefront-objects.js',
  'SHOPIFY_ADMIN_ACCESS_TOKEN',
  'scripts/bootstrap-refresh-store.sh',
  'scripts/apply-refresh-overlay.sh',
  'shopify theme dev --store STORE.myshopify.com --theme REFRESH_THEME_ID',
  'custom.product_deck',
  '/products/standard-phone',
  '/products/rugged-phone',
  '/products/monthly-service',
  '/products/add-on-bundle',
  '/products/patriot-package',
  'product.billing-item',
  'collection.phones',
  'product.independence-phone',
  'page.order',
  'page.faq',
  'page.contact',
  'Product images have concise alt text for SEO/accessibility.',
  'Product image dimensions/file sizes are acceptable in Shopify media/file details before launch.',
  'indy-phone-reel-1.mov',
  'Give them a phone. Not the internet.',
  'The old `Reachable without scrollable` eyebrow is absent.',
  'A phone that acts like a phone',
  'The old `The useful part of a phone, first.` heading is absent.',
  'For bus days, home-alone minutes, and grandparents.',
  'American-owned messaging is secondary trust',
  'Confirm hidden billing products exist and use template `product.billing-item`',
  'Confirm add-to-cart works for both products and adds phone, service, and selected add-ons as grouped cart items.',
  'Order Now `/pages/order-now`.',
  'FAQ `/pages/faq`.',
  'Page source includes Independence Phone `Organization`, home-page `WebSite`, and FAQ accordion `FAQPage` JSON-LD.',
  'Cart shows selected service/add-on setup details.',
  'matching setup quantities',
  'Confirm the form posts to the approved simple CRM capture path, not email-only handling.',
  'Confirm the CRM record stores submitted date/time plus every submitted field.',
  'Confirm CSV export includes the same timestamp and all submitted fields.',
  'SEO And Operations Readiness',
  'Online Store preferences have a launch-ready home page title.',
  'Classic Phone search-engine listing is edited.',
  '`/sitemap.xml` resolves after the storefront is public.',
  '`/robots.txt` is reviewed',
  'Automatic raw Markdown `llms.txt` is deployed for root and route-level requests.',
  '`/products/standard-phone/llms.txt` returns a product-specific Markdown summary.',
  '`/collections/all/llms.txt` returns a collection/order-flow Markdown summary.',
  '`/a/llms.txt?path=/pages/faq` returns the FAQ Markdown summary when using Shopify app proxy routing.',
  'SHOPIFY_STORE_URL=https://STORE.myshopify.com npm run seo:live',
  'SHOPIFY_PREVIEW_THEME_ID=THEME_ID',
  'unset SHOPIFY_STOREFRONT_PASSWORD',
  'tmp/shopify-live-proof/seo-ops-audit.json',
  'Place a test order or approved manual order for Classic Phone with monthly service and one add-on.',
  'Confirm Shopify Admin order detail shows the phone line plus the priced service/add-on billing line items with matching setup quantities.',
  'Export orders to CSV and confirm setup details are usable',
  'npm run orders:test',
  'Implement simple CRM capture through an approved server-side path',
  'Confirm the CRM captures submitted date/time, source URL, referrer/UTMs',
  'Confirm staff can expand `View details` for a lead or sale',
  'Export CRM leads/sales to CSV and confirm all normalized fields',
  'shopify theme push --store STORE.myshopify.com --theme REFRESH_THEME_ID',
  'shopify theme publish --store STORE.myshopify.com --theme REFRESH_THEME_ID',
  'Connect the final public domain after publish approval.',
], 'Fresh store launch checklist');
assertFile('visual-preview/index.html', 'Visual preview page');
assertFileIncludes('visual-preview/preview.spec.js', [
  'cart.review',
  'order.builder',
  'ip-cart-properties',
  'visibleCartAddonOptionCount',
  'Auto Attendant',
  'visibleCartPropertyRowCount',
  'visibleProductFormCount',
], 'Visual preview test');
assertFileIncludes('visual-preview/index.html', [
  'ip-independence-phone-logo.png',
  'data-preview-pages',
], 'Visual preview page');
assertFile('visual-preview/verification.md', 'Visual verification report');

assertTemplateTypes('independence-phone-theme/templates/index.json', [
  'ip-video-hero',
  'ip-jtbd-story',
  'ip-feature-strip',
  'ip-service-plans',
  'ip-add-ons',
  'ip-capability-table',
  'ip-package-band',
  'ip-comparison-matrix',
  'ip-faq',
  'ip-trust-band',
]);

assertTemplateTypes('independence-phone-theme/templates/page.order.json', [
  'ip-order-builder',
  'ip-faq',
]);

assertTemplateTypes('independence-phone-theme/templates/page.faq.json', [
  'ip-faq',
]);

assertTemplateTypes('independence-phone-theme/templates/collection.phones.json', [
  'ip-product-comparison',
  'ip-service-plans',
  'ip-add-ons',
  'ip-capability-table',
  'ip-package-band',
  'ip-faq',
]);

assertTemplateTypes('independence-phone-theme/templates/product.independence-phone.json', [
  'ip-product-main',
  'ip-service-plans',
  'ip-add-ons',
  'ip-capability-table',
  'ip-package-band',
  'ip-faq',
  'ip-trust-band',
]);

assertTemplateTypes('independence-phone-theme/templates/page.contact.json', [
  'ip-contact-form',
  'ip-faq',
  'ip-trust-band',
]);

const productMain = fs.readFileSync(
  path.join(root, 'independence-phone-theme/sections/ip-product-main.liquid'),
  'utf8'
);
for (const metafield of ['product_deck', 'best_for', 'specs']) {
  if (productMain.includes(`product.metafields.custom.${metafield}`)) {
    pass(`product main reads custom.${metafield}`);
  } else {
    fail(`product main does not read custom.${metafield}`);
  }
}
for (const snippet of [
  'properties[Service plan]',
  'properties[{{ block.settings.title | escape }}]',
  'billing_product',
  'data-billing-variant',
  'data-billing-role',
  'properties[Phone]',
  'service_plan',
  'addon_option',
  'info_accordion',
  'product_info_heading',
  'data-gallery-open',
  'ip-product-accordions',
  'ip-product-accordion',
]) {
  if (productMain.includes(snippet)) {
    pass(`product main includes purchase option snippet ${snippet}`);
  } else {
    fail(`product main missing purchase option snippet ${snippet}`);
  }
}

assertFileIncludes('independence-phone-theme/assets/ip-product-gallery.js', [
  'data-gallery-lightbox',
  'ArrowLeft',
  'ArrowRight',
  'pointerdown',
  'data-gallery-open',
], 'Product gallery script');

const productTemplate = readJson('independence-phone-theme/templates/product.independence-phone.json');
if (productTemplate) {
  const productMainSection = productTemplate.sections && productTemplate.sections.main;
  const expectedProductMainBlocks = {
	    monthly_service: 'service_plan',
	    annual_service: 'service_plan',
	    addon_recording: 'addon_option',
	    addon_quiet_hours: 'addon_option',
	    addon_voicemail: 'addon_option',
	    addon_bundle: 'addon_option',
	    addon_attendant: 'addon_option',
    info_best_for: 'info_accordion',
    info_specs: 'info_accordion',
    info_service_addons: 'info_accordion',
    info_shipping_setup: 'info_accordion',
  };

  for (const [blockId, type] of Object.entries(expectedProductMainBlocks)) {
    const block = productMainSection && productMainSection.blocks && productMainSection.blocks[blockId];
    if (!block) {
      fail(`product template main missing purchase option block ${blockId}`);
    } else if (block.type !== type) {
      fail(`product template main block ${blockId} has type ${block.type}, expected ${type}`);
    } else {
      pass(`product template main block ${blockId}: ${type}`);
    }
  }
}

const metafields = readJson('store-setup/product-metafields.json') || [];
const expectedMetafields = {
  product_deck: 'single_line_text_field',
  best_for: 'single_line_text_field',
  specs: 'multi_line_text_field',
};

for (const [key, type] of Object.entries(expectedMetafields)) {
  const definition = metafields.find((item) => item.namespace === 'custom' && item.key === key);
  if (!definition) {
    fail(`missing product metafield definition custom.${key}`);
  } else if (definition.type !== type) {
    fail(`product metafield custom.${key} has type ${definition.type}, expected ${type}`);
  } else {
    pass(`product metafield custom.${key}: ${type}`);
  }
}

const csvPath = assertFile('store-setup/products.csv', 'store products CSV');
if (csvPath) {
  const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
  const [headers, ...products] = rows;
  const requiredHeaders = [
    'Title',
    'URL handle',
    'Price',
    'Collection',
    'product.metafields.custom.product_deck',
    'product.metafields.custom.best_for',
    'product.metafields.custom.specs',
  ];

  for (const header of requiredHeaders) {
    if (headers.includes(header)) {
      pass(`products CSV header ${header}`);
    } else {
      fail(`products CSV missing header ${header}`);
    }
  }

  const byHandle = Object.fromEntries(
    products.map((row) => [row[headers.indexOf('URL handle')], row])
  );
  const expectedProducts = {
    'standard-phone': { title: 'Classic Phone', price: '100.00' },
    'rugged-phone': { title: 'Rugged Phone', price: '150.00' },
  };

  for (const [handle, expected] of Object.entries(expectedProducts)) {
    const row = byHandle[handle];
    if (!row) {
      fail(`products CSV missing handle ${handle}`);
      continue;
    }

    const title = row[headers.indexOf('Title')];
    const price = row[headers.indexOf('Price')];
    const collection = row[headers.indexOf('Collection')];
    const specs = row[headers.indexOf('product.metafields.custom.specs')];

    if (title === expected.title) pass(`products CSV ${handle}: title`);
    else fail(`products CSV ${handle}: expected title ${expected.title}, got ${title}`);

    if (price === expected.price) pass(`products CSV ${handle}: price ${expected.price}`);
    else fail(`products CSV ${handle}: expected price ${expected.price}, got ${price}`);

    if (collection === 'Phones') pass(`products CSV ${handle}: collection Phones`);
    else fail(`products CSV ${handle}: expected collection Phones, got ${collection}`);

    if (specs && specs.includes(';')) pass(`products CSV ${handle}: semicolon-delimited specs`);
    else fail(`products CSV ${handle}: specs are not semicolon-delimited`);
  }
}

const packageJson = readJson('package.json');
if (packageJson) {
  for (const script of ['audit:coverage', 'store:metafields:dry-run', 'store:objects:dry-run', 'store:objects:audit', 'store:objects:audit:test', 'store:media:dry-run', 'store:media:assign', 'overlay:test', 'theme:check', 'preview:test', 'seo:live', 'crm:test', 'crm:server', 'llms:test', 'llms:server', 'ops:test', 'ops:server', 'orders:test', 'orders:export', 'verify:local']) {
    if (packageJson.scripts && packageJson.scripts[script]) {
      pass(`package script ${script}`);
    } else {
      fail(`package missing script ${script}`);
    }
  }
}

console.log(`Goal coverage audit: ${passes.length} passed, ${failures.length} failed`);
if (verbose) {
  for (const message of passes) console.log(`PASS ${message}`);
}

if (failures.length > 0) {
  for (const message of failures) console.error(`FAIL ${message}`);
  process.exit(1);
}
