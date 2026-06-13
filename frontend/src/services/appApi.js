import axios from 'axios';

const configuredApiBaseUrl =
  (typeof process !== 'undefined' && process.env?.REACT_APP_API_BASE_URL) ||
  import.meta.env.VITE_API_BASE_URL ||
  '';

export const DEFAULT_API_BASE_URL = 'https://followuseverywhere-api.onrender.com/api';

export const API_BASE_URL =
  configuredApiBaseUrl ||
  (import.meta.env.DEV
    ? 'http://localhost:5000/api'
    : DEFAULT_API_BASE_URL);

const configuredPublicWebUrl =
  (typeof process !== 'undefined' && process.env?.REACT_APP_PUBLIC_WEB_URL) ||
  import.meta.env.VITE_PUBLIC_WEB_URL ||
  '';

const publicBase = (configuredPublicWebUrl || window.location.origin).replace(/\/$/, '');

export const normalizePublicBusinessKey = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

export const resolvePublicBusinessKey = (business) =>
  normalizePublicBusinessKey(business?.slug) || normalizePublicBusinessKey(business?.username);

export const buildPublicBusinessUrl = (key) => `${publicBase}/b/${encodeURIComponent(normalizePublicBusinessKey(key))}`;

// =============================================================================
// API SERVICE
// =============================================================================

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

export const customerApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

customerApi.interceptors.request.use((config) => {
  const requestUrl = `${config.baseURL || ''}${config.url || ''}`;
  const isPublicRequest = requestUrl.includes('/api/public/') || (config.url || '').startsWith('/public/');
  if (isPublicRequest) {
    if (config.headers?.Authorization) {
      delete config.headers.Authorization;
    }
    return config;
  }

  const token = localStorage.getItem('customer_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getApiErrorMessage = (error, fallback = 'Something went wrong. Please try again.') =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

export const normalizePublicBusinessPayload = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  return {
    ...payload,
    socials: Array.isArray(payload.socials) ? payload.socials : [],
    badges: Array.isArray(payload.badges) ? payload.badges : [],
    widget_settings: normalizeWidgetSettings(payload.widget_settings),
  };
};

export const toAbsoluteAssetUrl = (assetPath) => {
  const normalized = typeof assetPath === 'string' ? assetPath.trim() : '';
  if (!normalized) {
    return '';
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, '');
  const leadingSlashPath = normalized.startsWith('/') ? normalized : `/${normalized}`;
  return `${apiOrigin}${leadingSlashPath}`;
};

export const normalizeLogoUrlValue = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
};

export const LOGO_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
export const ALLOWED_LOGO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const LOGO_UPLOAD_ACCEPT = '.jpg,.jpeg,.png,.webp';

export const DEFAULT_WIDGET_SETTINGS = Object.freeze({
  layoutMode: 'branded',
  showBranding: true,
  showBusinessName: true,
  showLinks: true,
  ctaText: 'Tap a link to follow',
});

export const normalizeWidgetSettings = (settings) => {
  const incoming = settings && typeof settings === 'object' && !Array.isArray(settings)
    ? settings
    : {};
  const layoutMode = ['minimal', 'branded', 'full', 'custom'].includes(incoming.layoutMode)
    ? incoming.layoutMode
    : DEFAULT_WIDGET_SETTINGS.layoutMode;
  const normalizedCta = typeof incoming.ctaText === 'string' ? incoming.ctaText.trim().slice(0, 80) : '';

  return {
    layoutMode,
    showBranding: typeof incoming.showBranding === 'boolean' ? incoming.showBranding : DEFAULT_WIDGET_SETTINGS.showBranding,
    showBusinessName: typeof incoming.showBusinessName === 'boolean' ? incoming.showBusinessName : DEFAULT_WIDGET_SETTINGS.showBusinessName,
    showLinks: typeof incoming.showLinks === 'boolean' ? incoming.showLinks : DEFAULT_WIDGET_SETTINGS.showLinks,
    ctaText: normalizedCta || DEFAULT_WIDGET_SETTINGS.ctaText,
  };
};

export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,64}$/;
export const PASSWORD_HELPER =
  'Password must be at least 12 characters and include at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.';
