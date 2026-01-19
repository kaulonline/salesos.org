import React, { useState, useEffect } from 'react';
import { ArrowUpRight, TrendingUp, Users, Target, Activity } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Skeleton } from '../../components/ui/Skeleton';

export const Analytics: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Revenue Data Generation
  const revenueData = [30, 45, 40, 60, 55, 75, 70, 85, 90, 80, 95, 100];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const getChartPath = (data: number[]) => {
    if (data.length === 0) return '';
    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - val; // Invert Y because SVG 0 is top (val 0-100)
      return [x, y];
    });

    let d = `M ${points[0][0]},${points[0][1]}`;
    
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const ctrl1X = curr[0] + (next[0] - curr[0]) * 0.4;
      const ctrl1Y = curr[1];
      const ctrl2X = next[0] - (next[0] - curr[0]) * 0.4;
      const ctrl2Y = next[1];
      d += ` C ${ctrl1X},${ctrl1Y} ${ctrl2X},${ctrl2Y} ${next[0]},${next[1]}`;
    }
    return d;
  };

  const linePath = getChartPath(revenueData);
  const areaPath = `${linePath} L 100,100 L 0,100 Z`;

  if (isLoading) {
      return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-10">
                <Skeleton className="h-10 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <Skeleton className="md:col-span-4 h-[240px] rounded-[2rem]" />
                <Skeleton className="md:col-span-4 h-[240px] rounded-[2rem]" />
                <Skeleton className="md:col-span-4 h-[240px] rounded-[2rem] bg-gray-800" />
                <Skeleton className="md:col-span-8 h-[400px] rounded-[2rem]" />
                <Skeleton className="md:col-span-4 h-[400px] rounded-[2rem]" />
            </div>
        </div>
      )
  }

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="mb-10">
        <h1 className="text-4xl font-medium text-[#1A1A1A]">Analytics</h1>
        <p className="text-[#666] mt-2">Team performance and revenue insights.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* KPI Cards */}
        <Card className="md:col-span-4 p-8 flex flex-col justify-between min-h-[240px]">
           <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-full bg-[#EAD07D]/20 flex items-center justify-center text-[#1A1A1A]">
                 <TrendingUp size={24} />
              </div>
              <Badge variant="green" size="sm">+14%</Badge>
           </div>
           <div>
              <div className="text-5xl font-light text-[#1A1A1A] mb-2">$1.2M</div>
              <div className="text-sm text-[#666]">Total Revenue (YTD)</div>
           </div>
           <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#1A1A1A] w-[75%]"></div>
           </div>
        </Card>

        <Card className="md:col-span-4 p-8 flex flex-col justify-between min-h-[240px]">
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
        </Card>

        <Card variant="dark" className="md:col-span-4 p-8 flex flex-col justify-between min-h-[240px] relative overflow-hidden">
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
        </Card>

        {/* Big Chart Area */}
        <Card className="md:col-span-8 p-8 min-h-[400px]">
           <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-medium">Revenue Growth</h3>
              <div className="flex gap-2">
                 <button className="px-4 py-2 bg-[#F8F8F6] rounded-full text-xs font-bold text-[#1A1A1A]">Monthly</button>
                 <button className="px-4 py-2 bg-white rounded-full text-xs font-bold text-[#666] hover:bg-[#F8F8F6]">Quarterly</button>
              </div>
           </div>
           
           <div className="h-64 w-full relative group">
              {/* Responsive SVG Container */}
              <svg 
                className="w-full h-full overflow-visible" 
                viewBox="0 0 100 100" 
                preserveAspectRatio="none"
                onMouseLeave={() => setHoveredIndex(null)}
              >
                 <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="0%" stopColor="#EAD07D" stopOpacity="0.4" />
                       <stop offset="100%" stopColor="#EAD07D" stopOpacity="0" />
                    </linearGradient>
                 </defs>
                 
                 {/* Area Fill */}
                 <path d={areaPath} fill="url(#chartGradient)" />
                 
                 {/* Stroke Line */}
                 <path 
                    d={linePath} 
                    fill="none" 
                    stroke="#EAD07D" 
                    strokeWidth="3" 
                    vectorEffect="non-scaling-stroke" 
                    strokeLinecap="round"
                 />

                 {/* Interactive Points */}
                 {revenueData.map((val, i) => {
                    const x = (i / (revenueData.length - 1)) * 100;
                    const y = 100 - val;
                    const isHovered = hoveredIndex === i;

                    return (
                        <g key={i} onMouseEnter={() => setHoveredIndex(i)}>
                            {/* Invisible Hit Target */}
                            <circle cx={x} cy={y} r="5" fill="transparent" cursor="pointer" />
                            
                            {/* Visible Dot */}
                            <circle 
                                cx={x} 
                                cy={y} 
                                r={isHovered ? 6 : 0} 
                                fill="#1A1A1A" 
                                stroke="#fff" 
                                strokeWidth="2"
                                className="transition-all duration-200" 
                                vectorEffect="non-scaling-stroke"
                            />
                        </g>
                    );
                 })}
              </svg>

              {/* Tooltip Overlay */}
              {hoveredIndex !== null && (
                 <div 
                    className="absolute bg-[#1A1A1A] text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg transform -translate-x-1/2 -translate-y-full mb-3 transition-all pointer-events-none z-10 whitespace-nowrap"
                    style={{ 
                        left: `${(hoveredIndex / (revenueData.length - 1)) * 100}%`, 
                        top: `${100 - revenueData[hoveredIndex]}%` 
                    }}
                 >
                    ${revenueData[hoveredIndex]}k
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1A1A1A]"></div>
                 </div>
              )}
           </div>
           
           <div className="flex justify-between text-xs text-[#999] mt-6 pt-4 border-t border-gray-100">
              {months.map(m => <span key={m}>{m}</span>)}
           </div>
        </Card>

        {/* Sales Leaderboard */}
        <Card className="md:col-span-4 p-8">
           <h3 className="text-xl font-medium mb-6">Top Performers</h3>
           <div className="space-y-6">
              {[1, 2, 3, 4, 5].map((i) => (
                 <div key={i} className="flex items-center gap-4 group cursor-pointer">
                    <div className={`font-bold w-4 text-center ${i === 1 ? 'text-[#EAD07D]' : 'text-[#1A1A1A]'}`}>{i}</div>
                    <Avatar 
                        src={`https://picsum.photos/40/40?random=${i+50}`} 
                        size="md" 
                        border 
                        className="group-hover:scale-110 transition-transform"
                    />
                    <div className="flex-1">
                       <div className="font-bold text-sm text-[#1A1A1A]">Alex Morgan</div>
                       <div className="text-xs text-[#666]">$124k revenue</div>
                    </div>
                    {i === 1 && <div className="text-[#EAD07D]"><Activity size={16} /></div>}
                 </div>
              ))}
           </div>
           <button className="w-full mt-8 py-3 rounded-xl border border-gray-200 text-sm font-bold text-[#1A1A1A] hover:bg-[#F8F8F6] transition-colors">View Full Leaderboard</button>
        </Card>

      </div>
    </div>
  );
};