(() => {
  if (window.__ipCartExperienceReady) return;
  window.__ipCartExperienceReady = true;

  const locale = document.documentElement.lang || 'en-US';
  const shopRoot = window.Shopify?.routes?.root || '/';
  const endpoint = (path) => `${shopRoot}${path.replace(/^\//, '')}`;
  const previewStorageKey = 'ipPreviewCart';
  const previewCart = {
    currency: 'USD',
    price: 9900,
    quantity: 0,
    title: 'Freedom Phone',
  };

  const formatMoney = (cents, currency = 'USD') =>
    new Intl.NumberFormat(locale, {
      currency,
      style: 'currency',
    }).format((Number(cents) || 0) / 100);

  const setCartCount = (count) => {
    document.querySelectorAll('[data-cart-count]').forEach((badge) => {
      badge.textContent = String(count);
      badge.hidden = count <= 0;
      badge.setAttribute('aria-label', `${count} item${count === 1 ? '' : 's'} in cart`);
    });
  };

  const setStatus = (container, message, state = 'success') => {
    const status = container?.querySelector('[data-cart-status]');
    if (!status) return;
    status.textContent = message;
    status.dataset.state = state;
    status.hidden = false;
  };

  const setBusy = (element, busy) => {
    if (!element) return;
    element.toggleAttribute('aria-busy', busy);
    element.querySelectorAll('button, input, select').forEach((control) => {
      if (control.name === 'checkout') return;
      if (busy) {
        if (control.disabled) control.dataset.wasDisabled = 'true';
        control.disabled = true;
        return;
      }
      if (control.dataset.wasDisabled === 'true') {
        delete control.dataset.wasDisabled;
        return;
      }
      control.disabled = false;
    });
  };

  const fetchJson = async (url, options = {}) => {
    const response = await fetch(url, {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.description || data.message || 'Cart update failed.');
    }
    return data;
  };

  const getCart = () => fetchJson(endpoint('cart.js'));

  const loadPreviewCart = () => {
    try {
      const saved = JSON.parse(window.sessionStorage?.getItem(previewStorageKey) || 'null');
      if (!saved) return;
      previewCart.currency = saved.currency || previewCart.currency;
      previewCart.price = Number(saved.price || previewCart.price);
      previewCart.quantity = Math.max(0, Number(saved.quantity || 0));
      previewCart.title = saved.title || previewCart.title;
    } catch (_error) {
      window.sessionStorage?.removeItem(previewStorageKey);
    }
  };

  const savePreviewCart = () => {
    window.sessionStorage?.setItem(previewStorageKey, JSON.stringify(previewCart));
  };

  const renderCart = (cart) => {
    const currency = cart.currency || document.documentElement.dataset.cartCurrency || 'USD';
    setCartCount(cart.item_count || 0);

    document.querySelectorAll('[data-cart-subtotal]').forEach((subtotal) => {
      subtotal.textContent = formatMoney(cart.total_price, currency);
    });

    document.querySelectorAll('[data-cart-line-price]').forEach((price) => {
      const line = Number(price.dataset.cartLinePrice || 0);
      const item = cart.items?.[line - 1];
      price.textContent = formatMoney(item?.final_line_price || 0, currency);
    });
  };

  const updatePreviewCart = (quantity = previewCart.quantity) => {
    previewCart.quantity = Math.max(0, Number(quantity) || 0);
    const total = previewCart.price * previewCart.quantity;

    setCartCount(previewCart.quantity);
    document.querySelectorAll('[data-preview-cart-title]').forEach((title) => {
      title.textContent = previewCart.title;
    });
    document.querySelectorAll('[data-cart-quantity]').forEach((input) => {
      if (input.closest('[data-preview-cart]')) {
        input.value = String(previewCart.quantity);
      }
    });
    document.querySelectorAll('[data-cart-line-price], [data-cart-subtotal]').forEach((price) => {
      price.textContent = formatMoney(total, previewCart.currency);
    });
    savePreviewCart();
  };

  const addPreviewProduct = (form, submitter) => {
    previewCart.title = form.dataset.productTitle || previewCart.title;
    previewCart.price = Number(form.dataset.productPriceCents || previewCart.price);
    previewCart.currency = form.dataset.productCurrency || previewCart.currency;
    previewCart.quantity = Math.max(1, Number(form.querySelector('[name="quantity"]')?.value || 1));
    updatePreviewCart(previewCart.quantity);
    setStatus(form, `Added ${previewCart.quantity} ${previewCart.title}${previewCart.quantity === 1 ? '' : 's'} to cart.`);
    if (submitter) {
      submitter.textContent = 'Added to cart';
      window.setTimeout(() => {
        submitter.textContent = 'Add to cart';
      }, 1600);
    }
  };

  const addProduct = async (form, submitter) => {
    const formData = new FormData(form);
    setBusy(form, true);
    try {
      await fetchJson(endpoint('cart/add.js'), {
        body: formData,
        method: 'POST',
      });
      const cart = await getCart();
      renderCart(cart);
      setStatus(form, 'Added to cart. You can review your order from the cart.');
      if (submitter) {
        submitter.textContent = 'Added to cart';
        window.setTimeout(() => {
          submitter.textContent = submitter.dataset.defaultText || 'Add to cart';
        }, 1600);
      }
    } catch (error) {
      setStatus(form, error.message, 'error');
    } finally {
      setBusy(form, false);
    }
  };

  const updateCartLine = async (input) => {
    const form = input.closest('[data-cart-form]');
    const line = Number(input.dataset.cartLine || 0);
    const quantity = Math.max(0, Number(input.value) || 0);
    if (!line) return;

    setBusy(form, true);
    try {
      const cart = await fetchJson(endpoint('cart/change.js'), {
        body: JSON.stringify({ line, quantity }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      renderCart(cart);
      setStatus(form, 'Cart updated.');
      if (quantity === 0 || cart.item_count === 0) {
        window.location.reload();
      }
    } catch (error) {
      setStatus(form, error.message, 'error');
    } finally {
      setBusy(form, false);
    }
  };

  document.addEventListener('submit', (event) => {
    const form = event.target.closest('.ip-product-form');
    const submitter = event.submitter;
    if (!form || !submitter?.matches('[data-add-to-cart-button]')) return;

    event.preventDefault();
    if (form.matches('[data-preview-product-form]')) {
      addPreviewProduct(form, submitter);
      return;
    }
    addProduct(form, submitter);
  });

  document.addEventListener('change', (event) => {
    const input = event.target.closest('[data-cart-quantity]');
    if (!input) return;

    if (input.closest('[data-preview-cart]')) {
      updatePreviewCart(input.value);
      return;
    }
    updateCartLine(input);
  });

  document.addEventListener('click', (event) => {
    const remove = event.target.closest('[data-preview-remove]');
    if (!remove) return;

    event.preventDefault();
    updatePreviewCart(0);
    setStatus(remove.closest('[data-preview-cart]'), 'Item removed from preview cart.');
  });

  if (document.querySelector('[data-preview-cart]')) {
    loadPreviewCart();
    if (document.documentElement.dataset.previewRoute === 'cart' && previewCart.quantity === 0) {
      previewCart.quantity = 1;
    }
    updatePreviewCart(previewCart.quantity);
  }
})();
