const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JSON_BODY_LIMIT = '1kb';
process.env.URLENCODED_BODY_LIMIT = '1kb';
process.env.UPLOAD_MAX_FILE_SIZE_BYTES = '32';
process.env.UPLOAD_RATE_LIMIT_WINDOW_SECONDS = '600';
process.env.UPLOAD_RATE_LIMIT_MAX = '100';

const pool = require('../config/db');
const ipCounters = new Map();
const subjectCounters = new Map();

const tokenVersions = {
  businesses: new Map(),
};

const bumpCounter = (map, key) => {
  const next = (map.get(key) || 0) + 1;
  map.set(key, next);
  return next;
};

pool.query = async (queryText, params = []) => {
  if (queryText.includes('SELECT id, token_version FROM businesses WHERE id = $1')) {
    const id = Number(params[0]);
    if (!tokenVersions.businesses.has(id)) {
      return { rows: [] };
    }
    return { rows: [{ id, token_version: tokenVersions.businesses.get(id) }] };
  }

  if (queryText.includes('ON CONFLICT (route_scope, ip)')) {
    const key = `${params[0]}:${params[1]}`;
    return { rows: [{ fail_count: bumpCounter(ipCounters, key) }] };
  }

  if (queryText.includes('ON CONFLICT (route_scope, email_normalized)')) {
    const key = `${params[0]}:${params[1]}`;
    return { rows: [{ fail_count: bumpCounter(subjectCounters, key) }] };
  }

  throw new Error(`Unhandled query in test stub: ${queryText}`);
};

const r2ModulePath = require.resolve('../services/r2');
require.cache[r2ModulePath] = {
  id: r2ModulePath,
  filename: r2ModulePath,
  loaded: true,
  exports: {
    uploadBuffer: async ({ key }) => ({ key }),
  },
};

const {
  securityHeadersMiddleware,
  jsonBodyParser,
  urlencodedBodyParser,
  requestSizeLimitErrorHandler,
} = require('../config/security');
const uploadRoutes = require('../routes/uploadRoutes');

const createApp = () => {
  const app = express();
  app.use(securityHeadersMiddleware);
  app.use(jsonBodyParser);
  app.use(urlencodedBodyParser);
  app.use(requestSizeLimitErrorHandler);

  app.get('/health', (req, res) => res.json({ ok: true }));
  app.post('/echo', (req, res) => res.status(200).json({ received: true, size: JSON.stringify(req.body || {}).length }));
  app.use('/', uploadRoutes);

  return app;
};

const startServer = () =>
  new Promise((resolve) => {
    const server = createApp().listen(0, () => resolve(server));
  });

const request = async ({ server, method, path, token, jsonBody, formData }) => {
  const port = server.address().port;
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (jsonBody) headers['Content-Type'] = 'application/json';

  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers,
    body: jsonBody ? JSON.stringify(jsonBody) : formData,
  });

  const body = await response.json().catch(() => null);
  return { status: response.status, body, headers: response.headers };
};

const makeBusinessToken = (businessId) => jwt.sign({ businessId, tokenVersion: 0 }, process.env.JWT_SECRET);

test.beforeEach(() => {
  ipCounters.clear();
  subjectCounters.clear();
  tokenVersions.businesses.clear();
  tokenVersions.businesses.set(3, 0);
  tokenVersions.businesses.set(4, 0);
});

test('security headers are included on api responses', async () => {
  const server = await startServer();
  try {
    const response = await request({ server, method: 'GET', path: '/health' });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.equal(response.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.match(response.headers.get('strict-transport-security') || '', /max-age=31536000/);
    assert.match(response.headers.get('content-security-policy') || '', /default-src 'self'/);
  } finally {
    server.close();
  }
});

test('oversized json bodies are rejected with structured request-too-large error', async () => {
  const server = await startServer();
  try {
    const response = await request({
      server,
      method: 'POST',
      path: '/echo',
      jsonBody: { value: 'x'.repeat(2048) },
    });

    assert.equal(response.status, 413);
    assert.equal(response.body.code, 'REQUEST_TOO_LARGE');
    assert.equal(response.body.message, 'Request is too large.');
  } finally {
    server.close();
  }
});

test('normal json body and normal multipart upload are accepted', async () => {
  const server = await startServer();
  try {
    const smallJson = await request({
      server,
      method: 'POST',
      path: '/echo',
      jsonBody: { value: 'ok' },
    });
    assert.equal(smallJson.status, 200);
    assert.equal(smallJson.body.received, true);

    const token = makeBusinessToken(3);
    const form = new FormData();
    form.append('file', new Blob(['small payload']), 'small.txt');

    const upload = await request({ server, method: 'POST', path: '/upload', token, formData: form });
    assert.equal(upload.status, 201);
    assert.equal(upload.body.message, 'File uploaded successfully');
  } finally {
    server.close();
  }
});

test('oversized multipart uploads are rejected with structured file-too-large error', async () => {
  const server = await startServer();
  try {
    const token = makeBusinessToken(4);
    const form = new FormData();
    form.append('file', new Blob(['x'.repeat(128)]), 'oversized.txt');

    const upload = await request({ server, method: 'POST', path: '/upload', token, formData: form });
    assert.equal(upload.status, 413);
    assert.equal(upload.body.code, 'FILE_TOO_LARGE');
    assert.equal(upload.body.message, 'File exceeds the maximum allowed size.');
  } finally {
    server.close();
  }
});
