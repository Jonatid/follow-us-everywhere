const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseAllowedOrigins,
  createCorsOriginValidator,
  getCorsOptions,
  DEFAULT_ALLOWED_ORIGINS
} = require('../config/cors');

const validateOrigin = (validator, origin) => new Promise((resolve, reject) => {
  validator(origin, (err, allowed) => {
    if (err) {
      reject(err);
      return;
    }
    resolve(allowed);
  });
});

test('defaults include fuse + www + admin origins', () => {
  const origins = parseAllowedOrigins('');
  assert.deepEqual(origins, DEFAULT_ALLOWED_ORIGINS);
});

test('admin origin is allowed and unknown origin is blocked', async () => {
  const validator = createCorsOriginValidator(DEFAULT_ALLOWED_ORIGINS);

  await assert.doesNotReject(async () => {
    const adminAllowed = await validateOrigin(validator, 'https://admin.fuse101.com');
    assert.equal(adminAllowed, true);
  });

  await assert.rejects(
    () => validateOrigin(validator, 'https://evil.com'),
    /CORS blocked for origin: https:\/\/evil\.com/
  );
});

test('missing origin is allowed for server-to-server calls', async () => {
  const validator = createCorsOriginValidator(DEFAULT_ALLOWED_ORIGINS);
  const allowed = await validateOrigin(validator, undefined);
  assert.equal(allowed, true);
});

test('cors options enable credentials and preserve method/header allowlist', () => {
  process.env.ALLOWED_ORIGINS = DEFAULT_ALLOWED_ORIGINS.join(',');
  const options = getCorsOptions();

  assert.equal(typeof options.origin, 'function');
  assert.equal(options.credentials, true);
  assert.deepEqual(options.methods, ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
  assert.deepEqual(options.allowedHeaders, ['Authorization', 'Content-Type']);
});

test('non-https origin entries are rejected', () => {
  assert.throws(
    () => parseAllowedOrigins('https://fuse101.com,http://admin.fuse101.com'),
    /must be exact https origins/
  );
});
