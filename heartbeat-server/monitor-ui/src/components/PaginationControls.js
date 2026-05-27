function PaginationControls({ page = 1, totalPages = 1, onPageChange }) {
  return (
    <div className="pagination-row">
      <button type="button" className="action-button secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Previous
      </button>
      <div className="pagination-copy">
        Page {page} of {Math.max(1, totalPages)}
      </div>
      <button
        type="button"
        className="action-button secondary"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>
    </div>
  );
}

export default PaginationControls;
