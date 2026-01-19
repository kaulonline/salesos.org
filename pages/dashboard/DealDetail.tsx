import React from 'react';
import { Phone, Mail, Printer, MoreHorizontal } from 'lucide-react';

export const DealDetail: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-medium text-[#1A1A1A]">Deals</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         {/* Left Sidebar List (Miniature Leads List) */}
         <div className="lg:col-span-3 space-y-4 hidden lg:block">
            {[1, 2, 3, 4, 5].map((i) => (
               <div key={i} className={`p-4 rounded-3xl flex items-center gap-4 cursor-pointer transition-all ${i === 1 ? 'bg-white shadow-sm ring-1 ring-black/5' : 'hover:bg-white/50'}`}>
                  <img src={`https://picsum.photos/50/50?random=${i+20}`} className="w-12 h-12 rounded-full object-cover" alt="User" />
                  <div>
                     <div className="font-bold text-[#1A1A1A]">Katy Fuller</div>
                     <div className="text-xs text-[#666]">Fullstack Engineer</div>
                  </div>
                  {i === 1 && <div className="ml-auto w-2 h-2 rounded-full bg-[#EAD07D]"></div>}
               </div>
            ))}
         </div>

         {/* Center Profile */}
         <div className="lg:col-span-5">
            <div className="dash-card p-8 flex flex-col items-center text-center relative mb-6">
               <div className="absolute top-6 right-6 flex gap-2">
                  <button className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center hover:bg-gray-50 text-[#666]">
                     <Printer size={16} />
                  </button>
                  <button className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center hover:bg-gray-50 text-[#666]">
                     <MoreHorizontal size={16} />
                  </button>
               </div>
               
               <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400" className="w-32 h-32 rounded-full object-cover mb-6" alt="Profile" />
               
               <h2 className="text-2xl font-medium mb-1">Amélie Laurent</h2>
               <p className="text-[#666] mb-6">UX Designer</p>

               <div className="flex gap-2 mb-8">
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold flex items-center gap-1">Figma</span>
                  <span className="px-3 py-1 bg-[#EAD07D]/20 text-[#1A1A1A] rounded-lg text-xs font-bold flex items-center gap-1">Sketch</span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-1">Photoshop</span>
               </div>

               <p className="text-sm text-[#666] leading-relaxed mb-8 max-w-sm">
                  Designed user-focused interfaces, optimized user journeys, and collaborated with developers to align UX with framework capabilities.
               </p>

               <div className="w-full grid grid-cols-2 gap-4">
                  <div className="bg-[#F8F8F6] p-4 rounded-2xl text-left">
                     <div className="text-xs text-[#999] uppercase tracking-wide mb-1">Experience</div>
                     <div className="font-bold text-xl text-[#EAD07D]">5 Years</div>
                  </div>
                  <div className="bg-[#1A1A1A] p-4 rounded-2xl text-left text-white">
                     <div className="text-xs text-white/50 uppercase tracking-wide mb-1">Expected Close</div>
                     <div className="font-bold text-xl">Oct 24</div>
                  </div>
               </div>
            </div>

            <div className="dash-card p-6">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold">Basic Information</h3>
                  <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs">▼</span>
               </div>
               <div className="space-y-4">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-full bg-[#EAD07D]/20 flex items-center justify-center text-[#1A1A1A]"><Mail size={16} /></div>
                     <div>
                        <div className="text-xs text-[#999]">Email</div>
                        <div className="text-sm font-medium">amelie@design.co</div>
                     </div>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-full bg-[#EAD07D]/20 flex items-center justify-center text-[#1A1A1A]"><Phone size={16} /></div>
                     <div>
                        <div className="text-xs text-[#999]">Phone</div>
                        <div className="text-sm font-medium">+1 (555) 000-0000</div>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* Right Stats Column */}
         <div className="lg:col-span-4 space-y-6">
            {/* Match Score */}
            <div className="dash-card p-8 flex items-center justify-between">
               <div>
                  <div className="text-5xl font-light mb-1">9.7</div>
                  <div className="text-xs text-[#666]">Total Score</div>
               </div>
               <div className="relative w-24 h-24">
                   {/* Radial Chart Placeholder */}
                   <svg className="w-full h-full transform -rotate-90">
                       <circle cx="48" cy="48" r="40" stroke="#F2F1EA" strokeWidth="8" fill="transparent" />
                       <circle cx="48" cy="48" r="40" stroke="#EAD07D" strokeWidth="8" fill="transparent" strokeDasharray="251" strokeDashoffset="20" strokeLinecap="round" />
                   </svg>
               </div>
            </div>

            {/* Test Statistics */}
            <div className="dash-card p-8">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold">Deal Velocity</h3>
                  <div className="flex gap-2 text-xs">
                     <span className="flex items-center gap-1"><div className="w-2 h-2 bg-[#EAD07D] rounded-full"></div> This Deal</span>
                     <span className="flex items-center gap-1"><div className="w-2 h-2 bg-gray-300 rounded-full"></div> Avg</span>
                  </div>
               </div>

               <div className="h-48 relative flex items-end justify-between gap-1">
                  {/* Fake Line Chart */}
                  <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none">
                     <path d="M0,150 C20,140 50,160 80,120 S150,50 200,80 S280,100 350,20" fill="none" stroke="#EAD07D" strokeWidth="3" />
                     <path d="M0,100 C20,110 50,130 80,100 S150,80 200,100 S280,120 350,80" fill="none" stroke="#ccc" strokeWidth="2" strokeDasharray="4 4" />
                     
                     <g transform="translate(200, 80)">
                        <circle r="4" fill="#1A1A1A" />
                        <rect x="-30" y="-35" width="60" height="24" rx="12" fill="#1A1A1A" />
                        <text x="0" y="-19" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">294 pts</text>
                     </g>
                  </svg>
               </div>
               
               <div className="flex justify-between text-xs text-[#999] mt-4 pt-4 border-t border-gray-100">
                  <span>Q1</span><span>Q2</span><span>Q3</span><span>Q4</span><span>Q5</span>
               </div>
            </div>

            {/* Job Match */}
            <div className="bg-[#EAD07D] rounded-[2rem] p-8 relative overflow-hidden">
               <div className="relative z-10">
                  <div className="text-sm font-bold text-[#1A1A1A]/60 mb-8">Win Probability</div>
                  <div className="text-5xl font-medium text-[#1A1A1A]">95%</div>
                  <div className="text-sm text-[#1A1A1A] mt-2">Based on historical data</div>
               </div>
               {/* Wave Decoration */}
               <svg className="absolute bottom-0 left-0 w-full h-24 text-[#1A1A1A]" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d="M0,50 C20,60 40,40 60,50 S80,70 100,50 L100,100 L0,100 Z" fill="none" stroke="currentColor" strokeWidth="2" />
               </svg>
            </div>
         </div>
      </div>
    </div>
  );
};