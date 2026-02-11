import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Briefcase, Users } from 'lucide-react';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useDeals, useContacts } from '../../hooks';
import { formatCompactCurrency } from './types';
import type { Opportunity } from '../../types';

interface DealSidebarProps {
  currentDealId: string;
  deal: Opportunity;
}

export const DealSidebar: React.FC<DealSidebarProps> = ({
  currentDealId,
  deal,
}) => {
  const navigate = useNavigate();
  const { deals: accountDeals, loading: dealsLoading } = useDeals(
    deal.accountId ? { accountId: deal.accountId } : undefined
  );
  const { contacts: accountContacts, loading: contactsLoading } = useContacts(
    deal.accountId ? { accountId: deal.accountId } : undefined
  );

  const otherDeals = accountDeals.filter((d) => d.id !== currentDealId);

  return (
    <div className="xl:w-72 shrink-0 space-y-3 hidden xl:block">
      <button
        onClick={() => navigate('/dashboard/deals')}
        className="flex items-center gap-2 text-[#666] hover:text-[#1A1A1A] mb-6 transition-colors text-sm font-medium group"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
        Back to Pipeline
      </button>

      {/* Current Deal */}
      <div className="p-4 rounded-2xl bg-[#EAD07D] shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] text-white flex items-center justify-center">
            <Briefcase size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate text-[#1A1A1A]">{deal.name}</div>
            <div className="text-xs truncate text-[#1A1A1A]/60">
              {deal.account?.name || 'Unknown'}
            </div>
          </div>
          <div className="text-xs font-semibold text-[#1A1A1A]">
            ${formatCompactCurrency(deal.amount)}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-[#1A1A1A]/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1A1A1A] rounded-full transition-all duration-500"
              style={{ width: `${deal.probability || 50}%` }}
            />
          </div>
          <span className="text-xs font-medium text-[#1A1A1A]/70">
            {deal.probability || 50}%
          </span>
        </div>
      </div>

      {/* Other Deals at Same Account */}
      {deal.accountId && (
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <Briefcase size={14} className="text-[#999]" />
            <span className="text-xs font-semibold text-[#999] uppercase tracking-wide">Other Deals</span>
          </div>
          {dealsLoading ? (
            [1, 2].map(i => <Skeleton key={i} className="h-[60px] w-full rounded-2xl" />)
          ) : otherDeals.length === 0 ? (
            <div className="text-xs text-[#999] px-1">No other deals</div>
          ) : (
            otherDeals.slice(0, 4).map((d) => (
              <Link to={`/dashboard/deals/${d.id}`} key={d.id} className="block group">
                <div className="p-3 rounded-2xl bg-white hover:bg-[#F8F8F6] border border-transparent hover:border-[#E5E5E5] transition-all duration-200 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#F2F1EA] text-[#666] flex items-center justify-center group-hover:bg-[#E5E5E5]">
                      <Briefcase size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate text-[#1A1A1A]">{d.name}</div>
                      <div className="text-xs truncate text-[#888]">{d.stage?.replace(/_/g, ' ')}</div>
                    </div>
                    <div className="text-xs font-semibold text-[#666]">
                      ${formatCompactCurrency(d.amount)}
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {/* Key Contacts */}
      {deal.accountId && (
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <Users size={14} className="text-[#999]" />
            <span className="text-xs font-semibold text-[#999] uppercase tracking-wide">Contacts</span>
          </div>
          {contactsLoading ? (
            [1, 2].map(i => <Skeleton key={i} className="h-[50px] w-full rounded-2xl" />)
          ) : accountContacts.length === 0 ? (
            <div className="text-xs text-[#999] px-1">No contacts</div>
          ) : (
            accountContacts.slice(0, 4).map((c) => (
              <Link to={`/dashboard/contacts/${c.id}`} key={c.id} className="block group">
                <div className="p-3 rounded-2xl bg-white hover:bg-[#F8F8F6] border border-transparent hover:border-[#E5E5E5] transition-all duration-200 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#F2F1EA] text-[#666] flex items-center justify-center text-xs font-bold">
                      {(c.firstName?.[0] || '')}{(c.lastName?.[0] || '')}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate text-[#1A1A1A]">
                        {c.firstName} {c.lastName}
                      </div>
                      <div className="text-xs truncate text-[#888]">{c.title || 'No title'}</div>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
};
