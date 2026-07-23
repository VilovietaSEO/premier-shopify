#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const {
  extractSetupRows,
  propertyEntries,
  setupRowsToCsv,
} = require('../orders/setup-export');

const root = path.resolve(__dirname, '..');
const defaultOutputPath = path.join(root, 'tmp', 'shopify-live-proof', 'order-proof-audit.json');
const defaultCsvPath = path.join(root, 'tmp', 'shopify-live-proof', 'order-setup-details.csv');
const deferredBillingSchema = 'independence_phone.revio_checkout.v2';
const deferredBillingRoles = new Set(['service', 'addon', 'addon_bundle']);

const requiredScenarios = [
  {
    id: 'classic_monthly_addon',
    label: 'Classic Phone with monthly service and at least one add-on',
    titlePattern: /classic phone/i,
    phonePattern: /classic phone/i,
    servicePattern: /monthly service/i,
    requiredAnyAddOn: true,
  },
  {
    id: 'rugged_annual_bundle',
    label: 'Rugged Phone with annual service and Add-on Bundle',
    titlePattern: /rugged phone/i,
    phonePattern: /rugged phone/i,
    servicePattern: /annual service/i,
    addOnBundlePattern: /add-on bundle|call recording.*quiet hours.*voicemail to email.*auto attendant/i,
  },
];

const addOnColumns = [
  'call_recording',
  'family_quiet_hours',
  'voicemail_to_email',
  'auto_attendant',
];

function usage() {
  console.error('Usage: ORDER_PROOF_INPUT=/path/to/shopify-orders.json npm run orders:proof:audit');
  console.error('Optional: ORDER_PROOF_OUTPUT=/absolute/path/order-proof-audit.json');
  console.error('Optional: ORDER_PROOF_CSV_OUTPUT=/absolute/path/order-setup-details.csv');
}

function readJson(inputPath) {
  if (!inputPath) throw new Error('ORDER_PROOF_INPUT is required');
  return JSON.parse(fs.readFileSync(inputPath, 'utf8'));
}

function stringIncludesPattern(value, pattern) {
  return pattern.test(String(value || ''));
}

function hasAnyAddOn(row) {
  return addOnColumns.some((column) => String(row[column] || '').trim() !== '') ||
    /call recording|quiet hours|voicemail to email|auto attendant/i.test(row.add_on_bundle || '');
}

function propertyValue(properties, name) {
  return propertyEntries(properties).find((property) => property.name === name)?.value || '';
}

function checkoutHandoffFromInput(input) {
  const direct =
    input?.revio_checkout_payload ||
    input?.revioCheckoutPayload ||
    input?.checkout_handoff ||
    input?.checkoutHandoff;
  if (direct) return direct;

  const orders = Array.isArray(input) ? input : input?.orders || input?.data?.orders?.nodes || [];
  for (const order of orders) {
    const nested =
      order?.revio_checkout_payload ||
      order?.revioCheckoutPayload ||
      order?.checkout_handoff ||
      order?.checkoutHandoff;
    if (nested) return nested;
  }

  return null;
}

