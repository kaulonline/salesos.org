import React, { useEffect, useState } from 'react';
import { ArrowRight, PlayCircle, Search, Bell } from 'lucide-react';
import { Button } from './ui/Button';
import { GradientText } from './ui/GradientText';
import { RippleButton } from './ui/RippleButton';

export const Hero: React.FC = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getTransition = (delay: number) => {
    return `transition-all duration-1000 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`;
  };

  return (
    <section className="relative pt-20 md:pt-32 lg:pt-48 pb-16 md:pb-20 lg:pb-32 overflow-hidden bg-[#F2F1EA]">
      {/* Background Ambience with Animated Blobs */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#EAD07D] rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob"></div>
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#D1D1C7] rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob" style={{ animationDelay: '2s' }}></div>
          <div className="absolute bottom-[-20%] left-[20%] w-[50%] h-[50%] bg-[#EAD07D] rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto mb-20">
          
          {/* Frosted Pill */}
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/60 backdrop-blur-md border border-white/60 shadow-sm mb-8 ${getTransition(0)}`} style={{ transitionDelay: '0ms' }}>
            <span className="w-2 h-2 rounded-full bg-[#EAD07D] animate-pulse shadow-[0_0_10px_#EAD07D]" />
            <span className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">v2.0 Now Available</span>
          </div>

          <h1 className={`text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1] text-[#1A1A1A] ${getTransition(0)}`} style={{ transitionDelay: '100ms' }}>
            The Operating System for <span className="hidden sm:inline"><br /></span>
            <GradientText
              colors={['#888888', '#EAD07D', '#666666', '#EAD07D', '#888888']}
              animate
              animationDuration={4}
              className="font-extrabold"
            >
              Revenue Growth
            </GradientText>
          </h1>
          
          <p className={`text-lg md:text-xl text-[#666] mb-10 max-w-2xl leading-relaxed ${getTransition(0)}`} style={{ transitionDelay: '200ms' }}>
            A unified workspace designed to help modern sales teams automate outreach, analyze pipeline, and close deals faster.
          </p>
          
          <div className={`flex flex-col sm:flex-row items-center gap-4 ${getTransition(0)}`} style={{ transitionDelay: '300ms' }}>
            <Button variant="primary" size="lg" className="group min-w-[180px]">
              Start Free Trial
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="outline" size="lg" className="min-w-[180px] bg-white/80 backdrop-blur-sm border-white/50 shadow-sm text-[#1A1A1A] hover:bg-white">
              <PlayCircle className="mr-2 w-4 h-4" />
              Watch Demo
            </Button>
          </div>
        </div>

        {/* Dashboard Preview Mockup */}
        <div className={`relative mx-auto max-w-6xl ${getTransition(0)}`} style={{ transitionDelay: '500ms' }}>
          
          {/* Laptop Body Mockup */}
          <div className="rounded-[2rem] bg-[#0a0a0a] p-[2%] shadow-2xl relative">
             <div className="absolute top-[2%] left-1/2 -translate-x-1/2 w-20 h-4 bg-black rounded-b-xl z-20"></div>
             
             {/* Screen Content */}
             <div className="bg-[#F8F7F4] rounded-[1.5rem] overflow-hidden aspect-[16/10] md:aspect-[16/9] flex flex-col font-sans relative">
                
                {/* Dashboard Header - Glass */}
                <div className="px-8 py-6 flex justify-between items-center bg-white/40 backdrop-blur-md relative z-10 border-b border-white/50">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-[#1A1A1A] text-white flex items-center justify-center">
                         <Search size={16} />
                      </div>
                      <h2 className="text-2xl font-medium text-[#1A1A1A] hidden md:block">Welcome in, <span className="font-bold">SalesOS</span></h2>
                   </div>
                   <div className="flex gap-2 overflow-x-auto no-scrollbar bg-white/50 p-1.5 rounded-full backdrop-blur-md border border-white/20">
                      <div className="bg-[#1A1A1A] text-white px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap shadow-md">Dashboard</div>
                      <div className="text-[#666] hover:text-[#1A1A1A] px-5 py-2 rounded-full text-sm font-medium cursor-pointer whitespace-nowrap hover:bg-white/50 transition-colors">Pipeline</div>
                      <div className="text-[#666] hover:text-[#1A1A1A] px-5 py-2 rounded-full text-sm font-medium cursor-pointer whitespace-nowrap hover:bg-white/50 transition-colors">Analytics</div>
                   </div>
                   <div className="hidden md:flex items-center">
                      <div className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-[#1A1A1A] shadow-sm ml-4">
                         <Bell size={18} />
                      </div>
                      <div className="w-10 h-10 rounded-full bg-[#EAD07D] flex items-center justify-center text-[#1A1A1A] font-bold shadow-sm ml-3">
                         JD
                      </div>
                   </div>
                </div>

                {/* Dashboard Ambient Glow */}
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#EAD07D]/20 blur-[80px] rounded-full pointer-events-none" />

                {/* Main Content Grid */}
                <div className="flex-1 px-8 pb-8 overflow-hidden pt-8">
                   {/* Top Stats Row - Frosted */}
                   <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-6">
                      <div className="flex gap-4 hidden md:flex items-center bg-white/60 backdrop-blur-xl p-2 pr-6 rounded-full border border-white/40 shadow-sm">
                         <div className="bg-[#1A1A1A] text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg">15%</div>
                         <div className="bg-[#EAD07D] text-[#1A1A1A] px-4 py-1.5 rounded-full text-xs font-bold shadow-sm">15%</div>
                         <div className="border border-gray-300 text-[#666] px-4 py-1.5 rounded-full text-xs font-bold bg-white/50">60%</div>
                         <div className="w-48 h-2 bg-gray-200 rounded-full self-center ml-2 relative overflow-hidden">
                            <div className="absolute top-0 left-0 h-full w-[40%] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNCIgaGVpZ2h0PSI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxjaXJjbGUgY3g9IjIiIGN5PSIyIiByPSIxIiBmaWxsPSIjRQUFQUFBIi8+PC9zdmc+')] opacity-30"></div>
                         </div>
                      </div>
                      <div className="flex gap-8 text-right w-full md:w-auto justify-between md:justify-end">
                         <div>
                            <div className="text-2xl md:text-3xl font-light text-[#1A1A1A]">78</div>
                            <div className="text-xs text-[#666] font-medium uppercase tracking-wide">Leads</div>
                         </div>
                         <div>
                            <div className="text-2xl md:text-3xl font-light text-[#1A1A1A]">56</div>
                            <div className="text-xs text-[#666] font-medium uppercase tracking-wide">Closings</div>
                         </div>
                         <div>
                            <div className="text-3xl md:text-4xl font-light text-[#1A1A1A]">203</div>
                            <div className="text-xs text-[#666] font-medium uppercase tracking-wide">Projects</div>
                         </div>
                      </div>
                   </div>

                   {/* Bento Grid */}
                   <div className="grid grid-cols-1 md:grid-cols-12 gap-5 h-full pb-8 md:pb-0">
                      
                      {/* Profile Card */}
                      <div className="md:col-span-4 bg-[#E5E5E0] rounded-3xl p-4 relative overflow-hidden group min-h-[200px] shadow-sm">
                         <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800" className="w-full h-full object-cover rounded-2xl grayscale group-hover:grayscale-0 transition-all duration-500" alt="Profile" />
                         <div className="absolute bottom-8 left-8 text-white z-20">
                            <h3 className="text-xl font-medium mb-1 drop-shadow-md">Lora Piterson</h3>
                            <p className="text-white/80 text-sm drop-shadow-md">VP of Sales</p>
                         </div>
                         {/* Frosted Badge */}
                         <div className="absolute bottom-8 right-8 bg-white/20 backdrop-blur-xl border border-white/20 text-white px-4 py-1.5 rounded-full text-sm font-medium z-20 shadow-lg">
                            $1,200
                         </div>
                         {/* Gradient Overlay for Readability */}
                         <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent rounded-2xl z-10 pointer-events-none"></div>
                      </div>

                      {/* Middle Column */}
                      <div className="md:col-span-4 flex flex-col gap-5">
                         {/* Progress Chart */}
                         <div className="bg-white rounded-3xl p-6 flex-1 shadow-sm min-h-[200px] border border-black/5">
                            <div className="flex justify-between items-start mb-6">
                               <div>
                                  <h3 className="text-lg text-[#1A1A1A] font-medium">Progress</h3>
                                  <div className="flex items-baseline gap-2 mt-1">
                                    <span className="text-3xl font-light">6.1 h</span>
                                    <span className="text-xs text-[#666]">Work Time</span>
                                  </div>
                               </div>
                               <div className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center rotate-45">
                                  <ArrowRight size={14} />
                               </div>
                            </div>
                            <div className="flex items-end justify-between h-32 gap-3 px-2">
                               {[30, 50, 40, 70, 45, 60, 35].map((h, i) => (
                                  <div key={i} className="w-full bg-[#F2F1EA] rounded-full relative group">
                                     <div 
                                        style={{height: `${h}%`}} 
                                        className={`absolute bottom-0 left-0 w-full rounded-full transition-all duration-1000 ${i === 3 ? 'bg-[#EAD07D] shadow-[0_0_15px_rgba(234,208,125,0.4)]' : 'bg-[#1A1A1A]'}`}
                                     >
                                     </div>
                                  </div>
                               ))}
                            </div>
                         </div>
                      </div>

                      {/* Right Column */}
                      <div className="md:col-span-4 flex flex-col gap-5">
                         {/* Time Tracker */}
                         <div className="bg-white rounded-3xl p-6 shadow-sm border border-black/5">
                            <div className="flex justify-between items-center mb-4">
                               <h3 className="text-lg font-medium">Time tracker</h3>
                               <div className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center rotate-45">
                                  <ArrowRight size={14} />
                               </div>
                            </div>
                            <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
                               <div className="absolute inset-0 rounded-full border-4 border-[#F2F1EA]"></div>
                               <div className="absolute inset-0 rounded-full border-4 border-[#EAD07D] border-l-transparent border-b-transparent rotate-45 shadow-[0_0_20px_rgba(234,208,125,0.2)]"></div>
                               <div className="text-center">
                                  <div className="text-2xl font-bold text-[#1A1A1A]">02:35</div>
                                  <div className="text-xs text-[#999] mt-1">Work Time</div>
                               </div>
                            </div>
                         </div>
                      </div>

                   </div>
                </div>
             </div>
          </div>
          
          {/* Bottom Reflection */}
          <div className="absolute -bottom-12 left-10 right-10 h-20 bg-black/20 blur-[50px] -z-10 rounded-[100%]" />
        </div>
      </div>
    </section>
  );
};