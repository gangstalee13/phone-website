require('dotenv').config();
const express = require('express');
const basicAuth = require('express-basic-auth');
const path = require('path');

const ordersRouter = require('./routes/orders');
const webhookRouter = require('./routes/webhook');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 4000;

// Paynow's webhook needs to be reachable without auth, and it's mounted
// before the JSON/static middleware below since it parses its own body.
app.use('/api', webhookRouter);

app.use(express.static(path.join(__dirname, 'public')));

// Everything under /api/orders is public (customers use it to check out).
app.use('/api', ordersRouter);

// Everything under /admin and /api/admin requires the basic-auth credentials
// from .env. Change ADMIN_USER / ADMIN_PASS before deploying.
const adminUser = process.env.ADMIN_USER || 'admin';
const adminPass = process.env.ADMIN_PASS || 'change-me';
if (adminPass === 'change-me') {
  console.warn('[admin] ADMIN_PASS is still the default — set a real password in .env before deploying.');
}
const requireAdmin = basicAuth({
  users: { [adminUser]: adminPass },
  challenge: true,
  realm: 'iPhone Shop Admin',
});

app.use('/admin', requireAdmin, express.static(path.join(__dirname, 'admin-ui')));
app.use('/api/admin', requireAdmin, adminRouter);

app.listen(PORT, () => {
  console.log(`iPhone Shop server listening on http://localhost:${PORT}`);
});
