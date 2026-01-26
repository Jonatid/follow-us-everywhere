import React, { useEffect, useState } from 'react';
import { approveBusiness, blockBusiness, fetchBusiness } from '../../utils/adminApi';

const BusinessDetail = ({ businessId, onBack }) => {
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadBusiness = async () => {
    try {
      const data = await fetchBusiness(businessId);
      setBusiness(data);
    } catch (err) {
      setError('Unable to load this business.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (businessId) {
      loadBusiness();
    }
  }, [businessId]);

  const handleApprove = async () => {
    try {
      await approveBusiness(businessId);
      await loadBusiness();
    } catch (err) {
      setError('Failed to approve business.');
    }
  };

  const handleBlock = async () => {
    try {
      await blockBusiness(businessId);
      await loadBusiness();
    } catch (err) {
      setError('Failed to block business.');
    }
  };

  if (loading) {
    return (
      <div className="admin-card">
        <p className="admin-muted">Loading business...</p>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="admin-card">
        {error && <div className="admin-alert">{error}</div>}
      </div>
    );
  }

  return (
    <div className="admin-card">
      <div className="admin-topbar">
        <h1>{business.name}</h1>
        <button type="button" className="admin-button secondary" onClick={onBack}>
          Back to list
        </button>
      </div>
      {error && <div className="admin-alert">{error}</div>}
      <div className="admin-grid two">
        <div>
          <p className="admin-muted">Slug</p>
          <p>{business.slug}</p>
        </div>
        <div>
          <p className="admin-muted">Email</p>
          <p>{business.email}</p>
        </div>
        <div>
          <p className="admin-muted">Status</p>
          <p>{business.status || (business.isApproved ? 'Approved' : 'Pending')}</p>
        </div>
      </div>
      <div className="admin-actions" style={{ marginTop: 16 }}>
        <button type="button" className="admin-button primary" onClick={handleApprove}>
          Approve
        </button>
        <button type="button" className="admin-button danger" onClick={handleBlock}>
          Block
        </button>
      </div>
    </div>
  );
};

export default BusinessDetail;
