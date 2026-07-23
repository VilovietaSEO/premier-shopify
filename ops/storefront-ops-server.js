const http = require('node:http');
const path = require('node:path');

const crm = require('../crm/simple-crm');
const llms = require('../llms/automatic-llms');

const DEFAULT_STORAGE_PATH =
  process.env.CRM_SUBMISSIONS_PATH || path.resolve(process.cwd(), 'tmp/crm-submissions.jsonl');

function configuredWebhookCount(value) {
  return String(value || '').split(/[\n,]+/).map((item) => item.trim()).filter(Boolean).length;
}

function parseList(value) {
  return String(value || '').split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);
}

function booleanSetting(value) {
  return value === true || ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
}

function httpsCheckoutRedirect(value) {
  try {
    const url = new URL(String(value || '').trim());
    return url.protocol === 'https:' && url.hostname ? url.href : '';
  } catch {
    return '';
  }
}

function validateProductionConfig(env = process.env) {
  if (env.NODE_ENV !== 'production') return;

  const missing = [];
  if (!env.CRM_SUBMISSIONS_PATH) missing.push('CRM_SUBMISSIONS_PATH');
  if (!env.CRM_VIEWER_TOKEN || env.CRM_VIEWER_TOKEN.length < 24) {
    missing.push('CRM_VIEWER_TOKEN with at least 24 characters');
  }
  if (!env.CRM_ORDER_INGEST_TOKEN || env.CRM_ORDER_INGEST_TOKEN.length < 24) {
    missing.push('CRM_ORDER_INGEST_TOKEN with at least 24 characters');
  }
  if (!env.SHOPIFY_ORDER_WEBHOOK_SECRET || env.SHOPIFY_ORDER_WEBHOOK_SECRET.length < 24) {
    missing.push('SHOPIFY_ORDER_WEBHOOK_SECRET with at least 24 characters');
  }
  if (!env.LLMS_SITE_URL || !/^https:\/\//.test(env.LLMS_SITE_URL)) {
    missing.push('LLMS_SITE_URL with an https:// URL');
  }
  if (booleanSetting(env.REVIO_CHECKOUT_QA_MODE)) {
    missing.push('REVIO_CHECKOUT_QA_MODE must be disabled in production');
  }

  const outboundWebhookUrls = [env.CRM_LEAD_WEBHOOK_URLS, env.CRM_SALE_WEBHOOK_URLS].filter(Boolean).join('\n');
  if (outboundWebhookUrls) {
    try {
      crm.parseWebhookUrls(outboundWebhookUrls);
    } catch (error) {
      missing.push(`valid CRM_LEAD_WEBHOOK_URLS/CRM_SALE_WEBHOOK_URLS (${error.message})`);
    }
    if (!env.CRM_WEBHOOK_SECRET || env.CRM_WEBHOOK_SECRET.length < 24) {
      missing.push('CRM_WEBHOOK_SECRET with at least 24 characters when outbound CRM webhooks are configured');
    }
  }

  if (env.REVIO_CHECKOUT_WEBHOOK_URLS) {
    try {
      crm.parseWebhookUrls(env.REVIO_CHECKOUT_WEBHOOK_URLS);
    } catch (error) {
      missing.push(`valid REVIO_CHECKOUT_WEBHOOK_URLS (${error.message})`);
    }
    const revioSecret = env.REVIO_WEBHOOK_SECRET || env.CRM_WEBHOOK_SECRET || '';
    if (revioSecret.length < 24) {
      missing.push('REVIO_WEBHOOK_SECRET or CRM_WEBHOOK_SECRET with at least 24 characters when Rev.io checkout webhooks are configured');
    }
  }

  if (env.REVIO_CHECKOUT_ALLOWED_ORIGINS) {
    for (const origin of parseList(env.REVIO_CHECKOUT_ALLOWED_ORIGINS)) {
      try {
        const parsed = new URL(origin);
        if (parsed.protocol !== 'https:') throw new Error('origin must use https');
      } catch (error) {
        missing.push(`valid REVIO_CHECKOUT_ALLOWED_ORIGINS (${origin}: ${error.message})`);
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(`Production storefront ops config is incomplete: ${missing.join(', ')}`);
  }
}

function isLlmsPath(url) {
  return url.pathname === '/llms.txt' || url.pathname === '/a/llms.txt' || url.pathname.endsWith('/llms.txt');
}

function jsonResponse(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(JSON.stringify(payload));
}

function jsonResponseWithHeaders(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...headers,
  });
  response.end(JSON.stringify(payload));
}

