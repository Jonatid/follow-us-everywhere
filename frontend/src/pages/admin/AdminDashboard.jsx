import React, { useEffect, useState } from 'react';
import { fetchDashboardSummary, regenerateBackupCodes } from '../../utils/adminApi';

const AdminDashboard = () => {
  const [summary, setSummary] = useState({ totalBusinesses: 0, activeBusinesses: 0, inactiveBusinesses: 0, admins: 0, pendingDocuments: 0 });
  const [loading, setLoading] = useState(true);
  const [backupCodes, setBackupCodes] = useState(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupError, setBackupError] = useState(null);

  const handleRegenerateBackupCodes = async () => {
    if (!window.confirm('This will invalidate all existing backup codes. Continue?')) return;
    setBackupLoading(true);
    setBackupError(null);
    setBackupCodes(null);
    try {
      const data = await regenerateBackupCodes();
      setBackupCodes(data.backupCodes);
    } catch (err) {
      setBackupError(err?.response?.data?.message || 'Failed to regenerate backup codes.');
    } finally {
      setBackupLoading(false);
    }
  };

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

      <div className="admin-card" style={{ marginTop: 24 }}>
        <h2 style={{ marginBottom: 8 }}>Security</h2>
        <p className="admin-muted" style={{ marginBottom: 12 }}>Regenerate your two-factor authentication backup codes. Your old codes will be invalidated immediately.</p>
        {backupError && <p style={{ color: '#dc2626', marginBottom: 8 }}>{backupError}</p>}
        {backupCodes ? (
          <div>
            <p style={{ fontWeight: 600, marginBottom: 8, color: '#16a34a' }}>New backup codes — save these now:</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontFamily: 'monospace', fontSize: 14, marginBottom: 12 }}>
              {backupCodes.map((code, i) => (
                <span key={i} style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 4 }}>{code}</span>
              ))}
            </div>
            <button className="admin-btn admin-btn-secondary" onClick={() => setBackupCodes(null)}>Done</button>
          </div>
        ) : (
          <button className="admin-btn admin-btn-danger" onClick={handleRegenerateBackupCodes} disabled={backupLoading}>
            {backupLoading ? 'Regenerating...' : 'Regenerate Backup Codes'}
          </button>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
