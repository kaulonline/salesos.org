// Cursor-based pagination types for scalable data loading

export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
  total?: number;
}

// Offset-based pagination (for backward compatibility)
export interface OffsetPaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface OffsetPaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

// Unified pagination state
export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  cursor?: string | null;
}

// Default pagination values
export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

// Helper to create pagination params from state
export function createPaginationParams(state: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): OffsetPaginationParams {
  return {
    page: state.page ?? 1,
    limit: state.limit ?? DEFAULT_PAGE_SIZE,
    sortBy: state.sortBy,
    sortOrder: state.sortOrder,
  };
}

// Helper to extract pagination state from response
export function extractPaginationState<T>(
  response: OffsetPaginatedResponse<T>
): PaginationState {
  return {
    page: response.page,
    limit: response.limit,
    total: response.total,
    totalPages: response.totalPages,
    hasNextPage: response.page < response.totalPages,
    hasPrevPage: response.page > 1,
  };
}
