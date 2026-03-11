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


# ── BETTERSTACK HEALTH MONITORING ────────────────────────────────────────────
#
# BetterStack monitor URLs:
# - Website monitor: https://fuse101.com
# - API health monitor: https://followuseverywhere-api.onrender.com/api/health
#
# Verification checklist:
# 1) Local check:
#    curl -i http://localhost:5000/api/health
#
# 2) Production check:
#    curl -i https://followuseverywhere-api.onrender.com/api/health
#
# 3) BetterStack "Alert us when":
#    - Prefer: URL returns HTTP status other than 2xx/3xx
#    - Fallback: URL becomes unavailable

## Secrets Hygiene Discipline (Prevention)

- Never commit real secrets to this repository.
- `.env.example` files must only contain placeholder values (for example `YOUR_API_KEY`).
- Real `.env` files must remain untracked locally.
- Production secrets must only be set in Render environment variables.
- If a real secret is ever committed, rotate it immediately in the source system and update Render.

### Lightweight commit safeguard

A repo-level pre-commit hook is included at `.githooks/pre-commit`.

1. Enable the hook path once per clone:
   ```bash
   git config core.hooksPath .githooks
   ```
2. (Optional) Install `gitleaks` locally for deeper scanning; the hook auto-runs it when available.

The hook blocks:
- committing real `.env` files
- obvious hardcoded secrets in staged changes
