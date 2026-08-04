(() => {
  if (window.__ipCartExperienceReady) return;
  window.__ipCartExperienceReady = true;

  const locale = document.documentElement.lang || 'en-US';
  const shopRoot = window.Shopify?.routes?.root || '/';
  const endpoint = (path) => `${shopRoot}${path.replace(/^\//, '')}`;
  const previewStorageKey = 'ipPreviewCart';
  let cartMutationVersion = 0;
  let phoneComparisonOpener = null;
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
    const label = `${count} item${count === 1 ? '' : 's'} in cart`;
    document.querySelectorAll('[data-cart-count]').forEach((badge) => {
      badge.textContent = String(count);
      badge.hidden = count <= 0;
      badge.setAttribute('aria-label', label);
    });
    if (count > 0 && !document.querySelector('.cart-count-bubble')) {
      const cartIcon = document.querySelector('#cart-icon-bubble, .header__icon--cart');
      if (cartIcon) {
        const bubble = document.createElement('div');
        bubble.className = 'cart-count-bubble';
        bubble.innerHTML = '<span aria-hidden="true"></span><span class="visually-hidden"></span>';
        cartIcon.append(bubble);
      }
    }

    document.querySelectorAll('.cart-count-bubble').forEach((bubble) => {
      bubble.hidden = count <= 0;
      let visualCount = bubble.querySelector('span[aria-hidden="true"]');
      let accessibleCount = bubble.querySelector('.visually-hidden');
      if (!visualCount) {
        visualCount = document.createElement('span');
        visualCount.setAttribute('aria-hidden', 'true');
        bubble.prepend(visualCount);
      }
      if (!accessibleCount) {
        accessibleCount = document.createElement('span');
        accessibleCount.className = 'visually-hidden';
        bubble.append(accessibleCount);
      }
      visualCount.textContent = String(count);
      visualCount.hidden = count >= 100;
      accessibleCount.textContent = label;
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
    const method = String(options.method || 'GET').toUpperCase();
    if (method !== 'GET' && /\/cart\/(?:add|change|update|clear)\.js$/.test(new URL(url, window.location.href).pathname)) {
      cartMutationVersion += 1;
    }
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
    const futureChargeCents = Number(cartPropertyValue(properties, '_setup_future_charge_cents') || 0);
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
      checkout_price_cents: Number(item.final_price ?? item.price ?? 0),
      checkout_line_price_cents: Number(item.final_line_price ?? item.line_price ?? 0),
      future_charge_cents: futureChargeCents,
      future_line_charge_cents: futureChargeCents * Number(item.quantity || 0),
      billing_cadence: cartPropertyValue(properties, '_setup_billing_cadence'),
      first_bill_rule: cartPropertyValue(properties, '_setup_first_bill_rule'),
      currency: document.documentElement.dataset.cartCurrency || 'USD',
      requires_shipping: Boolean(item.requires_shipping),
      taxable: Boolean(item.taxable),
      visible_properties: visibleCartProperties(properties),
    };
  };

  const setupSummaryFromLines = (lines) => {
    const phone = lines.find((line) => line.role === 'phone' || !line.setup_parent);
    const service = lines.find((line) => line.role === 'service');
    const addons = lines.filter((line) => ['addon', 'addon_bundle'].includes(line.role));

    return {
      phone: phone?.title || phone?.setup_phone || '',
      service: service?.setup_billing_value || service?.title || '',
      add_ons: addons.map((line) => line.setup_billing_name || line.title).filter(Boolean),
      due_today_before_tax_cents: lines.reduce(
        (total, line) => total + Number(line.checkout_line_price_cents || 0),
        0,
      ),
      future_charge_cents: lines.reduce(
        (total, line) => total + Number(line.future_line_charge_cents || 0),
        0,
      ),
    };
  };

  const buildCheckoutHandoffPayload = (cart) => {
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

    const immediateSubtotalCents = lines.reduce(
      (total, line) => total + Number(line.checkout_line_price_cents || 0),
      0,
    );
    const futureChargeCents = lines.reduce(
      (total, line) => total + Number(line.future_line_charge_cents || 0),
      0,
    );
    const shippingCents = cartDisplayCount(cart) > 0 ? 1500 : 0;

    return {
      schema: 'independence_phone.revio_checkout.v2',
      source: 'shopify-theme-cart',
      occurred_at: new Date().toISOString(),
      source_url: window.location.href,
      referrer: document.referrer || '',
      consent: {
        collection_status: 'pending_checkout',
        privacy_terms_accepted: null,
      },
      customer: {
        desired_area_code: null,
        desired_area_code_collection_status: 'required_at_checkout',
      },
      cart: {
        token: cart.token || '',
        currency: cart.currency || document.documentElement.dataset.cartCurrency || 'USD',
        item_count: cartDisplayCount(cart),
        raw_item_count: cart.item_count || 0,
        immediate_subtotal_cents: immediateSubtotalCents,
        flat_shipping_cents: shippingCents,
        tax_cents: null,
        tax_status: 'calculated_after_address',
        due_today_before_tax_cents: immediateSubtotalCents + shippingCents,
        future_charge_cents: futureChargeCents,
        first_bill_rule: 'first_day_of_next_month',
        shopify_total_price_cents: Number(cart.total_price || 0),
        shopify_items_subtotal_price_cents: Number(cart.items_subtotal_price || 0),
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
      const payload = buildCheckoutHandoffPayload(cart);
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

  const validateCartIntegrity = (form) => {
    const orphan = form.querySelector('[data-cart-orphan-child], [data-cart-incomplete-setup]');
    const error = form.querySelector('[data-cart-integrity-error]');
    const valid = !orphan;
    if (error) error.hidden = valid;
    if (!valid) orphan.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return valid;
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
    const parentSetupIds = new Set(
      cart.items
        .filter((item) => !isSetupChild(item.properties))
        .map((item) => cartPropertyValue(item.properties, '_setup_id'))
        .filter(Boolean),
    );
    return cart.items.reduce((count, item) => {
      const setupId = cartPropertyValue(item.properties, '_setup_id');
      if (isSetupChild(item.properties) && parentSetupIds.has(setupId)) return count;
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
    const lines = (cart.items || []).map(normalizeCheckoutLine);
    const immediateSubtotal = lines.reduce(
      (total, line) => total + Number(line.checkout_line_price_cents || 0),
      0,
    );
    const futureCharge = lines.reduce(
      (total, line) => total + Number(line.future_line_charge_cents || 0),
      0,
    );
    const shipping = cartDisplayCount(cart) > 0 ? 1500 : 0;
    setCartCount(cartDisplayCount(cart));

    document.querySelectorAll('[data-cart-subtotal]').forEach((subtotal) => {
      subtotal.textContent = formatMoney(immediateSubtotal, currency);
    });
    document.querySelectorAll('[data-cart-shipping]').forEach((target) => {
      target.textContent = formatMoney(shipping, currency);
    });
    document.querySelectorAll('[data-cart-due-today]').forEach((target) => {
      target.textContent = formatMoney(immediateSubtotal + shipping, currency);
    });
    document.querySelectorAll('[data-cart-future-charge]').forEach((target) => {
      target.textContent = formatMoney(futureCharge, currency);
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
    const sources = [...document.querySelectorAll('[data-cart-savings-source]')];
    const savings = sources.length > 0
      ? sources.reduce((total, source) => {
          const lineSavings = calculateSavings([{
            name: 'Setup',
            value: source.dataset.cartSavingsSource || '',
          }]);
          const quantity = Math.max(
            1,
            Number(source.querySelector('[data-cart-quantity]')?.value || source.dataset.cartQuantity || 1),
          );
          return {
            year: total.year + (lineSavings.year * quantity),
            month: total.month + (lineSavings.month * quantity),
          };
        }, { year: 0, month: 0 })
      : calculateSavings(
          [...document.querySelectorAll('.ip-cart-properties > div')].map((row) => ({
            name: row.querySelector('dt')?.textContent?.trim() || '',
            value: row.querySelector('dd')?.textContent?.trim() || '',
          })),
        );
    const currency = previewCart.currency || document.documentElement.dataset.cartCurrency || 'USD';
    document.querySelectorAll('[data-cart-savings]').forEach((target) => {
      target.textContent = formatSavings(savings, currency);
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
    return [...form.querySelectorAll('[data-billing-variant]:checked')]
      .filter((input) => !input.disabled && String(input.dataset.billingVariant || '').trim() !== '');
  };

  const orderBillingConfigurationError = (form) => {
    if (!form.matches('[data-order-form]')) return '';

    const selectedInputs = [...form.querySelectorAll('[data-billing-variant]:checked')]
      .filter((input) => !input.disabled);

    if (selectedInputs.length === 0) {
      return 'Choose a service plan before adding this setup to the cart.';
    }

    const missingBillingItem = selectedInputs.some(
      (input) => String(input.dataset.billingVariant || '').trim() === '',
    );
    const phoneVariant = String(form.querySelector('[data-order-variant-id]')?.value || '').trim();
    if (missingBillingItem || phoneVariant === '') {
      return 'Ordering is temporarily unavailable because a required billing item is not configured. Please contact Independence Phone for help.';
    }

    return '';
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
    const submittedSetupProperties = propertiesToObject(submittedProperties(form));
    const setupProperties = {};
    ['Phone', 'Discount/referral code', 'Referral'].forEach((name) => {
      if (submittedSetupProperties[name]) setupProperties[name] = submittedSetupProperties[name];
    });
    setupProperties._setup_id = setupId;
    setupProperties._setup_role = 'phone';
    setupProperties._order_contract = 'deferred-billing-v2';

    const items = [{
      id: variantId,
      quantity,
      properties: setupProperties,
    }];

    for (const input of billingInputs) {
      const details = getChoiceDetails(input);
      const billingProperties = {
        'Future charge': details.price || details.value,
        'Billing starts': 'First day of the following month',
        _setup_id: setupId,
        _order_contract: 'deferred-billing-v2',
        _setup_parent: 'true',
        _setup_role: input.dataset.billingRole || 'billing',
        _setup_billing_name: propertyNameFromInput(input),
        _setup_billing_value: details.price || details.value,
        _setup_phone: phoneTitle,
        _setup_future_charge_cents: String(input.dataset.futureChargeCents || '0'),
        _setup_billing_cadence: input.dataset.billingCadence || '',
        _setup_first_bill_rule: input.dataset.firstBillRule || 'first_day_of_next_month',
      };
      if (Number(input.dataset.orderSavingsYear || 0) > 0) {
        billingProperties.Savings = `Save ${formatMoney(Number(input.dataset.orderSavingsYear))}/yr`;
      }
      if (Number(input.dataset.orderSavingsMonth || 0) > 0) {
        billingProperties.Savings = `Save ${formatMoney(Number(input.dataset.orderSavingsMonth))}/mo`;
      }
      items.push({
        id: input.dataset.billingVariant,
        quantity,
        properties: billingProperties,
      });
    }

    return { items };
  };

  const cartItemProperty = (item, name) => {
    const properties = item?.properties || {};
    if (Array.isArray(properties)) {
      return properties.find((property) => property.name === name)?.value || '';
    }
    return properties[name] || '';
  };

  const validateAddedSetup = (cart, setupPayload) => {
    const expectedItems = setupPayload?.items || [];
    if (expectedItems.length === 0) return { complete: true, setupId: '' };

    const setupId = expectedItems[0]?.properties?._setup_id || '';
    const setupLines = (cart.items || []).filter(
      (item) => String(cartItemProperty(item, '_setup_id')) === String(setupId),
    );
    const unmatchedLines = [...setupLines];
    const complete = expectedItems.every((expected) => {
      const expectedRole = String(expected.properties?._setup_role || '');
      const expectedBillingName = String(expected.properties?._setup_billing_name || '');
      const matchIndex = unmatchedLines.findIndex((line) =>
        String(line.variant_id || line.id) === String(expected.id) &&
        String(cartItemProperty(line, '_setup_role')) === expectedRole &&
        String(cartItemProperty(line, '_setup_billing_name')) === expectedBillingName &&
        Number(line.quantity || 0) >= Number(expected.quantity || 1)
      );
      if (matchIndex === -1) return false;
      unmatchedLines.splice(matchIndex, 1);
      return true;
    });

    return { cart, complete, setupId, setupLines };
  };

  const removeIncompleteSetup = async (validation) => {
    let remainingLines = validation.setupLines || [];
    if (remainingLines.length === 0) return validation.cart;
    let latestCart = validation.cart;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const updates = Object.fromEntries(
        remainingLines
          .map((line) => line.key)
          .filter(Boolean)
          .map((key) => [key, 0]),
      );
      if (Object.keys(updates).length === 0) break;
      try {
        latestCart = await fetchJson(endpoint('cart/update.js'), {
          body: JSON.stringify({ updates }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        });
      } catch (_error) {
        continue;
      }
      remainingLines = (latestCart.items || []).filter(
        (item) => String(cartItemProperty(item, '_setup_id')) === String(validation.setupId),
      );
      if (remainingLines.length === 0) return latestCart;
    }

    const error = new Error(
      'Only part of the phone setup was added, and it could not be removed automatically. Open the cart and remove the incomplete billing item before retrying.',
    );
    error.code = 'SETUP_CLEANUP_FAILED';
    error.cart = latestCart;
    throw error;
  };

  const addPreviewProduct = (form, submitter) => {
    previewCart.title = form.dataset.productTitle || previewCart.title;
    previewCart.price = Number(form.dataset.productPriceCents || previewCart.price);
    previewCart.currency = form.dataset.productCurrency || previewCart.currency;
    previewCart.imageSrc = form.dataset.productImageSrc || previewCart.imageSrc;
    previewCart.imageAlt = form.dataset.productImageAlt || previewCart.title;
    previewCart.properties = submittedProperties(form);
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
    const annual = form.querySelector('[data-order-annual]');
    const bundle = form.querySelector('[data-order-bundle]');
    const addonInputs = [...form.querySelectorAll('[data-order-addon]')];
    const variantInput = form.querySelector('[data-order-variant-id]');

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
    const savings = {
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
      target.textContent = `${phonePrice} one-time`;
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
    const configurationError = orderBillingConfigurationError(form);
    if (configurationError) {
      setStatus(form, configurationError, 'error');
      return;
    }

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
      if (setupPayload) {
        const validation = validateAddedSetup(cart, setupPayload);
        if (!validation.complete) {
          setCartCount(cartDisplayCount(cart));
          const cleanedCart = await removeIncompleteSetup(validation);
          renderCart(cleanedCart);
          throw new Error('We could not add the complete phone setup. Nothing was kept in your cart. Please try again.');
        }
      }
      renderCart(cart);
      setStatus(form, 'Added to cart. You can review your order from the cart.');
      if (submitter) {
        submitter.textContent = 'Added to cart';
        window.setTimeout(() => {
          submitter.textContent = submitter.dataset.defaultText || 'Add to cart';
        }, 1600);
      }
      window.location.assign(endpoint('cart'));
    } catch (error) {
      if (error.cart) renderCart(error.cart);
      setStatus(form, error.message, 'error');
    } finally {
      setBusy(form, false);
    }
  };

  const syncSetupQuantity = (input, value = input.value) => {
    const setup = input.closest('[data-cart-setup]');
    if (!setup) return;
    input.value = String(value);
    setup.querySelectorAll('[data-cart-parent-quantity], [data-cart-child-quantity]').forEach((hiddenInput) => {
      hiddenInput.value = String(value);
    });
  };

  const updateCartLine = async (input) => {
    const form = input.closest('[data-cart-form]');
    const lineItem = input.closest('[data-cart-line-item]');
    const line = Number(input.dataset.cartLine || 0);
    const quantity = Math.max(0, Number(input.value) || 0);
    const previousQuantity = Math.max(0, Number(input.dataset.cartOriginalQuantity ?? input.value) || 0);
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
      input.dataset.cartOriginalQuantity = String(quantity);
      if (setupId || quantity === 0 || cart.item_count === 0) {
        window.location.reload();
      }
    } catch (error) {
      if (lineItem?.dataset.setupId && lineItem.dataset.setupParent !== 'true') {
        syncSetupQuantity(input, previousQuantity);
      }
      setStatus(form, error.message, 'error');
    } finally {
      setBusy(form, false);
    }
  };

  const removeCartChild = async (button) => {
    const form = button.closest('[data-cart-form]');
    const child = button.closest('[data-cart-setup-child]');
    const key = child?.dataset.cartKey || '';
    if (!form || !key) return;

    setBusy(form, true);
    try {
      await fetchJson(endpoint('cart/update.js'), {
        body: JSON.stringify({ updates: { [key]: 0 } }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      window.location.reload();
    } catch (error) {
      setStatus(form, error.message, 'error');
      setBusy(form, false);
    }
  };

  document.addEventListener('submit', (event) => {
    const cartForm = event.target.closest('[data-cart-form]');
    if (cartForm && event.submitter?.name === 'checkout') {
      const integrityValid = validateCartIntegrity(cartForm);
      if (!integrityValid) {
        event.preventDefault();
        return;
      }
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

  document.addEventListener('input', (event) => {
    const setupQuantity = event.target.closest('[data-cart-setup-quantity]');
    if (!setupQuantity) return;
    syncSetupQuantity(setupQuantity);
  });

  const heroDesktopMedia = window.matchMedia('(min-width: 721px)');
  const syncHeroPoster = () => {
    document.querySelectorAll('[data-hero-video-player]').forEach((video) => {
      const poster = heroDesktopMedia.matches
        ? video.dataset.posterDesktop
        : video.dataset.posterMobile;
      if (poster && video.getAttribute('poster') !== poster) video.setAttribute('poster', poster);
    });
  };

  syncHeroPoster();
  heroDesktopMedia.addEventListener?.('change', syncHeroPoster);

  const heroReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const syncHeroMotionPreference = () => {
    document.querySelectorAll('[data-hero-video] video').forEach((video) => {
      if (heroReducedMotion.matches && video.dataset.audiblePlaybackStarted !== 'true') {
        video.autoplay = false;
        video.pause();
      }
    });
  };

  syncHeroMotionPreference();
  heroReducedMotion.addEventListener?.('change', syncHeroMotionPreference);

  const restorePhoneComparisonFocus = () => {
    if (phoneComparisonOpener?.isConnected) phoneComparisonOpener.focus();
    phoneComparisonOpener = null;
  };

  document.addEventListener('close', (event) => {
    if (!event.target.matches?.('[data-phone-comparison-dialog]')) return;
    restorePhoneComparisonFocus();
  }, true);

  document.addEventListener('click', (event) => {
    const comparisonOpen = event.target.closest('[data-phone-comparison-open]');
    if (comparisonOpen) {
      event.preventDefault();
      const dialogId = comparisonOpen.getAttribute('aria-controls');
      const dialog = dialogId ? document.getElementById(dialogId) : null;
      if (!dialog) return;
      phoneComparisonOpener = comparisonOpen;
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
      } else {
        dialog.setAttribute('open', '');
      }
      return;
    }

    const comparisonClose = event.target.closest('[data-phone-comparison-close]');
    if (comparisonClose) {
      event.preventDefault();
      const dialog = comparisonClose.closest('[data-phone-comparison-dialog]');
      if (!dialog) return;
      if (typeof dialog.close === 'function') {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
        restorePhoneComparisonFocus();
      }
      return;
    }

    const comparisonBackdrop = event.target.closest('[data-phone-comparison-dialog][open]');
    if (comparisonBackdrop && event.target === comparisonBackdrop) {
      const bounds = comparisonBackdrop.getBoundingClientRect();
      const outsideDialog = (
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      );
      if (outsideDialog && typeof comparisonBackdrop.close === 'function') comparisonBackdrop.close();
      return;
    }

    const soundButton = event.target.closest('[data-hero-sound-toggle]');
    if (soundButton) {
      const hero = soundButton.closest('[data-hero-video]');
      const video = hero?.querySelector('video');
      if (video) {
        const setSoundState = (state) => {
          const labels = {
            idle: soundButton.dataset.labelIdle || 'Play with sound',
            playing: soundButton.dataset.labelPlaying || 'Sound is on',
            muted: soundButton.dataset.labelMuted || 'Sound is off. Play with sound',
            paused: soundButton.dataset.labelPaused || 'Resume with sound',
            ended: soundButton.dataset.labelEnded || 'Replay with sound',
            failed: soundButton.dataset.labelFailed || 'Sound could not start. Try again',
          };
          const isPlaying = state === 'playing';

          soundButton.dataset.soundState = state;
          soundButton.classList.toggle('is-playing', isPlaying);
          soundButton.setAttribute('aria-pressed', String(isPlaying));
          soundButton.setAttribute('aria-label', labels[state] || labels.idle);
        };

        if (video.dataset.soundEventsBound !== 'true') {
          video.dataset.soundEventsBound = 'true';
          const syncSoundState = () => {
            if (video.dataset.soundFailure === 'true') return;
            if (video.ended) {
              setSoundState('ended');
            } else if (video.muted || video.volume === 0) {
              setSoundState('muted');
            } else if (video.paused) {
              setSoundState('paused');
            } else {
              setSoundState('playing');
            }
          };
          video.addEventListener('ended', () => {
            video.classList.add('has-ended');
            setSoundState('ended');
          });
          video.addEventListener('pause', syncSoundState);
          video.addEventListener('playing', syncSoundState);
          video.addEventListener('volumechange', syncSoundState);
        }

        if (!video.muted && video.volume > 0 && !video.paused && !video.ended) {
          video.muted = true;
          setSoundState('muted');
          return;
        }

        const shouldRestart = video.dataset.audiblePlaybackStarted !== 'true' || video.ended;
        video.dataset.soundFailure = 'false';
        video.muted = false;
        video.removeAttribute('muted');
        video.volume = 1;
        video.loop = false;
        video.controls = true;
        if (shouldRestart) video.currentTime = 0;
        video.classList.remove('has-ended');
        const playback = video.play();
        if (playback) {
          playback.then(() => {
            video.dataset.audiblePlaybackStarted = 'true';
            setSoundState('playing');
          }).catch(() => {
            video.dataset.soundFailure = 'true';
            video.muted = true;
            setSoundState('failed');
          });
        } else {
          video.dataset.audiblePlaybackStarted = 'true';
          setSoundState('playing');
        }
      }
      return;
    }

    const remove = event.target.closest('[data-preview-remove]');
    const childRemove = event.target.closest('[data-cart-child-remove]');
    if (childRemove) {
      event.preventDefault();
      removeCartChild(childRemove);
      return;
    }
    const setupRemove = event.target.closest('[data-cart-setup-remove]');
    if (setupRemove) {
      event.preventDefault();
      const setup = setupRemove.closest('[data-cart-setup]');
      const quantity = setup?.querySelector('[data-cart-setup-quantity]');
      if (quantity) {
        syncSetupQuantity(quantity, 0);
        updateCartLine(quantity);
      }
      return;
    }

    if (!remove) return;

    event.preventDefault();
    updatePreviewCart(0);
    setStatus(remove.closest('[data-preview-cart]'), 'Item removed from preview cart.');
  });

  if (document.querySelector('[data-preview-cart]')) {
    loadPreviewCart();
    updatePreviewCart(previewCart.quantity);
  }

  document.querySelectorAll('[data-cart-setup-quantity][readonly]').forEach((input) => {
    input.readOnly = false;
  });

  document.querySelectorAll('[data-cart-setup-remove][hidden]').forEach((button) => {
    button.hidden = false;
  });

  document.querySelectorAll('[data-order-script-required][data-order-configured="true"]').forEach((button) => {
    button.disabled = false;
  });

  if (
    !document.querySelector('[data-preview-cart]') &&
    !document.querySelector('[data-cart-count]') &&
    document.querySelector('#cart-icon-bubble, .header__icon--cart, .cart-count-bubble')
  ) {
    const cartIcon = document.querySelector('#cart-icon-bubble, .header__icon--cart') ||
      document.querySelector('.cart-count-bubble')?.parentElement;
    const requestVersion = cartMutationVersion;
    let nativeCartHeaderChanged = false;
    const observerRoot = cartIcon?.parentElement || cartIcon;
    const cartIconObserver = observerRoot
      ? new MutationObserver((records) => {
          nativeCartHeaderChanged = records.some((record) => {
            if (record.target === cartIcon || cartIcon?.contains(record.target)) return true;
            return [...record.addedNodes, ...record.removedNodes].some((node) =>
              node === cartIcon ||
              (node.nodeType === Node.ELEMENT_NODE && (
                node.matches?.('#cart-icon-bubble, .header__icon--cart') ||
                node.contains?.(cartIcon)
              ))
            );
          });
        })
      : null;
    cartIconObserver?.observe(observerRoot, { childList: true, characterData: true, subtree: true });
    getCart().then((cart) => {
      if (cartMutationVersion === requestVersion && !nativeCartHeaderChanged) {
        setCartCount(cartDisplayCount(cart));
      }
    }).catch(() => {}).finally(() => cartIconObserver?.disconnect());
  }

  document.querySelectorAll('[data-order-form]').forEach(updateOrderBuilder);
  updateCartSavings();
})();
