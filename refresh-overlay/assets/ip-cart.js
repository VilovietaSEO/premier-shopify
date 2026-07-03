(() => {
  if (window.__ipCartExperienceReady) return;
  window.__ipCartExperienceReady = true;

  const locale = document.documentElement.lang || 'en-US';
  const shopRoot = window.Shopify?.routes?.root || '/';
  const endpoint = (path) => `${shopRoot}${path.replace(/^\//, '')}`;
  const previewStorageKey = 'ipPreviewCart';
  const previewCart = {
    currency: 'USD',
    imageAlt: 'Classic Phone',
    imageSrc: '',
    price: 10000,
    properties: [],
    quantity: 0,
    title: 'Classic Phone',
  };

  const formatMoney = (cents, currency = 'USD') =>
    new Intl.NumberFormat(locale, {
      currency,
      style: 'currency',
    }).format((Number(cents) || 0) / 100);

  const propertyNameFromInput = (input) => {
    const match = input.name?.match(/^properties\[(.+)]$/);
    if (match) return match[1];
    return input.closest('fieldset')?.querySelector('legend')?.textContent?.trim() || input.name || 'Option';
  };

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

  const fetchCredentialsFor = (url) => {
    try {
      return new URL(url, window.location.href).origin === window.location.origin ? 'same-origin' : 'omit';
    } catch (_error) {
      return 'same-origin';
    }
  };

  const propertyEntriesFromCart = (properties = {}) => {
    if (Array.isArray(properties)) {
      return properties
        .map((property) => ({
          name: String(property.name || property.key || '').trim(),
          value: String(property.value ?? '').trim(),
        }))
        .filter((property) => property.name);
    }

    if (typeof properties === 'object' && properties !== null) {
      return Object.entries(properties)
        .map(([name, value]) => ({
          name: String(name).trim(),
          value: String(value ?? '').trim(),
        }))
        .filter((property) => property.name);
    }

    return [];
  };

  const cartPropertyValue = (properties, name) => {
    const match = propertyEntriesFromCart(properties).find((property) => property.name === name);
    return match?.value || '';
  };

  const visibleCartProperties = (properties) =>
    propertyEntriesFromCart(properties).filter((property) => !property.name.startsWith('_'));

  const cartLineRole = (item) => {
    const role = cartPropertyValue(item.properties, '_setup_role');
    if (role) return role;
    if (cartPropertyValue(item.properties, '_setup_parent') === 'true') return 'billing';
    if (cartPropertyValue(item.properties, 'Phone')) return 'phone';
    return 'product';
  };

  const normalizeCheckoutLine = (item, index) => {
    const properties = item.properties || {};
    return {
      line_index: index + 1,
      key: item.key || '',
      role: cartLineRole(item),
      setup_id: cartPropertyValue(properties, '_setup_id'),
      setup_parent: cartPropertyValue(properties, '_setup_parent') === 'true',
      setup_billing_name: cartPropertyValue(properties, '_setup_billing_name'),
      setup_billing_value: cartPropertyValue(properties, '_setup_billing_value'),
      setup_phone: cartPropertyValue(properties, '_setup_phone'),
      shopify_product_id: item.product_id || '',
      shopify_variant_id: item.variant_id || item.id || '',
      shopify_handle: item.handle || '',
      sku: item.sku || '',
      title: item.product_title || item.title || '',
      variant_title: item.variant_title || '',
      quantity: Number(item.quantity || 0),
      unit_price_cents: Number(item.final_price ?? item.price ?? 0),
      final_line_price_cents: Number(item.final_line_price ?? item.line_price ?? 0),
      currency: document.documentElement.dataset.cartCurrency || 'USD',
      requires_shipping: Boolean(item.requires_shipping),
      taxable: Boolean(item.taxable),
      visible_properties: visibleCartProperties(properties),
    };
  };

  const setupSummaryFromLines = (lines) => {
    const phone = lines.find((line) => line.role === 'phone' || !line.setup_parent);
    const service = lines.find((line) => line.role === 'service');
    const packageLine = lines.find((line) => line.role === 'package');
    const addons = lines.filter((line) => ['addon', 'addon_bundle'].includes(line.role));

    return {
      phone: phone?.title || phone?.setup_phone || '',
      service: service?.setup_billing_value || service?.title || '',
      package: packageLine?.setup_billing_value || '',
      add_ons: addons.map((line) => line.setup_billing_name || line.title).filter(Boolean),
    };
  };

  const buildCheckoutHandoffPayload = (cart, form) => {
    const acceptedPolicy = form.querySelector('input[name="attributes[Policy agreement]"]:checked');
    const lines = (cart.items || []).map(normalizeCheckoutLine);
    const groups = new Map();
    const ungroupedLines = [];

    for (const line of lines) {
      if (!line.setup_id) {
        ungroupedLines.push(line);
        continue;
      }
      if (!groups.has(line.setup_id)) {
        groups.set(line.setup_id, {
          setup_id: line.setup_id,
          quantity: line.quantity,
          lines: [],
        });
      }
      const group = groups.get(line.setup_id);
      group.lines.push(line);
      if (line.role === 'phone' || !line.setup_parent) {
        group.quantity = line.quantity;
        group.phone_line = line;
      }
    }

    const setups = [...groups.values()].map((group) => ({
      ...group,
      summary: setupSummaryFromLines(group.lines),
    }));

    return {
      schema: 'independence_phone.revio_checkout.v1',
      source: 'shopify-theme-cart',
      occurred_at: new Date().toISOString(),
      source_url: window.location.href,
      referrer: document.referrer || '',
      consent: {
        privacy_terms_accepted: Boolean(acceptedPolicy),
        policy_agreement: acceptedPolicy?.value || '',
      },
      customer: {},
      cart: {
        token: cart.token || '',
        currency: cart.currency || document.documentElement.dataset.cartCurrency || 'USD',
        item_count: cartDisplayCount(cart),
        raw_item_count: cart.item_count || 0,
        total_price_cents: Number(cart.total_price || 0),
        items_subtotal_price_cents: Number(cart.items_subtotal_price || 0),
        total_discount_cents: Number(cart.total_discount || 0),
      },
      setup_count: setups.length,
      setups,
      lines,
      ungrouped_lines: ungroupedLines,
    };
  };

  const submitCheckoutHandoff = async (form, submitter) => {
    const handoffUrl = String(form.dataset.revioCheckoutUrl || '').trim();
    if (!handoffUrl || submitter?.name !== 'checkout') return false;

    if (!form.reportValidity()) return true;

    setBusy(form, true);
    try {
      const cart = await getCart();
      const payload = buildCheckoutHandoffPayload(cart, form);
      const response = await fetch(handoffUrl, {
        body: JSON.stringify(payload),
        credentials: fetchCredentialsFor(handoffUrl),
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });

      if (response.redirected && response.url) {
        window.location.assign(response.url);
        return true;
      }

      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await response.json() : { message: await response.text() };

      if (!response.ok || data.ok === false) {
        const message = data.errors?.join(', ') || data.message || 'Checkout handoff failed.';
        throw new Error(message);
      }

      const redirectUrl = data.redirect_url || data.checkout_url || '';
      if (redirectUrl) {
        window.location.assign(redirectUrl);
        return true;
      }

      setStatus(form, 'Checkout details received. We will confirm the next step shortly.');
      return true;
    } catch (error) {
      setStatus(form, error.message, 'error');
      return true;
    } finally {
      setBusy(form, false);
    }
  };

  const createSetupId = () => {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `setup-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const isSetupChild = (properties = {}) => {
    if (Array.isArray(properties)) {
      return properties.some((property) =>
        property.name === '_setup_parent' && String(property.value) === 'true'
      );
    }
    return String(properties._setup_parent || '') === 'true';
  };

  const cartDisplayCount = (cart) => {
    if (!Array.isArray(cart.items)) return cart.item_count || 0;
    return cart.items.reduce((count, item) => {
      if (isSetupChild(item.properties)) return count;
      return count + (Number(item.quantity) || 0);
    }, 0);
  };

  const loadPreviewCart = () => {
    try {
      const saved = JSON.parse(window.sessionStorage?.getItem(previewStorageKey) || 'null');
      if (!saved) return;
      previewCart.currency = saved.currency || previewCart.currency;
      previewCart.imageAlt = saved.imageAlt || previewCart.imageAlt;
      previewCart.imageSrc = saved.imageSrc || previewCart.imageSrc;
      previewCart.price = Number(saved.price || previewCart.price);
      previewCart.properties = Array.isArray(saved.properties) ? saved.properties : [];
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
    setCartCount(cartDisplayCount(cart));

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
    const hasItems = previewCart.quantity > 0;
    const serviceProperty = previewCart.properties.find((property) => property.name === 'Service plan');

    setCartCount(previewCart.quantity);
    document.querySelectorAll('[data-preview-cart-empty]').forEach((empty) => {
      empty.hidden = hasItems;
    });
    document.querySelectorAll('[data-preview-cart]').forEach((cart) => {
      cart.hidden = !hasItems;
    });
    document.querySelectorAll('[data-preview-cart-title]').forEach((title) => {
      title.textContent = previewCart.title;
    });
    document.querySelectorAll('[data-preview-cart-image]').forEach((image) => {
      if (previewCart.imageSrc) image.src = previewCart.imageSrc;
      image.alt = previewCart.imageAlt || previewCart.title;
    });
    document.querySelectorAll('[data-cart-quantity]').forEach((input) => {
      if (input.closest('[data-preview-cart]')) {
        input.value = String(previewCart.quantity);
      }
    });
    document.querySelectorAll('[data-cart-line-price], [data-cart-subtotal]').forEach((price) => {
      price.textContent = formatMoney(total, previewCart.currency);
    });
    document.querySelectorAll('[data-preview-cart-properties]').forEach((list) => {
      renderPropertyList(list, previewCart.properties);
    });
    updateCartSavings();
    document.querySelectorAll('[data-cart-addon-selector]').forEach((selector) => {
      if (serviceProperty) {
        selector.dataset.serviceName = serviceProperty.name;
        selector.dataset.serviceValue = serviceProperty.value;
      }
      syncAddonSelector(selector, previewCart.properties);
    });
    savePreviewCart();
  };

  const getChoiceDetails = (input) => {
    const label = input.closest('label');
    const title = label?.querySelector('strong')?.textContent?.trim() || input.value;
    const price = label?.querySelector('small')?.textContent?.trim() || '';
    const value = input.value && input.value !== 'on'
      ? input.value
      : [title, price].filter(Boolean).join(' - ');
    return { title, price, value };
  };

  const renderPropertyList = (list, properties) => {
    if (!list) return;
    list.hidden = properties.length === 0;
    list.replaceChildren(...properties.map((property) => {
      const row = document.createElement('div');
      const term = document.createElement('dt');
      const detail = document.createElement('dd');
      term.textContent = property.name;
      detail.textContent = property.value;
      row.append(term, detail);
      return row;
    }));
  };

  const calculateSavings = (properties) => {
    const text = properties.map((property) => `${property.name} ${property.value}`).join(' ');
    if (/Patriot Package/i.test(text)) {
      return { year: 30312, month: 0 };
    }

    let year = 0;
    let month = 0;

    for (const match of text.matchAll(/saves?\s*\$([0-9]+(?:\.[0-9]{1,2})?)\s*\/?\s*(?:yr|year)/gi)) {
      year += Math.round(Number(match[1]) * 100);
    }

    for (const match of text.matchAll(/saves?\s*\$([0-9]+(?:\.[0-9]{1,2})?)\s*\/?\s*(?:mo|month)/gi)) {
      month += Math.round(Number(match[1]) * 100);
    }

    return { year, month };
  };

  const formatSavings = ({ year, month }, currency = 'USD') => {
    const parts = [];
    if (year > 0) parts.push(`${formatMoney(year, currency)}/yr`);
    if (month > 0) parts.push(`${formatMoney(month, currency)}/mo`);
    return parts.length ? parts.join(' + ') : '$0';
  };

  const updateCartSavings = () => {
    const properties = [...document.querySelectorAll('.ip-cart-properties > div')].map((row) => ({
      name: row.querySelector('dt')?.textContent?.trim() || '',
      value: row.querySelector('dd')?.textContent?.trim() || '',
    }));
    const currency = previewCart.currency || document.documentElement.dataset.cartCurrency || 'USD';
    document.querySelectorAll('[data-cart-savings]').forEach((target) => {
      target.textContent = formatSavings(calculateSavings(properties), currency);
    });
  };

  const syncAddonSelector = (selector, properties) => {
    const selectedNames = new Set(properties.map((property) => property.name));
    selector.querySelectorAll('[data-cart-addon-option]').forEach((input) => {
      input.checked = selectedNames.has(input.dataset.propertyName);
    });
  };

  const getProductFormProperties = (form) => {
    const properties = [];

    form.querySelectorAll('.ip-choice-group input[type="radio"]:checked').forEach((input) => {
      const details = getChoiceDetails(input);
      properties.push({
        name: propertyNameFromInput(input),
        value: details.value,
      });
    });

    form.querySelectorAll('.ip-choice-group input[type="checkbox"]:checked').forEach((input) => {
      if (input.disabled) return;
      const details = getChoiceDetails(input);
      properties.push({
        name: propertyNameFromInput(input),
        value: details.value,
      });
    });

    return properties;
  };

  const getCartAddonProperties = (selector) => {
    const properties = [];
    const serviceName = selector.dataset.serviceName || 'Service plan';
    const serviceValue = selector.dataset.serviceValue || '';

    if (serviceValue) {
      properties.push({ name: serviceName, value: serviceValue });
    }

    selector.querySelectorAll('[data-cart-addon-option]:checked').forEach((input) => {
      properties.push({
        name: input.dataset.propertyName,
        value: input.dataset.propertyValue || 'Selected',
      });
    });

    return properties;
  };

  const propertiesToObject = (properties) => properties.reduce((next, property) => {
    if (property.name && property.value) next[property.name] = property.value;
    return next;
  }, {});

  const submittedProperties = (form) => {
    const properties = [];
    const formData = new FormData(form);
    for (const [name, value] of formData.entries()) {
      const match = String(name).match(/^properties\[(.+)]$/);
      if (!match || String(value || '').trim() === '') continue;
      properties.push({ name: match[1], value: String(value) });
    }
    return properties;
  };

  const selectedBillingInputs = (form) => {
    const packageInput = form.querySelector('[data-order-package]:checked');
    const inputs = [...form.querySelectorAll('[data-billing-variant]:checked')]
      .filter((input) => !input.disabled && String(input.dataset.billingVariant || '').trim() !== '');
    if (packageInput && String(packageInput.dataset.billingVariant || '').trim() !== '') {
      return [packageInput];
    }
    return inputs;
  };

  const buildSetupCartPayload = (form) => {
    const billingInputs = selectedBillingInputs(form);
    if (billingInputs.length === 0) return null;

    const formData = new FormData(form);
    const variantId = String(formData.get('id') || '').trim();
    if (!variantId) return null;

    const quantity = Math.max(1, Number(formData.get('quantity') || 1));
    const setupId = createSetupId();
    const phoneTitle = form.dataset.productTitle ||
      form.querySelector('[data-order-phone]:checked')?.dataset.orderTitle ||
      form.querySelector('input[name="properties[Phone]"]')?.value ||
      form.closest('section')?.querySelector('h1, h2')?.textContent?.trim() ||
      'Phone setup';
    const setupProperties = propertiesToObject(submittedProperties(form));
    setupProperties._setup_id = setupId;
    setupProperties._setup_role = 'phone';

    const items = [{
      id: variantId,
      quantity,
      properties: setupProperties,
    }];

    for (const input of billingInputs) {
      const details = getChoiceDetails(input);
      items.push({
        id: input.dataset.billingVariant,
        quantity,
        properties: {
          _setup_id: setupId,
          _setup_parent: 'true',
          _setup_role: input.dataset.billingRole || 'billing',
          _setup_billing_name: propertyNameFromInput(input),
          _setup_billing_value: details.value,
          _setup_phone: phoneTitle,
        },
      });
    }

    return { items };
  };

  const addPreviewProduct = (form, submitter) => {
    previewCart.title = form.dataset.productTitle || previewCart.title;
    previewCart.price = Number(form.dataset.productPriceCents || previewCart.price);
    previewCart.currency = form.dataset.productCurrency || previewCart.currency;
    previewCart.imageSrc = form.dataset.productImageSrc || previewCart.imageSrc;
    previewCart.imageAlt = form.dataset.productImageAlt || previewCart.title;
    previewCart.properties = getProductFormProperties(form);
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

  const updateOrderBuilder = (form) => {
    if (!form) return;
    let phone = form.querySelector('[data-order-phone]:checked');
    const packageInput = form.querySelector('[data-order-package]');
    const annual = form.querySelector('[data-order-annual]');
    const bundle = form.querySelector('[data-order-bundle]');
    const addonInputs = [...form.querySelectorAll('[data-order-addon]')];
    const variantInput = form.querySelector('[data-order-variant-id]');

    if (packageInput?.checked) {
      const classicPhone = form.querySelector('[data-order-phone][data-order-title="Classic Phone"]');
      if (classicPhone) classicPhone.checked = true;
      if (annual) annual.checked = true;
      if (bundle) bundle.checked = true;
      phone = classicPhone || phone;
    }

    if (bundle?.checked) {
      addonInputs.forEach((input) => {
        input.checked = false;
        input.disabled = true;
      });
    } else {
      addonInputs.forEach((input) => {
        input.disabled = false;
      });
    }

    if (phone) {
      if (variantInput && phone.dataset.orderVariant) {
        variantInput.value = phone.dataset.orderVariant;
      }
      form.dataset.productTitle = phone.dataset.orderTitle || 'Selected phone';
      form.dataset.productPriceCents = phone.dataset.orderPriceCents || '0';
      form.dataset.productCurrency = 'USD';
      form.dataset.productImageSrc = phone.dataset.orderImage || '';
      form.dataset.productImageAlt = phone.dataset.orderTitle || 'Selected phone';
    }

    const service = form.querySelector('input[name="properties[Service plan]"]:checked');
    const selectedAddons = [
      ...(bundle?.checked ? [bundle] : []),
      ...addonInputs.filter((input) => input.checked && !input.disabled),
    ];
    const savings = packageInput?.checked
      ? { year: Number(packageInput.dataset.orderSavingsYear || 0), month: 0 }
      : {
          year: Number(annual?.checked ? annual.dataset.orderSavingsYear || 0 : 0),
          month: selectedAddons.reduce((total, input) => total + Number(input.dataset.orderSavingsMonth || 0), 0),
        };
    const phonePrice = phone ? formatMoney(Number(phone.dataset.orderPriceCents || 0)) : '$0';
    const serviceDetails = service ? getChoiceDetails(service) : null;
    const addonText = selectedAddons.length
      ? selectedAddons.map((input) => getChoiceDetails(input).title).join(', ')
      : 'None selected';

    form.querySelectorAll('[data-order-summary-title]').forEach((target) => {
      target.textContent = form.dataset.productTitle || 'Selected phone';
    });
    form.querySelectorAll('[data-order-summary-phone]').forEach((target) => {
      target.textContent = phonePrice;
    });
    form.querySelectorAll('[data-order-summary-service]').forEach((target) => {
      target.textContent = serviceDetails ? [serviceDetails.title, serviceDetails.price].filter(Boolean).join(' - ') : 'Not selected';
    });
    form.querySelectorAll('[data-order-summary-addons]').forEach((target) => {
      target.textContent = addonText;
    });
    form.querySelectorAll('[data-order-summary-savings]').forEach((target) => {
      target.textContent = formatSavings(savings);
    });
  };

  const updatePreviewAddons = (input) => {
    const selector = input.closest('[data-cart-addon-selector]');
    if (!selector) return;
    previewCart.properties = getCartAddonProperties(selector);
    updatePreviewCart(previewCart.quantity);
    setStatus(selector.closest('[data-preview-cart]'), 'Cart add-ons updated.');
  };

  const updateCartAddons = async (input) => {
    const selector = input.closest('[data-cart-addon-selector]');
    const form = input.closest('[data-cart-form]');
    const lineItem = input.closest('[data-cart-line-item]');
    const line = Number(selector?.dataset.cartLine || 0);
    const quantity = Math.max(0, Number(lineItem?.querySelector('[data-cart-quantity]')?.value || 1));
    const properties = getCartAddonProperties(selector);
    if (!line) return;

    setBusy(form, true);
    try {
      const cart = await fetchJson(endpoint('cart/change.js'), {
        body: JSON.stringify({ line, quantity, properties: propertiesToObject(properties) }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      renderCart(cart);
      renderPropertyList(lineItem?.querySelector('[data-cart-properties]'), properties);
      updateCartSavings();
      setStatus(form, 'Cart add-ons updated.');
    } catch (error) {
      setStatus(form, error.message, 'error');
      input.checked = !input.checked;
    } finally {
      setBusy(form, false);
    }
  };

  const addProduct = async (form, submitter) => {
    const setupPayload = buildSetupCartPayload(form);
    const formData = setupPayload ? null : new FormData(form);
    setBusy(form, true);
    try {
      if (setupPayload) {
        await fetchJson(endpoint('cart/add.js'), {
          body: JSON.stringify(setupPayload),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        });
      } else {
        await fetchJson(endpoint('cart/add.js'), {
          body: formData,
          method: 'POST',
        });
      }
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
    const lineItem = input.closest('[data-cart-line-item]');
    const line = Number(input.dataset.cartLine || 0);
    const quantity = Math.max(0, Number(input.value) || 0);
    if (!line) return;

    setBusy(form, true);
    try {
      const setupId = lineItem?.dataset.setupId || '';
      const isParent = setupId && lineItem?.dataset.setupParent !== 'true';
      const cartKey = lineItem?.dataset.cartKey || '';
      const siblingChildren = isParent
        ? [...form.querySelectorAll('[data-cart-line-item][data-setup-parent="true"]')]
            .filter((child) => child.dataset.setupId === setupId)
        : [];
      const cart = isParent && cartKey
        ? await fetchJson(endpoint('cart/update.js'), {
            body: JSON.stringify({
              updates: Object.fromEntries([
                [cartKey, quantity],
                ...siblingChildren
                  .map((child) => child.dataset.cartKey || '')
                  .filter(Boolean)
                  .map((key) => [key, quantity]),
              ]),
            }),
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
          })
        : await fetchJson(endpoint('cart/change.js'), {
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
    const cartForm = event.target.closest('[data-cart-form]');
    if (cartForm && event.submitter?.name === 'checkout') {
      const hasHandoff = String(cartForm.dataset.revioCheckoutUrl || '').trim() !== '';
      if (hasHandoff) {
        event.preventDefault();
        submitCheckoutHandoff(cartForm, event.submitter);
      }
      return;
    }

    const form = event.target.closest('.ip-product-form');
    const submitter = event.submitter;
    if (!form || !submitter?.matches('[data-add-to-cart-button]')) return;

    event.preventDefault();
    if (!form.reportValidity()) return;
    if (form.matches('[data-preview-product-form]')) {
      addPreviewProduct(form, submitter);
      return;
    }
    addProduct(form, submitter);
  });

  document.addEventListener('change', (event) => {
    const orderInput = event.target.closest('[data-order-form] input');
    if (orderInput) {
      updateOrderBuilder(orderInput.closest('[data-order-form]'));
    }

    const addon = event.target.closest('[data-cart-addon-option]');
    if (addon) {
      if (addon.closest('[data-preview-cart]')) {
        updatePreviewAddons(addon);
        return;
      }
      updateCartAddons(addon);
      return;
    }

    const input = event.target.closest('[data-cart-quantity]');
    if (!input) return;

    if (input.closest('[data-preview-cart]')) {
      updatePreviewCart(input.value);
      return;
    }
    updateCartLine(input);
  });

  document.addEventListener('click', (event) => {
    const soundButton = event.target.closest('[data-hero-sound-toggle]');
    if (soundButton) {
      const hero = soundButton.closest('[data-hero-video]');
      const video = hero?.querySelector('video');
      if (video) {
        video.muted = false;
        video.removeAttribute('muted');
        video.volume = 1;
        video.loop = false;
        video.controls = true;
        video.currentTime = 0;
        video.play().catch(() => {});
        soundButton.classList.add('is-playing');
        soundButton.setAttribute('aria-pressed', 'true');
        soundButton.setAttribute('aria-label', 'Video sound is on');
      }
      return;
    }

    const remove = event.target.closest('[data-preview-remove]');
    if (!remove) return;

    event.preventDefault();
    updatePreviewCart(0);
    setStatus(remove.closest('[data-preview-cart]'), 'Item removed from preview cart.');
  });

  if (document.querySelector('[data-preview-cart]')) {
    loadPreviewCart();
    updatePreviewCart(previewCart.quantity);
  }

  document.querySelectorAll('[data-order-form]').forEach(updateOrderBuilder);
  updateCartSavings();
})();
