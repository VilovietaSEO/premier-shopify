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
  { name: 'mobile', width: 390, height: 1400 },
];

const requiredSlots = [
  'home.hero',
  'home.jtbd',
  'home.feature-strip',
  'products.compare',
  'service.plans',
  'addons',
  'capabilities',
  'package',
  'product.freedom',
  'product.patriot',
  'faq',
  'contact.form',
  'trust',
];

const requiredText = [
  'Give them a phone. Not the internet.',
  'Reachable without scrollable',
  'A phone that acts like a phone',
  'The useful part of a phone, first.',
  'A family phone for the smartphone-free years',
  'Freedom Phone',
  'Patriot Phone',
  '$17.76/mo',
  '$200/yr',
  'Victory Bundle',
  'No web browser',
  'Questions parents ask before choosing a simpler phone.',
  'American-owned',
  '42 years in communications',
];

async function triggerLazyImages(page) {
  await page.evaluate(async () => {
    const step = 600;
    const delay = 20;
    for (let y = 0; y <= document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    window.scrollTo(0, 0);
  });
}

test.describe('Independence Phone visual preview', () => {
  for (const viewport of viewports) {
    test(`${viewport.name} covers scoped pages without layout regressions`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(baseUrl, { waitUntil: 'networkidle' });
      await triggerLazyImages(page);

      for (const slot of requiredSlots) {
        await expect(page.locator(`[data-slot="${slot}"]`), `${slot} should render`).toBeVisible();
      }

      for (const text of requiredText) {
        await expect(page.getByText(text, { exact: true }).first(), `${text} should render`).toBeVisible();
      }

      await expect(page.locator('#home'), 'Home marker should exist').toBeVisible();
      await expect(page.locator('#choose'), 'Choose marker should exist').toBeVisible();
      await expect(page.locator('#freedom'), 'Freedom product marker should exist').toBeVisible();
      await expect(page.locator('#patriot'), 'Patriot product marker should exist').toBeVisible();
      await expect(page.locator('#contact'), 'Contact marker should exist').toBeVisible();
      await expect(page.locator('.ip-product-form'), 'Both product forms should render').toHaveCount(2);
      await expect(page.locator('.ip-product-form .ip-product-options'), 'Both product forms should expose service/add-on options').toHaveCount(2);
      await expect(page.locator('.ip-product-form input[type="radio"]'), 'Service plan radios should render').toHaveCount(4);
      await expect(page.locator('.ip-product-form input[type="checkbox"]'), 'Add-on checkboxes should render').toHaveCount(10);
      await expect(page.locator('.ip-contact-form'), 'Contact form should render').toHaveCount(1);

      const result = await page.evaluate(() => {
        const skipSelector = [
          '.ip-capability',
          '.ip-matrix',
          '.preview-ribbon',
          'img',
          'svg',
          'video',
        ].join(',');

        const overflowing = [...document.querySelectorAll('body *')]
          .filter((element) => !element.closest(skipSelector))
          .filter((element) => element.scrollWidth > element.clientWidth + 2)
          .slice(0, 20)
          .map((element) => ({
            tag: element.tagName.toLowerCase(),
            className: element.className || '',
            text: (element.textContent || '').trim().slice(0, 80),
            scrollWidth: element.scrollWidth,
            clientWidth: element.clientWidth,
          }));

        const brokenImages = [...document.images]
          .filter((image) => image.naturalWidth === 0 || image.naturalHeight === 0)
          .map((image) => ({
            src: image.getAttribute('src'),
            alt: image.getAttribute('alt') || '',
          }));

        return {
          bodyScrollWidth: document.documentElement.scrollWidth,
          bodyClientWidth: document.documentElement.clientWidth,
          sectionCount: document.querySelectorAll('.shopify-section').length,
          productFormCount: document.querySelectorAll('.ip-product-form').length,
          productOptionsCount: document.querySelectorAll('.ip-product-form .ip-product-options').length,
          productServiceRadioCount: document.querySelectorAll('.ip-product-form input[type="radio"]').length,
          productAddonCheckboxCount: document.querySelectorAll('.ip-product-form input[type="checkbox"]').length,
          contactFormCount: document.querySelectorAll('.ip-contact-form').length,
          brokenImages,
          overflowing,
        };
      });

      await page.screenshot({
        path: path.join(screenshotDir, `${viewport.name}.png`),
        fullPage: true,
      });

      fs.writeFileSync(
        path.join(reportDir, `${viewport.name}.json`),
        JSON.stringify(result, null, 2)
      );

      expect(result.bodyScrollWidth).toBeLessThanOrEqual(result.bodyClientWidth + 2);
      expect(result.sectionCount).toBeGreaterThanOrEqual(13);
      expect(result.productFormCount).toBe(2);
      expect(result.productOptionsCount).toBe(2);
      expect(result.productServiceRadioCount).toBe(4);
      expect(result.productAddonCheckboxCount).toBe(10);
      expect(result.contactFormCount).toBe(1);
      expect(result.brokenImages).toEqual([]);
      expect(result.overflowing).toEqual([]);
    });
  }
});
