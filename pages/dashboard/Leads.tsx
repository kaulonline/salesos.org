import React, { useState } from 'react';
import { Filter, Download, Plus } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { SearchInput } from '../../components/ui/Input';

const LEADS = [
  { id: 1, name: "Harry Bender", role: "Head of Design", company: "Product", country: "Rome", value: "$1,350", status: "Invited", statusVariant: "green" as const },
  { id: 2, name: "Katy Fuller", role: "Fullstack Engineer", company: "Engineering", country: "Miami", value: "$1,500", status: "Absent", statusVariant: "neutral" as const, active: true },
  { id: 3, name: "Jonathan Kelly", role: "Mobile Lead", company: "Product", country: "Kyiv", value: "$2,600", status: "Invited", statusVariant: "green" as const },
  { id: 4, name: "Billie Wright", role: "Sales Manager", company: "Operations", country: "Ottawa", value: "$900", status: "Invited", statusVariant: "green" as const },
  { id: 5, name: "Sarah Page", role: "Network Engineer", company: "Product", country: "Sao Paulo", value: "$1,000", status: "Invited", statusVariant: "green" as const },
  { id: 6, name: "Erica Wyatt", role: "Head of Design", company: "Product", country: "London", value: "$1,700", status: "Absent", statusVariant: "neutral" as const },
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
               <Badge variant="dark" className="px-6 py-2">25%</Badge>
               <Badge variant="yellow" className="px-6 py-2">51%</Badge>
               <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden relative">
                   <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNCIgaGVpZ2h0PSI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxjaXJjbGUgY3g9IjIiIGN5PSIyIiByPSIxIiBmaWxsPSIjRQUFQUFBIi8+PC9zdmc+')] opacity-30"></div>
               </div>
               <Badge variant="outline" className="px-4 py-1.5 border-black/10">14%</Badge>
               <Badge variant="outline" className="px-4 py-1.5 border-black/10">10%</Badge>
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

      <Card className="min-h-[600px]">
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
               <div className="w-full md:w-64">
                  <SearchInput 
                    variant="filled" 
                    placeholder="Search leads..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
               </div>
               <button className="w-10 h-10 rounded-full bg-[#EAD07D]/20 flex items-center justify-center text-[#1A1A1A] hover:bg-[#EAD07D] transition-colors shrink-0">
                  <Plus size={18} />
               </button>
               <button className="w-10 h-10 rounded-full bg-[#F8F8F6] flex items-center justify-center text-[#666] hover:bg-gray-200 transition-colors shrink-0">
                  <Filter size={16} />
               </button>
               <button className="px-4 py-2 rounded-full border border-gray-200 flex items-center gap-2 text-sm font-medium hover:bg-gray-50 shrink-0">
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
                         <Avatar src={`https://picsum.photos/40/40?random=${lead.id}`} alt={lead.name} size="md" />
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
                         {lead.active ? (
                            <Badge variant="neutral" className="bg-white text-[#1A1A1A]" dot>
                               {lead.status}
                            </Badge>
                         ) : (
                            <Badge variant={lead.statusVariant} dot>
                               {lead.status}
                            </Badge>
                         )}
                      </div>
                   </div>
                ))
            ) : (
                <div className="text-center py-20 text-[#666]">
                    No leads found matching "{searchQuery}"
                </div>
            )}
         </div>

      </Card>
    </div>
  );
};