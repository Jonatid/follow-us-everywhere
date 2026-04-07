import React, { useEffect } from 'react';
import { getStoredAdminToken } from '../utils/adminAuth';

const RequireAdminAuth = ({ currentPath, onUnauthorized, children }) => {
  const adminToken = getStoredAdminToken();
  const isAuthorized = Boolean(adminToken);

  useEffect(() => {
    if (!isAuthorized && currentPath !== '/admin/login') {
      onUnauthorized();
    }
  }, [currentPath, isAuthorized, onUnauthorized]);

  if (!isAuthorized && currentPath !== '/admin/login') {
    return null;
  }

  return children;
};

export default RequireAdminAuth;
