#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { auditHtml, contactUrlFromOptions, runAudit } = require('./audit-contact-crm-wiring');

const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'tmp/contact-crm-wiring-test.html');
const outputPath = path.join(root, 'tmp/contact-crm-wiring-test.json');
const endpoint = 'https://ops.example.com/crm/capture';

const crmHtml = `<!doctype html>
<html>
  <body>
    <form method="post" action="${endpoint}" class="ip-contact-form" data-crm-capture="true">
      <input type="hidden" name="crm[record_type]" value="lead">
      <input type="hidden" name="crm[source_type]" value="contact_form">
      <input type="hidden" name="crm[lead_type]" value="contact_form">
      <input type="hidden" name="crm[tags]" value="lead,contact_form,product_interest">
      <input type="hidden" name="crm[source_url]" value="https://jordan-mark-premier.myshopify.com/pages/contact">
      <input type="hidden" name="crm[source_path]" value="/pages/contact">
      <input type="hidden" name="crm[referrer]" value="">
      <input type="hidden" name="crm[utm_source]" value="">
      <input type="hidden" name="crm[utm_medium]" value="">
      <input type="hidden" name="crm[utm_campaign]" value="">
      <input type="hidden" name="crm[return_to]" value="/pages/contact?crm=received">
      <input type="text" name="company_website" tabindex="-1">
      <label>Name</label>
      <input type="text" name="contact[name]" required>
      <label>Email</label>
      <input type="email" name="contact[email]" required>
      <label>Phone Number</label>
      <input type="tel" name="contact[phone]">
      <label>How can we Help?</label>
      <textarea name="contact[body]" required></textarea>
      <button type="submit">Send</button>
    </form>
  </body>
</html>`;

const pass = auditHtml(crmHtml, { expectedEndpoint: endpoint });
assert.equal(pass.status, 'pass');
assert.equal(pass.crmFormFound, true);
assert.equal(pass.formAction, endpoint);
assert.equal(pass.failures.length, 0);

const retiredField = auditHtml(crmHtml.replace(
  '<button type="submit">Send</button>',
  '<select name="contact[Interested product]"></select><button type="submit">Send</button>',
));
assert.equal(retiredField.status, 'fail');
assert.equal(retiredField.failures.some((failure) => /retired visible field contact\[Interested product\]/.test(failure)), true);

const unexpectedField = auditHtml(crmHtml.replace(
  '<button type="submit">Send</button>',
  '<input type="text" name="contact[Additional detail]"><button type="submit">Send</button>',
));
assert.equal(unexpectedField.status, 'fail');
assert.equal(unexpectedField.failures.some((failure) => /unexpected visible contact field contact\[Additional detail\]/.test(failure)), true);

const policyConsent = auditHtml(crmHtml.replace(
  '<button type="submit">Send</button>',
  '<input type="checkbox" name="contact[Privacy and terms consent]" required><a href="/policies/privacy-policy">Privacy Policy</a><button type="submit">Send</button>',
));
assert.equal(policyConsent.status, 'fail');
assert.equal(policyConsent.failures.some((failure) => /retired visible field contact\[Privacy and terms consent\]/.test(failure)), true);
assert.equal(policyConsent.failures.some((failure) => /policy link is present/.test(failure)), true);

const patriotReference = auditHtml(crmHtml.replace(
  '<button type="submit">Send</button>',
  '<p>Patriot Package</p><button type="submit">Send</button>',
));
assert.equal(patriotReference.status, 'fail');
assert.equal(patriotReference.failures.some((failure) => /Patriot reference/.test(failure)), true);

const wrongEndpoint = auditHtml(crmHtml, { expectedEndpoint: 'https://ops.example.com/wrong' });
assert.equal(wrongEndpoint.status, 'fail');
assert.equal(wrongEndpoint.failures.some((failure) => /does not match expected endpoint/.test(failure)), true);

const nativeFallback = auditHtml('<form method="post" action="/contact#contact_form"><input name="contact[name]"></form>');
assert.equal(nativeFallback.status, 'fail');
assert.equal(nativeFallback.failures.some((failure) => /data-crm-capture/.test(failure)), true);

fs.writeFileSync(htmlPath, crmHtml);
async function main() {
  const report = await runAudit({
    htmlPath,
    outputPath,
    expectedEndpoint: endpoint,
  });
  assert.equal(report.status, 'pass');
  assert.equal(report.sourceType, 'file');
  assert.equal(JSON.parse(fs.readFileSync(outputPath, 'utf8')).status, 'pass');

  const contactUrl = contactUrlFromOptions({
    storeUrl: 'https://jordan-mark-premier.myshopify.com',
    previewThemeId: '151553245253',
  });
  assert.equal(contactUrl.href, 'https://jordan-mark-premier.myshopify.com/pages/contact');

  const urlReport = await runAudit({
    contactUrl: 'https://jordan-mark-premier.myshopify.com/pages/contact',
    expectedEndpoint: endpoint,
    fetchText: async (url) => ({
      url,
      finalUrl: url,
      status: 200,
      ok: true,
      contentType: 'text/html; charset=utf-8',
      body: crmHtml,
    }),
  });
  assert.equal(urlReport.status, 'pass');
  assert.equal(urlReport.sourceType, 'url');
  assert.equal(urlReport.fetch.status, 200);
  assert.equal(urlReport.auth.passwordStoredInProof, false);

  const passwordReport = await runAudit({
    contactUrl: 'https://jordan-mark-premier.myshopify.com/pages/contact',
    expectedEndpoint: endpoint,
    storefrontPassword: 'secret-password',
    fetchText: async (url, options = {}) => {
      if (url.endsWith('/password') && !options.method) {
        return {
          url,
          finalUrl: url,
          status: 200,
          ok: true,
          contentType: 'text/html; charset=utf-8',
          body: '<form method="post" action="/password"><input name="form_type" value="storefront_password"></form>',
        };
      }
      return {
        url,
        finalUrl: options.method === 'POST' ? 'https://jordan-mark-premier.myshopify.com/' : url,
        status: 200,
        ok: true,
        contentType: 'text/html; charset=utf-8',
        body: crmHtml,
      };
    },
  });
  assert.equal(passwordReport.status, 'pass');
  assert.equal(passwordReport.auth.attempted, true);
  assert.equal(passwordReport.auth.unlocked, true);
  assert.equal(passwordReport.auth.storefrontPasswordLength, 'secret-password'.length);
  assert.equal(JSON.stringify(passwordReport).includes('secret-password'), false);

  console.log('Contact CRM wiring proof passed: simplified visible fields, endpoint action, URL fetch, password unlock metadata, provenance, retired-field rejection, and fallback failure verified.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
