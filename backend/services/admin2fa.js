const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;
const BACKUP_CODES_COUNT = 10;
const ENROLLMENT_EXPIRY = '10m';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const base32Encode = (buffer) => {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
};

const base32Decode = (input) => {
  const normalized = String(input || '').toUpperCase().replace(/=+$/g, '').replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes = [];

  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;
    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
};

const generateTotpSecret = () => base32Encode(crypto.randomBytes(20));

const getEncryptionKey = () => {
  const raw = process.env.TOTP_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('TOTP_ENCRYPTION_KEY is required');
  }

  const trimmed = raw.trim();
  if (/^[A-Fa-f0-9]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }

  try {
    const asBase64 = Buffer.from(trimmed, 'base64');
    if (asBase64.length === 32) {
      return asBase64;
    }
  } catch (_) {
    // ignore and fall through
  }

  if (trimmed.length >= 32) {
    return crypto.createHash('sha256').update(trimmed).digest();
  }

  throw new Error('TOTP_ENCRYPTION_KEY must be a 32-byte value, base64 value, or 64-char hex value');
};

const encryptSecret = (plainSecret) => {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plainSecret), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
};

const decryptSecret = (encryptedValue) => {
  const [ivBase64, tagBase64, payloadBase64] = String(encryptedValue || '').split(':');
  if (!ivBase64 || !tagBase64 || !payloadBase64) {
    throw new Error('Invalid encrypted secret format');
  }

  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivBase64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagBase64, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payloadBase64, 'base64')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
};

const createHotp = (secret, counter) => {
  const key = base32Decode(secret);
  const message = Buffer.alloc(8);
  message.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  message.writeUInt32BE(counter >>> 0, 4);

  const digest = crypto.createHmac('sha1', key).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = ((digest[offset] & 0x7f) << 24)
    | ((digest[offset + 1] & 0xff) << 16)
    | ((digest[offset + 2] & 0xff) << 8)
    | (digest[offset + 3] & 0xff);

  return String(binary % (10 ** TOTP_DIGITS)).padStart(TOTP_DIGITS, '0');
};

const verifyTotpCode = ({ secret, code, window = 1, now = Date.now() }) => {
  const normalizedCode = String(code || '').trim();
  if (!/^\d{6}$/.test(normalizedCode)) {
    return { valid: false };
  }

  const currentStep = Math.floor(now / 1000 / TOTP_STEP_SECONDS);
  for (let offset = -window; offset <= window; offset += 1) {
    const step = currentStep + offset;
    if (createHotp(secret, step) === normalizedCode) {
      return { valid: true, step };
    }
  }

  return { valid: false };
};

const buildOtpAuthUri = ({ secret, email, issuer = 'Follow Us Everywhere Admin' }) => {
  const account = encodeURIComponent(email);
  const issuerEncoded = encodeURIComponent(issuer);
  return `otpauth://totp/${issuerEncoded}:${account}?secret=${encodeURIComponent(secret)}&issuer=${issuerEncoded}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_STEP_SECONDS}`;
};

const createEnrollmentToken = ({ adminId }) => {
  const secret = process.env.ADMIN_ENROLLMENT_TOKEN_SECRET;
  if (!secret) {
    throw new Error('ADMIN_ENROLLMENT_TOKEN_SECRET is required');
  }

  return jwt.sign({ adminId, purpose: 'admin-2fa-enrollment' }, secret, { expiresIn: ENROLLMENT_EXPIRY });
};

const verifyEnrollmentToken = (token) => {
  const secret = process.env.ADMIN_ENROLLMENT_TOKEN_SECRET;
  if (!secret) {
    throw new Error('ADMIN_ENROLLMENT_TOKEN_SECRET is required');
  }

  const decoded = jwt.verify(token, secret);
  if (decoded.purpose !== 'admin-2fa-enrollment') {
    throw new Error('Invalid enrollment token purpose');
  }

  return decoded;
};

const makeBackupCodes = () => {
  const plainCodes = [];
  const hashedCodes = [];

  for (let index = 0; index < BACKUP_CODES_COUNT; index += 1) {
    const raw = crypto.randomBytes(6).toString('hex').toUpperCase();
    const code = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
    const salt = crypto.randomBytes(16).toString('hex');
    const digest = crypto.createHash('sha256').update(`${salt}:${code}`).digest('hex');

    plainCodes.push(code);
    hashedCodes.push({ salt, digest, usedAt: null });
  }

  return { plainCodes, hashedCodes };
};

const verifyBackupCode = ({ providedCode, storedCodes }) => {
  const normalized = String(providedCode || '').trim().toUpperCase();
  if (!normalized) {
    return { valid: false, nextCodes: storedCodes || [] };
  }

  const list = Array.isArray(storedCodes) ? storedCodes : [];
  let matchedIndex = -1;

  for (let index = 0; index < list.length; index += 1) {
    const item = list[index];
    if (!item || item.usedAt) continue;

    const computed = crypto.createHash('sha256').update(`${item.salt}:${normalized}`).digest('hex');
    const left = Buffer.from(computed, 'hex');
    const right = Buffer.from(item.digest || '', 'hex');

    if (left.length === right.length && crypto.timingSafeEqual(left, right)) {
      matchedIndex = index;
      break;
    }
  }

  if (matchedIndex === -1) {
    return { valid: false, nextCodes: list };
  }

  const nextCodes = list.map((code, index) => {
    if (index !== matchedIndex) return code;
    return { ...code, usedAt: new Date().toISOString() };
  });

  return { valid: true, nextCodes };
};

module.exports = {
  BACKUP_CODES_COUNT,
  buildOtpAuthUri,
  createEnrollmentToken,
  createHotp,
  decryptSecret,
  encryptSecret,
  generateTotpSecret,
  makeBackupCodes,
  verifyBackupCode,
  verifyEnrollmentToken,
  verifyTotpCode,
};
