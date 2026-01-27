import React, { useEffect, useState } from 'react';
import { fetchReviewBusinesses, updateReviewBusiness } from '../../utils/adminApi';

const STATUS_OPTIONS = ['flagged', 'suspended', 'disabled', 'active'];

const ReviewList = () => {
  const [statusFilter, setStatusFilter] = useState('flagged');
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadBusinesses = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchReviewBusinesses(statusFilter);
      setBusinesses(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Unable to load review queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusinesses();
  }, [statusFilter]);

  const handleStatusChange = async (businessId, verificationStatus) => {
    try {
      await updateReviewBusiness(businessId, { verification_status: verificationStatus });
      loadBusinesses();
    } catch (err) {
      setError('Failed to update status.');
    }
  };

  return (
    <div className="admin-card">
      <div className="admin-topbar">
        <div>
          <h1>Reviews</h1>
          <p className="admin-muted">Monitor flagged and suspended businesses.</p>
        </div>
        <div>
          <label className="admin-muted" htmlFor="review-status">
            Status
          </label>
          <select
            id="review-status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="admin-input"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="admin-alert">{error}</div>}
      {loading ? (
        <p className="admin-muted">Loading review queue...</p>
      ) : businesses.length === 0 ? (
        <p className="admin-muted">No businesses in this review queue.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Business</th>
              <th>Status</th>
              <th>Policy</th>
              <th>Nudge message</th>
              <th>Last nudge</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {businesses.map((business) => (
              <tr key={business.id}>
                <td>
                  <strong>{business.name}</strong>
                  <div className="admin-muted">{business.slug}</div>
                  <div className="admin-muted">{business.email}</div>
                </td>
                <td>
                  <span className="admin-pill">{business.verificationStatus}</span>
                </td>
                <td>
                  {business.policyViolationCode ? (
                    <>
                      <div>{business.policyViolationCode}</div>
                      <div className="admin-muted">{business.policyViolationText}</div>
                    </>
                  ) : (
                    <span className="admin-muted">—</span>
                  )}
                </td>
                <td>{business.nudgeMessage || <span className="admin-muted">—</span>}</td>
                <td>
                  {business.lastNudgeAt ? new Date(business.lastNudgeAt).toLocaleString() : '—'}
                </td>
                <td>
                  <div className="admin-actions">
                    {business.verificationStatus !== 'suspended' && (
                      <button
                        type="button"
                        className="admin-button secondary"
                        onClick={() => handleStatusChange(business.id, 'suspended')}
                      >
                        Suspend
                      </button>
                    )}
                    {business.verificationStatus !== 'disabled' && (
                      <button
                        type="button"
                        className="admin-button danger"
                        onClick={() => handleStatusChange(business.id, 'disabled')}
                      >
                        Disable
                      </button>
                    )}
                    {business.verificationStatus !== 'active' && (
                      <button
                        type="button"
                        className="admin-button primary"
                        onClick={() => handleStatusChange(business.id, 'active')}
                      >
                        Reactivate
                      </button>
                    )}
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

export default ReviewList;
