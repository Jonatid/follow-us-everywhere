# System Functionality & Purpose Manual

## 1) Executive Summary (Plain English)

### What the product is
**Follow Us Everywhere** is a full-stack web platform where businesses create a single public profile page that consolidates their social links and community-support signals (including optional verified badges). The same codebase also supports customer discovery/favorites and an admin review console.

### Who it’s for
- **Business owners/teams** who want one shareable hub (`/business/:slug`) for social channels and community credentials.
- **Customers/public visitors** who want to discover businesses, view profile details, and follow social links.
- **Platform administrators** who review businesses, moderate verification status, review documents/badge requests, and manage badge/admin records.

### Core purpose and value proposition
The core value is **structured trust + discoverability**:
- Businesses get one link and centralized profile management.
- Visitors/customers get searchable listings and clearer context (tagline, community support, badges).
- Admins get moderation and verification workflows to keep quality/control over what’s public.

---

## 2) System Map (High Level)

### Architecture diagram in words
- **Frontend (React SPA)**
  - Main app (`frontend/src/App.js`) is a single-page app with a custom pathname-to-screen router.
  - Admin UI is a separate SPA branch mounted when path starts with `/admin`.
- **Backend (Node.js + Express)**
  - Single Express server (`backend/server.js`) exposing REST APIs under `/api/*`.
  - JWT-based auth for business, customer, and admin tokens.
- **Database (PostgreSQL)**
  - Accessed with `pg` pool.
  - Schema created/updated by startup migration runner + ensure-schema bootstrap.
- **Auth model**
  - JWT with shared `JWT_SECRET`; payload includes one of `businessId`, `customerId`, `adminId`.
- **Hosting assumptions**
  - Frontend assumes Render-hosted API fallback URL.
  - Backend CORS allowlist includes localhost and Render/custom frontend domains.
  - DB supports `DATABASE_URL` cloud style or local PG env vars.

### Key technologies and where used
- **Frontend:** React, axios, CRA scripts. Custom route handling via `window.history` and pathname matching (not React Router).
- **Backend:** Express, pg, jsonwebtoken, bcryptjs, express-validator, multer, cors, dotenv.
- **Data:** PostgreSQL SQL migrations + runtime schema enforcement.
- **Email:** Resend API (via fetch) for business/customer reset and support/nudge emails.

---

## 3) User Roles & Permissions

### Public (unauthenticated)
**Can do:**
- Browse discoverable businesses (`GET /api/public/businesses`).
- View business profile by slug (`GET /api/businesses/:slug`).
- View public social links (`GET /api/socials/:slug`, `GET /api/socials/business/:businessId`).
- View public badges list and business impact endpoints under badge routes.
- Business/customer/admin login/signup routes.

**Cannot do:**
- Any protected mutation or account-specific reads.

### Business user (JWT with `businessId`)
**Can do:**
- Authenticated business profile retrieval (`GET /api/auth/me`).
- Update business profile and community support (`PUT /api/businesses/profile/update`, `PUT /api/businesses/community-support`).
- Create/update/delete social links.
- Upload and list verification documents.
- Submit/list own badge requests.

**Cannot do:**
- Admin management endpoints.
- Customer profile/favorites endpoints.

### Customer user (JWT with `customerId`)
**Can do:**
- Customer auth/profile operations.
- Manage favorites (add/list/remove businesses).

**Cannot do:**
- Business account mutations.
- Admin operations.

### Admin user (JWT with `adminId`)
**Can do:**
- Admin dashboard and business moderation.
- Approve/block business records.
- Manage admins.
- Manage badges and assign/remove business badges.
- Review business verification documents.
- Review badge requests.

**Cannot do:**
- Business/customer self-service endpoints unless those endpoints are also public and do not require role token.

### Guards/middleware enforcement
- `authenticateToken` (business): used across business social/profile/badge-request/document endpoints.
- `authenticateCustomerToken`: used on customer profile/favorites and `/customers/auth/me`.
- `authenticateAdminToken`: applied globally in `admin.js` and on admin-only routes in `badges.js`.

---

## 4) Main User Journeys (Step-by-step)

## A) Public journey: search/find business → view profile → click socials
1. User opens `/discover` in frontend.
2. Frontend requests `GET /api/public/businesses` with optional query filters.
3. User selects business card; frontend navigates to `/business/:slug`.
4. Frontend loads `GET /api/businesses/:slug` for profile + socials + badges.
5. User clicks social URL rendered from returned social links.

**Frontend surfaces:** `DiscoverPage`, `PublicFollowPage` in `frontend/src/App.js`.
**Backend routes:** `public.js`, `businesses.js`, `socials.js`, `badges.js` (impact endpoint).

