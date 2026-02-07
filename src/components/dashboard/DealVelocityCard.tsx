import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';

interface DealVelocityCardProps {
  dealVelocity: number | null;
  winRate: number;
  conversionRate: number;
}

export const DealVelocityCard: React.FC<DealVelocityCardProps> = ({
  dealVelocity,
  winRate,
  conversionRate,
}) => {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[#1A1A1A]">Deal Velocity</h3>
        <Link to="/dashboard/analytics" className="text-[#999] hover:text-[#1A1A1A]">
          <ArrowUpRight size={18} />
        </Link>
      </div>

      {/* Circular Progress */}
      <div className="flex flex-col items-center">
        <div className="relative w-36 h-36 mb-4">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#F0EBD8"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#EAD07D"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - Math.min(winRate / 100, 1))}`}
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-light text-[#1A1A1A]">
              {dealVelocity !== null ? dealVelocity : '—'}
            </span>
            <span className="text-xs text-[#999]">
              {dealVelocity !== null ? 'days avg' : 'no data yet'}
            </span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-4 text-center">
          <div className="min-w-[50px]">
            <span className="text-lg font-semibold text-[#1A1A1A] tabular-nums">{Math.round(winRate)}%</span>
            <p className="text-xs text-[#999]">Win Rate</p>
          </div>
          <div className="w-px h-8 bg-black/10"></div>
          <div className="min-w-[50px]">
            <span className="text-lg font-semibold text-[#1A1A1A] tabular-nums">{conversionRate}%</span>
            <p className="text-xs text-[#999]">Conversion</p>
          </div>
        </div>
      </div>
    </Card>
  );
};
