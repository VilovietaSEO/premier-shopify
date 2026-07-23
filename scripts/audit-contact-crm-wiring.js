#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const defaultOutputPath = path.join(root, 'tmp', 'shopify-live-proof', 'contact-crm-wiring-audit.json');

function usage() {
  console.error('Usage: CONTACT_CRM_HTML=/path/to/contact-page.html npm run contact:crm:audit');
  console.error('Or: CONTACT_CRM_URL=https://STORE.myshopify.com/pages/contact npm run contact:crm:audit');
  console.error('Or: SHOPIFY_STORE_URL=https://STORE.myshopify.com npm run contact:crm:audit');
  console.error('Optional: CONTACT_CRM_EXPECTED_ENDPOINT=https://ops.example.com/crm/capture');
  console.error('Optional: SHOPIFY_PREVIEW_THEME_ID=12345');
  console.error('Optional: SHOPIFY_STOREFRONT_PASSWORD=... (not stored in proof output)');
  console.error('Optional: CONTACT_CRM_OUTPUT=/absolute/path/contact-crm-wiring-audit.json');
}

function normalizeUrl(value) {
  if (!value) return null;
  const withProtocol = /^https?:\/\//.test(value) ? value : `https://${value}`;
  return new URL(withProtocol);
}

function attrValue(tag, attr) {
  const escaped = attr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = tag.match(new RegExp(`${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return match ? (match[1] || match[2] || match[3] || '') : '';
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

function hasPasswordPage(source, responseUrl) {
  return responseUrl.includes('/password') || /form[^>]+storefront_password/i.test(source);
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

async function fetchText(url, options = {}) {
  const jar = options.jar;
  let currentUrl = url;
  let method = options.method || 'GET';
  let body = options.body;
  let response;

  for (let redirectCount = 0; redirectCount < 8; redirectCount += 1) {
    const headers = {
      'user-agent': 'PatriotPhoneContactCrmAudit/1.0',
      accept: 'text/html,*/*;q=0.8',
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

async function unlockStorefront(storeUrl, password, jar, fetcher = fetchText) {
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
  const passwordPage = await fetcher(new URL('/password', storeUrl).href, { jar });
  const form = passwordForm(passwordPage.body, passwordPage.finalUrl);
  if (!form) {
    auth.failure = 'password form not found';
    auth.status = passwordPage.status;
    auth.finalUrl = passwordPage.finalUrl;
    return auth;
  }

  form.fields.set('password', password);

  const submission = await fetcher(form.action, {
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

function findCrmForm(html) {
  const forms = html.match(/<form\b[\s\S]*?<\/form>/gi) || [];
  for (const form of forms) {
    const openingTag = form.match(/<form\b[^>]*>/i)?.[0] || '';
    if (/data-crm-capture\s*=\s*["']true["']/i.test(openingTag)) {
      return {
        html: form,
        action: attrValue(openingTag, 'action'),
        method: attrValue(openingTag, 'method'),
      };
    }
  }
  return null;
}

function controlTag(formHtml, field) {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = formHtml.match(new RegExp(`<(?:input|textarea)\\b[^>]*\\bname\\s*=\\s*["']${escaped}["'][^>]*>`, 'i'));
  return match ? match[0] : '';
}

function hasRequiredAttribute(tag) {
  return /(?:^|\s)required(?:\s|=|>|$)/i.test(tag);
}

function auditHtml(html, options = {}) {
  const expectedEndpoint = options.expectedEndpoint || '';
  const failures = [];
  const form = findCrmForm(html);

  if (!form) {
    failures.push('contact page does not render a data-crm-capture form');
  }

  const formHtml = form?.html || '';
  const action = form?.action || '';
  const method = form?.method || '';

  if (form && method.toLowerCase() !== 'post') failures.push(`CRM form method is ${method || '(blank)'}, expected post`);
  if (form && !/^https:\/\//i.test(action)) failures.push(`CRM form action is not an https URL: ${action || '(blank)'}`);
  if (form && !/\/crm\/capture(?:$|\?)/i.test(action)) failures.push(`CRM form action does not point to /crm/capture: ${action || '(blank)'}`);
  if (expectedEndpoint && action !== expectedEndpoint) {
    failures.push(`CRM form action ${action || '(blank)'} does not match expected endpoint ${expectedEndpoint}`);
  }

  const requiredProvenanceFields = [
    'crm[record_type]',
    'crm[source_type]',
    'crm[lead_type]',
    'crm[tags]',
    'crm[source_url]',
    'crm[source_path]',
    'crm[referrer]',
    'crm[utm_source]',
    'crm[utm_medium]',
    'crm[utm_campaign]',
    'crm[return_to]',
  ];
  const requiredVisibleFields = [
    'contact[name]',
    'contact[email]',
    'contact[phone]',
    'contact[body]',
  ];
  const retiredVisibleFields = [
    'contact[Child age range]',
    'contact[Main use case]',
    'contact[Interested product]',
    'contact[Preferred service plan]',
    'contact[Patriot Package interest]',
    'contact[Selected add-ons]',
    'contact[Marketing opt-in]',
    'contact[Privacy and terms consent]',
  ];

  for (const field of [...requiredProvenanceFields, ...requiredVisibleFields]) {
    const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!new RegExp(`name\\s*=\\s*["']${escaped}["']`, 'i').test(formHtml)) {
      failures.push(`missing form field ${field}`);
    }
  }

  const nameField = controlTag(formHtml, 'contact[name]');
  const emailField = controlTag(formHtml, 'contact[email]');
  const phoneField = controlTag(formHtml, 'contact[phone]');
  const messageField = controlTag(formHtml, 'contact[body]');
  if (nameField && (!/type\s*=\s*["']text["']/i.test(nameField) || !hasRequiredAttribute(nameField))) {
    failures.push('Name must be a required text field');
  }
  if (emailField && (!/type\s*=\s*["']email["']/i.test(emailField) || !hasRequiredAttribute(emailField))) {
    failures.push('Email must be a required email field');
  }
  if (phoneField && (!/type\s*=\s*["']tel["']/i.test(phoneField) || hasRequiredAttribute(phoneField))) {
    failures.push('Phone Number must be an optional telephone field');
  }
  if (messageField && (!/^<textarea\b/i.test(messageField) || !hasRequiredAttribute(messageField))) {
    failures.push('How can we Help? must be a required textarea');
  }

  for (const field of retiredVisibleFields) {
    const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`name\\s*=\\s*["']${escaped}["']`, 'i').test(formHtml)) {
      failures.push(`retired visible field ${field} is present`);
    }
  }

  for (const controlMatch of formHtml.matchAll(/<(?:input|select|textarea)\b[^>]*>/gi)) {
    const tag = controlMatch[0];
    const field = attrValue(tag, 'name');
    if (
      field.startsWith('contact[') &&
      !requiredVisibleFields.includes(field) &&
      !retiredVisibleFields.includes(field) &&
      !/type\s*=\s*["']hidden["']/i.test(tag)
    ) {
      failures.push(`unexpected visible contact field ${field}`);
    }
  }

  if (!/company_website/i.test(formHtml)) failures.push('honeypot field company_website is missing');
  if (!/<label\b[^>]*>\s*Name\s*<\/label>/i.test(formHtml)) failures.push('Name label is missing');
  if (!/<label\b[^>]*>\s*Email\s*<\/label>/i.test(formHtml)) failures.push('Email label is missing');
  if (!/<label\b[^>]*>\s*Phone Number\s*<\/label>/i.test(formHtml)) failures.push('Phone Number label is missing');
  if (!/<label\b[^>]*>\s*How can we Help\?\s*<\/label>/i.test(formHtml)) failures.push('How can we Help? label is missing');
  if (!/<button\b[^>]*type\s*=\s*["']submit["'][^>]*>\s*Send\s*<\/button>/i.test(formHtml)) {
    failures.push('Send submit button is missing');
  }
  if (/<a\b[^>]*>\s*(?:Privacy Policy|Terms(?: and Conditions)?)\s*<\/a>/i.test(formHtml)) {
    failures.push('policy link is present in the contact form');
  }
  if (/patriot/i.test(formHtml)) failures.push('Patriot reference is present in the contact form');

  return {
    status: failures.length > 0 ? 'fail' : 'pass',
    crmFormFound: Boolean(form),
    formAction: action,
    formMethod: method,
    expectedEndpoint: expectedEndpoint || null,
    requiredFieldCount: requiredProvenanceFields.length + requiredVisibleFields.length,
    failures,
  };
}

function contactUrlFromOptions(options = {}) {
  const explicitUrl = normalizeUrl(options.contactUrl || process.env.CONTACT_CRM_URL || '');
  if (explicitUrl) return explicitUrl;

  const storeUrl = normalizeUrl(options.storeUrl || process.env.SHOPIFY_STORE_URL || process.env.SHOPIFY_STORE || '');
  if (!storeUrl) return null;
  return new URL(options.contactRoute || process.env.CONTACT_CRM_ROUTE || '/pages/contact', storeUrl);
}

async function loadContactHtml(options = {}) {
  const htmlPath = options.htmlPath || process.env.CONTACT_CRM_HTML || '';
  if (options.html) {
    return {
      sourceType: 'provided-html',
      htmlPath: null,
      contactUrl: null,
      fetch: null,
      auth: null,
      html: options.html,
    };
  }

  if (htmlPath) {
    return {
      sourceType: 'file',
      htmlPath,
      contactUrl: null,
      fetch: null,
      auth: null,
      html: fs.readFileSync(htmlPath, 'utf8'),
    };
  }

  const contactUrl = contactUrlFromOptions(options);
  if (!contactUrl) throw new Error('CONTACT_CRM_HTML, CONTACT_CRM_URL, or SHOPIFY_STORE_URL is required');

  const previewThemeId = options.previewThemeId || process.env.SHOPIFY_PREVIEW_THEME_ID || '';
  if (previewThemeId) contactUrl.searchParams.set('preview_theme_id', previewThemeId);
  const jar = options.jar || createCookieJar();
  const fetcher = options.fetchText || fetchText;
  const auth = await unlockStorefront(contactUrl.origin, options.storefrontPassword || process.env.SHOPIFY_STOREFRONT_PASSWORD || '', jar, fetcher);
  const result = await fetcher(contactUrl.href, { jar });

  return {
    sourceType: 'url',
    htmlPath: null,
    contactUrl: contactUrl.href,
    fetch: {
      requestedUrl: result.url,
      finalUrl: result.finalUrl,
      status: result.status,
      contentType: result.contentType,
      ok: result.ok,
      passwordPage: hasPasswordPage(result.body, result.finalUrl),
    },
    auth,
    html: result.body,
  };
}

async function runAudit(options = {}) {
  const outputPath = options.outputPath || process.env.CONTACT_CRM_OUTPUT || defaultOutputPath;
  const expectedEndpoint = options.expectedEndpoint || process.env.CONTACT_CRM_EXPECTED_ENDPOINT || '';
  const source = await loadContactHtml(options);
  const audit = auditHtml(source.html, { expectedEndpoint });
  const failures = [...audit.failures];

  if (source.fetch && !source.fetch.ok) failures.push(`contact page returned HTTP ${source.fetch.status}`);
  if (source.fetch?.passwordPage) failures.push('contact page returned the Shopify password page');
  if (source.auth?.failure) failures.push(`/password: ${source.auth.failure}`);

  const report = {
    generatedAt: new Date().toISOString(),
    sourceType: source.sourceType,
    htmlPath: source.htmlPath,
    contactUrl: source.contactUrl,
    fetch: source.fetch,
    auth: source.auth,
    ...audit,
    status: failures.length > 0 ? 'fail' : 'pass',
    failures,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  return report;
}

function main() {
  runAudit().then((report) => {
    console.log(`Contact CRM wiring audit wrote ${path.relative(root, process.env.CONTACT_CRM_OUTPUT || defaultOutputPath)}`);
    console.log(`Status: ${report.status}`);
    console.log(`CRM form found: ${report.crmFormFound ? 'yes' : 'no'}`);
    if (report.contactUrl) console.log(`Contact URL: ${report.contactUrl}`);
    if (report.auth?.attempted) console.log(`Password unlock attempted: ${report.auth.unlocked ? 'yes' : 'no'}`);
    console.log(`Failures: ${report.failures.length}`);
    if (report.failures.length > 0) {
      for (const failure of report.failures) console.error(`FAIL ${failure}`);
      process.exit(1);
    }
  }).catch((error) => {
    usage();
    console.error(error.message);
    process.exit(2);
  });
}

if (require.main === module) {
  main();
}

module.exports = {
  auditHtml,
  contactUrlFromOptions,
  createCookieJar,
  fetchText,
  findCrmForm,
  loadContactHtml,
  runAudit,
  unlockStorefront,
};
