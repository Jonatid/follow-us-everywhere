const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://followuseverywhere-api.onrender.com/api';

export const toAdminDocumentUrl = (storagePath) => {
  if (!storagePath) {
    return null;
  }

  const normalizedPath = String(storagePath).replace(/^\/+/, '');
  const withoutUploadsPrefix = normalizedPath.replace(/^(api\/)?uploads\/+/, '');

  if (!withoutUploadsPrefix) {
    return null;
  }

  const baseUrl = String(API_BASE_URL || '').trim();

  if (!baseUrl) {
    return `/api/uploads/${withoutUploadsPrefix}`;
  }

  try {
    const parsed = new URL(baseUrl);
    return `${parsed.origin}/api/uploads/${withoutUploadsPrefix}`;
  } catch {
    return `${baseUrl.replace(/\/+$/, '').replace(/\/api$/, '')}/api/uploads/${withoutUploadsPrefix}`;
  }
};
