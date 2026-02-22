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

  return `${API_BASE_URL.replace(/\/+$/, '')}/uploads/${withoutUploadsPrefix}`;
};

