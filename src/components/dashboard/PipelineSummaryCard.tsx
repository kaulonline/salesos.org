import React from 'react';
import { Target, CheckCircle2, DollarSign, Clock, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';

interface PipelineSummaryCardProps {
  totalDeals: number;
  closedWonThisMonth: number;
  avgDealSize: number;
  dealVelocity: number | null;
}

export const PipelineSummaryCard: React.FC<PipelineSummaryCardProps> = ({
  totalDeals,
  closedWonThisMonth,
  avgDealSize,
  dealVelocity,
}) => {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[#1A1A1A]">Pipeline Summary</h3>
        <Link to="/dashboard/deals" className="text-[#999] hover:text-[#1A1A1A]">
          <ArrowUpRight size={18} />
        </Link>
      </div>

      {/* Key Pipeline Stats */}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-[#F8F6EF] rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#EAD07D]/30 flex items-center justify-center">
              <Target size={16} className="text-[#1A1A1A]" />
            </div>
            <span className="text-sm text-[#666]">Open Deals</span>
          </div>
          <span className="text-lg font-semibold text-[#1A1A1A] tabular-nums">{totalDeals.toLocaleString()}</span>
        </div>

        <div className="flex items-center justify-between p-3 bg-[#F8F6EF] rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle2 size={16} className="text-green-600" />
            </div>
            <span className="text-sm text-[#666]">Closed Won</span>
          </div>
          <span className="text-lg font-semibold text-[#1A1A1A] tabular-nums">{closedWonThisMonth.toLocaleString()}</span>
        </div>

        <div className="flex items-center justify-between p-3 bg-[#F8F6EF] rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] flex items-center justify-center">
              <DollarSign size={16} className="text-white" />
            </div>
            <span className="text-sm text-[#666]">Avg Deal Size</span>
          </div>
          <span className="text-lg font-semibold text-[#1A1A1A] tabular-nums">${avgDealSize.toLocaleString()}</span>
        </div>

        <div className="flex items-center justify-between p-3 bg-[#F8F6EF] rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#EAD07D] flex items-center justify-center">
              <Clock size={16} className="text-[#1A1A1A]" />
            </div>
            <span className="text-sm text-[#666]">Deal Cycle</span>
          </div>
          <span className="text-lg font-semibold text-[#1A1A1A]">
            {dealVelocity !== null ? `${dealVelocity}d` : '—'}
          </span>
        </div>
      </div>
    </Card>
  );
};
