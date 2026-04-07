const ADMIN_AUTH_KEYS = ['adminToken', 'admin_token', 'adminAuth'];

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const extractToken = (rawValue) => {
  if (!isNonEmptyString(rawValue)) return null;

  const trimmed = rawValue.trim();

  if (!trimmed.startsWith('{')) {
    return trimmed;
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (isNonEmptyString(parsed?.token)) return parsed.token.trim();
    if (isNonEmptyString(parsed?.accessToken)) return parsed.accessToken.trim();
    return null;
  } catch (err) {
    return null;
  }
};

export const getStoredAdminToken = () => {
  for (const key of ADMIN_AUTH_KEYS) {
    const token = extractToken(localStorage.getItem(key));
    if (token) {
      if (key !== 'adminToken') {
        localStorage.setItem('adminToken', token);
      }
      return token;
    }
  }

  return null;
};

export const storeAdminToken = (token) => {
  if (!isNonEmptyString(token)) return;
  localStorage.setItem('adminToken', token.trim());
};

export const clearAdminAuthStorage = () => {
  ADMIN_AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
};

export { ADMIN_AUTH_KEYS };
