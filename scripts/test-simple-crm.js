#!/usr/bin/env node

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {
  MemoryRateLimiter,
  createCheckoutHandoffRecord,
  createOrderCrmRecord,
  createSubmissionRecord,
  createWebhookSignature,
  dispatchRecordWebhooks,
  parseWebhookUrls,
  readSubmissions,
  recordForWebhook,
  renderViewer,
  safeRedirectLocation,
  saveCheckoutHandoffToCrm,
  saveOrderRowsToCrm,
  saveSubmission,
  saleTypeForSetupRow,
  submissionsToCsv,
  validateCheckoutHandoff,
  verifyShopifyWebhook,
} = require('../crm/simple-crm');

const root = path.resolve(__dirname, '..');
const storagePath = path.join(root, 'tmp/simple-crm-test-submissions.jsonl');
fs.rmSync(storagePath, { force: true });

const sampleLead = new URLSearchParams();
sampleLead.set('crm[source_url]', 'https://jordan-mark-premier.myshopify.com/pages/contact?utm_source=newsletter&utm_medium=email&utm_campaign=launch');
sampleLead.set('crm[record_type]', 'lead');
sampleLead.set('crm[source_type]', 'contact_form');
sampleLead.set('crm[lead_type]', 'contact_form');
sampleLead.set('crm[tags]', 'lead,contact_form,product_interest');
sampleLead.set('crm[source_path]', '/pages/contact');
sampleLead.set('crm[referrer]', 'https://example.com/referral');
sampleLead.set('contact[name]', 'QA Parent');
sampleLead.set('contact[email]', 'qa.parent@example.com');
sampleLead.set('contact[phone]', '555-0100');
sampleLead.set('contact[Child age range]', '11-13');
sampleLead.set('contact[Main use case]', 'School or bus days');
sampleLead.set('contact[Interested product]', 'Rugged Phone');
sampleLead.set('contact[Preferred service plan]', 'Annual service - $200/yr');
sampleLead.set('contact[Patriot Package interest]', 'Interested in Patriot Package');
sampleLead.append('contact[Selected add-ons]', 'Call Recording');
sampleLead.append('contact[Selected add-ons]', 'Voicemail to Email');
sampleLead.set('contact[body]', 'Need setup help and package pricing confirmation.');
sampleLead.set('contact[Marketing opt-in]', 'Yes');
sampleLead.set('contact[Privacy and terms consent]', 'Yes');
sampleLead.set('crm[return_to]', '/pages/contact?crm=received');

const result = saveSubmission(sampleLead, {
  storagePath,
  timeZone: 'America/Denver',
  now: '2026-06-30T20:15:00.000Z',
  ip: '203.0.113.10',
  userAgent: 'simple-crm-test',
});

assert.equal(result.saved, true);
assert.equal(result.errors.length, 0);
assert.match(result.record.submitted_at, /^2026-06-30T20:15:00\.000Z$/);
assert.equal(result.record.submitted_at_store_timezone.includes('2026'), true);
assert.equal(result.record.fields.recordType, 'lead');
assert.equal(result.record.fields.sourceType, 'contact_form');
assert.equal(result.record.fields.leadType, 'contact_form');
assert.deepEqual(result.record.fields.tags, ['lead', 'contact_form', 'product_interest']);
assert.equal(result.record.fields.name, 'QA Parent');
assert.equal(result.record.fields.email, 'qa.parent@example.com');
assert.equal(result.record.fields.phone, '555-0100');
assert.equal(result.record.fields.ageRange, '11-13');
assert.equal(result.record.fields.useCase, 'School or bus days');
assert.equal(result.record.fields.interestedProduct, 'Rugged Phone');
assert.equal(result.record.fields.preferredPlan, 'Annual service - $200/yr');
assert.equal(result.record.fields.patriotPackageInterest, 'Interested in Patriot Package');
assert.deepEqual(result.record.fields.selectedAddons, ['Call Recording', 'Voicemail to Email']);
assert.equal(result.record.fields.message, 'Need setup help and package pricing confirmation.');
assert.equal(result.record.fields.marketingOptIn, true);
assert.equal(result.record.fields.privacyTermsConsent, true);
assert.equal(result.record.fields.utmSource, 'newsletter');
assert.equal(result.record.fields.utmMedium, 'email');
assert.equal(result.record.fields.utmCampaign, 'launch');
assert.equal(result.record.form_fields['contact[Main use case]'], 'School or bus days');

