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
  'package',
  'product.freedom',
  'product.patriot',
  'cart.review',
  'faq',
  'contact.form',
  'trust',
];

const requiredText = [
  'Give them a phone. Not the internet.',
  'Reachable without scrollable',
  'A phone that acts like a phone',
  'The useful part of a phone, first.',
  'Auto Attendant Call Screening',
  'Programmable On/Off Phone Times',
  'Freedom Phone',
  'Patriot Phone',
  '$17.76/mo',
  '$200/yr',
  'Victory Bundle',
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

      await expect(page.locator('#home'), 'Home anchor should exist').toBeVisible();
      await expect(page.locator('#choose'), 'Choose anchor should exist').toBeVisible();
      await expect(page.locator('#freedom'), 'Freedom product anchor should exist').toBeVisible();
      await expect(page.locator('#patriot'), 'Patriot product anchor should exist').toBeVisible();
      await expect(page.locator('#cart'), 'Cart anchor should exist').toBeVisible();
      await expect(page.locator('#contact'), 'Contact anchor should exist').toBeVisible();
      await expect(page.locator('.ip-product-form'), 'Both product forms should render').toHaveCount(2);
      await expect(page.locator('.ip-product-form .ip-product-options'), 'Both product forms should expose service/add-on options').toHaveCount(2);
      await expect(page.locator('.ip-hero video.ip-hero__video'), 'Hero should render as a video').toHaveCount(1);
      await expect(page.locator('.ip-hero img.ip-hero__image'), 'Hero should not fall back to a poster image in the preview').toHaveCount(0);
      await expect(page.locator('.ip-hero__foreground'), 'Hero should not render a foreground phone layer').toHaveCount(0);
      await expect(page.locator('.ip-feature-strip .ip-strip__icon img'), 'Feature cards should use custom icon image assets').toHaveCount(3);
      await expect(page.locator('.ip-feature-strip .ip-strip__icon svg'), 'Feature cards should not use generic inline SVG icons').toHaveCount(0);
      await expect(page.locator('.preview-mini-header details'), 'Preview header should expose a small-screen drawer').toHaveCount(1);
      await expect(page.locator('.ip-product-form input[type="radio"]'), 'Service plan radios should render').toHaveCount(4);
      await expect(page.locator('.ip-product-form input[type="checkbox"]'), 'Add-on checkboxes should render').toHaveCount(10);
      await expect(page.locator('.ip-cart-properties'), 'Cart should render setup property details').toHaveCount(1);
      await expect(page.locator('.ip-cart-properties').getByText('Monthly service - $17.76/mo')).toBeVisible();
      await expect(page.locator('.ip-cart-properties').getByText('Victory Bundle')).toBeVisible();
      await expect(page.locator('.ip-contact-form'), 'Contact form should render').toHaveCount(1);

      const result = await page.evaluate(() => {
        const skipSelector = [
          '.ip-capability',
          '.ip-matrix',
          '.preview-ribbon',
          '.preview-mini-header__drawer',
          '.ip-hero__foreground',
          '.ip-story-card',
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

	        const storyCardBackgrounds = [...document.querySelectorAll('.ip-story-card')]
	          .map((card) => getComputedStyle(card).backgroundImage);

	        return {
          bodyScrollWidth: document.documentElement.scrollWidth,
          bodyClientWidth: document.documentElement.clientWidth,
          sectionCount: document.querySelectorAll('.shopify-section').length,
          heroVideoCount: document.querySelectorAll('.ip-hero video.ip-hero__video').length,
          heroPosterImageCount: document.querySelectorAll('.ip-hero img.ip-hero__image').length,
          heroForegroundCount: document.querySelectorAll('.ip-hero__foreground').length,
          featureIconImageCount: document.querySelectorAll('.ip-feature-strip .ip-strip__icon img').length,
          featureIconSvgCount: document.querySelectorAll('.ip-feature-strip .ip-strip__icon svg').length,
          productFormCount: document.querySelectorAll('.ip-product-form').length,
          productOptionsCount: document.querySelectorAll('.ip-product-form .ip-product-options').length,
          productServiceRadioCount: document.querySelectorAll('.ip-product-form input[type="radio"]').length,
          productAddonCheckboxCount: document.querySelectorAll('.ip-product-form input[type="checkbox"]').length,
          cartPropertyListCount: document.querySelectorAll('.ip-cart-properties').length,
          cartPropertyRowCount: document.querySelectorAll('.ip-cart-properties > div').length,
	          contactFormCount: document.querySelectorAll('.ip-contact-form').length,
	          brokenImages,
	          storyCardBackgrounds,
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
      expect(result.sectionCount).toBeGreaterThanOrEqual(11);
      expect(result.heroVideoCount).toBe(1);
      expect(result.heroPosterImageCount).toBe(0);
      expect(result.heroForegroundCount).toBe(0);
      expect(result.featureIconImageCount).toBe(3);
      expect(result.featureIconSvgCount).toBe(0);
      expect(result.productFormCount).toBe(2);
      expect(result.productOptionsCount).toBe(2);
      expect(result.productServiceRadioCount).toBe(4);
      expect(result.productAddonCheckboxCount).toBe(10);
      expect(result.cartPropertyListCount).toBe(1);
      expect(result.cartPropertyRowCount).toBeGreaterThanOrEqual(3);
	      expect(result.contactFormCount).toBe(1);
	      expect(result.brokenImages).toEqual([]);
	      expect(result.storyCardBackgrounds).toHaveLength(4);
	      expect(result.storyCardBackgrounds.every((background) => background.includes('url('))).toBe(true);
	      expect(result.storyCardBackgrounds.join(' ')).toContain('ip-story-bus-days.png');
	      expect(result.storyCardBackgrounds.join(' ')).toContain('ip-story-home-alone.png');
	      expect(result.storyCardBackgrounds.join(' ')).toContain('ip-story-grandparents.png');
	      expect(result.storyCardBackgrounds.join(' ')).toContain('ip-story-before-smartphone.png');
	      expect(result.storyCardBackgrounds.some((background) => background.includes('independence-phone-theme/independence-phone-theme'))).toBe(false);
	      expect(result.overflowing).toEqual([]);
    });
  }
});
