const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://followuseverywhere-api.onrender.com/api';

const getApiOrigin = () => {
  const baseUrl = String(API_BASE_URL || '').trim();

  if (!baseUrl) {
    return '';
  }

  try {
    return new URL(baseUrl).origin;
  } catch {
    return baseUrl.replace(/\/+$/, '').replace(/\/api$/, '');
  }
};

export const toAdminDocumentUrl = (storagePath, options = {}) => {
  if (!storagePath) {
    return null;
  }

  const normalizedPath = String(storagePath).replace(/^\/+/, '');
  if (!normalizedPath) {
    return null;
  }

  const storageProvider = String(options.storageProvider || '').toLowerCase();
  const filename = options.filename ? `?filename=${encodeURIComponent(options.filename)}` : '';

  const isLocalPath = /^(api\/)?uploads\//.test(normalizedPath);
  if (storageProvider === 'local' || isLocalPath) {
    const withoutUploadsPrefix = normalizedPath.replace(/^(api\/)?uploads\/+/, '');
    if (!withoutUploadsPrefix) {
      return null;
    }

    const origin = getApiOrigin();
    return origin ? `${origin}/api/uploads/${withoutUploadsPrefix}` : `/api/uploads/${withoutUploadsPrefix}`;
  }

  const origin = getApiOrigin();
  const prefix = origin || '';
  return `${prefix}/api/r2/download/${normalizedPath}?redirect=1${filename ? `&${filename.slice(1)}` : ''}`;
};
