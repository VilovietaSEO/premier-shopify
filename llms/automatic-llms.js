const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const productsCsvPath = path.join(repoRoot, 'store-setup/products.csv');

const DEFAULT_SITE_URL = process.env.LLMS_SITE_URL || 'https://jordan-mark-premier.myshopify.com';
const DEFAULT_TIME_ZONE = process.env.LLMS_TIME_ZONE || 'America/Denver';

const PAGE_ENTRIES = [
  {
    type: 'page',
    title: 'Home',
    path: '/',
    summary: 'Main Independence Phone sales page with the promise: Give your child a phone, not the internet.',
    facts: [
      'Parent-first pitch for a phone without apps, a web browser, social feeds, or the open internet.',
      'Highlights personal phone service at $17.76/mo.',
      'Routes primary ordering CTAs to the guided order builder.',
    ],
  },
  {
    type: 'page',
    title: 'Order Now',
    path: '/pages/order-now',
    summary: 'Primary guided purchase route for choosing a phone, service plan, and optional add-ons.',
    facts: [
      'This is the guided order builder for the current client-facing order flow.',
      'Lets shoppers choose phone, monthly or annual service, and add-ons.',
      'Shows future service and add-on charges separately from the phone amount due through Shopify.',
    ],
  },
  {
    type: 'page',
    title: 'FAQ',
    path: '/pages/faq',
    summary: 'Support and buying FAQ page for installation, usage, referral, and troubleshooting questions.',
    facts: [
      'Explains supported and unsupported capabilities.',
      'Keeps unsupported claims controlled.',
    ],
  },
  {
    type: 'page',
    title: 'Contact',
    path: '/pages/contact',
    summary: 'Contact page for product, service, setup, and support questions.',
    facts: [
      'The form collects Name, Email, optional Phone Number, and How can we Help.',
      'The current launch path uses Shopify native contact delivery; a separate CRM capture service is optional later.',
    ],
  },
  {
    type: 'cart',
    title: 'Cart',
    path: '/cart',
    summary: 'Cart review route separating charges due today from future service and add-on charges.',
    facts: [
      'Only the phone is priced in Shopify checkout; the cart also displays one $15 shipping charge before tax.',
      'Service and add-on selections use $0 Shopify lines with future-charge metadata and a shared setup id.',
      'Rev.io middleware still must collect final consent and desired area code, then create the future billing schedule.',
    ],
  },
];

const SERVICE_ENTRIES = [
  {
    title: 'Monthly service',
    path: '/pages/order-now',
    price: '$17.76/mo',
    summary: 'Personal phone number and monthly phone service for the family phone.',
  },
  {
    title: 'Annual service',
    path: '/pages/order-now',
    price: '$200/yr',
    summary: 'Annual service option with savings compared with monthly billing.',
  },
  {
    title: 'Call Recording',
    path: '/pages/order-now',
    price: '$5/mo',
    summary: 'Optional future-billed service add-on.',
  },
  {
    title: 'Quiet Hours',
    path: '/pages/order-now',
    price: '$5/mo',
    summary: 'Optional future-billed service add-on.',
  },
  {
    title: 'Voicemail to Email',
    path: '/pages/order-now',
    price: '$5/mo',
    summary: 'Optional future-billed service add-on.',
  },
  {
    title: 'Auto Attendant',
    path: '/pages/order-now',
    price: '$5/mo',
    summary: 'Optional future-billed service add-on.',
  },
  {
    title: 'Add-on Bundle',
    path: '/pages/order-now',
    price: '$10/mo',
    summary: 'Bundle of all add-ons.',
  },
];

function normalizeSiteUrl(siteUrl = DEFAULT_SITE_URL) {
  return siteUrl.replace(/\/+$/, '');
}

function absoluteUrl(siteUrl, routePath) {
  const normalized = normalizeSiteUrl(siteUrl);
  if (routePath === '/') return `${normalized}/`;
  return `${normalized}${routePath}`;
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

function readProducts(csvPath = productsCsvPath) {
  const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
  const [headers, ...productRows] = rows;
  return productRows.map((row) => {
    const product = Object.fromEntries(headers.map((header, index) => [header, row[index] || '']));
    return {
      type: 'product',
      title: product.Title,
      path: `/products/${product['URL handle']}`,
      summary: product.Description,
      price: `$${Number(product.Price).toFixed(0)}`,
      facts: [
        product['product.metafields.custom.product_deck'],
        product['product.metafields.custom.best_for'],
        ...product['product.metafields.custom.specs'].split(';').map((item) => item.trim()),
      ].filter(Boolean),
    };
  });
}

function generatedTimestamp(now = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const date = now instanceof Date ? now : new Date(now);
  const offsetFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
  });
  const offsetPart = offsetFormatter.formatToParts(date).find((part) => part.type === 'timeZoneName')?.value || 'GMT';
  const offset = offsetPart.replace('GMT', '') || '+00';
  const iso = date.toISOString().replace(/\.\d{3}Z$/, '');
  return `${iso}${offset.includes(':') ? offset : `${offset}:00`}`;
}

