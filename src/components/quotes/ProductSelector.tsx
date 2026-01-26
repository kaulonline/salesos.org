import React, { useState, useRef, useEffect } from 'react';
import { Search, Package, Loader2, Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useProducts } from '../../hooks/useProducts';
import type { Product } from '../../api/products';

interface ProductSelectorProps {
  value?: string;
  onSelect: (product: Product) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  excludeIds?: string[];
}

const formatCurrency = (amount: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatBillingFrequency = (frequency: string) => {
  const labels: Record<string, string> = {
    ONE_TIME: '',
    MONTHLY: '/mo',
    QUARTERLY: '/qtr',
    ANNUAL: '/yr',
    USAGE_BASED: '/use',
  };
  return labels[frequency] || '';
};

export function ProductSelector({
  value,
  onSelect,
  placeholder = 'Search products...',
  disabled = false,
  className,
  excludeIds = [],
}: ProductSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { products, loading } = useProducts({ isActive: true });

  // Filter products based on search and exclude list
  const filteredProducts = products.filter((p) => {
    if (excludeIds.includes(p.id)) return false;
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(searchLower) ||
      p.sku.toLowerCase().includes(searchLower) ||
      p.description?.toLowerCase().includes(searchLower)
    );
  });

  // Find selected product
  const selectedProduct = products.find((p) => p.id === value);

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (product: Product) => {
    onSelect(product);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-white border rounded-xl text-left transition-all',
          isOpen ? 'border-[#EAD07D] ring-2 ring-[#EAD07D]/20' : 'border-[#E5E5E5] hover:border-[#CCC]',
          disabled && 'opacity-50 cursor-not-allowed bg-gray-50'
        )}
      >
        {selectedProduct ? (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#F2F1EA] flex items-center justify-center flex-shrink-0">
              <Package size={14} className="text-[#666]" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-[#1A1A1A] truncate">
                {selectedProduct.name}
              </div>
              <div className="text-[10px] text-[#888] truncate">
                {selectedProduct.sku} · {formatCurrency(selectedProduct.listPrice, selectedProduct.currency)}
                {formatBillingFrequency(selectedProduct.billingFrequency)}
              </div>
            </div>
          </div>
        ) : (
          <span className="text-sm text-[#999]">{placeholder}</span>
        )}
        <ChevronDown
          size={16}
          className={cn('text-[#888] transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or SKU..."
                className="w-full pl-9 pr-4 py-2 bg-[#F8F8F6] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EAD07D] placeholder:text-[#999]"
              />
            </div>
          </div>

          {/* Products List */}
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-[#999]" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-8 text-center">
                <Package size={24} className="mx-auto text-[#CCC] mb-2" />
                <p className="text-sm text-[#888]">
                  {search ? 'No products match your search' : 'No products available'}
                </p>
              </div>
            ) : (
              filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleSelect(product)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#F8F8F6]',
                    value === product.id && 'bg-[#EAD07D]/10'
                  )}
                >
                  <div
                    className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                      value === product.id ? 'bg-[#EAD07D]' : 'bg-[#F2F1EA]'
                    )}
                  >
                    {value === product.id ? (
                      <Check size={14} className="text-[#1A1A1A]" />
                    ) : (
                      <Package size={14} className="text-[#666]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-[#1A1A1A] truncate">
                        {product.name}
                      </span>
                      <span className="text-sm font-semibold text-[#1A1A1A] flex-shrink-0">
                        {formatCurrency(product.listPrice, product.currency)}
                        <span className="text-[10px] text-[#888] font-normal">
                          {formatBillingFrequency(product.billingFrequency)}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-[#888] font-mono">{product.sku}</span>
                      <span className="text-[10px] text-[#CCC]">·</span>
                      <span className="text-[10px] text-[#888] capitalize">
                        {product.type.toLowerCase().replace('_', ' ')}
                      </span>
                      {!product.isActive && (
                        <>
                          <span className="text-[10px] text-[#CCC]">·</span>
                          <span className="text-[10px] text-amber-600">Inactive</span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductSelector;
