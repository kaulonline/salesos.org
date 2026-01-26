import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, ChevronDown, Check, Search, Star, DollarSign, Loader2 } from 'lucide-react';
import { usePriceBooks } from '../../hooks/usePriceBooks';
import type { PriceBook } from '../../types/priceBook';

interface PriceBookSelectorProps {
  value?: string;
  onSelect: (priceBook: PriceBook | null) => void;
  currency?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function PriceBookSelector({
  value,
  onSelect,
  currency,
  disabled = false,
  placeholder = 'Select price book...',
}: PriceBookSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { priceBooks, loading } = usePriceBooks({ isActive: true });

  // Filter by currency if specified
  const filteredPriceBooks = priceBooks
    .filter((pb) => !currency || pb.currency === currency)
    .filter(
      (pb) =>
        pb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pb.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const selectedPriceBook = priceBooks.find((pb) => pb.id === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (priceBook: PriceBook) => {
    onSelect(priceBook);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(null);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl text-sm transition-all ${
          disabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-[#F8F8F6] hover:bg-[#F2F1EA] text-[#1A1A1A] cursor-pointer'
        } ${isOpen ? 'ring-2 ring-[#EAD07D]' : ''}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen size={16} className="text-[#666] shrink-0" />
          {selectedPriceBook ? (
            <div className="flex items-center gap-2 min-w-0">
              {selectedPriceBook.isStandard && (
                <Star size={12} className="text-[#EAD07D] shrink-0" />
              )}
              <span className="truncate font-medium">{selectedPriceBook.name}</span>
              <span className="text-xs text-[#666] shrink-0">({selectedPriceBook.currency})</span>
            </div>
          ) : (
            <span className="text-[#999]">{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {selectedPriceBook && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-[#999] hover:text-[#666] hover:bg-[#E5E5E5] rounded"
            >
              <span className="text-xs">Clear</span>
            </button>
          )}
          <ChevronDown
            size={16}
            className={`text-[#666] transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-[#E5E5E5] z-50 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-[#F2F1EA]">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search price books..."
                className="w-full pl-8 pr-3 py-2 bg-[#F8F8F6] rounded-lg text-sm outline-none focus:ring-1 focus:ring-[#EAD07D]"
              />
            </div>
          </div>

          {/* Options */}
          <div className="max-h-64 overflow-y-auto p-1">
            {loading ? (
              <div className="flex items-center justify-center py-4 text-[#666]">
                <Loader2 size={16} className="animate-spin mr-2" />
                Loading...
              </div>
            ) : filteredPriceBooks.length === 0 ? (
              <div className="py-4 text-center text-sm text-[#666]">
                {searchQuery ? 'No price books match your search' : 'No active price books available'}
              </div>
            ) : (
              <>
                {/* Standard price book first */}
                {filteredPriceBooks
                  .sort((a, b) => (a.isStandard ? -1 : b.isStandard ? 1 : 0))
                  .map((priceBook) => (
                    <button
                      key={priceBook.id}
                      type="button"
                      onClick={() => handleSelect(priceBook)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        value === priceBook.id
                          ? 'bg-[#EAD07D]/20 text-[#1A1A1A]'
                          : 'hover:bg-[#F8F8F6] text-[#1A1A1A]'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        priceBook.isStandard ? 'bg-[#EAD07D]' : 'bg-[#F2F1EA]'
                      }`}>
                        {priceBook.isStandard ? (
                          <Star size={14} className="text-[#1A1A1A]" />
                        ) : (
                          <BookOpen size={14} className="text-[#666]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{priceBook.name}</span>
                          {priceBook.isStandard && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-[#EAD07D]/30 rounded text-[#1A1A1A]">
                              Standard
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#666]">
                          <span className="flex items-center gap-1">
                            <DollarSign size={10} /> {priceBook.currency}
                          </span>
                          <span>· {priceBook.entryCount} entries</span>
                        </div>
                      </div>
                      {value === priceBook.id && (
                        <Check size={16} className="text-[#1A1A1A] shrink-0" />
                      )}
                    </button>
                  ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PriceBookSelector;
