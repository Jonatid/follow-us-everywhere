# Item 5 — Token Revocation / Logout Invalidation Verification

## Scope
Verification and cleanup covered:
- Business logout invalidation
- Customer logout invalidation
- Admin logout invalidation
- Admin 2FA login after logout/login cycle
- Protected-route behavior after logout
- Admin login UI stale-state cleanup

## Automated verification summary
Backend automated tests confirm:
- Business token is accepted before logout and rejected after logout.
- Customer token is accepted before logout and rejected after logout.
- Admin token is accepted before logout and rejected after logout.
- Admin 2FA login still works after a logout, and newly-issued JWTs reflect the incremented `tokenVersion`.

See:
- `backend/tests/logout-invalidation.test.js`
- `backend/tests/admin-2fa-auth.test.js`

## Frontend logout UX cleanup
Admin login page now clears stale state when returning to `/admin/login` after logout:
- email field
- password field
- TOTP input
- backup-code input
- challenge message
- enrollment/challenge mode state
- backup-code confirmation state

No auth-flow redesign was introduced.

## Browser Back behavior after logout
Observed behavior is acceptable:
- browser history may briefly attempt a previous page
- protected routes are still guarded and re-route to login when token is absent/invalid
- protected data access is not restored after logout

No additional history-manipulation workaround was added.

## Final Item 5 status
Item 5 can be considered **complete** for the current architecture:
- `token_version` foundation is implemented
- logout invalidates JWTs immediately via version bump
- model invalidates all sessions for the identity (not per-device)
- legacy tokens without `tokenVersion` are rejected and require re-login
- browser Back does not restore authenticated access

## Not in scope / intentionally not implemented
- refresh tokens
- token denylist
- per-device session tracking or revocation
