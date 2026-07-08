#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const proofDir = path.join(root, 'tmp', 'shopify-live-proof');
const outputPath =
  process.env.LAUNCH_READINESS_OUTPUT ||
  path.join(proofDir, 'launch-readiness-audit.json');
const contactEmailRecipient = 'jordan@premiercompanies.com';

const requiredRoutes = [
  '/',
  '/collections/all',
  '/pages/order-now',
  '/pages/faq',
  '/pages/contact',
  '/products/standard-phone',
  '/products/rugged-phone',
  '/cart',
];

const requiredProducts = [
  { handle: 'standard-phone', title: 'Classic Phone', price: '100.00' },
  { handle: 'rugged-phone', title: 'Rugged Phone', price: '150.00' },
];

const requiredBillingProducts = [
  { handle: 'monthly-service', title: 'Monthly Service', price: '17.76' },
  { handle: 'annual-service', title: 'Annual Service', price: '200.00' },
  { handle: 'call-recording', title: 'Call Recording', price: '5.00' },
  { handle: 'family-quiet-hours', title: 'Quiet Hours', price: '5.00' },
  { handle: 'voicemail-to-email', title: 'Voicemail to Email', price: '5.00' },
  { handle: 'auto-attendant', title: 'Auto Attendant', price: '5.00' },
  { handle: 'add-on-bundle', title: 'Add-on Bundle', price: '10.00' },
  { handle: 'patriot-package', title: 'Patriot Package', price: '150.00' },
];

const requiredOpsBundleFiles = [
  'package.json',
  'package-lock.json',
  'crm/simple-crm.js',
  'llms/automatic-llms.js',
  'ops/storefront-ops-server.js',
  'ops/patriot-phone-ops.service.example',
  'ops/patriot-phone-ops.env.example',
  'orders/setup-export.js',
  'DEPLOYMENT.md',
];

const requiredOpsBundleEnv = [
  'CRM_SUBMISSIONS_PATH=/opt/patriot-phone/data/crm-submissions.jsonl',
  'CRM_VIEWER_TOKEN=<long random staff token>',
  'CRM_ORDER_INGEST_TOKEN=<different long random order-ingest token>',
  'SHOPIFY_ORDER_WEBHOOK_SECRET=<Shopify order webhook signing secret>',
  'LLMS_SITE_URL=https://jordan-mark-premier.myshopify.com',
];

const requiredOpsBundlePaths = {
  healthPath: '/healthz',
  crmCapturePath: '/crm/capture',
  crmViewerPath: '/crm/leads',
  crmCsvPath: '/crm/leads.csv',
  shopifyOrderWebhookPath: '/crm/shopify/orders/create',
  orderBackfillPath: '/crm/orders/import',
  llmsRootPath: '/llms.txt',
};

function readJson(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return { missing: true, path: absolutePath, data: null };
  }

  try {
    return {
      missing: false,
      path: absolutePath,
      data: JSON.parse(fs.readFileSync(absolutePath, 'utf8')),
    };
  } catch (error) {
    return {
      missing: false,
      path: absolutePath,
      error: error.message,
      data: null,
    };
  }
}

function check(name, status, detail, evidence = []) {
  return {
    name,
    status,
    detail,
    evidence,
  };
}

function allPass(checks) {
  return checks.every((item) => item.status === 'pass');
}

function routeChecks(liveBridge) {
  if (liveBridge.missing || liveBridge.error || !liveBridge.data) {
    return [
      check(
        'live route proof artifact exists',
        'blocker',
        liveBridge.error || 'tmp/shopify-live-proof/live-bridge-verification.json is missing',
        [liveBridge.path]
      ),
    ];
  }

  return requiredRoutes.map((route) => {
    const routeData = liveBridge.data.routes && liveBridge.data.routes[route];
    if (!routeData) {
      return check(`route ${route} is present in live proof`, 'blocker', 'missing from live route proof', [liveBridge.path]);
    }
    if (routeData.notFound) {
      return check(`route ${route} is not 404`, 'blocker', 'live route proof reports notFound: true', [liveBridge.path]);
    }
    return check(`route ${route} is not 404`, 'pass', routeData.title || routeData.h1 || 'route rendered', [liveBridge.path]);
  });
}

