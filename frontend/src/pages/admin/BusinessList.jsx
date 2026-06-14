import React, { useEffect, useState } from 'react';
import { deleteBusiness, fetchBusinesses } from '../../utils/adminApi';
import AdminPagination from '../../components/AdminPagination';

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
  const [pagination, setPagination] = useState({ total: 0, limit: 25, offset: 0, hasMore: false });

  useEffect(() => {
    const loadBusinesses = async () => {
      setLoading(true);
      try {
        const data = await fetchBusinesses({ limit: pagination.limit, offset: pagination.offset });
        setBusinesses(Array.isArray(data) ? data : data?.businesses || []);
        if (!Array.isArray(data)) {
          setPagination((prev) => ({
            ...prev,
            total: data?.total || 0,
            limit: data?.limit || prev.limit,
            offset: data?.offset || 0,
            hasMore: Boolean(data?.hasMore),
          }));
        }
      } catch (err) {
        setError('Unable to load businesses.');
      } finally {
        setLoading(false);
      }
    };
    loadBusinesses();
  }, [pagination.limit, pagination.offset]);

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
      {!loading ? (
        <AdminPagination
          {...pagination}
          disabled={loading}
          onPageChange={(nextOffset) => setPagination((prev) => ({ ...prev, offset: nextOffset }))}
        />
      ) : null}
    </div>
  );
};

export default BusinessList;
