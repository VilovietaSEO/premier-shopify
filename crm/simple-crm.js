const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { extractSetupRows } = require('../orders/setup-export');

const DEFAULT_TIME_ZONE = process.env.CRM_STORE_TIMEZONE || 'America/Denver';
const DEFAULT_STORAGE_PATH = process.env.CRM_SUBMISSIONS_PATH || path.resolve(process.cwd(), 'tmp/crm-submissions.jsonl');
const DEFAULT_WEBHOOK_TIMEOUT_MS = 8000;
const FIRST_BILL_RULE = 'first_day_of_next_month';
const REVIO_CHECKOUT_LINE_ALLOWLIST = Object.freeze({
  'PP-CLASSIC-PHONE': Object.freeze({
    handle: 'standard-phone',
    role: 'phone',
    checkoutPriceCents: 10000,
    futurePriceCents: 0,
    billingCadence: '',
    firstBillRule: '',
    requiresShipping: true,
    taxable: true,
  }),
  'PP-RUGGED-PHONE': Object.freeze({
    handle: 'rugged-phone',
    role: 'phone',
    checkoutPriceCents: 15000,
    futurePriceCents: 0,
    billingCadence: '',
    firstBillRule: '',
    requiresShipping: true,
    taxable: true,
  }),
  'PP-MONTHLY-SERVICE': Object.freeze({
    handle: 'monthly-service',
    role: 'service',
    checkoutPriceCents: 0,
    futurePriceCents: 1776,
    billingCadence: 'monthly',
    firstBillRule: FIRST_BILL_RULE,
    requiresShipping: false,
    taxable: false,
  }),
  'PP-ANNUAL-SERVICE': Object.freeze({
    handle: 'annual-service',
    role: 'service',
    checkoutPriceCents: 0,
    futurePriceCents: 20000,
    billingCadence: 'annual',
    firstBillRule: FIRST_BILL_RULE,
    requiresShipping: false,
    taxable: false,
  }),
  'PP-ADDON-CALL-RECORDING': Object.freeze({
    handle: 'call-recording',
    role: 'addon',
    checkoutPriceCents: 0,
    futurePriceCents: 500,
    billingCadence: 'monthly',
    firstBillRule: FIRST_BILL_RULE,
    requiresShipping: false,
    taxable: false,
  }),
  'PP-ADDON-FAMILY-QUIET-HOURS': Object.freeze({
    handle: 'family-quiet-hours',
    role: 'addon',
    checkoutPriceCents: 0,
    futurePriceCents: 500,
    billingCadence: 'monthly',
    firstBillRule: FIRST_BILL_RULE,
    requiresShipping: false,
    taxable: false,
  }),
  'PP-ADDON-VOICEMAIL-TO-EMAIL': Object.freeze({
    handle: 'voicemail-to-email',
    role: 'addon',
    checkoutPriceCents: 0,
    futurePriceCents: 500,
    billingCadence: 'monthly',
    firstBillRule: FIRST_BILL_RULE,
    requiresShipping: false,
    taxable: false,
  }),
  'PP-ADDON-AUTO-ATTENDANT': Object.freeze({
    handle: 'auto-attendant',
    role: 'addon',
    checkoutPriceCents: 0,
    futurePriceCents: 500,
    billingCadence: 'monthly',
    firstBillRule: FIRST_BILL_RULE,
    requiresShipping: false,
    taxable: false,
  }),
  'PP-ADDON-BUNDLE': Object.freeze({
    handle: 'add-on-bundle',
    role: 'addon_bundle',
    checkoutPriceCents: 0,
    futurePriceCents: 1000,
    billingCadence: 'monthly',
    firstBillRule: FIRST_BILL_RULE,
    requiresShipping: false,
    taxable: false,
  }),
});

const FIELD_ALIASES = {
  name: ['contact[name]', 'name'],
  email: ['contact[email]', 'email'],
  phone: ['contact[phone]', 'phone'],
  ageRange: ['contact[Child age range]', 'child_age_range', 'age_range'],
  useCase: ['contact[Main use case]', 'main_use_case', 'use_case'],
  interestedProduct: ['contact[Interested product]', 'interested_product'],
  preferredPlan: ['contact[Preferred service plan]', 'preferred_plan'],
  selectedAddons: ['contact[Selected add-ons]', 'selected_addons', 'selected_addons[]'],
  message: ['contact[body]', 'message', 'body'],
  marketingOptIn: ['contact[Marketing opt-in]', 'marketing_opt_in'],
  privacyTermsConsent: ['contact[Privacy and terms consent]', 'privacy_terms_consent'],
  recordType: ['crm[record_type]', 'record_type'],
  sourceType: ['crm[source_type]', 'source_type'],
  leadType: ['crm[lead_type]', 'lead_type'],
  saleType: ['crm[sale_type]', 'sale_type'],
  tags: ['crm[tags]', 'tags', 'tags[]'],
  orderId: ['crm[order_id]', 'order_id'],
  orderName: ['crm[order_name]', 'order_name'],
  sourceUrl: ['crm[source_url]', 'source_url'],
  sourcePath: ['crm[source_path]', 'source_path'],
  referrer: ['crm[referrer]', 'referrer'],
  utmSource: ['crm[utm_source]', 'utm_source'],
  utmMedium: ['crm[utm_medium]', 'utm_medium'],
  utmCampaign: ['crm[utm_campaign]', 'utm_campaign'],
  returnTo: ['crm[return_to]', 'return_to'],
  honeypot: ['company_website', 'website', 'url'],
};

const CSV_COLUMNS = [
  'id',
  'submitted_at',
  'submitted_at_store_timezone',
  'record_type',
  'source_type',
  'lead_type',
  'sale_type',
  'tags',
  'order_id',
  'order_name',
  'time_zone',
  'source_url',
  'source_path',
  'return_to',
  'referrer',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'name',
  'email',
  'phone',
  'age_range',
  'use_case',
  'interested_product',
  'preferred_plan',
  'selected_addons',
  'message',
  'marketing_opt_in',
  'privacy_terms_consent',
  'raw_form_fields_json',
  'meta_json',
];

function normalizeFormInput(input) {
  const fields = {};

  if (input instanceof URLSearchParams) {
    for (const [key, value] of input.entries()) addFieldValue(fields, key, value);
    return fields;
  }

  for (const [key, value] of Object.entries(input || {})) {
    if (Array.isArray(value)) {
      for (const item of value) addFieldValue(fields, key, item);
    } else {
      addFieldValue(fields, key, value);
    }
  }

  return fields;
}

function addFieldValue(fields, key, value) {
  const normalizedValue = value == null ? '' : String(value);
  if (Object.prototype.hasOwnProperty.call(fields, key)) {
    if (Array.isArray(fields[key])) fields[key].push(normalizedValue);
    else fields[key] = [fields[key], normalizedValue];
  } else {
    fields[key] = normalizedValue;
  }
}

