import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import { useVirtualizer, VirtualItem } from '@tanstack/react-virtual';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number | ((index: number) => number);
  renderItem: (item: T, index: number, virtualItem: VirtualItem) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  className?: string;
  overscan?: number;
  onEndReached?: () => void;
  endReachedThreshold?: number;
  emptyMessage?: string;
  loadingMore?: boolean;
  gap?: number;
  // Accessibility props
  ariaLabel?: string;
  role?: 'list' | 'listbox' | 'grid';
}

export interface VirtualListRef {
  scrollToIndex: (index: number, options?: { align?: 'start' | 'center' | 'end' }) => void;
  scrollToTop: () => void;
  measureElement: (element: HTMLElement | null) => void;
}

function VirtualListInner<T>(
  {
    items,
    itemHeight,
    renderItem,
    keyExtractor,
    className = '',
    overscan = 5,
    onEndReached,
    endReachedThreshold = 200,
    emptyMessage = 'No items',
    loadingMore = false,
    gap = 0,
    ariaLabel,
    role = 'list',
  }: VirtualListProps<T>,
  ref: React.ForwardedRef<VirtualListRef>
) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: typeof itemHeight === 'function' ? itemHeight : () => itemHeight,
    overscan,
    gap,
  });

  useImperativeHandle(ref, () => ({
    scrollToIndex: (index, options) => {
      rowVirtualizer.scrollToIndex(index, options);
    },
    scrollToTop: () => {
      parentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    },
    measureElement: (element) => {
      if (element) {
        rowVirtualizer.measureElement(element);
      }
    },
  }));

  // Handle scroll for infinite loading
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!onEndReached) return;

    const target = e.currentTarget;
    const isNearEnd =
      target.scrollHeight - target.scrollTop - target.clientHeight < endReachedThreshold;

    if (isNearEnd && !loadingMore) {
      onEndReached();
    }
  };

  if (items.length === 0) {
    return (
      <div
        className={`flex items-center justify-center h-64 text-gray-500 ${className}`}
        role="status"
        aria-live="polite"
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${className}`}
      onScroll={handleScroll}
      role={role}
      aria-label={ariaLabel}
      tabIndex={0}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const item = items[virtualItem.index];
          const key = keyExtractor(item, virtualItem.index);

          return (
            <div
              key={key}
              data-index={virtualItem.index}
              ref={rowVirtualizer.measureElement}
              role={role === 'list' ? 'listitem' : role === 'listbox' ? 'option' : 'row'}
              aria-setsize={items.length}
              aria-posinset={virtualItem.index + 1}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {renderItem(item, virtualItem.index, virtualItem)}
            </div>
          );
        })}
      </div>

      {/* Loading more indicator */}
      {loadingMore && (
        <div className="flex items-center justify-center py-4" role="status" aria-live="polite">
          <div className="w-6 h-6 border-2 border-[#EAD07D] border-t-transparent rounded-full animate-spin" aria-hidden="true" />
          <span className="sr-only">Loading more items</span>
        </div>
      )}
    </div>
  );
}

// Export with proper typing for forwardRef
export const VirtualList = forwardRef(VirtualListInner) as <T>(
  props: VirtualListProps<T> & { ref?: React.ForwardedRef<VirtualListRef> }
) => React.ReactElement;

// Horizontal virtual list variant
interface HorizontalVirtualListProps<T> {
  items: T[];
  itemWidth: number | ((index: number) => number);
  renderItem: (item: T, index: number, virtualItem: VirtualItem) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  className?: string;
  overscan?: number;
  gap?: number;
  ariaLabel?: string;
}

export function HorizontalVirtualList<T>({
  items,
  itemWidth,
  renderItem,
  keyExtractor,
  className = '',
  overscan = 3,
  gap = 0,
  ariaLabel,
}: HorizontalVirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: typeof itemWidth === 'function' ? itemWidth : () => itemWidth,
    overscan,
    gap,
  });

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      ref={parentRef}
      className={`overflow-x-auto ${className}`}
      role="list"
      aria-label={ariaLabel}
      aria-orientation="horizontal"
      tabIndex={0}
    >
      <div
        style={{
          width: `${columnVirtualizer.getTotalSize()}px`,
          height: '100%',
          position: 'relative',
        }}
      >
        {columnVirtualizer.getVirtualItems().map((virtualItem) => {
          const item = items[virtualItem.index];
          const key = keyExtractor(item, virtualItem.index);

          return (
            <div
              key={key}
              role="listitem"
              aria-setsize={items.length}
              aria-posinset={virtualItem.index + 1}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                transform: `translateX(${virtualItem.start}px)`,
                width: `${virtualItem.size}px`,
              }}
            >
              {renderItem(item, virtualItem.index, virtualItem)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Loading skeleton for virtual list
export function VirtualListSkeleton({
  count = 10,
  itemHeight = 72,
  className = '',
}: {
  count?: number;
  itemHeight?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse"
          style={{ height: itemHeight }}
        >
          <div className="flex items-center gap-4 p-4 border-b border-gray-100">
            <div className="w-10 h-10 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
