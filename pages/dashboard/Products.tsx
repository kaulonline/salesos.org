import React, { useState } from 'react';
import { Search, Plus, Package, Tag, MoreHorizontal, X, Loader2, Trash2, Edit2, DollarSign, AlertCircle, Check } from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { useProducts } from '../../src/hooks/useProducts';
import type { Product, CreateProductDto, ProductType, ProductCategory, BillingFrequency } from '../../src/api/products';

const TYPE_COLORS: Record<ProductType, string> = {
  PRODUCT: 'bg-[#EAD07D]',
  SERVICE: 'bg-blue-500',
  SUBSCRIPTION: 'bg-[#1A1A1A]',
  LICENSE: 'bg-purple-500',
  BUNDLE: 'bg-green-500',
};

const TYPE_LABELS: Record<ProductType, string> = {
  PRODUCT: 'Product',
  SERVICE: 'Service',
  SUBSCRIPTION: 'Subscription',
  LICENSE: 'License',
  BUNDLE: 'Bundle',
};

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  SOFTWARE: 'Software',
  HARDWARE: 'Hardware',
  CONSULTING: 'Consulting',
  TRAINING: 'Training',
  SUPPORT: 'Support',
  OTHER: 'Other',
};

const BILLING_LABELS: Record<BillingFrequency, string> = {
  ONE_TIME: 'One-time',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  ANNUAL: 'Annual',
  USAGE_BASED: 'Usage-based',
};

