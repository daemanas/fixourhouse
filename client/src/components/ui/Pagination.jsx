import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({ page, totalPages, onPageChange, totalItems, pageSize }) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push('...');
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Showing <span className="font-medium text-ink-light dark:text-ink-dark">{startItem}</span> to{' '}
        <span className="font-medium text-ink-light dark:text-ink-dark">{endItem}</span> of{' '}
        <span className="font-medium text-ink-light dark:text-ink-dark">{totalItems}</span> results
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="p-2 rounded-lg border border-border-light dark:border-border-dark hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {getPageNumbers().map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="px-2 text-gray-400">
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                p === page
                  ? 'bg-primary-600 text-white'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-ink-light dark:text-ink-dark'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="p-2 rounded-lg border border-border-light dark:border-border-dark hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default Pagination;