import React, { useState } from 'react';
import { Plus, MoreHorizontal, Search, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';

const STAGES = [
  { id: 'discovery', title: 'Discovery', color: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700' },
  { id: 'proposal', title: 'Proposal', color: 'bg-[#EAD07D]', badge: 'bg-[#EAD07D]/20 text-[#7A6415]' },
  { id: 'negotiation', title: 'Negotiation', color: 'bg-purple-500', badge: 'bg-purple-100 text-purple-700' },
  { id: 'closed', title: 'Closed Won', color: 'bg-[#93C01F]', badge: 'bg-[#93C01F]/20 text-[#3C5205]' },
];

const DEALS = [
  { id: 1, title: 'Acme Corp Expansion', company: 'Acme Corp', value: '$125,000', stage: 'discovery', owner: 'https://picsum.photos/40/40?random=1', probability: '25%' },
  { id: 2, title: 'GlobalBank Enterprise', company: 'GlobalBank', value: '$850,000', stage: 'proposal', owner: 'https://picsum.photos/40/40?random=2', probability: '60%' },
  { id: 3, title: 'StartUp Seed', company: 'Nebula', value: '$45,000', stage: 'discovery', owner: 'https://picsum.photos/40/40?random=3', probability: '30%' },
  { id: 4, title: 'Design System Revamp', company: 'Vertex', value: '$95,000', stage: 'negotiation', owner: 'https://picsum.photos/40/40?random=4', probability: '85%' },
  { id: 5, title: 'Q4 Marketing Push', company: 'Sisyphus', value: '$210,000', stage: 'proposal', owner: 'https://picsum.photos/40/40?random=5', probability: '55%' },
  { id: 6, title: 'Annual Contract Renewal', company: 'Logitech', value: '$120,000', stage: 'closed', owner: 'https://picsum.photos/40/40?random=6', probability: '100%' },
];

export const Deals: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter deals based on search query
  const filteredDeals = DEALS.filter(deal => {
    const query = searchQuery.toLowerCase();
    return (
      deal.title.toLowerCase().includes(query) ||
      deal.company.toLowerCase().includes(query)
    );
  });

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-140px)] flex flex-col">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-end gap-6 shrink-0">
         <div>
            <h1 className="text-4xl font-medium text-[#1A1A1A] mb-2">Pipeline</h1>
            <p className="text-[#666]">Manage your opportunities and track revenue.</p>
         </div>
         
         <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search deals..." 
                  className="w-full pl-10 pr-4 py-2.5 bg-white rounded-full text-sm outline-none shadow-sm focus:ring-1 focus:ring-[#EAD07D]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <button className="w-10 h-10 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center hover:bg-black transition-colors shadow-lg">
                <Plus size={18} />
            </button>
         </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-6 h-full min-w-[1000px]">
          {STAGES.map((stage) => {
            const stageDeals = filteredDeals.filter(d => d.stage === stage.id);
            const totalValue = stageDeals.reduce((acc, curr) => acc + parseInt(curr.value.replace(/[^0-9]/g, '')), 0);
            
            return (
              <div key={stage.id} className="flex-1 min-w-[300px] flex flex-col">
                 <div className="flex justify-between items-center mb-4 px-2">
                    <div className="flex items-center gap-2">
                       <div className={`w-2 h-2 rounded-full ${stage.color}`}></div>
                       <span className="font-bold text-[#1A1A1A]">{stage.title}</span>
                       <span className="bg-[#E5E5E5] text-[#666] px-2 py-0.5 rounded-full text-xs font-medium">{stageDeals.length}</span>
                    </div>
                    <span className="text-xs font-medium text-[#666]">${(totalValue / 1000).toFixed(0)}k</span>
                 </div>

                 <div className="flex-1 bg-[#E5E5E5]/30 rounded-[2rem] p-4 space-y-4 overflow-y-auto custom-scrollbar">
                    {stageDeals.map((deal) => (
                      <Link to={`/dashboard/deals/${deal.id}`} key={deal.id} className="block group">
                        <div className="bg-white p-5 rounded-[1.5rem] shadow-soft hover:shadow-card transition-all duration-300 border border-transparent hover:border-[#EAD07D]/30 relative overflow-hidden">
                           
                           <div className="flex justify-between items-start mb-3">
                              <span className="text-xs font-bold text-[#999] uppercase tracking-wider">{deal.company}</span>
                              <button className="text-[#999] hover:text-[#1A1A1A]"><MoreHorizontal size={16} /></button>
                           </div>
                           
                           <h4 className="text-lg font-bold text-[#1A1A1A] mb-2 leading-tight">{deal.title}</h4>

                           <div className="mb-4">
                              <span className={`inline-block text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider ${stage.badge}`}>
                                 {stage.title}
                              </span>
                           </div>
                           
                           <div className="flex items-end justify-between">
                              <div>
                                 <div className="text-sm font-medium text-[#1A1A1A]">{deal.value}</div>
                                 <div className="text-xs text-[#666] mt-1">{deal.probability} probability</div>
                              </div>
                              <img src={deal.owner} alt="Owner" className="w-8 h-8 rounded-full border-2 border-white" />
                           </div>

                           {/* Progress Bar */}
                           <div className="absolute bottom-0 left-0 h-1 bg-gray-100 w-full">
                              <div className={`h-full ${stage.color}`} style={{ width: deal.probability }}></div>
                           </div>
                        </div>
                      </Link>
                    ))}
                    
                    <button className="w-full py-3 rounded-[1.5rem] border-2 border-dashed border-[#1A1A1A]/5 text-[#1A1A1A]/40 font-medium hover:border-[#1A1A1A]/20 hover:text-[#1A1A1A]/60 transition-all flex items-center justify-center gap-2">
                       <Plus size={16} /> Add Deal
                    </button>
                 </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};