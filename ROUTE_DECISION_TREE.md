# Route Decision Tree

## Entrypoint split (index.js)
- If `window.location.pathname` starts with `/admin`, render `AdminApp`.
- Otherwise render `App`.

## `App.js` pathname resolution order (first load)
1. `/` → `marketing-landing` (public marketing home)
2. `/about` → `about`
3. `/faq` → `faq`
4. `/vendor` → `landing` (vendor landing/login/signup entry)
5. `/reset-password` (+ `token` query) → `reset`
6. `/customer` → `replaceState('/customer/login')` then `customer-login`
7. `/customer/login` → `customer-login`
8. `/customer/signup` → `customer-signup`
9. `/customer/forgot-password` → `customer-forgot`
10. `/discover` → `discover`
11. `/favorites` → `favorites`
12. `/customer/profile` → `customer-profile`
13. `/business/:slug` → `public` (public business page)

## Token/state guards
- Admin routes: guarded inside `AdminApp` by `adminToken` behavior (unchanged).
- Vendor bootstrap (`token` + `/auth/me`) only runs on vendor-intended paths (`/vendor` or `/vendor/*`) and never on customer/public paths.
- Customer auth checks:
  - `discover`, `favorites`, `customer-profile` render customer pages only when `customer_token` exists; otherwise they render `CustomerLogin`.
- Vendor dashboard (`dashboard`) renders only when current screen is explicitly set to dashboard by vendor login/bootstrap.
