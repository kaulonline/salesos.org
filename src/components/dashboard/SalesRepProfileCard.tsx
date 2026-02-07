import React, { useState } from 'react';
import {
  TrendingUp,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Award,
  BarChart3,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency, getStageLabel } from './types';
import type { Opportunity } from '../../types';

// Accordion Item Component
const AccordionItem: React.FC<{
  title: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-black/5 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 px-1 text-left hover:bg-black/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-[#666]">{icon}</span>
          <span className="font-medium text-[#1A1A1A] text-sm">{title}</span>
        </div>
        {isOpen ? <ChevronUp size={18} className="text-[#999]" /> : <ChevronDown size={18} className="text-[#999]" />}
      </button>
      {isOpen && children && (
        <div className="pb-4 px-1">
          {children}
        </div>
      )}
    </div>
  );
};

interface SalesRepProfileCardProps {
  userName: string;
  userFullName: string;
  userTitle: string;
  avatarUrl?: string;
  estimatedCommission: number;
  totalOpportunities: number;
  totalPipeline: number;
  closedWonValue: number;
  winRate: number;
  quotaAttainment: number;
  dealVelocity: number | null;
  topDeals: Opportunity[];
}

export const SalesRepProfileCard: React.FC<SalesRepProfileCardProps> = ({
  userName,
  userFullName,
  userTitle,
  avatarUrl,
  estimatedCommission,
  totalOpportunities,
  totalPipeline,
  closedWonValue,
  winRate,
  quotaAttainment,
  dealVelocity,
  topDeals,
}) => {
  return (
    <div className="rounded-[32px] p-6">
      {/* Profile Image */}
      <div className="relative mb-4">
        <div className="w-full aspect-square rounded-[24px] overflow-hidden bg-[#E5DCC3] shadow-inner relative">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={userName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#EAD07D] to-[#D4BC5E]">
              <span className="text-6xl font-light text-white">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          {/* Frosted glass overlay at bottom 15% of image */}
          <div className="absolute bottom-0 left-0 right-0 h-[15%] bg-white/30 backdrop-blur-md border-t border-white/30" />
        </div>
        {/* Commission Badge */}
        <div className="absolute bottom-4 right-4 px-4 py-2 bg-[#EAD07D] rounded-full text-sm font-semibold text-[#1A1A1A] shadow-lg">
          {formatCurrency(estimatedCommission)}
        </div>
      </div>

      {/* Name & Role */}
      <h2 className="text-xl font-semibold text-[#1A1A1A] mb-1">
        {userFullName}
      </h2>
      <p className="text-sm text-[#666] mb-6">{userTitle}</p>

      {/* Accordion Sections */}
      <div className="bg-white/60 rounded-2xl px-4">
        <AccordionItem
          title="Pipeline Overview"
          icon={<TrendingUp size={18} />}
          defaultOpen={true}
        >
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#666]">Open Opportunities</span>
              <span className="font-medium">{totalOpportunities}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666]">Total Value</span>
              <span className="font-medium">{formatCurrency(totalPipeline)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666]">Avg Deal Size</span>
              <span className="font-medium">
                {formatCurrency(totalPipeline / (totalOpportunities || 1))}
              </span>
            </div>
          </div>
        </AccordionItem>

        <AccordionItem
          title="Top Deals"
          icon={<Award size={18} />}
        >
          {topDeals.length > 0 ? (
            <div className="space-y-3">
              {topDeals.map((deal, i) => (
                <Link
                  key={deal.id}
                  to={`/dashboard/deals/${deal.id}`}
                  className="block hover:bg-black/5 rounded-lg p-2 -mx-2 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#EAD07D] text-xs font-semibold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="font-medium text-[#1A1A1A] text-sm truncate flex-1">{deal.name}</span>
                  </div>
                  <div className="flex justify-between mt-1 ml-7">
                    <span className="text-xs text-[#666]">{getStageLabel(deal.stage)}</span>
                    <span className="text-xs font-medium">{formatCurrency(deal.amount || 0)}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#666]">No active deals</p>
          )}
        </AccordionItem>

        <AccordionItem
          title="Commission & Earnings"
          icon={<DollarSign size={18} />}
        >
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#666]">MTD Commission</span>
              <span className="font-medium text-green-600">{formatCurrency(estimatedCommission)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666]">Closed Revenue</span>
              <span className="font-medium">{formatCurrency(closedWonValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666]">Projected (Pipeline)</span>
              <span className="font-medium text-[#666]">{formatCurrency(totalPipeline * 0.03)}</span>
            </div>
          </div>
        </AccordionItem>

        <AccordionItem
          title="Performance Stats"
          icon={<BarChart3 size={18} />}
        >
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#666]">Win Rate</span>
              <span className="font-medium">{Math.round(winRate)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666]">Avg Deal Cycle</span>
              <span className="font-medium">{dealVelocity !== null ? `${dealVelocity} days` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666]">Quota Attainment</span>
              <span className="font-medium">{quotaAttainment}%</span>
            </div>
          </div>
        </AccordionItem>
      </div>
    </div>
  );
};