function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export const Products: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const {
    products,
    stats,
    loading,
    create,
    update,
    delete: deleteProduct,
    creating,
    updating,
    deleting,
  } = useProducts({ search: searchQuery || undefined });

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateProduct = async (data: CreateProductDto) => {
    try {
      await create(data);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create product:', error);
    }
  };

  const handleUpdateProduct = async (id: string, data: Partial<CreateProductDto>) => {
    try {
      await update(id, data);
      setEditingProduct(null);
    } catch (error) {
      console.error('Failed to update product:', error);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteProduct(id);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete product:', error);
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
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-[260px] rounded-[2rem]" />
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
          <h1 className="text-4xl font-medium text-[#1A1A1A] mb-2">Product Catalog</h1>
          <p className="text-[#666]">Manage services, subscriptions, and pricing.</p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded-full text-sm outline-none shadow-sm focus:ring-1 focus:ring-[#EAD07D]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#1A1A1A] text-white rounded-full text-sm font-bold shadow-lg hover:bg-black transition-all"
          >
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
              <Package size={18} className="text-[#1A1A1A]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A1A1A]">{stats.total}</div>
              <div className="text-xs text-[#666]">Total Products</div>
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
              <Tag size={18} className="text-[#666]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A1A1A]">{stats.byType.length}</div>
              <div className="text-xs text-[#666]">Types</div>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
              <DollarSign size={18} className="text-[#EAD07D]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A1A1A]">
                {stats.byType.length > 0
                  ? formatCurrency(stats.byType.reduce((sum, t) => sum + t.avgPrice, 0) / stats.byType.length)
                  : '$0'}
              </div>
              <div className="text-xs text-[#666]">Avg Price</div>
            </div>
          </Card>
        </div>
      )}

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <Card className="p-12 text-center">
          <Package size={48} className="mx-auto text-[#999] mb-4" />
          <h3 className="text-xl font-medium text-[#1A1A1A] mb-2">
            {searchQuery ? 'No products found' : 'No products yet'}
          </h3>
          <p className="text-[#666] mb-6">
            {searchQuery
              ? 'Try a different search term'
              : 'Add your first product to start building your catalog.'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-black transition-colors"
            >
              <Plus size={18} />
              Create Product
            </button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className={`dash-card p-6 group hover:shadow-card transition-all duration-300 relative overflow-hidden ${
                !product.isActive ? 'opacity-60' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`w-12 h-12 rounded-2xl ${TYPE_COLORS[product.type]} flex items-center justify-center text-white shadow-sm`}>
                  <Package size={20} />
                </div>
                <div className="flex items-center gap-1">
                  {!product.isActive && (
                    <Badge variant="neutral" size="sm">Inactive</Badge>
                  )}
                  <div className="relative">
                    <button
                      onClick={() => setEditingProduct(product)}
                      className="w-8 h-8 rounded-full hover:bg-[#F8F8F6] flex items-center justify-center text-[#999] hover:text-[#1A1A1A]"
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                  <button
                    onClick={() => setDeleteConfirm(product.id)}
                    className="w-8 h-8 rounded-full hover:bg-red-50 flex items-center justify-center text-[#999] hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-bold text-[#1A1A1A] mb-1">{product.name}</h3>
              <div className="text-xs text-[#999] font-mono mb-2">{product.sku}</div>
              {product.description && (
                <p className="text-sm text-[#666] mb-4 line-clamp-2">{product.description}</p>
              )}

              <div className="flex items-center gap-2 mb-6">
                <span className="px-2.5 py-1 bg-[#F8F8F6] rounded-md text-xs font-medium text-[#666] flex items-center gap-1">
                  <Tag size={12} /> {TYPE_LABELS[product.type]}
                </span>
                <span className="px-2.5 py-1 bg-[#F8F8F6] rounded-md text-xs font-medium text-[#666]">
                  {BILLING_LABELS[product.billingFrequency]}
                </span>
              </div>

              <div className="flex items-baseline justify-between pt-6 border-t border-gray-50">
                <div className="text-2xl font-medium text-[#1A1A1A]">
                  {formatCurrency(product.listPrice, product.currency)}
                </div>
                <span className="text-xs text-[#999]">{CATEGORY_LABELS[product.category]}</span>
              </div>
            </div>
          ))}

          {/* Add New Placeholder */}
          {!searchQuery && (
            <div
              onClick={() => setShowCreateModal(true)}
              className="border-2 border-dashed border-[#1A1A1A]/10 rounded-[2rem] p-6 flex flex-col items-center justify-center text-center hover:border-[#EAD07D] hover:bg-[#EAD07D]/5 transition-all cursor-pointer min-h-[260px] group"
            >
              <div className="w-16 h-16 rounded-full bg-[#F2F1EA] flex items-center justify-center text-[#1A1A1A] mb-4 group-hover:scale-110 transition-transform">
                <Plus size={24} />
              </div>
              <h3 className="font-bold text-[#1A1A1A]">Create New Product</h3>
              <p className="text-sm text-[#666] mt-2">Add a service, item, or subscription to your catalog.</p>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingProduct) && (
        <ProductModal
          product={editingProduct}
          onClose={() => {
            setShowCreateModal(false);
            setEditingProduct(null);
          }}
          onSave={editingProduct
            ? (data) => handleUpdateProduct(editingProduct.id, data)
            : handleCreateProduct
          }
          saving={creating || updating}
        />
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
                <h3 className="text-lg font-semibold text-[#1A1A1A]">Delete Product</h3>
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
                onClick={() => handleDeleteProduct(deleteConfirm)}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Delete
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

// Product Modal Component
interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onSave: (data: CreateProductDto) => Promise<void>;
  saving: boolean;
}

const ProductModal: React.FC<ProductModalProps> = ({ product, onClose, onSave, saving }) => {
  const [formData, setFormData] = useState<CreateProductDto>({
    name: product?.name || '',
    sku: product?.sku || '',
    description: product?.description || '',
    type: product?.type || 'PRODUCT',
    category: product?.category || 'OTHER',
    listPrice: product?.listPrice || 0,
    unitPrice: product?.unitPrice,
    billingFrequency: product?.billingFrequency || 'ONE_TIME',
    isActive: product?.isActive ?? true,
    features: product?.features || [],
    tags: product?.tags || [],
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Product name is required');
      return;
    }
    if (!formData.sku.trim()) {
      setError('SKU is required');
      return;
    }
    if (formData.listPrice < 0) {
      setError('Price must be positive');
      return;
    }

    try {
      await onSave(formData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save product');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-2xl p-6 my-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-[#1A1A1A]">
            {product ? 'Edit Product' : 'Create Product'}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Product Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                placeholder="Enterprise License"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">SKU *</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm font-mono"
                placeholder="SW-ENT-001"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#666] mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm resize-none"
                rows={2}
                placeholder="Product description..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as ProductType })}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
              >
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as ProductCategory })}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
              >
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">List Price *</label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999]" />
                <input
                  type="number"
                  value={formData.listPrice}
                  onChange={(e) => setFormData({ ...formData, listPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Billing Frequency</label>
              <select
                value={formData.billingFrequency}
                onChange={(e) => setFormData({ ...formData, billingFrequency: e.target.value as BillingFrequency })}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
              >
                {Object.entries(BILLING_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-[#EAD07D] focus:ring-[#EAD07D]"
                />
                <span className="text-sm font-medium text-[#1A1A1A]">Active</span>
                <span className="text-xs text-[#666]">(Inactive products won't appear in quotes)</span>
              </label>
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
                  {product ? 'Update Product' : 'Create Product'}
                </>
              )}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};
