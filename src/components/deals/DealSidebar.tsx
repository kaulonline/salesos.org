import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Briefcase } from 'lucide-react';
import { Skeleton } from '../../../components/ui/Skeleton';
import { formatCompactCurrency } from './types';
import type { Opportunity } from '../../types';

interface DealSidebarProps {
  currentDealId: string;
  deals: Opportunity[];
  loading: boolean;
}

export const DealSidebar: React.FC<DealSidebarProps> = ({
  currentDealId,
  deals,
  loading,
}) => {
  const navigate = useNavigate();

  return (
    <div className="xl:w-72 shrink-0 space-y-3 hidden xl:block">
      <button
        onClick={() => navigate('/dashboard/deals')}
        className="flex items-center gap-2 text-[#666] hover:text-[#1A1A1A] mb-6 transition-colors text-sm font-medium group"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
        Back to Pipeline
      </button>

      {loading ? (
        [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[72px] w-full rounded-2xl" />)
      ) : (
        deals.slice(0, 6).map((d) => (
          <Link to={`/dashboard/deals/${d.id}`} key={d.id} className="block group">
            <div className={`p-4 rounded-2xl transition-all duration-200 ${
              d.id === currentDealId
                ? 'bg-[#EAD07D] shadow-md'
                : 'bg-white hover:bg-[#F8F8F6] border border-transparent hover:border-[#E5E5E5]'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                  d.id === currentDealId
                    ? 'bg-[#1A1A1A] text-white'
                    : 'bg-[#F2F1EA] text-[#666] group-hover:bg-[#E5E5E5]'
                }`}>
                  <Briefcase size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-semibold truncate ${
                    d.id === currentDealId ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'
                  }`}>
                    {d.name}
                  </div>
                  <div className={`text-xs truncate ${
                    d.id === currentDealId ? 'text-[#1A1A1A]/60' : 'text-[#888]'
                  }`}>
                    {d.account?.name || 'Unknown'}
                  </div>
                </div>
                <div className={`text-xs font-semibold ${
                  d.id === currentDealId ? 'text-[#1A1A1A]' : 'text-[#666]'
                }`}>
                  ${formatCompactCurrency(d.amount)}
                </div>
              </div>
              {d.id === currentDealId && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-[#1A1A1A]/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#1A1A1A] rounded-full transition-all duration-500"
                      style={{ width: `${d.probability || 50}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-[#1A1A1A]/70">
                    {d.probability || 50}%
                  </span>
                </div>
              )}
            </div>
          </Link>
        ))
      )}
    </div>
  );
};
