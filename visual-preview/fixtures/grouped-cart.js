'use strict';

const DEFAULT_SETUP_ID = 'preview-setup-child-first';

const variantCatalog = {
  'preview-standard': {
    handle: 'standard-phone',
    price: 10000,
    productTitle: 'Classic Phone',
    role: 'phone',
  },
  'preview-rugged': {
    handle: 'rugged-phone',
    price: 15000,
    productTitle: 'Rugged Phone',
    role: 'phone',
  },
  'preview-monthly-service': {
    handle: 'monthly-service',
    price: 0,
    productTitle: 'Monthly Service',
    role: 'service',
  },
  'preview-annual-service': {
    handle: 'annual-service',
    price: 0,
    productTitle: 'Annual Service',
    role: 'service',
  },
  'preview-addon-bundle-billing': {
    handle: 'add-on-bundle',
    price: 0,
    productTitle: 'Add-on Bundle',
    role: 'addon_bundle',
  },
  'preview-call-recording': {
    handle: 'call-recording',
    price: 0,
    productTitle: 'Call Recording',
    role: 'addon',
  },
  'preview-quiet-hours': {
    handle: 'family-quiet-hours',
    price: 0,
    productTitle: 'Quiet Hours',
    role: 'addon',
  },
  'preview-voicemail-to-email': {
    handle: 'voicemail-to-email',
    price: 0,
    productTitle: 'Voicemail to Email',
    role: 'addon',
  },
  'preview-auto-attendant': {
    handle: 'auto-attendant',
    price: 0,
    productTitle: 'Auto Attendant',
    role: 'addon',
  },
};

const propertyValue = (properties, name) => String(properties?.[name] || '');

const lineFromPayloadItem = (item, index) => {
  const id = String(item.id);
  const catalogItem = variantCatalog[id] || {};
  const quantity = Math.max(1, Number(item.quantity || 1));
  const unitPrice = Number(catalogItem.price || 0);
  const properties = { ...(item.properties || {}) };
  const setupRole = propertyValue(properties, '_setup_role') || catalogItem.role || 'billing';
  const title = catalogItem.productTitle || propertyValue(properties, '_setup_billing_name') || id;

  return {
    id,
    variant_id: id,
    product_id: `product-${id}`,
    key: `${id}:${index + 1}`,
    handle: catalogItem.handle || id,
    product_title: title,
    title,
    variant_title: 'Default Title',
    quantity,
    price: unitPrice,
    final_price: unitPrice,
    line_price: unitPrice * quantity,
    final_line_price: unitPrice * quantity,
    requires_shipping: setupRole === 'phone',
    taxable: setupRole === 'phone',
    properties,
  };
};

const summarizeCart = (items) => {
  const totalPrice = items.reduce((total, item) => total + item.final_line_price, 0);
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  return {
    token: 'preview-cart-token',
    currency: 'USD',
    item_count: itemCount,
    total_price: totalPrice,
    items_subtotal_price: totalPrice,
    total_discount: 0,
    items,
  };
};

const childFirstGroupedCart = summarizeCart([
  lineFromPayloadItem({
    id: 'preview-monthly-service',
    quantity: 1,
    properties: {
      _setup_id: DEFAULT_SETUP_ID,
      _setup_parent: 'true',
      _setup_role: 'service',
      _setup_billing_name: 'Service plan',
      _setup_billing_value: 'Monthly service - $17.76/mo',
      _setup_phone: 'Classic Phone',
      _setup_future_charge_cents: '1776',
      _setup_billing_cadence: 'monthly',
      _setup_first_bill_rule: 'first_day_of_next_month',
      _order_contract: 'deferred-billing-v2',
      'Future charge': '$17.76/mo',
      'Billing starts': 'First day of the following month',
    },
  }, 0),
  lineFromPayloadItem({
    id: 'preview-addon-bundle-billing',
    quantity: 1,
    properties: {
      _setup_id: DEFAULT_SETUP_ID,
      _setup_parent: 'true',
      _setup_role: 'addon_bundle',
      _setup_billing_name: 'Add-on Bundle',
      _setup_billing_value: 'Add-on Bundle - $10/mo; includes all add-ons; saves $10/mo',
      _setup_phone: 'Classic Phone',
      _setup_future_charge_cents: '1000',
      _setup_billing_cadence: 'monthly',
      _setup_first_bill_rule: 'first_day_of_next_month',
      _order_contract: 'deferred-billing-v2',
      'Future charge': '$10/mo',
      'Billing starts': 'First day of the following month',
    },
  }, 1),
  lineFromPayloadItem({
    id: 'preview-standard',
    quantity: 1,
    properties: {
      Phone: 'Classic Phone - $100',
      'Discount/referral code': 'QA-REFERRAL-73',
      _setup_id: DEFAULT_SETUP_ID,
      _setup_role: 'phone',
      _order_contract: 'deferred-billing-v2',
    },
  }, 2),
]);

const groupedCartFromPayload = (payload, options = {}) => {
  const omittedVariantIds = new Set((options.omitVariantIds || []).map(String));
  const sourceItems = Array.isArray(payload?.items) ? payload.items : [];
  const lines = sourceItems
    .map(lineFromPayloadItem)
    .filter((line) => !omittedVariantIds.has(String(line.variant_id)))
    .sort((left, right) => {
      const leftChild = propertyValue(left.properties, '_setup_parent') === 'true';
      const rightChild = propertyValue(right.properties, '_setup_parent') === 'true';
      if (leftChild === rightChild) return 0;
      return leftChild ? -1 : 1;
    });

  return summarizeCart(lines);
};

const emptyCart = summarizeCart([]);

module.exports = {
  DEFAULT_SETUP_ID,
  childFirstGroupedCart,
  emptyCart,
  groupedCartFromPayload,
  variantCatalog,
};
