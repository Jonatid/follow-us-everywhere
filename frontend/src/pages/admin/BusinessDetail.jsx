import React, { useEffect, useState } from 'react';
import {
  approveBusiness,
  blockBusiness,
  deleteAdminDocument,
  fetchAdminDocuments,
  fetchBusiness,
  fetchBadgeRequests,
  reviewBadgeRequest,
  reviewAdminDocument,
} from '../../utils/adminApi';
import { toAdminDocumentUrl } from '../../utils/documentUrl';


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
  const [badgeRequests, setBadgeRequests] = useState([]);
  const [badgeSaving, setBadgeSaving] = useState(false);
  const [badgeRejectionReasons, setBadgeRejectionReasons] = useState({});
  const [businessDocuments, setBusinessDocuments] = useState([]);
  const [documentSavingId, setDocumentSavingId] = useState(null);
  const [documentDeletingId, setDocumentDeletingId] = useState(null);
  const [rejectionReasons, setRejectionReasons] = useState({});
  const [adminActionError, setAdminActionError] = useState('');
  const [badgeActionErrors, setBadgeActionErrors] = useState({});
  const [documentActionErrors, setDocumentActionErrors] = useState({});

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

  const loadBadgeRequests = async () => {
    try {
      const requests = await fetchBadgeRequests();
      const normalized = Array.isArray(requests) ? requests.filter((item) => Number(item.businessId) === Number(businessId)) : [];
      setBadgeRequests(normalized);
    } catch (err) {
      setError('Unable to load badge requests.');
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
      loadBadgeRequests();
      loadBusinessDocuments();
    }
  }, [businessId]);

  const handleApprove = async () => {
    setAdminActionError('');
    try {
      await approveBusiness(businessId);
      await loadBusiness();
    } catch (err) {
      setAdminActionError('Failed to approve business.');
    }
  };

  const handleBlock = async () => {
    setAdminActionError('');
    try {
      await blockBusiness(businessId);
      await loadBusiness();
    } catch (err) {
      setAdminActionError('Failed to block business.');
    }
  };



  const handleReviewBadgeRequest = async (requestId, status) => {
    const rejectionReason = (badgeRejectionReasons[requestId] || '').trim();
    if (status === 'Rejected' && !rejectionReason) {
      setBadgeActionErrors((prev) => ({
        ...prev,
        [requestId]: 'Please provide a rejection reason before rejecting a badge request.',
      }));
      return;
    }

    setBadgeSaving(true);
    setBadgeActionErrors((prev) => ({ ...prev, [requestId]: '' }));
    try {
      await reviewBadgeRequest(requestId, {
        status,
        rejection_reason: status === 'Rejected' ? rejectionReason : undefined,
      });
      await loadBadgeRequests();
    } catch (err) {
      setBadgeActionErrors((prev) => ({
        ...prev,
        [requestId]: err.response?.data?.message || 'Failed to review badge request.',
      }));
    } finally {
      setBadgeSaving(false);
    }
  };



  const handleDeleteDocument = async (documentId) => {
    setDocumentDeletingId(documentId);
    setDocumentActionErrors((prev) => ({ ...prev, [documentId]: '' }));
    try {
      await deleteAdminDocument(documentId);
      await loadBusinessDocuments();
    } catch (err) {
      setDocumentActionErrors((prev) => ({
        ...prev,
        [documentId]: err?.response?.data?.message || 'Failed to delete document.',
      }));
    } finally {
      setDocumentDeletingId(null);
    }
  };

  const handleReviewDocument = async (documentId, status) => {
    const rejectionReason = (rejectionReasons[documentId] || '').trim();
    if (status === 'Rejected' && !rejectionReason) {
      setDocumentActionErrors((prev) => ({
        ...prev,
        [documentId]: 'Please provide a rejection reason before rejecting a document.',
      }));
      return;
    }

    setDocumentSavingId(documentId);
    setDocumentActionErrors((prev) => ({ ...prev, [documentId]: '' }));
    try {
      await reviewAdminDocument(documentId, {
        status,
        rejection_reason: status === 'Rejected' ? rejectionReason : undefined,
      });
      await loadBusinessDocuments();
    } catch (err) {
      setDocumentActionErrors((prev) => ({
        ...prev,
        [documentId]: err?.response?.data?.message || 'Failed to update document status.',
      }));
    } finally {
      setDocumentSavingId(null);
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
      {adminActionError ? <div className="admin-alert" style={{ marginTop: 12 }}>{adminActionError}</div> : null}

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
                      {toAdminDocumentUrl(doc.storagePath) ? (
                        <a
                          className="admin-button secondary"
                          href={toAdminDocumentUrl(doc.storagePath)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open file
                        </a>
                      ) : null}
                      <button
                        type="button"
                        className="admin-button secondary"
                        onClick={() => handleDeleteDocument(doc.id)}
                        disabled={documentDeletingId === doc.id || documentSavingId === doc.id}
                        aria-label={`Delete ${doc.originalFileName}`}
                      >
                        {documentDeletingId === doc.id ? 'Deleting...' : '× Delete'}
                      </button>
                      <button
                        type="button"
                        className="admin-button primary"
                        onClick={() => handleReviewDocument(doc.id, 'Verified')}
                        disabled={documentSavingId === doc.id || documentDeletingId === doc.id || doc.status === 'Verified'}
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
                        disabled={documentSavingId === doc.id || documentDeletingId === doc.id || doc.status === 'Rejected'}
                      >
                        {documentSavingId === doc.id ? 'Saving...' : 'Reject'}
                      </button>
                      {documentActionErrors[doc.id] ? (
                        <div className="admin-alert" style={{ marginTop: 8 }}>
                          {documentActionErrors[doc.id]}
                        </div>
                      ) : null}
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
        <h2>Community Impact Badge Requests</h2>
        <p className="admin-muted">Approve requested badges or reject with a required reason.</p>
        {badgeRequests.length === 0 ? (
          <p className="admin-muted">No badge requests submitted yet.</p>
        ) : (
          <div className="admin-badge-list">
            {badgeRequests.map((request) => (
              <div key={request.id} className="admin-badge-item">
                <div className="admin-badge-fields">
                  <p className="text-strong">{request.badgeName}</p>
                  <p className="admin-muted">Category: {request.badgeCategory || '—'}</p>
                  <p className="admin-muted">Status: {request.status}</p>
                  {request.businessNotes ? <p className="admin-muted">Business notes: {request.businessNotes}</p> : null}
                  {request.evidenceUrl ? (
                    <p className="admin-muted">
                      Evidence URL: <a href={request.evidenceUrl} target="_blank" rel="noreferrer">{request.evidenceUrl}</a>
                    </p>
                  ) : null}
                  {request.evidenceExplanation ? <p className="admin-muted">URL proof explanation: {request.evidenceExplanation}</p> : null}
                  {request.linkedDocumentOriginalFileName ? (
                    <p className="admin-muted">
                      Supporting document: {toAdminDocumentUrl(request.linkedDocumentStoragePath) ? (
                        <a href={toAdminDocumentUrl(request.linkedDocumentStoragePath)} target="_blank" rel="noreferrer">
                          {request.linkedDocumentOriginalFileName}
                        </a>
                      ) : request.linkedDocumentOriginalFileName}
                    </p>
                  ) : null}
                  {request.rejectionReason ? <p className="admin-muted">Rejection reason: {request.rejectionReason}</p> : null}
                </div>
                <div className="admin-actions" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <button
                    type="button"
                    className="admin-button primary"
                    onClick={() => handleReviewBadgeRequest(request.id, 'Approved')}
                    disabled={badgeSaving || request.status === 'Approved'}
                  >
                    {badgeSaving ? 'Saving...' : 'Approve Badge'}
                  </button>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="Rejection reason"
                    value={badgeRejectionReasons[request.id] || ''}
                    onChange={(event) =>
                      setBadgeRejectionReasons((prev) => ({
                        ...prev,
                        [request.id]: event.target.value,
                      }))
                    }
                  />
                  <button
                    type="button"
                    className="admin-button danger"
                    onClick={() => handleReviewBadgeRequest(request.id, 'Rejected')}
                    disabled={badgeSaving || request.status === 'Rejected'}
                  >
                    {badgeSaving ? 'Saving...' : 'Reject Badge'}
                  </button>
                  {badgeActionErrors[request.id] ? (
                    <div className="admin-alert" style={{ marginTop: 8 }}>
                      {badgeActionErrors[request.id]}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessDetail;
