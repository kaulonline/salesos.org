import React, { useState, useEffect } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { ActivityFeed, QuickActions } from '../../components/dashboard';

export const DashboardHome: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
           <Skeleton className="h-10 w-64 mb-8" />
           <div className="flex flex-col md:flex-row justify-between items-end gap-6">
              <Skeleton className="h-12 w-96 rounded-full" />
              <div className="flex gap-12">
                 {[1, 2, 3].map(i => (
                    <div key={i} className="flex flex-col items-end gap-2">
                       <Skeleton className="h-10 w-16" />
                       <Skeleton className="h-4 w-12" />
                    </div>
                 ))}
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
           <Skeleton className="md:col-span-4 h-[340px] rounded-[2rem]" />
           <Skeleton className="md:col-span-4 h-[340px] rounded-[2rem]" />
           <Skeleton className="md:col-span-4 h-[340px] rounded-[2rem]" />
           <Skeleton className="md:col-span-8 h-[240px] rounded-[2rem]" />
           <Skeleton className="md:col-span-4 h-[240px] rounded-[2rem]" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-medium text-[#1A1A1A] mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          Welcome in, <span className="font-bold">Valentina</span>
        </h1>

        {/* Top Stats Strip - Frosted Glass Control Center */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
          <div className="flex items-center gap-4 bg-white/40 p-2 pr-6 rounded-full backdrop-blur-xl border border-white/40 shadow-sm w-fit">
            <Badge variant="dark" size="md" className="px-6 py-2 shadow-lg">Interviews</Badge>
            <Badge variant="yellow" size="md" className="px-6 py-2 shadow-sm">Hired</Badge>
            <div className="flex-1 w-32 h-2 bg-gray-200/50 rounded-full overflow-hidden relative">
               <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNCIgaGVpZ2h0PSI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxjaXJjbGUgY3g9IjIiIGN5PSIyIiByPSIxIiBmaWxsPSIjRQUFQUFBIi8+PC9zdmc+')] opacity-30"></div>
            </div>
            <Badge variant="outline" size="md" className="px-4 py-1.5 border-black/10 bg-white/50">Output 10%</Badge>
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
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
        
        {/* 1. Profile / Key Contact Card (Left Column) */}
        <Card className="md:col-span-4 p-4 min-h-[340px] flex flex-col justify-end group overflow-hidden">
           <img 
             src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800" 
             className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
             alt="Top Performer"
           />
           {/* Dark Gradient Overlay for text readability */}
           <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80 z-0"></div>
           
           <div className="relative z-10 p-4">
              {/* Frosted Dark Glass Card */}
              <div className="bg-black/30 backdrop-blur-md border border-white/10 p-5 rounded-2xl text-white shadow-xl">
                <h3 className="text-xl font-medium mb-1">Lora Piterson</h3>
                <p className="text-white/70 text-sm mb-4">VP of Sales</p>
                <div className="bg-[#1A1A1A]/80 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium w-fit border border-white/10">
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
              <button className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-colors">
                 <ArrowUpRight size={18} />
              </button>
           </div>
           
           <div className="flex items-end justify-between h-40 gap-3 px-2">
              {[35, 55, 45, 80, 50, 65, 40].map((h, i) => (
                 <div key={i} className="w-full bg-[#F2F1EA] rounded-full relative group h-full flex items-end">
                    <div 
                       style={{height: `${h}%`}} 
                       className={`w-full rounded-full transition-all duration-1000 ${i === 3 ? 'bg-[#EAD07D] shadow-[0_0_20px_rgba(234,208,125,0.3)]' : 'bg-[#1A1A1A]'}`}
                    >
                      {i === 3 && (
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#EAD07D] text-[#1A1A1A] text-[10px] font-bold py-1 px-2 rounded-lg whitespace-nowrap shadow-sm animate-bounce">
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

        {/* 3. Quick Actions (Right Column) - REPLACED Activity Tracker */}
        <div className="md:col-span-4">
            <QuickActions />
        </div>

        {/* 4. Activity Feed (Replaces Tasks) - Expanded Activity */}
        <div className="md:col-span-8 h-[400px]">
           <ActivityFeed />
        </div>

        {/* 5. Right Bottom - Pipeline Mix */}
        <Card padding="lg" className="md:col-span-4 flex flex-col justify-between h-[400px]">
           <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-medium">Pipeline Mix</h3>
              <span className="text-2xl font-light">18%</span>
           </div>
           
           <div className="flex gap-2 mb-8">
              <div className="flex-1 bg-[#EAD07D] h-12 rounded-xl flex items-center justify-center text-xs font-bold shadow-sm">New</div>
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