## B) Business journey: sign up → login → create/update profile → manage links → publish
1. Business uses `/business` flow (`signup` screen) and submits form.
2. Frontend calls `POST /api/auth/signup`; backend creates business + default social rows.
3. Business logs in via `POST /api/auth/login`; JWT stored as `token` in localStorage.
4. Dashboard/profile screens call `GET /api/auth/me`.
5. Business updates profile/community support (`PUT /api/businesses/profile/update`, `PUT /api/businesses/community-support`).
6. Business manages social links (`POST/PUT/DELETE /api/socials...`).
7. Public page availability depends on verification status logic and admin actions.

**Frontend surfaces:** `BusinessSignup`, `BusinessLogin`, `BusinessDashboard`, `BusinessProfilePage`.
**Backend routes:** `auth.js`, `businesses.js`, `socials.js`, plus badge/document endpoints if used.

## C) Admin journey: login → review/approve/suspend → manage badges/verification → view data
1. Admin opens `/admin/login` and authenticates via `POST /api/admin/auth/login`.
2. Admin token saved as `adminToken` and attached by `frontend/src/utils/adminApi.js`.
3. Dashboard pulls `GET /api/admin/dashboard/summary`.
4. Review queue uses `GET /api/admin/reviews/businesses` then `PATCH /api/admin/reviews/businesses/:id`.
5. Business list/detail uses `GET /api/admin/businesses`, `GET /api/admin/businesses/:id`, approve/block actions.
6. Badge catalog managed via `/api/admin/badges` CRUD.
7. Badge assignments managed via `/api/admin/businesses/:id/badges` add/remove/list.
8. Document review via `/api/admin/documents` and `PATCH /api/admin/documents/:id`.
9. Badge requests review via `/api/admin/badge-requests` and `/api/admin/badge-requests/:id/review`.

**Frontend surfaces:** `AdminApp`, `AdminDashboard`, `ReviewList`, `BusinessList`, `BusinessDetail`, `BadgeManagement`, `AdminManagement`.

---

## 5) Feature Inventory (All Functionality)

### 5.1 Business authentication & account lifecycle
- **What it does:** business signup/login/me, business forgot/reset password.
- **Frontend:** business auth forms in `frontend/src/App.js`.
- **Backend:** `backend/routes/auth.js`.
- **DB:** `businesses`, `password_reset_tokens`, `social_links` (default rows on signup).
- **Endpoints:**
  - `POST /api/auth/signup`
  - `POST /api/auth/login`
  - `POST /api/auth/forgot-password`
  - `POST /api/auth/reset-password`
  - `GET /api/auth/me` (auth required)

### 5.2 Customer authentication & profile
- **What it does:** customer signup/login/me + forgot/reset password + profile updates.
- **Frontend:** customer flows in `frontend/src/App.js` (`/customer/*`, `/customer/profile`).
- **Backend:** `backend/routes/customers-auth.js`, `backend/routes/customers.js`.
- **DB:** `customers`, `customer_password_resets`.
- **Endpoints:**
  - `POST /api/customers/auth/signup`
  - `POST /api/customers/auth/login`
  - `POST /api/customers/auth/forgot-password`
  - `POST /api/customers/auth/reset-password`
  - `GET /api/customers/auth/me`
  - `GET /api/customers/profile`
  - `PUT /api/customers/profile`

### 5.3 Business profile management
- **What it does:** update business name/tagline/logo, update community support summary/links.
- **Frontend:** business profile/dashboard sections in `frontend/src/App.js`.
- **Backend:** `backend/routes/businesses.js`.
- **DB:** `businesses` (including policy + community fields).
- **Endpoints:**
  - `PUT /api/businesses/profile/update`
  - `PUT /api/businesses/community-support`

### 5.4 Social links management
- **What it does:** create/update/delete and fetch socials by business ID or slug.
- **Frontend:** business dashboard + public profile in `frontend/src/App.js`.
- **Backend:** `backend/routes/socials.js`.
- **DB:** `social_links`, `businesses` (policy flagging side effects).
- **Endpoints:**
  - `GET /api/socials/business/:businessId`
  - `GET /api/socials/:slug`
  - `POST /api/socials`
  - `PUT /api/socials/:id`
  - `DELETE /api/socials/:id`

### 5.5 Public business discovery/search
- **What it does:** paginated listing with query filters (`query`, `badge`, `communitySupport`).
- **Frontend:** `/discover` in `DiscoverPage`.
- **Backend:** `backend/routes/public.js`.
- **DB:** `businesses` (+ `business_badges`/`badges` when available).
- **Endpoints:**
  - `GET /api/public/businesses`

