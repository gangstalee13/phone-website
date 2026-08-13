# iPhone Shop — server edition

A Node/Express backend now sits in front of the storefront. It:

- Serves the existing site (`public/`) as static files
- Charges customers directly via **EcoCash**, using Paynow as the licensed
  payment gateway (Paynow pushes a real PIN prompt to the customer's phone —
  no manual "send money to this number" step anymore)
- Collects **KYC**: a national ID/passport number and a photo of that
  document, required on every order
- Gives you an **admin dashboard** (`/admin`) to see orders and review KYC
  documents
- Recomputes every cart total from `products.json` on the server, so a
  tampered price in the browser can't be submitted

## Why a backend was necessary

EcoCash doesn't let a plain website charge a customer directly — that
requires a registered payment gateway relationship and server-side secret
keys, which can't safely live in browser JS. This app uses
**[Paynow](https://www.paynow.co.zw)**, the standard licensed aggregator for
Zimbabwean sites, which supports EcoCash mobile money.

## 1. Get Paynow credentials

1. Register a business account at <https://www.paynow.co.zw/home/businesshome>
2. Create an integration and make sure **EcoCash** is enabled on it
3. Copy your **Integration ID** and **Integration Key**

## 2. Configure environment variables

```
cp .env.example .env
```

Fill in `.env`:

- `PAYNOW_INTEGRATION_ID`, `PAYNOW_INTEGRATION_KEY` — from step 1
- `PUBLIC_BASE_URL` — the public HTTPS URL this server will run at (Paynow
  needs to reach it to send payment-result webhooks; `localhost` won't work
  — use a tunnel like `ngrok` for local testing)
- `ADMIN_USER`, `ADMIN_PASS` — credentials for the `/admin` dashboard;
  **change these before deploying**
- `ECOCASH_DISPLAY_NUMBER` — kept for reference, not currently used in the
  automated flow

## 3. Install and run

```
npm install
npm start
```

The site is now served at `http://localhost:4000` (or whatever `PORT` you
set). Visit `/admin` for the order/KYC dashboard (browser will prompt for
the admin username/password).

## How checkout works now

1. Customer fills in the checkout form, including their national ID number
   and a photo of the ID (JPG/PNG/WEBP/PDF, max 8MB) — this is required for
   every order.
2. On submit, the browser posts the form (as `multipart/form-data`, since
   there's a file) to `POST /api/orders`.
3. The server re-validates everything, recomputes the total from
   `products.json`, saves the KYC document to `uploads/kyc/`, and:
   - **EcoCash**: calls Paynow's `sendMobile` API, which pushes a PIN prompt
     straight to the customer's phone. The browser then polls
     `GET /api/orders/:id/status` every few seconds until Paynow reports the
     transaction as paid or cancelled.
   - **Bank transfer**: recorded as `awaiting-manual`, same as before —
     you confirm it yourself and follow up over WhatsApp.
4. You review submitted KYC documents at `/admin` and mark them
   verified/rejected.

## Data storage

Orders live in `data/orders.json` and uploaded ID documents in
`uploads/kyc/` — both are `.gitignore`d, since they contain personal data
and shouldn't end up in version control. This is a flat-file store meant for
a small shop's volume; if you outgrow it, swap `lib/db.js` for a real
database without touching the routes.

## Deploying

This needs a host that can run a persistent Node process (Render, Railway,
Fly.io, a VPS, etc.) — not a static host, since it's no longer just HTML/CSS/JS.
Whichever you pick:

- Set the same environment variables from `.env` in the host's dashboard
- Make sure `PUBLIC_BASE_URL` matches the real deployed URL (needed for the
  Paynow webhook)
- Put the app behind HTTPS — you're collecting ID documents and payment
  details, so this isn't optional
- Persist `data/` and `uploads/` across deploys (most platforms need a
  volume/disk for this — an ephemeral filesystem will lose orders and KYC
  files on every redeploy)

## Security notes

- `/admin` and all `/api/admin/*` routes are protected by HTTP Basic Auth.
  Set a strong `ADMIN_PASS` and only run this over HTTPS, or credentials
  travel in the clear.
- KYC documents are only ever served through the authenticated admin route
  (`/api/admin/orders/:id/kyc-document`) — they're never linked from the
  public site.
- The server never trusts a price/total sent from the browser; it always
  recalculates from `products.json`.
