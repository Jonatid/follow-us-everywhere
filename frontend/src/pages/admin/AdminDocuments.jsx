import React, { useEffect, useMemo, useState } from 'react';
import { fetchAdminDocuments, reviewAdminDocument } from '../../utils/adminApi';
import { toAdminDocumentUrl } from '../../utils/documentUrl';

const STATUS_FILTERS = ['Pending', 'Verified', 'Rejected'];

const AdminDocuments = () => {
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [rejectionReasons, setRejectionReasons] = useState({});

  const loadDocuments = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAdminDocuments(statusFilter ? { status: statusFilter } : undefined);
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Unable to load uploaded documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [statusFilter]);

  const pendingCount = useMemo(
    () => documents.filter((doc) => doc.status === 'Pending').length,
    [documents]
  );

  const handleReview = async (documentId, status) => {
    const rejectionReason = (rejectionReasons[documentId] || '').trim();
    if (status === 'Rejected' && !rejectionReason) {
      setError('Please provide a rejection reason before rejecting a document.');
      return;
    }

    setSavingId(documentId);
    setError('');
    try {
      await reviewAdminDocument(documentId, {
        status,
        rejection_reason: status === 'Rejected' ? rejectionReason : undefined,
      });
      await loadDocuments();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to update document status.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="admin-card">
      <div className="admin-topbar">
        <div>
          <h1>Uploaded Documents</h1>
          <p className="admin-muted">Review business-uploaded LARA and verification documents.</p>
        </div>
        <div>
          <label className="admin-muted" htmlFor="document-status-filter">
            Status
          </label>
          <select
            id="document-status-filter"
            className="admin-input"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            {STATUS_FILTERS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="admin-muted" style={{ marginTop: 0 }}>
        Pending in current view: {pendingCount}
      </p>

      {error && <div className="admin-alert">{error}</div>}

      {loading ? (
        <p className="admin-muted">Loading documents...</p>
      ) : documents.length === 0 ? (
        <p className="admin-muted">No uploaded documents found for this status.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Business</th>
              <th>Document</th>
              <th>Number</th>
              <th>Status</th>
              <th>Submitted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id}>
                <td>
                  <strong>{doc.businessName}</strong>
                  <div className="admin-muted">{doc.businessSlug}</div>
                </td>
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
                      className="admin-button primary"
                      onClick={() => handleReview(doc.id, 'Verified')}
                      disabled={savingId === doc.id || doc.status === 'Verified'}
                    >
                      {savingId === doc.id ? 'Saving...' : 'Approve'}
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
                      onClick={() => handleReview(doc.id, 'Rejected')}
                      disabled={savingId === doc.id || doc.status === 'Rejected'}
                    >
                      {savingId === doc.id ? 'Saving...' : 'Reject'}
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

export default AdminDocuments;