function auditDeferredBillingContract(input) {
  const payload = checkoutHandoffFromInput(input);
  const failures = [];

  if (!payload) {
    failures.push('deferred-billing v2 checkout handoff payload is missing');
    return {
      status: 'fail',
      schema: '',
      zeroDollarBillingLinesVerified: false,
      futureMetadataVerified: false,
      flatShippingCents: null,
      dueTodayBeforeTaxCents: null,
      futureChargeCents: null,
      totalsSeparated: false,
      consentCollectionStatus: '',
      desiredAreaCodeCollectionStatus: '',
      failures,
    };
  }

  if (payload.schema !== deferredBillingSchema) {
    failures.push(`schema must be ${deferredBillingSchema}`);
  }

  const lines = Array.isArray(payload.lines) ? payload.lines : [];
  const phoneLines = lines.filter((line) => line.role === 'phone');
  const billingLines = lines.filter((line) => deferredBillingRoles.has(line.role));

  if (phoneLines.length === 0) failures.push('handoff must include at least one phone line');
  if (billingLines.length === 0) failures.push('handoff must include at least one deferred service or add-on line');

  for (const line of phoneLines) {
    if (!Number.isFinite(Number(line.checkout_price_cents)) || Number(line.checkout_price_cents) <= 0) {
      failures.push(`${line.title || 'phone line'} must carry its due-today checkout price`);
    }
    if (Number(line.future_charge_cents || 0) !== 0) {
      failures.push(`${line.title || 'phone line'} must not carry a future charge`);
    }
  }

  for (const line of billingLines) {
    const label = line.title || line.setup_billing_name || line.role;
    if (Number(line.checkout_price_cents) !== 0 || Number(line.checkout_line_price_cents) !== 0) {
      failures.push(`${label} must be zero-dollar at checkout`);
    }
    if (!Number.isFinite(Number(line.future_charge_cents)) || Number(line.future_charge_cents) <= 0) {
      failures.push(`${label} must carry numeric future_charge_cents`);
    }
    if (!['monthly', 'annual'].includes(line.billing_cadence)) {
      failures.push(`${label} must carry a monthly or annual billing_cadence`);
    }
    if (line.first_bill_rule !== 'first_day_of_next_month') {
      failures.push(`${label} must carry first_bill_rule first_day_of_next_month`);
    }

    const visibleProperties = line.visible_properties || line.properties || [];
    const futureCharge = propertyValue(visibleProperties, 'Future charge');
    const billingStarts =
      propertyValue(visibleProperties, 'Billing starts') ||
      propertyValue(visibleProperties, 'Billing begins');
    if (!futureCharge) failures.push(`${label} is missing visible Future charge metadata`);
    if (!/first day of the following month/i.test(billingStarts)) {
      failures.push(`${label} is missing visible next-month billing metadata`);
    }
  }

  const cart = payload.cart || {};
  const expectedImmediateSubtotal = lines.reduce(
    (total, line) => total + Number(line.checkout_line_price_cents || 0),
    0
  );
  const expectedFutureCharge = lines.reduce(
    (total, line) => total + Number(line.future_line_charge_cents || 0),
    0
  );

  if (Number(cart.flat_shipping_cents) !== 1500) {
    failures.push('flat shipping must be $15 once per order');
  }
  if (Number(cart.immediate_subtotal_cents) !== expectedImmediateSubtotal) {
    failures.push('immediate subtotal does not match due-today checkout lines');
  }
  if (Number(cart.due_today_before_tax_cents) !== expectedImmediateSubtotal + 1500) {
    failures.push('due-today total must equal the phone subtotal plus one $15 shipping charge');
  }
  if (Number(cart.future_charge_cents) !== expectedFutureCharge) {
    failures.push('future total does not match deferred service and add-on lines');
  }
  if (cart.tax_cents !== null || cart.tax_status !== 'calculated_after_address') {
    failures.push('tax must remain pending until an address is entered at checkout');
  }
  if (
    payload.consent?.collection_status !== 'pending_checkout' ||
    payload.consent?.privacy_terms_accepted !== null
  ) {
    failures.push('privacy and terms consent must remain pending at checkout');
  }
  if (
    payload.customer?.desired_area_code !== null ||
    payload.customer?.desired_area_code_collection_status !== 'required_at_checkout'
  ) {
    failures.push('desired area code must remain required at checkout');
  }

  const zeroDollarBillingLinesVerified =
    billingLines.length > 0 &&
    billingLines.every(
      (line) =>
        Number(line.checkout_price_cents) === 0 &&
        Number(line.checkout_line_price_cents) === 0
    );
  const futureMetadataVerified =
    billingLines.length > 0 &&
    billingLines.every(
      (line) =>
        Number(line.future_charge_cents) > 0 &&
        ['monthly', 'annual'].includes(line.billing_cadence) &&
        line.first_bill_rule === 'first_day_of_next_month'
    );
  const totalsSeparated =
    Number(cart.immediate_subtotal_cents) === expectedImmediateSubtotal &&
    Number(cart.future_charge_cents) === expectedFutureCharge &&
    expectedFutureCharge > 0;

  return {
    status: failures.length > 0 ? 'fail' : 'pass',
    schema: payload.schema || '',
    zeroDollarBillingLinesVerified,
    futureMetadataVerified,
    flatShippingCents: Number.isFinite(Number(cart.flat_shipping_cents))
      ? Number(cart.flat_shipping_cents)
      : null,
    dueTodayBeforeTaxCents: Number.isFinite(Number(cart.due_today_before_tax_cents))
      ? Number(cart.due_today_before_tax_cents)
      : null,
    futureChargeCents: Number.isFinite(Number(cart.future_charge_cents))
      ? Number(cart.future_charge_cents)
      : null,
    totalsSeparated,
    consentCollectionStatus: payload.consent?.collection_status || '',
    desiredAreaCodeCollectionStatus:
      payload.customer?.desired_area_code_collection_status || '',
    failures,
  };
}

function rowMatchesScenario(row, scenario) {
  const failures = [];
  if (scenario.titlePattern && !stringIncludesPattern(row.line_item_title, scenario.titlePattern)) {
    failures.push(`line item title does not match ${scenario.titlePattern}`);
  }
  if (scenario.phonePattern && !stringIncludesPattern(row.phone || row.line_item_title, scenario.phonePattern)) {
    failures.push(`phone property does not match ${scenario.phonePattern}`);
  }
  if (scenario.servicePattern && !stringIncludesPattern(row.service_plan, scenario.servicePattern)) {
    failures.push(`service plan does not match ${scenario.servicePattern}`);
  }
  if (scenario.addOnBundlePattern && !stringIncludesPattern(row.add_on_bundle, scenario.addOnBundlePattern)) {
    failures.push(`Add-on Bundle property does not match ${scenario.addOnBundlePattern}`);
  }
  if (scenario.requiredAnyAddOn && !hasAnyAddOn(row)) {
    failures.push('no add-on property found');
  }
  return failures;
}

