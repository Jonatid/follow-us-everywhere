# How to wire up the QR redirect layer
# ──────────────────────────────────────────────────────────────────────────────
# You only need to make 3 changes to your existing server.js.
# Everything else is handled by the new files.

# ── STEP 1: Add to backend/server.js ──────────────────────────────────────────

# In the "Import routes" section (around line 10), add this line:
const qrRoutes = require('./routes/qr');

# In the "API Routes" section (around line 85), add this line:
app.use('/qr', qrRoutes);

# That's it for server.js. The full redirect URL will be:
# https://fuse101.com/qr/:slug  →  logs scan  →  redirects to landing page


# ── STEP 2: Add environment variable ──────────────────────────────────────────

# In your .env file, add:
LANDING_PAGE_URL=https://fuse101.com/business

# In Render dashboard → your backend service → Environment → add:
# Key:   LANDING_PAGE_URL
# Value: https://fuse101.com/business
# (Update this to wherever your Follow Us Everywhere landing page lives)


# ── STEP 3: Run the migration ──────────────────────────────────────────────────

# Option A — if your runMigrations script picks up .sql files automatically:
# Just drop 004_create_qr_scans.sql into backend/migrations/
# It will run on next Render deploy.

# Option B — run it manually via psql:
psql $DATABASE_URL -f backend/migrations/004_create_qr_scans.sql

# Option C — run it from your Render shell (Dashboard → Shell tab):
node -e "
  const db = require('./config/db');
  const fs = require('fs');
  const sql = fs.readFileSync('./migrations/004_create_qr_scans.sql', 'utf8');
  db.query(sql).then(() => { console.log('Migration complete'); process.exit(0); })
    .catch(e => { console.error(e); process.exit(1); });
"


# ── FILE PLACEMENT SUMMARY ────────────────────────────────────────────────────
#
# backend/
# ├── routes/
# │   └── qr.js                        ← NEW (copy from qr.js)
# ├── services/
# │   └── qrAnalytics.js               ← NEW (copy from qrAnalytics.js)
# ├── migrations/
# │   └── 004_create_qr_scans.sql      ← NEW (copy from 004_create_qr_scans.sql)
# └── server.js                        ← EDIT (2 lines added)
#
# ── TEST IT ───────────────────────────────────────────────────────────────────
#
# After deploying, test the redirect in your browser:
# https://fuse101.com/qr/detroit-coffee-co
#
# Should redirect to:
# https://fuse101.com/business/detroit-coffee-co
#
# Then check it logged:
# GET https://fuse101.com/qr/analytics/detroit-coffee-co
# Should return: { ok: true, slug: "detroit-coffee-co", stats: { total: 1, ... } }
