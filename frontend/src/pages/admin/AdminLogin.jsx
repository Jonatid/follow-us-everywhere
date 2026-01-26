import React, { useState } from 'react';
import { adminLogin } from '../../utils/adminApi';

const AdminLogin = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!email || !password) {
      setError('Please provide your admin email and password.');
      return;
    }
    setLoading(true);
    try {
      const data = await adminLogin(email, password);
      if (data?.token) {
        localStorage.setItem('adminToken', data.token);
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to sign in as admin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-shell">
      <main className="admin-content">
        <div className="admin-card" style={{ maxWidth: 420, margin: '0 auto' }}>
          <div className="admin-topbar">
            <h1>Admin Login</h1>
          </div>
          {error && <div className="admin-alert">{error}</div>}
          <div className="admin-form">
            <label>
              Email
              <input
                type="email"
                className="admin-input"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@example.com"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                className="admin-input"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
              />
            </label>
            <button type="button" className="admin-button primary" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminLogin;
