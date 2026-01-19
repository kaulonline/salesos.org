import React from 'react';
import { ArrowUpRight, TrendingUp, Users, Target, Activity } from 'lucide-react';

export const Analytics: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-medium text-[#1A1A1A]">Analytics</h1>
        <p className="text-[#666] mt-2">Team performance and revenue insights.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* KPI Cards */}
        <div className="md:col-span-4 dash-card p-8 flex flex-col justify-between min-h-[240px]">
           <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-full bg-[#EAD07D]/20 flex items-center justify-center text-[#1A1A1A]">
                 <TrendingUp size={24} />
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">+14%</span>
           </div>
           <div>
              <div className="text-5xl font-light text-[#1A1A1A] mb-2">$1.2M</div>
              <div className="text-sm text-[#666]">Total Revenue (YTD)</div>
           </div>
           <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#1A1A1A] w-[75%]"></div>
           </div>
        </div>

        <div className="md:col-span-4 dash-card p-8 flex flex-col justify-between min-h-[240px]">
           <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-full bg-[#F2F1EA] flex items-center justify-center text-[#1A1A1A]">
                 <Users size={24} />
              </div>
           </div>
           <div>
              <div className="text-5xl font-light text-[#1A1A1A] mb-2">342</div>
              <div className="text-sm text-[#666]">New Leads This Month</div>
           </div>
           <div className="flex gap-1 items-end h-8">
              {[20, 35, 45, 30, 60, 45, 70, 50, 40].map((h, i) => (
                 <div key={i} className="flex-1 bg-[#1A1A1A] rounded-t-sm opacity-20 hover:opacity-100 transition-opacity" style={{ height: `${h}%` }}></div>
              ))}
           </div>
        </div>

        <div className="md:col-span-4 dash-card-dark p-8 flex flex-col justify-between min-h-[240px] relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-[#EAD07D] rounded-full blur-[80px] opacity-10 pointer-events-none"></div>
           <div className="flex justify-between items-start relative z-10">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white">
                 <Target size={24} />
              </div>
           </div>
           <div className="relative z-10">
              <div className="text-5xl font-light text-white mb-2">92%</div>
              <div className="text-sm text-white/60">Quota Attainment</div>
           </div>
        </div>

        {/* Big Chart Area */}
        <div className="md:col-span-8 dash-card p-8 min-h-[400px]">
           <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-medium">Revenue Growth</h3>
              <div className="flex gap-2">
                 <button className="px-4 py-2 bg-[#F8F8F6] rounded-full text-xs font-bold text-[#1A1A1A]">Monthly</button>
                 <button className="px-4 py-2 bg-white rounded-full text-xs font-bold text-[#666] hover:bg-[#F8F8F6]">Quarterly</button>
              </div>
           </div>
           
           <div className="h-64 relative flex items-end justify-between gap-4 px-4">
              {/* Simulated Wave Chart */}
              <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none">
                 <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="0%" stopColor="#EAD07D" stopOpacity="0.5" />
                       <stop offset="100%" stopColor="#EAD07D" stopOpacity="0" />
                    </linearGradient>
                 </defs>
                 <path d="M0,200 C100,180 200,220 300,150 S500,80 600,100 S800,40 1000,20 V256 H0 Z" fill="url(#chartGradient)" />
                 <path d="M0,200 C100,180 200,220 300,150 S500,80 600,100 S800,40 1000,20" fill="none" stroke="#EAD07D" strokeWidth="4" />
              </svg>

              {/* Data Points Tooltips (Simulated) */}
              <div className="absolute top-[20%] left-[60%] bg-[#1A1A1A] text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg transform -translate-x-1/2">
                 $420k
                 <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1A1A1A]"></div>
              </div>
           </div>
           <div className="flex justify-between text-xs text-[#999] mt-4 pt-4 border-t border-gray-100">
              <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span>
           </div>
        </div>

        {/* Sales Leaderboard */}
        <div className="md:col-span-4 dash-card p-8">
           <h3 className="text-xl font-medium mb-6">Top Performers</h3>
           <div className="space-y-6">
              {[1, 2, 3, 4, 5].map((i) => (
                 <div key={i} className="flex items-center gap-4">
                    <div className="font-bold text-[#1A1A1A] w-4">{i}</div>
                    <img src={`https://picsum.photos/40/40?random=${i+50}`} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" alt="Rep" />
                    <div className="flex-1">
                       <div className="font-bold text-sm">Alex Morgan</div>
                       <div className="text-xs text-[#666]">$124k revenue</div>
                    </div>
                    {i === 1 && <div className="text-[#EAD07D]"><Activity size={16} /></div>}
                 </div>
              ))}
           </div>
           <button className="w-full mt-8 py-3 rounded-xl border border-gray-200 text-sm font-bold text-[#1A1A1A] hover:bg-[#F8F8F6] transition-colors">View Full Leaderboard</button>
        </div>

      </div>
    </div>
  );
};