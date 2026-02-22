import React, { useEffect, useState } from 'react';
import { fetchDashboardSummary } from '../../utils/adminApi';

const AdminDashboard = () => {
  const [summary, setSummary] = useState({ totalBusinesses: 0, activeBusinesses: 0, inactiveBusinesses: 0, admins: 0, pendingDocuments: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const dashboardSummary = await fetchDashboardSummary();
        setSummary({
          totalBusinesses: Number(dashboardSummary?.businesses?.total || 0),
          activeBusinesses: Number(dashboardSummary?.businesses?.active || 0),
          inactiveBusinesses: Number(dashboardSummary?.businesses?.inactive || 0),
          admins: Number(dashboardSummary?.admins || 0),
          pendingDocuments: Number(dashboardSummary?.pendingDocuments || 0),
        });
      } catch (err) {
        setSummary({ totalBusinesses: 0, activeBusinesses: 0, inactiveBusinesses: 0, admins: 0, pendingDocuments: 0 });
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
            <p style={{ fontSize: 32, margin: 0 }}>{summary.totalBusinesses}</p>
          </div>
          <div className="admin-card" style={{ background: '#ecfdf3' }}>
            <h3>Active Businesses</h3>
            <p style={{ fontSize: 32, margin: 0 }}>{summary.activeBusinesses}</p>
          </div>
          <div className="admin-card" style={{ background: '#fff7ed' }}>
            <h3>Inactive Businesses</h3>
            <p style={{ fontSize: 32, margin: 0 }}>{summary.inactiveBusinesses}</p>
          </div>
          <div className="admin-card" style={{ background: '#fef3c7' }}>
            <h3>Pending Documents</h3>
            <p style={{ fontSize: 32, margin: 0 }}>{summary.pendingDocuments}</p>
          </div>
          <div className="admin-card" style={{ background: '#f8fafc' }}>
            <h3>Admin Users</h3>
            <p style={{ fontSize: 32, margin: 0 }}>{summary.admins}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