function buildManifest(options = {}) {
  const siteUrl = normalizeSiteUrl(options.siteUrl || DEFAULT_SITE_URL);
  const generated = generatedTimestamp(options.now || new Date(), options.timeZone || DEFAULT_TIME_ZONE);
  const products = options.products || readProducts(options.productsCsvPath || productsCsvPath);

  return {
    siteTitle: 'Independence Phone',
    description: 'A family phone without apps, a web browser, social feeds, or the open internet.',
    website: siteUrl,
    language: 'en (UTF-8)',
    charset: 'UTF-8',
    generated,
    pages: PAGE_ENTRIES,
    products,
    services: SERVICE_ENTRIES,
    claimsDiscipline: [
      'No apps.',
      'No web browser.',
      'No social feeds.',
      'Cordless Wi-Fi handset with charging base.',
      'American-owned.',
      '42 years in communications.',
      'Do not describe Independence Phone as including SMS/texting, GPS, camera, cellular mobility, app support, browser support, YouTube/social access, or emergency calling unless the product/service scope changes.',
    ],
  };
}

function bulletLink(entry, siteUrl) {
  const details = [entry.price, entry.summary].filter(Boolean).join(': ');
  return `- [${entry.title}](${absoluteUrl(siteUrl, entry.path)}): ${details}`;
}

function renderRootLlmsTxt(manifest) {
  const lines = [
    `# ${manifest.siteTitle}`,
    '',
    `> ${manifest.description}`,
    '',
    `Website: ${manifest.website}`,
    `Language: ${manifest.language}`,
    `Charset: ${manifest.charset}`,
    `Generated: ${manifest.generated}`,
    '',
    '---',
    '',
    '## Pages',
    '',
    ...manifest.pages.map((entry) => bulletLink(entry, manifest.website)),
    '',
    '## Products',
    '',
    ...manifest.products.map((entry) => bulletLink(entry, manifest.website)),
    '',
    '## Service And Add-ons',
    '',
    ...manifest.services.map((entry) => bulletLink(entry, manifest.website)),
    '',
    '## Claims Discipline',
    '',
    ...manifest.claimsDiscipline.map((claim) => `- ${claim}`),
    '',
  ];

  return lines.join('\n');
}

function routeToEntry(manifest, routePath) {
  const normalizedPath = routePath === '' ? '/' : routePath.replace(/\/+$/, '') || '/';
  return [...manifest.pages, ...manifest.products, ...manifest.services].find((entry) => {
    const entryPath = entry.path.replace(/\/+$/, '') || '/';
    return entryPath === normalizedPath;
  });
}

function renderEntryLlmsTxt(manifest, entry) {
  const lines = [
    `# ${entry.title}`,
    '',
    `> ${entry.summary}`,
    '',
    `URL: ${absoluteUrl(manifest.website, entry.path)}`,
    `Website: ${manifest.website}`,
    `Language: ${manifest.language}`,
    `Charset: ${manifest.charset}`,
    `Generated: ${manifest.generated}`,
    '',
    '---',
    '',
  ];

  if (entry.price) {
    lines.push('## Price', '', entry.price, '');
  }

  if (entry.facts && entry.facts.length > 0) {
    lines.push('## Key Facts', '', ...entry.facts.map((fact) => `- ${fact}`), '');
  }

  lines.push(
    '## Related',
    '',
    `- [Home](${absoluteUrl(manifest.website, '/')})`,
    `- [Order Now](${absoluteUrl(manifest.website, '/pages/order-now')})`,
    `- [FAQ](${absoluteUrl(manifest.website, '/pages/faq')})`,
    `- [Contact](${absoluteUrl(manifest.website, '/pages/contact')})`,
    '',
    '## Claims Discipline',
    '',
    ...manifest.claimsDiscipline.map((claim) => `- ${claim}`),
    '',
  );

  return lines.join('\n');
}

function textResponse(response, statusCode, body) {
  response.writeHead(statusCode, {
    'content-type': 'text/plain; charset=utf-8',
    'cache-control': 'public, max-age=300',
  });
  response.end(body);
}

function pathFromLlmsRequest(url) {
  if (url.searchParams.get('path')) return url.searchParams.get('path');
  if (url.pathname === '/llms.txt' || url.pathname === '/a/llms.txt') return '/';
  if (!url.pathname.endsWith('/llms.txt')) return null;
  return url.pathname.slice(0, -'/llms.txt'.length) || '/';
}

function createRequestHandler(options = {}) {
  return function requestHandler(request, response) {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    const routePath = pathFromLlmsRequest(url);
    const manifest = buildManifest(options);

    if (routePath == null) {
      textResponse(response, 404, 'Not found\n');
      return;
    }

    if (routePath === '/') {
      textResponse(response, 200, renderRootLlmsTxt(manifest));
      return;
    }

    const entry = routeToEntry(manifest, routePath);
    if (!entry) {
      textResponse(response, 404, `No llms.txt entry found for ${routePath}\n`);
      return;
    }

    textResponse(response, 200, renderEntryLlmsTxt(manifest, entry));
  };
}

function createServer(options = {}) {
  return http.createServer(createRequestHandler(options));
}

if (require.main === module) {
  const port = Number(process.env.PORT || 8788);
  createServer().listen(port, () => {
    console.log(`Automatic llms.txt server listening on http://127.0.0.1:${port}`);
    console.log(`Root: http://127.0.0.1:${port}/llms.txt`);
    console.log(`Per page: http://127.0.0.1:${port}/products/standard-phone/llms.txt`);
  });
}

module.exports = {
  DEFAULT_SITE_URL,
  PAGE_ENTRIES,
  SERVICE_ENTRIES,
  absoluteUrl,
  buildManifest,
  createRequestHandler,
  createServer,
  generatedTimestamp,
  parseCsv,
  pathFromLlmsRequest,
  readProducts,
  renderEntryLlmsTxt,
  renderRootLlmsTxt,
  routeToEntry,
};
