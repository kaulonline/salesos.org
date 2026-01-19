import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Phone, Mail, Printer, ArrowLeft, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';

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
];

export const DealDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const deal = DEALS_DATA.find(d => d.id === Number(id)) || DEALS_DATA[0];
  
  const [openSection, setOpenSection] = useState<string | null>('basic');
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  if (!deal) return null;

  const velocityData = [
    { label: 'Lead', deal: 10, avg: 15 },
    { label: 'Discovery', deal: 25, avg: 30 },
    { label: 'Qual', deal: 35, avg: 40 },
    { label: 'Demo', deal: 45, avg: 55 },
    { label: 'Proposal', deal: 60, avg: 70 },
    { label: 'Negot.', deal: 80, avg: 85 },
  ];

  const getPoint = (index: number, val: number) => {
     // X range: 5 to 95 to add padding
     const x = 5 + (index / (velocityData.length - 1)) * 90;
     // Y range: 90 to 10 (SVG 0 is top)
     const y = 90 - (val / 100) * 80;
     return { x, y };
  };

  const generatePath = (key: 'deal' | 'avg') => {
    if (velocityData.length === 0) return '';
    const points = velocityData.map((d, i) => getPoint(i, d[key]));
    
    let d = `M ${points[0].x},${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
        const curr = points[i];
        const next = points[i + 1];
        
        // Control points for smooth bezier curve
        const cp1x = curr.x + (next.x - curr.x) * 0.4;
        const cp1y = curr.y;
        const cp2x = next.x - (next.x - curr.x) * 0.4;
        const cp2y = next.y;

        d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${next.x},${next.y}`;
    }
    return d;
  };

  return (
    <div className="max-w-[1600px] mx-auto p-6">
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Sidebar */}
        <div className="lg:w-80 shrink-0 space-y-4 hidden xl:block">
           <button 
                onClick={() => navigate('/dashboard/deals')} 
                className="flex items-center gap-2 text-[#666] hover:text-[#1A1A1A] mb-8 transition-colors font-medium group"
            >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Pipeline
           </button>

           {DEALS_DATA.slice(0, 5).map((d) => (
             <Link to={`/dashboard/deals/${d.id}`} key={d.id} className="block group">
                <Card padding="sm" className={`rounded-3xl transition-all ${d.id === deal.id ? 'bg-[#EAD07D]' : 'hover:bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                    <Avatar src={d.contactImage} size="md" border={d.id === deal.id} />
                    <div className="min-w-0">
                        <div className="text-sm font-bold truncate text-[#1A1A1A]">{d.contactName}</div>
                        <div className={`text-xs truncate ${d.id === deal.id ? 'text-[#1A1A1A]/70' : 'text-[#666]'}`}>{d.title}</div>
                    </div>
                    {d.id === deal.id && <div className="ml-auto w-2 h-2 rounded-full bg-[#1A1A1A]"></div>}
                    </div>
                    {d.id === deal.id && (
                    <div className="mt-3 w-full bg-[#1A1A1A]/10 h-1 rounded-full overflow-hidden">
                        <div className="h-full bg-[#1A1A1A]" style={{width: d.probability}}></div>
                    </div>
                    )}
                </Card>
             </Link>
           ))}
        </div>

        {/* Main Profile Area */}
        <div className="flex-1 min-w-0">
           
           {/* Top Row */}
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
              
              {/* Profile Card */}
              <Card variant="ghost" padding="lg" className="lg:col-span-8 p-8 lg:p-10 relative flex flex-col md:flex-row gap-8 items-start">
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
                           <Badge key={i} variant={i === 0 ? 'yellow' : i === 1 ? 'dark' : 'outline'} size="md" dot={i === 0}>
                               {tag}
                           </Badge>
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
              </Card>

              {/* Stats Pills */}
              <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card variant="yellow" className="flex flex-col justify-between group hover:scale-[1.02] transition-transform">
                      <div>
                          <div className="text-3xl font-medium text-[#1A1A1A] mb-1">{deal.value}</div>
                          <div className="text-xs text-[#1A1A1A]/60 uppercase font-bold tracking-wider">Deal Value</div>
                      </div>
                  </Card>
                  <Card variant="dark" className="flex flex-col justify-between group hover:scale-[1.02] transition-transform">
                      <div>
                          <div className="text-3xl font-medium text-white mb-1">{deal.probability}</div>
                          <div className="text-xs text-white/50 uppercase font-bold tracking-wider">Probability</div>
                      </div>
                  </Card>
                  <Card className="flex flex-col justify-between group hover:scale-[1.02] transition-transform border border-black/5">
                      <div>
                          <div className="text-3xl font-medium text-[#1A1A1A] mb-1">12<span className="text-lg text-[#999]">d</span></div>
                          <div className="text-xs text-[#999] uppercase font-bold tracking-wider">Time in Stage</div>
                      </div>
                  </Card>
                  <Card className="bg-[#999] text-white flex flex-col justify-between group hover:scale-[1.02] transition-transform">
                      <div>
                          <div className="text-3xl font-medium text-white mb-1">{deal.tags.length}</div>
                          <div className="text-xs text-white/70 uppercase font-bold tracking-wider">Active Tags</div>
                      </div>
                  </Card>
              </div>
           </div>

           {/* Middle Row: Content & Stats */}
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
              
              {/* Accordions Column */}
              <div className="lg:col-span-4 space-y-4">
                 <Card padding="sm" className="px-6 py-4 border border-black/5">
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
                 </Card>

                 <Card padding="sm" className="px-6 py-4 border border-black/5">
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
                 </Card>
              </div>

              {/* Charts Area */}
              <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-12 gap-6">
                 
                 {/* Deal Velocity Chart */}
                 <Card className="md:col-span-8 flex flex-col justify-between min-h-[320px] p-8">
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
                          {/* Average Line (Dashed) */}
                          <path 
                             d={generatePath('avg')} 
                             fill="none" 
                             stroke="#ccc" 
                             strokeWidth="3" 
                             strokeDasharray="6 6"
                             strokeLinecap="round"
                             vectorEffect="non-scaling-stroke"
                          />
                          {/* Deal Line (Solid) */}
                          <path 
                             d={generatePath('deal')} 
                             fill="none" 
                             stroke="#EAD07D" 
                             strokeWidth="6" 
                             strokeLinecap="round"
                             vectorEffect="non-scaling-stroke"
                          />
                          
                          {/* Interactive Points */}
                          {velocityData.map((d, i) => {
                               const pAvg = getPoint(i, d.avg);
                               const pDeal = getPoint(i, d.deal);
                               const isHovered = hoveredPoint === i;

                               return (
                                   <g key={i} onMouseEnter={() => setHoveredPoint(i)} className="transition-all duration-300">
                                       {/* Avg Point */}
                                       <circle cx={pAvg.x} cy={pAvg.y} r="2" fill="#ccc" />

                                       {/* Deal Point - Specific Design */}
                                       <circle cx={pDeal.x} cy={pDeal.y} r="12" fill="transparent" cursor="pointer" />
                                       
                                       <circle 
                                            cx={pDeal.x} 
                                            cy={pDeal.y} 
                                            r={isHovered ? 8 : 6} 
                                            fill="#1A1A1A" 
                                            stroke="#EAD07D" 
                                            strokeWidth="0" // Solid
                                            className="transition-all duration-200"
                                       />
                                       <circle 
                                            cx={pDeal.x} 
                                            cy={pDeal.y} 
                                            r={isHovered ? 4 : 3} 
                                            fill="#EAD07D" 
                                            className="transition-all duration-200"
                                       />
                                       {isHovered && (
                                           <g pointerEvents="none">
                                              <line x1={pDeal.x} y1={pDeal.y} x2={pDeal.x} y2={100} stroke="#1A1A1A" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" vectorEffect="non-scaling-stroke" />
                                           </g>
                                       )}
                                   </g>
                               );
                          })}
                       </svg>

                       {/* Tooltip Overlay */}
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
                              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-[#1A1A1A]"></div>
                          </div>
                      )}

                       <div className="flex justify-between text-xs text-[#999] mt-6 px-1 absolute w-full bottom-0">
                          {velocityData.map((d) => (
                              <div key={d.label} className="w-8 text-center">{d.label}</div>
                          ))}
                       </div>
                    </div>
                 </Card>

                 {/* Win Probability Card */}
                 <Card variant="yellow" className="md:col-span-4 p-8 relative overflow-hidden flex flex-col min-h-[320px]">
                    <div className="relative z-10 mt-2">
                       <h3 className="text-[#1A1A1A] font-medium mb-4 text-lg">Win Probability</h3>
                       <div className="text-7xl font-light text-[#1A1A1A] tracking-tighter mb-4">55%</div>
                       <div className="text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest">AI Confidence</div>
                    </div>
                    
                    {/* Decorative Waves matching reference */}
                    <div className="absolute bottom-0 left-0 right-0 h-32 w-full text-[#1A1A1A] pointer-events-none">
                       <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full">
                          {/* Background wave */}
                          <path d="M0,35 C30,25 60,45 100,30 V50 H0 Z" fill="#1A1A1A" fillOpacity="0.1" />
                          
                          {/* Main thick wave line */}
                          <path 
                             d="M-5,40 C30,45 60,25 105,40" 
                             fill="none" 
                             stroke="#1A1A1A" 
                             strokeWidth="1.5" 
                             strokeLinecap="round"
                          />
                          
                          {/* Secondary thin line */}
                          <path 
                             d="M-5,45 C40,50 70,30 105,42" 
                             fill="none" 
                             stroke="#1A1A1A" 
                             strokeWidth="0.5" 
                             opacity="0.5"
                          />
                       </svg>
                    </div>
                 </Card>

              </div>
           </div>

        </div>
      </div>
    </div>
  );
};