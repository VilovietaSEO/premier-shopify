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

function assertFileExcludes(filePath, phrases, label = filePath) {
  const absolute = assertFile(filePath, label);
  if (!absolute) return;
  const source = fs.readFileSync(absolute, 'utf8');

  for (const phrase of phrases) {
    if (source.includes(phrase)) {
      fail(`${label}: unexpectedly includes ${phrase}`);
    } else {
      pass(`${label}: excludes ${phrase}`);
    }
  }
}

function assertFileOccurrenceCount(filePath, phrase, expectedCount, label = filePath) {
  const absolute = assertFile(filePath, label);
  if (!absolute) return;
  const source = fs.readFileSync(absolute, 'utf8');
  const actualCount = source.split(phrase).length - 1;

  if (actualCount === expectedCount) {
    pass(`${label}: includes ${phrase} exactly ${expectedCount} time(s)`);
  } else {
    fail(`${label}: expected ${phrase} exactly ${expectedCount} time(s), found ${actualCount}`);
  }
}

function assertFileMatches(filePath, pattern, requirement, label = filePath) {
  const absolute = assertFile(filePath, label);
  if (!absolute) return;
  const source = fs.readFileSync(absolute, 'utf8');

  if (pattern.test(source)) {
    pass(`${label}: ${requirement}`);
  } else {
    fail(`${label}: missing ${requirement}`);
  }
}

function assertFilePhraseOrder(filePath, phrases, label = filePath) {
  const absolute = assertFile(filePath, label);
  if (!absolute) return;
  const source = fs.readFileSync(absolute, 'utf8');
  let previousIndex = -1;

  for (const phrase of phrases) {
    const index = source.indexOf(phrase, previousIndex + 1);
    if (index === -1) {
      fail(`${label}: cannot verify order because ${phrase} is missing`);
      return;
    }
    if (index <= previousIndex) {
      fail(`${label}: ${phrase} is out of the required order`);
      return;
    }
    previousIndex = index;
  }

  pass(`${label}: required phrase order is preserved`);
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
  'ip-comparison-matrix': {
    settings: ['eyebrow', 'heading', 'body'],
    blocks: { row: ['feature', 'independence', 'smartphone', 'flip', 'landline'] },
    requiresPreset: true,
  },
  'ip-faq': {
    settings: ['eyebrow', 'heading', 'body', 'open_first'],
    blocks: { faq: ['question', 'answer', 'anchor_id'] },
    requiresPreset: true,
  },
  'ip-trust-band': {
    settings: ['eyebrow', 'heading', 'body'],
    blocks: { trust_item: ['title', 'body'] },
    requiresPreset: true,
  },
  'ip-contact-form': {
    settings: ['button_label', 'crm_endpoint_url'],
    requiresPreset: true,
  },
};

const customTemplates = [
  'index.json',
  'collection.phones.json',
  'product.independence-phone.json',
  'page.contact.json',
  'page.faq.json',
  'page.order.json',
];