function firstValue(fields, aliases) {
  for (const alias of aliases) {
    if (!Object.prototype.hasOwnProperty.call(fields, alias)) continue;
    const value = fields[alias];
    if (Array.isArray(value)) {
      const match = value.find((item) => String(item).trim() !== '');
      if (match != null) return String(match).trim();
    } else if (String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
}

function arrayValue(fields, aliases) {
  const values = [];
  for (const alias of aliases) {
    if (!Object.prototype.hasOwnProperty.call(fields, alias)) continue;
    const value = fields[alias];
    const items = Array.isArray(value) ? value : String(value).split(',');
    for (const item of items) {
      const trimmed = String(item).trim();
      if (trimmed) values.push(trimmed);
    }
  }
  return Array.from(new Set(values));
}

function booleanValue(fields, aliases) {
  const value = firstValue(fields, aliases).toLowerCase();
  return ['1', 'true', 'yes', 'on', 'agree', 'agreed'].includes(value);
}

function optionalBooleanValue(fields, aliases) {
  const wasSubmitted = aliases.some((alias) => Object.prototype.hasOwnProperty.call(fields, alias));
  return wasSubmitted ? booleanValue(fields, aliases) : null;
}

function storeTime(isoDate, timeZone) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone,
  }).format(new Date(isoDate));
}

function applyUtmFallback(sourceUrl, fields) {
  if (!sourceUrl) return fields;
  try {
    const url = new URL(sourceUrl);
    return {
      ...fields,
      utmSource: fields.utmSource || url.searchParams.get('utm_source') || '',
      utmMedium: fields.utmMedium || url.searchParams.get('utm_medium') || '',
      utmCampaign: fields.utmCampaign || url.searchParams.get('utm_campaign') || '',
    };
  } catch {
    return fields;
  }
}

function createSubmissionRecord(input, options = {}) {
  const formFields = normalizeFormInput(input);
  const submittedAt = (options.now ? new Date(options.now) : new Date()).toISOString();
  const timeZone = options.timeZone || DEFAULT_TIME_ZONE;
  const sourceUrl = firstValue(formFields, FIELD_ALIASES.sourceUrl);
  const recordType = firstValue(formFields, FIELD_ALIASES.recordType) || 'lead';
  const sourceType = firstValue(formFields, FIELD_ALIASES.sourceType) || 'contact_form';
  const leadType = firstValue(formFields, FIELD_ALIASES.leadType) || 'contact_form';
  const normalizedFields = applyUtmFallback(sourceUrl, {
    recordType,
    sourceType,
    leadType,
    saleType: firstValue(formFields, FIELD_ALIASES.saleType),
    tags: arrayValue(formFields, FIELD_ALIASES.tags),
    orderId: firstValue(formFields, FIELD_ALIASES.orderId),
    orderName: firstValue(formFields, FIELD_ALIASES.orderName),
    name: firstValue(formFields, FIELD_ALIASES.name),
    email: firstValue(formFields, FIELD_ALIASES.email),
    phone: firstValue(formFields, FIELD_ALIASES.phone),
    ageRange: firstValue(formFields, FIELD_ALIASES.ageRange),
    useCase: firstValue(formFields, FIELD_ALIASES.useCase),
    interestedProduct: firstValue(formFields, FIELD_ALIASES.interestedProduct),
    preferredPlan: firstValue(formFields, FIELD_ALIASES.preferredPlan),
    selectedAddons: arrayValue(formFields, FIELD_ALIASES.selectedAddons),
    message: firstValue(formFields, FIELD_ALIASES.message),
    marketingOptIn: booleanValue(formFields, FIELD_ALIASES.marketingOptIn),
    privacyTermsConsent: optionalBooleanValue(formFields, FIELD_ALIASES.privacyTermsConsent),
    sourceUrl,
    sourcePath: firstValue(formFields, FIELD_ALIASES.sourcePath),
    referrer: firstValue(formFields, FIELD_ALIASES.referrer),
    utmSource: firstValue(formFields, FIELD_ALIASES.utmSource),
    utmMedium: firstValue(formFields, FIELD_ALIASES.utmMedium),
    utmCampaign: firstValue(formFields, FIELD_ALIASES.utmCampaign),
    returnTo: firstValue(formFields, FIELD_ALIASES.returnTo),
  });

  if (normalizedFields.tags.length === 0) {
    normalizedFields.tags = ['lead', leadType, sourceType].filter(Boolean);
  }

  const record = {
    id: crypto.randomUUID(),
    submitted_at: submittedAt,
    submitted_at_store_timezone: storeTime(submittedAt, timeZone),
    time_zone: timeZone,
    fields: normalizedFields,
    form_fields: formFields,
    meta: {
      ip: options.ip || '',
      user_agent: options.userAgent || '',
    },
    spam: firstValue(formFields, FIELD_ALIASES.honeypot) !== '',
  };

  return {
    record,
    errors: validateSubmission(record),
  };
}

function validateSubmission(record) {
  const errors = [];
  const fields = record.fields || {};

  if (record.spam) errors.push('honeypot field was completed');
  if (!fields.name) errors.push('name is required');
  if (!fields.email) errors.push('email is required');
  if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) errors.push('email is invalid');
  if (!fields.message) errors.push('message is required');

  return errors;
}

function saveSubmission(input, options = {}) {
  const storagePath = options.storagePath || DEFAULT_STORAGE_PATH;
  const result = createSubmissionRecord(input, options);
  if (result.errors.length > 0) return { ...result, saved: false };

  appendRecords(storagePath, [result.record]);
  return { ...result, saved: true };
}

function appendRecords(storagePath, records) {
  fs.mkdirSync(path.dirname(storagePath), { recursive: true });
  for (const record of records) {
    fs.appendFileSync(storagePath, `${JSON.stringify(record)}\n`);
  }
}

function parseWebhookUrls(value) {
  const rawUrls = Array.isArray(value)
    ? value
    : String(value || '').split(/[\n,]+/);
  return rawUrls
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .map((item) => {
      const url = new URL(item);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error(`Webhook URL must be http or https: ${item}`);
      }
      return url.href;
    });
}

