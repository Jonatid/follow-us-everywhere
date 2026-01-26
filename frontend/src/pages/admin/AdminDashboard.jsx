import React, { useEffect, useState } from 'react';
import { fetchAdmins, fetchBusinesses } from '../../utils/adminApi';

const AdminDashboard = () => {
  const [summary, setSummary] = useState({ businesses: 0, admins: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const [businesses, admins] = await Promise.all([fetchBusinesses(), fetchAdmins()]);
        setSummary({
          businesses: Array.isArray(businesses) ? businesses.length : businesses?.length || 0,
          admins: Array.isArray(admins) ? admins.length : admins?.length || 0
        });
      } catch (err) {
        setSummary({ businesses: 0, admins: 0 });
      } finally {
        setLoading(false);
      }
    };
    loadSummary();
  }, []);

  return (
    <div className="admin-card">
      <div className="admin-topbar">
        <h1>Dashboard</h1>
      </div>
      <p className="admin-muted">Quick snapshot of the admin system.</p>
      {loading ? (
        <p className="admin-muted">Loading summary...</p>
      ) : (
        <div className="admin-grid two">
          <div className="admin-card" style={{ background: '#eef2ff' }}>
            <h3>Total Businesses</h3>
            <p style={{ fontSize: 32, margin: 0 }}>{summary.businesses}</p>
          </div>
          <div className="admin-card" style={{ background: '#ecfdf3' }}>
            <h3>Admin Users</h3>
            <p style={{ fontSize: 32, margin: 0 }}>{summary.admins}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
