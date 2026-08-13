const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../lib/db');

const router = express.Router();
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'kyc');

router.get('/orders', async (req, res) => {
  const orders = await db.listOrders();
  // Never send the raw uploaded-file path to the browser — only enough to
  // build the download link below.
  res.json(
    orders.map((o) => ({
      id: o.id,
      created: o.created,
      name: o.name,
      email: o.email,
      method: o.method,
      orderType: o.orderType,
      total: o.total,
      amountDue: o.amountDue,
      paymentStatus: o.paymentStatus,
      kyc: o.kyc ? { idNumber: o.kyc.idNumber, status: o.kyc.status, hasDocument: Boolean(o.kyc.documentFile) } : null,
    }))
  );
});

router.get('/orders/:id/kyc-document', async (req, res) => {
  const order = await db.getOrder(req.params.id);
  if (!order || !order.kyc?.documentFile) return res.sendStatus(404);
  const filePath = path.join(UPLOAD_DIR, order.kyc.documentFile);
  if (!fs.existsSync(filePath)) return res.sendStatus(404);
  res.sendFile(filePath);
});

router.post('/orders/:id/kyc-review', express.json(), async (req, res) => {
  const { status } = req.body; // 'verified' | 'rejected'
  if (!['verified', 'rejected'].includes(status)) {
    return res.status(400).json({ error: "status must be 'verified' or 'rejected'." });
  }
  const order = await db.getOrder(req.params.id);
  if (!order) return res.sendStatus(404);
  const updated = await db.updateOrder(order.id, { kyc: { ...order.kyc, status } });
  res.json({ id: updated.id, kyc: updated.kyc });
});

module.exports = router;
