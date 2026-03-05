import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/admin.css';
import App from './App';
import AdminApp from './pages/admin/AdminApp';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
const ADMIN_HOSTNAME = 'admin.fuse101.com';
const ADMIN_LOGIN_PATH = '/admin/login';
const normalizePath = (path) => (path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path);

const isAdminHost = window.location.hostname === ADMIN_HOSTNAME;
const currentPath = normalizePath(window.location.pathname);
const shouldRedirectToAdminLogin = isAdminHost && (currentPath === '/' || !currentPath.startsWith('/admin'));

if (shouldRedirectToAdminLogin) {
  window.history.replaceState({}, '', ADMIN_LOGIN_PATH);
}

const isAdminRoute = isAdminHost || window.location.pathname.startsWith('/admin');

root.render(
  <React.StrictMode>
    {isAdminRoute ? <AdminApp /> : <App />}
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