function scenarioResult(rows, scenario) {
  const candidates = rows.filter((row) => {
    const titleMatches = !scenario.titlePattern || stringIncludesPattern(row.line_item_title, scenario.titlePattern);
    const phoneMatches = !scenario.phonePattern || stringIncludesPattern(row.phone || row.line_item_title, scenario.phonePattern);
    return titleMatches || phoneMatches;
  });

  if (candidates.length === 0) {
    return {
      id: scenario.id,
      label: scenario.label,
      status: 'fail',
      matchedOrderName: '',
      failures: ['no matching order line found'],
    };
  }

  const evaluated = candidates.map((row) => ({
    row,
    failures: rowMatchesScenario(row, scenario),
  }));
  const passing = evaluated.find((item) => item.failures.length === 0);
  const selected = passing || evaluated[0];

  return {
    id: scenario.id,
    label: scenario.label,
    status: passing ? 'pass' : 'fail',
    matchedOrderName: selected.row.order_name,
    matchedLineItemTitle: selected.row.line_item_title,
    failures: selected.failures,
    evidence: {
      customerEmailPresent: Boolean(selected.row.customer_email),
      financialStatusPresent: Boolean(selected.row.financial_status),
      fulfillmentStatusPresent: Boolean(selected.row.fulfillment_status),
      setupSummary: selected.row.setup_summary,
    },
  };
}

function auditRows(rows, input = {}) {
  const failures = [];
  if (rows.length === 0) failures.push('no order line-item rows found');

  const scenarioResults = requiredScenarios.map((scenario) => scenarioResult(rows, scenario));
  for (const result of scenarioResults) {
    failures.push(...result.failures.map((failure) => `${result.label}: ${failure}`));
  }

  const fulfillmentMissing = rows.filter((row) => !row.fulfillment_status);
  if (fulfillmentMissing.length > 0) {
    failures.push(`${fulfillmentMissing.length} setup row(s) missing fulfillment_status/displayFulfillmentStatus`);
  }

  const financialMissing = rows.filter((row) => !row.financial_status);
  if (financialMissing.length > 0) {
    failures.push(`${financialMissing.length} setup row(s) missing financial_status/displayFinancialStatus`);
  }

  const deferredBillingContract = auditDeferredBillingContract(input);
  failures.push(...deferredBillingContract.failures);

  const csv = setupRowsToCsv(rows);
  if (!csv.includes('setup_summary')) failures.push('setup CSV missing setup_summary column');

  return {
    status: failures.length > 0 ? 'fail' : 'pass',
    rowsChecked: rows.length,
    scenarios: scenarioResults,
    deferredBillingContract,
    csvColumnsVerified: csv.includes('setup_summary'),
    failures,
    csv,
  };
}

function runAudit(options = {}) {
  const inputPath = options.inputPath || process.env.ORDER_PROOF_INPUT || '';
  const outputPath = options.outputPath || process.env.ORDER_PROOF_OUTPUT || defaultOutputPath;
  const csvOutputPath = options.csvOutputPath || process.env.ORDER_PROOF_CSV_OUTPUT || defaultCsvPath;
  const input = options.input || readJson(inputPath);
  const rows = extractSetupRows(input);
  const result = auditRows(rows, input);

  const report = {
    generatedAt: new Date().toISOString(),
    inputPath: inputPath || '(provided programmatically)',
    csvOutputPath,
    status: result.status,
    rowsChecked: result.rowsChecked,
    scenarios: result.scenarios,
    deferredBillingContract: result.deferredBillingContract,
    csvColumnsVerified: result.csvColumnsVerified,
    failures: result.failures,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  fs.mkdirSync(path.dirname(csvOutputPath), { recursive: true });
  fs.writeFileSync(csvOutputPath, result.csv);

  return report;
}

function main() {
  try {
    const report = runAudit();
    console.log(`Order proof audit wrote ${path.relative(root, process.env.ORDER_PROOF_OUTPUT || defaultOutputPath)}`);
    console.log(`Order setup CSV wrote ${path.relative(root, process.env.ORDER_PROOF_CSV_OUTPUT || defaultCsvPath)}`);
    console.log(`Rows checked: ${report.rowsChecked}`);
    console.log(`Status: ${report.status}`);
    console.log(`Failures: ${report.failures.length}`);
    if (report.failures.length > 0) {
      for (const failure of report.failures) console.error(`FAIL ${failure}`);
      process.exit(1);
    }
  } catch (error) {
    usage();
    console.error(error.message);
    process.exit(2);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  auditDeferredBillingContract,
  auditRows,
  deferredBillingSchema,
  requiredScenarios,
  runAudit,
  rowMatchesScenario,
  scenarioResult,
};
