import React from 'react';
import { Search, Plus, Package, Tag, MoreHorizontal } from 'lucide-react';

const PRODUCTS = [
  { id: 1, name: "Enterprise License", sku: "SW-ENT-001", price: "$2,500", type: "Subscription", billing: "Annual", color: "bg-[#EAD07D]" },
  { id: 2, name: "Professional Seat", sku: "SW-PRO-001", price: "$85", type: "Subscription", billing: "Monthly", color: "bg-[#1A1A1A]" },
  { id: 3, name: "Onboarding Package", sku: "SVC-ONB-001", price: "$1,200", type: "Service", billing: "One-time", color: "bg-blue-500" },
  { id: 4, name: "Data Migration", sku: "SVC-MIG-001", price: "$3,500", type: "Service", billing: "One-time", color: "bg-purple-500" },
  { id: 5, name: "API Usage Tier 1", sku: "API-T1-001", price: "$499", type: "Usage", billing: "Monthly", color: "bg-orange-500" },
  { id: 6, name: "Consulting Hour", sku: "SVC-HOU-001", price: "$250", type: "Service", billing: "Hourly", color: "bg-gray-500" },
];

export const Products: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-10 flex flex-col md:flex-row justify-between items-end gap-6">
         <div>
            <h1 className="text-4xl font-medium text-[#1A1A1A] mb-2">Product Catalog</h1>
            <p className="text-[#666]">Manage services, subscriptions, and pricing.</p>
         </div>
         
         <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type="text" placeholder="Search products..." className="w-full pl-10 pr-4 py-2.5 bg-white rounded-full text-sm outline-none shadow-sm focus:ring-1 focus:ring-[#EAD07D]" />
            </div>
            <button className="flex items-center gap-2 px-6 py-2.5 bg-[#1A1A1A] text-white rounded-full text-sm font-bold shadow-lg hover:bg-black transition-all">
                <Plus size={16} /> Add Product
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PRODUCTS.map((product) => (
             <div key={product.id} className="dash-card p-6 group hover:shadow-card transition-all duration-300 relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                   <div className={`w-12 h-12 rounded-2xl ${product.color} flex items-center justify-center text-white shadow-sm`}>
                      <Package size={20} />
                   </div>
                   <button className="w-8 h-8 rounded-full hover:bg-[#F8F8F6] flex items-center justify-center text-[#999] hover:text-[#1A1A1A]">
                      <MoreHorizontal size={16} />
                   </button>
                </div>
                
                <h3 className="text-lg font-bold text-[#1A1A1A] mb-1">{product.name}</h3>
                <div className="text-xs text-[#999] font-mono mb-6">{product.sku}</div>

                <div className="flex items-center gap-2 mb-6">
                   <span className="px-2.5 py-1 bg-[#F8F8F6] rounded-md text-xs font-medium text-[#666] flex items-center gap-1">
                      <Tag size={12} /> {product.type}
                   </span>
                   <span className="px-2.5 py-1 bg-[#F8F8F6] rounded-md text-xs font-medium text-[#666]">
                      {product.billing}
                   </span>
                </div>

                <div className="flex items-baseline justify-between pt-6 border-t border-gray-50">
                   <div className="text-2xl font-medium text-[#1A1A1A]">{product.price}</div>
                   <button className="text-xs font-bold text-[#EAD07D] uppercase tracking-wider hover:text-[#c7af66]">Edit Details</button>
                </div>
             </div>
          ))}
          
          {/* Add New Placeholder */}
          <div className="border-2 border-dashed border-[#1A1A1A]/10 rounded-[2rem] p-6 flex flex-col items-center justify-center text-center hover:border-[#EAD07D] hover:bg-[#EAD07D]/5 transition-all cursor-pointer min-h-[260px] group">
              <div className="w-16 h-16 rounded-full bg-[#F2F1EA] flex items-center justify-center text-[#1A1A1A] mb-4 group-hover:scale-110 transition-transform">
                  <Plus size={24} />
              </div>
              <h3 className="font-bold text-[#1A1A1A]">Create New Product</h3>
              <p className="text-sm text-[#666] mt-2">Add a service, item, or subscription to your catalog.</p>
          </div>
      </div>
    </div>
  );
};