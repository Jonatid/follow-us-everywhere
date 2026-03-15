const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.UPLOAD_MAX_FILE_SIZE_BYTES = '32';
process.env.R2_SIGNED_URL_BODY_LIMIT_BYTES = '128';
process.env.UPLOAD_RATE_LIMIT_WINDOW_SECONDS = '600';
process.env.UPLOAD_RATE_LIMIT_MAX = '1';
process.env.DOWNLOAD_RATE_LIMIT_MAX = '2';

const pool = require('../config/db');

const ipCounters = new Map();
const subjectCounters = new Map();
const tokenVersions = {
  businesses: new Map(),
  admins: new Map(),
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

  if (queryText.includes('SELECT id, token_version FROM admins WHERE id = $1')) {
    const id = Number(params[0]);
    if (!tokenVersions.admins.has(id)) {
      return { rows: [] };
    }
    return { rows: [{ id, token_version: tokenVersions.admins.get(id) }] };
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

pool.connect = async () => {
  throw new Error('pool.connect not expected for this test suite');
};

const r2Stub = {
  uploadBuffer: async ({ key }) => ({ key }),
  getSignedUploadUrl: async ({ key }) => `https://signed-upload.example/${encodeURIComponent(key)}`,
  getSignedDownloadUrl: async ({ key }) => `https://signed-download.example/${encodeURIComponent(key)}`,
};

const r2ModulePath = require.resolve('../services/r2');
require.cache[r2ModulePath] = {
  id: r2ModulePath,
  filename: r2ModulePath,
  loaded: true,
  exports: r2Stub,
};

const uploadRoutes = require('../routes/uploadRoutes');
const r2Routes = require('../routes/r2Routes');

const createApp = () => {
  const app = express();
  app.use('/api/r2', r2Routes);
  app.use('/', uploadRoutes);
  return app;
};

const startServer = () =>
  new Promise((resolve) => {
    const server = createApp().listen(0, () => resolve(server));
  });

const request = async ({ server, method, path, token, jsonBody, formData, ip }) => {
  const port = server.address().port;
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (jsonBody) headers['Content-Type'] = 'application/json';
  if (ip) headers['X-Forwarded-For'] = ip;

  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers,
    body: jsonBody ? JSON.stringify(jsonBody) : formData,
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  return { status: response.status, body };
};

const makeBusinessToken = (businessId) => jwt.sign({ businessId, tokenVersion: 0 }, process.env.JWT_SECRET);
const makeAdminToken = (adminId) => jwt.sign({ adminId, tokenVersion: 0 }, process.env.JWT_SECRET);

test.beforeEach(() => {
  ipCounters.clear();
  subjectCounters.clear();
  tokenVersions.businesses.clear();
  tokenVersions.admins.clear();
  tokenVersions.businesses.set(1, 0);
  tokenVersions.businesses.set(2, 0);
  tokenVersions.businesses.set(7, 0);
  tokenVersions.admins.set(99, 0);
});

test('unauthenticated requests to protected upload/download endpoints are rejected', async () => {
  const server = await startServer();
  try {
    const uploadForm = new FormData();
    uploadForm.append('file', new Blob(['ok']), 'ok.txt');

    const uploadRes = await request({ server, method: 'POST', path: '/upload', formData: uploadForm });
    assert.equal(uploadRes.status, 401);

    const signedUploadRes = await request({
      server,
      method: 'POST',
      path: '/api/r2/upload',
      jsonBody: { filename: 'a.txt' },
    });
    assert.equal(signedUploadRes.status, 401);

    const downloadRes = await request({ server, method: 'GET', path: '/api/r2/download/business/1/a.txt' });
    assert.equal(downloadRes.status, 401);
  } finally {
    server.close();
  }
});

test('authenticated business/admin requests can upload and access in-scope keys', async () => {
  const server = await startServer();
  try {
    const businessToken = makeBusinessToken(1);
    const signedUploadRes = await request({
      server,
      method: 'POST',
      path: '/api/r2/upload',
      token: businessToken,
      jsonBody: { filename: 'avatar.png', contentType: 'image/png' },
    });

    assert.equal(signedUploadRes.status, 200);
    assert.match(signedUploadRes.body.key, /^business\/1\//);

    const inScopeDownload = await request({
      server,
      method: 'GET',
      path: `/api/r2/download/${signedUploadRes.body.key}`,
      token: businessToken,
    });
    assert.equal(inScopeDownload.status, 200);

    const adminToken = makeAdminToken(99);
    const adminForm = new FormData();
    adminForm.append('file', new Blob(['logo']), 'logo.png');

    const adminUpload = await request({
      server,
      method: 'POST',
      path: '/upload',
      token: adminToken,
      formData: adminForm,
      ip: '198.51.100.10',
    });
    assert.equal(adminUpload.status, 201);
    assert.match(adminUpload.body.key, /^admin\/99\//);
  } finally {
    server.close();
  }
});

test('cross-tenant signed download access is denied', async () => {
  const server = await startServer();
  try {
    const token = makeBusinessToken(1);
    const result = await request({
      server,
      method: 'GET',
      path: '/api/r2/download/business/2/secret.pdf',
      token,
    });

    assert.equal(result.status, 403);
    assert.equal(result.body.code, 'SCOPE_DENIED');
  } finally {
    server.close();
  }
});

test('oversized multipart uploads are rejected with 413', async () => {
  const server = await startServer();
  try {
    const token = makeBusinessToken(2);
    const form = new FormData();
    form.append('file', new Blob(['x'.repeat(128)]), 'big.txt');

    const result = await request({ server, method: 'POST', path: '/upload', token, formData: form });
    assert.equal(result.status, 413);
    assert.equal(result.body.code, 'FILE_TOO_LARGE');
  } finally {
    server.close();
  }
});

test('upload endpoint rate limiting blocks repeated requests', async () => {
  const server = await startServer();
  try {
    const token = makeBusinessToken(7);
    const first = await request({
      server,
      method: 'POST',
      path: '/api/r2/upload',
      token,
      jsonBody: { filename: 'doc.txt' },
    });
    assert.equal(first.status, 200);

    const second = await request({
      server,
      method: 'POST',
      path: '/api/r2/upload',
      token,
      jsonBody: { filename: 'doc-2.txt' },
    });
    assert.equal(second.status, 429);
    assert.equal(second.body.code, 'RATE_LIMITED');
  } finally {
    server.close();
  }
});
