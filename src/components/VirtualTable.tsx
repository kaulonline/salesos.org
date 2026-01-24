import React, { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface Column<T> {
  id: string;
  header: React.ReactNode;
  accessor: keyof T | ((row: T) => React.ReactNode);
  width?: number | string;
  minWidth?: number;
  className?: string;
  headerClassName?: string;
}

interface VirtualTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowHeight?: number;
  headerHeight?: number;
  className?: string;
  onRowClick?: (row: T, index: number) => void;
  onRowHover?: (row: T | null, index: number | null) => void;
  rowKey: keyof T | ((row: T) => string);
  emptyMessage?: string;
  stickyHeader?: boolean;
}

export function VirtualTable<T>({
  data,
  columns,
  rowHeight = 56,
  headerHeight = 48,
  className = '',
  onRowClick,
  onRowHover,
  rowKey,
  emptyMessage = 'No data available',
  stickyHeader = true,
}: VirtualTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 10, // Render 10 extra rows for smooth scrolling
  });

  const getRowKey = (row: T): string => {
    if (typeof rowKey === 'function') {
      return rowKey(row);
    }
    return String(row[rowKey]);
  };

  const getCellValue = (row: T, accessor: Column<T>['accessor']): React.ReactNode => {
    if (typeof accessor === 'function') {
      return accessor(row);
    }
    return row[accessor] as React.ReactNode;
  };

  // Calculate column widths
  const columnStyles = useMemo(() => {
    return columns.map((col) => ({
      width: col.width ?? 'auto',
      minWidth: col.minWidth ?? 100,
    }));
  }, [columns]);

  if (data.length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
        {/* Header */}
        <div
          className="grid border-b border-gray-200 bg-gray-50"
          style={{
            gridTemplateColumns: columnStyles.map((s) => `minmax(${s.minWidth}px, ${typeof s.width === 'number' ? `${s.width}px` : s.width})`).join(' '),
            height: headerHeight,
          }}
        >
          {columns.map((col) => (
            <div
              key={col.id}
              className={`flex items-center px-4 text-sm font-medium text-gray-700 ${col.headerClassName ?? ''}`}
            >
              {col.header}
            </div>
          ))}
        </div>
        {/* Empty state */}
        <div className="flex items-center justify-center h-64 text-gray-500">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Sticky Header */}
      {stickyHeader && (
        <div
          className="grid border-b border-gray-200 bg-gray-50 sticky top-0 z-10"
          style={{
            gridTemplateColumns: columnStyles.map((s) => `minmax(${s.minWidth}px, ${typeof s.width === 'number' ? `${s.width}px` : s.width})`).join(' '),
            height: headerHeight,
          }}
        >
          {columns.map((col) => (
            <div
              key={col.id}
              className={`flex items-center px-4 text-sm font-medium text-gray-700 ${col.headerClassName ?? ''}`}
            >
              {col.header}
            </div>
          ))}
        </div>
      )}

      {/* Virtual scrolling container */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ maxHeight: 'calc(100vh - 300px)' }}
      >
        {/* Non-sticky header inside scroll area */}
        {!stickyHeader && (
          <div
            className="grid border-b border-gray-200 bg-gray-50"
            style={{
              gridTemplateColumns: columnStyles.map((s) => `minmax(${s.minWidth}px, ${typeof s.width === 'number' ? `${s.width}px` : s.width})`).join(' '),
              height: headerHeight,
            }}
          >
            {columns.map((col) => (
              <div
                key={col.id}
                className={`flex items-center px-4 text-sm font-medium text-gray-700 ${col.headerClassName ?? ''}`}
              >
                {col.header}
              </div>
            ))}
          </div>
        )}

        {/* Virtual row container */}
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = data[virtualRow.index];
            const key = getRowKey(row);

            return (
              <div
                key={key}
                className={`grid absolute left-0 w-full border-b border-gray-100 ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors`}
                style={{
                  gridTemplateColumns: columnStyles.map((s) => `minmax(${s.minWidth}px, ${typeof s.width === 'number' ? `${s.width}px` : s.width})`).join(' '),
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                onClick={() => onRowClick?.(row, virtualRow.index)}
                onMouseEnter={() => onRowHover?.(row, virtualRow.index)}
                onMouseLeave={() => onRowHover?.(null, null)}
              >
                {columns.map((col) => (
                  <div
                    key={col.id}
                    className={`flex items-center px-4 text-sm text-gray-900 truncate ${col.className ?? ''}`}
                  >
                    {getCellValue(row, col.accessor)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Simple loading skeleton for the table
export function VirtualTableSkeleton({
  columns,
  rows = 10,
  rowHeight = 56,
  headerHeight = 48,
}: {
  columns: number;
  rows?: number;
  rowHeight?: number;
  headerHeight?: number;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header skeleton */}
      <div
        className="grid border-b border-gray-200 bg-gray-50"
        style={{
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          height: headerHeight,
        }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="flex items-center px-4">
            <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Rows skeleton */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="grid border-b border-gray-100"
          style={{
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            height: rowHeight,
          }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="flex items-center px-4">
              <div
                className="h-4 bg-gray-100 rounded animate-pulse"
                style={{ width: `${Math.random() * 40 + 40}%` }}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
