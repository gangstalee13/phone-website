const express = require('express');
const db = require('../lib/db');
const paynowClient = require('../lib/paynow');

const router = express.Router();

// Paynow POSTs transaction results to this URL (see lib/paynow.js -> resultUrl).
// We deliberately do NOT trust the posted status/hash ourselves — verifying
// Paynow's hash correctly is easy to get subtly wrong, and the official SDK
// already does that verification for us inside pollTransaction(). So this
// handler just uses the incoming ping as a signal to re-check the real
// status via the SDK, and updates our own record from that trusted result.
router.post('/paynow/webhook', express.urlencoded({ extended: false }), async (req, res) => {
  const reference = req.body.reference;
  if (!reference) return res.sendStatus(400);

  const order = await db.getOrder(reference);
  if (!order || !order.paynow?.pollUrl) return res.sendStatus(200); // ack anyway, nothing to do

  const live = await paynowClient.checkStatus(order.paynow.pollUrl);
  if (live.paid) {
    await db.updateOrder(order.id, { paymentStatus: 'paid' });
  } else if (live.status && live.status.toLowerCase() === 'cancelled') {
    await db.updateOrder(order.id, { paymentStatus: 'cancelled' });
  }

  res.sendStatus(200);
});

module.exports = router;
