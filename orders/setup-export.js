const fs = require('node:fs');

const ADD_ON_PROPERTY_NAMES = [
  'Call Recording',
  'Quiet Hours',
  'Voicemail to Email',
  'Auto Attendant',
];

const CSV_COLUMNS = [
  'order_id',
  'order_name',
  'created_at',
  'customer_email',
  'financial_status',
  'fulfillment_status',
  'line_item_title',
  'sku',
  'quantity',
  'phone',
  'service_plan',
  'add_on_bundle',
  'call_recording',
  'family_quiet_hours',
  'voicemail_to_email',
  'auto_attendant',
  'policy_agreement',
  'setup_summary',
  'all_properties_json',
];

function csvValue(value) {
  const stringValue = Array.isArray(value) ? value.join('; ') : String(value ?? '');
  return `"${stringValue.replaceAll('"', '""')}"`;
}

function propertyEntries(properties) {
  if (!properties) return [];

  if (Array.isArray(properties)) {
    return properties
      .map((property) => ({
        name: String(property.name || property.key || '').trim(),
        value: String(property.value ?? '').trim(),
      }))
      .filter((property) => property.name);
  }

  if (typeof properties === 'object') {
    return Object.entries(properties)
      .map(([name, value]) => ({
        name: String(name).trim(),
        value: String(value ?? '').trim(),
      }))
      .filter((property) => property.name);
  }

  return [];
}

function propertyMap(properties) {
  const map = new Map();
  for (const property of propertyEntries(properties)) {
    if (!property.name || property.name.startsWith('_')) continue;
    map.set(property.name, property.value);
  }
  return map;
}

function allPropertyMap(properties) {
  return new Map(propertyEntries(properties).map((property) => [property.name, property.value]));
}

function hasHiddenProperty(properties, name, expectedValue = null) {
  return propertyEntries(properties).some((property) =>
    property.name === name && (expectedValue == null || property.value === expectedValue)
  );
}

function customerEmail(order) {
  return order.email || order.customer?.email || order.shipping_address?.email || '';
}

function orderLineItems(order) {
  const lineItems = order.line_items || order.lineItems?.nodes || order.lineItems?.edges || order.lineItems || [];
  return Array.isArray(lineItems) ? lineItems.map((lineItem) => lineItem?.node || lineItem).filter(Boolean) : [];
}

function orderAttributes(order) {
  return order.note_attributes || order.noteAttributes || order.customAttributes || order.custom_attributes || [];
}

function lineItemTitle(lineItem) {
  return lineItem.title || lineItem.name || lineItem.product_title || lineItem.product?.title || '';
}

function lineItemSku(lineItem) {
  return lineItem.sku || lineItem.variant?.sku || '';
}

function lineItemProperties(lineItem) {
  return lineItem.properties || lineItem.customAttributes || lineItem.custom_attributes || [];
}

function compactParts(parts) {
  return parts.filter((part) => String(part || '').trim()).join(' | ');
}

function labeledPart(label, value) {
  return value ? `${label}: ${value}` : '';
}

function ordersFromInput(input) {
  if (Array.isArray(input)) return input;
  const connection = input?.orders || input?.data?.orders;
  const orders = Array.isArray(connection) ? connection : connection?.nodes || connection?.edges;
  if (Array.isArray(orders)) return orders.map((order) => order?.node || order).filter(Boolean);
  return input ? [input] : [];
}

function setupRole(properties) {
  return allPropertyMap(properties).get('_setup_role') || '';
}

function setupId(properties) {
  return allPropertyMap(properties).get('_setup_id') || '';
}

function isSetupChild(properties) {
  const hidden = allPropertyMap(properties);
  return hidden.get('_setup_parent') === 'true' ||
    ['service', 'addon', 'addon_bundle'].includes(hidden.get('_setup_role'));
}

function appendSavings(value, savings) {
  if (!savings || String(value).toLowerCase().includes(String(savings).toLowerCase())) return value;
  return value ? `${value} (${savings})` : savings;
}

function legacySavings(value) {
  return String(value || '').match(/saves?\s+\$[0-9]+(?:\.[0-9]{1,2})?\/(?:mo|yr)/i)?.[0] || '';
}

function billingLineLabel(lineItem, hidden, visible) {
  const title = lineItemTitle(lineItem);
  const billingValue = hidden.get('_setup_billing_value') || visible.get('Future charge') || '';
  const savings = visible.get('Savings') || '';
  const base = billingValue && title && !billingValue.toLowerCase().includes(title.toLowerCase())
    ? `${title} - ${billingValue}`
    : billingValue || title;
  return appendSavings(base, savings);
}

function canonicalBillingProperties(lineItems) {
  const derived = new Map();

  for (const lineItem of lineItems) {
    const rawProperties = lineItemProperties(lineItem);
    const hidden = allPropertyMap(rawProperties);
    const visible = propertyMap(rawProperties);
    const role = hidden.get('_setup_role') || '';
    const billingName = hidden.get('_setup_billing_name') || '';
    const billingValue = hidden.get('_setup_billing_value') || visible.get('Future charge') || '';

    if (role === 'service') {
      derived.set('Service plan', billingLineLabel(lineItem, hidden, visible));
      continue;
    }

    if (role === 'addon_bundle') {
      derived.set('Add-on Bundle', billingLineLabel(lineItem, hidden, visible));
      continue;
    }

    if (role === 'addon' && ADD_ON_PROPERTY_NAMES.includes(billingName)) {
      derived.set(billingName, appendSavings(billingValue || lineItemTitle(lineItem), visible.get('Savings') || ''));
    }
  }

  return derived;
}

