const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { nanoid } = require('nanoid');
const db = require('../lib/db');
const paynowClient = require('../lib/paynow');

const router = express.Router();

const PRODUCTS = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'public', 'products.json'), 'utf8')
);

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'kyc');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Assign an order id before multer runs, so we can name the uploaded file
// after the order it belongs to instead of a random temp name.
function assignOrderId(req, res, next) {
  req.orderId = 'ORD-' + nanoid(10);
  next();
}

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    cb(null, `${req.orderId}${ext}`);
  },
});

const ALLOWED_KYC_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_KYC_TYPES.has(file.mimetype)) {
      return cb(new Error('ID document must be a JPG, PNG, WEBP, or PDF file.'));
    }
    cb(null, true);
  },
});

// Recompute the cart total from products.json server-side. Never trust a
// total sent by the client — it's trivial to tamper with in the browser.
function computeCart(cartInput) {
  let cart;
  try {
    cart = JSON.parse(cartInput);
  } catch {
    throw new Error('Invalid cart data.');
  }
  const lineItems = [];
  let total = 0;
  for (const [key, qtyRaw] of Object.entries(cart || {})) {
    const qty = Math.max(1, parseInt(qtyRaw, 10) || 0);
    if (!qty) continue;
    const [baseId, color] = String(key).split('::');
    const product = PRODUCTS.find((p) => p.id === baseId);
    if (!product) continue; // ignore unknown/stale ids rather than failing the whole order
    const lineTotal = product.price * qty;
    total += lineTotal;
    lineItems.push({
      name: product.name + (color ? ` (${color})` : ''),
      price: product.price,
      qty,
      lineTotal,
    });
  }
  if (!lineItems.length) throw new Error('Cart is empty.');
  return { lineItems, total };
}

router.post('/orders', assignOrderId, upload.single('idDocument'), async (req, res) => {
  const orderId = req.orderId;
  const cleanupUpload = () => {
    if (req.file) fs.unlink(req.file.path, () => {});
  };

  try {
    const {
      name,
      email,
      method,
      orderType,
      ecocash_phone: phone,
      bank_name,
      bank_account_name,
      bank_account_number,
      idNumber,
      cart,
    } = req.body;

    if (!name || !email) throw new Error('Name and email are required.');
    if (!idNumber || !idNumber.trim()) throw new Error('A national ID or passport number is required.');
    if (!req.file) throw new Error('An ID document photo (JPG, PNG, WEBP, or PDF) is required.');
    if (method !== 'ecocash' && method !== 'bank') throw new Error('Invalid payment method.');
    if (method === 'ecocash' && !phone) throw new Error('Ecocash phone number is required.');
    if (method === 'bank' && (!bank_name || !bank_account_name || !bank_account_number)) {
      throw new Error('Bank name, account name, and account number are required.');
    }

    const { lineItems, total } = computeCart(cart);
    const amountDue = orderType === 'deposit' ? +(total * 0.75).toFixed(2) : total;

    const order = {
      id: orderId,
      created: Date.now(),
      name,
      email,
      method,
      phone: method === 'ecocash' ? phone : undefined,
      bank:
        method === 'bank'
          ? { name: bank_name, accountName: bank_account_name, accountNumber: bank_account_number }
          : undefined,
      orderType: orderType === 'deposit' ? 'deposit' : 'full',
      lineItems,
      total,
      amountDue,
      paymentStatus: 'pending',
      paynow: null,
      kyc: {
        idNumber: idNumber.trim(),
        documentFile: path.basename(req.file.path),
        status: 'submitted',
      },
    };

    if (method === 'ecocash') {
      const result = await paynowClient.chargeEcocash({
        id: orderId,
        email,
        phone,
        items:
          orderType === 'deposit'
            ? [{ name: 'Order deposit (75%)', price: amountDue }]
            : lineItems.map((li) => ({ name: li.name, price: li.lineTotal })),
      });

      if (!result.success) {
        cleanupUpload();
        await db.createOrder({ ...order, paymentStatus: 'failed', paynowError: result.error });
        return res.status(502).json({ error: result.error || 'EcoCash request failed.' });
      }

      order.paynow = { pollUrl: result.pollUrl };
      await db.createOrder(order);
      return res.json({
        orderId,
        status: 'pending',
        instructions: result.instructions,
        amountDue,
        total,
      });
    }

    // Bank transfer: no gateway call, order sits awaiting manual verification
    // (same manual-reconciliation flow the shop already used).
    order.paymentStatus = 'awaiting-manual';
    await db.createOrder(order);
    return res.json({ orderId, status: 'awaiting-manual', amountDue, total });
  } catch (err) {
    cleanupUpload();
    res.status(400).json({ error: err.message || 'Could not create order.' });
  }
});

router.get('/orders/:id/status', async (req, res) => {
  const order = await db.getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  if (order.method === 'ecocash' && order.paymentStatus === 'pending' && order.paynow?.pollUrl) {
    const live = await paynowClient.checkStatus(order.paynow.pollUrl);
    if (live.paid && order.paymentStatus !== 'paid') {
      await db.updateOrder(order.id, { paymentStatus: 'paid' });
      order.paymentStatus = 'paid';
    } else if (live.status && live.status.toLowerCase() === 'cancelled') {
      await db.updateOrder(order.id, { paymentStatus: 'cancelled' });
      order.paymentStatus = 'cancelled';
    }
  }

  res.json({
    orderId: order.id,
    status: order.paymentStatus,
    amountDue: order.amountDue,
    total: order.total,
  });
});

module.exports = router;
