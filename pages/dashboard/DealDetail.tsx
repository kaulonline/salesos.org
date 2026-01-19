import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Phone, Mail, Printer, MoreHorizontal, ArrowLeft, User, CheckCircle2 } from 'lucide-react';

// Enhanced Mock Data for Details
const DEALS_DATA = [
  { 
    id: 1, 
    title: 'Acme Corp Expansion', 
    company: 'Acme Corp', 
    value: '$125,000', 
    stage: 'Discovery', 
    owner: 'Valentina', 
    ownerAvatar: 'https://picsum.photos/40/40?random=1', 
    probability: '25%', 
    email: 'contracts@acme.com', 
    phone: '+1 (555) 123-4567', 
    description: 'Expansion of existing enterprise license to include the new marketing team division. Key stakeholder is deeply interested in the AI features.', 
    expectedClose: 'Oct 24, 2024', 
    score: 8.5 
  },
  { 
    id: 2, 
    title: 'GlobalBank Enterprise', 
    company: 'GlobalBank', 
    value: '$850,000', 
    stage: 'Proposal', 
    owner: 'Alex', 
    ownerAvatar: 'https://picsum.photos/40/40?random=2', 
    probability: '60%', 
    email: 'procurement@globalbank.com', 
    phone: '+1 (555) 987-6543', 
    description: 'Full stack digital transformation project. Competing with Salesforce and HubSpot. Our security compliance is the winning factor.', 
    expectedClose: 'Dec 15, 2024', 
    score: 9.2 
  },
  { 
    id: 3, 
    title: 'StartUp Seed', 
    company: 'Nebula', 
    value: '$45,000', 
    stage: 'Discovery', 
    owner: 'Sarah', 
    ownerAvatar: 'https://picsum.photos/40/40?random=3', 
    probability: '30%', 
    email: 'founders@nebula.io', 
    phone: '+1 (555) 456-7890', 
    description: 'Seed stage startup looking for a scalable CRM foundation. Price sensitive but high growth potential.', 
    expectedClose: 'Nov 30, 2024', 
    score: 6.8 
  },
  { 
    id: 4, 
    title: 'Design System Revamp', 
    company: 'Vertex', 
    value: '$95,000', 
    stage: 'Negotiation', 
    owner: 'Valentina', 
    ownerAvatar: 'https://picsum.photos/40/40?random=4', 
    probability: '85%', 
    email: 'design@vertex.com', 
    phone: '+1 (555) 222-3333', 
    description: 'Consulting services and tooling for their new design system rollout.', 
    expectedClose: 'Oct 15, 2024', 
    score: 9.8 
  },
  { 
    id: 5, 
    title: 'Q4 Marketing Push', 
    company: 'Sisyphus', 
    value: '$210,000', 
    stage: 'Proposal', 
    owner: 'Mike', 
    ownerAvatar: 'https://picsum.photos/40/40?random=5', 
    probability: '55%', 
    email: 'marketing@sisyphus.com', 
    phone: '+1 (555) 444-5555', 
    description: 'Q4 ad spend management and attribution tools implementation.', 
    expectedClose: 'Nov 01, 2024', 
    score: 7.5 
  },
  { 
    id: 6, 
    title: 'Annual Contract Renewal', 
    company: 'Logitech', 
    value: '$120,000', 
    stage: 'Closed Won', 
    owner: 'Valentina', 
    ownerAvatar: 'https://picsum.photos/40/40?random=6', 
    probability: '100%', 
    email: 'renewals@logitech.com', 
    phone: '+1 (555) 666-7777', 
    description: 'Standard yearly renewal of core platform licenses.', 
    expectedClose: 'Sep 30, 2024', 
    score: 10.0 
  },
];