function revioCorsHeaders(request, allowedOrigins) {
  const origin = request.headers.origin || '';
  if (!origin || !allowedOrigins.includes(origin)) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, accept',
    'vary': 'Origin',
  };
}

function createRequestHandler(options = {}) {
  if (!options.skipProductionValidation) validateProductionConfig(options.env || process.env);

  const leadWebhookUrls = options.crmLeadWebhookUrls ?? process.env.CRM_LEAD_WEBHOOK_URLS ?? '';
  const saleWebhookUrls = options.crmSaleWebhookUrls ?? process.env.CRM_SALE_WEBHOOK_URLS ?? '';
  const revioCheckoutWebhookUrls = options.revioCheckoutWebhookUrls ?? process.env.REVIO_CHECKOUT_WEBHOOK_URLS ?? '';
  const revioWebhookSecret =
    options.revioWebhookSecret || process.env.REVIO_WEBHOOK_SECRET || options.crmWebhookSecret || process.env.CRM_WEBHOOK_SECRET || '';
  const revioCheckoutSuccessUrl = options.revioCheckoutSuccessUrl ?? process.env.REVIO_CHECKOUT_SUCCESS_URL ?? '';
  const revioCheckoutQaMode = booleanSetting(
    options.revioCheckoutQaMode ?? process.env.REVIO_CHECKOUT_QA_MODE ?? false,
  );
  const revioAllowedOrigins = parseList(options.revioCheckoutAllowedOrigins ?? process.env.REVIO_CHECKOUT_ALLOWED_ORIGINS ?? '');
  const revioRateLimiter = options.revioCheckoutRateLimiter || new crm.MemoryRateLimiter({ limit: 20, windowMs: 60_000 });
  const crmStoragePath = options.crmStoragePath || DEFAULT_STORAGE_PATH;
  const crmTimeZone = options.crmTimeZone || process.env.CRM_STORE_TIMEZONE || 'America/Denver';
  const outboundWebhookFetch = options.crmOutboundWebhookFetch || options.outboundWebhookFetch;

  const crmHandler = crm.createRequestHandler({
    storagePath: crmStoragePath,
    timeZone: crmTimeZone,
    viewerToken: options.crmViewerToken || process.env.CRM_VIEWER_TOKEN || '',
    orderIngestToken: options.crmOrderIngestToken || process.env.CRM_ORDER_INGEST_TOKEN || '',
    shopifyOrderWebhookSecret: options.shopifyOrderWebhookSecret || process.env.SHOPIFY_ORDER_WEBHOOK_SECRET || '',
    leadWebhookUrls,
    saleWebhookUrls,
    outboundWebhookSecret: options.crmWebhookSecret || process.env.CRM_WEBHOOK_SECRET || '',
    outboundWebhookFetch,
  });

  const llmsHandler = llms.createRequestHandler({
    siteUrl: options.llmsSiteUrl || process.env.LLMS_SITE_URL || 'https://jordan-mark-premier.myshopify.com',
    timeZone: options.llmsTimeZone || process.env.LLMS_TIME_ZONE || 'America/Denver',
  });

  return async function requestHandler(request, response) {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

    if (request.method === 'GET' && url.pathname === '/healthz') {
      jsonResponse(response, 200, {
        ok: true,
        service: 'patriot-phone-storefront-ops',
        crm: '/crm/capture',
        shopifyOrderWebhook: '/crm/shopify/orders/create',
        outboundWebhooks: {
          leadDestinations: configuredWebhookCount(leadWebhookUrls),
          saleDestinations: configuredWebhookCount(saleWebhookUrls),
          revioCheckoutDestinations: configuredWebhookCount(revioCheckoutWebhookUrls),
        },
        revioCheckout: '/revio/checkout',
        revioCheckoutQaMode,
        llms: '/llms.txt',
      });
      return;
    }

    if (url.pathname === '/revio/checkout') {
      const corsHeaders = revioCorsHeaders(request, revioAllowedOrigins);

      if (request.method === 'OPTIONS') {
        response.writeHead(204, {
          ...corsHeaders,
          'cache-control': 'no-store',
        });
        response.end();
        return;
      }

      if (request.method !== 'POST') {
        jsonResponseWithHeaders(response, 405, { ok: false, errors: ['method not allowed'] }, corsHeaders);
        return;
      }

      const ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress || 'unknown';
      if (!revioRateLimiter.check(String(ip).split(',')[0].trim())) {
        jsonResponseWithHeaders(response, 429, { ok: false, errors: ['rate limit exceeded'] }, corsHeaders);
        return;
      }

      let payload;
      try {
        const rawBody = await crm.readRawRequestBody(request);
        payload = JSON.parse(rawBody.toString('utf8') || '{}');
      } catch {
        jsonResponseWithHeaders(response, 400, { ok: false, errors: ['invalid checkout JSON'] }, corsHeaders);
        return;
      }

      const revioDestinationCount = configuredWebhookCount(revioCheckoutWebhookUrls);
      if (!revioCheckoutQaMode && revioDestinationCount === 0) {
        jsonResponseWithHeaders(response, 503, {
          ok: false,
          errors: ['Rev.io checkout is not configured with an outbound destination'],
        }, corsHeaders);
        return;
      }

      const result = crm.saveCheckoutHandoffToCrm(payload, {
        storagePath: crmStoragePath,
        timeZone: crmTimeZone,
        ip,
        userAgent: request.headers['user-agent'] || 'revio-checkout-handoff',
      });

      if (result.errors.length > 0) {
        jsonResponseWithHeaders(response, 400, { ok: false, errors: result.errors }, corsHeaders);
        return;
      }

      const outboundWebhooks = revioDestinationCount > 0
        ? await crm.dispatchRecordWebhooks('revio.checkout.requested', [result.record], revioCheckoutWebhookUrls, {
            secret: revioWebhookSecret,
            fetchImpl: outboundWebhookFetch,
          })
        : [];
      const successfulDeliveries = outboundWebhooks.filter((delivery) => delivery.ok);
      const deliveryRedirect = successfulDeliveries
        .map((delivery) => httpsCheckoutRedirect(delivery.checkoutUrl))
        .find(Boolean) || '';
      const configuredRedirect = httpsCheckoutRedirect(revioCheckoutSuccessUrl);

      if (!revioCheckoutQaMode && successfulDeliveries.length === 0) {
        jsonResponseWithHeaders(response, 502, {
          ok: false,
          errors: ['No Rev.io checkout destination accepted the request'],
          record_id: result.record.id,
          saved: result.saved,
          skipped: result.skipped,
          outboundWebhooks,
        }, corsHeaders);
        return;
      }

      const redirectUrl = deliveryRedirect
        || configuredRedirect
        || (revioCheckoutQaMode ? String(revioCheckoutSuccessUrl || '').trim() : '');
      if (!revioCheckoutQaMode && !redirectUrl) {
        jsonResponseWithHeaders(response, 502, {
          ok: false,
          errors: ['Rev.io checkout did not return a valid HTTPS checkout redirect'],
          record_id: result.record.id,
          saved: result.saved,
          skipped: result.skipped,
          outboundWebhooks,
        }, corsHeaders);
        return;
      }

      jsonResponseWithHeaders(response, 200, {
        ok: true,
        event: 'revio.checkout.requested',
        record_id: result.record.id,
        saved: result.saved,
        skipped: result.skipped,
        outboundWebhooks,
        redirect_url: redirectUrl,
        qa_mode: revioCheckoutQaMode,
      }, corsHeaders);
      return;
    }

    if (url.pathname.startsWith('/crm/')) {
      crmHandler(request, response);
      return;
    }

    if (isLlmsPath(url)) {
      llmsHandler(request, response);
      return;
    }

    jsonResponse(response, 404, {
      ok: false,
      error: 'not found',
    });
  };
}

function createServer(options = {}) {
  return http.createServer(createRequestHandler(options));
}

if (require.main === module) {
  validateProductionConfig();
  const port = Number(process.env.PORT || 8786);
  createServer().listen(port, () => {
    console.log(`Storefront ops server listening on http://127.0.0.1:${port}`);
    console.log(`Health: http://127.0.0.1:${port}/healthz`);
    console.log(`CRM capture: http://127.0.0.1:${port}/crm/capture`);
    console.log(`CRM viewer: http://127.0.0.1:${port}/crm/leads`);
    console.log(`LLMS root: http://127.0.0.1:${port}/llms.txt`);
  });
}

module.exports = {
  DEFAULT_STORAGE_PATH,
  configuredWebhookCount,
  createRequestHandler,
  createServer,
  isLlmsPath,
  validateProductionConfig,
};
