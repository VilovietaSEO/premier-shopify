#!/usr/bin/env node

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { createServer, validateProductionConfig } = require('../ops/storefront-ops-server');

const root = path.resolve(__dirname, '..');
const storagePath = path.join(root, 'tmp/storefront-ops-test-submissions.jsonl');
fs.rmSync(storagePath, { force: true });

function request(server, pathname, options = {}) {
  const address = server.address();
  const body = options.body || null;
  const headers = {
    ...(options.headers || {}),
  };

  if (body && !headers['content-length']) headers['content-length'] = Buffer.byteLength(body);

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: address.port,
        path: pathname,
        method: options.method || 'GET',
        headers,
      },
      (response) => {
        let responseBody = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          responseBody += chunk;
        });
        response.on('end', () => {
          resolve({
            statusCode: response.statusCode,
            headers: response.headers,
            body: responseBody,
          });
        });
      }
    );

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function shopifyWebhookHmac(body, secret) {
  return crypto.createHmac('sha256', secret).update(body).digest('base64');
}

function rekeyCheckoutPayload(payload, suffix) {
  const copy = structuredClone(payload);
  const setupId = `setup-${suffix}`;
  copy.cart.token = `cart-token-${suffix}`;
  copy.setups[0].setup_id = setupId;
  copy.setups[0].lines.forEach((line) => {
    line.setup_id = setupId;
  });
  copy.lines.forEach((line) => {
    line.setup_id = setupId;
  });
  return copy;
}

