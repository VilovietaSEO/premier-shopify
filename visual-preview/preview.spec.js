const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const baseUrl = process.env.PREVIEW_URL || 'http://127.0.0.1:4173/visual-preview/';
const screenshotDir = path.join(__dirname, 'screenshots');
const reportDir = path.join(__dirname, 'reports');

fs.mkdirSync(screenshotDir, { recursive: true });
fs.mkdirSync(reportDir, { recursive: true });

const viewports = [
  { name: 'desktop', width: 1440, height: 1400 },
  { name: 'tablet', width: 1024, height: 1400 },
  { name: 'mobile', width: 390, height: 1400 },
];

test.describe('Independence Phone visual preview', () => {
  for (const viewport of viewports) {
    test(`${viewport.name} has no page-level horizontal overflow`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(baseUrl, { waitUntil: 'networkidle' });

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

        return {
          bodyScrollWidth: document.documentElement.scrollWidth,
          bodyClientWidth: document.documentElement.clientWidth,
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
      expect(result.overflowing).toEqual([]);
    });
  }
});
