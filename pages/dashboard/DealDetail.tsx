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

  // Chart Data: Cumulative time or progress metric
  const velocityData = [
    { label: 'Lead', deal: 5, avg: 10 },
    { label: 'Discovery', deal: 15, avg: 22 },
    { label: 'Qual', deal: 35, avg: 30 },
    { label: 'Demo', deal: 42, avg: 45 },
    { label: 'Proposal', deal: 55, avg: 60 },
    { label: 'Negot.', deal: 75, avg: 80 },
  ];

  const maxY = 100; // Normalized scale 0-100

  // Helper to get coordinates for the chart (0-100 scale)
  const getPoint = (index: number, val: number) => {
     // Padding: x from 5 to 95, y from 90 to 10
     const paddingX = 5;
     const paddingY = 15; // More vertical padding
     const width = 100 - (paddingX * 2);
     const height = 100 - (paddingY * 2);

     const x = paddingX + (index / (velocityData.length - 1)) * width;
     const y = (100 - paddingY) - (val / maxY) * height;
     return { x, y };
  };

  // Generate Smooth SVG Paths
  const generatePath = (key: 'deal' | 'avg') => {
    if (velocityData.length === 0) return '';
    
    // Start point
    const first = getPoint(0, velocityData[0][key]);
    let d = `M ${first.x},${first.y}`;

    // Cubic Bezier curves for smoothness
    for (let i = 0; i < velocityData.length - 1; i++) {
        const curr = getPoint(i, velocityData[i][key]);
        const next = getPoint(i + 1, velocityData[i+1][key]);
        
        // Control points
        const controlX1 = curr.x + (next.x - curr.x) * 0.4;
        const controlY1 = curr.y;
        const controlX2 = next.x - (next.x - curr.x) * 0.4;
        const controlY2 = next.y;

        d += ` C ${controlX1},${controlY1} ${controlX2},${controlY2} ${next.x},${next.y}`;
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

              {/* Stats Pills - Moved up to replace Score Card in layout logic for better flow if needed, but keeping separate for now */}
              <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-[#EAD07D] rounded-[2rem] p-6 flex flex-col justify-between group hover:scale-[1.02] transition-transform">
                      <div>
                          <div className="text-3xl font-medium text-[#1A1A1A] mb-1">{deal.value}</div>
                          <div className="text-xs text-[#1A1A1A]/60 uppercase font-bold tracking-wider">Deal Value</div>
                      </div>
                  </div>
                  <div className="bg-[#1A1A1A] rounded-[2rem] p-6 flex flex-col justify-between group hover:scale-[1.02] transition-transform">
                      <div>
                          <div className="text-3xl font-medium text-white mb-1">{deal.probability}</div>
                          <div className="text-xs text-white/50 uppercase font-bold tracking-wider">Probability</div>
                      </div>
                  </div>
                  <div className="bg-white rounded-[2rem] p-6 flex flex-col justify-between group hover:scale-[1.02] transition-transform shadow-sm border border-black/5">
                      <div>
                          <div className="text-3xl font-medium text-[#1A1A1A] mb-1">12<span className="text-lg text-[#999]">d</span></div>
                          <div className="text-xs text-[#999] uppercase font-bold tracking-wider">Time in Stage</div>
                      </div>
                  </div>
                  <div className="bg-[#999] rounded-[2rem] p-6 flex flex-col justify-between group hover:scale-[1.02] transition-transform">
                      <div>
                          <div className="text-3xl font-medium text-white mb-1">{deal.tags.length}</div>
                          <div className="text-xs text-white/70 uppercase font-bold tracking-wider">Active Tags</div>
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

              {/* Charts Area */}
              <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-12 gap-6">
                 
                 {/* Deal Velocity Chart */}
                 <div className="md:col-span-8 bg-white rounded-[2.5rem] p-8 shadow-card flex flex-col justify-between min-h-[320px]">
                    <div className="flex justify-between items-start mb-6">
                       <h3 className="text-xl font-medium text-[#1A1A1A]">Deal Velocity</h3>
                       <div className="flex gap-4 text-xs font-medium">
                          <div className="flex items-center gap-2">
                             <div className="w-2.5 h-2.5 rounded-full bg-[#EAD07D]"></div>
                             <span className="text-[#666]">This Deal</span>
                          </div>
                          <div className="flex items-center gap-2">
                             <div className="w-2.5 h-2.5 rounded-full bg-[#ccc]"></div>
                             <span className="text-[#666]">Avg.</span>
                          </div>
                       </div>
                    </div>
                    
                    {/* SVG Line Chart */}
                    <div className="relative h-56 w-full group">
                       <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" onMouseLeave={() => setHoveredPoint(null)}>
                          {/* Dashed Average Line */}
                          <path 
                             d={generatePath('avg')} 
                             fill="none" 
                             stroke="#ccc" 
                             strokeWidth="3" 
                             strokeDasharray="6 6"
                             strokeLinecap="round"
                          />
                          {/* Solid Deal Line */}
                          <path 
                             d={generatePath('deal')} 
                             fill="none" 
                             stroke="#EAD07D" 
                             strokeWidth="6" 
                             strokeLinecap="round"
                          />
                          
                          {/* Interactive Points - Render Avg points smaller */}
                          {velocityData.map((d, i) => {
                               // Avg Points
                               const pAvg = getPoint(i, d.avg);
                               // Deal Points
                               const pDeal = getPoint(i, d.deal);
                               const isHovered = hoveredPoint === i;

                               return (
                                   <g key={i} onMouseEnter={() => setHoveredPoint(i)} className="transition-all duration-300">
                                       {/* Avg Point - Just a small dot */}
                                       <circle cx={pAvg.x} cy={pAvg.y} r="2" fill="#ccc" />

                                       {/* Deal Point - Specific Design: Black ring, yellow/transparent fill */}
                                       {/* Hit Area */}
                                       <circle cx={pDeal.x} cy={pDeal.y} r="10" fill="transparent" cursor="pointer" />
                                       
                                       {/* Visible Point */}
                                       <circle 
                                          cx={pDeal.x} 
                                          cy={pDeal.y} 
                                          r={isHovered ? 7 : 5} 
                                          fill="#1A1A1A" 
                                          stroke="#EAD07D" 
                                          strokeWidth="0" // Solid black dot
                                       />
                                       <circle 
                                          cx={pDeal.x} 
                                          cy={pDeal.y} 
                                          r={isHovered ? 4 : 2} 
                                          fill="#EAD07D" // Yellow center
                                       />

                                       {/* Tooltip */}
                                       {isHovered && (
                                           <g pointerEvents="none">
                                              {/* Simple line to bottom */}
                                              <line x1={pDeal.x} y1={pDeal.y} x2={pDeal.x} y2={100} stroke="#1A1A1A" strokeWidth="1" strokeDasharray="2 2" opacity="0.3" />
                                           </g>
                                       )}
                                   </g>
                               );
                          })}
                       </svg>

                       {/* Tooltip Overlay (HTML for better text handling) */}
                       {hoveredPoint !== null && (
                          <div 
                              className="absolute bg-[#1A1A1A] text-white p-3 rounded-xl shadow-xl text-xs z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-4 transition-all duration-200"
                              style={{ 
                                  left: `${getPoint(hoveredPoint, velocityData[hoveredPoint].deal).x}%`, 
                                  top: `${getPoint(hoveredPoint, velocityData[hoveredPoint].deal).y}%`,
                              }}
                          >
                              <div className="font-bold mb-1 text-[#EAD07D]">{velocityData[hoveredPoint].label}</div>
                              <div className="flex flex-col whitespace-nowrap gap-1">
                                  <span>This Deal: <span className="font-bold">{velocityData[hoveredPoint].deal}d</span></span>
                                  <span className="opacity-60">Average: {velocityData[hoveredPoint].avg}d</span>
                              </div>
                              {/* Arrow */}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-[#1A1A1A]"></div>
                          </div>
                      )}

                       {/* X-Axis Labels */}
                       <div className="flex justify-between text-xs text-[#999] mt-6 px-1 absolute w-full bottom-0">
                          {velocityData.map((d) => (
                              <div key={d.label} className="w-8 text-center">{d.label}</div>
                          ))}
                       </div>
                    </div>
                 </div>

                 {/* Win Probability Card */}
                 <div className="md:col-span-4 bg-[#EAD07D] rounded-[2.5rem] p-8 relative overflow-hidden flex flex-col min-h-[320px]">
                    <div className="relative z-10 mt-2">
                       <h3 className="text-[#1A1A1A] font-medium mb-4 text-lg">Win Probability</h3>
                       <div className="text-7xl font-light text-[#1A1A1A] tracking-tighter mb-4">55%</div>
                       <div className="text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest">AI Confidence</div>
                    </div>
                    
                    {/* Decorative Waves */}
                    <div className="absolute bottom-0 left-0 right-0 h-40 w-full text-[#1A1A1A] pointer-events-none">
                       <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                          {/* Back Wave */}
                          <path 
                            d="M0,80 C30,70 60,90 100,75 V100 H0 Z" 
                            fill="#1A1A1A" 
                            fillOpacity="0.1" 
                          />
                          {/* Middle Wave */}
                          <path 
                             d="M0,85 C40,95 70,65 100,80 V100 H0 Z" 
                             fill="none" 
                             stroke="#1A1A1A" 
                             strokeWidth="2"
                             opacity="0.2"
                          />
                          {/* Front Wave (Thick) */}
                          <path 
                             d="M0,82 C20,92 50,70 100,85" 
                             fill="none" 
                             stroke="#1A1A1A" 
                             strokeWidth="3" 
                             strokeLinecap="round"
                          />
                          {/* Bottom Fill */}
                          <path 
                             d="M0,90 C30,100 70,90 100,95 V100 H0 Z" 
                             fill="#1A1A1A" 
                             opacity="0.05"
                          />
                       </svg>
                    </div>
                 </div>

              </div>
           </div>

        </div>
      </div>
    </div>
  );
};