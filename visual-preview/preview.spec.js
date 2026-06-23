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

const routeUrl = (hash) => {
  const [url] = baseUrl.split('#');
  return `${url}#${hash}`;
};

async function openPreviewRoute(page, hash, expectedRoute = hash) {
  await page.goto(routeUrl(hash), { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-preview-route', expectedRoute);
}

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

async function collectRouteReport(page) {
  return page.evaluate(() => {
    const isVisible = (element) => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      return element.offsetParent !== null && rect.width > 0 && rect.height > 0;
    };

    const skipSelector = [
      '.ip-capability',
      '.ip-matrix',
      '.preview-mini-header__drawer',
      '.ip-hero__foreground',
      '.ip-story-card',
      'img',
      'svg',
      'video',
    ].join(',');

    const overflowing = [...document.querySelectorAll('body *')]
      .filter((element) => isVisible(element))
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

    const visibleImages = [...document.images].filter((image) => isVisible(image));
    const brokenImages = visibleImages
      .filter((image) => image.naturalWidth === 0 || image.naturalHeight === 0)
      .map((image) => ({
        src: image.getAttribute('src'),
        alt: image.getAttribute('alt') || '',
      }));

    const visibleSlots = [...document.querySelectorAll('[data-slot]')]
      .filter((element) => isVisible(element))
      .map((element) => element.dataset.slot);

    const storyCardBackgrounds = [...document.querySelectorAll('.ip-story-card')]
      .filter((card) => isVisible(card))
      .map((card) => getComputedStyle(card).backgroundImage);

    return {
      route: document.documentElement.dataset.previewRoute,
      bodyScrollWidth: document.documentElement.scrollWidth,
      bodyClientWidth: document.documentElement.clientWidth,
      previewRibbonCount: document.querySelectorAll('.preview-ribbon').length,
      previewHeaderHeight: Math.round(document.querySelector('.preview-mini-header')?.getBoundingClientRect().height || 0),
      previewLogoHeight: Math.round(document.querySelector('.preview-mini-header img')?.getBoundingClientRect().height || 0),
      visibleSlots,
      visibleSectionCount: [...document.querySelectorAll('.shopify-section')].filter((section) => isVisible(section)).length,
      heroVideoCount: [...document.querySelectorAll('.ip-hero video.ip-hero__video')].filter((element) => isVisible(element)).length,
      heroPosterImageCount: [...document.querySelectorAll('.ip-hero img.ip-hero__image')].filter((element) => isVisible(element)).length,
      heroForegroundCount: [...document.querySelectorAll('.ip-hero__foreground')].filter((element) => isVisible(element)).length,
      visibleProductMainCount: [...document.querySelectorAll('.ip-product-main')].filter((element) => isVisible(element)).length,
      visibleProductFormCount: [...document.querySelectorAll('.ip-product-form')].filter((element) => isVisible(element)).length,
      visibleProductOptionsCount: [...document.querySelectorAll('.ip-product-form .ip-product-options')].filter((element) => isVisible(element)).length,
      visibleProductServiceRadioCount: [...document.querySelectorAll('.ip-product-form input[type="radio"]')].filter((element) => isVisible(element)).length,
      visibleProductAddonCheckboxCount: [...document.querySelectorAll('.ip-product-form input[type="checkbox"]')].filter((element) => isVisible(element)).length,
      visibleFeatureIconImageCount: [...document.querySelectorAll('.ip-feature-strip .ip-strip__icon img')].filter((element) => isVisible(element)).length,
      visibleFeatureIconSvgCount: [...document.querySelectorAll('.ip-feature-strip .ip-strip__icon svg')].filter((element) => isVisible(element)).length,
      visibleCartPropertyListCount: [...document.querySelectorAll('.ip-cart-properties')].filter((element) => isVisible(element)).length,
      visibleCartPropertyRowCount: [...document.querySelectorAll('.ip-cart-properties > div')].filter((element) => isVisible(element)).length,
      visibleContactFormCount: [...document.querySelectorAll('.ip-contact-form')].filter((element) => isVisible(element)).length,
      brokenImages,
      storyCardBackgrounds,
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

function expectSharedLayout(report, viewportName) {
  expect(report.bodyScrollWidth).toBeLessThanOrEqual(report.bodyClientWidth + 2);
  expect(report.previewRibbonCount).toBe(0);
  expect(report.previewHeaderHeight).toBeLessThanOrEqual(viewportName === 'mobile' ? 62 : 66);
  expect(report.previewLogoHeight).toBeLessThanOrEqual(viewportName === 'mobile' ? 34 : 39);
  expect(report.brokenImages).toEqual([]);
  expect(report.overflowing).toEqual([]);
}

test.describe('Independence Phone visual preview', () => {
  for (const viewport of viewports) {
    test(`${viewport.name} keeps home, product, cart, and contact previews isolated`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      await openPreviewRoute(page, 'home', 'home');
      await triggerLazyImages(page);

      const homeReport = await collectRouteReport(page);
      await saveRouteArtifacts(page, viewport.name, 'home', homeReport);

      expectSharedLayout(homeReport, viewport.name);
      expect(homeReport.route).toBe('home');
      expect(homeReport.visibleSlots).toEqual([
        'home.hero',
        'home.feature-strip',
        'products.compare',
        'home.jtbd',
        'package',
        'faq',
        'trust',
      ]);
      expect(homeReport.heroVideoCount).toBe(1);
      expect(homeReport.heroPosterImageCount).toBe(0);
      expect(homeReport.heroForegroundCount).toBe(0);
      expect(homeReport.visibleFeatureIconImageCount).toBe(3);
      expect(homeReport.visibleFeatureIconSvgCount).toBe(0);
      expect(homeReport.visibleProductMainCount).toBe(0);
      expect(homeReport.visibleProductFormCount).toBe(0);
      expect(homeReport.visibleCartPropertyListCount).toBe(0);
      expect(homeReport.visibleContactFormCount).toBe(0);
      expect(homeReport.storyCardBackgrounds).toHaveLength(4);
      expect(homeReport.storyCardBackgrounds.every((background) => background.includes('url('))).toBe(true);
      expect(homeReport.storyCardBackgrounds.join(' ')).toContain('ip-story-bus-days.png');
      expect(homeReport.storyCardBackgrounds.join(' ')).toContain('ip-story-home-alone.png');
      expect(homeReport.storyCardBackgrounds.join(' ')).toContain('ip-story-grandparents.png');
      expect(homeReport.storyCardBackgrounds.join(' ')).toContain('ip-story-before-smartphone.png');

      await expect(page.locator('[data-slot="product.freedom"]')).toBeHidden();
      await expect(page.locator('[data-slot="product.patriot"]')).toBeHidden();
      await expect(page.locator('[data-slot="cart.review"]')).toBeHidden();
      await expect(page.locator('[data-slot="contact.form"]')).toBeHidden();
      await expect(page.getByText('Give them a phone. Not the internet.', { exact: true })).toBeVisible();
      await expect(page.getByText('Auto Attendant Call Screening', { exact: true })).toBeVisible();
      await expect(page.getByText('Questions parents ask before choosing a simpler phone.', { exact: true })).toBeVisible();

      const productRoutes = [
        { hash: 'freedom', slot: 'product.freedom', hiddenSlot: 'product.patriot', heading: 'Freedom Phone' },
        { hash: 'patriot', slot: 'product.patriot', hiddenSlot: 'product.freedom', heading: 'Patriot Phone' },
      ];

      for (const productRoute of productRoutes) {
        await openPreviewRoute(page, productRoute.hash);
        await triggerLazyImages(page);

        const productReport = await collectRouteReport(page);
        await saveRouteArtifacts(page, viewport.name, productRoute.hash, productReport);

        expectSharedLayout(productReport, viewport.name);
        expect(productReport.route).toBe(productRoute.hash);
        expect(productReport.visibleSlots).toEqual([productRoute.slot]);
        expect(productReport.visibleProductMainCount).toBe(1);
        expect(productReport.visibleProductFormCount).toBe(1);
        expect(productReport.visibleProductOptionsCount).toBe(1);
        expect(productReport.visibleProductServiceRadioCount).toBe(2);
        expect(productReport.visibleProductAddonCheckboxCount).toBe(5);
        expect(productReport.visibleCartPropertyListCount).toBe(0);
        expect(productReport.visibleContactFormCount).toBe(0);

        await expect(page.locator(`[data-slot="${productRoute.slot}"]`)).toBeVisible();
        await expect(page.locator(`[data-slot="${productRoute.hiddenSlot}"]`)).toBeHidden();
        await expect(page.locator('[data-slot="home.hero"]')).toBeHidden();
        await expect(page.locator('[data-slot="products.compare"]')).toBeHidden();
        await expect(page.locator(`[data-slot="${productRoute.slot}"] .ip-product-main__thumb`)).toHaveCount(2);
        await expect(page.locator(`[data-slot="${productRoute.slot}"] .ip-product-main__thumb img`)).toHaveCount(2);
        await expect(page.locator(`[data-slot="${productRoute.slot}"] .ip-product-form`)).toBeVisible();
        await expect(page.locator(`[data-slot="${productRoute.slot}"]`).getByText(productRoute.heading, { exact: true })).toBeVisible();
      }

      await openPreviewRoute(page, 'cart');
      await triggerLazyImages(page);

      const cartReport = await collectRouteReport(page);
      await saveRouteArtifacts(page, viewport.name, 'cart', cartReport);

      expectSharedLayout(cartReport, viewport.name);
      expect(cartReport.route).toBe('cart');
      expect(cartReport.visibleSlots).toEqual(['cart.review']);
      expect(cartReport.visibleProductMainCount).toBe(0);
      expect(cartReport.visibleProductFormCount).toBe(0);
      expect(cartReport.visibleCartPropertyListCount).toBe(1);
      expect(cartReport.visibleCartPropertyRowCount).toBeGreaterThanOrEqual(3);
      expect(cartReport.visibleContactFormCount).toBe(0);
      await expect(page.locator('[data-slot="cart.review"]')).toBeVisible();
      await expect(page.locator('[data-slot="cart.review"]').getByText('Your cart', { exact: true })).toBeVisible();
      await expect(page.locator('[data-slot="cart.review"]').getByText('Order summary', { exact: true })).toBeVisible();
      await expect(page.locator('[data-slot="cart.review"]').getByText('Subtotal', { exact: true })).toBeVisible();
      await expect(page.locator('[data-slot="cart.review"]').getByText('Continue shopping', { exact: true })).toBeVisible();
      await expect(page.locator('.ip-cart-properties').getByText('Monthly service - $17.76/mo')).toBeVisible();
      await expect(page.locator('.ip-cart-properties').getByText('Victory Bundle')).toBeVisible();

      await openPreviewRoute(page, 'contact');
      await triggerLazyImages(page);

      const contactReport = await collectRouteReport(page);
      await saveRouteArtifacts(page, viewport.name, 'contact', contactReport);

      expectSharedLayout(contactReport, viewport.name);
      expect(contactReport.route).toBe('contact');
      expect(contactReport.visibleSlots).toEqual(['contact.form']);
      expect(contactReport.visibleProductMainCount).toBe(0);
      expect(contactReport.visibleProductFormCount).toBe(0);
      expect(contactReport.visibleCartPropertyListCount).toBe(0);
      expect(contactReport.visibleContactFormCount).toBe(1);
      await expect(page.locator('[data-slot="contact.form"]')).toBeVisible();
      await expect(page.locator('.ip-contact-form')).toBeVisible();
    });
  }
});