function createWebhookSignature(body, secret) {
  if (!secret) return '';
  return `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
}

function recordForWebhook(record) {
  const formFields = record.form_fields || {};
  const webhookRecord = {
    id: record.id,
    submitted_at: record.submitted_at,
    submitted_at_store_timezone: record.submitted_at_store_timezone,
    time_zone: record.time_zone,
    fields: record.fields || {},
    form_fields: formFields,
    meta: record.meta || {},
  };

  if (formFields.revio_checkout_payload_json) {
    try {
      webhookRecord.revio_checkout_payload = JSON.parse(formFields.revio_checkout_payload_json);
    } catch {
      webhookRecord.revio_checkout_payload = null;
    }
  }

  return webhookRecord;
}

async function dispatchOutboundWebhook(url, payload, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const body = JSON.stringify(payload);
  const headers = {
    'content-type': 'application/json',
    'user-agent': 'PatriotPhoneWebhook/1.0',
    'x-patriot-phone-event': payload.event,
  };
  const signature = createWebhookSignature(body, options.secret || '');
  if (signature) headers['x-patriot-phone-signature'] = signature;
  if (payload.record?.id) headers['x-patriot-phone-record-id'] = payload.record.id;

  try {
    if (typeof fetchImpl !== 'function') throw new Error('fetch is not available for outbound webhook dispatch');
    const response = await fetchImpl(url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(options.timeoutMs || DEFAULT_WEBHOOK_TIMEOUT_MS),
    });
    let responsePayload = null;
    if (typeof response.json === 'function') {
      try {
        responsePayload = await response.json();
      } catch {
        responsePayload = null;
      }
    }
    const locationHeader = typeof response.headers?.get === 'function'
      ? response.headers.get('location') || ''
      : '';
    const checkoutUrl = [
      responsePayload?.checkout_url,
      responsePayload?.redirect_url,
      locationHeader,
      response.redirected ? response.url : '',
    ].find((value) => String(value || '').trim()) || '';
    return {
      url,
      ok: response.ok && responsePayload?.ok !== false,
      status: response.status,
      event: payload.event,
      recordId: payload.record?.id || '',
      checkoutUrl,
    };
  } catch (error) {
    return {
      url,
      ok: false,
      status: 0,
      event: payload.event,
      recordId: payload.record?.id || '',
      error: error.message,
    };
  }
}

async function dispatchRecordWebhooks(event, records, urls, options = {}) {
  const destinations = parseWebhookUrls(urls);
  const results = [];
  for (const record of records) {
    for (const url of destinations) {
      results.push(await dispatchOutboundWebhook(url, {
        event,
        generatedAt: new Date().toISOString(),
        source: 'patriot-phone-storefront-ops',
        record: recordForWebhook(record),
      }, options));
    }
  }
  return results;
}

function existingDedupeKeys(storagePath) {
  return new Set(readSubmissions(storagePath).map((record) => record.meta?.dedupe_key).filter(Boolean));
}

function saleTypeForSetupRow(row) {
  if (/classic phone/i.test(row.line_item_title || row.phone || '') && /monthly service/i.test(row.service_plan || '')) {
    return 'classic_monthly_addon_sale';
  }
  return 'phone_setup_sale';
}

function saleTagsForSetupRow(row, saleType) {
  const tags = ['sale', 'shopify_order', saleType];
  if (/classic phone/i.test(row.line_item_title || row.phone || '')) tags.push('classic-phone');
  if (/rugged phone/i.test(row.line_item_title || row.phone || '')) tags.push('rugged-phone');
  if (/monthly service/i.test(row.service_plan || '')) tags.push('monthly-service');
  if (/annual service/i.test(row.service_plan || '')) tags.push('annual-service');
  if (/add-on bundle/i.test(row.add_on_bundle || '')) tags.push('add-on-bundle');
  return Array.from(new Set(tags));
}

function createOrderCrmRecord(row, options = {}) {
  const submittedAt = (options.now ? new Date(options.now) : new Date(row.created_at || Date.now())).toISOString();
  const timeZone = options.timeZone || DEFAULT_TIME_ZONE;
  const saleType = saleTypeForSetupRow(row);
  const sourceUrl = options.sourceUrl || '';
  const fields = {
    recordType: 'sale',
    sourceType: 'shopify_order',
    leadType: '',
    saleType,
    tags: saleTagsForSetupRow(row, saleType),
    orderId: String(row.order_id || ''),
    orderName: String(row.order_name || ''),
    name: '',
    email: row.customer_email || '',
    phone: '',
    ageRange: '',
    useCase: 'Purchase',
    interestedProduct: row.line_item_title || row.phone || '',
    preferredPlan: row.service_plan || '',
    selectedAddons: [
      row.add_on_bundle ? `Add-on Bundle: ${row.add_on_bundle}` : '',
      row.call_recording ? `Call Recording: ${row.call_recording}` : '',
      row.family_quiet_hours ? `Quiet Hours: ${row.family_quiet_hours}` : '',
      row.voicemail_to_email ? `Voicemail to Email: ${row.voicemail_to_email}` : '',
      row.auto_attendant ? `Auto Attendant: ${row.auto_attendant}` : '',
    ].filter(Boolean),
    message: row.setup_summary || '',
    marketingOptIn: false,
    privacyTermsConsent: /privacy policy|terms|agreed/i.test(row.policy_agreement || ''),
    sourceUrl,
    sourcePath: '',
    referrer: '',
    utmSource: '',
    utmMedium: '',
    utmCampaign: '',
    returnTo: '',
  };

  return {
    id: crypto.randomUUID(),
    submitted_at: submittedAt,
    submitted_at_store_timezone: storeTime(submittedAt, timeZone),
    time_zone: timeZone,
    fields,
    form_fields: {
      order_id: row.order_id || '',
      order_name: row.order_name || '',
      line_item_title: row.line_item_title || '',
      sku: row.sku || '',
      quantity: row.quantity || '',
      all_properties_json: row.all_properties_json || '',
    },
    meta: {
      ip: '',
      user_agent: options.userAgent || 'shopify-order-import',
      dedupe_key: `shopify_order:${row.order_id || row.order_name}:${row.line_item_title}:${row.sku}`,
      financial_status: row.financial_status || '',
      fulfillment_status: row.fulfillment_status || '',
    },
    spam: false,
  };
}

function saveOrderRowsToCrm(rows, options = {}) {
  const storagePath = options.storagePath || DEFAULT_STORAGE_PATH;
  const seen = existingDedupeKeys(storagePath);
  const records = [];
  const skipped = [];

  for (const row of rows) {
    const record = createOrderCrmRecord(row, options);
    const dedupeKey = record.meta.dedupe_key;
    if (seen.has(dedupeKey)) {
      skipped.push(dedupeKey);
      continue;
    }
    seen.add(dedupeKey);
    records.push(record);
  }

  appendRecords(storagePath, records);
  return {
    imported: records.length,
    skipped: skipped.length,
    records,
    skippedDedupeKeys: skipped,
  };
}

function checkoutHandoffLines(payload) {
  if (Array.isArray(payload?.lines)) return payload.lines;
  return (payload?.setups || []).flatMap((setup) => setup.lines || []);
}

function firstCheckoutLine(payload, roles) {
  const roleSet = new Set(roles);
  return checkoutHandoffLines(payload).find((line) => roleSet.has(line.role)) || null;
}

function checkoutSetupIds(payload) {
  const ids = new Set();
  for (const setup of payload?.setups || []) {
    if (setup.setup_id) ids.add(String(setup.setup_id));
  }
  for (const line of checkoutHandoffLines(payload)) {
    if (line.setup_id) ids.add(String(line.setup_id));
  }
  return Array.from(ids).sort();
}

function checkoutSelectionLine(line = {}) {
  const visibleProperties = Array.isArray(line.visible_properties)
    ? line.visible_properties
      .map((property) => ({
        name: String(property?.name || property?.key || '').trim(),
        value: String(property?.value ?? '').trim(),
      }))
      .filter((property) => property.name)
      .sort((left, right) => `${left.name}\u0000${left.value}`.localeCompare(`${right.name}\u0000${right.value}`))
    : [];

  return {
    setup_id: String(line.setup_id || ''),
    role: String(line.role || ''),
    shopify_variant_id: String(line.shopify_variant_id || ''),
    sku: String(line.sku || ''),
    quantity: Number(line.quantity || 0),
    checkout_price_cents: line.checkout_price_cents,
    checkout_line_price_cents: line.checkout_line_price_cents,
    future_charge_cents: line.future_charge_cents,
    future_line_charge_cents: line.future_line_charge_cents,
    billing_cadence: String(line.billing_cadence || ''),
    first_bill_rule: String(line.first_bill_rule || ''),
    setup_billing_name: String(line.setup_billing_name || ''),
    setup_billing_value: String(line.setup_billing_value || ''),
    visible_properties: visibleProperties,
  };
}

function checkoutSelectionHash(payload) {
  const lines = checkoutHandoffLines(payload)
    .map(checkoutSelectionLine)
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(lines))
    .digest('hex')
    .slice(0, 24);
}

function checkoutDedupeKey(payload) {
  const token = payload?.cart?.token || '';
  return `revio_checkout:${token || 'no-cart-token'}:${checkoutSelectionHash(payload)}`;
}

function checkoutSaleType(payload) {
  const phoneLine = firstCheckoutLine(payload, ['phone']);
  if (/rugged/i.test(phoneLine?.title || '')) return 'rugged_phone_checkout';
  if (/classic/i.test(phoneLine?.title || '')) return 'classic_phone_checkout';
  return 'revio_checkout_handoff';
}

function checkoutTags(payload, saleType) {
  const tags = ['sale', 'revio_checkout', saleType];
  const lines = checkoutHandoffLines(payload);
  if (lines.some((line) => /classic/i.test(line.title || line.setup_phone || ''))) tags.push('classic-phone');
  if (lines.some((line) => /rugged/i.test(line.title || line.setup_phone || ''))) tags.push('rugged-phone');
  if (lines.some((line) => line.role === 'service' && /monthly/i.test(line.setup_billing_value || line.title || ''))) {
    tags.push('monthly-service');
  }
  if (lines.some((line) => line.role === 'service' && /annual/i.test(line.setup_billing_value || line.title || ''))) {
    tags.push('annual-service');
  }
  if (lines.some((line) => line.role === 'addon_bundle')) tags.push('add-on-bundle');
  return Array.from(new Set(tags));
}

function checkoutLineLabel(line) {
  return [
    line.setup_billing_value,
    line.setup_billing_name,
    line.title,
  ].find((value) => String(value || '').trim()) || '';
}

function validateCheckoutHandoff(payload) {
  const errors = [];
  const allowedRoles = new Set(['phone', 'service', 'addon', 'addon_bundle']);
  const deferredRoles = new Set(['service', 'addon', 'addon_bundle']);
  const isMoneyCents = (value) => Number.isInteger(value) && value >= 0;
  const isPositiveQuantity = (value) => Number.isInteger(value) && value > 0;

  if (!payload || typeof payload !== 'object') {
    return ['checkout payload is required'];
  }
  if (payload.schema !== 'independence_phone.revio_checkout.v2') {
    errors.push('schema must be independence_phone.revio_checkout.v2');
  }
  if (payload?.consent?.collection_status !== 'pending_checkout') {
    errors.push('privacy and terms consent collection_status must be pending_checkout');
  }
  if (payload?.consent?.privacy_terms_accepted != null) {
    errors.push('privacy and terms consent must remain pending until final checkout');
  }
  if (payload?.customer?.desired_area_code_collection_status !== 'required_at_checkout') {
    errors.push('desired area code must be marked required_at_checkout');
  }
  if (String(payload?.customer?.desired_area_code || '').trim()) {
    errors.push('desired area code must remain pending until final checkout');
  }
  if (!Array.isArray(payload?.setups) || payload.setups.length === 0) {
    errors.push('at least one phone setup is required');
  }
  if (!Array.isArray(payload?.lines) || payload.lines.length === 0) {
    errors.push('at least one checkout line is required');
  }

  const setupIds = checkoutSetupIds(payload);
  if (setupIds.length === 0) errors.push('setup_id is required for Rev.io checkout handoff');

  const declaredSetupIds = new Set();
  for (const setup of payload?.setups || []) {
    const setupId = String(setup.setup_id || '');
    if (!setupId) {
      errors.push('every setup must have a setup_id');
      continue;
    }
    if (declaredSetupIds.has(setupId)) errors.push(`duplicate setup_id ${setupId}`);
    declaredSetupIds.add(setupId);
    if (!Array.isArray(setup.lines) || setup.lines.length === 0) {
      errors.push(`lines are required for setup ${setupId}`);
      continue;
    }
    const phoneLines = setup.lines.filter((line) => line.role === 'phone');
    const serviceLines = setup.lines.filter((line) => line.role === 'service');
    if (phoneLines.length !== 1) errors.push(`exactly one phone line is required for setup ${setupId}`);
    if (serviceLines.length !== 1) errors.push(`exactly one service line is required for setup ${setupId}`);
    if (!isPositiveQuantity(setup.quantity)) errors.push(`quantity must be a positive integer for setup ${setupId}`);
    for (const line of setup.lines) {
      if (String(line.setup_id || '') !== setupId) {
        errors.push(`line setup_id must match setup ${setupId}`);
      }
      if (isPositiveQuantity(setup.quantity) && line.quantity !== setup.quantity) {
        errors.push(`line quantity must match setup quantity for setup ${setupId}`);
      }
    }
  }

  for (const [index, line] of (payload.lines || []).entries()) {
    const label = `line ${index + 1}`;
    const role = String(line?.role || '');
    if (!allowedRoles.has(role)) {
      errors.push(`${label} has unsupported role ${role || '(missing)'}`);
      continue;
    }
    if (!String(line.setup_id || '')) errors.push(`${label} setup_id is required`);
    if (!declaredSetupIds.has(String(line.setup_id || ''))) {
      errors.push(`${label} references an unknown setup_id`);
    }
    if (!String(line.shopify_variant_id || '')) errors.push(`${label} shopify_variant_id is required`);
    if (!String(line.sku || '').trim()) errors.push(`${label} sku is required`);
    if (!isPositiveQuantity(line.quantity)) errors.push(`${label} quantity must be a positive integer`);
    if (!isMoneyCents(line.checkout_price_cents)) errors.push(`${label} checkout_price_cents must be numeric cents`);
    if (!isMoneyCents(line.checkout_line_price_cents)) errors.push(`${label} checkout_line_price_cents must be numeric cents`);
    if (!isMoneyCents(line.future_charge_cents)) errors.push(`${label} future_charge_cents must be numeric cents`);
    if (!isMoneyCents(line.future_line_charge_cents)) errors.push(`${label} future_line_charge_cents must be numeric cents`);
    if (
      isPositiveQuantity(line.quantity)
      && isMoneyCents(line.checkout_price_cents)
      && isMoneyCents(line.checkout_line_price_cents)
      && line.checkout_line_price_cents !== line.checkout_price_cents * line.quantity
    ) {
      errors.push(`${label} checkout line price must equal unit price times quantity`);
    }
    if (
      isPositiveQuantity(line.quantity)
      && isMoneyCents(line.future_charge_cents)
      && isMoneyCents(line.future_line_charge_cents)
      && line.future_line_charge_cents !== line.future_charge_cents * line.quantity
    ) {
      errors.push(`${label} future line charge must equal unit future charge times quantity`);
    }

    const allowedLine = REVIO_CHECKOUT_LINE_ALLOWLIST[String(line.sku || '').trim()];
    if (!allowedLine) {
      errors.push(`${label} sku is not approved for Rev.io checkout`);
    } else {
      if (line.shopify_handle !== allowedLine.handle) {
        errors.push(`${label} shopify_handle does not match approved sku`);
      }
      if (role !== allowedLine.role) {
        errors.push(`${label} role does not match approved sku`);
      }
      if (line.checkout_price_cents !== allowedLine.checkoutPriceCents) {
        errors.push(`${label} checkout_price_cents does not match approved sku`);
      }
      if (line.future_charge_cents !== allowedLine.futurePriceCents) {
        errors.push(`${label} future_charge_cents does not match approved sku`);
      }
      if (line.billing_cadence !== allowedLine.billingCadence) {
        errors.push(`${label} billing_cadence does not match approved sku`);
      }
      if (line.first_bill_rule !== allowedLine.firstBillRule) {
        errors.push(`${label} first_bill_rule does not match approved sku`);
      }
      if (line.requires_shipping !== allowedLine.requiresShipping) {
        errors.push(`${label} requires_shipping does not match approved sku`);
      }
      if (line.taxable !== allowedLine.taxable) {
        errors.push(`${label} taxable does not match approved sku`);
      }
    }

    if (role === 'phone') {
      if (line.setup_parent) errors.push(`${label} phone line cannot be a setup parent`);
      if (!(line.checkout_price_cents > 0) || !(line.checkout_line_price_cents > 0)) {
        errors.push(`${label} phone must have an immediate checkout price`);
      }
      if (line.future_charge_cents !== 0 || line.future_line_charge_cents !== 0) {
        errors.push(`${label} phone cannot have a future charge`);
      }
      continue;
    }

    if (deferredRoles.has(role)) {
      if (!line.setup_parent) errors.push(`${label} deferred billing line must be a setup parent`);
      if (line.checkout_price_cents !== 0 || line.checkout_line_price_cents !== 0) {
        errors.push(`${label} deferred billing line must be $0 at Shopify checkout`);
      }
      if (!(line.future_charge_cents > 0) || !(line.future_line_charge_cents > 0)) {
        errors.push(`${label} deferred billing line must have a positive future charge`);
      }
      if (!['monthly', 'annual'].includes(line.billing_cadence)) {
        errors.push(`${label} billing_cadence must be monthly or annual`);
      }
      if (role !== 'service' && line.billing_cadence !== 'monthly') {
        errors.push(`${label} add-on billing_cadence must be monthly`);
      }
      if (line.first_bill_rule !== 'first_day_of_next_month') {
        errors.push(`${label} first_bill_rule must be first_day_of_next_month`);
      }
    }
  }

  const nestedSelection = (payload.setups || [])
    .flatMap((setup) => setup.lines || [])
    .map(checkoutSelectionLine)
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  const topLevelSelection = (payload.lines || [])
    .map(checkoutSelectionLine)
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  if (JSON.stringify(nestedSelection) !== JSON.stringify(topLevelSelection)) {
    errors.push('top-level checkout lines must match setup lines');
  }

  if (Array.isArray(payload.ungrouped_lines) && payload.ungrouped_lines.length > 0) {
    errors.push('ungrouped checkout lines are not supported');
  }
  if (payload.setup_count !== (payload.setups || []).length) {
    errors.push('setup_count must match the number of setups');
  }

  const immediateSubtotal = (payload.lines || []).reduce(
    (total, line) => total + (isMoneyCents(line.checkout_line_price_cents) ? line.checkout_line_price_cents : 0),
    0,
  );
  const futureCharge = (payload.lines || []).reduce(
    (total, line) => total + (isMoneyCents(line.future_line_charge_cents) ? line.future_line_charge_cents : 0),
    0,
  );
  if (payload?.cart?.immediate_subtotal_cents !== immediateSubtotal) {
    errors.push('cart immediate_subtotal_cents must match checkout lines');
  }
  if (payload?.cart?.future_charge_cents !== futureCharge) {
    errors.push('cart future_charge_cents must match deferred billing lines');
  }
  const phoneQuantity = (payload.lines || []).reduce(
    (total, line) => total + (line.role === 'phone' && isPositiveQuantity(line.quantity) ? line.quantity : 0),
    0,
  );
  const rawItemQuantity = (payload.lines || []).reduce(
    (total, line) => total + (isPositiveQuantity(line.quantity) ? line.quantity : 0),
    0,
  );
  if (payload?.cart?.item_count !== phoneQuantity) {
    errors.push('cart item_count must match phone quantity');
  }
  if (payload?.cart?.raw_item_count !== rawItemQuantity) {
    errors.push('cart raw_item_count must match all checkout line quantities');
  }
  if (payload?.cart?.flat_shipping_cents !== 1500) {
    errors.push('cart flat_shipping_cents must be 1500');
  }
  if (payload?.cart?.due_today_before_tax_cents !== immediateSubtotal + 1500) {
    errors.push('cart due_today_before_tax_cents must include the $15 flat shipping charge');
  }
  if (payload?.cart?.tax_status !== 'calculated_after_address' || payload?.cart?.tax_cents != null) {
    errors.push('cart tax must remain pending until an address is entered');
  }
  if (payload?.cart?.first_bill_rule !== 'first_day_of_next_month') {
    errors.push('cart first_bill_rule must be first_day_of_next_month');
  }

  return Array.from(new Set(errors));
}

function createCheckoutHandoffRecord(payload, options = {}) {
  const submittedAt = (options.now ? new Date(options.now) : new Date()).toISOString();
  const timeZone = options.timeZone || DEFAULT_TIME_ZONE;
  const customer = payload.customer || {};
  const saleType = checkoutSaleType(payload);
  const phoneLine = firstCheckoutLine(payload, ['phone']);
  const serviceLine = firstCheckoutLine(payload, ['service']);
  const addonLines = checkoutHandoffLines(payload).filter((line) => ['addon', 'addon_bundle'].includes(line.role));
  const setupIds = checkoutSetupIds(payload);
  const sourceUrl = payload.source_url || '';
  const sourcePath = (() => {
    try {
      return sourceUrl ? new URL(sourceUrl).pathname : '';
    } catch {
      return '';
    }
  })();

  return {
    id: crypto.randomUUID(),
    submitted_at: submittedAt,
    submitted_at_store_timezone: storeTime(submittedAt, timeZone),
    time_zone: timeZone,
    fields: {
      recordType: 'sale',
      sourceType: 'revio_checkout_handoff',
      leadType: '',
      saleType,
      tags: checkoutTags(payload, saleType),
      orderId: payload.cart?.token || '',
      orderName: '',
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      ageRange: '',
      useCase: 'Purchase',
      interestedProduct: phoneLine?.title || phoneLine?.setup_phone || '',
      preferredPlan: checkoutLineLabel(serviceLine || {}),
      selectedAddons: addonLines.map(checkoutLineLabel).filter(Boolean),
      message: `Rev.io checkout handoff for ${setupIds.length || payload.setup_count || 0} setup(s).`,
      marketingOptIn: false,
      privacyTermsConsent: payload.consent?.privacy_terms_accepted ?? null,
      sourceUrl,
      sourcePath,
      referrer: payload.referrer || '',
      utmSource: '',
      utmMedium: '',
      utmCampaign: '',
      returnTo: '',
    },
    form_fields: {
      revio_checkout_payload_json: JSON.stringify(payload),
    },
    meta: {
      ip: options.ip || '',
      user_agent: options.userAgent || 'revio-checkout-handoff',
      dedupe_key: checkoutDedupeKey(payload),
      cart_token: payload.cart?.token || '',
      setup_ids: setupIds,
      schema: payload.schema || '',
      immediate_subtotal_cents: payload.cart?.immediate_subtotal_cents || 0,
      flat_shipping_cents: payload.cart?.flat_shipping_cents || 0,
      due_today_before_tax_cents: payload.cart?.due_today_before_tax_cents || 0,
      future_charge_cents: payload.cart?.future_charge_cents || 0,
      consent_collection_status: payload.consent?.collection_status || '',
      desired_area_code: payload.customer?.desired_area_code ?? null,
      desired_area_code_collection_status: payload.customer?.desired_area_code_collection_status || '',
    },
    spam: false,
  };
}

function saveCheckoutHandoffToCrm(payload, options = {}) {
  const storagePath = options.storagePath || DEFAULT_STORAGE_PATH;
  const errors = validateCheckoutHandoff(payload);
  const record = createCheckoutHandoffRecord(payload || {}, options);
  if (errors.length > 0) return { saved: false, skipped: false, errors, record };

  const seen = existingDedupeKeys(storagePath);
  if (seen.has(record.meta.dedupe_key)) {
    return { saved: false, skipped: true, errors: [], record };
  }

  appendRecords(storagePath, [record]);
  return { saved: true, skipped: false, errors: [], record };
}

function readSubmissions(storagePath = DEFAULT_STORAGE_PATH) {
  if (!fs.existsSync(storagePath)) return [];
  return fs
    .readFileSync(storagePath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
}

function csvValue(value) {
  const stringValue = Array.isArray(value) ? value.join('; ') : String(value ?? '');
  return `"${stringValue.replaceAll('"', '""')}"`;
}