const records = readSubmissions(storagePath);
assert.equal(records.length, 1);

const csv = submissionsToCsv(records);
assert.match(csv, /submitted_at_store_timezone/);
assert.match(csv, /record_type,source_type,lead_type,sale_type,tags,order_id,order_name/);
assert.match(csv, /time_zone,source_url,source_path,return_to,referrer/);
assert.match(csv, /raw_form_fields_json,meta_json/);
assert.match(csv, /QA Parent/);
assert.match(csv, /Rugged Phone/);
assert.match(csv, /Call Recording; Voicemail to Email/);
assert.match(csv, /newsletter/);
assert.match(csv, /contact\[Main use case\]/);
assert.match(csv, /simple-crm-test/);

const viewer = renderViewer(records);
assert.match(viewer, /CRM Leads/);
assert.match(viewer, /contact_form/);
assert.match(viewer, /QA Parent/);
assert.match(viewer, /Export CSV/);
assert.match(viewer, /Total records/);
assert.match(viewer, /Leads/);
assert.match(viewer, /Sales/);
assert.match(viewer, /View details/);
assert.match(viewer, /Normalized fields/);
assert.match(viewer, /Raw submitted fields/);
assert.match(viewer, /contact\[Main use case\]/);
assert.match(viewer, /Metadata/);

const saleRow = {
  order_id: 'gid://shopify/Order/1002',
  order_name: '#1002',
  created_at: '2026-06-30T21:10:00-06:00',
  customer_email: 'rugged.parent@example.com',
  financial_status: 'PAID',
  fulfillment_status: 'UNFULFILLED',
  line_item_title: 'Classic Phone',
  sku: 'PP-CLASSIC-PHONE',
  quantity: 1,
  phone: 'Classic Phone - $100',
  service_plan: 'Annual service - $200/yr (saves $13.12/yr)',
  patriot_package: 'Patriot Package - $250; Classic Phone, 1 year phone service, and all 4 add-ons (saves $303.12)',
  add_on_bundle: 'Add-on Bundle - $10/mo; includes Call Recording, Quiet Hours, Voicemail to Email, and Auto Attendant (saves $10/mo)',
  call_recording: 'Included in Patriot Package',
  family_quiet_hours: 'Included in Patriot Package',
  voicemail_to_email: 'Included in Patriot Package',
  auto_attendant: 'Included in Patriot Package',
  policy_agreement: 'Agreed to Privacy Policy and Terms and Conditions',
  setup_summary: 'Classic Patriot Package setup',
  all_properties_json: '{}',
};
assert.equal(saleTypeForSetupRow(saleRow), 'classic_patriot_package_sale');
const saleRecord = createOrderCrmRecord(saleRow, {
  timeZone: 'America/Denver',
  now: '2026-06-30T21:10:00.000Z',
});
assert.equal(saleRecord.fields.recordType, 'sale');
assert.equal(saleRecord.fields.sourceType, 'shopify_order');
assert.equal(saleRecord.fields.saleType, 'classic_patriot_package_sale');
assert.equal(saleRecord.fields.orderName, '#1002');
assert.equal(saleRecord.fields.email, 'rugged.parent@example.com');
assert.equal(saleRecord.fields.tags.includes('patriot-package'), true);
assert.equal(saleRecord.fields.privacyTermsConsent, true);

const importResult = saveOrderRowsToCrm([saleRow], {
  storagePath,
  timeZone: 'America/Denver',
  now: '2026-06-30T21:10:00.000Z',
});
assert.equal(importResult.imported, 1);
assert.equal(importResult.skipped, 0);
const duplicateImport = saveOrderRowsToCrm([saleRow], {
  storagePath,
  timeZone: 'America/Denver',
  now: '2026-06-30T21:11:00.000Z',
});
assert.equal(duplicateImport.imported, 0);
assert.equal(duplicateImport.skipped, 1);