function productChecks(storeObjects) {
  if (storeObjects.missing || storeObjects.error || !storeObjects.data) {
    return [
      check(
        'store object audit artifact exists',
        'blocker',
        storeObjects.error || 'tmp/shopify-live-proof/storefront-objects-audit.json is missing',
        [storeObjects.path]
      ),
    ];
  }

  const checks = [];
  for (const expected of requiredProducts) {
    const product = (storeObjects.data.products || []).find((item) => item.handle === expected.handle);
    if (!product) {
      checks.push(check(`product ${expected.handle} exists`, 'blocker', 'missing from object audit', [storeObjects.path]));
      continue;
    }

    const failures = [];
    if (product.actualTitle !== expected.title) failures.push(`title is ${product.actualTitle || '(blank)'}`);
    if (product.price !== expected.price) failures.push(`price is ${product.price || '(blank)'}`);
    if (product.templateSuffix !== 'independence-phone') failures.push(`template is ${product.templateSuffix || '(blank)'}`);
    if (product.status !== 'ACTIVE') failures.push(`status is ${product.status || '(blank)'}`);
    if (product.mediaCount < 2) failures.push(`mediaCount is ${product.mediaCount}`);
    if (product.mediaWithAltCount < 2) failures.push(`mediaWithAltCount is ${product.mediaWithAltCount}`);
    if ((product.failures || []).length > 0) failures.push(...product.failures);

    checks.push(
      check(
        `product ${expected.handle} data and media`,
        failures.length > 0 ? 'blocker' : 'pass',
        failures.length > 0 ? failures.join('; ') : `${expected.title}, $${expected.price}, media/alt text ready`,
        [storeObjects.path]
      )
    );
  }

  for (const expected of requiredBillingProducts) {
    const product = (storeObjects.data.billingProducts || []).find((item) => item.handle === expected.handle);
    if (!product) {
      checks.push(check(`billing product ${expected.handle} exists`, 'blocker', 'missing from object audit', [storeObjects.path]));
      continue;
    }

    const failures = [];
    if (product.actualTitle !== expected.title) failures.push(`title is ${product.actualTitle || '(blank)'}`);
    if (product.price !== expected.price) failures.push(`price is ${product.price || '(blank)'}`);
    if (product.templateSuffix !== 'billing-item') failures.push(`template is ${product.templateSuffix || '(blank)'}`);
    if (product.status !== 'ACTIVE') failures.push(`status is ${product.status || '(blank)'}`);
    if ((product.failures || []).length > 0) failures.push(...product.failures);

    checks.push(
      check(
        `billing product ${expected.handle} data`,
        failures.length > 0 ? 'blocker' : 'pass',
        failures.length > 0 ? failures.join('; ') : `${expected.title}, $${expected.price}, hidden billing template ready`,
        [storeObjects.path]
      )
    );
  }

  const collection = storeObjects.data.collection || {};
  const collectionFailures = [];
  if (collection.handle !== 'phones') collectionFailures.push(`handle is ${collection.handle || '(blank)'}`);
  if (collection.templateSuffix !== 'phones') collectionFailures.push(`template is ${collection.templateSuffix || '(blank)'}`);
  for (const expected of requiredProducts) {
    if (!(collection.productHandles || []).includes(expected.handle)) collectionFailures.push(`missing ${expected.handle}`);
  }
  if ((collection.failures || []).length > 0) collectionFailures.push(...collection.failures);

  checks.push(
    check(
      'phones collection contains the two launch products',
      collectionFailures.length > 0 ? 'blocker' : 'pass',
      collectionFailures.length > 0 ? collectionFailures.join('; ') : 'phones collection contains Standard and Rugged products',
      [storeObjects.path]
    )
  );

  const pageFailures = storeObjects.data.failures || [];
  const pageScopeBlocked = pageFailures.some((failure) => /cannot read pages|page access denied/i.test(failure));
  checks.push(
    check(
      'Admin API page-object audit',
      pageScopeBlocked ? 'pending' : pageFailures.length > 0 ? 'blocker' : 'pass',
      pageScopeBlocked
        ? 'current Admin auth cannot read pages; storefront route proof is used until page-read scope is available'
        : pageFailures.length > 0
          ? pageFailures.join('; ')
          : 'required pages verified by Admin API',
      [storeObjects.path]
    )
  );

  return checks;
}

