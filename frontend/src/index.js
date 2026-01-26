import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/admin.css';
import App from './App';
import AdminApp from './pages/admin/AdminApp';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
const isAdminRoute = window.location.pathname.startsWith('/admin');

root.render(
  <React.StrictMode>
    {isAdminRoute ? <AdminApp /> : <App />}
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