const recordsWithSale = readSubmissions(storagePath);
assert.equal(recordsWithSale.length, 2);
const saleCsv = submissionsToCsv(recordsWithSale);
assert.match(saleCsv, /classic_patriot_package_sale/);
assert.match(saleCsv, /shopify_order/);
assert.match(saleCsv, /#1002/);
const viewerWithSale = renderViewer(recordsWithSale);
assert.match(viewerWithSale, /sale/);
assert.match(viewerWithSale, /classic_patriot_package_sale/);
assert.match(viewerWithSale, /financial_status/);
assert.match(viewerWithSale, /<strong>2<\/strong><span>Total records<\/span>/);
assert.match(viewerWithSale, /<strong>1<\/strong><span>Leads<\/span>/);
assert.match(viewerWithSale, /<strong>1<\/strong><span>Sales<\/span>/);

const checkoutPayload = {
  schema: 'independence_phone.revio_checkout.v1',
  source: 'shopify-theme-cart',
  occurred_at: '2026-06-30T21:20:00.000Z',
  source_url: 'https://jordan-mark-premier.myshopify.com/cart',
  consent: {
    privacy_terms_accepted: true,
    policy_agreement: 'Agreed to Privacy Policy and Terms and Conditions',
  },
  cart: {
    token: 'cart-token-1',
    currency: 'USD',
    item_count: 1,
    total_price_cents: 30000,
  },
  setup_count: 1,
  setups: [
    {
      setup_id: 'setup-1',
      quantity: 1,
      lines: [
        {
          role: 'phone',
          setup_id: 'setup-1',
          title: 'Classic Phone',
          shopify_variant_id: 111,
          quantity: 1,
          unit_price_cents: 10000,
        },
        {
          role: 'service',
          setup_id: 'setup-1',
          setup_parent: true,
          setup_billing_name: 'Service plan',
          setup_billing_value: 'Annual service - $200/yr',
          title: 'Annual service',
          shopify_variant_id: 222,
          quantity: 1,
          unit_price_cents: 20000,
        },
      ],
    },
  ],
  lines: [],
};
checkoutPayload.lines = checkoutPayload.setups[0].lines;

assert.deepEqual(validateCheckoutHandoff(checkoutPayload), []);
assert.match(validateCheckoutHandoff({
  ...checkoutPayload,
  consent: { privacy_terms_accepted: false },
}).join(','), /privacy and terms/);

const checkoutRecord = createCheckoutHandoffRecord(checkoutPayload, {
  timeZone: 'America/Denver',
  now: '2026-06-30T21:20:00.000Z',
});
assert.equal(checkoutRecord.fields.recordType, 'sale');
assert.equal(checkoutRecord.fields.sourceType, 'revio_checkout_handoff');
assert.equal(checkoutRecord.fields.saleType, 'classic_phone_checkout');
assert.equal(checkoutRecord.fields.interestedProduct, 'Classic Phone');
assert.equal(checkoutRecord.fields.preferredPlan, 'Annual service - $200/yr');
assert.equal(checkoutRecord.fields.privacyTermsConsent, true);
assert.equal(checkoutRecord.meta.cart_token, 'cart-token-1');
assert.deepEqual(checkoutRecord.meta.setup_ids, ['setup-1']);
assert.equal(recordForWebhook(checkoutRecord).revio_checkout_payload.schema, 'independence_phone.revio_checkout.v1');

const checkoutSave = saveCheckoutHandoffToCrm(checkoutPayload, {
  storagePath,
  timeZone: 'America/Denver',
  now: '2026-06-30T21:20:00.000Z',
});
assert.equal(checkoutSave.saved, true);
assert.equal(checkoutSave.record.fields.sourceType, 'revio_checkout_handoff');
const duplicateCheckoutSave = saveCheckoutHandoffToCrm(checkoutPayload, {
  storagePath,
  timeZone: 'America/Denver',
  now: '2026-06-30T21:21:00.000Z',
});
assert.equal(duplicateCheckoutSave.saved, false);
assert.equal(duplicateCheckoutSave.skipped, true);

const tokenViewer = renderViewer(records, { exportToken: 'staff-token' });
assert.match(tokenViewer, /\/crm\/leads\.csv\?token=staff-token/);

assert.equal(
  safeRedirectLocation('/pages/contact?crm=received', result.record.fields.sourceUrl),
  'https://jordan-mark-premier.myshopify.com/pages/contact?crm=received'
);
assert.equal(
  safeRedirectLocation('https://jordan-mark-premier.myshopify.com/pages/contact?crm=received', result.record.fields.sourceUrl),
  'https://jordan-mark-premier.myshopify.com/pages/contact?crm=received'
);
assert.equal(
  safeRedirectLocation('https://evil.example/phish', result.record.fields.sourceUrl),
  'https://jordan-mark-premier.myshopify.com/'
);
assert.equal(
  safeRedirectLocation('//evil.example/phish', result.record.fields.sourceUrl),
  'https://jordan-mark-premier.myshopify.com/'
);

const spam = createSubmissionRecord(new URLSearchParams([
  ['company_website', 'https://spam.example'],
  ['contact[name]', 'Spam Bot'],
  ['contact[email]', 'spam@example.com'],
  ['contact[body]', 'spam'],
  ['contact[Privacy and terms consent]', 'Yes'],
]));
assert.equal(spam.record.spam, true);
assert.equal(spam.errors.includes('honeypot field was completed'), true);

const limiter = new MemoryRateLimiter({ limit: 2, windowMs: 60_000 });
assert.equal(limiter.check('203.0.113.10', 1000), true);
assert.equal(limiter.check('203.0.113.10', 2000), true);
assert.equal(limiter.check('203.0.113.10', 3000), false);

const webhookBody = Buffer.from(JSON.stringify({ id: 9001, name: '#9001' }));
const webhookSecret = 'shopify-webhook-secret';
const webhookSignature = crypto.createHmac('sha256', webhookSecret).update(webhookBody).digest('base64');
assert.equal(verifyShopifyWebhook(webhookBody, webhookSignature, webhookSecret), true);
assert.equal(verifyShopifyWebhook(webhookBody, 'bad-signature', webhookSecret), false);

async function testOutboundWebhooks() {
  assert.deepEqual(parseWebhookUrls('https://hooks.example/lead,\nhttps://backup.example/lead'), [
    'https://hooks.example/lead',
    'https://backup.example/lead',
  ]);
  assert.throws(() => parseWebhookUrls('ftp://hooks.example/lead'), /Webhook URL must be http or https/);

  const payloadBody = JSON.stringify({ event: 'crm.test', record: { id: 'record-1' } });
  const outboundSecret = 'outbound-webhook-secret';
  assert.equal(
    createWebhookSignature(payloadBody, outboundSecret),
    `sha256=${crypto.createHmac('sha256', outboundSecret).update(payloadBody).digest('hex')}`
  );

  const webhookRecord = recordForWebhook(result.record);
  assert.equal(webhookRecord.id, result.record.id);
  assert.equal(webhookRecord.fields.recordType, 'lead');
  assert.equal(webhookRecord.meta.user_agent, 'simple-crm-test');

  const requests = [];
  const deliveries = await dispatchRecordWebhooks(
    'crm.lead.created',
    [result.record],
    'https://hooks.example/lead\nhttps://backup.example/lead',
    {
      secret: outboundSecret,
      fetchImpl: async (url, requestOptions) => {
        requests.push({ url, requestOptions });
        return { ok: true, status: 202 };
      },
    }
  );

  assert.equal(deliveries.length, 2);
  assert.deepEqual(deliveries.map((delivery) => delivery.ok), [true, true]);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].requestOptions.method, 'POST');
  assert.equal(requests[0].requestOptions.headers['x-patriot-phone-event'], 'crm.lead.created');
  assert.equal(requests[0].requestOptions.headers['x-patriot-phone-record-id'], result.record.id);
  assert.equal(
    requests[0].requestOptions.headers['x-patriot-phone-signature'],
    createWebhookSignature(requests[0].requestOptions.body, outboundSecret)
  );

  const requestPayload = JSON.parse(requests[0].requestOptions.body);
  assert.equal(requestPayload.event, 'crm.lead.created');
  assert.equal(requestPayload.source, 'patriot-phone-storefront-ops');
  assert.equal(requestPayload.record.fields.recordType, 'lead');
  assert.equal(requestPayload.record.fields.email, 'qa.parent@example.com');
}

testOutboundWebhooks().then(() => {
  console.log('Simple CRM proof passed: timestamp, all fields, viewer, CSV, honeypot, rate limit, and signed outbound webhooks verified.');
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
