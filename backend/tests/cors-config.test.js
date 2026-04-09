const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseAllowedOrigins,
  createCorsOriginValidator,
  getCorsOptions
} = require('../config/cors');

const TEST_ALLOWED_ORIGINS = [
  'https://fuse101.com',
  'https://www.fuse101.com',
  'https://admin.fuse101.com'
];

const validateOrigin = (validator, origin) => new Promise((resolve, reject) => {
  validator(origin, (err, allowed) => {
    if (err) {
      reject(err);
      return;
    }
    resolve(allowed);
  });
});

test('parses configured ALLOWED_ORIGINS from environment format', () => {
  const origins = parseAllowedOrigins(TEST_ALLOWED_ORIGINS.join(','));
  assert.deepEqual(origins, TEST_ALLOWED_ORIGINS);
});

test('allowed origin fuse101.com is accepted', async () => {
  const validator = createCorsOriginValidator(TEST_ALLOWED_ORIGINS);
  const allowed = await validateOrigin(validator, 'https://fuse101.com');
  assert.equal(allowed, true);
});

test('allowed admin origin is accepted', async () => {
  const validator = createCorsOriginValidator(TEST_ALLOWED_ORIGINS);
  const allowed = await validateOrigin(validator, 'https://admin.fuse101.com');
  assert.equal(allowed, true);
});

test('unexpected origin is rejected with clear CORS error', async () => {
  const validator = createCorsOriginValidator(TEST_ALLOWED_ORIGINS);

  await assert.rejects(
    () => validateOrigin(validator, 'https://evil-example.com'),
    (error) => {
      assert.equal(error.status, 403);
      assert.match(error.message, /CORS blocked for origin: https:\/\/evil-example\.com/);
      return true;
    }
  );
});

test('missing Origin header is allowed for server-to-server calls', async () => {
  const validator = createCorsOriginValidator(TEST_ALLOWED_ORIGINS);
  const allowed = await validateOrigin(validator, undefined);
  assert.equal(allowed, true);
});

test('cors options keep credentials enabled', () => {
  process.env.ALLOWED_ORIGINS = TEST_ALLOWED_ORIGINS.join(',');
  const options = getCorsOptions();

  assert.equal(typeof options.origin, 'function');
  assert.equal(options.credentials, true);
  assert.deepEqual(options.methods, ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
  assert.deepEqual(options.allowedHeaders, ['Authorization', 'Content-Type']);
});

test('localhost frontend origin is always allowed by cors options', async () => {
  process.env.ALLOWED_ORIGINS = TEST_ALLOWED_ORIGINS.join(',');
  const options = getCorsOptions();
  const allowed = await validateOrigin(options.origin, 'http://localhost:3000');

  assert.equal(allowed, true);
});

test('non-https origin entries are rejected unless explicitly localhost/127.0.0.1', () => {
  assert.throws(
    () => parseAllowedOrigins('https://fuse101.com,http://admin.fuse101.com'),
    /must be exact https origins, or explicit http localhost\/127\.0\.0\.1 origins/
  );
});

test('explicit local development origins are allowed only when configured', () => {
  const origins = parseAllowedOrigins('https://fuse101.com,http://localhost:3000,http://127.0.0.1:3000');

  assert.deepEqual(origins, [
    'https://fuse101.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ]);
});

test('ALLOWED_ORIGINS is required', () => {
  assert.throws(
    () => parseAllowedOrigins(''),
    /ALLOWED_ORIGINS is required and must include at least one origin/
  );
});
