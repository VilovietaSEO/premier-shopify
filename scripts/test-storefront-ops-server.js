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

  const webhookSecret = 'webhook-secret';
  const outboundSecret = 'outbound-secret-for-tests';
  const outboundRequests = [];
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
    revioCheckoutSuccessUrl: '/cart?revio_checkout=received',
    crmOutboundWebhookFetch: async (url, requestOptions) => {
      outboundRequests.push({
        url,
        requestOptions,
        payload: JSON.parse(requestOptions.body),
      });
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
    lead.set('contact[Patriot Package interest]', 'Not sure yet');
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
                'Patriot Package': 'Patriot Package - $250; Classic Phone, 1 year phone service, and all 4 add-ons (saves $303.12)',
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
    assert.match(viewerWithSale.body, /classic_patriot_package_sale/);
    assert.match(viewerWithSale.body, /classic_monthly_addon_sale/);
    assert.match(viewerWithSale.body, /shopify_order/);

    const invalidRevioCheckout = await request(server, '/revio/checkout', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        consent: { privacy_terms_accepted: false },
        setups: [],
        lines: [],
      }),
    });
    assert.equal(invalidRevioCheckout.statusCode, 400);
    assert.match(invalidRevioCheckout.body, /privacy and terms consent is required/);

    const revioCheckoutPayload = {
      schema: 'independence_phone.revio_checkout.v1',
      source: 'shopify-theme-cart',
      source_url: 'https://jordan-mark-premier.myshopify.com/cart',
      consent: {
        privacy_terms_accepted: true,
        policy_agreement: 'Agreed to Privacy Policy and Terms and Conditions',
      },
      cart: {
        token: 'cart-token-ops',
        currency: 'USD',
        item_count: 1,
        total_price_cents: 11776,
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
              quantity: 1,
              unit_price_cents: 10000,
            },
            {
              role: 'service',
              setup_id: 'setup-ops',
              setup_parent: true,
              setup_billing_name: 'Service plan',
              setup_billing_value: 'Monthly service - $17.76/mo',
              title: 'Monthly service',
              shopify_variant_id: 222,
              quantity: 1,
              unit_price_cents: 1776,
            },
          ],
        },
      ],
      lines: [],
    };
    revioCheckoutPayload.lines = revioCheckoutPayload.setups[0].lines;

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
    assert.equal(revioCheckoutResult.redirect_url, '/cart?revio_checkout=received');
    assert.equal(outboundRequests.length, 4);
    assert.equal(outboundRequests[3].url, 'https://hooks.example/revio');
    assert.equal(outboundRequests[3].payload.event, 'revio.checkout.requested');
    assert.equal(outboundRequests[3].payload.record.fields.sourceType, 'revio_checkout_handoff');
    assert.equal(outboundRequests[3].payload.record.fields.preferredPlan, 'Monthly service - $17.76/mo');
    assert.equal(outboundRequests[3].payload.record.meta.cart_token, 'cart-token-ops');
    assert.equal(outboundRequests[3].payload.record.revio_checkout_payload.schema, 'independence_phone.revio_checkout.v1');
    assert.equal(outboundRequests[3].payload.record.revio_checkout_payload.setups[0].setup_id, 'setup-ops');
    assert.match(outboundRequests[3].requestOptions.headers['x-patriot-phone-signature'], /^sha256=/);

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