function seoChecks(seo) {
  if (seo.missing || seo.error || !seo.data) {
    return [
      check(
        'live SEO audit artifact exists',
        'blocker',
        seo.error || 'tmp/shopify-live-proof/seo-ops-audit.json is missing',
        [seo.path]
      ),
    ];
  }

  const passwordPages = (seo.data.routes || []).filter((route) => route.passwordPage);
  const llmsFailures = seo.data.platform?.llms?.failures || [];
  const sitemapFailures = seo.data.platform?.sitemap?.failures || [];
  const routeFailures = (seo.data.routes || []).flatMap((route) => route.failures || []);

  return [
    check(
      'public storefront is accessible to crawlers',
      passwordPages.length > 0 ? 'blocker' : 'pass',
      passwordPages.length > 0
        ? `${passwordPages.length} audited route(s) returned the Shopify password page`
        : 'audited routes did not return the password page',
      [seo.path]
    ),
    check(
      'live llms.txt routes return raw Markdown',
      llmsFailures.length > 0 ? 'blocker' : 'pass',
      llmsFailures.length > 0
        ? `${llmsFailures.length} llms.txt failure(s); ops proxy is not deployed or not routed`
        : 'root and route-level llms.txt routes returned raw Markdown',
      [seo.path]
    ),
    check(
      'sitemap is available after public launch',
      sitemapFailures.length > 0 ? 'blocker' : 'pass',
      sitemapFailures.length > 0 ? sitemapFailures.join('; ') : 'sitemap includes product and page URLs',
      [seo.path]
    ),
    check(
      'route SEO metadata and JSON-LD pass live audit',
      routeFailures.length > 0 ? 'blocker' : 'pass',
      routeFailures.length > 0
        ? `${routeFailures.length} route SEO failure(s), mostly expected while password page is returned`
        : 'audited route metadata and JSON-LD pass',
      [seo.path]
    ),
  ];
}

function passwordAccessChecks(passwordProof) {
  if (passwordProof.missing || passwordProof.error || !passwordProof.data) {
    return [
      check(
        'password-gated client access proof exists',
        'blocker',
        passwordProof.error || 'tmp/shopify-live-proof/password-access-verification.json is missing',
        [passwordProof.path]
      ),
    ];
  }

  return [
    check(
      'password-gated client access can serve the storefront',
      passwordProof.data.previewServedHome && !passwordProof.data.previewServedPasswordPage ? 'pass' : 'blocker',
      passwordProof.data.previewServedHome
        ? 'clean password session served the storefront without storing the password'
        : 'password proof did not serve the storefront',
      [passwordProof.path]
    ),
  ];
}

