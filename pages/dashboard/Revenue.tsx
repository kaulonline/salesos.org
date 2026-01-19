import React, { useState } from 'react';
import { Search, Filter, Download, ArrowUpRight, FileText, CheckCircle2, Clock } from 'lucide-react';

const INVOICES = [
  { id: 'INV-2024-001', client: "Acme Corp", date: "Sep 13, 2024", amount: "$12,500", status: "Paid", statusColor: "bg-[#EAD07D] text-[#1A1A1A]" },
  { id: 'INV-2024-002', client: "GlobalBank", date: "Sep 15, 2024", amount: "$8,250", status: "Pending", statusColor: "bg-[#1A1A1A] text-white" },
  { id: 'INV-2024-003', client: "Nebula Inc", date: "Sep 18, 2024", amount: "$4,500", status: "Overdue", statusColor: "bg-red-100 text-red-600" },
  { id: 'INV-2024-004', client: "Vertex", date: "Sep 20, 2024", amount: "$15,000", status: "Paid", statusColor: "bg-[#EAD07D] text-[#1A1A1A]" },
  { id: 'INV-2024-005', client: "Sisyphus", date: "Sep 22, 2024", amount: "$2,100", status: "Pending", statusColor: "bg-[#1A1A1A] text-white" },
];

export const Revenue: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredInvoices = INVOICES.filter(inv => 
    inv.client.toLowerCase().includes(searchQuery.toLowerCase()) || 
    inv.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-medium text-[#1A1A1A] mb-8">Revenue & Cash</h1>
        
        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
           <div className="dash-card p-6 flex flex-col justify-between min-h-[160px]">
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
           </div>

           <div className="dash-card p-6 flex flex-col justify-between min-h-[160px]">
              <div className="flex justify-between items-start">
                 <div className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center text-white">
                    <Clock size={20} />
                 </div>
              </div>
              <div>
                 <div className="text-3xl font-medium text-[#1A1A1A]">$32,400</div>
                 <div className="text-sm text-[#666] mt-1">Outstanding Invoices</div>
              </div>
           </div>

           <div className="dash-card-dark p-6 flex flex-col justify-between min-h-[160px] relative overflow-hidden">
               {/* Background decoration */}
               <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-[#EAD07D] rounded-full blur-[40px] opacity-20"></div>
              <div className="flex justify-between items-start relative z-10">
                 <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
                    <ArrowUpRight size={20} />
                 </div>
              </div>
              <div className="relative z-10">
                 <div className="text-3xl font-medium text-white">$45.2k</div>
                 <div className="text-sm text-white/60 mt-1">Projected MRR</div>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         {/* Main Invoices Table */}
         <div className="lg:col-span-8 dash-card p-8">
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
         </div>

         {/* Right Column: Forecast / Calendar */}
         <div className="lg:col-span-4 space-y-6">
            <div className="dash-card p-8 bg-[#1A1A1A] text-white">
               <div className="flex justify-between items-start mb-6">
                  <h3 className="font-bold">Revenue Forecast</h3>
                  <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20">
                     <ArrowUpRight size={14} />
                  </button>
               </div>
               
               <div className="h-40 relative flex items-end justify-between gap-2 mb-6">
                  {[40, 65, 45, 90, 70, 85].map((h, i) => (
                     <div key={i} className="w-full bg-white/10 rounded-t-lg relative group">
                        <div className="absolute bottom-0 w-full bg-[#EAD07D] rounded-t-lg transition-all duration-500" style={{ height: `${h}%` }}></div>
                     </div>
                  ))}
               </div>
               
               <div className="flex justify-between text-xs text-white/40 border-t border-white/10 pt-4">
                  <span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span><span>Jan</span>
               </div>
            </div>

            <div className="bg-[#EAD07D] rounded-[2rem] p-8 relative overflow-hidden text-[#1A1A1A]">
                <h3 className="font-bold text-lg mb-2">Upcoming Payouts</h3>
                <div className="text-4xl font-medium mb-8">$24,500</div>
                
                <div className="space-y-3 relative z-10">
                   <div className="bg-white/40 backdrop-blur-sm p-3 rounded-xl flex items-center justify-between">
                      <span className="text-sm font-bold">Stripe Payout</span>
                      <span className="text-sm">Tomorrow</span>
                   </div>
                   <div className="bg-white/40 backdrop-blur-sm p-3 rounded-xl flex items-center justify-between">
                      <span className="text-sm font-bold">Acme Wire</span>
                      <span className="text-sm">Sep 28</span>
                   </div>
                </div>
            </div>
         </div>
      </div>
    </div>
  );
};