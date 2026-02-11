import React, { useState } from 'react';
import {
  Search,
  Plus,
  BookOpen,
  MoreHorizontal,
  X,
  Loader2,
  Trash2,
  Edit2,
  DollarSign,
  AlertCircle,
  Check,
  Calendar,
  Copy,
  Star,
  Eye,
  Package,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { useToast } from '../../src/components/ui/Toast';
import { usePriceBooks, usePriceBookEntries } from '../../src/hooks/usePriceBooks';
import { useProducts } from '../../src/hooks/useProducts';
import type {
  PriceBook,
  CreatePriceBookDto,
  UpdatePriceBookDto,
  PriceBookEntry,
  CreatePriceBookEntryDto,
  SUPPORTED_CURRENCIES,
} from '../../src/types/priceBook';

function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export const PriceBooks: React.FC = () => {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPriceBook, setEditingPriceBook] = useState<PriceBook | null>(null);
  const [viewingPriceBook, setViewingPriceBook] = useState<PriceBook | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [cloneModal, setCloneModal] = useState<PriceBook | null>(null);
  const [cloneName, setCloneName] = useState('');

  const {
    priceBooks,
    stats,
    loading,
    create,
    update,
    remove,
    clone,
    isCreating,
    isUpdating,
    isDeleting,
  } = usePriceBooks();

  const filteredPriceBooks = priceBooks.filter(
    (pb) =>
      pb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pb.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreatePriceBook = async (data: CreatePriceBookDto) => {
    try {
      await create(data);
      setShowCreateModal(false);
      showToast({ type: 'success', title: 'Price Book Created' });
    } catch (error) {
      console.error('Failed to create price book:', error);
      showToast({ type: 'error', title: 'Failed to Create Price Book', message: (error as Error).message || 'Please try again' });
    }
  };

  const handleUpdatePriceBook = async (id: string, data: UpdatePriceBookDto) => {
    try {
      await update(id, data);
      setEditingPriceBook(null);
      showToast({ type: 'success', title: 'Price Book Updated' });
    } catch (error) {
      console.error('Failed to update price book:', error);
      showToast({ type: 'error', title: 'Failed to Update Price Book', message: (error as Error).message || 'Please try again' });
    }
  };

  const handleDeletePriceBook = async (id: string) => {
    try {
      await remove(id);
      setDeleteConfirm(null);
      showToast({ type: 'success', title: 'Price Book Deleted' });
    } catch (error) {
      console.error('Failed to delete price book:', error);
      showToast({ type: 'error', title: 'Failed to Delete Price Book', message: (error as Error).message || 'Please try again' });
    }
  };

  const handleClonePriceBook = async () => {
    if (!cloneModal || !cloneName.trim()) return;
    try {
      await clone(cloneModal.id, cloneName.trim());
      setCloneModal(null);
      setCloneName('');
      showToast({ type: 'success', title: 'Price Book Cloned' });
    } catch (error) {
      console.error('Failed to clone price book:', error);
      showToast({ type: 'error', title: 'Failed to Clone Price Book', message: (error as Error).message || 'Please try again' });
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-10 flex flex-col md:flex-row justify-between items-end gap-6">
          <div>
            <Skeleton className="h-10 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-64 rounded-full" />
            <Skeleton className="h-10 w-32 rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[200px] rounded-[2rem]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <h1 className="text-4xl font-medium text-[#1A1A1A] mb-2">Price Books</h1>
          <p className="text-[#666]">Manage pricing tiers and product prices for different markets.</p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search price books..."
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded-full text-sm outline-none shadow-sm focus:ring-1 focus:ring-[#EAD07D]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#1A1A1A] text-white rounded-full text-sm font-bold shadow-lg hover:bg-black transition-all"
          >
            <Plus size={16} /> New Price Book
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
              <BookOpen size={18} className="text-[#1A1A1A]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A1A1A]">{stats.total}</div>
              <div className="text-xs text-[#666]">Total Price Books</div>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <Check size={18} className="text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A1A1A]">{stats.active}</div>
              <div className="text-xs text-[#666]">Active</div>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F8F8F6] flex items-center justify-center">
              <Star size={18} className="text-[#EAD07D]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A1A1A]">{stats.standard}</div>
              <div className="text-xs text-[#666]">Standard</div>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
              <Package size={18} className="text-[#EAD07D]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A1A1A]">{stats.totalEntries}</div>
              <div className="text-xs text-[#666]">Total Entries</div>
            </div>
          </Card>
        </div>
      )}

      {/* Price Books Grid */}
      {filteredPriceBooks.length === 0 ? (
        <Card className="p-12 text-center">
          <BookOpen size={48} className="mx-auto text-[#999] mb-4" />
          <h3 className="text-xl font-medium text-[#1A1A1A] mb-2">
            {searchQuery ? 'No price books found' : 'No price books yet'}
          </h3>
          <p className="text-[#666] mb-6">
            {searchQuery
              ? 'Try a different search term'
              : 'Create your first price book to manage product pricing.'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-black transition-colors"
            >
              <Plus size={18} />
              Create Price Book
            </button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPriceBooks.map((priceBook) => (
            <div
              key={priceBook.id}
              className={`dash-card p-6 group hover:shadow-card transition-all duration-300 relative overflow-hidden ${
                !priceBook.isActive ? 'opacity-60' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  {priceBook.isStandard && (
                    <div className="w-8 h-8 rounded-lg bg-[#EAD07D] flex items-center justify-center">
                      <Star size={14} className="text-[#1A1A1A]" />
                    </div>
                  )}
                  {!priceBook.isStandard && (
                    <div className="w-8 h-8 rounded-lg bg-[#F8F8F6] flex items-center justify-center">
                      <BookOpen size={14} className="text-[#666]" />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {!priceBook.isActive && <Badge variant="neutral" size="sm">Inactive</Badge>}
                  <button
                    onClick={() => setViewingPriceBook(priceBook)}
                    className="w-8 h-8 rounded-full hover:bg-[#F8F8F6] flex items-center justify-center text-[#999] hover:text-[#1A1A1A]"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={() => setEditingPriceBook(priceBook)}
                    className="w-8 h-8 rounded-full hover:bg-[#F8F8F6] flex items-center justify-center text-[#999] hover:text-[#1A1A1A]"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setCloneModal(priceBook);
                      setCloneName(`${priceBook.name} (Copy)`);
                    }}
                    className="w-8 h-8 rounded-full hover:bg-[#F8F8F6] flex items-center justify-center text-[#999] hover:text-[#1A1A1A]"
                  >
                    <Copy size={14} />
                  </button>
                  {!priceBook.isStandard && (
                    <button
                      onClick={() => setDeleteConfirm(priceBook.id)}
                      className="w-8 h-8 rounded-full hover:bg-red-50 flex items-center justify-center text-[#999] hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              <h3 className="text-lg font-bold text-[#1A1A1A] mb-1">{priceBook.name}</h3>
              {priceBook.description && (
                <p className="text-sm text-[#666] mb-4 line-clamp-2">{priceBook.description}</p>
              )}

              <div className="flex items-center gap-2 mb-4">
                <span className="px-2.5 py-1 bg-[#F8F8F6] rounded-md text-xs font-medium text-[#666] flex items-center gap-1">
                  <DollarSign size={12} /> {priceBook.currency}
                </span>
                <span className="px-2.5 py-1 bg-[#F8F8F6] rounded-md text-xs font-medium text-[#666] flex items-center gap-1">
                  <Package size={12} /> {priceBook.entryCount} entries
                </span>
              </div>

              {(priceBook.validFrom || priceBook.validTo) && (
                <div className="text-xs text-[#999] flex items-center gap-1 mb-4">
                  <Calendar size={12} />
                  {priceBook.validFrom && formatDate(priceBook.validFrom)}
                  {priceBook.validFrom && priceBook.validTo && ' - '}
                  {priceBook.validTo && formatDate(priceBook.validTo)}
                </div>
              )}

              <div className="pt-4 border-t border-gray-50">
                <button
                  onClick={() => setViewingPriceBook(priceBook)}
                  className="text-sm text-[#1A1A1A] font-medium hover:underline"
                >
                  View & Edit Entries
                </button>
              </div>
            </div>
          ))}

          {/* Add New Placeholder */}
          {!searchQuery && (
            <div
              onClick={() => setShowCreateModal(true)}
              className="border-2 border-dashed border-[#1A1A1A]/10 rounded-[2rem] p-6 flex flex-col items-center justify-center text-center hover:border-[#EAD07D] hover:bg-[#EAD07D]/5 transition-all cursor-pointer min-h-[200px] group"
            >
              <div className="w-16 h-16 rounded-full bg-[#F2F1EA] flex items-center justify-center text-[#1A1A1A] mb-4 group-hover:scale-110 transition-transform">
                <Plus size={24} />
              </div>
              <h3 className="font-bold text-[#1A1A1A]">Create New Price Book</h3>
              <p className="text-sm text-[#666] mt-2">Add custom pricing for different markets.</p>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingPriceBook) && (
        <PriceBookModal
          priceBook={editingPriceBook}
          onClose={() => {
            setShowCreateModal(false);
            setEditingPriceBook(null);
          }}
          onSave={
            editingPriceBook
              ? (data) => handleUpdatePriceBook(editingPriceBook.id, data)
              : handleCreatePriceBook
          }
          saving={isCreating || isUpdating}
        />
      )}

      {/* View Entries Modal */}
      {viewingPriceBook && (
        <PriceBookEntriesModal
          priceBook={viewingPriceBook}
          onClose={() => setViewingPriceBook(null)}
        />
      )}

      {/* Clone Modal */}
      {cloneModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#EAD07D]/20 flex items-center justify-center">
                <Copy size={20} className="text-[#1A1A1A]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#1A1A1A]">Clone Price Book</h3>
                <p className="text-sm text-[#666]">Create a copy of "{cloneModal.name}"</p>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#666] mb-1">New Name</label>
              <input
                type="text"
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                placeholder="Price book name"
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setCloneModal(null);
                  setCloneName('');
                }}
                className="px-4 py-2 text-sm font-medium text-[#666] hover:text-[#1A1A1A] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClonePriceBook}
                disabled={!cloneName.trim()}
                className="px-4 py-2 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium hover:bg-black transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Copy size={16} />
                Clone
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#1A1A1A]">Delete Price Book</h3>
                <p className="text-sm text-[#666]">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-[#666] hover:text-[#1A1A1A] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeletePriceBook(deleteConfirm)}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Delete
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

// Price Book Modal Component
interface PriceBookModalProps {
  priceBook: PriceBook | null;
  onClose: () => void;
  onSave: (data: CreatePriceBookDto | UpdatePriceBookDto) => Promise<void>;
  saving: boolean;
}

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
];

const PriceBookModal: React.FC<PriceBookModalProps> = ({ priceBook, onClose, onSave, saving }) => {
  const [formData, setFormData] = useState<CreatePriceBookDto>({
    name: priceBook?.name || '',
    description: priceBook?.description || '',
    isStandard: priceBook?.isStandard || false,
    currency: priceBook?.currency || 'USD',
    validFrom: priceBook?.validFrom?.split('T')[0] || '',
    validTo: priceBook?.validTo?.split('T')[0] || '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Price book name is required');
      return;
    }

    try {
      const data = {
        ...formData,
        validFrom: formData.validFrom || undefined,
        validTo: formData.validTo || undefined,
      };
      await onSave(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save price book');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-lg p-6 my-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-[#1A1A1A]">
            {priceBook ? 'Edit Price Book' : 'Create Price Book'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-[#F8F8F6] flex items-center justify-center text-[#666]"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                placeholder="Enterprise Pricing"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm resize-none"
                rows={2}
                placeholder="Pricing for enterprise customers..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Currency</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#666] mb-1">Valid From</label>
                <input
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#666] mb-1">Valid To</label>
                <input
                  type="date"
                  value={formData.validTo}
                  onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-medium text-[#666] hover:text-[#1A1A1A] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium hover:bg-black transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check size={16} />
                  {priceBook ? 'Update' : 'Create'}
                </>
              )}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

// Price Book Entries Modal
interface PriceBookEntriesModalProps {
  priceBook: PriceBook;
  onClose: () => void;
}

const PriceBookEntriesModal: React.FC<PriceBookEntriesModalProps> = ({ priceBook, onClose }) => {
  const { showToast } = useToast();
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');

  const { products } = useProducts({ isActive: true });
  const { entries, loading, addEntry, updateEntry, deleteEntry, isAdding, isUpdating, isDeleting } =
    usePriceBookEntries(priceBook.id);

  const existingProductIds = entries.map((e) => e.productId);
  const availableProducts = products.filter((p) => !existingProductIds.includes(p.id));

  const handleAddEntry = async () => {
    if (!selectedProductId || !newPrice) return;
    try {
      await addEntry({
        productId: selectedProductId,
        unitPrice: parseFloat(newPrice),
      });
      setShowAddEntry(false);
      setSelectedProductId('');
      setNewPrice('');
      showToast({ type: 'success', title: 'Entry Added' });
    } catch (error) {
      console.error('Failed to add entry:', error);
      showToast({ type: 'error', title: 'Failed to Add Entry', message: (error as Error).message || 'Please try again' });
    }
  };

  const handleUpdateEntry = async (entryId: string) => {
    if (!editPrice) return;
    try {
      await updateEntry(entryId, { unitPrice: parseFloat(editPrice) });
      setEditingEntry(null);
      setEditPrice('');
      showToast({ type: 'success', title: 'Entry Updated' });
    } catch (error) {
      console.error('Failed to update entry:', error);
      showToast({ type: 'error', title: 'Failed to Update Entry', message: (error as Error).message || 'Please try again' });
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      await deleteEntry(entryId);
      showToast({ type: 'success', title: 'Entry Deleted' });
    } catch (error) {
      console.error('Failed to delete entry:', error);
      showToast({ type: 'error', title: 'Failed to Delete Entry', message: (error as Error).message || 'Please try again' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-3xl p-6 my-8 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-[#1A1A1A]">{priceBook.name}</h2>
            <p className="text-sm text-[#666]">{priceBook.entryCount} price entries</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddEntry(true)}
              className="flex items-center gap-1 px-4 py-2 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium hover:bg-black transition-colors"
            >
              <Plus size={16} /> Add Product
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-[#F8F8F6] flex items-center justify-center text-[#666]"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Add Entry Form */}
        {showAddEntry && (
          <div className="mb-4 p-4 bg-[#F8F8F6] rounded-xl">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-[#666] mb-1">Product</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#E5E5E5] text-sm"
                >
                  <option value="">Select a product...</option>
                  {availableProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) - List: {formatCurrency(p.listPrice, priceBook.currency)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-32">
                <label className="block text-xs font-medium text-[#666] mb-1">Price</label>
                <input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#E5E5E5] text-sm"
                />
              </div>
              <button
                onClick={handleAddEntry}
                disabled={!selectedProductId || !newPrice || isAdding}
                className="px-4 py-2 bg-[#1A1A1A] text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {isAdding ? <Loader2 size={16} className="animate-spin" /> : 'Add'}
              </button>
              <button
                onClick={() => {
                  setShowAddEntry(false);
                  setSelectedProductId('');
                  setNewPrice('');
                }}
                className="px-4 py-2 text-[#666] hover:text-[#1A1A1A] text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Entries List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12">
              <Package size={48} className="mx-auto text-[#999] mb-4" />
              <p className="text-[#666]">No products added to this price book yet.</p>
              <button
                onClick={() => setShowAddEntry(true)}
                className="mt-4 text-sm text-[#1A1A1A] font-medium hover:underline"
              >
                Add your first product
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 bg-white border border-[#E5E5E5] rounded-xl hover:border-[#EAD07D] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#F8F8F6] flex items-center justify-center">
                      <Package size={16} className="text-[#666]" />
                    </div>
                    <div>
                      <div className="font-medium text-[#1A1A1A]">{entry.product?.name || 'Unknown Product'}</div>
                      <div className="text-xs text-[#666]">{entry.product?.code || entry.productId}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {editingEntry === entry.id ? (
                      <>
                        <input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-24 px-3 py-1.5 rounded-lg bg-[#F8F8F6] border border-[#E5E5E5] text-sm"
                          step="0.01"
                          min="0"
                        />
                        <button
                          onClick={() => handleUpdateEntry(entry.id)}
                          disabled={isUpdating}
                          className="text-green-600 hover:text-green-700"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setEditingEntry(null);
                            setEditPrice('');
                          }}
                          className="text-[#999] hover:text-[#666]"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-lg font-semibold text-[#1A1A1A]">
                          {formatCurrency(entry.unitPrice, priceBook.currency)}
                        </span>
                        <button
                          onClick={() => {
                            setEditingEntry(entry.id);
                            setEditPrice(String(entry.unitPrice));
                          }}
                          className="w-8 h-8 rounded-full hover:bg-[#F8F8F6] flex items-center justify-center text-[#999] hover:text-[#1A1A1A]"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          disabled={isDeleting}
                          className="w-8 h-8 rounded-full hover:bg-red-50 flex items-center justify-center text-[#999] hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default PriceBooks;
