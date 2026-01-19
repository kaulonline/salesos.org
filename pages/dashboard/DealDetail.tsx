import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Phone, Mail, Printer, MoreHorizontal, ArrowLeft, Download, Share2, ChevronDown, ChevronUp, MapPin, Calendar, CheckCircle2 } from 'lucide-react';

// Enhanced Mock Data
const DEALS_DATA = [
  { 
    id: 1, 
    title: 'Acme Corp Expansion', 
    company: 'Acme Corp', 
    value: '$125,000', 
    stage: 'Discovery', 
    contactName: 'Amélie Laurent',
    contactRole: 'VP of Product',
    contactImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400',
    owner: 'Valentina', 
    probability: '25%', 
    email: 'amelie@acme.com', 
    phone: '+1 (555) 123-4567', 
    location: 'Paris, France',
    description: 'Leading the expansion of existing enterprise license to include the new marketing team division. Key stakeholder is deeply interested in the AI features and automation capabilities.', 
    expectedClose: 'Oct 24, 2024', 
    score: 9.7,
    tags: ['SaaS', 'Expansion', 'Q4 Priority']
  },
  { 
    id: 2, 
    title: 'GlobalBank Enterprise', 
    company: 'GlobalBank', 
    value: '$850,000', 
    stage: 'Proposal', 
    contactName: 'James Wilson',
    contactRole: 'CTO',
    contactImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
    owner: 'Alex', 
    probability: '60%', 
    email: 'j.wilson@globalbank.com', 
    phone: '+1 (555) 987-6543', 
    location: 'London, UK',
    description: 'Full stack digital transformation project. Competing with Salesforce and HubSpot. Our security compliance is the winning factor.', 
    expectedClose: 'Dec 15, 2024', 
    score: 8.4,
    tags: ['Enterprise', 'Security', 'Banking']
  },
  { 
    id: 3, 
    title: 'StartUp Seed', 
    company: 'Nebula', 
    value: '$45,000', 
    stage: 'Discovery', 
    contactName: 'Sarah Chen',
    contactRole: 'Founder',
    contactImage: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
    owner: 'Sarah', 
    probability: '30%', 
    email: 'sarah@nebula.io', 
    phone: '+1 (555) 456-7890', 
    location: 'San Francisco, CA',
    description: 'Seed stage startup looking for a scalable CRM foundation. Price sensitive but high growth potential.', 
    expectedClose: 'Nov 30, 2024', 
    score: 6.8,
    tags: ['Startup', 'Seed', 'Growth']
  },
  { 
    id: 4, 
    title: 'Design System Revamp', 
    company: 'Vertex', 
    value: '$95,000', 
    stage: 'Negotiation', 
    contactName: 'Marcus Reid',
    contactRole: 'Head of Design',
    contactImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400',
    owner: 'Valentina', 
    probability: '85%', 
    email: 'marcus@vertex.com', 
    phone: '+1 (555) 222-3333', 
    location: 'Berlin, Germany',
    description: 'Consulting services and tooling for their new design system rollout.', 
    expectedClose: 'Oct 15, 2024', 
    score: 9.2,
    tags: ['Design', 'Consulting']
  },
  { 
    id: 5, 
    title: 'Q4 Marketing Push', 
    company: 'Sisyphus', 
    value: '$210,000', 
    stage: 'Proposal', 
    contactName: 'Elena Gilbert',
    contactRole: 'CMO',
    contactImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
    owner: 'Mike', 
    probability: '55%', 
    email: 'elena@sisyphus.com', 
    phone: '+1 (555) 444-5555', 
    location: 'New York, NY',
    description: 'Q4 ad spend management and attribution tools implementation.', 
    expectedClose: 'Nov 01, 2024', 
    score: 7.5,
    tags: ['Marketing', 'Q4', 'Ads']
  },
  { 
    id: 6, 
    title: 'Annual Contract Renewal', 
    company: 'Logitech', 
    value: '$120,000', 
    stage: 'Closed Won', 
    contactName: 'David Kim',
    contactRole: 'Procurement Lead',
    contactImage: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=400',
    owner: 'Valentina', 
    probability: '100%', 
    email: 'david@logitech.com', 
    phone: '+1 (555) 666-7777', 
    location: 'Tokyo, Japan',
    description: 'Standard yearly renewal of core platform licenses.', 
    expectedClose: 'Sep 30, 2024', 
    score: 10.0,
    tags: ['Renewal', 'Enterprise']
  },
];

