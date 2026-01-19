import React, { useState } from 'react';
import { Search, Filter, Download, Plus } from 'lucide-react';

const LEADS = [
  { id: 1, name: "Harry Bender", role: "Head of Design", company: "Product", country: "Rome", value: "$1,350", status: "Invited", statusColor: "bg-green-100 text-green-700" },
  { id: 2, name: "Katy Fuller", role: "Fullstack Engineer", company: "Engineering", country: "Miami", value: "$1,500", status: "Absent", statusColor: "bg-gray-100 text-gray-500", active: true },
  { id: 3, name: "Jonathan Kelly", role: "Mobile Lead", company: "Product", country: "Kyiv", value: "$2,600", status: "Invited", statusColor: "bg-green-100 text-green-700" },
  { id: 4, name: "Billie Wright", role: "Sales Manager", company: "Operations", country: "Ottawa", value: "$900", status: "Invited", statusColor: "bg-green-100 text-green-700" },
  { id: 5, name: "Sarah Page", role: "Network Engineer", company: "Product", country: "Sao Paulo", value: "$1,000", status: "Invited", statusColor: "bg-green-100 text-green-700" },
  { id: 6, name: "Erica Wyatt", role: "Head of Design", company: "Product", country: "London", value: "$1,700", status: "Absent", statusColor: "bg-gray-100 text-gray-500" },
];

export const Leads: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLeads = LEADS.filter(lead => 
    lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-10 flex flex-col md:flex-row justify-between items-end gap-6">
         <div>
            <h1 className="text-4xl font-medium text-[#1A1A1A] mb-8">Leads</h1>
            <div className="flex items-center gap-4 bg-white/50 p-2 pr-6 rounded-full backdrop-blur-sm w-fit">
               <div className="bg-[#1A1A1A] text-white px-6 py-2 rounded-full text-sm font-bold">25%</div>
               <div className="bg-[#EAD07D] text-[#1A1A1A] px-6 py-2 rounded-full text-sm font-bold">51%</div>
               <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden relative">
                   <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNCIgaGVpZ2h0PSI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxjaXJjbGUgY3g9IjIiIGN5PSIyIiByPSIxIiBmaWxsPSIjRQUFQUFBIi8+PC9zdmc+')] opacity-30"></div>
               </div>
               <div className="border border-black/10 px-4 py-1.5 rounded-full text-xs font-bold">14%</div>
               <div className="border border-black/10 px-4 py-1.5 rounded-full text-xs font-bold">10%</div>
            </div>
         </div>
         
         <div className="flex gap-2">
            <button className="bg-white px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
               Directory <span className="text-xs">▼</span>
            </button>
            <button className="bg-white px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
               Org Chat <span className="text-xs">▼</span>
            </button>
         </div>
      </div>

      <div className="dash-card p-6 min-h-[600px]">
         {/* Filters Bar */}
         <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-8">
            <div className="flex gap-2 overflow-x-auto max-w-full pb-2 md:pb-0 no-scrollbar">
               {['Columns', 'Department', 'Site', 'Lifecycle', 'Status', 'Entity'].map(f => (
                  <button key={f} className="px-4 py-2 bg-[#F8F8F6] rounded-full text-sm font-medium text-[#666] whitespace-nowrap hover:bg-gray-200 transition-colors flex items-center gap-1">
                     {f} <span className="text-[10px] opacity-50">▼</span>
                  </button>
               ))}
            </div>
            
            <div className="flex gap-3 w-full md:w-auto">
               <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search leads..." 
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F8F8F6] rounded-full text-sm outline-none focus:ring-1 focus:ring-[#EAD07D]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
               </div>
               <button className="w-10 h-10 rounded-full bg-[#EAD07D]/20 flex items-center justify-center text-[#1A1A1A] hover:bg-[#EAD07D] transition-colors">
                  <Plus size={18} />
               </button>
               <button className="w-10 h-10 rounded-full bg-[#F8F8F6] flex items-center justify-center text-[#666] hover:bg-gray-200 transition-colors">
                  <Filter size={16} />
               </button>
               <button className="px-4 py-2 rounded-full border border-gray-200 flex items-center gap-2 text-sm font-medium hover:bg-gray-50">
                  <Download size={14} /> Export
               </button>
            </div>
         </div>

         {/* Table Header */}
         <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-100 text-xs font-bold text-[#999] uppercase tracking-wider mb-2">
             <div className="col-span-1"></div>
             <div className="col-span-3">Name</div>
             <div className="col-span-2">Job title</div>
             <div className="col-span-2">Department</div>
             <div className="col-span-1">Site</div>
             <div className="col-span-1">Value</div>
             <div className="col-span-2 text-right">Status</div>
         </div>

         {/* Table Rows */}
         <div className="space-y-2">
            {filteredLeads.length > 0 ? (
                filteredLeads.map((lead) => (
                   <div 
                      key={lead.id} 
                      className={`grid grid-cols-12 gap-4 px-4 py-4 rounded-2xl items-center transition-all cursor-pointer ${lead.active ? 'bg-[#EAD07D] shadow-md scale-[1.01]' : 'hover:bg-[#F8F8F6]'}`}
                   >
                      <div className="col-span-1 flex items-center justify-center">
                         <div className={`w-5 h-5 rounded border flex items-center justify-center ${lead.active ? 'border-black bg-black text-white' : 'border-gray-300'}`}>
                            {lead.active && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                         </div>
                      </div>
                      <div className="col-span-3 flex items-center gap-3">
                         <img src={`https://picsum.photos/40/40?random=${lead.id}`} className="w-10 h-10 rounded-full object-cover" alt={lead.name} />
                         <span className={`font-medium ${lead.active ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}>{lead.name}</span>
                      </div>
                      <div className="col-span-2 text-sm text-[#666]">{lead.role}</div>
                      <div className="col-span-2 text-sm text-[#666]">{lead.company}</div>
                      <div className="col-span-1 flex items-center gap-1 text-sm text-[#666]">
                          {/* Flag placeholder */}
                          <div className="w-4 h-3 bg-gray-200 rounded-sm"></div> {lead.country}
                      </div>
                      <div className="col-span-1 text-sm font-medium">{lead.value}</div>
                      <div className="col-span-2 flex justify-end">
                         <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${lead.active ? 'bg-white text-[#1A1A1A]' : lead.statusColor}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${lead.active ? 'bg-[#1A1A1A]' : 'bg-current'}`}></div>
                            {lead.status}
                         </span>
                      </div>
                   </div>
                ))
            ) : (
                <div className="text-center py-20 text-[#666]">
                    No leads found matching "{searchQuery}"
                </div>
            )}
         </div>

      </div>
    </div>
  );
};