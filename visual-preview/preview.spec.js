const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { test, expect } = require('@playwright/test');

const baseUrl = process.env.PREVIEW_URL || pathToFileURL(path.join(__dirname, 'index.html')).href;
const screenshotDir = path.join(__dirname, 'screenshots');
const reportDir = path.join(__dirname, 'reports');

fs.mkdirSync(screenshotDir, { recursive: true });
fs.mkdirSync(reportDir, { recursive: true });

const viewports = [
  { name: 'desktop', width: 1440, height: 1400 },
  { name: 'tablet', width: 1024, height: 1400 },
  { name: 'audit', width: 860, height: 853 },
  { name: 'mobile', width: 390, height: 1400 },
];

const routeUrl = (route) => {
  const [rawUrl] = baseUrl.split('#');
  const url = new URL(rawUrl);
  url.searchParams.set('route', route);
  return url.href;
};

async function openPreviewRoute(page, route) {
  await page.goto(routeUrl(route), { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-preview-route', route);
  await expect(page.locator(`[data-preview-pages~="${route}"]`).first()).toBeVisible();
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
      visibleCartAddonOptionCount: [...document.querySelectorAll('[data-cart-addon-option]')].filter(isVisible).length,
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

test.describe('Independence Phone visual preview', () => {
  for (const viewport of viewports) {
    test(`${viewport.name} validates home, order, cart, FAQ, and contact routes`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      await openPreviewRoute(page, 'home');
      await triggerLazyImages(page);
      const homeReport = await collectRouteReport(page);
      await saveRouteArtifacts(page, viewport.name, 'home', homeReport);

      expectSharedLayout(homeReport);
      expect(homeReport.visibleSlots).toEqual([
        'home.hero',
        'home.feature-strip',
        'home.jtbd',
        'faq',
      ]);
      expect(homeReport.heroVideoCount).toBe(1);
      expect(homeReport.visibleFeatureCount).toBe(4);
      await expect(page.locator('#home .ip-hero__price')).toHaveText('$17.76/mo');
      await expect(page.getByRole('link', { name: 'Order now' }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'Turn video sound on' })).toBeVisible();
      await expect(page.getByText('Turn video sound on', { exact: true })).toHaveCount(0);
      await expect(page.getByText('Included in the Patriot Package')).toHaveCount(4);
      await expect(page.locator('[data-slot="products.compare"]')).toBeHidden();

      await openPreviewRoute(page, 'order');
      await triggerLazyImages(page);
      const orderReport = await collectRouteReport(page);
      await saveRouteArtifacts(page, viewport.name, 'order', orderReport);

      expectSharedLayout(orderReport);
      expect(orderReport.visibleSlots).toEqual(['order.builder']);
      expect(orderReport.visibleProductFormCount).toBe(1);
      expect(orderReport.visibleOrderBuilderCount).toBe(1);
      expect(orderReport.visibleOrderPackageCount).toBe(1);
      expect(orderReport.visibleOrderPhoneCount).toBe(2);
      expect(orderReport.visibleOrderPlanCount).toBe(2);
      expect(orderReport.visibleOrderAddonCount).toBe(5);
      const orderBuilder = page.locator('[data-slot="order.builder"]');
      await expect(orderBuilder.getByText('Patriot Package', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('Saves $13.12 compared with 12 monthly payments.')).toBeVisible();
      await expect(page.getByText('Includes every add-on: Call Recording, Quiet Hours, Voicemail to Email, and Auto Attendant. Saves $10/mo.')).toBeVisible();

      await page.locator('#preview-phone-rugged').check();
      await page.locator('#preview-package').check();
      await expect(page.locator('#preview-phone-standard')).toBeChecked();
      await expect(page.locator('#preview-plan-annual')).toBeChecked();
      await expect(page.locator('#preview-addon-bundle')).toBeChecked();
      await expect(page.locator('[data-order-summary-title]')).toHaveText('Classic Phone');
      await expect(page.locator('[data-order-summary-phone]')).toHaveText('$100.00');
      await expect(page.locator('[data-order-summary-service]')).toContainText('Annual service');
      await expect(page.locator('[data-order-summary-addons]')).toContainText('Add-on Bundle');
      await expect(page.locator('[data-order-summary-savings]')).toHaveText('$303.12/yr');
      await page.locator('[data-slot="order.builder"] [data-add-to-cart-button]').click();
      await expect(page.locator('[data-slot="order.builder"] [data-cart-status]')).toContainText('Please agree to the Privacy Policy and Terms and Conditions');
      await page.locator('#preview-policy').check();
      await page.locator('[data-slot="order.builder"] [data-add-to-cart-button]').click();
      await expect(page).toHaveURL(/route=cart/);
      await expect(page.locator('[data-cart-count]').first()).toHaveText('1');

      await triggerLazyImages(page);
      const cartReport = await collectRouteReport(page);
      await saveRouteArtifacts(page, viewport.name, 'cart', cartReport);

      expectSharedLayout(cartReport);
      expect(cartReport.visibleSlots).toEqual(['cart.review']);
      expect(cartReport.visibleCartAddonOptionCount).toBe(5);
      expect(cartReport.visibleCartPropertyRowCount).toBeGreaterThanOrEqual(4);
      await expect(page.locator('[data-preview-cart-title]')).toHaveText('Classic Phone');
      await expect(page.locator('[data-cart-subtotal]')).toHaveText('$100.00');
      await expect(page.locator('[data-cart-savings]')).toHaveText('$303.12/yr');
      await expect(page.locator('.ip-cart-properties')).toContainText('Patriot Package');
      await expect(page.locator('.ip-cart-properties')).toContainText('Add-on Bundle');
      await expect(page.locator('[data-cart-addon-selector]').getByText('Auto Attendant', { exact: true })).toBeVisible();
      await page.locator('#preview-cart-policy').check();

      await openPreviewRoute(page, 'faq');
      await triggerLazyImages(page);
      const faqReport = await collectRouteReport(page);
      await saveRouteArtifacts(page, viewport.name, 'faq', faqReport);

      expectSharedLayout(faqReport);
      expect(faqReport.visibleSlots).toEqual(['faq']);
      await expect(page.getByText('Questions parents ask when choosing Independence Phone.', { exact: true })).toBeVisible();

      await openPreviewRoute(page, 'contact');
      await triggerLazyImages(page);
      const contactReport = await collectRouteReport(page);
      await saveRouteArtifacts(page, viewport.name, 'contact', contactReport);

      expectSharedLayout(contactReport);
      expect(contactReport.visibleSlots).toEqual(['contact.form']);
      expect(contactReport.visibleContactFormCount).toBe(1);
      await expect(page.locator('.ip-contact-form')).toBeVisible();
    });
  }
});
