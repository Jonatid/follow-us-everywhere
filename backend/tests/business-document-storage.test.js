const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const pool = require('../config/db');
const businessesRoutePath = require.resolve('../routes/businesses');
const r2ModulePath = require.resolve('../services/r2');

const tokenVersions = new Map([[7, 0]]);
let insertedDocument;
let r2Uploads;

const makeBusinessToken = (businessId) => jwt.sign({ businessId, tokenVersion: 0 }, process.env.JWT_SECRET);

const clearBusinessRoute = () => {
  delete require.cache[businessesRoutePath];
};

const installR2Mock = ({ configured, uploadFails = false } = {}) => {
  r2Uploads = [];
  require.cache[r2ModulePath] = {
    id: r2ModulePath,
    filename: r2ModulePath,
    loaded: true,
    exports: {
      isR2Configured: () => configured,
      uploadBuffer: async (payload) => {
        if (uploadFails) throw new Error('r2 unavailable');
        r2Uploads.push(payload);
        return { key: payload.key, bucket: 'test-bucket' };
      },
      getSignedDownloadUrl: async ({ key }) => `https://signed.example/${encodeURIComponent(key)}`,
    },
  };
};

pool.query = async (queryText, params = []) => {
  if (queryText.includes('SELECT id, token_version FROM businesses WHERE id = $1')) {
    const id = Number(params[0]);
    return tokenVersions.has(id) ? { rows: [{ id, token_version: tokenVersions.get(id) }] } : { rows: [] };
  }

  if (queryText.includes('FROM business_documents') && queryText.includes('LOWER(original_file_name)')) {
    return { rows: [] };
  }

  if (queryText.includes('INSERT INTO business_documents')) {
    insertedDocument = {
      id: 101,
      businessId: params[0],
      documentType: params[1],
      originalFileName: params[2],
      storedFileName: params[3],
      storageProvider: params[4],
      storagePath: params[5],
      documentNumber: params[6],
      mimeType: params[7],
      fileSize: params[8],
      status: 'Pending',
      notes: params[9],
    };
    return { rows: [insertedDocument] };
  }

  if (queryText.includes('UPDATE businesses') && queryText.includes('lara_number')) {
    return { rows: [], rowCount: 1 };
  }

  if (queryText.includes('SELECT id, business_id AS "businessId", original_file_name AS "originalFileName"')) {
    if (Number(params[0]) !== insertedDocument?.id || Number(params[1]) !== insertedDocument?.businessId) {
      return { rows: [] };
    }
    return { rows: [insertedDocument] };
  }

  throw new Error(`Unhandled query in business document storage test: ${queryText}`);
};

const createApp = ({ r2Configured, uploadFails = false }) => {
  installR2Mock({ configured: r2Configured, uploadFails });
  clearBusinessRoute();
  const app = express();
  app.use('/businesses', require('../routes/businesses'));
  return app;
};

const request = async ({ app, method, path, token, formData, redirect = 'follow' }) => {
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });

  try {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      method,
      headers,
      body: formData,
      redirect,
    });
    const body = await response.json().catch(() => null);
    return { status: response.status, body, headers: response.headers };
  } finally {
    server.close();
  }
};

const buildDocumentForm = (contents = 'document body') => {
  const form = new FormData();
  form.append('document_type', 'lara');
  form.append('document_number', 'LARA-123');
  form.append('notes', 'review me');
  form.append('document', new Blob([contents], { type: 'application/pdf' }), 'Certificate 123.pdf');
  return form;
};

test.beforeEach(() => {
  insertedDocument = null;
  r2Uploads = [];
});

test('business document upload stores local metadata when R2 is not configured', async () => {
  const app = createApp({ r2Configured: false });
  const response = await request({
    app,
    method: 'POST',
    path: '/businesses/documents',
    token: makeBusinessToken(7),
    formData: buildDocumentForm(),
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.storageProvider, 'local');
  assert.match(response.body.storagePath, /^uploads\/business_documents\/7\//);
  assert.equal(response.body.originalFileName, 'Certificate 123.pdf');
  assert.equal(response.body.mimeType, 'application/pdf');
  assert.equal(response.body.fileSize, 'document body'.length);
  assert.equal(r2Uploads.length, 0);
});

test('business document upload stores R2 object metadata when R2 is configured', async () => {
  const app = createApp({ r2Configured: true });
  const response = await request({
    app,
    method: 'POST',
    path: '/businesses/documents',
    token: makeBusinessToken(7),
    formData: buildDocumentForm('durable body'),
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.storageProvider, 'r2');
  assert.match(response.body.storagePath, /^business-documents\/7\/\d+-Certificate_123\.pdf$/);
  assert.equal(response.body.originalFileName, 'Certificate 123.pdf');
  assert.equal(response.body.mimeType, 'application/pdf');
  assert.equal(response.body.fileSize, 'durable body'.length);
  assert.equal(r2Uploads.length, 1);
  assert.equal(r2Uploads[0].contentType, 'application/pdf');
});

test('business document upload fails closed when configured R2 upload fails', async () => {
  const app = createApp({ r2Configured: true, uploadFails: true });
  const response = await request({
    app,
    method: 'POST',
    path: '/businesses/documents',
    token: makeBusinessToken(7),
    formData: buildDocumentForm(),
  });

  assert.equal(response.status, 502);
  assert.equal(response.body.error, 'Failed to upload document to object storage');
  assert.equal(insertedDocument, null);
});

test('business document R2 downloads redirect to a signed URL', async () => {
  insertedDocument = {
    id: 101,
    businessId: 7,
    originalFileName: 'Certificate 123.pdf',
    storageProvider: 'r2',
    storagePath: 'business-documents/7/101-Certificate.pdf',
    mimeType: 'application/pdf',
  };
  const app = createApp({ r2Configured: true });
  const response = await request({
    app,
    method: 'GET',
    path: '/businesses/documents/101/download',
    token: makeBusinessToken(7),
    redirect: 'manual',
  });

  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), 'https://signed.example/business-documents%2F7%2F101-Certificate.pdf');
});
