import React from 'react';
import { Briefcase, Users, Edit3, Calendar, AlertTriangle } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { formatCurrency } from './types';
import type { Account } from '../../types';

interface RevenueData {
  totalRevenue: number;
  closedWonDeals: number;
  openDeals: number;
  avgDealSize: number;
  revenueByMonth?: { month: string; revenue: number }[];
}

interface AccountMainContentProps {
  account: Account;
  revenue?: RevenueData | null;
  onEdit: () => void;
  onNewDeal: () => void;
  onAddContact: () => void;
  onSchedule: () => void;
}

export const AccountMainContent: React.FC<AccountMainContentProps> = ({
  account,
  revenue,
  onEdit,
  onNewDeal,
  onAddContact,
  onSchedule,
}) => {
  return (
    <div className="lg:col-span-8 space-y-6">
      {/* Revenue Overview */}
      {revenue && (
        <Card className="p-8">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-xl font-medium text-[#1A1A1A]">Revenue Overview</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#F8F8F6] rounded-xl p-4 text-center">
              <div className="text-2xl font-light text-[#1A1A1A] mb-1">
                {formatCurrency(revenue.totalRevenue)}
              </div>
              <div className="text-xs text-[#666]">Total Revenue</div>
            </div>
            <div className="bg-[#F8F8F6] rounded-xl p-4 text-center">
              <div className="text-2xl font-light text-[#1A1A1A] mb-1">
                {revenue.closedWonDeals}
              </div>
              <div className="text-xs text-[#666]">Closed Won</div>
            </div>
            <div className="bg-[#F8F8F6] rounded-xl p-4 text-center">
              <div className="text-2xl font-light text-[#1A1A1A] mb-1">
                {revenue.openDeals}
              </div>
              <div className="text-xs text-[#666]">Open Deals</div>
            </div>
            <div className="bg-[#F8F8F6] rounded-xl p-4 text-center">
              <div className="text-2xl font-light text-[#1A1A1A] mb-1">
                {formatCurrency(revenue.avgDealSize)}
              </div>
              <div className="text-xs text-[#666]">Avg Deal Size</div>
            </div>
          </div>

          {/* Revenue by Month Chart */}
          {revenue.revenueByMonth && revenue.revenueByMonth.length > 0 && (
            <div>
              <div className="text-sm font-medium text-[#666] mb-3">Revenue Trend</div>
              <div className="flex items-end gap-2 h-32">
                {revenue.revenueByMonth.slice(-6).map((month, i) => {
                  const maxRevenue = Math.max(...revenue.revenueByMonth!.map((m) => m.revenue));
                  const height = maxRevenue > 0 ? (month.revenue / maxRevenue) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-[#EAD07D] rounded-t-lg transition-all hover:bg-[#1A1A1A]"
                        style={{ height: `${Math.max(height, 4)}%` }}
                        title={`${month.month}: ${formatCurrency(month.revenue)}`}
                      />
                      <span className="text-[10px] text-[#999]">{month.month.slice(0, 3)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-[#1A1A1A] mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={onNewDeal}
            className="flex flex-col items-center gap-2 p-4 bg-[#F8F8F6] rounded-xl hover:bg-[#EAD07D] transition-colors group"
          >
            <Briefcase size={20} className="text-[#666] group-hover:text-[#1A1A1A]" />
            <span className="text-xs font-medium text-[#666] group-hover:text-[#1A1A1A]">
              New Deal
            </span>
          </button>
          <button
            onClick={onAddContact}
            className="flex flex-col items-center gap-2 p-4 bg-[#F8F8F6] rounded-xl hover:bg-[#EAD07D] transition-colors group"
          >
            <Users size={20} className="text-[#666] group-hover:text-[#1A1A1A]" />
            <span className="text-xs font-medium text-[#666] group-hover:text-[#1A1A1A]">
              Add Contact
            </span>
          </button>
          <button
            onClick={onEdit}
            className="flex flex-col items-center gap-2 p-4 bg-[#F8F8F6] rounded-xl hover:bg-[#EAD07D] transition-colors group"
          >
            <Edit3 size={20} className="text-[#666] group-hover:text-[#1A1A1A]" />
            <span className="text-xs font-medium text-[#666] group-hover:text-[#1A1A1A]">Edit</span>
          </button>
          <button
            onClick={onSchedule}
            className="flex flex-col items-center gap-2 p-4 bg-[#1A1A1A] rounded-xl hover:bg-[#333] transition-colors group"
          >
            <Calendar size={20} className="text-white" />
            <span className="text-xs font-medium text-white">Schedule</span>
          </button>
        </div>
      </Card>

      {/* Pain Points & Competitors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-medium text-[#1A1A1A] mb-4">Pain Points</h3>
          {account.painPoints && account.painPoints.length > 0 ? (
            <div className="space-y-2">
              {account.painPoints.map((point, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 p-3 bg-[#F8F8F6] rounded-lg"
                >
                  <AlertTriangle size={16} className="text-[#EAD07D] mt-0.5 shrink-0" />
                  <span className="text-sm text-[#666]">{point}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#666]">No pain points recorded</p>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium text-[#1A1A1A] mb-4">Competitors</h3>
          {account.competitors && account.competitors.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {account.competitors.map((competitor, i) => (
                <Badge key={i} variant="outline" size="md">
                  {competitor}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#666]">No competitors recorded</p>
          )}
        </Card>
      </div>
    </div>
  );
};
