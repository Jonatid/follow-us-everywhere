import React, { useEffect, useState } from 'react';
import { createAdmin, fetchAdmins } from '../../utils/adminApi';

const AdminManagement = () => {
  const [admins, setAdmins] = useState([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadAdmins = async () => {
    try {
      const data = await fetchAdmins();
      setAdmins(Array.isArray(data) ? data : data?.admins || []);
    } catch (err) {
      setError('Unable to load admins.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleCreate = async () => {
    setError('');
    if (!email || !name) {
      setError('Name and email are required.');
      return;
    }
    setSaving(true);
    try {
      await createAdmin({ name, email });
      setName('');
      setEmail('');
      await loadAdmins();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create admin.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-card">
      <div className="admin-topbar">
        <h1>Admin Users</h1>
      </div>
      {error && <div className="admin-alert">{error}</div>}
      <div className="admin-form">
        <label>
          Name
          <input
            type="text"
            className="admin-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Jane Doe"
          />
        </label>
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
        <button type="button" className="admin-button primary" onClick={handleCreate} disabled={saving}>
          {saving ? 'Creating...' : 'Add Admin'}
        </button>
      </div>
      {loading ? (
        <p className="admin-muted">Loading admins...</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr key={admin.id || admin._id}>
                <td>{admin.name}</td>
                <td>{admin.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminManagement;