function submissionsToCsv(records) {
  const lines = [CSV_COLUMNS.join(',')];
  for (const record of records) {
    const fields = record.fields || {};
    lines.push(
      [
        record.id,
        record.submitted_at,
        record.submitted_at_store_timezone,
        fields.recordType,
        fields.sourceType,
        fields.leadType,
        fields.saleType,
        fields.tags,
        fields.orderId,
        fields.orderName,
        record.time_zone,
        fields.sourceUrl,
        fields.sourcePath,
        fields.returnTo,
        fields.referrer,
        fields.utmSource,
        fields.utmMedium,
        fields.utmCampaign,
        fields.name,
        fields.email,
        fields.phone,
        fields.ageRange,
        fields.useCase,
        fields.interestedProduct,
        fields.preferredPlan,
        fields.selectedAddons,
        fields.message,
        fields.marketingOptIn ? 'Yes' : 'No',
        fields.privacyTermsConsent == null ? 'Pending' : (fields.privacyTermsConsent ? 'Yes' : 'No'),
        JSON.stringify(record.form_fields || {}),
        JSON.stringify(record.meta || {}),
      ].map(csvValue).join(',')
    );
  }
  return `${lines.join('\n')}\n`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function humanizeKey(key) {
  return String(key || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_\[\]]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function renderDefinitionList(entries) {
  return entries
    .map(([key, value]) => {
      const displayValue = Array.isArray(value) ? value.join(', ') : value;
      return `<div class="crm-detail-row">
        <dt>${escapeHtml(humanizeKey(key))}</dt>
        <dd>${escapeHtml(displayValue)}</dd>
      </div>`;
    })
    .join('');
}

function renderRecordDetails(record) {
  const fields = record.fields || {};
  return `<details class="crm-record-details">
    <summary>View details</summary>
    <section>
      <h2>Normalized fields</h2>
      <dl>${renderDefinitionList(Object.entries(fields))}</dl>
    </section>
    <section>
      <h2>Raw submitted fields</h2>
      <pre>${escapeHtml(JSON.stringify(record.form_fields || {}, null, 2))}</pre>
    </section>
    <section>
      <h2>Metadata</h2>
      <pre>${escapeHtml(JSON.stringify(record.meta || {}, null, 2))}</pre>
    </section>
  </details>`;
}

function recordSummaryCounts(records) {
  return records.reduce(
    (counts, record) => {
      const recordType = record.fields?.recordType || '';
      counts.total += 1;
      if (recordType === 'lead') counts.leads += 1;
      if (recordType === 'sale') counts.sales += 1;
      return counts;
    },
    { total: 0, leads: 0, sales: 0 }
  );
}

function safeRedirectLocation(returnTo = '/', sourceUrl = '') {
  let sourceOrigin = '';
  try {
    sourceOrigin = sourceUrl ? new URL(sourceUrl).origin : '';
  } catch {
    sourceOrigin = '';
  }

  const fallback = sourceOrigin ? `${sourceOrigin}/` : '/';
  const target = String(returnTo || '/').trim() || '/';
  if (target.startsWith('//')) return fallback;

  try {
    const absolute = new URL(target);
    return sourceOrigin && absolute.origin === sourceOrigin ? absolute.href : fallback;
  } catch {
    if (!target.startsWith('/')) return fallback;
    return sourceOrigin ? new URL(target, sourceOrigin).href : target;
  }
}

function renderViewer(records, options = {}) {
  const exportHref = options.exportToken
    ? `/crm/leads.csv?token=${encodeURIComponent(options.exportToken)}`
    : '/crm/leads.csv';
  const counts = recordSummaryCounts(records);
  const rows = records.map((record) => {
    const fields = record.fields || {};
    return `<tr>
      <td>${escapeHtml(record.submitted_at_store_timezone)}</td>
      <td>${escapeHtml(fields.recordType)}</td>
      <td>${escapeHtml(fields.leadType || fields.saleType)}</td>
      <td>${escapeHtml((fields.tags || []).join(', '))}</td>
      <td>${escapeHtml(fields.orderName)}</td>
      <td>${escapeHtml(fields.name)}</td>
      <td><a href="mailto:${escapeHtml(fields.email)}">${escapeHtml(fields.email)}</a></td>
      <td>${escapeHtml(fields.phone)}</td>
      <td>${escapeHtml(fields.interestedProduct)}</td>
      <td>${escapeHtml(fields.preferredPlan)}</td>
      <td>${escapeHtml((fields.selectedAddons || []).join(', '))}</td>
      <td>${escapeHtml(fields.message)}</td>
      <td>${renderRecordDetails(record)}</td>
    </tr>`;
  }).join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Patriot Phone CRM Leads</title>
  <style>
    body { color: #172033; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; }
    main { padding: 24px; }
    a { color: #263F73; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border-bottom: 1px solid #d9dee7; padding: 10px; text-align: left; vertical-align: top; }
    th { background: #F4F6F8; color: #263F73; font-size: 12px; text-transform: uppercase; }
    .crm-summary { display: flex; flex-wrap: wrap; gap: 12px; margin: 0 0 20px; }
    .crm-summary div { border: 1px solid #d9dee7; padding: 12px 14px; min-width: 120px; }
    .crm-summary strong { display: block; font-size: 24px; }
    .crm-summary span { color: #526075; font-size: 12px; text-transform: uppercase; }
    summary { cursor: pointer; font-weight: 700; }
    .crm-record-details { min-width: 260px; }
    .crm-record-details h2 { color: #263F73; font-size: 12px; margin: 14px 0 8px; text-transform: uppercase; }
    .crm-detail-row { border-top: 1px solid #edf0f4; display: grid; gap: 8px; grid-template-columns: 120px minmax(0, 1fr); padding: 6px 0; }
    .crm-detail-row dt { color: #526075; font-weight: 700; }
    .crm-detail-row dd { margin: 0; overflow-wrap: anywhere; }
    pre { background: #F4F6F8; border: 1px solid #d9dee7; overflow: auto; padding: 10px; white-space: pre-wrap; }
  </style>
</head>
<body>
  <main>
    <h1>CRM Leads</h1>
    <section class="crm-summary" aria-label="CRM record summary">
      <div><strong>${counts.total}</strong><span>Total records</span></div>
      <div><strong>${counts.leads}</strong><span>Leads</span></div>
      <div><strong>${counts.sales}</strong><span>Sales</span></div>
    </section>
    <p><a href="${escapeHtml(exportHref)}">Export CSV</a></p>
    <table>
      <thead>
        <tr>
          <th>Submitted</th>
          <th>Record</th>
          <th>Type</th>
          <th>Tags</th>
          <th>Order</th>
          <th>Name</th>
          <th>Email</th>
          <th>Phone</th>
          <th>Product</th>
          <th>Plan</th>
          <th>Add-ons</th>
          <th>Message</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="13">No CRM records yet.</td></tr>'}</tbody>
    </table>
  </main>
</body>
</html>`;
}

class MemoryRateLimiter {
  constructor({ limit = 10, windowMs = 60_000 } = {}) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.hits = new Map();
  }

  check(key, now = Date.now()) {
    const windowStart = now - this.windowMs;
    const hits = (this.hits.get(key) || []).filter((timestamp) => timestamp >= windowStart);
    if (hits.length >= this.limit) {
      this.hits.set(key, hits);
      return false;
    }
    hits.push(now);
    this.hits.set(key, hits);
    return true;
  }
}

function parseRequestBody(request) {
  return readRawRequestBody(request).then((bodyBuffer) => {
    const body = bodyBuffer.toString('utf8');
    const contentType = request.headers['content-type'] || '';
    if (contentType.includes('application/json')) {
      return JSON.parse(body || '{}');
    }
    return new URLSearchParams(body);
  });
}

function readRawRequestBody(request, maxBytes = 1_000_000) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;
    request.on('data', (chunk) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += buffer.length;
      if (totalBytes > maxBytes) {
        reject(new Error('request body too large'));
        request.destroy();
        return;
      }
      chunks.push(buffer);
    });
    request.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    request.on('error', reject);
  });
}

function verifyShopifyWebhook(rawBody, hmacHeader, secret) {
  if (!secret || !hmacHeader) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const actualBuffer = Buffer.from(String(hmacHeader).trim(), 'utf8');
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

function importOrderPayloadToCrm(input, options = {}) {
  const rows = extractSetupRows(input);
  const result = saveOrderRowsToCrm(rows, options);
  return {
    rows,
    result,
  };
}

function hasViewerAccess(request, url, viewerToken) {
  if (!viewerToken) return true;
  const header = request.headers.authorization || '';
  return header === `Bearer ${viewerToken}` || url.searchParams.get('token') === viewerToken;
}

function redirect(response, location) {
  response.writeHead(303, { location });
  response.end();
}

function createRequestHandler(options = {}) {
  const storagePath = options.storagePath || DEFAULT_STORAGE_PATH;
  const timeZone = options.timeZone || DEFAULT_TIME_ZONE;
  const viewerToken = options.viewerToken || process.env.CRM_VIEWER_TOKEN || '';
  const rateLimiter = options.rateLimiter || new MemoryRateLimiter();
  const leadWebhookUrls = options.leadWebhookUrls ?? process.env.CRM_LEAD_WEBHOOK_URLS ?? '';
  const saleWebhookUrls = options.saleWebhookUrls ?? process.env.CRM_SALE_WEBHOOK_URLS ?? '';
  const outboundWebhookSecret = options.outboundWebhookSecret ?? process.env.CRM_WEBHOOK_SECRET ?? '';
  const outboundWebhookFetch = options.outboundWebhookFetch || globalThis.fetch;

  return async function requestHandler(request, response) {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

    try {
      if (request.method === 'GET' && url.pathname === '/crm/leads') {
        if (!hasViewerAccess(request, url, viewerToken)) {
          response.writeHead(401, { 'content-type': 'text/plain; charset=utf-8' });
          response.end('Unauthorized');
          return;
        }
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        response.end(renderViewer(readSubmissions(storagePath), {
          exportToken: url.searchParams.get('token') || '',
        }));
        return;
      }

      if (request.method === 'GET' && url.pathname === '/crm/leads.csv') {
        if (!hasViewerAccess(request, url, viewerToken)) {
          response.writeHead(401, { 'content-type': 'text/plain; charset=utf-8' });
          response.end('Unauthorized');
          return;
        }
        response.writeHead(200, {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': 'attachment; filename="patriot-phone-leads.csv"',
        });
        response.end(submissionsToCsv(readSubmissions(storagePath)));
        return;
      }

      if (request.method === 'POST' && url.pathname === '/crm/capture') {
        const ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress || 'unknown';
        if (!rateLimiter.check(String(ip).split(',')[0].trim())) {
          response.writeHead(429, { 'content-type': 'application/json; charset=utf-8' });
          response.end(JSON.stringify({ ok: false, errors: ['rate limit exceeded'] }));
          return;
        }

        const input = await parseRequestBody(request);
        const result = saveSubmission(input, {
          storagePath,
          timeZone,
          ip,
          userAgent: request.headers['user-agent'] || '',
        });

        if (!result.saved) {
          if (result.record.spam) {
            redirect(response, safeRedirectLocation(
              result.record.fields.returnTo || '/',
              result.record.fields.sourceUrl || ''
            ));
            return;
          }
          response.writeHead(400, { 'content-type': 'application/json; charset=utf-8' });
          response.end(JSON.stringify({ ok: false, errors: result.errors }));
          return;
        }

        await dispatchRecordWebhooks('crm.lead.created', [result.record], leadWebhookUrls, {
          secret: outboundWebhookSecret,
          fetchImpl: outboundWebhookFetch,
        });

        redirect(response, safeRedirectLocation(
          result.record.fields.returnTo || '/crm/thanks',
          result.record.fields.sourceUrl || ''
        ));
        return;
      }

      if (request.method === 'POST' && url.pathname === '/crm/orders/import') {
        const orderIngestToken = options.orderIngestToken || process.env.CRM_ORDER_INGEST_TOKEN || '';
        if (!hasViewerAccess(request, url, orderIngestToken)) {
          response.writeHead(401, { 'content-type': 'application/json; charset=utf-8' });
          response.end(JSON.stringify({ ok: false, errors: ['Unauthorized'] }));
          return;
        }
        const input = await parseRequestBody(request);
        const imported = importOrderPayloadToCrm(input, {
          storagePath,
          timeZone,
          userAgent: request.headers['user-agent'] || 'crm-order-import-endpoint',
        });
        const outboundWebhooks = await dispatchRecordWebhooks('crm.sale.created', imported.result.records, saleWebhookUrls, {
          secret: outboundWebhookSecret,
          fetchImpl: outboundWebhookFetch,
        });
        response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
        response.end(JSON.stringify({
          ok: true,
          rows: imported.rows.length,
          imported: imported.result.imported,
          skipped: imported.result.skipped,
          outboundWebhooks,
        }));
        return;
      }

      if (request.method === 'POST' && url.pathname === '/crm/shopify/orders/create') {
        const webhookSecret = options.shopifyOrderWebhookSecret || process.env.SHOPIFY_ORDER_WEBHOOK_SECRET || '';
        if (!webhookSecret) {
          response.writeHead(503, { 'content-type': 'application/json; charset=utf-8' });
          response.end(JSON.stringify({ ok: false, errors: ['Shopify order webhook secret is not configured'] }));
          return;
        }

        const rawBody = await readRawRequestBody(request);
        if (!verifyShopifyWebhook(rawBody, request.headers['x-shopify-hmac-sha256'], webhookSecret)) {
          response.writeHead(401, { 'content-type': 'application/json; charset=utf-8' });
          response.end(JSON.stringify({ ok: false, errors: ['Invalid Shopify webhook signature'] }));
          return;
        }

        let input;
        try {
          input = JSON.parse(rawBody.toString('utf8') || '{}');
        } catch {
          response.writeHead(400, { 'content-type': 'application/json; charset=utf-8' });
          response.end(JSON.stringify({ ok: false, errors: ['Invalid Shopify webhook JSON'] }));
          return;
        }

        const shopDomain = request.headers['x-shopify-shop-domain'] || '';
        const imported = importOrderPayloadToCrm(input, {
          storagePath,
          timeZone,
          userAgent: `shopify-webhook:${request.headers['x-shopify-topic'] || 'orders/create'}`,
          sourceUrl: shopDomain ? `https://${shopDomain}` : '',
        });
        const outboundWebhooks = await dispatchRecordWebhooks('crm.sale.created', imported.result.records, saleWebhookUrls, {
          secret: outboundWebhookSecret,
          fetchImpl: outboundWebhookFetch,
        });
        response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
        response.end(JSON.stringify({
          ok: true,
          rows: imported.rows.length,
          imported: imported.result.imported,
          skipped: imported.result.skipped,
          outboundWebhooks,
        }));
        return;
      }

      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
    } catch (error) {
      response.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ ok: false, errors: [error.message] }));
    }
  };
}

function createServer(options = {}) {
  return http.createServer(createRequestHandler(options));
}

if (require.main === module) {
  const port = Number(process.env.PORT || 8787);
  createServer().listen(port, () => {
    console.log(`Simple CRM listening on http://127.0.0.1:${port}`);
    console.log(`Capture endpoint: http://127.0.0.1:${port}/crm/capture`);
    console.log(`Lead viewer: http://127.0.0.1:${port}/crm/leads`);
  });
}

module.exports = {
  CSV_COLUMNS,
  DEFAULT_STORAGE_PATH,
  FIELD_ALIASES,
  MemoryRateLimiter,
  REVIO_CHECKOUT_LINE_ALLOWLIST,
  createCheckoutHandoffRecord,
  createRequestHandler,
  createServer,
  createOrderCrmRecord,
  createSubmissionRecord,
  createWebhookSignature,
  dispatchOutboundWebhook,
  dispatchRecordWebhooks,
  normalizeFormInput,
  parseWebhookUrls,
  readSubmissions,
  renderViewer,
  recordForWebhook,
  readRawRequestBody,
  safeRedirectLocation,
  saveCheckoutHandoffToCrm,
  saveSubmission,
  saveOrderRowsToCrm,
  saleTypeForSetupRow,
  submissionsToCsv,
  validateCheckoutHandoff,
  validateSubmission,
  verifyShopifyWebhook,
};