### 5.6 Business public profile view
- **What it does:** returns business base profile, socials, community support, badges with status restrictions.
- **Frontend:** `/business/:slug` page.
- **Backend:** `backend/routes/businesses.js`.
- **DB:** `businesses`, `social_links`, `business_badges`, `badges`.
- **Endpoint:**
  - `GET /api/businesses/:slug`

### 5.7 Customer favorites
- **What it does:** save/remove/list favorite businesses.
- **Frontend:** customer discover/favorites screens.
- **Backend:** `backend/routes/customers.js`.
- **DB:** `customer_favorites` + `businesses` join.
- **Endpoints:**
  - `GET /api/customers/favorites`
  - `POST /api/customers/favorites/:businessId`
  - `DELETE /api/customers/favorites/:businessId`

### 5.8 Badge catalog, requests, and impact
- **What it does:**
  - Public badge catalog.
  - Business badge requests.
  - Admin review flow that can grant `business_badges`.
  - Public business impact summary endpoint.
- **Frontend:** business/admin flows in `frontend/src/App.js` + admin pages.
- **Backend:** `backend/routes/badges.js` and admin badge operations in `backend/routes/admin.js`.
- **DB:** `badges`, `badge_requests`, `business_badges`, `business_documents` (optional linked docs).
- **Endpoints:**
  - `GET /api/badges`
  - `POST /api/business/badges/request`
  - `GET /api/business/badge-requests`
  - `GET /api/admin/badge-requests`
  - `PATCH /api/admin/badge-requests/:id/review`
  - `POST /api/admin/badges`
  - `GET /api/public/businesses/:id/impact`
  - plus admin badge CRUD and assignment endpoints in `admin.js`

### 5.9 Business document upload + admin review
- **What it does:** business uploads verification docs; admins review status.
- **Frontend:** business document actions in main app; admin document review pages.
- **Backend:** `backend/routes/businesses.js`, `backend/routes/admin.js`.
- **DB:** `business_documents`.
- **Storage:** local disk under `backend/uploads/business_documents/*`; static served at `/api/uploads`.
- **Endpoints:**
  - `POST /api/businesses/documents`
  - `GET /api/businesses/documents`
  - `GET /api/admin/documents`
  - `PATCH /api/admin/documents/:id`

### 5.10 Admin operations & moderation
- **What it does:** admin login, dashboard summary, business list/detail, review queue status updates, approve/block, admin CRUD, badge CRUD, business badge assignments.
- **Frontend:** `frontend/src/pages/admin/*`, `frontend/src/utils/adminApi.js`.
- **Backend:** `backend/routes/admin-auth.js`, `backend/routes/admin.js`.
- **DB:** `admins`, `businesses`, `badges`, `business_badges`, `business_documents`.

### 5.11 Support contact (present but disconnected)
- **What it does:** send support email via `POST /contact` in `support.js` router.
- **Issue:** backend server never mounts `supportRoutes`, but frontend calls `/api/support/contact`; flow is currently unreachable unless route mounting is added.

---

## 6) Data Model Overview

## Tables and purpose
- `businesses`: business account identity, auth hash, public profile fields, moderation/policy state.
- `social_links`: business-owned social URLs and display settings.
- `admins`: admin credentials and metadata.
- `customers`: customer identity/profile.
- `customer_favorites`: customer↔business many-to-many favorites.
- `password_reset_tokens`: business reset tokens.
- `customer_password_resets`: customer reset token hashes.
- `badges`: badge catalog definitions.
- `business_badges`: granted badges per business.
- `badge_requests`: business-submitted badge review requests.
- `business_documents`: uploaded documents for verification/badge support.
- `schema_migrations`: migration execution bookkeeping.

## Relationships (FKs)
- `social_links.business_id -> businesses.id` (CASCADE delete)
- `customer_favorites.customer_id -> customers.id` (CASCADE)
- `customer_favorites.business_id -> businesses.id` (CASCADE)
- `password_reset_tokens.business_id -> businesses.id` (CASCADE)
- `customer_password_resets.customer_id -> customers.id` (CASCADE)
- `business_badges.business_id -> businesses.id` (CASCADE)
- `business_badges.badge_id -> badges.id` (CASCADE)
- `business_badges.awarded_by_admin_id / granted_by_admin_id -> admins.id` (SET NULL)
- `badge_requests.business_id -> businesses.id` (CASCADE)
- `badge_requests.badge_id -> badges.id` (CASCADE)
- `badge_requests.reviewed_by_admin_id -> admins.id` (SET NULL)
- `badge_requests.linked_document_id -> business_documents.id` (SET NULL)
- `business_documents.business_id -> businesses.id` (CASCADE)
- `business_documents.reviewed_by_admin_id -> admins.id` (SET NULL)

