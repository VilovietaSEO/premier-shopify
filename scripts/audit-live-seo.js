#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const outputPath =
  process.env.SEO_AUDIT_OUTPUT ||
  path.join(root, 'tmp', 'shopify-live-proof', 'seo-ops-audit.json');

const requiredRoutes = [
  '/',
  '/collections/all',
  '/collections/phones',
  '/pages/order-now',
  '/pages/faq',
  '/pages/contact',
  '/products/standard-phone',
  '/products/rugged-phone',
];

const requiredLlmsRoutes = [
  { route: '/llms.txt', requiredText: ['# Independence Phone', '## Pages', '## Products'] },
  { route: '/products/standard-phone/llms.txt', requiredText: ['# Classic Phone', '## Key Facts'] },
  { route: '/products/rugged-phone/llms.txt', requiredText: ['# Rugged Phone', '## Key Facts'] },
  { route: '/pages/order-now/llms.txt', requiredText: ['# Order Now', 'guided order builder'] },
];

function usage() {
  console.error('Usage: SHOPIFY_STORE_URL=https://STORE.myshopify.com node scripts/audit-live-seo.js');
  console.error('Optional: SHOPIFY_PREVIEW_THEME_ID=12345');
  console.error('Optional: SHOPIFY_STOREFRONT_PASSWORD=... (not stored in proof output)');
  console.error('Optional: LLMS_BASE_URL=https://STORE.myshopify.com (defaults to SHOPIFY_STORE_URL)');
  console.error('Optional: SEO_AUDIT_OUTPUT=/absolute/path/seo-ops-audit.json');
}

function normalizeStoreUrl(value) {
  if (!value) return null;
  const withProtocol = /^https?:\/\//.test(value) ? value : `https://${value}`;
  const url = new URL(withProtocol);
  url.pathname = '';
  url.search = '';
  url.hash = '';
  return url;
}

function textBetween(source, pattern) {
  const match = source.match(pattern);
  return match ? decodeHtml(match[1].trim()) : '';
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function metaContent(source, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return textBetween(
    source,
    new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, 'i')
  );
}

function linkHref(source, rel) {
  const escaped = rel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return textBetween(
    source,
    new RegExp(`<link[^>]+rel=["']${escaped}["'][^>]+href=["']([^"']*)["'][^>]*>`, 'i')
  );
}

function jsonLdTypes(source) {
  const types = new Set();
  const scripts = source.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || [];

  for (const script of scripts) {
    const raw = script
      .replace(/^<script[^>]*>/i, '')
      .replace(/<\/script>$/i, '')
      .trim();

    try {
      const parsed = JSON.parse(raw);
      collectTypes(parsed, types);
    } catch {
      types.add('INVALID_JSON_LD');
    }
  }

  return [...types].sort();
}

function collectTypes(value, types) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const item of value) collectTypes(item, types);
    return;
  }

  const type = value['@type'];
  if (Array.isArray(type)) {
    for (const item of type) types.add(String(item));
  } else if (type) {
    types.add(String(type));
  }

  for (const nested of Object.values(value)) collectTypes(nested, types);
}

function hasPasswordPage(source, responseUrl) {
  return responseUrl.includes('/password') || /form[^>]+storefront_password/i.test(source);
}

