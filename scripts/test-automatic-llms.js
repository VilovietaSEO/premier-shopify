#!/usr/bin/env node

const assert = require('node:assert/strict');
const http = require('node:http');
const {
  buildManifest,
  createServer,
  renderEntryLlmsTxt,
  renderRootLlmsTxt,
  routeToEntry,
} = require('../llms/automatic-llms');

async function request(server, path) {
  const address = server.address();
  const url = `http://127.0.0.1:${address.port}${path}`;

  return new Promise((resolve, reject) => {
    http.get(url, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        resolve({
          statusCode: response.statusCode,
          headers: response.headers,
          body,
        });
      });
    }).on('error', reject);
  });
}

async function main() {
  const manifest = buildManifest({
    siteUrl: 'https://jordan-mark-premier.myshopify.com',
    now: '2026-06-30T20:30:00.000Z',
    timeZone: 'America/Denver',
  });

  const root = renderRootLlmsTxt(manifest);
  assert.match(root, /^# Independence Phone/);
  assert.match(root, /> A family phone without apps, a web browser, social feeds, or the open internet\./);
  assert.match(root, /Website: https:\/\/jordan-mark-premier\.myshopify\.com/);
  assert.match(root, /Generated: 2026-06-30T20:30:00/);
  assert.match(root, /## Pages/);
  assert.match(root, /\[Home\]\(https:\/\/jordan-mark-premier\.myshopify\.com\/\)/);
  assert.match(root, /\[Order Now\]\(https:\/\/jordan-mark-premier\.myshopify\.com\/collections\/all\)/);
  assert.match(root, /## Products/);
  assert.match(root, /\[Classic Phone\]\(https:\/\/jordan-mark-premier\.myshopify\.com\/products\/standard-phone\): \$100/);
  assert.match(root, /\[Rugged Phone\]\(https:\/\/jordan-mark-premier\.myshopify\.com\/products\/rugged-phone\): \$150/);
  assert.match(root, /## Claims Discipline/);
  assert.doesNotMatch(root, /\/pages\/llms/);

  const standard = routeToEntry(manifest, '/products/standard-phone');
  assert.equal(standard.title, 'Classic Phone');
  const standardText = renderEntryLlmsTxt(manifest, standard);
  assert.match(standardText, /^# Classic Phone/);
  assert.match(standardText, /URL: https:\/\/jordan-mark-premier\.myshopify\.com\/products\/standard-phone/);
  assert.match(standardText, /## Price\n\n\$100/);
  assert.match(standardText, /Heavy-duty cordless Wi-Fi handset with charging base/);

  const rugged = routeToEntry(manifest, '/products/rugged-phone');
  assert.equal(rugged.title, 'Rugged Phone');
  const ruggedText = renderEntryLlmsTxt(manifest, rugged);
  assert.match(ruggedText, /^# Rugged Phone/);
  assert.match(ruggedText, /URL: https:\/\/jordan-mark-premier\.myshopify\.com\/products\/rugged-phone/);
  assert.match(ruggedText, /## Price\n\n\$150/);

  const collection = routeToEntry(manifest, '/collections/all');
  assert.equal(collection.title, 'Order Now');
  const collectionText = renderEntryLlmsTxt(manifest, collection);
  assert.match(collectionText, /^# Order Now/);
  assert.match(collectionText, /Primary product-selection route/);

  const server = createServer({
    siteUrl: 'https://jordan-mark-premier.myshopify.com',
    now: '2026-06-30T20:30:00.000Z',
    timeZone: 'America/Denver',
  });

  server.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));

  try {
    const rootResponse = await request(server, '/llms.txt');
    assert.equal(rootResponse.statusCode, 200);
    assert.equal(rootResponse.headers['content-type'], 'text/plain; charset=utf-8');
    assert.match(rootResponse.body, /^# Independence Phone/);

    const appProxyResponse = await request(server, '/a/llms.txt');
    assert.equal(appProxyResponse.statusCode, 200);
    assert.match(appProxyResponse.body, /^# Independence Phone/);

    const productResponse = await request(server, '/products/standard-phone/llms.txt');
    assert.equal(productResponse.statusCode, 200);
    assert.match(productResponse.body, /^# Classic Phone/);

    const ruggedResponse = await request(server, '/products/rugged-phone/llms.txt');
    assert.equal(ruggedResponse.statusCode, 200);
    assert.match(ruggedResponse.body, /^# Rugged Phone/);

    const queryResponse = await request(server, '/a/llms.txt?path=/pages/faq');
    assert.equal(queryResponse.statusCode, 200);
    assert.match(queryResponse.body, /^# FAQ/);

    const missingResponse = await request(server, '/not-real/llms.txt');
    assert.equal(missingResponse.statusCode, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  console.log('Automatic llms.txt proof passed: root, app proxy, product, collection, page, content type, and missing route verified.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
