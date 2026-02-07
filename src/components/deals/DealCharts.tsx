import React, { useState } from 'react';
import { getStageIndex } from './types';
import type { Opportunity, OpportunityAnalysis } from '../../types';

interface DealChartsProps {
  deal: Opportunity;
  analysis: OpportunityAnalysis | null;
}

export const DealCharts: React.FC<DealChartsProps> = ({ deal, analysis }) => {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  const winProbability = analysis?.winProbability || deal.winProbability || deal.probability || 50;

  // Velocity data based on deal stage
  const velocityData = [
    { label: 'Prospect', deal: deal.stage === 'PROSPECTING' ? 100 : 15, avg: 20, days: 7 },
    { label: 'Qualify', deal: getStageIndex(deal.stage) >= 1 ? 30 : 0, avg: 35, days: 14 },
    { label: 'Needs', deal: getStageIndex(deal.stage) >= 2 ? 45 : 0, avg: 50, days: 21 },
    { label: 'Value', deal: getStageIndex(deal.stage) >= 3 ? 60 : 0, avg: 65, days: 28 },
    { label: 'Proposal', deal: getStageIndex(deal.stage) >= 6 ? 80 : 0, avg: 80, days: 45 },
    { label: 'Nego.', deal: getStageIndex(deal.stage) >= 7 ? 95 : 0, avg: 90, days: 60 },
  ];

  // Step chart path generator
  const getStepPoints = (key: 'deal' | 'avg') => {
    let d = '';
    const w = 100 / (velocityData.length - 1);
    velocityData.forEach((item, i) => {
      const x = i * w;
      const y = 100 - item[key];
      if (i === 0) {
        d += `M ${x},${y}`;
      } else {
        const prevY = 100 - velocityData[i - 1][key];
        d += ` L ${x},${prevY} L ${x},${y}`;
      }
    });
    return d;
  };

  const getAreaFill = (key: 'deal' | 'avg') => {
    const line = getStepPoints(key);
    return `${line} L 100,100 L 0,100 Z`;
  };

  return (
    <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-12 gap-5">
      {/* Opportunity Velocity Chart */}
      <div className="md:col-span-8 bg-white rounded-2xl p-6 flex flex-col min-h-[280px]">
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-base font-semibold text-[#1A1A1A]">Opportunity Velocity</h3>
          <div className="flex gap-4 text-[10px] font-medium">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#EAD07D]" />
              <span className="text-[#888]">This Opportunity</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#D1D1D1]" />
              <span className="text-[#888]">Benchmark</span>
            </div>
          </div>
        </div>

        {/* SVG Step Chart */}
        <div className="relative flex-1 min-h-[180px] group">
          <svg
            className="w-full h-full overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            onMouseLeave={() => setHoveredPoint(null)}
          >
            <defs>
              <linearGradient id="dealGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EAD07D" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#EAD07D" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {[25, 50, 75].map((y) => (
              <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#F2F1EA" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            ))}

            {/* Benchmark line (dashed) */}
            <path
              d={getStepPoints('avg')}
              fill="none"
              stroke="#D1D1D1"
              strokeWidth="2"
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
            />

            {/* Deal area fill */}
            <path d={getAreaFill('deal')} fill="url(#dealGradient)" />

            {/* Deal line (solid) */}
            <path
              d={getStepPoints('deal')}
              fill="none"
              stroke="#EAD07D"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
            />

            {/* Interactive points */}
            {velocityData.map((d, i) => {
              const x = i * (100 / (velocityData.length - 1));
              const y = 100 - d.deal;
              const isHovered = hoveredPoint === i;

              return (
                <g key={i} onMouseEnter={() => setHoveredPoint(i)} className="cursor-pointer">
                  <rect x={x - 6} y={0} width="12" height="100" fill="transparent" />
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? 5 : 3}
                    fill={isHovered ? "#1A1A1A" : "#EAD07D"}
                    stroke="#fff"
                    strokeWidth="2"
                    className="transition-all duration-200"
                  />
                </g>
              );
            })}
          </svg>

          {/* Tooltip */}
          {hoveredPoint !== null && (
            <div
              className="absolute bg-[#1A1A1A] text-white px-3 py-2 rounded-lg shadow-lg text-xs z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full -mt-2 transition-all duration-150"
              style={{
                left: `${hoveredPoint * (100 / (velocityData.length - 1))}%`,
                top: `${100 - velocityData[hoveredPoint].deal}%`,
              }}
            >
              <div className="font-semibold text-[#EAD07D] mb-0.5">{velocityData[hoveredPoint].label}</div>
              <div className="flex flex-col gap-0.5 whitespace-nowrap">
                <span>Progress: <span className="font-semibold">{velocityData[hoveredPoint].deal}%</span></span>
                <span className="text-white/60">Avg: {velocityData[hoveredPoint].avg}%</span>
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1A1A1A]" />
            </div>
          )}

          {/* X-axis labels */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-[#999] font-medium translate-y-5">
            {velocityData.map((d) => (
              <div key={d.label} className="text-center">{d.label}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Win Probability Card */}
      <div className="md:col-span-4 bg-[#EAD07D] rounded-2xl p-6 relative overflow-hidden flex flex-col min-h-[280px]">
        <div className="relative z-10 flex-1 flex flex-col">
          <h3 className="text-sm font-semibold text-[#1A1A1A]/70 mb-auto">Win Probability</h3>
          <div>
            <div className="text-6xl font-light text-[#1A1A1A] tracking-tight mb-2">
              {winProbability}%
            </div>
            <div className="text-[10px] font-bold text-[#1A1A1A]/40 uppercase tracking-wider">
              {analysis ? 'AI Confidence' : 'Estimated'}
            </div>
          </div>
        </div>

        {/* Decorative waves */}
        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none">
          <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full">
            <path
              d="M0,25 Q25,15 50,25 T100,20 V40 H0 Z"
              fill="#1A1A1A"
              fillOpacity="0.08"
            />
            <path
              d="M-5,30 Q20,35 50,25 T105,28"
              fill="none"
              stroke="#1A1A1A"
              strokeWidth="1"
              strokeLinecap="round"
              opacity="0.3"
            />
            <path
              d="M-5,35 Q30,40 60,30 T105,33"
              fill="none"
              stroke="#1A1A1A"
              strokeWidth="0.5"
              strokeLinecap="round"
              opacity="0.15"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};
