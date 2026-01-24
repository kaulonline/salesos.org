import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { PaginationState, PAGE_SIZE_OPTIONS } from '../../types/pagination';

interface PaginationProps {
  state: PaginationState;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  showPageSize?: boolean;
  showTotal?: boolean;
  className?: string;
}

export function Pagination({
  state,
  onPageChange,
  onLimitChange,
  showPageSize = true,
  showTotal = true,
  className = '',
}: PaginationProps) {
  const { page, limit, total, totalPages, hasNextPage, hasPrevPage } = state;

  // Calculate visible page numbers
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Calculate middle pages
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      if (start > 2) {
        pages.push('ellipsis');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push('ellipsis');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}
    >
      {/* Results info */}
      {showTotal && (
        <div className="text-sm text-gray-600">
          {total === 0 ? (
            'No results'
          ) : (
            <>
              Showing <span className="font-medium">{startItem}</span> to{' '}
              <span className="font-medium">{endItem}</span> of{' '}
              <span className="font-medium">{total.toLocaleString()}</span> results
            </>
          )}
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* Page size selector */}
        {showPageSize && onLimitChange && (
          <div className="flex items-center gap-2">
            <label htmlFor="page-size" className="text-sm text-gray-600">
              Show
            </label>
            <select
              id="page-size"
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="px-2 py-1 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#EAD07D] focus:border-transparent"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Pagination controls */}
        <nav className="flex items-center gap-1" aria-label="Pagination">
          {/* First page */}
          <button
            onClick={() => onPageChange(1)}
            disabled={!hasPrevPage}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-md disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
            aria-label="First page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          {/* Previous page */}
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={!hasPrevPage}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-md disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Page numbers */}
          <div className="hidden sm:flex items-center gap-1">
            {getPageNumbers().map((pageNum, index) =>
              pageNum === 'ellipsis' ? (
                <span
                  key={`ellipsis-${index}`}
                  className="px-2 py-1 text-gray-400"
                >
                  ...
                </span>
              ) : (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    pageNum === page
                      ? 'bg-[#1A1A1A] text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  aria-current={pageNum === page ? 'page' : undefined}
                >
                  {pageNum}
                </button>
              )
            )}
          </div>

          {/* Mobile page indicator */}
          <span className="sm:hidden px-3 py-1 text-sm text-gray-600">
            {page} / {totalPages}
          </span>

          {/* Next page */}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={!hasNextPage}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-md disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Last page */}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={!hasNextPage}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-md disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
            aria-label="Last page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </nav>
      </div>
    </div>
  );
}

// Compact version for tight spaces
export function PaginationCompact({
  state,
  onPageChange,
  className = '',
}: Omit<PaginationProps, 'showPageSize' | 'showTotal' | 'onLimitChange'>) {
  const { page, totalPages, hasNextPage, hasPrevPage } = state;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={!hasPrevPage}
        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label="Previous"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-sm text-gray-600 min-w-[60px] text-center">
        {page} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={!hasNextPage}
        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label="Next"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
