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
      <input type="text" name="contact[name]" required>
      <input type="email" name="contact[email]" required>
      <input type="tel" name="contact[phone]">
      <select name="contact[Child age range]"></select>
      <select name="contact[Main use case]"></select>
      <select name="contact[Interested product]"></select>
      <select name="contact[Preferred service plan]"></select>
      <select name="contact[Patriot Package interest]"></select>
      <input type="checkbox" name="contact[Selected add-ons]" value="Voicemail to Email">
      <textarea name="contact[body]"></textarea>
      <input type="checkbox" name="contact[Marketing opt-in]" value="Yes">
      <input type="checkbox" name="contact[Privacy and terms consent]" value="Yes" required>
      <a href="/policies/privacy-policy">Privacy Policy</a>
      <a href="/policies/terms-of-service">Terms and Conditions</a>
    </form>
  </body>
</html>`;

const pass = auditHtml(crmHtml, { expectedEndpoint: endpoint });
assert.equal(pass.status, 'pass');
assert.equal(pass.crmFormFound, true);
assert.equal(pass.formAction, endpoint);
assert.equal(pass.failures.length, 0);

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
    previewThemeId: '150479208517',
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

  console.log('Contact CRM wiring proof passed: endpoint action, URL fetch, password unlock metadata, required fields, consent, and fallback failure verified.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