## Constraints and sensitive fields
- Unique constraints: business `email`, `slug`; admin `email`; customer `email`; several token/slug uniqueness rules.
- Status check constraints: `badge_requests.status`, `business_documents.status`.
- Sensitive fields include `password_hash`, reset tokens/hashes, JWT secret and email API keys.

---

## 7) API Reference (method + path)

## Health/system
- `GET /api/health` — DB connectivity/status.

## Business auth
- `POST /api/auth/signup` (public)
- `POST /api/auth/login` (public)
- `POST /api/auth/forgot-password` (public)
- `POST /api/auth/reset-password` (public)
- `GET /api/auth/me` (business JWT)

## Business profile/documents
- `POST /api/businesses/documents` (business JWT, multipart)
- `GET /api/businesses/documents` (business JWT)
- `GET /api/businesses/:slug` (public)
- `PUT /api/businesses/community-support` (business JWT)
- `PUT /api/businesses/profile/update` (business JWT)

## Social links
- `GET /api/socials/business/:businessId` (public)
- `GET /api/socials/:slug` (public)
- `POST /api/socials` (business JWT)
- `PUT /api/socials/:id` (business JWT)
- `DELETE /api/socials/:id` (business JWT)

## Public discovery
- `GET /api/public/businesses` (public)

## Customer auth/profile/favorites
- `POST /api/customers/auth/signup` (public)
- `POST /api/customers/auth/login` (public)
- `POST /api/customers/auth/forgot-password` (public)
- `POST /api/customers/auth/reset-password` (public)
- `GET /api/customers/auth/me` (customer JWT)
- `GET /api/customers/profile` (customer JWT)
- `PUT /api/customers/profile` (customer JWT)
- `GET /api/customers/favorites` (customer JWT)
- `POST /api/customers/favorites/:businessId` (customer JWT)
- `DELETE /api/customers/favorites/:businessId` (customer JWT)

## Badge system
- `GET /api/badges` (public)
- `POST /api/business/badges/request` (business JWT)
- `GET /api/business/badge-requests` (business JWT)
- `GET /api/admin/badge-requests` (admin JWT)
- `PATCH /api/admin/badge-requests/:id/review` (admin JWT)
- `POST /api/admin/badges` (admin JWT; in badges router)
- `GET /api/public/businesses/:id/impact` (public)

## Admin auth + management
- `POST /api/admin/auth/login` (public)
- `GET /api/admin/documents` (admin JWT)
- `PATCH /api/admin/documents/:id` (admin JWT)
- `GET /api/admin/dashboard/summary` (admin JWT)
- `GET /api/admin/reviews/businesses` (admin JWT)
- `PATCH /api/admin/reviews/businesses/:id` (admin JWT)
- `GET /api/admin/businesses` (admin JWT)
- `GET /api/admin/businesses/:id` (admin JWT)
- `PUT /api/admin/businesses/:id/approve` (admin JWT)
- `PUT /api/admin/businesses/:id/block` (admin JWT)
- `GET /api/admin/admins` (admin JWT)
- `POST /api/admin/admins` (admin JWT)
- `GET /api/admin/badges` (admin JWT)
- `POST /api/admin/badges` (admin JWT)
- `PUT /api/admin/badges/:id` (admin JWT)
- `DELETE /api/admin/badges/:id` (admin JWT)
- `GET /api/admin/businesses/:id/badges` (admin JWT)
- `POST /api/admin/businesses/:id/badges` (admin JWT)
- `DELETE /api/admin/businesses/:businessId/badges/:badgeId` (admin JWT)

## Unmounted in current server
- `POST /api/support/contact` is expected by frontend, but backend only defines `/contact` in `support.js` and does not mount that router.

---

## 8) Configuration & Environment

