# Codex Task: Implement QR Redirect Layer for Follow Us Everywhere (FUSE101)

## Overview
I need you to implement a QR code scan tracking and redirect system into my existing Node.js/Express backend. This is part of the "Follow Us Everywhere" feature on FUSE101.com. The backend is hosted on Render and uses PostgreSQL.

---

## Repository Structure
The backend lives in the `/backend` folder with the following structure:
- `backend/server.js` — main Express entry point
- `backend/routes/` — all route files
- `backend/services/` — all service/business logic files
- `backend/migrations/` — all SQL migration files
- `backend/config/db.js` — PostgreSQL database connection (already configured)

---

## Task 1: Create `/backend/migrations/004_create_qr_scans.sql`

Create this file with the following SQL:

```sql
CREATE TABLE IF NOT EXISTS qr_scans (
  id            SERIAL PRIMARY KEY,
  business_slug VARCHAR(255)  NOT NULL,
  ip_address    VARCHAR(100),
  user_agent    TEXT,
  device_type   VARCHAR(20)   DEFAULT 'unknown',
  scanned_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qr_scans_business_slug
  ON qr_scans (business_slug);

CREATE INDEX IF NOT EXISTS idx_qr_scans_scanned_at
  ON qr_scans (scanned_at);

CREATE INDEX IF NOT EXISTS idx_qr_scans_slug_time
  ON qr_scans (business_slug, scanned_at DESC);
```

---

## Task 2: Create `/backend/services/qrAnalytics.js`

Create this file with two exported functions:

### `logScan({ businessSlug, ipAddress, userAgent })`
- Inserts a row into `qr_scans`
- Detects device type from userAgent: check for mobile keywords → `'mobile'`, tablet keywords → `'tablet'`, otherwise `'desktop'`
- Must use `db.query()` from `../config/db`
- Wrap in try/catch — analytics must NEVER crash the redirect

### `getScanStats(businessSlug)`
- Returns an object with:
  - `total` — total scan count all time
  - `weekly` — scan count in last 7 days
  - `byDevice` — array of `{ device_type, count }` grouped by device
  - `byDay` — array of `{ day, count }` for last 30 days, ordered by day ASC
- Must use `db.query()` from `../config/db`
- Use `Promise.all()` to run all 4 queries in parallel

---

## Task 3: Create `/backend/routes/qr.js`

Create this Express router file with two routes:

### `GET /:slug`
- Calls `logScan()` from `../services/qrAnalytics` (fire and forget — do not await)
- Gets IP from `x-forwarded-for` header (first value) or `req.socket.remoteAddress`
- Gets userAgent from `req.headers['user-agent']`
- Redirects 302 to `${process.env.LANDING_PAGE_URL}/${slug}`
- `LANDING_PAGE_URL` defaults to `'https://fuse101.com/business'` if env var not set

### `GET /analytics/:slug`
- Calls `getScanStats(slug)` from `../services/qrAnalytics`
- Returns `{ ok: true, slug, stats }`
- Returns 500 with error message if it fails

---

## Task 4: Edit `/backend/server.js`

Make exactly 2 additions to the existing file. Do NOT change anything else.

### Addition 1 — In the "Import routes" section (after the last existing route import):
```js
const qrRoutes = require('./routes/qr');
```

### Addition 2 — In the "API Routes" section (after the last existing `app.use()` route line):
```js
app.use('/qr', qrRoutes);
```

---

## Task 5: Add environment variable

Add the following to `/backend/.env.example` (do not edit `.env` directly):
```
LANDING_PAGE_URL=https://fuse101.com/business
```

---

## Important Constraints
- Do NOT modify any existing files except `server.js` (2 lines only) and `.env.example`
- Do NOT install any new npm packages — use only what is already in `package.json`
- Do NOT change any existing routes, middleware, or database config
- Follow the exact same coding style as the existing route files (CommonJS require/module.exports, async/await, try/catch)
- The migration file naming must follow the existing pattern in `/backend/migrations/`

---

## Verification
After making changes, confirm:
1. `backend/routes/qr.js` exists
2. `backend/services/qrAnalytics.js` exists
3. `backend/migrations/004_create_qr_scans.sql` exists
4. `backend/server.js` contains `qrRoutes` import and `app.use('/qr', qrRoutes)`
5. `backend/.env.example` contains `LANDING_PAGE_URL`
