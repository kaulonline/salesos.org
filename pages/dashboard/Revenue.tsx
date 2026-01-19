import React, { useState } from 'react';
import { Search, Filter, ArrowUpRight, CheckCircle2, Clock, FileCheck } from 'lucide-react';
import { Card } from '../../components/ui/Card';

const INVOICES = [
  { id: 'INV-2024-001', client: "Acme Corp", date: "Sep 13, 2024", amount: "$12,500", status: "Paid", statusColor: "bg-[#EAD07D] text-[#1A1A1A]" },
  { id: 'INV-2024-002', client: "GlobalBank", date: "Sep 15, 2024", amount: "$8,250", status: "Pending", statusColor: "bg-[#1A1A1A] text-white" },
  { id: 'INV-2024-003', client: "Nebula Inc", date: "Sep 18, 2024", amount: "$4,500", status: "Overdue", statusColor: "bg-red-100 text-red-600" },
  { id: 'INV-2024-004', client: "Vertex", date: "Sep 20, 2024", amount: "$15,000", status: "Paid", statusColor: "bg-[#EAD07D] text-[#1A1A1A]" },
  { id: 'INV-2024-005', client: "Sisyphus", date: "Sep 22, 2024", amount: "$2,100", status: "Pending", statusColor: "bg-[#1A1A1A] text-white" },
];

