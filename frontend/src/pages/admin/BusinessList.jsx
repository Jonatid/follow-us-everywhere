import React, { useEffect, useState } from 'react';
import { fetchBusinesses } from '../../utils/adminApi';

const BusinessList = ({ onSelectBusiness }) => {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {businesses.map((business) => (
              <tr key={business.id || business._id}>
                <td>{business.name}</td>
                <td>{business.slug}</td>
                <td>{business.status || (business.isApproved ? 'Approved' : 'Pending')}</td>
                <td>
                  <div className="admin-actions">
                    <button
                      type="button"
                      className="admin-button secondary"
                      onClick={() => onSelectBusiness(business.id || business._id)}
                    >
                      View
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
