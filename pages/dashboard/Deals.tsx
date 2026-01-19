import React, { useState, useEffect } from 'react';
import { Plus, MoreHorizontal, Filter, LayoutGrid, List as ListIcon, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { SearchInput } from '../../components/ui/Input';
import { Skeleton } from '../../components/ui/Skeleton';

const STAGES = [
  { id: 'discovery', title: 'Discovery', color: 'bg-sky-500', badge: 'blue' as const },
  { id: 'proposal', title: 'Proposal', color: 'bg-orange-500', badge: 'red' as const },
  { id: 'negotiation', title: 'Negotiation', color: 'bg-violet-500', badge: 'purple' as const },
  { id: 'closed', title: 'Closed Won', color: 'bg-emerald-500', badge: 'green' as const },
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
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedStage, setSelectedStage] = useState('all');
  const [minProbability, setMinProbability] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const filteredDeals = DEALS.filter(deal => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = deal.title.toLowerCase().includes(query) || deal.company.toLowerCase().includes(query);
    const matchesStage = selectedStage === 'all' || deal.stage === selectedStage;
    const probValue = parseInt(deal.probability.replace('%', ''));
    const matchesProb = probValue >= minProbability;

    return matchesSearch && matchesStage && matchesProb;
  });

  if (isLoading) {
      return (
        <div className="max-w-7xl mx-auto h-[calc(100vh-140px)] flex flex-col">
            <div className="mb-8 flex flex-col xl:flex-row justify-between items-end gap-6 shrink-0">
                <div>
                    <Skeleton className="h-10 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <div className="flex gap-3">
                    <Skeleton className="h-10 w-32 rounded-full" />
                    <Skeleton className="h-10 w-32 rounded-full" />
                    <Skeleton className="h-10 w-24 rounded-full" />
                    <Skeleton className="h-10 w-64 rounded-full" />
                    <Skeleton className="h-10 w-10 rounded-full" />
                </div>
            </div>
            <div className="flex-1 overflow-x-auto pb-4">
                <div className="flex gap-6 h-full min-w-[1000px]">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="flex-1 flex flex-col">
                            <div className="flex justify-between items-center mb-4 px-2">
                                <Skeleton className="h-6 w-32" />
                                <Skeleton className="h-4 w-12" />
                            </div>
                            <div className="flex-1 bg-gray-100/50 rounded-[2rem] p-4 space-y-4">
                                <Skeleton className="h-48 w-full rounded-[2rem] bg-white" />
                                <Skeleton className="h-48 w-full rounded-[2rem] bg-white" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )
  }

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-140px)] flex flex-col animate-in fade-in duration-500">
      <div className="mb-8 flex flex-col xl:flex-row justify-between items-end gap-6 shrink-0">
         <div>
            <h1 className="text-4xl font-medium text-[#1A1A1A] mb-2">Pipeline</h1>
            <p className="text-[#666]">Manage your opportunities and track revenue.</p>
         </div>
         
         <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
                <div className="relative group">
                    <button className="px-4 py-2.5 bg-white rounded-full text-sm font-medium text-[#666] hover:text-[#1A1A1A] flex items-center gap-2 shadow-sm border border-transparent hover:border-gray-200">
                        {selectedStage === 'all' ? 'All Stages' : STAGES.find(s => s.id === selectedStage)?.title} <ChevronDown size={14} />
                    </button>
                    <div className="absolute top-full left-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-gray-100 p-1 hidden group-hover:block z-20">
                        <button onClick={() => setSelectedStage('all')} className={`w-full text-left px-3 py-2 rounded-lg text-sm ${selectedStage === 'all' ? 'bg-[#F8F8F6] font-bold' : 'hover:bg-[#F8F8F6]'}`}>All Stages</button>
                        {STAGES.map(s => (
                            <button key={s.id} onClick={() => setSelectedStage(s.id)} className={`w-full text-left px-3 py-2 rounded-lg text-sm ${selectedStage === s.id ? 'bg-[#F8F8F6] font-bold' : 'hover:bg-[#F8F8F6]'}`}>{s.title}</button>
                        ))}
                    </div>
                </div>

                <div className="relative group">
                    <button className="px-4 py-2.5 bg-white rounded-full text-sm font-medium text-[#666] hover:text-[#1A1A1A] flex items-center gap-2 shadow-sm border border-transparent hover:border-gray-200">
                        {minProbability === 0 ? 'All Probabilities' : `> ${minProbability}%`} <ChevronDown size={14} />
                    </button>
                    <div className="absolute top-full left-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-gray-100 p-1 hidden group-hover:block z-20">
                        {[0, 25, 50, 75].map(p => (
                             <button key={p} onClick={() => setMinProbability(p)} className={`w-full text-left px-3 py-2 rounded-lg text-sm ${minProbability === p ? 'bg-[#F8F8F6] font-bold' : 'hover:bg-[#F8F8F6]'}`}>{p === 0 ? 'All Probabilities' : `> ${p}%`}</button>
                        ))}
                    </div>
                </div>
            </div>

            {/* View Toggle */}
            <div className="bg-white p-1 rounded-full shadow-sm flex items-center border border-gray-100">
                <button 
                    onClick={() => setViewMode('kanban')}
                    className={`p-2 rounded-full transition-all ${viewMode === 'kanban' ? 'bg-[#1A1A1A] text-white' : 'text-[#666] hover:bg-gray-100'}`}
                >
                    <LayoutGrid size={18} />
                </button>
                <button 
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-full transition-all ${viewMode === 'list' ? 'bg-[#1A1A1A] text-white' : 'text-[#666] hover:bg-gray-100'}`}
                >
                    <ListIcon size={18} />
                </button>
            </div>

            {/* Search */}
            <div className="w-full md:w-64">
                <SearchInput 
                    placeholder="Search deals..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Add Button */}
            <button className="w-10 h-10 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center hover:bg-black transition-colors shadow-lg shrink-0">
                <Plus size={18} />
            </button>
         </div>
      </div>

      {/* Content Area */}
      {viewMode === 'kanban' ? (
          /* Kanban Board */
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
                            <Card padding="md" className="hover:border-[#EAD07D]/30 transition-all">
                               <div className="flex justify-between items-start mb-3">
                                  <span className="text-xs font-bold text-[#999] uppercase tracking-wider">{deal.company}</span>
                                  <button className="text-[#999] hover:text-[#1A1A1A]"><MoreHorizontal size={16} /></button>
                               </div>
                               
                               <h4 className="text-lg font-bold text-[#1A1A1A] mb-2 leading-tight group-hover:text-[#EAD07D] transition-colors">{deal.title}</h4>

                               <div className="mb-4">
                                  <Badge variant={stage.badge} size="sm">
                                     {stage.title}
                                  </Badge>
                               </div>
                               
                               <div className="flex items-end justify-between">
                                  <div>
                                     <div className="text-sm font-medium text-[#1A1A1A]">{deal.value}</div>
                                     <div className="text-xs text-[#666] mt-1">{deal.probability} probability</div>
                                  </div>
                                  <Avatar src={deal.owner} size="sm" border />
                               </div>

                               {/* Progress Bar */}
                               <div className="absolute bottom-0 left-0 h-1 bg-gray-100 w-full">
                                  <div className={`h-full ${stage.color}`} style={{ width: deal.probability }}></div>
                               </div>
                            </Card>
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
      ) : (
          /* List View */
          <Card padding="none" className="flex-1 overflow-hidden flex flex-col">
              <div className="grid grid-cols-12 gap-4 px-8 py-4 border-b border-gray-100 text-xs font-bold text-[#999] uppercase tracking-wider bg-[#F9F9F9]">
                  <div className="col-span-4">Deal Name</div>
                  <div className="col-span-2">Stage</div>
                  <div className="col-span-2">Value</div>
                  <div className="col-span-2">Probability</div>
                  <div className="col-span-2 text-right">Owner</div>
              </div>
              <div className="flex-1 overflow-y-auto">
                 {filteredDeals.length > 0 ? (
                     filteredDeals.map((deal) => {
                         const stage = STAGES.find(s => s.id === deal.stage);
                         return (
                            <Link to={`/dashboard/deals/${deal.id}`} key={deal.id} className="grid grid-cols-12 gap-4 px-8 py-5 border-b border-gray-50 items-center hover:bg-[#F8F8F6] transition-colors group">
                                <div className="col-span-4">
                                    <div className="font-bold text-[#1A1A1A] text-sm group-hover:text-[#EAD07D] transition-colors">{deal.title}</div>
                                    <div className="text-xs text-[#666]">{deal.company}</div>
                                </div>
                                <div className="col-span-2">
                                    <Badge variant={stage?.badge} size="sm">
                                        {stage?.title}
                                    </Badge>
                                </div>
                                <div className="col-span-2 text-sm font-medium text-[#1A1A1A]">
                                    {deal.value}
                                </div>
                                <div className="col-span-2">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div className={`h-full ${stage?.color}`} style={{ width: deal.probability }}></div>
                                        </div>
                                        <span className="text-xs font-medium text-[#666] w-8 text-right">{deal.probability}</span>
                                    </div>
                                </div>
                                <div className="col-span-2 flex justify-end">
                                    <Avatar src={deal.owner} size="sm" />
                                </div>
                            </Link>
                         );
                     })
                 ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-[#666]">
                        <Filter size={24} className="mb-2 opacity-20" />
                        <p>No deals match "{searchQuery}"</p>
                    </div>
                 )}
              </div>
          </Card>
      )}
    </div>
  );
};