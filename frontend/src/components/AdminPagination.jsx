import React from 'react';

const AdminPagination = ({ limit, offset, total, hasMore, onPageChange, disabled = false }) => {
  const safeLimit = Number(limit) || 25;
  const safeOffset = Number(offset) || 0;
  const safeTotal = Number(total) || 0;
  const currentPage = Math.floor(safeOffset / safeLimit) + 1;
  const totalPages = Math.max(1, Math.ceil(safeTotal / safeLimit));
  const canGoPrevious = safeOffset > 0;

  return (
    <div className="admin-pagination" aria-label="Pagination controls">
      <span className="admin-muted">
        Page {currentPage} of {totalPages} · {safeTotal} total
      </span>
      <div className="admin-actions">
        <button
          type="button"
          className="admin-button secondary"
          disabled={disabled || !canGoPrevious}
          onClick={() => onPageChange(Math.max(0, safeOffset - safeLimit))}
        >
          Previous
        </button>
        <button
          type="button"
          className="admin-button secondary"
          disabled={disabled || !hasMore}
          onClick={() => onPageChange(safeOffset + safeLimit)}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default AdminPagination;
