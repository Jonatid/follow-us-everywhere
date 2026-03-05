const test = require('node:test');
const assert = require('node:assert/strict');

process.env.TOTP_ENCRYPTION_KEY = '12345678901234567890123456789012';
process.env.ADMIN_ENROLLMENT_TOKEN_SECRET = 'enroll-secret';

const admin2fa = require('../services/admin2fa');

test('totp secret encryption round-trip works', () => {
  const secret = admin2fa.generateTotpSecret();
  const encrypted = admin2fa.encryptSecret(secret);
  const decrypted = admin2fa.decryptSecret(encrypted);
  assert.equal(decrypted, secret);
});

test('totp code verifies within current step', () => {
  const secret = admin2fa.generateTotpSecret();
  const step = Math.floor(Date.now() / 1000 / 30);
  const code = admin2fa.createHotp(secret, step);
  const verified = admin2fa.verifyTotpCode({ secret, code, now: Date.now() });
  assert.equal(verified.valid, true);
});

test('backup codes can be used once only', () => {
  const { plainCodes, hashedCodes } = admin2fa.makeBackupCodes();
  const first = admin2fa.verifyBackupCode({ providedCode: plainCodes[0], storedCodes: hashedCodes });
  assert.equal(first.valid, true);
  const second = admin2fa.verifyBackupCode({ providedCode: plainCodes[0], storedCodes: first.nextCodes });
  assert.equal(second.valid, false);
});
