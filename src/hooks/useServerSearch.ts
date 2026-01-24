import { useState, useCallback, useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useDebounce } from './useDebounce';

interface SearchFilters {
  [key: string]: string | number | boolean | undefined;
}

interface UseServerSearchOptions<T, F extends SearchFilters> {
  queryKey: string;
  searchFn: (query: string, filters?: F) => Promise<T[]>;
  debounceMs?: number;
  minQueryLength?: number;
  enabled?: boolean;
  initialFilters?: F;
  staleTime?: number;
}

interface UseServerSearchReturn<T, F extends SearchFilters> {
  query: string;
  setQuery: (query: string) => void;
  debouncedQuery: string;
  filters: F | undefined;
  setFilters: (filters: F | undefined) => void;
  updateFilter: <K extends keyof F>(key: K, value: F[K]) => void;
  clearFilters: () => void;
  results: T[];
  isLoading: boolean;
  isSearching: boolean;
  error: Error | null;
  isEmpty: boolean;
  hasQuery: boolean;
  refetch: () => void;
}

export function useServerSearch<T, F extends SearchFilters = SearchFilters>({
  queryKey,
  searchFn,
  debounceMs = 300,
  minQueryLength = 0,
  enabled = true,
  initialFilters,
  staleTime = 30 * 1000,
}: UseServerSearchOptions<T, F>): UseServerSearchReturn<T, F> {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<F | undefined>(initialFilters);

  const debouncedQuery = useDebounce(query, debounceMs);

  const shouldSearch = enabled && debouncedQuery.length >= minQueryLength;

  const searchQuery = useQuery({
    queryKey: [queryKey, 'search', debouncedQuery, filters],
    queryFn: () => searchFn(debouncedQuery, filters),
    enabled: shouldSearch,
    staleTime,
    placeholderData: keepPreviousData,
  });

  const updateFilter = useCallback(<K extends keyof F>(key: K, value: F[K]) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    } as F));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const isSearching = query !== debouncedQuery;

  return useMemo(() => ({
    query,
    setQuery,
    debouncedQuery,
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    results: searchQuery.data ?? [],
    isLoading: searchQuery.isLoading,
    isSearching,
    error: searchQuery.error as Error | null,
    isEmpty: !searchQuery.isLoading && (searchQuery.data?.length ?? 0) === 0,
    hasQuery: debouncedQuery.length > 0,
    refetch: searchQuery.refetch,
  }), [
    query,
    debouncedQuery,
    filters,
    updateFilter,
    clearFilters,
    searchQuery.data,
    searchQuery.isLoading,
    searchQuery.error,
    searchQuery.refetch,
    isSearching,
  ]);
}

// Specialized search hook for global search across entities
interface GlobalSearchResult {
  type: 'lead' | 'contact' | 'company' | 'deal' | 'task' | 'meeting';
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  metadata?: Record<string, unknown>;
}

interface UseGlobalSearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
  enabled?: boolean;
}

export function useGlobalSearch({
  debounceMs = 300,
  minQueryLength = 2,
  enabled = true,
}: UseGlobalSearchOptions = {}) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, debounceMs);

  const shouldSearch = enabled && debouncedQuery.length >= minQueryLength;

  // This would hit a global search endpoint that searches across all entities
  const searchQuery = useQuery({
    queryKey: ['global-search', debouncedQuery],
    queryFn: async (): Promise<GlobalSearchResult[]> => {
      // Placeholder - would call actual API
      // const response = await api.get('/search', { params: { q: debouncedQuery } });
      // return response.data;
      return [];
    },
    enabled: shouldSearch,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });

  // Group results by type
  const groupedResults = useMemo(() => {
    const groups: Record<string, GlobalSearchResult[]> = {};

    (searchQuery.data ?? []).forEach((result) => {
      if (!groups[result.type]) {
        groups[result.type] = [];
      }
      groups[result.type].push(result);
    });

    return groups;
  }, [searchQuery.data]);

  const isSearching = query !== debouncedQuery;

  return {
    query,
    setQuery,
    debouncedQuery,
    results: searchQuery.data ?? [],
    groupedResults,
    isLoading: searchQuery.isLoading,
    isSearching,
    error: searchQuery.error as Error | null,
    isEmpty: !searchQuery.isLoading && (searchQuery.data?.length ?? 0) === 0,
    hasQuery: debouncedQuery.length >= minQueryLength,
    clear: () => setQuery(''),
  };
}

// Hook for search suggestions/autocomplete
interface UseSearchSuggestionsOptions<T> {
  queryKey: string;
  suggestFn: (query: string) => Promise<T[]>;
  debounceMs?: number;
  minQueryLength?: number;
  maxSuggestions?: number;
}

export function useSearchSuggestions<T>({
  queryKey,
  suggestFn,
  debounceMs = 150,
  minQueryLength = 1,
  maxSuggestions = 10,
}: UseSearchSuggestionsOptions<T>) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(query, debounceMs);

  const shouldFetch = debouncedQuery.length >= minQueryLength && isOpen;

  const suggestQuery = useQuery({
    queryKey: [queryKey, 'suggestions', debouncedQuery],
    queryFn: () => suggestFn(debouncedQuery),
    enabled: shouldFetch,
    staleTime: 60 * 1000, // Suggestions can be cached longer
    select: (data) => data.slice(0, maxSuggestions),
    placeholderData: keepPreviousData,
  });

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const clear = useCallback(() => {
    setQuery('');
    setIsOpen(false);
  }, []);

  return {
    query,
    setQuery,
    isOpen,
    open,
    close,
    clear,
    suggestions: suggestQuery.data ?? [],
    isLoading: suggestQuery.isLoading,
    error: suggestQuery.error as Error | null,
  };
}