const customSnippets = [
  'ip-structured-data.liquid',
  'ip-product-card-gallery.liquid',
  'ip-order-builder-form.liquid',
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
  'ip-classic-phone-back.webp',
  'ip-classic-phone-buttons.webp',
  'ip-classic-phone-charger.webp',
  'ip-classic-phone-front.webp',
  'ip-classic-phone-spin.mp4',
  'ip-rugged-phone-back.webp',
  'ip-rugged-phone-buttons.webp',
  'ip-rugged-phone-charger.webp',
  'ip-rugged-phone-front.webp',
  'ip-rugged-phone-spin.mp4',
  'ip-billing-flag.webp',
  'ip-independence-phone-product-crunchy.png',
  'ip-hero-video.mp4',
  'ip-hero-video-desktop.mp4',
  'ip-hero-video-poster.webp',
  'ip-hero-video-poster-mobile.webp',
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

for (const file of [
  'sections/footer.liquid',
  'sections/cart.liquid',
  'sections/page.liquid',
  'assets/ip-cart.js',
]) {
  assertFilesMatch(
    `independence-phone-theme/${file}`,
    `refresh-overlay/${file}`
  );
}

assertExecutable('scripts/apply-refresh-overlay.sh', 'Refresh overlay script');
assertExecutable('scripts/bootstrap-refresh-store.sh', 'Refresh store bootstrap script');
assertExecutable('scripts/test-refresh-overlay.sh', 'Refresh overlay smoke test');
assertExecutable('scripts/create-product-metafields.js', 'Product metafield creation script');
assertExecutable('scripts/create-storefront-objects.js', 'Storefront object creation script');
assertExecutable('scripts/audit-live-seo.js', 'Live SEO audit script');
assertFile('scripts/audit-storefront-objects.js', 'Read-only storefront object audit script');
assertFile('scripts/test-storefront-object-audit.js', 'Read-only storefront object audit proof script');
assertFile('scripts/storefront-billing-products.js', 'Deferred billing catalog definition');
assertFile('scripts/test-deferred-billing-catalog.js', 'Deferred billing catalog proof script');
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
  'productInputFromBillingProduct',
  'variantInputFromBillingProduct',
  'future_price_cents',
  'billing_cadence',
  'first_bill_rule',
  'price: item.checkoutPrice',
  'taxable: false',
  'requiresShipping: false',
  'tracked: false',
], 'Zero-dollar deferred billing storefront object creation script');
assertFileExcludes('scripts/create-storefront-objects.js', [
  'inventoryItemUpdate',
  'write_inventory',
  "handle: 'patriot-package'",
  "sku: 'PP-PATRIOT-PACKAGE'",
], 'Storefront object creation excludes retired inventory mutation and package contracts');
assertFileIncludes('scripts/storefront-billing-products.js', [
  "const FIRST_BILL_RULE = 'first_day_of_next_month'",
  "checkoutPrice: '0.00'",
  "sku: 'PP-MONTHLY-SERVICE'",
  "sku: 'PP-ANNUAL-SERVICE'",
  "sku: 'PP-ADDON-CALL-RECORDING'",
  "sku: 'PP-ADDON-FAMILY-QUIET-HOURS'",
  "sku: 'PP-ADDON-VOICEMAIL-TO-EMAIL'",
  "sku: 'PP-ADDON-AUTO-ATTENDANT'",
  "sku: 'PP-ADDON-BUNDLE'",
], 'Deferred billing catalog stable SKU and first-bill contract');
assertFileExcludes('scripts/storefront-billing-products.js', [
  'Patriot Package',
  'patriot-package',
  'PP-PATRIOT-PACKAGE',
], 'Deferred billing catalog excludes retired package');
assertFileIncludes('scripts/test-deferred-billing-catalog.js', [
  'assert.equal(billingProducts.length, 7)',
  "assert.equal(product.checkoutPrice, '0.00')",
  'assert.equal(variantInput.taxable, false)',
  'requiresShipping: false',
  'tracked: false',
  'future_price_cents',
  'billing_cadence',
  'first_bill_rule',
  "assert.match(product.files[0].filename, /^ip-.+-billing-flag\\.webp$/)",
  "assert.equal(product.files[0].sourceFilename, 'ip-billing-flag.webp')",
  'fs.statSync(assetPath).size < 100_000',
], 'Deferred billing catalog proof');
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
  'zero-dollar deferred billing products',
  "handle === 'monthly-service').price, '0.00'",
  "handle === 'monthly-service').futurePrice, '17.76'",
  "handle === 'annual-service').futurePrice, '200.00'",
  "handle === 'add-on-bundle').futurePrice, '10.00'",
  "handle === 'patriot-package'), false",
  'billing product requires shipping',
  'price is 99.00',
  'missing product rugged-phone',
  'page faq: page is not published',
], 'Read-only storefront object audit proof script');
assertFileIncludes('scripts/assign-product-media.js', [
  'productSet',
  'SHOPIFY_THEME_ASSET_BASE',
  'VERIFY_RENDERED_QA_ASSET_BASE',
  'ip-classic-phone-buttons.webp',
  'ip-classic-phone-charger.webp',
  'ip-classic-phone-back.webp',
  'ip-rugged-phone-buttons.webp',
  'ip-rugged-phone-charger.webp',
  'ip-rugged-phone-back.webp',
  'billingMediaPlan',
  'ip-billing-flag.webp',
  'Classic Phone handset and charging base',
  'Rugged Phone handset and charging base',
  'duplicateResolutionMode',
  'Product media assignment ready',
  'SHOPIFY_PRODUCT_MEDIA_APPROVED',
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
  '/pages/order-now/llms.txt',
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
  '/pages/order-now',
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
  'For the current client handoff, leave `CRM endpoint URL` blank',
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
  'deferred-billing v2',
  'priced checkout billing lines',
  'cart-level consent',
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
  'Monthly service - $17.76/mo',
  'Annual service - $200/yr',
  'Call Recording',
  'Voicemail to Email',
  'Policy agreement',
  "Object.prototype.hasOwnProperty.call(rows[1], 'patriot_package'), false",
  'assert.doesNotMatch(csv, /Patriot Package/)',
  '_setup_parent',
], 'Order setup export proof script');
assertFileExcludes('orders/setup-export.js', [
  "'patriot_package'",
  "'Patriot Package'",
], 'Order setup export excludes retired package columns');
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
  'config/settings_data.json',
  '*.zip',
], 'Theme Shopify ignore');
assertFileIncludes('independence-phone-theme/layout/theme.liquid', [
  "{% render 'ip-structured-data' %}",
  'ip-product-gallery.js',
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
  'Give your child a phone, not the internet.',
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
  'Independence Phone indexing disabled until launch approval',
  'layout/password.liquid',
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
	  'sections/cart.liquid',
	  'assets/ip-classic-phone-spin.mp4',
	  'assets/ip-rugged-phone-spin.mp4',
	  'assets/ip-billing-flag.webp',
  'sections/page.liquid',
  'sections/ip-billing-item.liquid',
  'sections/search.liquid',
  'snippets/ip-structured-data.liquid',
  'templates/page.order.json',
  'templates/product.billing-item.json',
  'templates/page.faq.json',
  'templates/product.independence-phone.json',
  'ip-theme.css',
  'assets/ip-cart.js',
  'ip-structured-data',
  'templates/robots.txt.liquid',
  "schema: 'independence_phone.revio_checkout.v2'",
  "collection_status: 'pending_checkout'",
  "desired_area_code_collection_status: 'required_at_checkout'",
  'flat_shipping_cents: shippingCents',
  'data-cart-due-today',
  'data-cart-future-charge',
  'ip-classic-phone-front.webp',
  'ip-rugged-phone-front.webp',
  'formnovalidate',
  'data-cart-setup-child',
  'validateAddedSetup',
  "window.location.assign(endpoint('cart'))",
], 'Refresh overlay smoke test');
assertFile('independence-phone-theme/SHOPIFY_HANDOFF.md', 'Shopify handoff');
assertFileIncludes('independence-phone-theme/SHOPIFY_HANDOFF.md', [
  'Independence Phone `Organization`, home-page `WebSite`, and FAQ accordion `FAQPage` JSON-LD',
  '/collections/all',
  '/pages/order-now',
  '/pages/faq',
  'automatic route-level `llms.txt`',
  '65 files inspected with no offenses found.',
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
  '/pages/order-now/llms.txt',
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
  'Hidden billing products exist for Monthly Service',
  'checkout price of `$0.00`',
  '`future_charge_cents`',
  '`first_bill_rule=first_day_of_next_month`',
  'Store shipping is one flat `$15` fee per order',
  'Privacy Policy/Terms consent and desired area code are not collected on Order Now or cart',
  '`independence_phone.revio_checkout.v2`',
  'one shared hidden `setup_id`',
  'Order setup selections are captured as Shopify line-item properties.',
  'SEO And Form Operations Boundary',
  'SHOPIFY_STORE_URL=https://STORE.myshopify.com npm run seo:live',
  'SHOPIFY_PREVIEW_THEME_ID=THEME_ID',
  'it does not store the password',
  'tmp/shopify-live-proof/seo-ops-audit.json',
  'Automatic `llms.txt` output is generated by `/Users/vilovieta/Documents/Shopify/llms/automatic-llms.js`.',
  'Route-level raw Markdown is available for homepage, collections, products, pages, and cart-style routes through the llms service.',
  'Root `/llms.txt` requires an edge/proxy or custom domain route in front of Shopify.',
  "leave `CRM endpoint URL` blank in the `IP contact form` section so Shopify's native contact form is used",
  'Configure staff new-order notifications separately for `mark@premiercompanies.com` and `jordan@premiercompanies.com`',
  'npm run crm:test',
  "Shopify's native contact form is the approved current handoff path",
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
  'Phone Number',
  'How can we Help?',
  '"default": "Send"',
  'ip-contact--simple',
], 'Simplified contact form and CRM capture wiring');
assertFileExcludes('independence-phone-theme/sections/ip-contact-form.liquid', [
  'Child age range',
  'Main use case',
  'Interested product',
  'Preferred service plan',
  'Patriot Package',
  'Selected add-ons',
  'Marketing opt-in',
  'Privacy and terms consent',
  'Send my question',
  'payment_note',
], 'Contact form excludes removed fields and copy');
assertFileIncludes('independence-phone-theme/templates/page.faq.json', [
  'How does the referral offer work?',
  'you both will get one month of service for free!',
  'What is the difference between Classic Phone and Rugged Phone?',
  'Both phones include Wi-Fi, Bluetooth, encrypted data transmission and storage, and 9-hour talk time.',
  'waterproof and drop-proof protection',
  '"anchor_id": "phone-comparison"',
], 'FAQ referral and phone comparison content');
assertFileExcludes('independence-phone-theme/templates/page.faq.json', [
  'Patriot Package',
  'dust-proof',
  '1.8 meters',
  'longer battery life',
], 'FAQ template excludes retired Patriot Package');
assertFileIncludes('independence-phone-theme/sections/page.liquid', [
  'id="referral-offer"',
  'How does the referral offer work?',
  'id="phone-comparison"',
], 'FAQ fallback referral and phone comparison anchors');
assertFileIncludes('independence-phone-theme/sections/cart.liquid', [
  'item.properties',
  '_setup_id',
  '_setup_parent',
  'ip-cart-properties',
  'data-cart-key',
  'data-setup-id',
  'data-cart-setup',
  'data-cart-setup-children',
  'data-cart-setup-child',
  'data-cart-setup-quantity',
  'data-cart-setup-remove',
  'data-cart-savings-source',
  'Selected service and add-ons',
  'data-cart-savings',
  'Your Independence Phone Cart',
  "approved_phone_asset = 'ip-story-before-smartphone.webp'",
  "approved_phone_asset = 'ip-rugged-phone-front.webp'",
  '{% assign flat_shipping = 1500 %}',
  'Phone subtotal',
  'Calculated after address',
  'Due today before tax',
  'Due on the first of next month',
  'data-cart-due-today',
  'data-cart-future-charge',
  'Taxes and recurring billing are shown in checkout.',
  'formnovalidate',
], 'Grouped cart deferred-billing section');
assertFileOccurrenceCount(
  'independence-phone-theme/sections/cart.liquid',
  'name="attributes[Policy agreement]"',
  0,
  'Cart defers policy consent to final checkout'
);
assertFileOccurrenceCount(
  'independence-phone-theme/sections/cart.liquid',
  'name="properties[Policy agreement]"',
  0,
  'Cart has no line-item policy consent'
);
assertFileOccurrenceCount(
  'independence-phone-theme/sections/cart.liquid',
  'formnovalidate',
  1,
  'Grouped cart Update validation bypass'
);
assertFileMatches(
  'independence-phone-theme/sections/cart.liquid',
  /<form\b(?=[^>]*\bdata-cart-form\b)(?![^>]*\bnovalidate\b)[^>]*>/,
  'the cart form keeps native validation enabled while Update alone uses formnovalidate',
  'Grouped cart native validation'
);
for (const hook of [
  'data-cart-setup',
  'data-cart-setup-children',
  'data-cart-setup-child',
  'data-cart-setup-quantity',
  'data-cart-setup-remove',
]) {
  assertFileMatches(
    'independence-phone-theme/sections/cart.liquid',
    new RegExp(`${hook}(?![-\\w])`),
    `contains exact grouped cart hook ${hook}`,
    'Grouped cart selector contract'
  );
}
assertFileExcludes('independence-phone-theme/sections/cart.liquid', [
  'name="properties[Policy agreement]"',
  'name="attributes[Policy agreement]"',
  'data-cart-policy-error',
  'Privacy Policy',
  'Terms and Conditions',
  'Billed with this phone setup',
  'Order review',
  '<th scope="col">Product</th>',
  '<th scope="col">Total</th>',
  'Remove setup',
], 'Grouped cart excludes retired labels and duplicate consent');
assertFileIncludes('independence-phone-theme/sections/cart.liquid', [
  'orphan_setup_child',
  'setup_parent_exists',
  'setup_has_service',
  'cart_has_incomplete_order',
  '{% if setup_id != blank %}',
  '{% assign cart_has_orphan_child = true %}',
  'data-cart-orphan-child',
  'data-cart-incomplete-setup',
  'This billing item is no longer attached to a phone.',
  'This phone is missing its required service selection.',
  'data-cart-integrity-error',
  'name="checkout" {% if cart_has_orphan_child or cart_has_incomplete_order %}disabled aria-disabled="true"{% endif %}',
], 'Grouped cart orphan and required-service integrity warnings');
assertFileMatches(
  'independence-phone-theme/sections/cart.liquid',
  /{% if setup_parent %}[\s\S]*?{% unless setup_parent_exists %}[\s\S]*?{% assign orphan_setup_child = true %}[\s\S]*?{% assign setup_parent = false %}/,
  'orphan billing children are promoted into removable customer-visible rows',
  'Grouped cart orphan rendering'
);
assertFileIncludes('independence-phone-theme/sections/cart.liquid', [
  '{% if setup_id == blank %}name="updates[{{ item.key }}]"{% endif %}',
  '{% if setup_id != blank %}readonly{% endif %}',
  'data-cart-parent-quantity',
  'data-cart-child-quantity',
], 'Grouped cart parent and child quantity fields');
for (const section of [
  'ip-order-builder.liquid',
  'ip-product-main.liquid',
  'page.liquid',
]) {
  assertFileExcludes(
    `independence-phone-theme/sections/${section}`,
    ['name="properties[Policy agreement]"'],
    `${section} has no line-item policy checkbox`
  );
}
assertFileIncludes('independence-phone-theme/sections/ip-product-main.liquid', [
  'Acceptance is collected once at final checkout.',
  'Shipping: one $15 charge per order in the USA.',
], 'Product support route states the final-checkout consent and per-order shipping contract');
assertFileIncludes('independence-phone-theme/templates/product.independence-phone.json', [
  'Shipping: one $15 charge per order in the USA.',
  'Applicable tax is calculated after the customer enters an address.',
], 'Product template states the per-order shipping and address-based tax contract');
assertFileIncludes('visual-preview/index.html', [
  'Shipping: one $15 charge per order in the USA.',
  'Service and add-on selections are captured as $0.00 deferred-billing lines',
], 'Visual preview matches deferred-billing shipping copy');
assertFileExcludes('visual-preview/index.html', [
  '$15 per phone',
], 'Visual preview excludes retired per-phone shipping copy');
assertFileExcludes(
  'independence-phone-theme/snippets/ip-order-builder-form.liquid',
  ['name="properties[Policy agreement]"', 'name="attributes[Policy agreement]"'],
  'shared Order Now builder has no pre-checkout policy field'
);
for (const section of [
  'ip-order-builder.liquid',
  'page.liquid',
]) {
  assertFileIncludes(
    `independence-phone-theme/sections/${section}`,
    ["{% render 'ip-order-builder-form'"],
    `${section} uses the shared Order Now builder`
  );
}
assertFileIncludes('independence-phone-theme/snippets/ip-order-builder-form.liquid', [
  "data-order-image=\"{{ 'ip-classic-phone-front.webp' | asset_url }}\"",
  "data-order-image=\"{{ 'ip-rugged-phone-front.webp' | asset_url }}\"",
  'ip-order-card__phone-media--classic',
  'ip-order-card__phone-media--rugged',
  "src=\"{{ 'ip-classic-phone-spin.mp4' | asset_url }}\"",
  "src=\"{{ 'ip-rugged-phone-spin.mp4' | asset_url }}\"",
  'aria-label="Rotating view of the Classic Phone"',
  'aria-label="Rotating view of the Rugged Phone"',
  'alt="Full front view of the Classic Phone"',
  'alt="Full front view of the Rugged Phone"',
  '/pages/faq#phone-comparison',
], 'Shared Order Now builder front images, rotating media, and description links');
assertFileExcludes('independence-phone-theme/snippets/ip-order-builder-form.liquid', [
  'ip-classic-phone-buttons.webp',
  'ip-rugged-phone-buttons.webp',
], 'Shared Order Now builder excludes cropped selector imagery');
assertFileMatches(
  'independence-phone-theme/assets/ip-theme.css',
  /\.ip-order-card__phone-media img,\s*\.ip-order-card__phone-media video\s*\{[^}]*clip-path:\s*none;[^}]*object-fit:\s*cover;[^}]*transform:\s*none;[^}]*\}/,
  'selector images and rotating media fill the balanced frame without clipping or transforms',
  'Order Now selector media'
);
assertFileExcludes(
  'independence-phone-theme/assets/ip-theme.css',
  ['background: url("ip-bg-flag-subtle.png")'],
  'selector media wrappers do not duplicate the patriotic background baked into the WebP assets'
);
assertFileIncludes('independence-phone-theme/templates/cart.json', [
  'addon_recording',
  'billing_product',
  'call-recording',
  'addon_quiet_hours',
  'addon_voicemail',
  'addon_bundle',
  'addon_attendant',
], 'Cart template add-on blocks');
assertFileIncludes('independence-phone-theme/snippets/ip-order-builder-form.liquid', [
  'monthly_service_product',
  'annual_service_product',
  'call_recording_product',
  'data-billing-variant',
  'data-billing-role',
  'data-future-charge-cents="1776"',
  'data-future-charge-cents="20000"',
  'data-future-charge-cents="1000"',
  'data-future-charge-cents="500"',
  'data-billing-cadence="monthly"',
  'data-billing-cadence="annual"',
  'data-first-bill-rule="first_day_of_next_month"',
  'Choose your service plan — Billed on the 1st of the next month',
  'Choose add-ons — Billed on the 1st of the next month',
  'Discount/referral code',
], 'Order builder deferred-billing controls and exact client copy');
assertFileIncludes('independence-phone-theme/sections/ip-order-builder.liquid', [
  '"default": "Build your Independence Phone order now."',
  '"default": "Taxes, shipping, and recurring billing will be shown in the cart."',
  '"default": "Add order to cart"',
], 'Order builder schema exact client copy');
assertFileExcludes('independence-phone-theme/snippets/ip-order-builder-form.liquid', [
  'Patriot Package',
  'patriot-package',
  'data-order-package',
  'If another customer referred you',
  'name="properties[Policy agreement]"',
], 'Order builder excludes retired package, helper, and policy collection');
assertFileIncludes('independence-phone-theme/templates/page.order.json', [
  'monthly-service',
  'annual-service',
  'call-recording',
  'family-quiet-hours',
  'voicemail-to-email',
  'auto-attendant',
  'add-on-bundle',
  '"heading": "Build your Independence Phone order now."',
  '"checkout_note": "Taxes, shipping, and recurring billing will be shown in the cart."',
  '"button_label": "Add order to cart"',
], 'Order page deferred-billing product defaults and exact client copy');
assertFileExcludes('independence-phone-theme/templates/page.order.json', [
  'Patriot Package',
  'patriot-package',
  'Policy agreement',
], 'Order page excludes retired package and duplicated policy collection');
assertFileIncludes('independence-phone-theme/assets/ip-cart.js', [
  'buildSetupCartPayload',
  'selectedBillingInputs',
  'orderBillingConfigurationError',
  'required billing item is not configured',
  'data-billing-variant',
  '_setup_id',
  '_setup_parent',
  'cart/update.js',
  'cartDisplayCount',
  'validateAddedSetup',
  'expectedItems.every',
  'removeIncompleteSetup',
  'removeIncompleteSetup(validation)',
  'Nothing was kept in your cart',
  'SETUP_CLEANUP_FAILED',
  'Open the cart and remove the incomplete billing item before retrying.',
  "window.location.assign(endpoint('cart'))",
  'data-cart-setup-quantity',
  'data-cart-setup-remove',
  'data-cart-savings-source',
  "schema: 'independence_phone.revio_checkout.v2'",
  "collection_status: 'pending_checkout'",
  'privacy_terms_accepted: null',
  'desired_area_code: null',
  "desired_area_code_collection_status: 'required_at_checkout'",
  'const shippingCents = cartDisplayCount(cart) > 0 ? 1500 : 0;',
  'flat_shipping_cents: shippingCents',
  'due_today_before_tax_cents: immediateSubtotalCents + shippingCents',
  'future_charge_cents: futureChargeCents',
  "first_bill_rule: 'first_day_of_next_month'",
  "setupProperties._order_contract = 'deferred-billing-v2'",
  "'Future charge': details.price || details.value",
  "'Billing starts': 'First day of the following month'",
  '_setup_future_charge_cents',
  '_setup_billing_cadence',
  '_setup_first_bill_rule',
  '.cart-count-bubble',
  'let cartMutationVersion = 0;',
  'const requestVersion = cartMutationVersion;',
  'if (cartMutationVersion === requestVersion && !nativeCartHeaderChanged)',
], 'Cart JS grouped deferred billing, v2 handoff, validation, and redirect behavior');
assertFileExcludes('independence-phone-theme/assets/ip-cart.js', [
  "schema: 'independence_phone.revio_checkout.v1'",
  'validateCartPolicy',
  'data-cart-policy-error',
  "'Policy agreement':",
  'input[type="checkbox"][name="attributes[Policy agreement]"]',
], 'Cart JS excludes v1 and pre-checkout policy collection');
assertFileIncludes('independence-phone-theme/assets/ip-cart.js', [
  "document.querySelector('#cart-icon-bubble, .header__icon--cart')",
  "bubble.className = 'cart-count-bubble';",
  "bubble.querySelector('span[aria-hidden=\"true\"]')",
  "bubble.querySelector('.visually-hidden')",
  'visualCount.hidden = count >= 100;',
  'accessibleCount.textContent = label;',
], 'Cart JS creates and accessibly updates a missing Refresh cart badge');
assertFileMatches(
  'independence-phone-theme/assets/ip-cart.js',
  /method !== 'GET'[\s\S]*?cartMutationVersion \+= 1;[\s\S]*?const requestVersion = cartMutationVersion;[\s\S]*?new MutationObserver[\s\S]*?nativeCartHeaderChanged[\s\S]*?cartMutationVersion === requestVersion && !nativeCartHeaderChanged/,
  'scripted cart mutations and native cart-icon DOM replacements invalidate a pending initial count correction',
  'Cart JS stale header-count response guard'
);
assertFileIncludes('independence-phone-theme/assets/ip-cart.js', [
  'const unmatchedLines = [...setupLines];',
  "const expectedRole = String(expected.properties?._setup_role || '');",
  "const expectedBillingName = String(expected.properties?._setup_billing_name || '');",
  'unmatchedLines.findIndex',
  'unmatchedLines.splice(matchIndex, 1);',
], 'Cart JS one-to-one setup validation');
assertFileIncludes('independence-phone-theme/assets/ip-cart.js', [
  'const syncSetupQuantity = (input, value = input.value) => {',
  "setup.querySelectorAll('[data-cart-parent-quantity], [data-cart-child-quantity]')",
  'syncSetupQuantity(setupQuantity);',
  'syncSetupQuantity(input, previousQuantity);',
], 'Cart JS parent and child quantity synchronization');
assertFileMatches(
  'independence-phone-theme/assets/ip-cart.js',
  /const updateCartLine = async \(input\) => \{[\s\S]*?endpoint\('cart\/update\.js'\)[\s\S]*?updates: Object\.fromEntries/,
  'grouped quantity updates preserve all setup lines without mutating checkout consent',
  'Cart JS grouped quantity update'
);
assertFileMatches(
  'independence-phone-theme/assets/ip-cart.js',
  /const setBusy = \(element, busy\) => \{[\s\S]*?element\.querySelectorAll\('button, input, select'\)\.forEach\(\(control\) => \{[\s\S]*?if \(busy\) \{[\s\S]*?control\.disabled = true;/,
  'setBusy disables Checkout with the other form controls while a request is active',
  'Cart JS busy-state checkout guard'
);
assertFileExcludes('independence-phone-theme/assets/ip-cart.js', [
  "if (control.name === 'checkout') return;",
], 'Cart JS busy state has no Checkout exception');
assertFileIncludes('independence-phone-theme/assets/ip-cart.js', [
  'const parentSetupIds = new Set(',
  '.filter((item) => !isSetupChild(item.properties))',
  'if (isSetupChild(item.properties) && parentSetupIds.has(setupId)) return count;',
], 'Cart JS grouped header count excludes only attached billing children');
assertFileIncludes('independence-phone-theme/assets/ip-cart.js', [
  'const validateCartIntegrity = (form) => {',
  "form.querySelector('[data-cart-orphan-child], [data-cart-incomplete-setup]')",
  "form.querySelector('[data-cart-integrity-error]')",
  'const integrityValid = validateCartIntegrity(cartForm);',
  'if (!integrityValid)',
], 'Cart JS orphan and required-service integrity checkout block');
assertFileIncludes('independence-phone-theme/assets/ip-cart.js', [
  "const sources = [...document.querySelectorAll('[data-cart-savings-source]')];",
  "source.querySelector('[data-cart-quantity]')?.value",
  'year: total.year + (lineSavings.year * quantity)',
  'month: total.month + (lineSavings.month * quantity)',
], 'Cart JS quantity-aware savings inputs');
assertFilePhraseOrder('independence-phone-theme/assets/ip-cart.js', [
  'const updateCartSavings = () => {',
  "const sources = [...document.querySelectorAll('[data-cart-savings-source]')];",
  'const savings = sources.length > 0',
  '? sources.reduce((total, source) => {',
  'const lineSavings = calculateSavings',
  'lineSavings.year * quantity',
  'lineSavings.month * quantity',
  ': calculateSavings(',
], 'Cart JS uses quantity-aware setup sources or visible properties without double-counting both');
assertFilePhraseOrder('independence-phone-theme/assets/ip-cart.js', [
  'const validation = validateAddedSetup(cart, setupPayload);',
  'if (!validation.complete)',
  'removeIncompleteSetup(validation)',
  "window.location.assign(endpoint('cart'));",
], 'Cart JS validates and cleans up the complete setup before redirect');
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
  'customer_cart_count',
  'header_child_has_parent',
], 'Local header section');
assertFileMatches(
  'independence-phone-theme/sections/cart.liquid',
  /<button\b(?=[^>]*\bdata-cart-setup-remove\b)(?=[^>]*\bhidden\b)[^>]*>/,
  'grouped setup removal is hidden until JavaScript can safely remove every grouped line',
  'Cart no-JS grouped remove guard'
);
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
  'class="footer__contact"',
  'aria-label="Independence Phone contact information"',
  'section.settings.contact_email',
  'section.settings.contact_phone',
  'section.settings.contact_phone_link',
  "footer_email != blank",
  "footer_phone != blank and footer_phone_link != blank",
  "'mailto:' | append: footer_email",
  "'tel:' | append: footer_phone_link",
  '{{ footer_email_url | escape }}',
  '{{ footer_email | escape }}',
  '{{ footer_phone_url | escape }}',
  '{{ footer_phone | escape }}',
  '"default": "info@independencephone.com"',
  '"default": "(615) 704-1776"',
  '"default": "+16157041776"',
  'routes.root_url }}pages/order-now',
  "footer_link_title == 'order now'",
  'routes.root_url }}pages/faq',
  'routes.root_url }}pages/contact',
  "append: 'policies/privacy-policy'",
  "append: 'policies/terms-of-service'",
  'Privacy Policy',
  'Terms and Conditions',
], 'Local footer section');
assertSectionSchema('footer', {
  settings: [
    'footer_note',
    'contact_email',
    'contact_phone',
    'contact_phone_link',
    'menu',
    'show_payment_icons',
  ],
});
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
  '/products/annual-service',
  '/products/call-recording',
  '/products/family-quiet-hours',
  '/products/voicemail-to-email',
  '/products/auto-attendant',
  '/products/add-on-bundle',
  'product.billing-item',
  'collection.phones',
  'product.independence-phone',
  'page.order',
  'page.faq',
  'page.contact',
  'Product images have concise alt text for SEO/accessibility.',
  'Product image dimensions/file sizes are acceptable in Shopify media/file details before launch.',
  'indy-phone-reel-1.mov',
  'Give your child a phone, not the internet.',
  'The old `Reachable without scrollable` eyebrow is absent.',
  'A phone that acts like a phone',
  'The old `The useful part of a phone, first.` heading is absent.',
  'For bus days, home-alone minutes, and grandparents.',
  'American-owned messaging is secondary trust',
  'Confirm hidden billing products exist and use template `product.billing-item`',
  'all seven billing products use `$0.00` Shopify variants, no shipping requirement, stable SKUs, and American-flag media',
  'Confirm add-to-cart works for both products and adds phone, service, and selected add-ons as grouped cart items.',
  'Order Now `/pages/order-now`.',
  'FAQ `/pages/faq`.',
  'Page source includes Independence Phone `Organization`, home-page `WebSite`, and FAQ accordion `FAQPage` JSON-LD.',
  'Cart shows selected service/add-on setup details.',
  'Cart shows phone-only due-today merchandise, one `$15` shipping fee, tax pending until address, and separate future charges.',
  'matching setup quantities',
  "Confirm Theme Editor `CRM endpoint URL` is blank so the form uses Shopify's native contact handling for this handoff.",
  'Confirm Shopify Admin `Settings -> Notifications -> Sender email` is `jordan@premiercompanies.com`.',
  'If CRM capture is later approved, confirm the endpoint stores submitted date/time plus every submitted field',
  'SEO And Operations Readiness',
  'Online Store preferences have a launch-ready home page title.',
  'Classic Phone search-engine listing is edited.',
  '`/sitemap.xml` resolves after the storefront is public.',
  '`/robots.txt` is reviewed',
  'Automatic raw Markdown `llms.txt` is deployed for root and route-level requests.',
  '`/products/standard-phone/llms.txt` returns a product-specific Markdown summary.',
  '`/pages/order-now/llms.txt` returns a guided order-flow Markdown summary.',
  '`/a/llms.txt?path=/pages/faq` returns the FAQ Markdown summary when using Shopify app proxy routing.',
  'SHOPIFY_STORE_URL=https://STORE.myshopify.com npm run seo:live',
  'SHOPIFY_PREVIEW_THEME_ID=THEME_ID',
  'unset SHOPIFY_STOREFRONT_PASSWORD',
  'tmp/shopify-live-proof/seo-ops-audit.json',
  'Place a test order or approved manual order for Classic Phone with monthly service and one add-on.',
  'Place a test order or approved manual order for Rugged Phone with annual service and Add-on Bundle.',
  'Confirm Shopify Admin order detail shows the phone line plus zero-dollar service/add-on lines with matching setup quantities.',
  'The checkout handoff schema is `independence_phone.revio_checkout.v2`.',
  'Shipping is exactly `1500` cents once per order.',
  'Future service/add-on total is shown separately and begins the first day of the following month.',
  'Final checkout requires Privacy Policy/Terms consent exactly once.',
  'Final checkout requires desired area code.',
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
  'visibleCartSetupCount',
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
  'ip-comparison-matrix',
  'ip-faq',
  'ip-trust-band',
]);
assertFileExcludes('independence-phone-theme/templates/index.json', [
  'Patriot Package',
  'patriot-package',
  '"type": "ip-package-band"',
], 'Homepage template excludes the retired Patriot Package');

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
  'ip-faq',
]);

assertTemplateTypes('independence-phone-theme/templates/product.independence-phone.json', [
  'ip-product-main',
  'ip-service-plans',
  'ip-add-ons',
  'ip-capability-table',
  'ip-faq',
  'ip-trust-band',
]);

assertTemplateTypes('independence-phone-theme/templates/page.contact.json', [
  'ip-contact-form',
]);
assertFileExcludes('independence-phone-theme/templates/page.contact.json', [
  '"type": "ip-faq"',
  '"type": "ip-trust-band"',
], 'Contact template contains only the contact form');

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
