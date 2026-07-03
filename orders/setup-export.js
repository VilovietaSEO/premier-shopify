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
  'patriot_package',
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

function hasHiddenProperty(properties, name, expectedValue = null) {
  return propertyEntries(properties).some((property) =>
    property.name === name && (expectedValue == null || property.value === expectedValue)
  );
}

function customerEmail(order) {
  return order.email || order.customer?.email || order.shipping_address?.email || '';
}

function orderLineItems(order) {
  return order.line_items || order.lineItems?.nodes || order.lineItems || [];
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

function extractSetupRows(input) {
  const orders = Array.isArray(input) ? input : input.orders || input.data?.orders?.nodes || [input];
  const rows = [];

  for (const order of orders.filter(Boolean)) {
    for (const lineItem of orderLineItems(order)) {
      const rawProperties = lineItemProperties(lineItem);
      if (hasHiddenProperty(rawProperties, '_setup_parent', 'true')) continue;
      const properties = propertyMap(rawProperties);
      const addOns = Object.fromEntries(ADD_ON_PROPERTY_NAMES.map((name) => [name, properties.get(name) || '']));

      const setupSummary = compactParts([
        labeledPart('Phone', properties.get('Phone')),
        labeledPart('Service plan', properties.get('Service plan')),
        labeledPart('Patriot Package', properties.get('Patriot Package')),
        labeledPart('Add-on Bundle', properties.get('Add-on Bundle')),
        ...ADD_ON_PROPERTY_NAMES.map((name) => addOns[name] ? `${name}: ${addOns[name]}` : ''),
        labeledPart('Policy agreement', properties.get('Policy agreement')),
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
        quantity: lineItem.quantity || '',
        phone: properties.get('Phone') || '',
        service_plan: properties.get('Service plan') || '',
        patriot_package: properties.get('Patriot Package') || '',
        add_on_bundle: properties.get('Add-on Bundle') || '',
        call_recording: addOns['Call Recording'],
        family_quiet_hours: addOns['Quiet Hours'],
        voicemail_to_email: addOns['Voicemail to Email'],
        auto_attendant: addOns['Auto Attendant'],
        policy_agreement: properties.get('Policy agreement') || '',
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
  propertyEntries,
  propertyMap,
  runCli,
  setupRowsToCsv,
};
