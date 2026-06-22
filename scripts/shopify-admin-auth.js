const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function readCliSessionToken() {
  const configPath = path.join(os.homedir(), 'Library/Preferences/shopify-cli-kit-nodejs/config.json');
  if (!fs.existsSync(configPath)) return '';

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (!config.currentSessionId || !config.sessionStore) return '';

  const sessionStore = JSON.parse(config.sessionStore);
  const identity = sessionStore['accounts.shopify.com']?.[config.currentSessionId]?.identity;
  if (!identity?.accessToken) return '';

  if (identity.expiresAt && Date.parse(identity.expiresAt) <= Date.now()) {
    throw new Error('Shopify CLI session is expired. Run a Shopify CLI command and log in again.');
  }

  return identity.accessToken;
}

function resolveAdminAuth() {
  const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  if (accessToken) {
    return {
      source: 'SHOPIFY_ADMIN_ACCESS_TOKEN',
      headers: {
        'X-Shopify-Access-Token': accessToken,
      },
    };
  }

  const bearerToken = process.env.SHOPIFY_ADMIN_BEARER_TOKEN
    || (process.env.SHOPIFY_USE_CLI_SESSION === '1' ? readCliSessionToken() : '');

  if (bearerToken) {
    return {
      source: process.env.SHOPIFY_ADMIN_BEARER_TOKEN ? 'SHOPIFY_ADMIN_BEARER_TOKEN' : 'Shopify CLI session',
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    };
  }

  return null;
}

module.exports = {
  resolveAdminAuth,
};