function opsBundleChecks(opsBundle) {
  if (opsBundle.missing) {
    return [
      check(
        'ops deployment bundle is generated',
        'blocker',
        'run npm run ops:bundle before deploying the CRM/llms service',
        [opsBundle.path]
      ),
    ];
  }
  if (opsBundle.error || !opsBundle.data) {
    return [
      check(
        'ops deployment bundle is generated',
        'blocker',
        opsBundle.error || 'ops deployment bundle manifest could not be read',
        [opsBundle.path]
      ),
    ];
  }

  const failures = [];
  if (opsBundle.data.service !== 'patriot-phone-storefront-ops') {
    failures.push(`service is ${opsBundle.data.service || '(blank)'}`);
  }
  if (opsBundle.data.entrypoint !== 'ops/storefront-ops-server.js') {
    failures.push(`entrypoint is ${opsBundle.data.entrypoint || '(blank)'}`);
  }

  const fileSet = new Set((opsBundle.data.files || []).map((file) => file.path));
  for (const file of requiredOpsBundleFiles) {
    if (!fileSet.has(file)) failures.push(`missing bundle file ${file}`);
  }

  const envSet = new Set(opsBundle.data.requiredEnv || []);
  for (const envLine of requiredOpsBundleEnv) {
    if (!envSet.has(envLine)) failures.push(`missing env requirement ${envLine}`);
  }

  for (const [field, expected] of Object.entries(requiredOpsBundlePaths)) {
    if (opsBundle.data[field] !== expected) failures.push(`${field} is ${opsBundle.data[field] || '(blank)'}`);
  }

  return [
    check(
      'ops deployment bundle is generated',
      failures.length > 0 ? 'blocker' : 'pass',
      failures.length > 0
        ? failures.join('; ')
        : 'runtime files, CRM paths, Shopify webhook, llms route, env requirements, and deployment guide are bundled',
      [opsBundle.path]
    ),
  ];
}

function opsDeploymentChecks(opsDeployment) {
  if (opsDeployment.missing) {
    return [
      check(
        'deployed ops endpoint proof',
        'blocker',
        'ops deployment audit has not been run against a public HTTPS endpoint',
        [opsDeployment.path]
      ),
    ];
  }
  if (opsDeployment.error || !opsDeployment.data) {
    return [
      check(
        'deployed ops endpoint proof',
        'blocker',
        opsDeployment.error || 'ops deployment audit could not be read',
        [opsDeployment.path]
      ),
    ];
  }

  return [
    check(
      'deployed ops endpoint proof',
      (opsDeployment.data.failures || []).length > 0 ? 'blocker' : 'pass',
      (opsDeployment.data.failures || []).length > 0
        ? `${opsDeployment.data.failures.length} deployed ops failure(s)`
        : 'health, CRM, redirects, CSV, raw llms.txt routes, and token redaction verified',
      [opsDeployment.path]
    ),
  ];
}

function contactEmailDeliveryChecks(contactEmail) {
  if (contactEmail.missing) {
    return [
      check(
        'native contact form email delivery',
        'blocker',
        `contact email proof has not been recorded; set the Shopify contact form recipient/Sender email to ${contactEmailRecipient} and submit a real test message`,
        [contactEmail.path]
      ),
    ];
  }
  if (contactEmail.error || !contactEmail.data) {
    return [
      check(
        'native contact form email delivery',
        'blocker',
        contactEmail.error || 'contact email proof could not be read',
        [contactEmail.path]
      ),
    ];
  }

  const failures = [...(contactEmail.data.failures || [])];
  const serialized = JSON.stringify(contactEmail.data).toLowerCase();
  if (contactEmail.data.status !== 'pass') failures.push('contact email proof status is not pass');
  if (!serialized.includes(contactEmailRecipient)) failures.push(`proof does not mention ${contactEmailRecipient}`);

  return [
    check(
      'native contact form email delivery',
      failures.length > 0 ? 'blocker' : 'pass',
      failures.length > 0
        ? `${failures.length} contact email proof failure(s)`
        : `Shopify native contact form delivers to ${contactEmailRecipient}`,
      [contactEmail.path]
    ),
  ];
}

