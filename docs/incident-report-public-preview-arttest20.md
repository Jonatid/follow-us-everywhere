# Incident Report: `fuse101.com/b/arttest20` returns "Business not found"

## Scope
Investigate why the public preview flow shows "Business not found" for an existing business after the custom-domain update (referenced as task 4), without applying a code fix yet.

## What was verified from code

1. **Preview behavior changed in the domain update task**
   - The dashboard "Preview Public Follow Page" button was changed to open an external URL (`window.open(publicUrl, '_blank', ...)`) based on `buildPublicBusinessUrl`, instead of in-app navigation.
   - This change was introduced in commit `2c66062` ("Fix dashboard public link to use configured production domain").

2. **Public follow page currently fetches via `by-slug` endpoint**
   - `PublicFollowPage` calls:
     - `GET /public/businesses/by-slug/:key`
   - Any request failure (404, route mismatch, server error, network error) is collapsed into the same UI message:
     - `setError('Business not found')`

3. **Backend route support in this repository**
   - Current backend supports both:
     - `GET /api/public/businesses/by-slug/:key`
     - `GET /api/public/businesses/slug/:key`
   - Both map to the same lookup handler.

4. **Lookup logic in this repository should match `arttest20` if data is present**
   - Lookup checks `LOWER(slug) = LOWER($1)` and, when available, username as fallback.
   - Therefore, if the business row exists in the same database and is not restricted/expired-disabled, lookup should resolve.

## Isolated issue candidates (ranked)

### 1) Deployment version skew between frontend and backend (**highest probability**)
**Pattern:** frontend deployed with newer path (`/by-slug/...`) while backend is still on an older build missing that route.

- Result: frontend receives 404 from backend route mismatch.
- UI then displays generic "Business not found" even though business exists.
- This aligns with the timeline: issue appeared around domain/deployment changes.

### 2) Environment/data skew (preview domain hitting a different backend/database)
**Pattern:** the app shown in admin context and the public page are not querying the exact same backing dataset.

- Because preview now opens an explicit public domain, it can surface cross-environment mismatches that in-app preview previously hid.
- Symptom fit: admin list shows business exists, public lookup says not found.

### 3) Error masking in frontend obscures true failure mode
Even if the root cause is route 404, 500, or CORS/network issues, the UI always shows "Business not found".

- This does not create the outage by itself, but it prevents fast diagnosis and can mislead operators.

## Why this is likely related to the domain change task
Task 4 changed preview from internal route transition to opening a fully qualified URL. That materially changes which deployed frontend/backend pair is exercised by preview and can expose environment or deployment skew.

## Evidence to collect in production (no code changes)

1. From browser devtools on `https://fuse101.com/b/arttest20`, inspect failing request:
   - Exact URL requested (expect `/api/public/businesses/by-slug/arttest20`)
   - HTTP status
   - Response body (`{"error":"Route not found"}` vs `{"error":"Business not found"}`)
2. On backend logs, check whether request hits `handlePublicBusinessLookup` and logs `[public-business-lookup] not found`.
3. Confirm deployed backend commit includes route registration for `/businesses/by-slug/:key`.
4. Confirm frontend `VITE_API_BASE_URL` points to the intended API for both admin and public routes.

## Proposed remediation plan (for next coding step)
1. Verify and align deployed frontend/backend versions.
2. If version skew confirmed, redeploy backend with `/by-slug` route support (or temporarily switch frontend back to `/slug` compatibility path).
3. Improve frontend error reporting in `PublicFollowPage` to distinguish:
   - route/config issue,
   - network/CORS issue,
   - true business 404.

## Conclusion
The failure is most likely **not** that the business record is missing, but that the preview now traverses a deployment path where the public lookup request fails (most likely route/version skew), and the frontend masks that as "Business not found".
