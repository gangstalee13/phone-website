// Thin wrapper around the official Paynow Node SDK.
// Docs: https://developers.paynow.co.zw/docs/paynow/nodejs_quickstart/

const { Paynow } = require('paynow');

const integrationId = process.env.PAYNOW_INTEGRATION_ID;
const integrationKey = process.env.PAYNOW_INTEGRATION_KEY;
const baseUrl = (process.env.PUBLIC_BASE_URL || '').replace(/\/+$/, '');

let paynow = null;
if (integrationId && integrationKey && integrationId !== 'your-integration-id') {
  paynow = new Paynow(integrationId, integrationKey);
  if (baseUrl) {
    // Paynow POSTs the transaction result here. We don't trust the POST body
    // directly (see routes/webhook.js) — we just use it as a nudge to
    // re-poll the transaction through the SDK, which does its own
    // verification against Paynow's servers.
    paynow.resultUrl = `${baseUrl}/api/paynow/webhook`;
  }
} else {
  console.warn(
    '[paynow] PAYNOW_INTEGRATION_ID / PAYNOW_INTEGRATION_KEY are not set — ' +
      'EcoCash checkout will fail until you add real credentials to .env'
  );
}

function isConfigured() {
  return Boolean(paynow);
}

/**
 * Kick off an EcoCash mobile money charge for an order.
 * @param {object} order - { id, email, items: [{name, price}], phone }
 * @returns {Promise<{success: boolean, instructions?: string, pollUrl?: string, error?: string}>}
 */
async function chargeEcocash(order) {
  if (!paynow) {
    return { success: false, error: 'Payment gateway is not configured on the server yet.' };
  }
  const payment = paynow.createPayment(order.id, order.email);
  for (const item of order.items) {
    payment.add(item.name, item.price);
  }
  try {
    const response = await paynow.sendMobile(payment, order.phone, 'ecocash');
    if (response.success) {
      return { success: true, instructions: response.instructions, pollUrl: response.pollUrl };
    }
    return { success: false, error: response.error || 'Paynow declined the request.' };
  } catch (err) {
    console.error('[paynow] chargeEcocash failed', err);
    return { success: false, error: 'Could not reach the payment gateway. Please try again.' };
  }
}

/**
 * Check the live status of a previously-initiated transaction.
 * @param {string} pollUrl
 * @returns {Promise<{status: string, paid: boolean}>}
 */
async function checkStatus(pollUrl) {
  if (!paynow || !pollUrl) return { status: 'unknown', paid: false };
  try {
    const status = await paynow.pollTransaction(pollUrl);
    return { status: status.status, paid: status.paid() };
  } catch (err) {
    console.error('[paynow] checkStatus failed', err);
    return { status: 'unknown', paid: false };
  }
}

module.exports = { isConfigured, chargeEcocash, checkStatus };