function orderChecks(orderProof) {
  if (orderProof.missing) {
    return [
      check(
        'real or approved manual Shopify order proof',
        'blocker',
        'order proof audit has not been run against a real/test Shopify orders JSON source',
        [orderProof.path]
      ),
    ];
  }
  if (orderProof.error || !orderProof.data) {
    return [
      check(
        'real or approved manual Shopify order proof',
        'blocker',
        orderProof.error || 'order proof audit could not be read',
        [orderProof.path]
      ),
    ];
  }

  const failures = orderProof.data.failures || [];
  return [
    check(
      'real or approved manual Shopify order proof',
      failures.length > 0 || orderProof.data.status !== 'pass' ? 'blocker' : 'pass',
      failures.length > 0
        ? `${failures.length} order proof failure(s)`
        : 'Classic monthly add-on and Classic Patriot Package order scenarios verified with setup CSV output',
      [orderProof.path, orderProof.data.csvOutputPath].filter(Boolean)
    ),
  ];
}

function buildReport() {
  const artifacts = {
    liveBridge: readJson('tmp/shopify-live-proof/live-bridge-verification.json'),
    storeObjects: readJson('tmp/shopify-live-proof/storefront-objects-audit.json'),
    seo: readJson('tmp/shopify-live-proof/seo-ops-audit.json'),
    passwordProof: readJson('tmp/shopify-live-proof/password-access-verification.json'),
    opsBundle: readJson('tmp/patriot-phone-ops-deployment/deployment-manifest.json'),
    opsDeployment: readJson('tmp/shopify-live-proof/ops-deployment-audit.json'),
    contactEmail: readJson('tmp/shopify-live-proof/contact-email-proof.json'),
    orderProof: readJson('tmp/shopify-live-proof/order-proof-audit.json'),
  };

  const groups = [
    { name: 'Storefront routes', checks: routeChecks(artifacts.liveBridge) },
    { name: 'Products and collection', checks: productChecks(artifacts.storeObjects) },
    { name: 'Client access', checks: passwordAccessChecks(artifacts.passwordProof) },
    { name: 'Public SEO and llms.txt', checks: seoChecks(artifacts.seo) },
    { name: 'Ops deployment package', checks: opsBundleChecks(artifacts.opsBundle) },
    { name: 'Ops deployment', checks: opsDeploymentChecks(artifacts.opsDeployment) },
    { name: 'Contact email', checks: contactEmailDeliveryChecks(artifacts.contactEmail) },
    { name: 'Orders', checks: orderChecks(artifacts.orderProof) },
  ];

  const allChecks = groups.flatMap((group) => group.checks.map((item) => ({ ...item, group: group.name })));
  const blockerCount = allChecks.filter((item) => item.status === 'blocker').length;
  const pendingCount = allChecks.filter((item) => item.status === 'pending').length;
  const passCount = allChecks.filter((item) => item.status === 'pass').length;

  return {
    generatedAt: new Date().toISOString(),
    store: 'jordan-mark-premier.myshopify.com',
    liveThemeId: '150479208517',
    status: blockerCount > 0 ? 'blocked' : pendingCount > 0 ? 'pending' : 'ready',
    summary: {
      pass: passCount,
      pending: pendingCount,
      blocker: blockerCount,
    },
    groups,
  };
}

function main() {
  const report = buildReport();
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

  console.log(`Launch readiness audit wrote ${path.relative(root, outputPath)}`);
  console.log(`Status: ${report.status}`);
  console.log(`Pass: ${report.summary.pass}`);
  console.log(`Pending: ${report.summary.pending}`);
  console.log(`Blockers: ${report.summary.blocker}`);

  for (const group of report.groups) {
    const blockers = group.checks.filter((item) => item.status === 'blocker');
    for (const item of blockers) {
      console.error(`BLOCKER ${group.name}: ${item.name}: ${item.detail}`);
    }
  }

  if (report.status !== 'ready') process.exit(1);
}

if (require.main === module) {
  main();
}

module.exports = {
  buildReport,
  opsBundleChecks,
};
