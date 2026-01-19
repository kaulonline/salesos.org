import React from 'react';
import { ArrowUpRight, Play, Activity } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';

export const DashboardHome: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-medium text-[#1A1A1A] mb-8">
          Welcome in, <span className="font-bold">Valentina</span>
        </h1>

        {/* Top Stats Strip */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6">
          <div className="flex items-center gap-4 bg-white/50 p-2 pr-6 rounded-full backdrop-blur-sm">
            <Badge variant="dark" size="md" className="px-6 py-2">Interviews</Badge>
            <Badge variant="yellow" size="md" className="px-6 py-2">Hired</Badge>
            <div className="flex-1 w-32 h-2 bg-gray-200 rounded-full overflow-hidden relative">
               <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNCIgaGVpZ2h0PSI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxjaXJjbGUgY3g9IjIiIGN5PSIyIiByPSIxIiBmaWxsPSIjRQUFQUFBIi8+PC9zdmc+')] opacity-30"></div>
            </div>
            <Badge variant="outline" size="md" className="px-4 py-1.5 border-black/10">Output 10%</Badge>
          </div>

          <div className="flex gap-12">
            {[
                { label: 'Deals', val: '78' },
                { label: 'Closed', val: '56' },
                { label: 'Projects', val: '203' }
            ].map(stat => (
                <div key={stat.label} className="text-right">
                    <div className="text-4xl font-light">{stat.val}</div>
                    <div className="text-xs uppercase font-bold text-[#666] tracking-wider mt-1">{stat.label}</div>
                </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* 1. Profile / Key Contact Card (Left Column) */}
        <Card className="md:col-span-4 p-4 min-h-[340px] flex flex-col justify-end group">
           <img 
             src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800" 
             className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
             alt="Top Performer"
           />
           <div className="relative z-10 p-4">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl text-white">
                <h3 className="text-xl font-medium mb-1">Lora Piterson</h3>
                <p className="text-white/70 text-sm mb-4">VP of Sales</p>
                <div className="bg-[#1A1A1A]/80 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium w-fit">
                   $124,200 <span className="text-white/50 text-xs ml-1">ARR</span>
                </div>
              </div>
           </div>
        </Card>

        {/* 2. Pipeline Progress (Middle Column) */}
        <Card padding="lg" className="md:col-span-4 flex flex-col justify-between">
           <div className="flex justify-between items-start mb-6">
              <div>
                 <h3 className="text-xl font-medium mb-1">Pipeline</h3>
                 <div className="flex items-baseline gap-2">
                   <span className="text-4xl font-light tracking-tight">6.1 <span className="text-lg text-[#666]">$M</span></span>
                 </div>
                 <span className="text-xs text-[#666] mt-1 block">Forecast this week</span>
              </div>
              <button className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center hover:bg-gray-50">
                 <ArrowUpRight size={18} />
              </button>
           </div>
           
           <div className="flex items-end justify-between h-40 gap-3 px-2">
              {[35, 55, 45, 80, 50, 65, 40].map((h, i) => (
                 <div key={i} className="w-full bg-[#F2F1EA] rounded-full relative group h-full flex items-end">
                    <div 
                       style={{height: `${h}%`}} 
                       className={`w-full rounded-full transition-all duration-1000 ${i === 3 ? 'bg-[#EAD07D]' : 'bg-[#1A1A1A]'}`}
                    >
                      {i === 3 && (
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#EAD07D] text-[#1A1A1A] text-[10px] font-bold py-1 px-2 rounded-lg whitespace-nowrap">
                          $2.4M
                        </div>
                      )}
                    </div>
                 </div>
              ))}
           </div>
           
           <div className="flex justify-between text-xs text-[#999] font-medium mt-4 px-1">
             <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
           </div>
        </Card>

        {/* 3. Activity Tracker (Right Column) */}
        <Card padding="lg" className="md:col-span-4 flex flex-col">
           <div className="flex justify-between items-start mb-2">
              <h3 className="text-xl font-medium">Call Time</h3>
              <button className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center hover:bg-gray-50">
                 <ArrowUpRight size={18} />
              </button>
           </div>

           <div className="flex-1 flex items-center justify-center relative my-4">
              {/* Radial Progress Simulation */}
              <div className="relative w-48 h-48">
                 <svg className="w-full h-full transform -rotate-90">
                    <circle cx="96" cy="96" r="88" stroke="#F2F1EA" strokeWidth="6" fill="transparent" />
                    <circle cx="96" cy="96" r="88" stroke="#EAD07D" strokeWidth="6" fill="transparent" strokeDasharray="560" strokeDashoffset="140" strokeLinecap="round" />
                    <circle cx="96" cy="96" r="72" stroke="#1A1A1A" strokeWidth="2" fill="transparent" strokeDasharray="4 8" opacity="0.1" />
                 </svg>
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <div className="text-4xl font-medium text-[#1A1A1A]">02:35</div>
                    <div className="text-xs text-[#999] uppercase tracking-wide mt-1">Talk Time</div>
                 </div>
              </div>
           </div>

           <div className="flex justify-between items-center mt-2">
             <button className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
               <Play size={20} className="ml-1" fill="currentColor" />
             </button>
             <button className="w-12 h-12 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center hover:bg-black transition-colors">
               <div className="w-4 h-4 bg-white rounded-sm"></div>
             </button>
           </div>
        </Card>

        {/* 4. Bottom Row - Tasks / Calendar */}
        <Card variant="dark" padding="lg" className="md:col-span-8 flex flex-col md:flex-row gap-10">
           {/* Dark card background stats decoration */}
           <div className="absolute top-0 right-0 p-4 flex gap-1">
              {[...Array(20)].map((_, i) => (
                 <div key={i} className={`w-2 h-2 rounded-full ${i % 3 === 0 ? 'bg-[#EAD07D]' : 'bg-white/10'}`}></div>
              ))}
           </div>

           <div className="flex-1 z-10">
              <div className="flex justify-between items-start mb-8">
                 <h3 className="text-2xl font-medium">Onboarding Task</h3>
                 <span className="text-3xl font-light opacity-50">2/8</span>
              </div>

              <div className="space-y-6">
                 {[
                    { title: "Interview", time: "Sep 13, 08:30", status: "done" },
                    { title: "Team Meeting", time: "Sep 13, 10:30", status: "done" },
                    { title: "Project Update", time: "Sep 13, 13:00", status: "pending" },
                 ].map((task, i) => (
                    <div key={i} className="flex items-center gap-4 group cursor-pointer">
                       <div className={`w-10 h-10 rounded-full flex items-center justify-center ${task.status === 'done' ? 'bg-white/10 text-white' : 'bg-white text-[#1A1A1A]'}`}>
                          {task.status === 'done' ? (
                             <div className="w-5 h-5 bg-[#EAD07D] rounded-full flex items-center justify-center">
                               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="4"><polyline points="20 6 9 17 4 12"></polyline></svg>
                             </div>
                          ) : (
                             <div className="w-3 h-3 rounded-full border-2 border-[#1A1A1A]"></div>
                          )}
                       </div>
                       <div className="flex-1">
                          <h4 className={`font-medium ${task.status === 'done' ? 'opacity-50' : 'opacity-100'}`}>{task.title}</h4>
                          <p className="text-xs opacity-40">{task.time}</p>
                       </div>
                       {task.status !== 'done' && (
                          <div className="w-2 h-2 rounded-full bg-[#EAD07D]"></div>
                       )}
                    </div>
                 ))}
              </div>
           </div>

           <div className="w-full md:w-64 bg-white/5 rounded-3xl p-6 backdrop-blur-sm border border-white/5">
              <h4 className="mb-4 text-sm opacity-60 uppercase tracking-wide">Schedule</h4>
              <div className="space-y-4">
                 <div className="bg-[#EAD07D] p-4 rounded-xl text-[#1A1A1A]">
                    <div className="text-xs font-bold mb-1 opacity-70">09:30 - 10:00</div>
                    <div className="font-bold">Weekly Sync</div>
                 </div>
                 <div className="bg-white/10 p-4 rounded-xl">
                    <div className="text-xs font-bold mb-1 opacity-50">11:00 - 12:00</div>
                    <div className="font-bold">Design Review</div>
                 </div>
              </div>
           </div>
        </Card>

        {/* 5. Right Bottom - Onboarding/Stats */}
        <Card padding="lg" className="md:col-span-4 flex flex-col justify-between">
           <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-medium">Pipeline Mix</h3>
              <span className="text-2xl font-light">18%</span>
           </div>
           
           <div className="flex gap-2 mb-8">
              <div className="flex-1 bg-[#EAD07D] h-12 rounded-xl flex items-center justify-center text-xs font-bold">New</div>
              <div className="w-12 bg-[#1A1A1A] h-12 rounded-xl"></div>
              <div className="w-12 bg-gray-200 h-12 rounded-xl"></div>
           </div>

           <hr className="border-gray-100 mb-6" />

           <div>
              <div className="flex justify-between text-sm mb-4">
                 <span className="text-[#666]">Inbound</span>
                 <span className="font-bold">25%</span>
              </div>
              <div className="flex justify-between text-sm">
                 <span className="text-[#666]">Outbound</span>
                 <span className="font-bold">0%</span>
              </div>
           </div>
        </Card>

      </div>
    </div>
  );
};