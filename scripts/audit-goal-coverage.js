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
];

const customSections = [
  'ip-video-hero',
  'ip-jtbd-story',
  'ip-feature-strip',
  'ip-product-comparison',
  'ip-product-main',
  'ip-service-plans',
  'ip-add-ons',
  'ip-capability-table',
  'ip-package-band',
  'ip-comparison-matrix',
  'ip-faq',
  'ip-trust-band',
  'ip-contact-form',
];

const customTemplates = [
  'index.json',
  'collection.phones.json',
  'product.independence-phone.json',
  'page.contact.json',
];

const themeAssets = [
  'ip-theme.css',
  'ip-current-site-logo.png',
  'ip-current-site-product-1.png',
  'ip-current-site-product-2.png',
  'ip-current-site-product-3.png',
  'ip-current-site-product-4.png',
  'ip-current-site-product-collage.png',
  'ip-independence-phone-product-crunchy.png',
  'ip-hero-video-poster.jpg',
];

for (const file of sourceFiles) assertFile(file, `brief source ${file}`);
for (const file of sourceAssets) assertFile(file, `brief asset ${file}`);

for (const section of customSections) {
  assertFile(`independence-phone-theme/sections/${section}.liquid`, `theme section ${section}`);
  assertFilesMatch(
    `independence-phone-theme/sections/${section}.liquid`,
    `refresh-overlay/sections/${section}.liquid`
  );
}

for (const template of customTemplates) {
  assertFile(`independence-phone-theme/templates/${template}`, `theme template ${template}`);
  assertFilesMatch(
    `independence-phone-theme/templates/${template}`,
    `refresh-overlay/templates/${template}`
  );
}

for (const asset of themeAssets) {
  assertFile(`independence-phone-theme/assets/${asset}`, `theme asset ${asset}`);
  assertFilesMatch(`independence-phone-theme/assets/${asset}`, `refresh-overlay/assets/${asset}`);
}

assertExecutable('scripts/apply-refresh-overlay.sh', 'Refresh overlay script');
assertFile('independence-phone-theme/SHOPIFY_HANDOFF.md', 'Shopify handoff');
assertFile('refresh-overlay/README.md', 'Refresh overlay README');
assertFile('store-setup/README.md', 'Store setup README');
assertFile('visual-preview/index.html', 'Visual preview page');
assertFile('visual-preview/preview.spec.js', 'Visual preview test');
assertFile('visual-preview/verification.md', 'Visual verification report');

assertTemplateTypes('independence-phone-theme/templates/index.json', [
  'ip-video-hero',
  'ip-jtbd-story',
  'ip-feature-strip',
  'ip-product-comparison',
  'ip-service-plans',
  'ip-add-ons',
  'ip-capability-table',
  'ip-package-band',
  'ip-comparison-matrix',
  'ip-faq',
  'ip-trust-band',
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
    'freedom-phone': { title: 'Freedom Phone', price: '99.00' },
    'patriot-phone': { title: 'Patriot Phone', price: '149.00' },
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
  for (const script of ['audit:coverage', 'theme:check', 'preview:test', 'verify:local']) {
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
