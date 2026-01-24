import { useState, useCallback, useMemo } from 'react';
import {
  PaginationState,
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
} from '../types/pagination';

interface UsePaginationOptions {
  initialPage?: number;
  initialLimit?: number;
  total?: number;
}

interface UsePaginationReturn {
  page: number;
  limit: number;
  offset: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
  setTotal: (total: number) => void;
  state: PaginationState;
  reset: () => void;
}

export function usePagination({
  initialPage = 1,
  initialLimit = DEFAULT_PAGE_SIZE,
  total: initialTotal = 0,
}: UsePaginationOptions = {}): UsePaginationReturn {
  const [page, setPageState] = useState(initialPage);
  const [limit, setLimitState] = useState(initialLimit);
  const [total, setTotal] = useState(initialTotal);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit]
  );

  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  const offset = (page - 1) * limit;

  const setPage = useCallback(
    (newPage: number) => {
      const validPage = Math.max(1, Math.min(newPage, totalPages || 1));
      setPageState(validPage);
    },
    [totalPages]
  );

  const setLimit = useCallback((newLimit: number) => {
    const validLimit = PAGE_SIZE_OPTIONS.includes(newLimit as typeof PAGE_SIZE_OPTIONS[number])
      ? newLimit
      : DEFAULT_PAGE_SIZE;
    setLimitState(validLimit);
    setPageState(1); // Reset to first page when limit changes
  }, []);

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setPageState((p) => p + 1);
    }
  }, [hasNextPage]);

  const prevPage = useCallback(() => {
    if (hasPrevPage) {
      setPageState((p) => p - 1);
    }
  }, [hasPrevPage]);

  const firstPage = useCallback(() => {
    setPageState(1);
  }, []);

  const lastPage = useCallback(() => {
    setPageState(totalPages);
  }, [totalPages]);

  const reset = useCallback(() => {
    setPageState(initialPage);
    setLimitState(initialLimit);
    setTotal(initialTotal);
  }, [initialPage, initialLimit, initialTotal]);

  const state: PaginationState = useMemo(
    () => ({
      page,
      limit,
      total,
      totalPages,
      hasNextPage,
      hasPrevPage,
    }),
    [page, limit, total, totalPages, hasNextPage, hasPrevPage]
  );

  return {
    page,
    limit,
    offset,
    total,
    totalPages,
    hasNextPage,
    hasPrevPage,
    setPage,
    setLimit,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    setTotal,
    state,
    reset,
  };
}

// Hook for cursor-based pagination (for infinite scroll)
export function useCursorPagination<T>() {
  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const addItems = useCallback((newItems: T[], nextCursor: string | null) => {
    setItems((prev) => [...prev, ...newItems]);
    setCursor(nextCursor);
    setHasMore(nextCursor !== null);
  }, []);

  const reset = useCallback(() => {
    setItems([]);
    setCursor(null);
    setHasMore(true);
    setIsLoadingMore(false);
  }, []);

  const startLoading = useCallback(() => {
    setIsLoadingMore(true);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoadingMore(false);
  }, []);

  return {
    items,
    cursor,
    hasMore,
    isLoadingMore,
    addItems,
    reset,
    startLoading,
    stopLoading,
    setItems,
  };
}