export const DealDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const deal = DEALS_DATA.find(d => d.id === Number(id));
  
  const [openSection, setOpenSection] = useState<string | null>('basic');
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  if (!deal) return null;

  // Chart Data: Days spent in each stage vs Average
  const velocityData = [
    { label: 'Lead', deal: 2, avg: 5 },
    { label: 'Discovery', deal: 12, avg: 15 },
    { label: 'Qual', deal: 28, avg: 25 },
    { label: 'Demo', deal: 35, avg: 32 },
    { label: 'Proposal', deal: 42, avg: 45 },
    { label: 'Negot.', deal: 50, avg: 55 },
  ];

  const maxY = Math.max(...velocityData.map(d => Math.max(d.deal, d.avg))) * 1.2;

  // Helper to get coordinates for the chart (0-100 scale)
  const getPoint = (index: number, val: number) => {
     // Padding: x from 5 to 95, y from 90 to 10
     const x = 5 + (index / (velocityData.length - 1)) * 90;
     const y = 90 - (val / maxY) * 80;
     return { x, y };
  };

  // Generate SVG Paths
  const generatePath = (key: 'deal' | 'avg') => {
    if (velocityData.length === 0) return '';
    
    // Start point
    const first = getPoint(0, velocityData[0][key]);
    let d = `M ${first.x},${first.y}`;

    // Bezier curves
    for (let i = 0; i < velocityData.length - 1; i++) {
        const curr = getPoint(i, velocityData[i][key]);
        const next = getPoint(i + 1, velocityData[i+1][key]);
        
        const controlX = (curr.x + next.x) / 2;
        d += ` C ${controlX},${curr.y} ${controlX},${next.y} ${next.x},${next.y}`;
    }
    return d;
  };

  return (
    <div className="max-w-[1600px] mx-auto p-6">
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Sidebar - Compact list of other contacts/deals */}
        <div className="lg:w-80 shrink-0 space-y-4 hidden xl:block">
           <button 
                onClick={() => navigate('/dashboard/deals')} 
                className="flex items-center gap-2 text-[#666] hover:text-[#1A1A1A] mb-8 transition-colors font-medium group"
            >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Pipeline
           </button>

           {DEALS_DATA.map((d) => (
             <Link to={`/dashboard/deals/${d.id}`} key={d.id} className={`block p-4 rounded-3xl transition-all ${d.id === deal.id ? 'bg-[#EAD07D] shadow-md' : 'bg-white hover:bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                   <img src={d.contactImage} alt={d.contactName} className={`w-10 h-10 rounded-full object-cover border-2 ${d.id === deal.id ? 'border-[#1A1A1A]' : 'border-white'}`} />
                   <div className="min-w-0">
                      <div className={`text-sm font-bold truncate ${d.id === deal.id ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}>{d.contactName}</div>
                      <div className={`text-xs truncate ${d.id === deal.id ? 'text-[#1A1A1A]/70' : 'text-[#666]'}`}>{d.title}</div>
                   </div>
                   {d.id === deal.id && <div className="ml-auto w-2 h-2 rounded-full bg-[#1A1A1A]"></div>}
                </div>
                {d.id === deal.id && (
                  <div className="mt-3 w-full bg-[#1A1A1A]/10 h-1 rounded-full overflow-hidden">
                     <div className="h-full bg-[#1A1A1A]" style={{width: d.probability}}></div>
                  </div>
                )}
             </Link>
           ))}
        </div>

        {/* Main Profile Area */}
        <div className="flex-1 min-w-0">
           
           {/* Top Row */}
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
              
              {/* Profile Card */}
              <div className="lg:col-span-8 bg-[#F8F8F6] rounded-[2.5rem] p-8 lg:p-10 relative overflow-hidden flex flex-col md:flex-row gap-8 items-start">
                 {/* Background Gradient */}
                 <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white rounded-full blur-[80px] opacity-60 pointer-events-none -translate-y-1/2 translate-x-1/2"></div>

                 <div className="shrink-0 relative">
                    <img src={deal.contactImage} alt={deal.contactName} className="w-32 h-32 md:w-40 md:h-40 rounded-[2rem] object-cover shadow-lg" />
                 </div>
                 
                 <div className="flex-1 relative z-10">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                           <h1 className="text-3xl font-medium text-[#1A1A1A] mb-1">{deal.contactName}</h1>
                           <div className="text-[#666] text-lg mb-4">{deal.contactRole}</div>
                        </div>
                        <div className="flex gap-2">
                           <button className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#1A1A1A] hover:bg-[#EAD07D] transition-colors shadow-sm"><Printer size={18} /></button>
                           <button className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#1A1A1A] hover:bg-[#EAD07D] transition-colors shadow-sm"><Phone size={18} /></button>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-6">
                       {deal.tags.map((tag, i) => (
                          <span key={i} className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 ${i === 0 ? 'bg-[#EAD07D]/20 text-[#1A1A1A]' : i === 1 ? 'bg-[#1A1A1A] text-white' : 'bg-white border border-gray-200 text-[#666]'}`}>
                             {i === 0 && <div className="w-1.5 h-1.5 rounded-full bg-[#EAD07D]"></div>}
                             {tag}
                          </span>
                       ))}
                    </div>

                    <p className="text-[#666] leading-relaxed text-sm mb-6 max-w-xl">
                       {deal.description}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-6 border-t border-black/5 pt-6">
                       <div>
                          <div className="text-xs font-bold text-[#999] uppercase tracking-wide mb-1">Company</div>
                          <div className="text-sm font-bold text-[#1A1A1A]">{deal.company}</div>
                       </div>
                       <div>
                          <div className="text-xs font-bold text-[#999] uppercase tracking-wide mb-1">Location</div>
                          <div className="text-sm font-bold text-[#1A1A1A] flex items-center gap-1"><MapPin size={12} /> {deal.location}</div>
                       </div>
                       <div>
                          <div className="text-xs font-bold text-[#999] uppercase tracking-wide mb-1">Deal Value</div>
                          <div className="text-sm font-bold text-[#1A1A1A]">{deal.value}</div>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Score Card */}
              <div className="lg:col-span-4 bg-white rounded-[2.5rem] p-8 shadow-card flex flex-col items-center justify-center text-center relative overflow-hidden">
                 <div className="relative w-48 h-48 mb-4">
                     <svg className="w-full h-full transform -rotate-90">
                         <circle cx="96" cy="96" r="80" stroke="#F2F1EA" strokeWidth="16" fill="transparent" />
                         <circle 
                            cx="96" 
                            cy="96" 
                            r="80" 
                            stroke="#EAD07D" 
                            strokeWidth="16" 
                            fill="transparent" 
                            strokeDasharray={`${deal.score * 50.2} 502`} 
                            strokeLinecap="round" 
                         />
                     </svg>
                     <div className="absolute inset-0 flex flex-col items-center justify-center">
                         <div className="text-5xl font-medium text-[#1A1A1A]">{deal.score}</div>
                         <div className="text-sm text-[#999] mt-1">Total score</div>
                     </div>
                 </div>
              </div>
           </div>

           {/* Middle Row: Content & Stats */}
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
              
              {/* Accordions Column */}
              <div className="lg:col-span-4 space-y-4">
                 {/* Basic Info */}
                 <div className="bg-white rounded-[2rem] px-6 py-4 shadow-sm border border-black/5">
                    <button 
                       onClick={() => toggleSection('basic')} 
                       className="w-full flex justify-between items-center text-[#1A1A1A] font-medium"
                    >
                       Basic Information
                       {openSection === 'basic' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    {openSection === 'basic' && (
                       <div className="mt-4 space-y-4 animate-in slide-in-from-top-2">
                          <div className="flex justify-between items-center py-2 border-b border-gray-50">
                             <span className="text-sm text-[#666]">Deal ID</span>
                             <span className="text-sm font-bold text-[#1A1A1A]">#{deal.id + 10240}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-gray-50">
                             <span className="text-sm text-[#666]">Stage</span>
                             <span className="text-sm font-bold text-[#1A1A1A]">{deal.stage}</span>
                          </div>
                          <div className="flex justify-between items-center py-2">
                             <span className="text-sm text-[#666]">Close Date</span>
                             <span className="text-sm font-bold text-[#1A1A1A]">{deal.expectedClose}</span>
                          </div>
                       </div>
                    )}
                 </div>

                 {/* Contact Details */}
                 <div className="bg-white rounded-[2rem] px-6 py-4 shadow-sm border border-black/5">
                    <button 
                       onClick={() => toggleSection('contact')} 
                       className="w-full flex justify-between items-center text-[#1A1A1A] font-medium"
                    >
                       Contact Details
                       {openSection === 'contact' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    {openSection === 'contact' && (
                       <div className="mt-4 space-y-4 animate-in slide-in-from-top-2">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-[#EAD07D]/20 flex items-center justify-center text-[#1A1A1A]"><Mail size={14} /></div>
                             <span className="text-sm text-[#1A1A1A]">{deal.email}</span>
                          </div>
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-[#EAD07D]/20 flex items-center justify-center text-[#1A1A1A]"><Phone size={14} /></div>
                             <span className="text-sm text-[#1A1A1A]">{deal.phone}</span>
                          </div>
                       </div>
                    )}
                 </div>
                 
                 {/* Social Media (Placeholder) */}
                 <div className="bg-white rounded-[2rem] px-6 py-4 shadow-sm border border-black/5">
                    <button className="w-full flex justify-between items-center text-[#1A1A1A] font-medium opacity-50 cursor-not-allowed">
                       Social Media
                       <ChevronDown size={18} />
                    </button>
                 </div>
              </div>

              {/* Stats & Charts Column */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                 
                 {/* Stats Pills */}
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-[#EAD07D] rounded-[1.5rem] p-5 relative overflow-hidden group hover:scale-[1.02] transition-transform">
                       <div className="text-2xl font-medium text-[#1A1A1A] mb-1">{deal.value}</div>
                       <div className="text-xs text-[#1A1A1A]/70 uppercase font-bold tracking-wider">Deal Value</div>
                    </div>
                    
                    <div className="bg-[#1A1A1A] rounded-[1.5rem] p-5 relative overflow-hidden group hover:scale-[1.02] transition-transform">
                       <div className="text-2xl font-medium text-white mb-1">{deal.probability}</div>
                       <div className="text-xs text-white/50 uppercase font-bold tracking-wider">Probability</div>
                    </div>

                    <div className="bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNCIgaGVpZ2h0PSI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxjaXJjbGUgY3g9IjIiIGN5PSIyIiByPSIxIiBmaWxsPSIjRQUFQUFBIi8+PC9zdmc+')] bg-gray-100 rounded-[1.5rem] p-5 relative overflow-hidden group hover:scale-[1.02] transition-transform">
                       <div className="text-2xl font-medium text-[#1A1A1A] mb-1">12<span className="text-sm">d</span></div>
                       <div className="text-xs text-[#666] uppercase font-bold tracking-wider">Time in Stage</div>
                    </div>

                    <div className="bg-[#999] rounded-[1.5rem] p-5 relative overflow-hidden group hover:scale-[1.02] transition-transform">
                       <div className="text-2xl font-medium text-white mb-1">{deal.tags.length}</div>
                       <div className="text-xs text-white/70 uppercase font-bold tracking-wider">Active Tags</div>
                    </div>
                 </div>

                 {/* Charts Area */}
                 <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Line Chart */}
                    <div className="md:col-span-8 bg-white rounded-[2.5rem] p-8 shadow-card flex flex-col justify-between min-h-[300px]">
                       <div className="flex justify-between items-start mb-4">
                          <h3 className="text-lg font-medium text-[#1A1A1A]">Deal Velocity</h3>
                          <div className="flex gap-4 text-xs">
                             <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-[#EAD07D]"></div>
                                <span className="text-[#666]">This Deal</span>
                             </div>
                             <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-[#999]"></div>
                                <span className="text-[#666]">Avg.</span>
                             </div>
                          </div>
                       </div>
                       
                       {/* SVG Line Chart */}
                       <div className="relative h-48 w-full group">
                          <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" onMouseLeave={() => setHoveredPoint(null)}>
                             {/* Dashed Average Line */}
                             <path 
                                d={generatePath('avg')} 
                                fill="none" 
                                stroke="#ccc" 
                                strokeWidth="2" 
                                strokeDasharray="4 4"
                             />
                             {/* Solid Deal Line */}
                             <path 
                                d={generatePath('deal')} 
                                fill="none" 
                                stroke="#EAD07D" 
                                strokeWidth="3" 
                             />
                             
                             {/* Interactive Points */}
                             {velocityData.map((d, i) => {
                                 const p = getPoint(i, d.deal);
                                 const isHovered = hoveredPoint === i;
                                 return (
                                     <g key={i} onMouseEnter={() => setHoveredPoint(i)}>
                                         {/* Hit Area */}
                                         <circle cx={p.x} cy={p.y} r="8" fill="transparent" cursor="pointer" />
                                         {/* Visual Point */}
                                         <circle 
                                            cx={p.x} 
                                            cy={p.y} 
                                            r={isHovered ? 4 : 3} 
                                            fill="#EAD07D" 
                                            stroke="#1A1A1A" 
                                            strokeWidth="2" 
                                            className="transition-all duration-200 pointer-events-none"
                                         />
                                         {/* Vertical Line on Hover */}
                                         {isHovered && (
                                             <line x1={p.x} y1={p.y} x2={p.x} y2={100} stroke="#1A1A1A" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" pointer-events-none />
                                         )}
                                     </g>
                                 );
                             })}
                          </svg>

                          {/* Tooltip Overlay */}
                          {hoveredPoint !== null && (
                              <div 
                                  className="absolute bg-[#1A1A1A] text-white p-3 rounded-xl shadow-xl text-xs z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 transition-all duration-200"
                                  style={{ 
                                      left: `${getPoint(hoveredPoint, velocityData[hoveredPoint].deal).x}%`, 
                                      top: `${getPoint(hoveredPoint, velocityData[hoveredPoint].deal).y}%`,
                                  }}
                              >
                                  <div className="font-bold mb-1">{velocityData[hoveredPoint].label}</div>
                                  <div className="flex gap-3 whitespace-nowrap">
                                      <span>Act: <span className="text-[#EAD07D] font-bold">{velocityData[hoveredPoint].deal}d</span></span>
                                      <span className="opacity-60">Avg: {velocityData[hoveredPoint].avg}d</span>
                                  </div>
                                  {/* Arrow */}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-[#1A1A1A]"></div>
                              </div>
                          )}

                          <div className="flex justify-between text-xs text-[#999] mt-2 pt-2 border-t border-gray-100 absolute w-full bottom-0">
                             {velocityData.map((d) => <span key={d.label}>{d.label}</span>)}
                          </div>
                       </div>
                    </div>

                    {/* Match Card */}
                    <div className="md:col-span-4 bg-[#EAD07D] rounded-[2.5rem] p-8 relative overflow-hidden flex flex-col justify-between">
                       <div className="relative z-10">
                          <h3 className="text-[#1A1A1A] font-medium mb-1">Win Probability</h3>
                          <div className="text-5xl font-light text-[#1A1A1A] mb-2">{deal.probability}</div>
                          <div className="text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-wide">AI Confidence</div>
                       </div>
                       
                       {/* Wave decoration */}
                       <div className="absolute bottom-0 left-0 right-0 h-20">
                          <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-full text-[#1A1A1A]">
                             <path d="M0,10 C20,20 40,0 60,10 S100,0 100,10 V20 H0 Z" fill="none" stroke="currentColor" strokeWidth="1" />
                             <path d="M0,15 C30,5 60,25 100,10 V20 H0 Z" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
                          </svg>
                       </div>
                    </div>
                 </div>

              </div>
           </div>

        </div>
      </div>
    </div>
  );
};