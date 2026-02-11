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
    <div className="bg-white rounded-2xl p-5 min-w-0 overflow-hidden">
      {/* Header row: title + legend + win probability pill */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h3 className="text-base font-semibold text-[#1A1A1A]">Opportunity Velocity</h3>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="flex gap-4 text-[10px] font-medium">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#EAD07D]" />
              <span className="text-[#888]">This Deal</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#D1D1D1]" />
              <span className="text-[#888]">Benchmark</span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#EAD07D]/20 rounded-full">
            <span className="text-xs font-medium text-[#666]">Win Prob.</span>
            <span className="text-sm font-semibold text-[#1A1A1A]">{winProbability}%</span>
          </div>
        </div>
      </div>

      {/* SVG Step Chart — fixed height */}
      <div className="relative h-[200px] group">
        <svg
          className="w-full h-full overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
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
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between text-[10px] text-[#999] font-medium mt-2 px-1">
        {velocityData.map((d) => (
          <div key={d.label} className="text-center">{d.label}</div>
        ))}
      </div>
    </div>
  );
};
