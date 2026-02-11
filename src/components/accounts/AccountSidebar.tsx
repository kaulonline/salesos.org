import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Users, Briefcase } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { useContacts, useDeals } from '../../hooks';
import type { Account } from '../../types';

interface AccountSidebarProps {
  currentAccountId: string;
  company: Account;
}

export const AccountSidebar: React.FC<AccountSidebarProps> = ({
  currentAccountId,
  company,
}) => {
  const navigate = useNavigate();
  const { contacts, loading: contactsLoading } = useContacts({ accountId: currentAccountId });
  const { deals, loading: dealsLoading } = useDeals({ accountId: currentAccountId });

  return (
    <div className="xl:w-72 shrink-0 space-y-4 hidden xl:block">
      <button
        onClick={() => navigate('/dashboard/companies')}
        className="flex items-center gap-2 text-[#666] hover:text-[#1A1A1A] mb-6 transition-colors font-medium group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to
        Accounts
      </button>

      {/* Current Account */}
      <Card padding="sm" className="rounded-3xl bg-[#EAD07D]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] text-white flex items-center justify-center">
            <Building2 size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold truncate text-[#1A1A1A]">{company.name}</div>
            <div className="text-xs truncate text-[#1A1A1A]/70">{company.industry || company.type}</div>
          </div>
        </div>
      </Card>

      {/* Related Contacts */}
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <Users size={14} className="text-[#999]" />
          <span className="text-xs font-semibold text-[#999] uppercase tracking-wide">Contacts</span>
          <span className="text-xs text-[#999]">({contacts.length})</span>
        </div>
        {contactsLoading ? (
          <div className="text-xs text-[#999] px-1">Loading...</div>
        ) : contacts.length === 0 ? (
          <div className="text-xs text-[#999] px-1">No contacts</div>
        ) : (
          contacts.slice(0, 5).map((c) => (
            <Link to={`/dashboard/contacts/${c.id}`} key={c.id} className="block group">
              <Card padding="sm" className="rounded-2xl hover:bg-[#F8F8F6] transition-all mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F8F8F6] text-[#666] flex items-center justify-center text-xs font-bold">
                    {(c.firstName?.[0] || '')}{(c.lastName?.[0] || '')}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate text-[#1A1A1A]">
                      {c.firstName} {c.lastName}
                    </div>
                    <div className="text-xs truncate text-[#666]">{c.title || 'No title'}</div>
                  </div>
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>

      {/* Related Deals */}
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <Briefcase size={14} className="text-[#999]" />
          <span className="text-xs font-semibold text-[#999] uppercase tracking-wide">Deals</span>
          <span className="text-xs text-[#999]">({deals.length})</span>
        </div>
        {dealsLoading ? (
          <div className="text-xs text-[#999] px-1">Loading...</div>
        ) : deals.length === 0 ? (
          <div className="text-xs text-[#999] px-1">No deals</div>
        ) : (
          deals.slice(0, 5).map((d) => (
            <Link to={`/dashboard/deals/${d.id}`} key={d.id} className="block group">
              <Card padding="sm" className="rounded-2xl hover:bg-[#F8F8F6] transition-all mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F8F8F6] text-[#666] flex items-center justify-center">
                    <Briefcase size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate text-[#1A1A1A]">{d.name}</div>
                    <div className="text-xs truncate text-[#666]">{d.stage?.replace(/_/g, ' ')}</div>
                  </div>
                  <div className="text-xs font-semibold text-[#666]">
                    ${(d.amount || 0).toLocaleString()}
                  </div>
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};
