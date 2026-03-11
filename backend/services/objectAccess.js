const path = require('path');

const sanitizeFilename = (filename = 'file') => {
  const base = path.basename(String(filename)).replace(/[^a-zA-Z0-9._-]/g, '_');
  return base.slice(0, 120) || 'file';
};

const normalizeObjectKey = (key = '') => {
  const normalized = String(key).replace(/\\/g, '/').replace(/^\/+/, '').trim();
  if (!normalized) {
    return '';
  }

  const parts = normalized.split('/').filter(Boolean);
  if (parts.some((part) => part === '.' || part === '..')) {
    return '';
  }

  return parts.join('/');
};

const getScopePrefix = (auth) => {
  if (!auth?.role || !auth?.id) {
    return null;
  }

  return `${auth.role}/${auth.id}/`;
};

const buildScopedKey = ({ auth, filename }) => {
  const prefix = getScopePrefix(auth);
  if (!prefix) {
    return null;
  }

  const safeName = sanitizeFilename(filename);
  return `${prefix}${Date.now()}-${safeName}`;
};

const canAccessKey = ({ auth, key }) => {
  const normalizedKey = normalizeObjectKey(key);
  const prefix = getScopePrefix(auth);

  if (!normalizedKey || !prefix) {
    return false;
  }

  return normalizedKey.startsWith(prefix);
};

module.exports = {
  buildScopedKey,
  canAccessKey,
  normalizeObjectKey,
  sanitizeFilename,
};
