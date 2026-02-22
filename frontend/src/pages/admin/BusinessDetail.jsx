import React, { useEffect, useState } from 'react';
import {
  approveBusiness,
  assignBusinessBadge,
  blockBusiness,
  fetchAdminDocuments,
  fetchBadges,
  fetchBusiness,
  fetchBusinessBadges,
  removeBusinessBadge,
  reviewAdminDocument,
} from '../../utils/adminApi';


const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://followuseverywhere-api.onrender.com/api';

const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

const statusLabelMap = {
  active: 'Active',
  flagged: 'Flagged (Needs Review)',
  suspended: 'Suspended',
  disabled: 'Disabled',
};

const BusinessDetail = ({ businessId, onBack }) => {
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [badges, setBadges] = useState([]);
  const [assignedBadges, setAssignedBadges] = useState([]);
  const [selectedBadge, setSelectedBadge] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [badgeSaving, setBadgeSaving] = useState(false);
  const [businessDocuments, setBusinessDocuments] = useState([]);
  const [documentSavingId, setDocumentSavingId] = useState(null);
  const [rejectionReasons, setRejectionReasons] = useState({});

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

  const loadBadges = async () => {
    try {
      const [badgeList, assignedList] = await Promise.all([
        fetchBadges(),
        fetchBusinessBadges(businessId),
      ]);
      setBadges(Array.isArray(badgeList) ? badgeList : []);
      setAssignedBadges(Array.isArray(assignedList) ? assignedList : []);
    } catch (err) {
      setError('Unable to load badges.');
    }
  };

  const loadBusinessDocuments = async () => {
    try {
      const data = await fetchAdminDocuments({ business_id: Number(businessId) });
      setBusinessDocuments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Unable to load uploaded documents for this business.');
    }
  };

  useEffect(() => {
    if (businessId) {
      loadBusiness();
      loadBadges();
      loadBusinessDocuments();
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

  const handleAssignBadge = async () => {
    if (!selectedBadge) {
      setError('Select a badge to assign.');
      return;
    }
    setBadgeSaving(true);
    setError('');
    try {
      await assignBusinessBadge(businessId, {
        badgeId: Number(selectedBadge),
        evidenceUrl: evidenceUrl || null,
        notes: notes || null,
      });
      setSelectedBadge('');
      setEvidenceUrl('');
      setNotes('');
      await loadBadges();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign badge.');
    } finally {
      setBadgeSaving(false);
    }
  };

  const handleRemoveBadge = async (badgeId) => {
    setBadgeSaving(true);
    setError('');
    try {
      await removeBusinessBadge(businessId, badgeId);
      await loadBadges();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove badge.');
    } finally {
      setBadgeSaving(false);
    }
  };

  const handleReviewDocument = async (documentId, status) => {
    const rejectionReason = (rejectionReasons[documentId] || '').trim();
    if (status === 'Rejected' && !rejectionReason) {
      setError('Please provide a rejection reason before rejecting a document.');
      return;
    }

    setDocumentSavingId(documentId);
    setError('');
    try {
      await reviewAdminDocument(documentId, {
        status,
        rejection_reason: status === 'Rejected' ? rejectionReason : undefined,
      });
      await loadBusinessDocuments();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update document status.');
    } finally {
      setDocumentSavingId(null);
    }
  };

  const assignedBadgeIds = new Set(assignedBadges.map((badge) => badge.badgeId));
  const availableBadges = badges.filter((badge) => !assignedBadgeIds.has(badge.id));

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
          <p>{statusLabelMap[business.verificationStatus] || 'Active'}</p>
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

      <div className="admin-section" style={{ marginTop: 20 }}>
        <h2>Business Verification Documents</h2>
        <p className="admin-muted">This business's uploaded verification files. Review each document in-place.</p>
        {businessDocuments.length === 0 ? (
          <p className="admin-muted">No documents uploaded yet for this business.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Number</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {businessDocuments.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <div>{doc.documentType}</div>
                    <div className="admin-muted">{doc.originalFileName}</div>
                  </td>
                  <td>{doc.documentNumber || <span className="admin-muted">—</span>}</td>
                  <td>
                    <span className="admin-pill">{doc.status}</span>
                    {doc.rejectionReason ? (
                      <div className="admin-muted">Reason: {doc.rejectionReason}</div>
                    ) : null}
                  </td>
                  <td>{doc.submittedAt ? new Date(doc.submittedAt).toLocaleString() : '—'}</td>
                  <td>
                    <div className="admin-actions" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                      {doc.storagePath ? (
                        <a
                          className="admin-button secondary"
                          href={`${API_ORIGIN}${doc.storagePath.startsWith('/') ? doc.storagePath : `/${doc.storagePath}`}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open file
                        </a>
                      ) : null}
                      <button
                        type="button"
                        className="admin-button primary"
                        onClick={() => handleReviewDocument(doc.id, 'Verified')}
                        disabled={documentSavingId === doc.id || doc.status === 'Verified'}
                      >
                        {documentSavingId === doc.id ? 'Saving...' : 'Approve'}
                      </button>
                      <input
                        type="text"
                        className="admin-input"
                        placeholder="Rejection reason"
                        value={rejectionReasons[doc.id] || ''}
                        onChange={(event) =>
                          setRejectionReasons((prev) => ({
                            ...prev,
                            [doc.id]: event.target.value,
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="admin-button danger"
                        onClick={() => handleReviewDocument(doc.id, 'Rejected')}
                        disabled={documentSavingId === doc.id || doc.status === 'Rejected'}
                      >
                        {documentSavingId === doc.id ? 'Saving...' : 'Reject'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="admin-divider" />
      <div className="admin-section">
        <h2>Community Impact Badges</h2>
        <p className="admin-muted">Verified recognition shown on the public profile.</p>
        <div className="admin-form">
          <label>
            Assign a badge
            <select
              className="admin-input"
              value={selectedBadge}
              onChange={(event) => setSelectedBadge(event.target.value)}
            >
              <option value="">Select a badge</option>
              {availableBadges.map((badge) => (
                <option key={badge.id} value={badge.id}>
                  {badge.icon ? `${badge.icon} ` : ''}{badge.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Evidence URL (optional)
            <input
              type="url"
              className="admin-input"
              value={evidenceUrl}
              onChange={(event) => setEvidenceUrl(event.target.value)}
              placeholder="https://example.com/proof"
            />
          </label>
          <label>
            Notes (optional)
            <input
              type="text"
              className="admin-input"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Added after confirming community event."
            />
          </label>
          <button
            type="button"
            className="admin-button primary"
            onClick={handleAssignBadge}
            disabled={badgeSaving}
          >
            {badgeSaving ? 'Saving...' : 'Assign Badge'}
          </button>
        </div>
        {assignedBadges.length === 0 ? (
          <p className="admin-muted">No verified badges assigned yet.</p>
        ) : (
          <div className="admin-badge-list">
            {assignedBadges.map((badge) => (
              <div key={badge.id} className="admin-badge-item">
                <div>
                  <p className="text-strong">{badge.icon ? `${badge.icon} ` : ''}{badge.name}</p>
                  <p className="admin-muted">{badge.description}</p>
                </div>
                <button
                  type="button"
                  className="admin-button danger"
                  onClick={() => handleRemoveBadge(badge.badgeId)}
                  disabled={badgeSaving}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessDetail;
