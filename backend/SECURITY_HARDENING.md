# Backend security headers and request size limits

This backend now applies explicit security headers and payload limits as part of middleware hardening.

## Security headers (Helmet)

Helmet middleware is enabled globally in `backend/server.js` via `backend/config/security.js`.

Configured protections:

- `Content-Security-Policy`
  - Starter CSP policy compatible with current frontend/admin behavior:
    - `default-src 'self'`
    - `script-src 'self' 'unsafe-inline' https:`
    - `style-src 'self' 'unsafe-inline' https:`
    - `img-src 'self' data: blob: https:`
    - `connect-src 'self' https:`
    - `font-src 'self' https: data:`
    - `object-src 'none'`
    - `frame-ancestors 'self'`
    - `base-uri 'self'`
    - `form-action 'self'`
- `Strict-Transport-Security`
  - `max-age=31536000; includeSubDomains`
- `X-Frame-Options`
  - `SAMEORIGIN`
- `X-Content-Type-Options`
  - `nosniff`
- `Referrer-Policy`
  - `strict-origin-when-cross-origin`

### CSP note

A safe starter CSP is intentionally used to avoid breaking existing frontend/admin functionality while still adding baseline protection. You can tighten this in later passes once all script/style/image/connect sources are fully enumerated.

## Request body size limits

Global Express body parser limits are now explicit:

- JSON body limit: `1mb` (env override: `JSON_BODY_LIMIT`)
- URL-encoded body limit: `1mb` (env override: `URLENCODED_BODY_LIMIT`)

When a payload exceeds either limit, backend returns:

```json
{
  "message": "Request is too large.",
  "code": "REQUEST_TOO_LARGE"
}
```

## Multipart/file upload limits

All known multer upload paths have explicit file-size limits:

- `POST /upload` (`backend/routes/uploadRoutes.js`)
  - memory storage
  - `UPLOAD_MAX_FILE_SIZE_BYTES` (default `5MB`)
- `POST /api/businesses/documents` and `/api/businesses/documents/upload` (`backend/routes/businesses.js`)
  - disk storage
  - max file size `10MB`
- `POST /api/businesses/logo/upload` (`backend/routes/businesses.js`)
  - memory storage when R2 is configured; disk storage otherwise
  - max file size `10MB`

Oversized file responses are structured as:

```json
{
  "message": "File exceeds the maximum allowed size.",
  "code": "FILE_TOO_LARGE"
}
```

## Test coverage added

- Security headers present on a normal API response
- Oversized JSON payload rejected with `REQUEST_TOO_LARGE`
- Normal sized JSON and multipart requests accepted
- Oversized multipart upload rejected with `FILE_TOO_LARGE`