export const Revenue: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const filteredInvoices = INVOICES.filter(inv => 
    inv.client.toLowerCase().includes(searchQuery.toLowerCase()) || 
    inv.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Forecast Graph Data & Logic
  const forecastData = [40, 58, 45, 80, 65, 90];
  const months = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'];
  const values = ['$28k', '$42k', '$35k', '$65k', '$52k', '$78k'];

  const getPath = (data: number[]) => {
      if (data.length === 0) return '';
      let d = `M 0,${100 - data[0]}`;
      const step = 100 / (data.length - 1);
      
      for (let i = 0; i < data.length - 1; i++) {
          const x1 = i * step;
          const y1 = 100 - data[i];
          const x2 = (i + 1) * step;
          const y2 = 100 - data[i+1];
          
          // Smooth bezier curves
          const cp1x = x1 + (x2 - x1) * 0.5;
          const cp1y = y1;
          const cp2x = x2 - (x2 - x1) * 0.5;
          const cp2y = y2;
          
          d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${x2},${y2}`;
      }
      return d;
  };
  
  const linePath = getPath(forecastData);
  const areaPath = `${linePath} L 100,150 L 0,150 Z`;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-medium text-[#1A1A1A] mb-8">Revenue & Cash</h1>
        
        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
           <Card padding="md" className="flex flex-col justify-between min-h-[160px]">
              <div className="flex justify-between items-start">
                 <div className="w-10 h-10 rounded-full bg-[#EAD07D]/20 flex items-center justify-center text-[#1A1A1A]">
                    <CheckCircle2 size={20} />
                 </div>
                 <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">+12%</span>
              </div>
              <div>
                 <div className="text-3xl font-medium text-[#1A1A1A]">$148,250</div>
                 <div className="text-sm text-[#666] mt-1">Total Collected</div>
              </div>
           </Card>

           <Card padding="md" className="flex flex-col justify-between min-h-[160px]">
              <div className="flex justify-between items-start">
                 <div className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center text-white">
                    <Clock size={20} />
                 </div>
              </div>
              <div>
                 <div className="text-3xl font-medium text-[#1A1A1A]">$32,400</div>
                 <div className="text-sm text-[#666] mt-1">Outstanding Invoices</div>
              </div>
           </Card>

           <Card variant="dark" padding="md" className="flex flex-col justify-between min-h-[160px] relative overflow-hidden">
               {/* Background decoration */}
               <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-[#EAD07D] rounded-full blur-[40px] opacity-20"></div>
              <div className="flex justify-between items-start relative z-10">
                 <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white backdrop-blur-sm">
                    <ArrowUpRight size={20} />
                 </div>
              </div>
              <div className="relative z-10">
                 <div className="text-3xl font-medium text-white">$45.2k</div>
                 <div className="text-sm text-white/60 mt-1">Projected MRR</div>
              </div>
           </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         {/* Main Invoices Table */}
         <Card padding="lg" className="lg:col-span-8">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
               <h2 className="text-xl font-bold">Invoices</h2>
               <div className="flex gap-2 w-full md:w-auto">
                   <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      <input 
                        type="text" 
                        placeholder="Search invoice or client..." 
                        className="w-full pl-9 pr-4 py-2 bg-[#F8F8F6] rounded-full text-sm outline-none focus:ring-1 focus:ring-[#EAD07D]"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                   </div>
                   <button className="w-9 h-9 rounded-full bg-[#F8F8F6] flex items-center justify-center text-[#666] hover:bg-gray-200"><Filter size={14} /></button>
               </div>
            </div>

            <div className="overflow-x-auto">
               <table className="w-full">
                  <thead>
                     <tr className="text-left border-b border-gray-100">
                        <th className="pb-4 pl-4 text-xs font-bold text-[#999] uppercase tracking-wider">Invoice ID</th>
                        <th className="pb-4 text-xs font-bold text-[#999] uppercase tracking-wider">Client</th>
                        <th className="pb-4 text-xs font-bold text-[#999] uppercase tracking-wider">Date</th>
                        <th className="pb-4 text-xs font-bold text-[#999] uppercase tracking-wider">Amount</th>
                        <th className="pb-4 text-right pr-4 text-xs font-bold text-[#999] uppercase tracking-wider">Status</th>
                     </tr>
                  </thead>
                  <tbody className="text-sm">
                     {filteredInvoices.length > 0 ? (
                        filteredInvoices.map((inv, i) => (
                            <tr key={i} className="group hover:bg-[#F8F8F6] transition-colors border-b border-gray-50 last:border-0">
                                <td className="py-4 pl-4 font-medium text-[#1A1A1A] rounded-l-xl">{inv.id}</td>
                                <td className="py-4 text-[#666] flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-[#1A1A1A]">{inv.client[0]}</div>
                                    {inv.client}
                                </td>
                                <td className="py-4 text-[#666]">{inv.date}</td>
                                <td className="py-4 font-bold text-[#1A1A1A]">{inv.amount}</td>
                                <td className="py-4 pr-4 text-right rounded-r-xl">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${inv.statusColor}`}>
                                        {inv.status === 'Paid' && <CheckCircle2 size={12} />}
                                        {inv.status}
                                    </span>
                                </td>
                            </tr>
                        ))
                     ) : (
                         <tr>
                             <td colSpan={5} className="py-8 text-center text-[#666]">No invoices found</td>
                         </tr>
                     )}
                  </tbody>
               </table>
            </div>
         </Card>

         {/* Right Column: Forecast / Calendar */}
         <div className="lg:col-span-4 space-y-6">
            <Card variant="dark" padding="lg" className="flex flex-col h-[340px]">
               <div className="flex justify-between items-start mb-6 z-10 relative">
                  <div>
                    <h3 className="font-bold text-white text-lg">Revenue Forecast</h3>
                    <p className="text-white/60 text-xs">Projected next 6 months</p>
                  </div>
                  <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors backdrop-blur-sm">
                     <ArrowUpRight size={14} className="text-white" />
                  </button>
               </div>
               
               <div className="flex-1 w-full relative group">
                  <svg 
                    className="w-full h-full overflow-visible" 
                    viewBox="0 0 100 100" 
                    preserveAspectRatio="none"
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                      <defs>
                        <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#EAD07D" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#EAD07D" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      
                      {/* Area */}
                      <path d={areaPath} fill="url(#forecastGradient)" />
                      
                      {/* Line */}
                      <path 
                        d={linePath} 
                        fill="none" 
                        stroke="#EAD07D" 
                        strokeWidth="2.5" 
                        vectorEffect="non-scaling-stroke" 
                        strokeLinecap="round" 
                      />

                      {/* Interactive Points */}
                      {forecastData.map((d, i) => {
                          const x = i * (100 / (forecastData.length - 1));
                          const y = 100 - d;
                          const isHovered = hoveredIndex === i;

                          return (
                              <g key={i} onMouseEnter={() => setHoveredIndex(i)} className="cursor-pointer">
                                  {/* Hit area */}
                                  <rect x={x - 5} y="0" width="10" height="100" fill="transparent" />
                                  
                                  {/* Dot */}
                                  <circle 
                                    cx={x} 
                                    cy={y} 
                                    r={isHovered ? 5 : 3} 
                                    fill={isHovered ? "#EAD07D" : "#1A1A1A"} 
                                    stroke="#EAD07D" 
                                    strokeWidth={isHovered ? 0 : 2}
                                    className="transition-all duration-200"
                                  />
                              </g>
                          );
                      })}
                  </svg>
                  
                  {/* Tooltip - Frosted */}
                  {hoveredIndex !== null && (
                      <div 
                        className="absolute bg-white/90 backdrop-blur-sm border border-white/20 text-[#1A1A1A] px-2 py-1 rounded text-xs font-bold shadow-lg transform -translate-x-1/2 -translate-y-full pointer-events-none mb-3"
                        style={{
                            left: `${hoveredIndex * (100 / (forecastData.length - 1))}%`,
                            top: `${100 - forecastData[hoveredIndex]}%`
                        }}
                      >
                         {values[hoveredIndex]}
                         <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white/90"></div>
                      </div>
                  )}
               </div>
               
               <div className="flex justify-between text-xs text-white/40 border-t border-white/10 pt-4 mt-2">
                  {months.map(m => <span key={m}>{m}</span>)}
               </div>
            </Card>

            <Card variant="yellow" padding="lg" className="relative overflow-hidden">
                <h3 className="font-bold text-lg mb-2 text-[#1A1A1A]">Upcoming Payouts</h3>
                <div className="text-4xl font-medium mb-8 text-[#1A1A1A]">$24,500</div>
                
                <div className="space-y-3 relative z-10">
                   {/* Frosted Glass on Yellow Background */}
                   <div className="bg-white/30 backdrop-blur-md border border-white/20 p-4 rounded-xl flex items-center justify-between shadow-sm transition-transform hover:scale-[1.02] cursor-pointer">
                      <span className="text-sm font-bold text-[#1A1A1A]">Stripe Payout</span>
                      <div className="text-right">
                        <span className="block text-sm text-[#1A1A1A] font-bold">$12,400</span>
                        <span className="text-xs text-[#1A1A1A]/70">Tomorrow</span>
                      </div>
                   </div>
                   <div className="bg-white/30 backdrop-blur-md border border-white/20 p-4 rounded-xl flex items-center justify-between shadow-sm transition-transform hover:scale-[1.02] cursor-pointer">
                      <span className="text-sm font-bold text-[#1A1A1A]">Acme Wire</span>
                      <div className="text-right">
                        <span className="block text-sm text-[#1A1A1A] font-bold">$12,100</span>
                        <span className="text-xs text-[#1A1A1A]/70">Sep 28</span>
                      </div>
                   </div>
                </div>
            </Card>
         </div>
      </div>
    </div>
  );
};