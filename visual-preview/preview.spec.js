const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const {
  childFirstGroupedCart,
  emptyCart,
  groupedCartFromPayload,
} = require('./fixtures/grouped-cart');

const repoRoot = path.resolve(__dirname, '..');
let baseUrl = process.env.PREVIEW_URL || '';
let previewServer;
const screenshotDir = path.join(__dirname, 'screenshots');
const reportDir = path.join(__dirname, 'reports');

fs.mkdirSync(screenshotDir, { recursive: true });
fs.mkdirSync(reportDir, { recursive: true });

const viewports = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'wide-2300x1200', width: 2300, height: 1200 },
  { name: 'tablet-768x1024', width: 768, height: 1024 },
  { name: 'mobile-390x844', width: 390, height: 844 },
  { name: 'mobile-430x932', width: 430, height: 932 },
];

const balanceViewports = [
  viewports[0],
  { name: 'tablet-900x1000', width: 900, height: 1000 },
  viewports[2],
  viewports[3],
  viewports[4],
];

const routeUrl = (route) => {
  const [rawUrl] = baseUrl.split('#');
  const url = new URL(rawUrl);
  url.searchParams.set('route', route);
  return url.href;
};

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

const serveFile = (request, response, filePath) => {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  const size = fs.statSync(filePath).size;
  const contentType = mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
  const range = request.headers.range;

  if (range && contentType === 'video/mp4') {
    const match = range.match(/bytes=(\d+)-(\d*)/);
    const start = Number(match?.[1] || 0);
    const requestedEnd = match?.[2] ? Number(match[2]) : size - 1;
    const end = Math.min(requestedEnd, size - 1);
    response.writeHead(206, {
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Type': contentType,
    });
    fs.createReadStream(filePath, { start, end }).pipe(response);
    return;
  }

  response.writeHead(200, {
    'Accept-Ranges': 'bytes',
    'Content-Length': size,
    'Content-Type': contentType,
  });
  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  fs.createReadStream(filePath).pipe(response);
};

const startPreviewServer = () => new Promise((resolve, reject) => {
  previewServer = http.createServer((request, response) => {
    const requestUrl = new URL(request.url, 'http://127.0.0.1');
    const previewRoute = requestUrl.pathname === '/cart' || requestUrl.pathname === '/pages/order-now';
    const requestedPath = previewRoute
      ? path.join(__dirname, 'index.html')
      : path.resolve(repoRoot, `.${decodeURIComponent(requestUrl.pathname)}`);

    if (!requestedPath.startsWith(repoRoot)) {
      response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Forbidden');
      return;
    }

    serveFile(request, response, requestedPath);
  });
  previewServer.once('error', reject);
  previewServer.listen(0, '127.0.0.1', () => {
    const address = previewServer.address();
    baseUrl = `http://127.0.0.1:${address.port}/visual-preview/index.html`;
    resolve();
  });
});

test.beforeAll(async () => {
  if (!baseUrl) await startPreviewServer();
});

test.afterAll(async () => {
  if (!previewServer) return;
  await new Promise((resolve) => previewServer.close(resolve));
});

async function openPreviewRoute(page, route) {
  await page.goto(routeUrl(route), { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-preview-route', route);
}

async function triggerLazyImages(page) {
  await page.evaluate(async () => {
    for (let y = 0; y <= document.documentElement.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    window.scrollTo(0, 0);
  });
}

async function collectRouteReport(page) {
  return page.evaluate(() => {
    const isVisible = (element) => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      return element.offsetParent !== null && rect.width > 0 && rect.height > 0;
    };

    const overflowing = [...document.querySelectorAll('body *')]
      .filter((element) => isVisible(element))
      .filter((element) => !element.closest('img, svg, video, .ip-matrix, .ip-capability'))
      .filter((element) => !element.closest('.ip-cart__totals'))
      .filter((element) => {
        const overflowX = getComputedStyle(element).overflowX;
        return overflowX !== 'hidden' && overflowX !== 'clip';
      })
      .filter((element) => element.scrollWidth > element.clientWidth + 2)
      .slice(0, 20)
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        className: element.className || '',
        text: (element.textContent || '').trim().slice(0, 80),
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
      }));

    const visibleImages = [...document.images].filter((image) => isVisible(image));
    const brokenImages = visibleImages
      .filter((image) => image.naturalWidth === 0 || image.naturalHeight === 0)
      .map((image) => ({
        src: image.getAttribute('src'),
        alt: image.getAttribute('alt') || '',
      }));

    return {
      route: document.documentElement.dataset.previewRoute,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      layoutShiftScore: Number(window.__ipLayoutShiftScore || 0),
      bodyScrollWidth: document.documentElement.scrollWidth,
      bodyClientWidth: document.documentElement.clientWidth,
      visibleSlots: [...document.querySelectorAll('[data-slot]')]
        .filter((element) => isVisible(element))
        .map((element) => element.dataset.slot),
      heroVideoCount: [...document.querySelectorAll('.ip-hero video.ip-hero__video')].filter(isVisible).length,
      visibleFeatureCount: [...document.querySelectorAll('.ip-feature-strip .ip-strip__item')].filter(isVisible).length,
      visibleProductFormCount: [...document.querySelectorAll('.ip-product-form')].filter(isVisible).length,
      visibleOrderBuilderCount: [...document.querySelectorAll('[data-order-builder]')].filter(isVisible).length,
      visibleOrderPackageCount: [...document.querySelectorAll('[data-order-package]')].filter(isVisible).length,
      visibleOrderPhoneCount: [...document.querySelectorAll('[data-order-phone]')].filter(isVisible).length,
      visibleOrderPlanCount: [...document.querySelectorAll('input[name="properties[Service plan]"]')].filter(isVisible).length,
      visibleOrderAddonCount: [...document.querySelectorAll('[data-order-bundle], [data-order-addon]')].filter(isVisible).length,
      visibleCartSetupCount: [...document.querySelectorAll('[data-cart-setup]')].filter(isVisible).length,
      visibleCartSetupChildCount: [...document.querySelectorAll('[data-cart-setup-child]')].filter(isVisible).length,
      visibleCartMediaCount: [...document.querySelectorAll('[data-cart-setup] .ip-cart-item__media')].filter(isVisible).length,
      visibleCartPropertyRowCount: [...document.querySelectorAll('.ip-cart-properties > div')].filter(isVisible).length,
      visibleContactFormCount: [...document.querySelectorAll('.ip-contact-form')].filter(isVisible).length,
      brokenImages,
      overflowing,
    };
  });
}

async function saveRouteArtifacts(page, viewportName, routeName, report) {
  await page.screenshot({
    path: path.join(screenshotDir, `${viewportName}-${routeName}.png`),
    fullPage: true,
  });

  fs.writeFileSync(
    path.join(reportDir, `${viewportName}-${routeName}.json`),
    JSON.stringify(report, null, 2)
  );
}

function expectSharedLayout(report) {
  expect(report.bodyScrollWidth).toBeLessThanOrEqual(report.bodyClientWidth + 2);
  expect(report.brokenImages).toEqual([]);
  expect(report.overflowing).toEqual([]);
}

const jsonResponse = (route, status, payload) => route.fulfill({
  body: JSON.stringify(payload),
  contentType: 'application/json',
  status,
});

