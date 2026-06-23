(() => {
  if (window.__ipProductGalleryReady) return;
  window.__ipProductGalleryReady = true;

  const gallerySelector = '[data-product-gallery]';
  const slideSelector = '[data-gallery-slide]';
  const thumbSelector = '[data-gallery-thumb]';
  const openSelector = '[data-gallery-open]';
  let activeGallery = null;
  let lightbox = null;
  let previousFocus = null;
  let pointerStart = null;

  const getSlides = (gallery) => [...(gallery?.querySelectorAll(slideSelector) || [])];
  const getThumbs = (gallery) => [...(gallery?.querySelectorAll(thumbSelector) || [])];

  const getCurrentIndex = (gallery) => {
    const slides = getSlides(gallery);
    const active = slides.findIndex((slide) => slide.classList.contains('is-active'));
    return active >= 0 ? active : 0;
  };

  const getActiveImage = (gallery) => {
    const slide = getSlides(gallery)[getCurrentIndex(gallery)];
    return slide?.querySelector('img');
  };

  const ensureLightbox = () => {
    if (lightbox) return lightbox;

    lightbox = document.createElement('div');
    lightbox.className = 'ip-gallery-lightbox';
    lightbox.dataset.galleryLightbox = '';
    lightbox.hidden = true;
    lightbox.setAttribute('aria-hidden', 'true');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('role', 'dialog');
    lightbox.innerHTML = `
      <button class="ip-gallery-lightbox__close" type="button" data-gallery-close aria-label="Close full view">X</button>
      <button class="ip-gallery-lightbox__nav ip-gallery-lightbox__nav--prev" type="button" data-gallery-direction="-1" aria-label="Previous image">&lsaquo;</button>
      <div class="ip-gallery-lightbox__media" data-gallery-lightbox-media>
        <img alt="">
      </div>
      <button class="ip-gallery-lightbox__nav ip-gallery-lightbox__nav--next" type="button" data-gallery-direction="1" aria-label="Next image">&rsaquo;</button>
      <p class="ip-gallery-lightbox__count" data-gallery-lightbox-count></p>
    `;
    document.body.append(lightbox);
    return lightbox;
  };

  const updateLightbox = () => {
    if (!activeGallery || !lightbox || lightbox.hidden) return;

    const image = getActiveImage(activeGallery);
    const target = lightbox.querySelector('img');
    const counter = lightbox.querySelector('[data-gallery-lightbox-count]');
    const slides = getSlides(activeGallery);
    const current = getCurrentIndex(activeGallery);

    if (!image || !target) return;
    target.src = image.currentSrc || image.src;
    target.alt = image.alt || activeGallery.dataset.galleryTitle || 'Product image';
    if (counter) counter.textContent = `${current + 1} / ${slides.length}`;
  };

  const setActive = (gallery, nextIndex, options = {}) => {
    const slides = getSlides(gallery);
    const thumbs = getThumbs(gallery);
    if (!slides.length) return;

    const safeIndex = (nextIndex + slides.length) % slides.length;
    gallery.dataset.galleryIndex = String(safeIndex);

    slides.forEach((slide, index) => {
      const active = index === safeIndex;
      slide.hidden = !active;
      slide.classList.toggle('is-active', active);
      if (slide.matches(openSelector)) slide.tabIndex = active ? 0 : -1;
    });

    thumbs.forEach((thumb, index) => {
      const active = index === safeIndex;
      thumb.classList.toggle('is-active', active);
      thumb.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    if (options.focusThumb && thumbs[safeIndex]) thumbs[safeIndex].focus();
    updateLightbox();
  };

  const shiftActive = (gallery, delta, options = {}) => {
    if (!gallery) return;
    setActive(gallery, getCurrentIndex(gallery) + delta, options);
  };

  const openLightbox = (gallery, requestedIndex) => {
    if (!gallery) return;
    activeGallery = gallery;
    previousFocus = document.activeElement;
    ensureLightbox();
    setActive(gallery, Number.isFinite(requestedIndex) ? requestedIndex : getCurrentIndex(gallery));
    lightbox.hidden = false;
    lightbox.setAttribute('aria-hidden', 'false');
    updateLightbox();
    document.documentElement.classList.add('ip-gallery-lock');
    lightbox.querySelector('[data-gallery-close]')?.focus();
  };

  const closeLightbox = () => {
    if (!lightbox || lightbox.hidden) return;
    lightbox.hidden = true;
    lightbox.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('ip-gallery-lock');
    activeGallery = null;
    if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
  };

  document.addEventListener('click', (event) => {
    const close = event.target.closest('[data-gallery-close]');
    if (close) {
      closeLightbox();
      return;
    }

    if (lightbox && event.target === lightbox) {
      closeLightbox();
      return;
    }

    const nav = event.target.closest('[data-gallery-direction]');
    if (nav && activeGallery) {
      shiftActive(activeGallery, Number(nav.dataset.galleryDirection || 0));
      return;
    }

    const thumb = event.target.closest(thumbSelector);
    if (thumb) {
      const gallery = thumb.closest(gallerySelector);
      setActive(gallery, Number(thumb.dataset.galleryThumb || 0));
      return;
    }

    const opener = event.target.closest(openSelector);
    if (!opener || opener.closest('[data-gallery-lightbox]')) return;
    if (event.target.closest('video, iframe')) return;

    const gallery = opener.closest(gallerySelector);
    const slide = opener.closest(slideSelector);
    const index = slide ? Number(slide.dataset.gallerySlide || 0) : getCurrentIndex(gallery);
    openLightbox(gallery, index);
  });

  document.addEventListener('keydown', (event) => {
    if (lightbox && !lightbox.hidden && activeGallery) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeLightbox();
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        shiftActive(activeGallery, event.key === 'ArrowRight' ? 1 : -1);
      }
      return;
    }

    const opener = event.target.closest(openSelector);
    if (opener && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      const gallery = opener.closest(gallerySelector);
      const slide = opener.closest(slideSelector);
      openLightbox(gallery, slide ? Number(slide.dataset.gallerySlide || 0) : getCurrentIndex(gallery));
      return;
    }

    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const gallery = event.target.closest(gallerySelector);
    if (!gallery) return;

    event.preventDefault();
    shiftActive(gallery, event.key === 'ArrowRight' ? 1 : -1, { focusThumb: true });
  });

  document.addEventListener('pointerdown', (event) => {
    const zone = event.target.closest('.ip-product-main__media, [data-gallery-lightbox-media]');
    if (!zone) return;
    const gallery = activeGallery || zone.closest(gallerySelector);
    if (!gallery) return;
    pointerStart = {
      gallery,
      x: event.clientX,
      y: event.clientY,
    };
  });

  document.addEventListener('pointerup', (event) => {
    if (!pointerStart) return;
    const deltaX = event.clientX - pointerStart.x;
    const deltaY = event.clientY - pointerStart.y;
    const gallery = pointerStart.gallery;
    pointerStart = null;

    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;
    shiftActive(gallery, deltaX < 0 ? 1 : -1);
  });
})();