function extractSetupRows(input) {
  const rows = [];

  for (const order of ordersFromInput(input)) {
    const orderProperties = propertyMap(orderAttributes(order));
    const lineItems = orderLineItems(order);
    const childrenBySetupId = new Map();

    for (const lineItem of lineItems) {
      const rawProperties = lineItemProperties(lineItem);
      if (!isSetupChild(rawProperties)) continue;
      const childSetupId = setupId(rawProperties);
      if (!childSetupId) continue;
      if (!childrenBySetupId.has(childSetupId)) childrenBySetupId.set(childSetupId, []);
      childrenBySetupId.get(childSetupId).push(lineItem);
    }

    for (const lineItem of lineItems) {
      const rawProperties = lineItemProperties(lineItem);
      if (isSetupChild(rawProperties)) continue;

      const legacyProperties = propertyMap(rawProperties);
      const role = setupRole(rawProperties);
      if (role !== 'phone' && !legacyProperties.get('Phone')) continue;

      const lineSetupId = setupId(rawProperties);
      const canonicalProperties = canonicalBillingProperties(
        lineSetupId ? childrenBySetupId.get(lineSetupId) || [] : []
      );
      const properties = new Map(legacyProperties);
      for (const [name, value] of canonicalProperties) {
        if (value) properties.set(name, appendSavings(value, legacySavings(legacyProperties.get(name))));
      }

      if (!properties.get('Phone')) properties.set('Phone', lineItemTitle(lineItem));
      const isDeferredBillingV2 =
        allPropertyMap(rawProperties).get('_order_contract') === 'deferred-billing-v2';
      if (isDeferredBillingV2 && !properties.get('Service plan')) {
        properties.set('Service plan', 'Missing service selection');
      }

      const addOns = Object.fromEntries(ADD_ON_PROPERTY_NAMES.map((name) => [name, properties.get(name) || '']));
      const policyAgreement = orderProperties.get('Policy agreement') || properties.get('Policy agreement') || '';

      const setupSummary = compactParts([
        labeledPart('Phone', properties.get('Phone')),
        labeledPart('Service plan', properties.get('Service plan')),
        labeledPart('Add-on Bundle', properties.get('Add-on Bundle')),
        ...ADD_ON_PROPERTY_NAMES.map((name) => addOns[name] ? `${name}: ${addOns[name]}` : ''),
        labeledPart('Policy agreement', policyAgreement),
      ]);

      rows.push({
        order_id: order.id || order.legacyResourceId || '',
        order_name: order.name || order.order_number || '',
        created_at: order.created_at || order.createdAt || '',
        customer_email: customerEmail(order),
        financial_status: order.financial_status || order.displayFinancialStatus || '',
        fulfillment_status: order.fulfillment_status || order.displayFulfillmentStatus || '',
        line_item_title: lineItemTitle(lineItem),
        sku: lineItemSku(lineItem),
        quantity: lineItem.quantity ?? '',
        phone: properties.get('Phone') || '',
        service_plan: properties.get('Service plan') || '',
        add_on_bundle: properties.get('Add-on Bundle') || '',
        call_recording: addOns['Call Recording'],
        family_quiet_hours: addOns['Quiet Hours'],
        voicemail_to_email: addOns['Voicemail to Email'],
        auto_attendant: addOns['Auto Attendant'],
        policy_agreement: policyAgreement,
        setup_summary: setupSummary,
        all_properties_json: JSON.stringify(Object.fromEntries(properties.entries())),
      });
    }
  }

  return rows;
}

function setupRowsToCsv(rows) {
  const lines = [CSV_COLUMNS.join(',')];
  for (const row of rows) {
    lines.push(CSV_COLUMNS.map((column) => csvValue(row[column])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

function readJsonInput(inputPath) {
  const source = inputPath ? fs.readFileSync(inputPath, 'utf8') : fs.readFileSync(0, 'utf8');
  return JSON.parse(source);
}

function runCli(argv = process.argv.slice(2), env = process.env) {
  const inputPath = argv[0] || env.ORDER_SETUP_EXPORT_INPUT || '';
  const outputPath = env.ORDER_SETUP_EXPORT_OUTPUT || '';
  const rows = extractSetupRows(readJsonInput(inputPath));
  const csv = setupRowsToCsv(rows);

  if (outputPath) {
    fs.writeFileSync(outputPath, csv);
  } else {
    process.stdout.write(csv);
  }

  return rows;
}

if (require.main === module) {
  try {
    runCli();
  } catch (error) {
    console.error(error.stack || error.message);
    process.exit(1);
  }
}

module.exports = {
  ADD_ON_PROPERTY_NAMES,
  CSV_COLUMNS,
  extractSetupRows,
  hasHiddenProperty,
  orderAttributes,
  propertyEntries,
  propertyMap,
  runCli,
  setupRowsToCsv,
};