async function installBuilderCartMocks(page, options = {}) {
  let releaseInitialCart;
  const initialCartGate = options.holdInitialCart
    ? new Promise((resolve) => { releaseInitialCart = resolve; })
    : null;
  const state = {
    addPayload: null,
    cleanupPayloads: [],
    initialCartRequestCompleted: false,
    initialCartRequestStarted: false,
    latestCart: emptyCart,
    releaseInitialCart: () => releaseInitialCart?.(),
  };

  await page.route('**/cart/add.js', async (route) => {
    state.addPayload = route.request().postDataJSON();
    if (options.addDelayMs) {
      await new Promise((resolve) => setTimeout(resolve, options.addDelayMs));
    }
    if (options.addStatus === 422) {
      await jsonResponse(route, 422, {
        description: options.addError || 'Selected billing item is unavailable.',
      });
      return;
    }
    await jsonResponse(route, 200, { items: state.addPayload.items || [] });
  });

  await page.route('**/cart.js', async (route) => {
    if (!state.addPayload) {
      state.initialCartRequestStarted = true;
      if (initialCartGate) await initialCartGate;
      await jsonResponse(route, 200, emptyCart);
      state.initialCartRequestCompleted = true;
      return;
    }
    const cart = groupedCartFromPayload(state.addPayload, {
      omitVariantIds: options.omitVariantIds || [],
    });
    state.latestCart = cart;
    await jsonResponse(route, 200, cart);
  });

  await page.route('**/cart/update.js', async (route) => {
    state.cleanupPayloads.push(route.request().postDataJSON());
    if (state.cleanupPayloads.length <= Number(options.cleanupFailureCount || 0)) {
      await jsonResponse(route, 500, {
        description: options.cleanupError || 'Cart cleanup is temporarily unavailable.',
      });
      return;
    }
    await jsonResponse(route, 200, emptyCart);
  });

  return state;
}

async function installGroupedCartMock(page, cart = childFirstGroupedCart) {
  await page.route('**/cart.js', (route) => jsonResponse(route, 200, cart));
}

const dawnCartBubble = (page) => page.locator('#cart-icon-bubble > .cart-count-bubble');
const dawnCartVisualCount = (page) => dawnCartBubble(page).locator(':scope > span[aria-hidden="true"]');
const dawnCartAccessibleCount = (page) => dawnCartBubble(page).locator(':scope > .visually-hidden');

const rectanglesIntersect = (left, right) => !(
  left.x + left.width <= right.x ||
  right.x + right.width <= left.x ||
  left.y + left.height <= right.y ||
  right.y + right.height <= left.y
);

