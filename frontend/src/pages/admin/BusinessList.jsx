import React, { useEffect, useState } from 'react';
import { deleteBusiness, fetchBusinesses } from '../../utils/adminApi';

const statusLabelMap = {
  active: 'Active',
  flagged: 'Flagged (Needs Review)',
  suspended: 'Suspended',
  disabled: 'Disabled',
};

const BusinessList = ({ onSelectBusiness }) => {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const loadBusinesses = async () => {
      try {
        const data = await fetchBusinesses();
        setBusinesses(Array.isArray(data) ? data : data?.businesses || []);
      } catch (err) {
        setError('Unable to load businesses.');
      } finally {
        setLoading(false);
      }
    };
    loadBusinesses();
  }, []);

  const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';

    return date.toLocaleString();
  };

  const handleDelete = async (businessId, businessName) => {
    const shouldDelete = window.confirm(`Delete ${businessName}? This cannot be undone.`);
    if (!shouldDelete) return;

    try {
      setDeletingId(businessId);
      setError('');
      await deleteBusiness(businessId);
      setBusinesses((current) => current.filter((business) => (business.id || business._id) !== businessId));
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to delete business.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="admin-card">
      <div className="admin-topbar">
        <h1>Businesses</h1>
      </div>
      {error && <div className="admin-alert">{error}</div>}
      {loading ? (
        <p className="admin-muted">Loading businesses...</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Status</th>
              <th>Date Added</th>
              <th>Date Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {businesses.map((business) => (
              <tr key={business.id || business._id}>
                <td>{business.name}</td>
                <td>{business.slug}</td>
                <td>{statusLabelMap[business.verificationStatus] || 'Active'}</td>
                <td>{formatDate(business.createdAt)}</td>
                <td>{formatDate(business.updatedAt)}</td>
                <td>
                  <div className="admin-actions">
                    <button
                      type="button"
                      className="admin-button secondary"
                      onClick={() => onSelectBusiness(business.id || business._id)}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className="admin-button danger"
                      disabled={deletingId === (business.id || business._id)}
                      onClick={() => handleDelete(business.id || business._id, business.name || 'this business')}
                    >
                      {deletingId === (business.id || business._id) ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default BusinessList;
