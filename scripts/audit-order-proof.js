#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { extractSetupRows, setupRowsToCsv } = require('../orders/setup-export');

const root = path.resolve(__dirname, '..');
const defaultOutputPath = path.join(root, 'tmp', 'shopify-live-proof', 'order-proof-audit.json');
const defaultCsvPath = path.join(root, 'tmp', 'shopify-live-proof', 'order-setup-details.csv');

const requiredScenarios = [
  {
    id: 'classic_monthly_addon',
    label: 'Classic Phone with monthly service and at least one add-on',
    titlePattern: /classic phone/i,
    phonePattern: /classic phone/i,
    servicePattern: /monthly service/i,
    requiredAnyAddOn: true,
    requiredProperties: ['Policy agreement'],
  },
  {
    id: 'classic_patriot_package',
    label: 'Classic Phone with Patriot Package, annual service, and Add-on Bundle',
    titlePattern: /classic phone/i,
    phonePattern: /classic phone/i,
    servicePattern: /annual service/i,
    patriotPackagePattern: /patriot package/i,
    addOnBundlePattern: /add-on bundle|call recording.*quiet hours.*voicemail to email.*auto attendant/i,
    requiredProperties: ['Policy agreement'],
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
  if (scenario.patriotPackagePattern && !stringIncludesPattern(row.patriot_package, scenario.patriotPackagePattern)) {
    failures.push(`Patriot Package property does not match ${scenario.patriotPackagePattern}`);
  }
  if (scenario.addOnBundlePattern && !stringIncludesPattern(row.add_on_bundle, scenario.addOnBundlePattern)) {
    failures.push(`Add-on Bundle property does not match ${scenario.addOnBundlePattern}`);
  }
  if (scenario.requiredAnyAddOn && !hasAnyAddOn(row)) {
    failures.push('no add-on property found');
  }
  for (const propertyName of scenario.requiredProperties || []) {
    if (propertyName === 'Policy agreement' && !/privacy policy|terms|agreed/i.test(row.policy_agreement || '')) {
      failures.push('policy agreement is missing or does not show acceptance');
    }
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

function auditRows(rows) {
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

  const csv = setupRowsToCsv(rows);
  if (!csv.includes('setup_summary')) failures.push('setup CSV missing setup_summary column');
  if (!csv.includes('policy_agreement')) failures.push('setup CSV missing policy_agreement column');

  return {
    status: failures.length > 0 ? 'fail' : 'pass',
    rowsChecked: rows.length,
    scenarios: scenarioResults,
    csvColumnsVerified: csv.includes('setup_summary') && csv.includes('policy_agreement'),
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
  const result = auditRows(rows);

  const report = {
    generatedAt: new Date().toISOString(),
    inputPath: inputPath || '(provided programmatically)',
    csvOutputPath,
    status: result.status,
    rowsChecked: result.rowsChecked,
    scenarios: result.scenarios,
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
  auditRows,
  requiredScenarios,
  runAudit,
  rowMatchesScenario,
  scenarioResult,
};
