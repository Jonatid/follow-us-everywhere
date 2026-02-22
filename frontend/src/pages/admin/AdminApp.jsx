import React, { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import AdminDashboard from './AdminDashboard';
import AdminLogin from './AdminLogin';
import AdminManagement from './AdminManagement';
import BadgeManagement from './BadgeManagement';
import BusinessDetail from './BusinessDetail';
import BusinessList from './BusinessList';
import ReviewList from './ReviewList';
import AdminDocuments from './AdminDocuments';

const normalizePath = (path) => (path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path);

const AdminApp = () => {
  const [currentPath, setCurrentPath] = useState(normalizePath(window.location.pathname));

  const adminToken = localStorage.getItem('adminToken');

  const navigate = (path) => {
    const normalized = normalizePath(path);
    window.history.pushState({}, '', normalized);
    setCurrentPath(normalized);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

  const businessId = useMemo(() => {
    const match = currentPath.match(/^\/admin\/businesses\/([^/]+)$/);
    return match ? match[1] : null;
  }, [currentPath]);

  useEffect(() => {
    const handlePopState = () => setCurrentPath(normalizePath(window.location.pathname));
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!adminToken && currentPath !== '/admin/login') {
      navigate('/admin/login');
    }

    if (currentPath === '/admin' || currentPath === '/admin/') {
      navigate(adminToken ? '/admin/dashboard' : '/admin/login');
    }
  }, [adminToken, currentPath]);

  if (currentPath === '/admin/login') {
    return <AdminLogin onSuccess={() => navigate('/admin/dashboard')} />;
  }

  let content = null;
  if (currentPath === '/admin/dashboard') {
    content = <AdminDashboard />;
  } else if (currentPath === '/admin/businesses') {
    content = <BusinessList onSelectBusiness={(id) => navigate(`/admin/businesses/${id}`)} />;
  } else if (currentPath === '/admin/reviews') {
    content = <ReviewList />;
  } else if (currentPath === '/admin/documents') {
    content = <AdminDocuments />;
  } else if (businessId) {
    content = <BusinessDetail businessId={businessId} onBack={() => navigate('/admin/businesses')} />;
  } else if (currentPath === '/admin/admins') {
    content = <AdminManagement />;
  } else if (currentPath === '/admin/badges') {
    content = <BadgeManagement />;
  } else {
    content = (
      <div className="admin-card">
        <h1>Page not found</h1>
        <p className="admin-muted">Use the navigation to choose an admin section.</p>
      </div>
    );
  }

  return (
    <AdminLayout currentPath={currentPath} onNavigate={navigate} onLogout={handleLogout}>
      {content}
    </AdminLayout>
  );
};

export default AdminApp;