## Backend variables
- `PORT`: HTTP port.
- `JWT_SECRET` (**required at startup**).
- `FRONTEND_URL`: CORS allowlist + business reset link base URL.
- `DATABASE_URL` or `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD`.
- `DB_SSL`: SSL toggle.
- `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_FROM_EMAIL`: outbound email.
- `SUPPORT_EMAIL` / `RESEND_SUPPORT_EMAIL`: support recipient fallback chain.
- `CUSTOMER_FRONTEND_URL`: customer reset link base.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`: used by create-admin script.
- `NODE_ENV`: affects debug logs.

## Frontend variables
- `VITE_API_BASE_URL`: API base override for frontend main app and admin API helper.

## What breaks if missing
- Missing `JWT_SECRET`: backend exits immediately.
- Missing DB config: backend cannot query DB; health/auth fail.
- Missing `FRONTEND_URL`: business forgot-password can’t create reset link (error handled with generic response).
- Missing `RESEND_API_KEY`: emails are skipped (password resets/support/nudges not sent).

---

## 9) Deployment & Operations Notes

## Local startup
- Root: `npm run dev` (concurrently starts backend + frontend).
- Backend only: `npm run dev --prefix backend` or `npm start --prefix backend`.
- Frontend only: `npm run dev --prefix frontend`.

## DB initialization behavior
- On backend start, server runs SQL migrations (`runMigrations`) then `ensureSchema` for additional table/column/index safety checks.

## Hosting assumptions
- CORS allowlist includes Render frontend URL and custom domain (`fuse101.com`).
- Frontend default production API fallback targets Render API URL.

## Health checks, monitoring, logging
- `GET /api/health` reports DB connectivity and timestamp.
- Console logs used for startup info and error logging; no external monitoring SDK found.

## Backups and security considerations (inferred)
- No explicit backup automation in repo.
- Passwords hashed with bcrypt.
- JWT auth used for protected endpoints.
- File uploads stored on local disk (`backend/uploads`) suggest persistence considerations in ephemeral hosting.

---

## 10) Gaps / Risks / TODOs (Code-derived)

## Functional gaps / broken connections
1. **Support endpoint mismatch:** frontend posts to `/api/support/contact`, but backend never mounts `supportRoutes`; support form likely fails.
2. **Potential runtime bug in public socials endpoints:** `socials.js` calls `autoDisableBusiness(db, businessRow)` but utility signature expects one object with named fields; this likely throws/behaves incorrectly.
3. **Duplicate route responsibility for badges:** both `admin.js` and `badges.js` define admin badge creation path (`POST /api/admin/badges`), risking confusion/order-dependent behavior.
4. **Schema expectation mismatch:** `REQUIRED_TABLES` includes `email_verification_tokens`, but schema bootstrap does not create it.

## Security / auth risks
1. Shared JWT secret for all roles is common but requires strict payload checks (currently done by role-specific middleware).
2. In-memory forgot-password rate limiting for customers resets on process restart and may be bypassed in multi-instance deployments.
3. Document uploads are local-disk; ensure server/infra protections for uploaded files and static exposure paths.

## Performance / operational risks
1. Several list endpoints can grow unbounded without pagination (e.g., admin lists).
2. Heavy reliance on runtime `ensureSchema` at startup can mask migration discipline issues.
3. Local file storage for uploads is fragile on autoscaling/ephemeral hosts unless shared/persistent volume exists.

## Assumptions to verify
- **Assumption:** Render is the active deployment target for API/frontend because hardcoded defaults reference Render domains.
- **Assumption:** Customer/public UI route design intentionally allows `/business/:slug` public access from same SPA.
- **Assumption:** Duplicate admin badge create endpoint behavior is not relied on by clients; verify route order and expected payload shape.

## Next-best recommendations (no code changes applied)
1. Mount support router at `/api/support` and align frontend/backend path.
2. Fix `autoDisableBusiness` usage in socials public reads.
3. Consolidate badge-admin endpoints into one module or explicit namespace.
4. Add pagination to admin-heavy list endpoints.
5. Add centralized env validation and deployment runbook (required vars by environment).
6. Add observability (request IDs, structured logs, error tracking).
7. Clarify data retention/backups for uploads + DB.

---

## Repository structure snapshot (requested starting point)
- `backend/`: Express API, middleware, routes, DB config, SQL migrations, scripts.
- `frontend/`: React SPA (main app + admin sub-app by path split).
- `docs/`: documentation output (this manual).

## Frontend entry points
- `frontend/src/index.js` switches between `App` and `AdminApp` by pathname (`/admin*`).

## Backend entry points
- `backend/server.js` is server bootstrap and route mount root.
- `backend/scripts/runMigrations.js` migration runner.
- `backend/scripts/create-admin.js` provisioning helper.

## Route/guard enumeration summary
- Business auth guard: `backend/middleware/auth.js`.
- Customer auth guard: `backend/middleware/customer-auth.js`.
- Admin auth guard: `backend/middleware/admin-auth.js`.
- Route groups mounted in `backend/server.js` under `/api/...`.

## DB schema/migrations enumeration summary
- Canonical schema bootstrap in `backend/config/schema.js`.
- SQL migration files in `backend/migrations/*.sql` with `schema_migrations` tracking.