export const DealDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const deal = DEALS_DATA.find(d => d.id === Number(id));

  if (!deal) {
    return (
      <div className="max-w-7xl mx-auto p-10 flex flex-col items-center justify-center min-h-[400px]">
        <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">Deal not found</h2>
        <button onClick={() => navigate('/dashboard/deals')} className="text-[#EAD07D] hover:underline font-bold">
          Return to Deals
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <button 
        onClick={() => navigate('/dashboard/deals')} 
        className="flex items-center gap-2 text-[#666] hover:text-[#1A1A1A] mb-6 transition-colors font-medium group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Deals
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         {/* Left Sidebar List (Miniature Deals List) */}
         <div className="lg:col-span-3 space-y-4 hidden lg:block">
            <h3 className="text-xs font-bold text-[#999] uppercase tracking-wider px-2 mb-2">Other Opportunities</h3>
            {DEALS_DATA.filter(d => d.id !== deal.id).map((d) => (
               <Link 
                 to={`/dashboard/deals/${d.id}`} 
                 key={d.id} 
                 className="p-4 rounded-3xl flex items-center gap-4 cursor-pointer transition-all hover:bg-white bg-[#F8F8F6]"
               >
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-bold text-xs text-[#1A1A1A] shadow-sm shrink-0">
                     {d.company.substring(0,2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                     <div className="font-bold text-[#1A1A1A] text-sm truncate">{d.title}</div>
                     <div className="text-xs text-[#666] truncate">{d.company}</div>
                  </div>
               </Link>
            ))}
         </div>

         {/* Center Deal Profile */}
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
               
               <div className="w-24 h-24 rounded-2xl bg-[#EAD07D] flex items-center justify-center text-3xl font-bold text-[#1A1A1A] mb-6 shadow-glow">
                  {deal.company.substring(0,1)}
               </div>
               
               <h2 className="text-2xl font-bold mb-1 text-[#1A1A1A]">{deal.title}</h2>
               <p className="text-[#666] mb-6 font-medium">{deal.company}</p>

               <div className="flex flex-wrap justify-center gap-2 mb-8">
                  <span className="px-3 py-1 bg-[#1A1A1A] text-white rounded-lg text-xs font-bold flex items-center gap-1">
                     {deal.stage}
                  </span>
                  <span className="px-3 py-1 bg-gray-100 text-[#666] rounded-lg text-xs font-bold flex items-center gap-1">
                     Inbound
                  </span>
               </div>

               <p className="text-sm text-[#666] leading-relaxed mb-8 max-w-sm">
                  {deal.description}
               </p>

               <div className="w-full grid grid-cols-2 gap-4">
                  <div className="bg-[#F8F8F6] p-4 rounded-2xl text-left">
                     <div className="text-xs text-[#999] uppercase tracking-wide mb-1">Deal Value</div>
                     <div className="font-bold text-xl text-[#EAD07D]">{deal.value}</div>
                  </div>
                  <div className="bg-[#1A1A1A] p-4 rounded-2xl text-left text-white">
                     <div className="text-xs text-white/50 uppercase tracking-wide mb-1">Close Date</div>
                     <div className="font-bold text-xl">{deal.expectedClose}</div>
                  </div>
               </div>
            </div>

            <div className="dash-card p-6">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-[#1A1A1A]">Key Contact</h3>
                  <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs text-[#666]">▼</span>
               </div>
               <div className="space-y-4">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-full bg-[#EAD07D]/20 flex items-center justify-center text-[#1A1A1A]"><Mail size={16} /></div>
                     <div>
                        <div className="text-xs text-[#999]">Email</div>
                        <div className="text-sm font-medium text-[#1A1A1A]">{deal.email}</div>
                     </div>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-full bg-[#EAD07D]/20 flex items-center justify-center text-[#1A1A1A]"><Phone size={16} /></div>
                     <div>
                        <div className="text-xs text-[#999]">Phone</div>
                        <div className="text-sm font-medium text-[#1A1A1A]">{deal.phone}</div>
                     </div>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-full bg-[#EAD07D]/20 flex items-center justify-center text-[#1A1A1A]"><User size={16} /></div>
                     <div>
                        <div className="text-xs text-[#999]">Deal Owner</div>
                        <div className="text-sm font-medium text-[#1A1A1A] flex items-center gap-2">
                           <img src={deal.ownerAvatar} className="w-5 h-5 rounded-full border border-gray-200" alt="" />
                           {deal.owner}
                        </div>
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
                  <div className="text-5xl font-light mb-1 text-[#1A1A1A]">{deal.score}</div>
                  <div className="text-xs text-[#666] font-bold uppercase tracking-wider">AI Score</div>
               </div>
               <div className="relative w-24 h-24">
                   {/* Radial Chart Simulation */}
                   <svg className="w-full h-full transform -rotate-90">
                       <circle cx="48" cy="48" r="40" stroke="#F2F1EA" strokeWidth="8" fill="transparent" />
                       <circle 
                          cx="48" 
                          cy="48" 
                          r="40" 
                          stroke="#EAD07D" 
                          strokeWidth="8" 
                          fill="transparent" 
                          strokeDasharray={`${deal.score * 25.1} 251`} 
                          strokeLinecap="round" 
                       />
                   </svg>
                   <div className="absolute inset-0 flex items-center justify-center font-bold text-xs text-[#1A1A1A]">
                       {deal.score}/10
                   </div>
               </div>
            </div>

            {/* Velocity Chart */}
            <div className="dash-card p-8">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-[#1A1A1A]">Deal Velocity</h3>
                  <div className="flex gap-2 text-xs">
                     <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 font-bold"><CheckCircle2 size={10} /> Healthy</span>
                  </div>
               </div>

               <div className="h-48 relative flex items-end justify-between gap-1">
                  {/* Simulated Line Chart */}
                  <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none">
                     <defs>
                        <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#EAD07D" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#EAD07D" stopOpacity="0" />
                        </linearGradient>
                     </defs>
                     <path d="M0,150 C50,140 100,100 150,80 S250,50 350,20" fill="url(#velocityGradient)" />
                     <path d="M0,150 C50,140 100,100 150,80 S250,50 350,20" fill="none" stroke="#EAD07D" strokeWidth="3" />
                     <circle cx="350" cy="20" r="4" fill="#1A1A1A" />
                     {/* Dashed Avg Line */}
                     <path d="M0,120 C100,110 200,90 350,60" fill="none" stroke="#ccc" strokeWidth="2" strokeDasharray="4 4" />
                  </svg>
               </div>
               
               <div className="flex justify-between text-xs text-[#999] mt-4 pt-4 border-t border-gray-100">
                  <span>Discovery</span><span>Proposal</span><span>Negotiation</span><span>Close</span>
               </div>
            </div>

            {/* Prediction Card */}
            <div className="bg-[#1A1A1A] text-white rounded-[2rem] p-8 relative overflow-hidden">
               <div className="relative z-10">
                  <div className="text-sm font-bold text-white/60 mb-8 uppercase tracking-wider">Win Probability</div>
                  <div className="text-5xl font-medium text-white mb-2">{deal.probability}</div>
                  <div className="text-sm text-gray-400">Likelihood to close by {deal.expectedClose}</div>
                  
                  <div className="mt-8 pt-8 border-t border-white/10 flex gap-4">
                      <button className="flex-1 py-3 bg-[#EAD07D] text-[#1A1A1A] rounded-xl font-bold text-sm hover:bg-[#e5c973] transition-colors">Boost</button>
                      <button className="flex-1 py-3 bg-white/10 text-white rounded-xl font-bold text-sm hover:bg-white/20 transition-colors">Edit</button>
                  </div>
               </div>
               {/* Background Decoration */}
               <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-[#EAD07D] blur-[80px] opacity-20 rounded-full pointer-events-none"></div>
               <svg className="absolute bottom-0 left-0 w-full h-24 text-[#EAD07D] opacity-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d="M0,80 C30,90 70,60 100,80 L100,100 L0,100 Z" fill="currentColor" />
               </svg>
            </div>
         </div>
      </div>
    </div>
  );
};