import React from 'react';

const AdminLayout = ({ currentPath, onNavigate, onLogout, children }) => {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <h2>Admin Console</h2>
        <nav className="admin-nav">
          <button
            type="button"
            className={currentPath === '/admin/dashboard' ? 'active' : ''}
            onClick={() => onNavigate('/admin/dashboard')}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={currentPath.startsWith('/admin/businesses') ? 'active' : ''}
            onClick={() => onNavigate('/admin/businesses')}
          >
            Businesses
          </button>
          <button
            type="button"
            className={currentPath.startsWith('/admin/reviews') ? 'active' : ''}
            onClick={() => onNavigate('/admin/reviews')}
          >
            Reviews
          </button>
          <button
            type="button"
            className={currentPath.startsWith('/admin/documents') ? 'active' : ''}
            onClick={() => onNavigate('/admin/documents')}
          >
            Documents
          </button>
          <button
            type="button"
            className={currentPath === '/admin/admins' ? 'active' : ''}
            onClick={() => onNavigate('/admin/admins')}
          >
            Admins
          </button>
          <button
            type="button"
            className={currentPath === '/admin/badges' ? 'active' : ''}
            onClick={() => onNavigate('/admin/badges')}
          >
            Badges
          </button>
        </nav>
        <button type="button" className="admin-button secondary" onClick={onLogout}>
          Log out
        </button>
      </aside>
      <main className="admin-content">{children}</main>
    </div>
  );
};

export default AdminLayout;