test.describe('Independence Phone visual preview', () => {
  test('phone selector assets are compact WebP front views', () => {
    for (const filename of [
      'ip-classic-phone-front.webp',
      'ip-rugged-phone-front.webp',
    ]) {
      const assetPath = path.join(repoRoot, 'independence-phone-theme/assets', filename);
      const bytes = fs.readFileSync(assetPath);

      expect(fs.statSync(assetPath).size).toBeLessThan(100_000);
      expect(bytes.subarray(0, 4).toString('ascii')).toBe('RIFF');
      expect(bytes.subarray(8, 12).toString('ascii')).toBe('WEBP');
    }
  });

  test('creates a structured Dawn cart bubble when the server header starts without one', async ({ page }) => {
    let releaseCartResponse;
    let cartRequestStarted = false;
    const cartResponseGate = new Promise((resolve) => { releaseCartResponse = resolve; });
    await page.route('**/cart.js', async (route) => {
      cartRequestStarted = true;
      await cartResponseGate;
      await jsonResponse(route, 200, childFirstGroupedCart);
    });

    await openPreviewRoute(page, 'cart');
    await expect.poll(() => cartRequestStarted).toBe(true);
    await expect(dawnCartBubble(page)).toHaveCount(0);

    releaseCartResponse();
    await expect(dawnCartBubble(page)).toHaveCount(1);
    await expect(dawnCartBubble(page)).toBeVisible();
    await expect(dawnCartVisualCount(page)).toHaveText('1');
    await expect(dawnCartVisualCount(page)).toBeVisible();
    await expect(dawnCartAccessibleCount(page)).toHaveText('1 item in cart');
  });

  test('keeps 100-plus visual and accessible Dawn cart counts structurally distinct', async ({ page }) => {
    const largeGroupedCart = {
      ...childFirstGroupedCart,
      item_count: childFirstGroupedCart.items.length * 125,
      items: childFirstGroupedCart.items.map((item) => ({
        ...item,
        final_line_price: item.final_price * 125,
        line_price: item.price * 125,
        quantity: 125,
      })),
    };
    await installGroupedCartMock(page, largeGroupedCart);
    await openPreviewRoute(page, 'cart');

    const bubble = dawnCartBubble(page);
    const visualCount = dawnCartVisualCount(page);
    const accessibleCount = dawnCartAccessibleCount(page);
    await expect(bubble).toBeVisible();
    await expect(visualCount).toHaveCount(1);
    await expect(accessibleCount).toHaveCount(1);
    await expect(visualCount).toHaveText('125');
    await expect(visualCount).toHaveAttribute('hidden', '');
    await expect(visualCount).toBeHidden();
    await expect(accessibleCount).toHaveText('125 items in cart');
    expect(await bubble.evaluate((element) =>
      element.querySelector(':scope > span[aria-hidden="true"]') !==
      element.querySelector(':scope > .visually-hidden')
    )).toBe(true);
  });

  test('keeps grouped Remove hidden in server HTML until cart JavaScript initializes it', async ({ browser, page }) => {
    const noJavaScriptContext = await browser.newContext({ javaScriptEnabled: false });
    const noJavaScriptPage = await noJavaScriptContext.newPage();
    await noJavaScriptPage.goto(routeUrl('cart'), { waitUntil: 'domcontentloaded' });
    const serverRemove = noJavaScriptPage.locator('[data-cart-setup-remove]');
    await expect(serverRemove).toHaveCount(1);
    await expect(serverRemove).toHaveAttribute('hidden', '');
    await expect(serverRemove).toBeHidden();
    expect(await serverRemove.evaluate((button) => button.hidden)).toBe(true);
    await noJavaScriptContext.close();

    await installGroupedCartMock(page);
    await openPreviewRoute(page, 'cart');
    const initializedRemove = page.locator('[data-cart-setup-remove]');
    await expect(initializedRemove).toHaveCount(1);
    await expect(initializedRemove).not.toHaveAttribute('hidden', '');
    await expect(initializedRemove).toBeVisible();
    await expect(initializedRemove).toBeEnabled();
  });

  test('ignores a stale initial cart count after a newer cart mutation', async ({ page }) => {
    const state = await installBuilderCartMocks(page, {
      cleanupFailureCount: 2,
      holdInitialCart: true,
      omitVariantIds: ['preview-addon-bundle-billing'],
    });
    await openPreviewRoute(page, 'order');
    await expect.poll(() => state.initialCartRequestStarted).toBe(true);

    await page.locator('#preview-addon-bundle').check();
    await page.locator('[data-order-form] [data-add-to-cart-button]').click();
    await expect(page.locator('[data-order-form] [data-cart-status]')).toHaveText(
      'Only part of the phone setup was added, and it could not be removed automatically. Open the cart and remove the incomplete billing item before retrying.'
    );
    await expect(dawnCartVisualCount(page)).toHaveText('1');
    await expect(dawnCartAccessibleCount(page)).toHaveText('1 item in cart');

    state.releaseInitialCart();
    await expect.poll(() => state.initialCartRequestCompleted).toBe(true);
    await page.waitForTimeout(100);
    await expect(dawnCartVisualCount(page)).toHaveText('1');
    await expect(dawnCartAccessibleCount(page)).toHaveText('1 item in cart');
  });

  test('preserves a native Refresh cart-icon replacement over a stale initial count', async ({ page }) => {
    let releaseInitialCart;
    let initialCartRequestCompleted = false;
    let initialCartRequestStarted = false;
    const initialCartGate = new Promise((resolve) => { releaseInitialCart = resolve; });
    await page.route('**/cart.js', async (route) => {
      initialCartRequestStarted = true;
      await initialCartGate;
      await jsonResponse(route, 200, emptyCart);
      initialCartRequestCompleted = true;
    });

    await openPreviewRoute(page, 'order');
    await expect.poll(() => initialCartRequestStarted).toBe(true);
    await expect(dawnCartBubble(page)).toHaveCount(0);

    await page.evaluate(() => {
      const currentIcon = document.querySelector('#cart-icon-bubble');
      const replacementIcon = currentIcon.cloneNode(true);
      replacementIcon.querySelectorAll('.cart-count-bubble').forEach((bubble) => bubble.remove());

      const replacementBubble = document.createElement('div');
      replacementBubble.className = 'cart-count-bubble';
      replacementBubble.innerHTML = [
        '<span aria-hidden="true">1</span>',
        '<span class="visually-hidden">1 item in cart</span>',
      ].join('');
      replacementIcon.append(replacementBubble);
      currentIcon.replaceWith(replacementIcon);
    });

    await expect(dawnCartBubble(page)).toBeVisible();
    await expect(dawnCartVisualCount(page)).toHaveText('1');
    await expect(dawnCartAccessibleCount(page)).toHaveText('1 item in cart');

    releaseInitialCart();
    await expect.poll(() => initialCartRequestCompleted).toBe(true);
    await page.waitForTimeout(100);
    await expect(dawnCartBubble(page)).toBeVisible();
    await expect(dawnCartVisualCount(page)).toHaveText('1');
    await expect(dawnCartAccessibleCount(page)).toHaveText('1 item in cart');
  });

  for (const viewport of viewports) {
    test(`${viewport.name} validates home, order, cart, FAQ, and contact routes`, async ({ page }) => {
      await page.addInitScript(() => {
        window.__ipLayoutShiftScore = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) window.__ipLayoutShiftScore += entry.value;
          }
        }).observe({ type: 'layout-shift', buffered: true });
      });
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      await openPreviewRoute(page, 'home');
      await triggerLazyImages(page);
      const homeReport = await collectRouteReport(page);
      await saveRouteArtifacts(page, viewport.name, 'home', homeReport);

      expectSharedLayout(homeReport);
      expect(homeReport.layoutShiftScore).toBeLessThanOrEqual(0.1);
      expect(homeReport.visibleSlots).toEqual([
        'home.hero',
        'home.feature-strip',
        'home.jtbd',
        'faq',
      ]);
      expect(homeReport.heroVideoCount).toBe(1);
      expect(homeReport.visibleFeatureCount).toBe(4);
      await expect(page.locator('.ip-announcement')).toHaveCount(0);
      await expect(page.locator('body')).not.toContainText('Patriot Package');
      await expect(page.locator('body')).not.toContainText('Included in the Patriot Package');
      await expect(page.locator('#home .ip-hero__price')).toHaveText('$17.76/mo');
      await expect(page.getByRole('link', { name: 'Order now' }).first()).toBeVisible();
      await expect(page.locator('a[href="?route=order"]').first()).toBeVisible();
      const heroMedia = page.locator('#home .ip-hero__media');
      const heroVideo = page.locator('#home [data-hero-video-player]');
      const soundButton = page.locator('#home [data-hero-sound-toggle]');
      await expect(soundButton).toBeVisible();
      await expect(soundButton).toHaveAttribute('aria-label', 'Play with sound');
      await expect(page.getByText('Play with sound', { exact: true })).toHaveCount(0);

      const mediaBox = await heroMedia.boundingBox();
      const soundBox = await soundButton.boundingBox();
      expect(mediaBox).not.toBeNull();
      expect(soundBox).not.toBeNull();
      expect(soundBox.x).toBeGreaterThanOrEqual(mediaBox.x + 12);
      expect(soundBox.y).toBeGreaterThanOrEqual(mediaBox.y + 12);
      expect(soundBox.x + soundBox.width).toBeLessThanOrEqual(mediaBox.x + mediaBox.width - 12);
      expect(soundBox.y + soundBox.height).toBeLessThanOrEqual(mediaBox.y + mediaBox.height - 12);
      expect(soundBox.width).toBeGreaterThanOrEqual(44);
      expect(soundBox.height).toBeGreaterThanOrEqual(44);

      await soundButton.focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      await expect(soundButton).toBeFocused();
      const focusOutlineWidth = await soundButton.evaluate((button) =>
        Number.parseFloat(getComputedStyle(button).outlineWidth)
      );
      expect(focusOutlineWidth).toBeGreaterThanOrEqual(3);

      await soundButton.click();
      await expect(soundButton).toHaveAttribute('aria-pressed', 'true');
      await expect(soundButton).toHaveAttribute('aria-label', 'Sound is on');
      await expect.poll(() => heroVideo.evaluate((video) => ({
        currentTime: video.currentTime,
        muted: video.muted,
        paused: video.paused,
        volume: video.volume,
      }))).toMatchObject({ muted: false, paused: false, volume: 1 });
      await expect.poll(() => heroVideo.evaluate((video) => video.currentTime)).toBeGreaterThan(0);
      await heroVideo.evaluate((video) => { video.muted = true; });
      await expect(soundButton).toHaveAttribute('aria-label', 'Sound is off. Play with sound');
      await heroVideo.evaluate((video) => { video.muted = false; });
      await expect(soundButton).toHaveAttribute('aria-label', 'Sound is on');
      await heroVideo.evaluate((video) => video.pause());
      await expect(soundButton).toHaveAttribute('aria-label', 'Resume with sound');
      await heroVideo.evaluate((video) => video.play());
      await expect(soundButton).toHaveAttribute('aria-label', 'Sound is on');
      await expect(page.locator('[data-slot="products.compare"]')).toBeHidden();

      await openPreviewRoute(page, 'order');
      await triggerLazyImages(page);
      const orderReport = await collectRouteReport(page);
      await saveRouteArtifacts(page, viewport.name, 'order', orderReport);

      expectSharedLayout(orderReport);
      expect(orderReport.visibleSlots).toEqual(['order.builder']);
      expect(orderReport.visibleProductFormCount).toBe(1);
      expect(orderReport.visibleOrderBuilderCount).toBe(1);
      expect(orderReport.visibleOrderPackageCount).toBe(0);
      expect(orderReport.visibleOrderPhoneCount).toBe(2);
      expect(orderReport.visibleOrderPlanCount).toBe(2);
      expect(orderReport.visibleOrderAddonCount).toBe(5);
      const orderBuilder = page.locator('[data-slot="order.builder"]');
      await expect(orderBuilder.getByRole('heading', { name: 'Build your Independence Phone order now.' })).toBeVisible();
      await expect(orderBuilder).not.toContainText('Patriot Package');
      await expect(orderBuilder.locator('.ip-kicker').first()).toHaveText('Order summary');
      await expect(orderBuilder.locator('.ip-order-builder__header .ip-kicker')).toHaveCount(0);
      await expect(page.getByText('Saves $13.12 compared with 12 monthly payments.')).toBeVisible();
      await expect(page.getByText('Includes every add-on: Call Recording, Quiet Hours, Voicemail to Email, and Auto Attendant. Saves $10/mo.')).toBeVisible();
      await expect(orderBuilder.getByText('Choose your service plan — Billed on the 1st of the next month')).toBeVisible();
      await expect(orderBuilder.getByText('Choose add-ons — Billed on the 1st of the next month')).toBeVisible();
      await expect(orderBuilder.getByLabel('Discount/referral code')).toBeVisible();
      await expect(orderBuilder.locator('a[href*="polic"]')).toHaveCount(0);
      await page.locator('#preview-referral').fill('QA-REFERRAL-73');

      await page.locator('#preview-phone-rugged').check();
      await expect(page.locator('#preview-phone-rugged')).toBeChecked();
      await expect(page.locator('#preview-phone-standard')).not.toBeChecked();
      await expect(page.locator('#preview-plan-monthly')).toBeChecked();
      await expect(page.locator('[data-order-summary-title]')).toHaveText('Rugged Phone');
      await expect(page.locator('[data-order-summary-phone]')).toHaveText('$150.00 one-time');
      await expect(page.locator('[data-order-summary-service]')).toContainText('$17.76/mo');
      await expect(page.locator('[data-order-summary-addons]')).toHaveText('None selected');
      await expect(page.locator('[data-order-summary-savings]')).toHaveText('$0');
      await expect(orderBuilder.locator('input[name="properties[Policy agreement]"]')).toHaveCount(0);
      await expect(orderBuilder.locator('.ip-order-card__phone-media')).toHaveCount(2);
      await expect(orderBuilder.locator('.ip-order-card__phone-media video')).toHaveCount(2);
      await expect(orderBuilder.getByRole('button', { name: 'Add order to cart' })).toBeVisible();
      await expect(orderBuilder.getByText('Taxes, shipping, and recurring billing will be shown in the cart.')).toBeVisible();

      await installGroupedCartMock(page);
      await openPreviewRoute(page, 'cart');
      await triggerLazyImages(page);
      const cartReport = await collectRouteReport(page);
      await saveRouteArtifacts(page, viewport.name, 'cart', cartReport);

      expectSharedLayout(cartReport);
      expect(cartReport.visibleSlots).toEqual(['cart.review']);
      expect(cartReport.visibleCartSetupCount).toBe(1);
      expect(cartReport.visibleCartSetupChildCount).toBe(2);
      expect(cartReport.visibleCartMediaCount).toBe(1);
      expect(cartReport.visibleCartPropertyRowCount).toBe(1);
      await expect(page.getByRole('heading', { name: 'Your Independence Phone Cart' })).toBeVisible();
      await expect(page.locator('.ip-cart__table-head')).toHaveCount(0);
      await expect(page.locator('[data-preview-cart-title]')).toHaveText('Classic Phone');
      await expect(page.locator('[data-cart-line-price]')).toHaveText('$100.00');
      await expect(page.locator('[data-cart-subtotal]')).toHaveText('$100.00');
      await expect(page.locator('[data-cart-shipping]')).toHaveText('$15.00');
      await expect(page.locator('[data-cart-due-today]')).toHaveText('$115.00');
      await expect(page.locator('[data-cart-future-charge]')).toHaveText('$27.76');
      await expect(page.locator('[data-cart-savings]')).toHaveText('$10.00/mo');
      await expect(page.locator('.ip-cart-properties')).toContainText('Discount/referral code');
      await expect(page.locator('.ip-cart-properties')).toContainText('QA-REFERRAL-73');
      await expect(page.locator('[data-cart-setup-children]')).toContainText('Monthly Service');
      await expect(page.locator('[data-cart-setup-children]')).toContainText('Add-on Bundle');
      await expect(page.locator('[data-cart-setup-children]')).toContainText('Due on the first day of the following month');
      await expect(page.locator('[data-cart-addon-selector]')).toHaveCount(0);
      await expect(page.locator('[data-cart-form] input[name*="Policy agreement"]')).toHaveCount(0);
      await expect(page.locator('[data-cart-setup-remove]')).toHaveText('Remove');
      await expect(page.locator('[data-cart-setup-remove]')).not.toContainText('setup');

      await openPreviewRoute(page, 'faq');
      await triggerLazyImages(page);
      const faqReport = await collectRouteReport(page);
      await saveRouteArtifacts(page, viewport.name, 'faq', faqReport);

      expectSharedLayout(faqReport);
      expect(faqReport.visibleSlots).toEqual(['faq']);
      const dedicatedFaq = page.locator('[data-preview-pages="faq"]');
      await expect(page.getByRole('heading', { name: 'Install, use, refer, and troubleshoot.' })).toBeVisible();
      await expect(page.getByText('How does the referral offer work?', { exact: true })).toBeVisible();
      await expect(dedicatedFaq).toContainText('you both will get one month of service for free');
      await expect(dedicatedFaq.getByText('What is the difference between Classic Phone and Rugged Phone?', { exact: true })).toBeVisible();
      await expect(dedicatedFaq.locator('#phone-comparison .ip-faq__answer')).toHaveText(
        'Both phones include Wi-Fi, Bluetooth, encrypted data transmission and storage, and 9-hour talk time. Rugged Phone also adds waterproof and drop-proof protection.'
      );
      await expect(dedicatedFaq.locator('.ip-kicker')).toHaveCount(0);
      await expect(dedicatedFaq).not.toContainText('Patriot');

      await openPreviewRoute(page, 'contact');
      await triggerLazyImages(page);
      const contactReport = await collectRouteReport(page);
      await saveRouteArtifacts(page, viewport.name, 'contact', contactReport);

      expectSharedLayout(contactReport);
      expect(contactReport.visibleSlots).toEqual(['contact.form']);
      expect(contactReport.visibleContactFormCount).toBe(1);
      await expect(page.locator('.ip-contact-form')).toBeVisible();
      await expect(page.locator('.ip-contact-form input')).toHaveCount(3);
      await expect(page.locator('.ip-contact-form textarea')).toHaveCount(1);
      await expect(page.locator('.ip-contact-form label')).toHaveText([
        'Name',
        'Email',
        'Phone Number',
        'How can we Help?',
      ]);
      await expect(page.locator('.ip-contact-form button')).toHaveText('Send');
      await expect(page.locator('.ip-contact-form a')).toHaveCount(0);
      await expect(page.locator('footer a[href="/policies/privacy-policy"]')).toHaveText('Privacy Policy');
      await expect(page.locator('footer a[href="/policies/terms-of-service"]')).toHaveText('Terms and Conditions');
      await expect(page.locator('footer a[href="mailto:info@independencephone.com"]')).toHaveText('info@independencephone.com');
      await expect(page.locator('footer a[href="tel:+16157041776"]')).toHaveText('(615) 704-1776');
    });
  }

  test('builder posts a complete grouped setup and redirects to canonical cart', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const state = await installBuilderCartMocks(page, { addDelayMs: 150 });
    await openPreviewRoute(page, 'order');

    await page.locator('#preview-referral').fill('QA-REFERRAL-73');
    await page.locator('#preview-addon-recording').check();
    const submitButton = page.locator('[data-order-form] [data-add-to-cart-button]');

    await submitButton.click({ noWaitAfter: true });
    await expect(submitButton).toBeDisabled();
    await expect.poll(() => state.addPayload).not.toBeNull();
    await page.waitForURL((url) => url.pathname === '/cart');

    expect(state.addPayload.items).toHaveLength(3);
    expect(new Set(state.addPayload.items.map((item) => item.properties._setup_id)).size).toBe(1);
    expect(state.addPayload.items.map((item) => String(item.id))).toEqual([
      'preview-standard',
      'preview-monthly-service',
      'preview-call-recording',
    ]);
    expect(state.addPayload.items[0].properties).not.toHaveProperty('Policy agreement');
    expect(state.addPayload.items[0].properties['Discount/referral code']).toBe('QA-REFERRAL-73');
    expect(state.addPayload.items[0].properties).not.toHaveProperty('Service plan');
    expect(state.addPayload.items[0].properties).not.toHaveProperty('Call Recording');
    expect(state.addPayload.items[0].properties._order_contract).toBe('deferred-billing-v2');
    expect(state.addPayload.items[1].properties._setup_billing_name).toBe('Service plan');
    expect(state.addPayload.items[2].properties._setup_billing_name).toBe('Call Recording');
    expect(state.addPayload.items[2].properties._setup_billing_value).toBe('$5/mo');
    for (const billingLine of state.addPayload.items.slice(1)) {
      expect(billingLine.properties._order_contract).toBe('deferred-billing-v2');
      expect(billingLine.properties._setup_future_charge_cents).toMatch(/^\d+$/);
      expect(billingLine.properties._setup_first_bill_rule).toBe('first_day_of_next_month');
      expect(billingLine.properties['Billing starts']).toBe('First day of the following month');
    }
    expect(state.latestCart.total_price).toBe(10000);
    expect(state.latestCart.items.filter((item) => item.properties._setup_parent === 'true'))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ final_line_price: 0, price: 0 }),
      ]));
    await expect(page.locator('html')).toHaveAttribute('data-preview-route', 'cart');
    await expect(dawnCartVisualCount(page)).toHaveText('1');
  });

  test('builder keeps a rugged annual bundle order deferred until the first of next month', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const state = await installBuilderCartMocks(page);
    await openPreviewRoute(page, 'order');

    await page.locator('#preview-phone-rugged').check();
    await page.locator('#preview-referral').fill('RUGGED-REF-150');
    await page.locator('#preview-plan-annual').check();
    await page.locator('#preview-addon-bundle').check();

    await expect(page.locator('#preview-phone-rugged')).toBeChecked();
    await expect(page.locator('#preview-plan-annual')).toBeChecked();
    await expect(page.locator('#preview-addon-bundle')).toBeChecked();
    await expect(page.locator('[data-order-summary-title]')).toHaveText('Rugged Phone');
    await expect(page.locator('[data-order-summary-service]')).toContainText('Annual service');
    await expect(page.locator('[data-order-summary-addons]')).toHaveText('Add-on Bundle');
    await expect(page.locator('[data-order-summary-savings]')).toHaveText('$13.12/yr + $10.00/mo');

    await page.locator('[data-order-form] [data-add-to-cart-button]').click();
    await page.waitForURL((url) => url.pathname === '/cart');

    expect(state.addPayload.items).toHaveLength(3);
    expect(state.addPayload.items.map((item) => String(item.id))).toEqual([
      'preview-rugged',
      'preview-annual-service',
      'preview-addon-bundle-billing',
    ]);
    expect(new Set(state.addPayload.items.map((item) => item.properties._setup_id)).size).toBe(1);

    const [phoneLine, serviceLine, bundleLine] = state.addPayload.items;
    expect(phoneLine.properties).not.toHaveProperty('Patriot Package');
    expect(phoneLine.properties['Discount/referral code']).toBe('RUGGED-REF-150');
    expect(phoneLine.properties).not.toHaveProperty('Service plan');
    expect(phoneLine.properties).not.toHaveProperty('Add-on Bundle');
    expect(serviceLine.properties._setup_role).toBe('service');
    expect(serviceLine.properties._setup_billing_name).toBe('Service plan');
    expect(serviceLine.properties._setup_billing_value).toBe('$200/yr');
    expect(serviceLine.properties._setup_future_charge_cents).toBe('20000');
    expect(serviceLine.properties._setup_billing_cadence).toBe('annual');
    expect(bundleLine.properties._setup_role).toBe('addon_bundle');
    expect(bundleLine.properties._setup_billing_name).toBe('Add-on Bundle');
    expect(bundleLine.properties._setup_billing_value).toBe('$10/mo');
    expect(bundleLine.properties.Savings).toBe('Save $10.00/mo');
    expect(bundleLine.properties._setup_future_charge_cents).toBe('1000');
    expect(bundleLine.properties._setup_billing_cadence).toBe('monthly');

    expect(state.latestCart.items).toHaveLength(3);
    expect(state.latestCart.total_price).toBe(15000);
    expect(state.latestCart.items.slice(0, 2).every((item) => item.final_line_price === 0)).toBe(true);
    await expect(page.locator('html')).toHaveAttribute('data-preview-route', 'cart');
    await expect(dawnCartVisualCount(page)).toHaveText('1');
  });

  test('builder stays put and restores controls after a 422 cart rejection', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const state = await installBuilderCartMocks(page, {
      addDelayMs: 60,
      addStatus: 422,
      addError: 'Selected billing item is unavailable.',
    });
    await openPreviewRoute(page, 'order');

    const submitButton = page.locator('[data-order-form] [data-add-to-cart-button]');
    await submitButton.click();

    await expect.poll(() => state.addPayload).not.toBeNull();
    await expect(page.locator('[data-order-form] [data-cart-status]')).toHaveText('Selected billing item is unavailable.');
    await expect(page.locator('[data-order-form] [data-cart-status]')).toHaveAttribute('data-state', 'error');
    await expect(submitButton).toBeEnabled();
    expect(new URL(page.url()).searchParams.get('route')).toBe('order');
    expect(state.cleanupPayloads).toEqual([]);
  });

  test('builder removes a partial setup and does not redirect', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const state = await installBuilderCartMocks(page, {
      omitVariantIds: ['preview-addon-bundle-billing'],
    });
    await openPreviewRoute(page, 'order');

    await page.locator('#preview-addon-bundle').check();
    const submitButton = page.locator('[data-order-form] [data-add-to-cart-button]');
    await submitButton.click();

    await expect(page.locator('[data-order-form] [data-cart-status]')).toHaveText(
      'We could not add the complete phone setup. Nothing was kept in your cart. Please try again.'
    );
    await expect(page.locator('[data-order-form] [data-cart-status]')).toHaveAttribute('data-state', 'error');
    await expect(submitButton).toBeEnabled();
    expect(new URL(page.url()).searchParams.get('route')).toBe('order');
    expect(state.cleanupPayloads).toHaveLength(1);
    expect(Object.keys(state.cleanupPayloads[0].updates)).toHaveLength(2);
    expect(Object.values(state.cleanupPayloads[0].updates)).toEqual([0, 0]);
  });

  test('builder keeps a truthful partial-cart count when both cleanup attempts fail', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const state = await installBuilderCartMocks(page, {
      cleanupFailureCount: 2,
      omitVariantIds: ['preview-addon-bundle-billing'],
    });
    await openPreviewRoute(page, 'order');

    await page.locator('#preview-addon-bundle').check();
    const submitButton = page.locator('[data-order-form] [data-add-to-cart-button]');
    await submitButton.click();

    await expect(page.locator('[data-order-form] [data-cart-status]')).toHaveText(
      'Only part of the phone setup was added, and it could not be removed automatically. Open the cart and remove the incomplete billing item before retrying.'
    );
    await expect(page.locator('[data-order-form] [data-cart-status]')).toHaveAttribute('data-state', 'error');
    await expect(submitButton).toBeEnabled();
    expect(new URL(page.url()).searchParams.get('route')).toBe('order');

    expect(state.cleanupPayloads).toHaveLength(2);
    for (const cleanupPayload of state.cleanupPayloads) {
      expect(Object.keys(cleanupPayload.updates)).toHaveLength(2);
      expect(Object.values(cleanupPayload.updates)).toEqual([0, 0]);
    }

    const cartCount = dawnCartVisualCount(page);
    await expect(cartCount).toBeVisible();
    await expect(cartCount).toHaveText('1');
    await expect(dawnCartAccessibleCount(page)).toHaveText('1 item in cart');
  });

  test('child-first raw lines render as one grouped customer setup', async ({ page }) => {
    expect(childFirstGroupedCart.items[0].properties._setup_parent).toBe('true');
    expect(childFirstGroupedCart.items.at(-1).properties._setup_role).toBe('phone');

    await page.setViewportSize({ width: 1440, height: 900 });
    await installGroupedCartMock(page);
    await openPreviewRoute(page, 'cart');

    const setup = page.locator('[data-cart-setup]');
    await expect(setup).toHaveCount(1);
    await expect(setup.locator('[data-cart-setup-child]')).toHaveCount(2);
    await expect(page.locator('.ip-cart__items > [data-cart-setup-child]')).toHaveCount(0);
    await expect(setup.locator('.ip-cart-item__media')).toHaveCount(1);
    await expect(setup.locator('[data-cart-setup-child] .ip-cart-item__media')).toHaveCount(0);
    await expect(setup.locator('[data-cart-setup-child] .ip-cart-properties')).toHaveCount(0);
    await expect(setup.locator('[data-cart-setup-child] .ip-cart-item__actions')).toHaveCount(0);
    await expect(setup.locator('[data-cart-setup-child] [data-cart-quantity]')).toHaveCount(0);
    await expect(setup.locator('[data-cart-setup-quantity]')).toHaveCount(1);
    await expect(setup.locator('[data-cart-setup-remove]')).toHaveCount(1);
    await expect(setup.locator('[data-cart-line-price]')).toHaveText('$100.00');
    await expect(page.locator('[data-cart-subtotal]')).toHaveText('$100.00');
    await expect(page.locator('[data-cart-shipping]')).toHaveText('$15.00');
    await expect(page.locator('[data-cart-due-today]')).toHaveText('$115.00');
    await expect(page.locator('[data-cart-future-charge]')).toHaveText('$27.76');
    await expect(dawnCartVisualCount(page)).toHaveText('1');
    await expect(setup).not.toContainText('Policy agreement');
    await expect(page.locator('[data-cart-addon-selector]')).toHaveCount(0);

    const visiblePropertyLists = page.locator('.ip-cart-properties:visible');
    await expect(visiblePropertyLists).toHaveCount(1);
    await expect(visiblePropertyLists.locator('> div')).toHaveCount(1);

    await setup.locator('[data-cart-setup-quantity]').evaluate((input) => {
      input.value = '2';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const childQuantities = await setup.locator('[data-cart-child-quantity]').evaluateAll((inputs) =>
      inputs.map((input) => input.value)
    );
    expect(childQuantities).toEqual(['2', '2']);
  });

  test('cart checkout posts the deferred-billing v2 handoff with today and future totals separated', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    let handoffPayload = null;
    await page.route('**/revio-handoff', async (route) => {
      handoffPayload = route.request().postDataJSON();
      await jsonResponse(route, 200, { ok: true });
    });
    await installGroupedCartMock(page);
    await openPreviewRoute(page, 'cart');

    await expect(page.locator('[data-order-form] input[name="properties[Policy agreement]"]')).toHaveCount(0);
    await expect(page.locator('[data-cart-form] input[name*="Policy agreement"]')).toHaveCount(0);

    const updateRequestPromise = page.waitForRequest((request) =>
      new URL(request.url()).pathname === '/cart' && request.method() === 'POST'
    );
    await page.getByRole('button', { name: 'Update' }).click();
    const updateRequest = await updateRequestPromise;
    expect(updateRequest.postData() || '').toContain('updates%5Bpreview-phone-key%5D=1');

    await expect(page.locator('html')).toHaveAttribute('data-preview-route', 'cart');
    const checkout = page.getByRole('button', { name: 'Checkout' });
    await checkout.click();
    await expect.poll(() => handoffPayload).not.toBeNull();
    await expect(page.locator('[data-cart-form] [data-cart-status]')).toHaveText('Checkout details received. We will confirm the next step shortly.');

    expect(handoffPayload.schema).toBe('independence_phone.revio_checkout.v2');
    expect(handoffPayload.consent).toEqual({
      collection_status: 'pending_checkout',
      privacy_terms_accepted: null,
    });
    expect(handoffPayload.customer).toEqual({
      desired_area_code: null,
      desired_area_code_collection_status: 'required_at_checkout',
    });
    expect(handoffPayload.cart).toMatchObject({
      immediate_subtotal_cents: 10000,
      flat_shipping_cents: 1500,
      tax_cents: null,
      tax_status: 'calculated_after_address',
      due_today_before_tax_cents: 11500,
      future_charge_cents: 2776,
      first_bill_rule: 'first_day_of_next_month',
    });
    expect(handoffPayload.setup_count).toBe(1);
    expect(handoffPayload.setups[0].summary).toMatchObject({
      due_today_before_tax_cents: 10000,
      future_charge_cents: 2776,
    });
    expect(handoffPayload.lines.filter((line) => line.setup_parent)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          checkout_line_price_cents: 0,
          future_charge_cents: 1776,
          billing_cadence: 'monthly',
          first_bill_rule: 'first_day_of_next_month',
        }),
        expect.objectContaining({
          checkout_line_price_cents: 0,
          future_charge_cents: 1000,
          billing_cadence: 'monthly',
          first_bill_rule: 'first_day_of_next_month',
        }),
      ])
    );
  });

  test('grouped Remove zeros the phone, service, and add-on lines together', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    let updatePayload = null;
    let cartAfterRemove = childFirstGroupedCart;
    await page.route('**/cart.js', (route) => jsonResponse(route, 200, cartAfterRemove));
    await page.route('**/cart/update.js', async (route) => {
      updatePayload = route.request().postDataJSON();
      cartAfterRemove = emptyCart;
      await jsonResponse(route, 200, emptyCart);
    });
    await openPreviewRoute(page, 'cart');

    const remove = page.locator('[data-cart-setup-remove]');
    await expect(remove).toHaveText('Remove');
    await remove.click({ noWaitAfter: true });
    await expect.poll(() => updatePayload).not.toBeNull();
    expect(updatePayload).toEqual({
      updates: {
        'preview-phone-key': 0,
        'preview-monthly-key': 0,
        'preview-bundle-key': 0,
      },
    });
  });

  test('optional add-on Remove deletes only that grouped child and remains accessible on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    let updatePayload = null;
    await page.route('**/cart.js', (route) => jsonResponse(route, 200, childFirstGroupedCart));
    await page.route('**/cart/update.js', async (route) => {
      updatePayload = route.request().postDataJSON();
      await jsonResponse(route, 200, childFirstGroupedCart);
    });
    await openPreviewRoute(page, 'cart');

    await expect(page.locator('[data-cart-setup-child][data-setup-role="service"] [data-cart-child-remove]')).toHaveCount(0);
    const removeBundle = page.getByRole('button', { name: 'Remove Add-on Bundle' });
    await expect(removeBundle).toBeVisible();
    await removeBundle.click({ noWaitAfter: true });
    await expect.poll(() => updatePayload).toEqual({
      updates: {
        'preview-bundle-key': 0,
      },
    });
  });

  for (const viewport of balanceViewports) {
    test(`${viewport.name} keeps rotating phone choices balanced and clickable`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await openPreviewRoute(page, 'order');
      await page.evaluate(() => document.fonts.ready);

      const cards = page.locator('.ip-order-card--phone');
      const media = cards.locator('.ip-order-card__phone-media');
      const videos = media.locator('video');
      const stepTitles = page.locator('.ip-order-builder__section-title');
      await expect(cards).toHaveCount(2);
      await expect(media).toHaveCount(2);
      await expect(videos).toHaveCount(2);
      await expect(stepTitles).toHaveCount(3);

      const stepGeometry = await page.locator('.ip-order-builder__step').evaluateAll((steps) => steps.map((step) => {
        const title = step.querySelector('.ip-order-builder__section-title');
        const options = step.querySelector('.ip-order-builder__grid');
        const titleRect = title.getBoundingClientRect();
        const optionsRect = options.getBoundingClientRect();
        const titleStyle = getComputedStyle(title);
        const stepStyle = getComputedStyle(step);
        return {
          borderTopWidth: Number.parseFloat(stepStyle.borderTopWidth),
          optionsGap: optionsRect.top - titleRect.bottom,
          position: titleStyle.position,
          titleFontSize: Number.parseFloat(titleStyle.fontSize),
          titleFontWeight: Number.parseInt(titleStyle.fontWeight, 10),
        };
      }));
      for (const step of stepGeometry) {
        expect(step.borderTopWidth).toBe(0);
        expect(step.optionsGap).toBeGreaterThanOrEqual(10);
        expect(step.position).not.toBe('absolute');
        expect(step.position).not.toBe('fixed');
        expect(step.titleFontSize).toBeGreaterThanOrEqual(20);
        expect(step.titleFontWeight).toBeGreaterThanOrEqual(700);
      }

      const stepTreatments = await page.locator(
        '.ip-order-builder__step--service, .ip-order-builder__step--addons'
      ).evaluateAll((elements) => elements.map((element) => ({
        backgroundColor: getComputedStyle(element).backgroundColor,
        className: element.className,
      })));
      expect(stepTreatments).toHaveLength(2);
      expect(stepTreatments[0].className).toContain('ip-order-builder__step--service');
      expect(stepTreatments[1].className).toContain('ip-order-builder__step--addons');
      expect(stepTreatments[0].backgroundColor).not.toBe(stepTreatments[1].backgroundColor);

      const videoDetails = await videos.evaluateAll((elements) => elements.map((video) => ({
        ariaLabel: video.getAttribute('aria-label'),
        autoplay: video.autoplay,
        loop: video.loop,
        muted: video.muted,
        objectFit: getComputedStyle(video).objectFit,
        playsInline: video.playsInline,
        poster: video.getAttribute('poster'),
        source: video.querySelector('source')?.getAttribute('src') || '',
      })));
      expect(videoDetails.map(({ poster }) => poster)).toEqual([
        '../independence-phone-theme/assets/ip-classic-phone-front.webp',
        '../independence-phone-theme/assets/ip-rugged-phone-front.webp',
      ]);
      expect(videoDetails.map(({ source }) => source)).toEqual([
        '../independence-phone-theme/assets/ip-classic-phone-spin.mp4',
        '../independence-phone-theme/assets/ip-rugged-phone-spin.mp4',
      ]);
      for (const detail of videoDetails) {
        expect(detail.ariaLabel).toContain('Rotating view');
        expect(detail.autoplay).toBe(true);
        expect(detail.loop).toBe(true);
        expect(detail.muted).toBe(true);
        expect(detail.playsInline).toBe(true);
        expect(detail.objectFit).toBe('cover');
      }

      const mediaBackgrounds = await media.evaluateAll((elements) =>
        elements.map((element) => getComputedStyle(element).backgroundImage)
      );
      for (const background of mediaBackgrounds) expect(background).toBe('none');

      const geometry = await cards.evaluateAll((elements) => elements.map((card) => {
        const rect = (element) => {
          const value = element.getBoundingClientRect();
          return { x: value.x, y: value.y, width: value.width, height: value.height };
        };
        const input = card.querySelector('[data-order-phone]');
        const title = card.querySelector('strong');
        const copy = card.querySelector(':scope > span');
        const phoneMedia = card.querySelector('.ip-order-card__phone-media');
        const price = copy.querySelector('small');
        const specs = copy.querySelector('em');
        return {
          card: rect(card),
          control: rect(input),
          copy: rect(copy),
          media: rect(phoneMedia),
          copyMediaBottomDelta: Math.abs(copy.getBoundingClientRect().bottom - phoneMedia.getBoundingClientRect().bottom),
          copyMediaHeightRatio: copy.getBoundingClientRect().height / phoneMedia.getBoundingClientRect().height,
          copyMediaTopDelta: Math.abs(copy.getBoundingClientRect().top - phoneMedia.getBoundingClientRect().top),
          mediaRatio: phoneMedia.getBoundingClientRect().width / card.getBoundingClientRect().width,
          copyRatio: copy.getBoundingClientRect().width / card.getBoundingClientRect().width,
          priceFontSize: Number.parseFloat(getComputedStyle(price).fontSize),
          radioTitleCenterDelta: Math.abs(
            (input.getBoundingClientRect().top + input.getBoundingClientRect().height / 2) -
            (title.getBoundingClientRect().top + title.getBoundingClientRect().height / 2)
          ),
          specsFontSize: Number.parseFloat(getComputedStyle(specs).fontSize),
          titleFontSize: Number.parseFloat(getComputedStyle(title).fontSize),
        };
      }));

      for (const item of geometry) {
        for (const child of [item.control, item.copy, item.media]) {
          expect(child.x).toBeGreaterThanOrEqual(item.card.x - 1);
          expect(child.y).toBeGreaterThanOrEqual(item.card.y - 1);
          expect(child.x + child.width).toBeLessThanOrEqual(item.card.x + item.card.width + 1);
          expect(child.y + child.height).toBeLessThanOrEqual(item.card.y + item.card.height + 1);
        }
        expect(item.radioTitleCenterDelta).toBeLessThanOrEqual(8);
        expect(item.card.width).toBeGreaterThanOrEqual(44);
        expect(item.card.height).toBeGreaterThanOrEqual(44);
        expect(item.card.height).toBeLessThanOrEqual(280);
        expect(item.copyMediaTopDelta).toBeLessThanOrEqual(2);
        expect(item.copyMediaBottomDelta).toBeLessThanOrEqual(2);
        expect(item.copyMediaHeightRatio).toBeGreaterThanOrEqual(0.98);
        expect(item.copyMediaHeightRatio).toBeLessThanOrEqual(1.02);
        expect(item.media.height).toBeGreaterThanOrEqual(96);
        expect(item.mediaRatio).toBeGreaterThanOrEqual(item.card.width >= 800 ? 0.15 : 0.2);
        expect(item.mediaRatio).toBeLessThanOrEqual(0.4);
        expect(item.copyRatio).toBeGreaterThanOrEqual(0.38);
        expect(item.titleFontSize).toBeGreaterThanOrEqual(19);
        expect(item.priceFontSize).toBeGreaterThanOrEqual(15);
        expect(item.specsFontSize).toBeGreaterThanOrEqual(15);
        expect(rectanglesIntersect(item.media, item.copy)).toBe(false);
        expect(rectanglesIntersect(item.media, item.control)).toBe(false);
        expect(rectanglesIntersect(item.copy, item.control)).toBe(false);
        expect(item.media.x + item.media.width).toBeLessThanOrEqual(item.copy.x + 1);
      }

      if (viewport.width >= 900) {
        expect(geometry[0].card.x + geometry[0].card.width).toBeLessThanOrEqual(geometry[1].card.x + 1);
        expect(Math.abs(geometry[0].card.y - geometry[1].card.y)).toBeLessThanOrEqual(2);
      } else {
        expect(geometry[0].card.y + geometry[0].card.height).toBeLessThanOrEqual(geometry[1].card.y + 1);
        expect(Math.abs(geometry[0].card.x - geometry[1].card.x)).toBeLessThanOrEqual(2);
        const phoneStepHeight = await page.locator('.ip-order-builder__step').first().evaluate((step) =>
          step.getBoundingClientRect().height
        );
        expect(phoneStepHeight).toBeLessThanOrEqual(460);
      }

      await page.locator('#preview-phone-standard').focus();
      const focusedOutlineWidth = await cards.nth(0).evaluate((card) =>
        Number.parseFloat(getComputedStyle(card).outlineWidth)
      );
      expect(focusedOutlineWidth).toBeGreaterThanOrEqual(3);

      await media.nth(1).click();
      await expect(page.locator('#preview-phone-rugged')).toBeChecked();
      await expect(page.locator('#preview-phone-standard')).not.toBeChecked();
      await expect(page.locator('[data-order-variant-id]')).toHaveValue('preview-rugged');
      await expect(page.locator('[data-order-summary-title]')).toHaveText('Rugged Phone');
      await expect(page.locator('[data-order-summary-phone]')).toHaveText('$150.00 one-time');
      const selectedStyle = await cards.nth(1).evaluate((card) => ({
        borderColor: getComputedStyle(card).borderColor,
        boxShadow: getComputedStyle(card).boxShadow,
      }));
      expect(selectedStyle.boxShadow).not.toBe('none');
      expect(selectedStyle.borderColor).toBeTruthy();
    });
  }

  for (const viewport of balanceViewports.filter(({ width }) => [1440, 900, 768, 390].includes(width))) {
    test(`${viewport.name} keeps one setup card proportioned across cart breakpoints`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await installGroupedCartMock(page);
      await openPreviewRoute(page, 'cart');

      const setup = page.locator('[data-cart-setup]');
      await expect(setup).toHaveCount(1);
      await expect(setup.locator('.ip-cart-item__media')).toHaveCount(1);
      await expect(setup.locator('[data-cart-setup-child]')).toHaveCount(2);

      const geometry = await setup.evaluate((card) => {
        const rect = (element) => {
          const value = element.getBoundingClientRect();
          return { x: value.x, y: value.y, width: value.width, height: value.height };
        };
        const media = card.querySelector('.ip-cart-item__media');
        const heading = card.querySelector('.ip-cart-item__heading');
        const body = card.querySelector('.ip-cart-item__body');
        const rows = [...card.querySelectorAll('[data-cart-setup-child]')];
        const actions = card.querySelector('.ip-cart-item__actions');
        return {
          card: rect(card),
          media: rect(media),
          heading: rect(heading),
          body: rect(body),
          actions: rect(actions),
          rows: rows.map((row) => rect(row)),
          roles: rows.map((row) => row.getAttribute('data-setup-role')),
          viewportOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          cardOverflow: card.scrollWidth - card.clientWidth,
        };
      });

      expect(geometry.viewportOverflow).toBeLessThanOrEqual(2);
      expect(geometry.cardOverflow).toBeLessThanOrEqual(2);
      expect(geometry.roles).toEqual(['service', 'addon_bundle']);
      for (const child of [geometry.media, geometry.heading, geometry.body, geometry.actions, ...geometry.rows]) {
        expect(child.x).toBeGreaterThanOrEqual(geometry.card.x - 1);
        expect(child.y).toBeGreaterThanOrEqual(geometry.card.y - 1);
        expect(child.x + child.width).toBeLessThanOrEqual(geometry.card.x + geometry.card.width + 1);
        expect(child.y + child.height).toBeLessThanOrEqual(geometry.card.y + geometry.card.height + 1);
      }
      expect(geometry.rows[0].y + geometry.rows[0].height).toBeLessThanOrEqual(geometry.rows[1].y + 1);

      if (viewport.width <= 720) {
        expect(geometry.media.x + geometry.media.width).toBeLessThanOrEqual(geometry.heading.x + 1);
        expect(geometry.body.y).toBeGreaterThanOrEqual(
          Math.max(geometry.media.y + geometry.media.height, geometry.heading.y + geometry.heading.height) - 1
        );
        expect(geometry.body.width / geometry.card.width).toBeGreaterThanOrEqual(0.84);
        for (const row of geometry.rows) {
          expect(row.width / geometry.card.width).toBeGreaterThanOrEqual(0.84);
        }
      } else {
        expect(geometry.media.x + geometry.media.width).toBeLessThanOrEqual(geometry.body.x + 1);
      }

      const touchTargets = [
        setup.locator('[data-cart-setup-quantity]'),
        setup.locator('[data-cart-setup-remove]'),
        page.locator('.ip-cart__continue'),
      ];
      for (const target of touchTargets) {
        const box = await target.boundingBox();
        expect(box).not.toBeNull();
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    });
  }

  test('cart template defines a deterministic service-first setup order', async () => {
    const cartTemplate = fs.readFileSync(
      path.join(repoRoot, 'independence-phone-theme/sections/cart.liquid'),
      'utf8'
    );
    expect(cartTemplate).toContain("setup_role_order = 'service,addon_bundle,addon'");
  });

  test('reduced-motion preference pauses passive hero autoplay but allows an explicit sound play', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPreviewRoute(page, 'home');

    const heroVideo = page.locator('#home [data-hero-video-player]');
    const soundButton = page.locator('#home [data-hero-sound-toggle]');
    await expect(soundButton).toHaveAttribute('aria-label', 'Play with sound');
    await expect.poll(() => heroVideo.evaluate((video) => video.paused)).toBe(true);

    await soundButton.click();
    await expect(soundButton).toHaveAttribute('aria-label', 'Sound is on');
    await expect.poll(() => heroVideo.evaluate((video) => video.paused)).toBe(false);
  });
});
