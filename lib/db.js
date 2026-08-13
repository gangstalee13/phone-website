// Minimal file-backed order store.
//
// This is deliberately simple (a JSON file, not a real database) since the
// shop is small. It's safe for a single Node process because every write
// goes through `queue`, which serializes reads/writes so two requests can't
// race and clobber each other's changes. If the shop grows to the point of
// needing multiple server instances, swap this file for a real database
// (Postgres/SQLite) — the rest of the app only talks to the functions below,
// so that swap wouldn't touch routes/*.js.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'orders.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');

let queue = Promise.resolve();

function readAll() {
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  try {
    return JSON.parse(raw || '[]');
  } catch (err) {
    console.error('orders.json is corrupted, starting fresh. Original content backed up.', err);
    fs.writeFileSync(DATA_FILE + `.corrupt-${Date.now()}`, raw);
    return [];
  }
}

function writeAll(orders) {
  // Write to a temp file then rename, so a crash mid-write can't truncate
  // the real file.
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(orders, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function withQueue(fn) {
  const result = queue.then(fn);
  // Keep the queue alive even if this particular task fails, so later
  // tasks still run.
  queue = result.catch(() => {});
  return result;
}

async function createOrder(order) {
  return withQueue(async () => {
    const orders = readAll();
    orders.push(order);
    writeAll(orders);
    return order;
  });
}

async function getOrder(id) {
  return withQueue(async () => readAll().find((o) => o.id === id) || null);
}

async function updateOrder(id, patch) {
  return withQueue(async () => {
    const orders = readAll();
    const idx = orders.findIndex((o) => o.id === id);
    if (idx === -1) return null;
    orders[idx] = { ...orders[idx], ...patch, updated: Date.now() };
    writeAll(orders);
    return orders[idx];
  });
}

async function listOrders() {
  return withQueue(async () => readAll().slice().sort((a, b) => b.created - a.created));
}

module.exports = { createOrder, getOrder, updateOrder, listOrders };