async function main() {
  assert.throws(
    () => validateProductionConfig({ NODE_ENV: 'production' }),
    /CRM_SUBMISSIONS_PATH.*CRM_VIEWER_TOKEN.*CRM_ORDER_INGEST_TOKEN.*SHOPIFY_ORDER_WEBHOOK_SECRET.*LLMS_SITE_URL/
  );
  assert.doesNotThrow(() => validateProductionConfig({
    NODE_ENV: 'production',
    CRM_SUBMISSIONS_PATH: '/opt/patriot-phone/data/crm-submissions.jsonl',
    CRM_VIEWER_TOKEN: '0123456789abcdef01234567',
    CRM_ORDER_INGEST_TOKEN: 'abcdef0123456789abcdef01',
    SHOPIFY_ORDER_WEBHOOK_SECRET: 'fedcba9876543210fedcba98',
    LLMS_SITE_URL: 'https://jordan-mark-premier.myshopify.com',
  }));
  assert.throws(() => validateProductionConfig({
    NODE_ENV: 'production',
    CRM_SUBMISSIONS_PATH: '/opt/patriot-phone/data/crm-submissions.jsonl',
    CRM_VIEWER_TOKEN: '0123456789abcdef01234567',
    CRM_ORDER_INGEST_TOKEN: 'abcdef0123456789abcdef01',
    SHOPIFY_ORDER_WEBHOOK_SECRET: 'fedcba9876543210fedcba98',
    CRM_LEAD_WEBHOOK_URLS: 'https://hooks.example/lead',
    LLMS_SITE_URL: 'https://jordan-mark-premier.myshopify.com',
  }), /CRM_WEBHOOK_SECRET/);
  assert.throws(() => validateProductionConfig({
    NODE_ENV: 'production',
    CRM_SUBMISSIONS_PATH: '/opt/patriot-phone/data/crm-submissions.jsonl',
    CRM_VIEWER_TOKEN: '0123456789abcdef01234567',
    CRM_ORDER_INGEST_TOKEN: 'abcdef0123456789abcdef01',
    SHOPIFY_ORDER_WEBHOOK_SECRET: 'fedcba9876543210fedcba98',
    CRM_SALE_WEBHOOK_URLS: 'ftp://hooks.example/sale',
    CRM_WEBHOOK_SECRET: '0123456789abcdef01234567',
    LLMS_SITE_URL: 'https://jordan-mark-premier.myshopify.com',
  }), /valid CRM_LEAD_WEBHOOK_URLS\/CRM_SALE_WEBHOOK_URLS/);
  assert.throws(() => validateProductionConfig({
    NODE_ENV: 'production',
    CRM_SUBMISSIONS_PATH: '/opt/patriot-phone/data/crm-submissions.jsonl',
    CRM_VIEWER_TOKEN: '0123456789abcdef01234567',
    CRM_ORDER_INGEST_TOKEN: 'abcdef0123456789abcdef01',
    SHOPIFY_ORDER_WEBHOOK_SECRET: 'fedcba9876543210fedcba98',
    REVIO_CHECKOUT_WEBHOOK_URLS: 'https://hooks.example/revio',
    LLMS_SITE_URL: 'https://jordan-mark-premier.myshopify.com',
  }), /REVIO_WEBHOOK_SECRET/);
  assert.throws(() => validateProductionConfig({
    NODE_ENV: 'production',
    CRM_SUBMISSIONS_PATH: '/opt/patriot-phone/data/crm-submissions.jsonl',
    CRM_VIEWER_TOKEN: '0123456789abcdef01234567',
    CRM_ORDER_INGEST_TOKEN: 'abcdef0123456789abcdef01',
    SHOPIFY_ORDER_WEBHOOK_SECRET: 'fedcba9876543210fedcba98',
    LLMS_SITE_URL: 'https://jordan-mark-premier.myshopify.com',
    REVIO_CHECKOUT_QA_MODE: 'true',
  }), /REVIO_CHECKOUT_QA_MODE must be disabled in production/);

  const webhookSecret = 'webhook-secret';
  const outboundSecret = 'outbound-secret-for-tests';
  const outboundRequests = [];
  let revioDeliveryMode = 'success';
  const server = createServer({
    crmStoragePath: storagePath,
    crmViewerToken: 'test-token',
    crmOrderIngestToken: 'order-token',
    shopifyOrderWebhookSecret: webhookSecret,
    crmLeadWebhookUrls: 'https://hooks.example/lead',
    crmSaleWebhookUrls: 'https://hooks.example/sale',
    crmWebhookSecret: outboundSecret,
    revioCheckoutWebhookUrls: 'https://hooks.example/revio',
    revioWebhookSecret: outboundSecret,
    crmOutboundWebhookFetch: async (url, requestOptions) => {
      outboundRequests.push({
        url,
        requestOptions,
        payload: JSON.parse(requestOptions.body),
      });
      if (url === 'https://hooks.example/revio') {
        if (revioDeliveryMode === 'failure') {
          return {
            ok: false,
            status: 503,
            json: async () => ({ error: 'gateway unavailable' }),
          };
        }
        if (revioDeliveryMode === 'no-redirect') {
          return {
            ok: true,
            status: 202,
            json: async () => ({ accepted: true }),
          };
        }
        return {
          ok: true,
          status: 201,
          json: async () => ({
            checkout_url: 'https://checkout.revio.example/session/ops-1',
          }),
        };
      }
      return { ok: true, status: 202 };
    },
    llmsSiteUrl: 'https://jordan-mark-premier.myshopify.com',
    llmsTimeZone: 'America/Denver',
  });

  server.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));

  try {
    const health = await request(server, '/healthz');
    assert.equal(health.statusCode, 200);
    assert.match(health.body, /patriot-phone-storefront-ops/);
    assert.match(health.body, /"leadDestinations":1/);
    assert.match(health.body, /"saleDestinations":1/);
    assert.match(health.body, /"revioCheckoutDestinations":1/);
    assert.match(health.body, /"revioCheckout":"\/revio\/checkout"/);
    assert.match(health.body, /"revioCheckoutQaMode":false/);

    const rootLlms = await request(server, '/llms.txt');
    assert.equal(rootLlms.statusCode, 200);
    assert.equal(rootLlms.headers['content-type'], 'text/plain; charset=utf-8');
    assert.match(rootLlms.body, /^# Independence Phone/);

    const ruggedLlms = await request(server, '/products/rugged-phone/llms.txt');
    assert.equal(ruggedLlms.statusCode, 200);
    assert.match(ruggedLlms.body, /^# Rugged Phone/);

    const faqLlms = await request(server, '/a/llms.txt?path=/pages/faq');
    assert.equal(faqLlms.statusCode, 200);
    assert.match(faqLlms.body, /^# FAQ/);

    const blockedViewer = await request(server, '/crm/leads');
    assert.equal(blockedViewer.statusCode, 401);

    const lead = new URLSearchParams();
    lead.set('crm[source_url]', 'https://jordan-mark-premier.myshopify.com/pages/contact?utm_source=ops-test');
    lead.set('contact[name]', 'Ops Test Parent');
    lead.set('contact[email]', 'ops.parent@example.com');
    lead.set('contact[phone]', '555-0123');
    lead.set('contact[Child age range]', '14-16');
    lead.set('contact[Main use case]', 'Quiet family phone');
    lead.set('contact[Interested product]', 'Classic Phone');
    lead.set('contact[Preferred service plan]', 'Monthly service - $17.76/mo');
    lead.append('contact[Selected add-ons]', 'Quiet Hours');
    lead.append('contact[Selected add-ons]', 'Voicemail to Email');
    lead.set('contact[body]', 'Please send setup details.');
    lead.set('contact[Marketing opt-in]', 'Yes');
    lead.set('contact[Privacy and terms consent]', 'Yes');
    lead.set('crm[return_to]', '/pages/contact?crm=received');

    const capture = await request(server, '/crm/capture', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: lead.toString(),
    });
    assert.equal(capture.statusCode, 303);
    assert.equal(capture.headers.location, 'https://jordan-mark-premier.myshopify.com/pages/contact?crm=received');
    assert.equal(outboundRequests.length, 1);
    assert.equal(outboundRequests[0].url, 'https://hooks.example/lead');
    assert.equal(outboundRequests[0].payload.event, 'crm.lead.created');
    assert.equal(outboundRequests[0].payload.record.fields.recordType, 'lead');
    assert.equal(outboundRequests[0].requestOptions.headers['x-patriot-phone-event'], 'crm.lead.created');
    assert.match(outboundRequests[0].requestOptions.headers['x-patriot-phone-signature'], /^sha256=/);

    const viewer = await request(server, '/crm/leads?token=test-token');
    assert.equal(viewer.statusCode, 200);
    assert.match(viewer.body, /Ops Test Parent/);
    assert.match(viewer.body, /Voicemail to Email/);
    assert.match(viewer.body, /\/crm\/leads\.csv\?token=test-token/);

    const csv = await request(server, '/crm/leads.csv?token=test-token');
    assert.equal(csv.statusCode, 200);
    assert.match(csv.headers['content-type'], /text\/csv/);
    assert.match(csv.body, /Ops Test Parent/);
    assert.match(csv.body, /ops-test/);

    const blockedOrderImport = await request(server, '/crm/orders/import', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ orders: [] }),
    });
    assert.equal(blockedOrderImport.statusCode, 401);

    const orderPayload = {
      orders: [
        {
          id: 301,
          name: '#3001',
          created_at: '2026-06-30T23:00:00-06:00',
          email: 'sale.parent@example.com',
          financial_status: 'paid',
          fulfillment_status: 'unfulfilled',
          line_items: [
            {
              title: 'Classic Phone',
              sku: 'PP-CLASSIC-PHONE',
              quantity: 1,
              properties: {
                Phone: 'Classic Phone - $100',
                'Service plan': 'Annual service - $200/yr (saves $13.12/yr)',
                'Add-on Bundle': 'Add-on Bundle - $10/mo; includes Call Recording, Quiet Hours, Voicemail to Email, and Auto Attendant (saves $10/mo)',
                'Policy agreement': 'Agreed to Privacy Policy and Terms and Conditions',
              },
            },
          ],
        },
      ],
    };
    const orderImport = await request(server, '/crm/orders/import?token=order-token', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(orderPayload),
    });
    assert.equal(orderImport.statusCode, 200);
    assert.match(orderImport.body, /"imported":1/);
    assert.match(orderImport.body, /"outboundWebhooks"/);
    assert.equal(outboundRequests.length, 2);
    assert.equal(outboundRequests[1].url, 'https://hooks.example/sale');
    assert.equal(outboundRequests[1].payload.event, 'crm.sale.created');
    assert.equal(outboundRequests[1].payload.record.fields.recordType, 'sale');
    assert.equal(
      outboundRequests[1].payload.record.fields.preferredPlan,
      'Annual service - $200/yr (saves $13.12/yr)',
    );
    assert.equal(Object.prototype.hasOwnProperty.call(
      outboundRequests[1].payload.record.fields,
      'patriotPackageInterest',
    ), false);

    const webhookOrder = {
      id: 302,
      name: '#3002',
      created_at: '2026-06-30T23:05:00-06:00',
      email: 'webhook.sale.parent@example.com',
      financial_status: 'paid',
      fulfillment_status: 'unfulfilled',
      line_items: [
        {
          title: 'Classic Phone',
          sku: 'PP-CLASSIC-PHONE',
          quantity: 1,
          properties: {
            Phone: 'Classic Phone - $100',
            'Service plan': 'Monthly service - $17.76/mo',
            'Call Recording': 'Call Recording - $5/mo',
            'Quiet Hours': 'Quiet Hours - $5/mo',
            'Voicemail to Email': 'Voicemail to Email - $5/mo',
            'Policy agreement': 'Agreed to Privacy Policy and Terms and Conditions',
          },
        },
      ],
    };
    const webhookBody = JSON.stringify(webhookOrder);
    const blockedWebhook = await request(server, '/crm/shopify/orders/create', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-shopify-hmac-sha256': 'not-valid',
        'x-shopify-topic': 'orders/create',
        'x-shopify-shop-domain': 'jordan-mark-premier.myshopify.com',
      },
      body: webhookBody,
    });
    assert.equal(blockedWebhook.statusCode, 401);

    const orderWebhook = await request(server, '/crm/shopify/orders/create', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-shopify-hmac-sha256': shopifyWebhookHmac(webhookBody, webhookSecret),
        'x-shopify-topic': 'orders/create',
        'x-shopify-shop-domain': 'jordan-mark-premier.myshopify.com',
      },
      body: webhookBody,
    });
    assert.equal(orderWebhook.statusCode, 200);
    assert.match(orderWebhook.body, /"imported":1/);
    assert.match(orderWebhook.body, /"outboundWebhooks"/);
    assert.equal(outboundRequests.length, 3);
    assert.equal(outboundRequests[2].url, 'https://hooks.example/sale');
    assert.equal(outboundRequests[2].payload.event, 'crm.sale.created');
    assert.equal(outboundRequests[2].payload.record.fields.email, 'webhook.sale.parent@example.com');

    const viewerWithSale = await request(server, '/crm/leads?token=test-token');
    assert.match(viewerWithSale.body, /phone_setup_sale/);
    assert.match(viewerWithSale.body, /classic_monthly_addon_sale/);
    assert.doesNotMatch(viewerWithSale.body, /patriot.package/i);
    assert.match(viewerWithSale.body, /shopify_order/);

    const invalidRevioCheckout = await request(server, '/revio/checkout', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        schema: 'independence_phone.revio_checkout.v1',
        consent: {
          collection_status: 'complete',
          privacy_terms_accepted: true,
        },
        customer: {
          desired_area_code: '615',
          desired_area_code_collection_status: 'complete',
        },
        setups: [],
        lines: [],
      }),
    });
    assert.equal(invalidRevioCheckout.statusCode, 400);
    assert.match(invalidRevioCheckout.body, /schema must be independence_phone\.revio_checkout\.v2/);
    assert.match(invalidRevioCheckout.body, /pending_checkout/);
    assert.match(invalidRevioCheckout.body, /required_at_checkout/);

    const revioCheckoutPayload = {
      schema: 'independence_phone.revio_checkout.v2',
      source: 'shopify-theme-cart',
      source_url: 'https://jordan-mark-premier.myshopify.com/cart',
      consent: {
        collection_status: 'pending_checkout',
        privacy_terms_accepted: null,
      },
      customer: {
        desired_area_code: null,
        desired_area_code_collection_status: 'required_at_checkout',
      },
      cart: {
        token: 'cart-token-ops',
        currency: 'USD',
        item_count: 1,
        raw_item_count: 2,
        immediate_subtotal_cents: 10000,
        flat_shipping_cents: 1500,
        tax_cents: null,
        tax_status: 'calculated_after_address',
        due_today_before_tax_cents: 11500,
        future_charge_cents: 1776,
        first_bill_rule: 'first_day_of_next_month',
        shopify_total_price_cents: 10000,
      },
      setup_count: 1,
      setups: [
        {
          setup_id: 'setup-ops',
          quantity: 1,
          lines: [
            {
              role: 'phone',
              setup_id: 'setup-ops',
              setup_parent: false,
              title: 'Classic Phone',
              shopify_variant_id: 111,
              shopify_handle: 'standard-phone',
              sku: 'PP-CLASSIC-PHONE',
              quantity: 1,
              checkout_price_cents: 10000,
              checkout_line_price_cents: 10000,
              future_charge_cents: 0,
              future_line_charge_cents: 0,
              billing_cadence: '',
              first_bill_rule: '',
              requires_shipping: true,
              taxable: true,
              visible_properties: [],
            },
            {
              role: 'service',
              setup_id: 'setup-ops',
              setup_parent: true,
              setup_billing_name: 'Service plan',
              setup_billing_value: 'Monthly service - $17.76/mo',
              title: 'Monthly service',
              shopify_variant_id: 222,
              shopify_handle: 'monthly-service',
              sku: 'PP-MONTHLY-SERVICE',
              quantity: 1,
              checkout_price_cents: 0,
              checkout_line_price_cents: 0,
              future_charge_cents: 1776,
              future_line_charge_cents: 1776,
              billing_cadence: 'monthly',
              first_bill_rule: 'first_day_of_next_month',
              requires_shipping: false,
              taxable: false,
              visible_properties: [
                { name: 'Future charge', value: '$17.76/mo' },
                { name: 'Billing begins', value: 'First day of the following month' },
              ],
            },
          ],
        },
      ],
      lines: [],
      ungrouped_lines: [],
    };
    revioCheckoutPayload.lines = revioCheckoutPayload.setups[0].lines.map((line) => structuredClone(line));

    const revioCheckout = await request(server, '/revio/checkout', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(revioCheckoutPayload),
    });
    assert.equal(revioCheckout.statusCode, 200);
    const revioCheckoutResult = JSON.parse(revioCheckout.body);
    assert.equal(revioCheckoutResult.ok, true);
    assert.equal(revioCheckoutResult.event, 'revio.checkout.requested');
    assert.equal(revioCheckoutResult.saved, true);
    assert.equal(revioCheckoutResult.redirect_url, 'https://checkout.revio.example/session/ops-1');
    assert.equal(revioCheckoutResult.qa_mode, false);
    assert.equal(outboundRequests.length, 4);
    assert.equal(outboundRequests[3].url, 'https://hooks.example/revio');
    assert.equal(outboundRequests[3].payload.event, 'revio.checkout.requested');
    assert.equal(outboundRequests[3].payload.record.fields.sourceType, 'revio_checkout_handoff');
    assert.equal(outboundRequests[3].payload.record.fields.preferredPlan, 'Monthly service - $17.76/mo');
    assert.equal(outboundRequests[3].payload.record.fields.privacyTermsConsent, null);
    assert.equal(outboundRequests[3].payload.record.meta.cart_token, 'cart-token-ops');
    assert.equal(outboundRequests[3].payload.record.meta.due_today_before_tax_cents, 11500);
    assert.equal(outboundRequests[3].payload.record.meta.future_charge_cents, 1776);
    assert.equal(outboundRequests[3].payload.record.meta.consent_collection_status, 'pending_checkout');
    assert.equal(
      outboundRequests[3].payload.record.meta.desired_area_code_collection_status,
      'required_at_checkout',
    );
    assert.equal(outboundRequests[3].payload.record.revio_checkout_payload.schema, 'independence_phone.revio_checkout.v2');
    assert.equal(outboundRequests[3].payload.record.revio_checkout_payload.setups[0].setup_id, 'setup-ops');
    assert.equal(outboundRequests[3].payload.record.revio_checkout_payload.lines[1].checkout_price_cents, 0);
    assert.equal(outboundRequests[3].payload.record.revio_checkout_payload.lines[1].future_charge_cents, 1776);
    assert.match(outboundRequests[3].requestOptions.headers['x-patriot-phone-signature'], /^sha256=/);

    revioDeliveryMode = 'failure';
    const failedDelivery = await request(server, '/revio/checkout', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(rekeyCheckoutPayload(revioCheckoutPayload, 'failed-delivery')),
    });
    assert.equal(failedDelivery.statusCode, 502);
    assert.match(failedDelivery.body, /No Rev\.io checkout destination accepted the request/);
    assert.match(failedDelivery.body, /"saved":true/);

    revioDeliveryMode = 'no-redirect';
    const retryPayload = rekeyCheckoutPayload(revioCheckoutPayload, 'missing-redirect');
    const missingRedirect = await request(server, '/revio/checkout', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(retryPayload),
    });
    assert.equal(missingRedirect.statusCode, 502);
    assert.match(missingRedirect.body, /valid HTTPS checkout redirect/);
    assert.match(missingRedirect.body, /"saved":true/);

    revioDeliveryMode = 'success';
    const recoveredRetry = await request(server, '/revio/checkout', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(retryPayload),
    });
    assert.equal(recoveredRetry.statusCode, 200);
    assert.match(recoveredRetry.body, /"saved":false/);
    assert.match(recoveredRetry.body, /"skipped":true/);
    assert.match(recoveredRetry.body, /https:\/\/checkout\.revio\.example\/session\/ops-1/);

    const noDestinationStoragePath = path.join(root, 'tmp/storefront-ops-no-destination-test.jsonl');
    fs.rmSync(noDestinationStoragePath, { force: true });
    const noDestinationServer = createServer({
      crmStoragePath: noDestinationStoragePath,
      skipProductionValidation: true,
      llmsSiteUrl: 'https://jordan-mark-premier.myshopify.com',
    });
    noDestinationServer.listen(0, '127.0.0.1');
    await new Promise((resolve) => noDestinationServer.once('listening', resolve));
    try {
      const noDestination = await request(noDestinationServer, '/revio/checkout', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(rekeyCheckoutPayload(revioCheckoutPayload, 'no-destination')),
      });
      assert.equal(noDestination.statusCode, 503);
      assert.match(noDestination.body, /not configured with an outbound destination/);
      assert.equal(fs.existsSync(noDestinationStoragePath), false);
    } finally {
      await new Promise((resolve) => noDestinationServer.close(resolve));
    }

    const qaStoragePath = path.join(root, 'tmp/storefront-ops-qa-capture-test.jsonl');
    fs.rmSync(qaStoragePath, { force: true });
    const qaServer = createServer({
      crmStoragePath: qaStoragePath,
      revioCheckoutQaMode: true,
      revioCheckoutSuccessUrl: '/cart?revio_checkout=qa-captured',
      skipProductionValidation: true,
      llmsSiteUrl: 'https://jordan-mark-premier.myshopify.com',
    });
    qaServer.listen(0, '127.0.0.1');
    await new Promise((resolve) => qaServer.once('listening', resolve));
    try {
      const qaCapture = await request(qaServer, '/revio/checkout', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(rekeyCheckoutPayload(revioCheckoutPayload, 'qa-capture')),
      });
      assert.equal(qaCapture.statusCode, 200);
      const qaResult = JSON.parse(qaCapture.body);
      assert.equal(qaResult.ok, true);
      assert.equal(qaResult.saved, true);
      assert.equal(qaResult.qa_mode, true);
      assert.equal(qaResult.redirect_url, '/cart?revio_checkout=qa-captured');
    } finally {
      await new Promise((resolve) => qaServer.close(resolve));
    }

    const viewerWithRevio = await request(server, '/crm/leads?token=test-token');
    assert.match(viewerWithRevio.body, /revio_checkout_handoff/);
    assert.match(viewerWithRevio.body, /Monthly service - \$17\.76\/mo/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  console.log('Storefront ops proof passed: health, CRM lead/sale capture/view/export, Rev.io checkout handoff, outbound webhooks, Shopify order webhook, storefront return redirect, and automatic llms routes verified.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