function attrValue(tag, attr) {
  const escaped = attr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = tag.match(new RegExp(`${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return match ? decodeHtml(match[1] || match[2] || match[3] || '') : '';
}

function splitSetCookie(headerValue) {
  if (!headerValue) return [];
  return headerValue.split(/,(?=\s*[^;,\s]+=)/g).map((value) => value.trim()).filter(Boolean);
}

function createCookieJar() {
  const cookies = new Map();

  return {
    header() {
      return [...cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
    },
    store(headers) {
      const setCookies =
        typeof headers.getSetCookie === 'function'
          ? headers.getSetCookie()
          : splitSetCookie(headers.get('set-cookie'));

      for (const cookie of setCookies) {
        const [pair] = cookie.split(';');
        const equalsIndex = pair.indexOf('=');
        if (equalsIndex <= 0) continue;
        const name = pair.slice(0, equalsIndex).trim();
        const value = pair.slice(equalsIndex + 1).trim();
        if (name) cookies.set(name, value);
      }
    },
  };
}

function passwordForm(source, baseUrl) {
  const formMatch = source.match(/<form\b[^>]*(?:storefront_password|\/password)[^>]*>[\s\S]*?<\/form>/i);
  if (!formMatch) return null;

  const formHtml = formMatch[0];
  const openingTag = formHtml.match(/<form\b[^>]*>/i)?.[0] || '';
  const action = attrValue(openingTag, 'action') || '/password';
  const fields = new URLSearchParams();

  for (const inputMatch of formHtml.matchAll(/<input\b[^>]*>/gi)) {
    const input = inputMatch[0];
    const name = attrValue(input, 'name');
    if (!name) continue;
    fields.set(name, attrValue(input, 'value'));
  }

  if (!fields.has('form_type')) fields.set('form_type', 'storefront_password');

  return {
    action: new URL(action, baseUrl).href,
    fields,
  };
}

function routeUrl(route, storeUrl, previewThemeId) {
  const url = new URL(route, storeUrl);
  if (previewThemeId) url.searchParams.set('preview_theme_id', previewThemeId);
  return url.href;
}

async function fetchText(url, options = {}) {
  const jar = options.jar;
  let currentUrl = url;
  let method = options.method || 'GET';
  let body = options.body;
  let response;

  for (let redirectCount = 0; redirectCount < 8; redirectCount += 1) {
    const headers = {
      'user-agent': 'PatriotPhoneSEOAudit/1.0',
      accept: 'text/html,application/xml,text/plain;q=0.9,*/*;q=0.8',
      ...(options.headers || {}),
    };

    const cookieHeader = jar && jar.header();
    if (cookieHeader) headers.cookie = cookieHeader;

    response = await fetch(currentUrl, {
      method,
      body,
      headers,
      redirect: 'manual',
    });

    if (jar) jar.store(response.headers);

    if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
      currentUrl = new URL(response.headers.get('location'), currentUrl).href;
      method = 'GET';
      body = undefined;
      delete headers['content-type'];
      continue;
    }

    break;
  }

  const responseBody = await response.text();
  return {
    url,
    finalUrl: response.url || currentUrl,
    status: response.status,
    ok: response.ok,
    contentType: response.headers.get('content-type') || '',
    body: responseBody,
  };
}

async function unlockStorefront(storeUrl, password, jar) {
  const auth = {
    storefrontPasswordProvided: Boolean(password),
    storefrontPasswordLength: password ? password.length : 0,
    passwordStoredInProof: false,
    attempted: false,
    unlocked: false,
    status: null,
    finalUrl: null,
    failure: null,
  };

  if (!password) return auth;

  auth.attempted = true;
  const passwordPage = await fetchText(new URL('/password', storeUrl).href, { jar });
  const form = passwordForm(passwordPage.body, passwordPage.finalUrl);
  if (!form) {
    auth.failure = 'password form not found';
    auth.status = passwordPage.status;
    auth.finalUrl = passwordPage.finalUrl;
    return auth;
  }

  form.fields.set('password', password);

  const submission = await fetchText(form.action, {
    jar,
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      referer: passwordPage.finalUrl,
    },
    body: form.fields,
  });

  auth.status = submission.status;
  auth.finalUrl = submission.finalUrl;
  auth.unlocked = submission.ok && !hasPasswordPage(submission.body, submission.finalUrl);
  if (!auth.unlocked) auth.failure = 'password submission did not unlock storefront';
  return auth;
}

function routeRequirements(route) {
  const requirements = ['title', 'description', 'canonical', 'og:title', 'og:description', 'twitter:card'];
  if (route === '/') requirements.push('Organization', 'WebSite');
  if (route.startsWith('/products/')) requirements.push('Product');
  if (route === '/pages/faq') requirements.push('FAQPage');
  return requirements;
}

function auditRoute(route, fetchResult) {
  const source = fetchResult.body;
  const data = {
    route,
    requestedUrl: fetchResult.url,
    finalUrl: fetchResult.finalUrl,
    status: fetchResult.status,
    contentType: fetchResult.contentType,
    passwordPage: hasPasswordPage(source, fetchResult.finalUrl),
    title: textBetween(source, /<title[^>]*>([\s\S]*?)<\/title>/i),
    description: metaContent(source, 'description'),
    canonical: linkHref(source, 'canonical'),
    ogTitle: metaContent(source, 'og:title'),
    ogDescription: metaContent(source, 'og:description'),
    twitterCard: metaContent(source, 'twitter:card'),
    jsonLdTypes: jsonLdTypes(source),
    failures: [],
  };

  if (!fetchResult.ok) data.failures.push(`HTTP ${fetchResult.status}`);
  if (data.passwordPage) data.failures.push('password page returned instead of storefront route');

  for (const requirement of routeRequirements(route)) {
    if (requirement === 'title' && !data.title) data.failures.push('missing title');
    if (requirement === 'description' && !data.description) data.failures.push('missing meta description');
    if (requirement === 'canonical' && !data.canonical) data.failures.push('missing canonical');
    if (requirement === 'og:title' && !data.ogTitle) data.failures.push('missing og:title');
    if (requirement === 'og:description' && !data.ogDescription) data.failures.push('missing og:description');
    if (requirement === 'twitter:card' && !data.twitterCard) data.failures.push('missing twitter:card');
    if (['Organization', 'WebSite', 'Product', 'FAQPage'].includes(requirement) && !data.jsonLdTypes.includes(requirement)) {
      data.failures.push(`missing ${requirement} JSON-LD`);
    }
  }

  return data;
}

function llmsUrl(route, llmsBaseUrl) {
  return new URL(route, llmsBaseUrl).href;
}

function auditLlmsRoute(routeConfig, fetchResult) {
  const source = fetchResult.body;
  const data = {
    route: routeConfig.route,
    requestedUrl: fetchResult.url,
    finalUrl: fetchResult.finalUrl,
    status: fetchResult.status,
    contentType: fetchResult.contentType,
    startsWithMarkdownHeading: /^#\s+/m.test(source),
    containsHtmlShell: /<html\b|<!doctype html/i.test(source),
    failures: [],
  };

  if (!fetchResult.ok) data.failures.push(`HTTP ${fetchResult.status}`);
  if (!/text\/plain/i.test(data.contentType)) data.failures.push('content type is not text/plain');
  if (!data.startsWithMarkdownHeading) data.failures.push('body does not start with a Markdown heading');
  if (data.containsHtmlShell) data.failures.push('HTML storefront shell returned instead of raw Markdown');

  for (const requiredText of routeConfig.requiredText) {
    if (!source.includes(requiredText)) data.failures.push(`missing expected text: ${requiredText}`);
  }

  return data;
}

async function main() {
  const storeUrl = normalizeStoreUrl(process.env.SHOPIFY_STORE_URL || process.env.SHOPIFY_STORE);
  const llmsBaseUrl = normalizeStoreUrl(process.env.LLMS_BASE_URL || process.env.SHOPIFY_STORE_URL || process.env.SHOPIFY_STORE);
  const previewThemeId = process.env.SHOPIFY_PREVIEW_THEME_ID || '';
  const storefrontPassword = process.env.SHOPIFY_STOREFRONT_PASSWORD || '';
  if (!storeUrl) {
    usage();
    process.exit(2);
  }

  const jar = createCookieJar();
  const auth = await unlockStorefront(storeUrl, storefrontPassword, jar);
  const routes = [];
  const failures = [];
  if (auth.failure) failures.push(`/password: ${auth.failure}`);

  for (const route of requiredRoutes) {
    const url = routeUrl(route, storeUrl, previewThemeId);
    const result = await fetchText(url, { jar });
    const audit = auditRoute(route, result);
    routes.push(audit);
    failures.push(...audit.failures.map((failure) => `${route}: ${failure}`));
  }

  const sitemap = await fetchText(new URL('/sitemap.xml', storeUrl).href, { jar });
  const robots = await fetchText(new URL('/robots.txt', storeUrl).href, { jar });
  const llms = [];

  for (const routeConfig of requiredLlmsRoutes) {
    const result = await fetchText(llmsUrl(routeConfig.route, llmsBaseUrl), { jar });
    const audit = auditLlmsRoute(routeConfig, result);
    llms.push(audit);
    failures.push(...audit.failures.map((failure) => `${routeConfig.route}: ${failure}`));
  }

  const platform = {
    sitemap: {
      url: sitemap.url,
      finalUrl: sitemap.finalUrl,
      status: sitemap.status,
      contentType: sitemap.contentType,
      includesProducts: sitemap.body.includes('/products/'),
      includesPages: sitemap.body.includes('/pages/'),
      failures: [],
    },
    robots: {
      url: robots.url,
      finalUrl: robots.finalUrl,
      status: robots.status,
      contentType: robots.contentType,
      includesSitemap: /Sitemap:/i.test(robots.body),
      failures: [],
    },
    llms: {
      baseUrl: llmsBaseUrl.origin,
      routes: llms,
      failures: llms.flatMap((audit) => audit.failures.map((failure) => `${audit.route}: ${failure}`)),
    },
  };

  if (!sitemap.ok) platform.sitemap.failures.push(`HTTP ${sitemap.status}`);
  if (!platform.sitemap.includesProducts) platform.sitemap.failures.push('sitemap missing product URLs');
  if (!platform.sitemap.includesPages) platform.sitemap.failures.push('sitemap missing page URLs');
  if (!robots.ok) platform.robots.failures.push(`HTTP ${robots.status}`);
  if (!platform.robots.includesSitemap) platform.robots.failures.push('robots missing Sitemap directive');

  failures.push(...platform.sitemap.failures.map((failure) => `/sitemap.xml: ${failure}`));
  failures.push(...platform.robots.failures.map((failure) => `/robots.txt: ${failure}`));

  const report = {
    storeUrl: storeUrl.origin,
    previewThemeId: previewThemeId || null,
    auth,
    generatedAt: new Date().toISOString(),
    routes,
    platform,
    failures,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

  console.log(`SEO ops audit wrote ${path.relative(root, outputPath)}`);
  console.log(`Routes checked: ${routes.length}`);
  console.log(`LLMS routes checked: ${llms.length}`);
  if (auth.attempted) console.log(`Password unlock attempted: ${auth.unlocked ? 'yes' : 'no'}`);
  console.log(`Failures: ${failures.length}`);

  if (failures.length > 0) {
    for (const failure of failures) console.error(`FAIL ${failure}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
