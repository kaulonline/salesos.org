import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2 } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { getTypeLabel } from './types';
import type { Account } from '../../types';

interface AccountSidebarProps {
  currentAccountId: string;
  accounts: Account[];
  loading: boolean;
}

export const AccountSidebar: React.FC<AccountSidebarProps> = ({
  currentAccountId,
  accounts,
  loading,
}) => {
  const navigate = useNavigate();

  return (
    <div className="lg:w-80 shrink-0 space-y-4 hidden xl:block">
      <button
        onClick={() => navigate('/dashboard/companies')}
        className="flex items-center gap-2 text-[#666] hover:text-[#1A1A1A] mb-8 transition-colors font-medium group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to
        Accounts
      </button>

      {loading ? (
        [1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-3xl" />)
      ) : (
        accounts.slice(0, 5).map((c) => (
          <Link to={`/dashboard/companies/${c.id}`} key={c.id} className="block group">
            <Card
              padding="sm"
              className={`rounded-3xl transition-all ${c.id === currentAccountId ? 'bg-[#EAD07D]' : 'hover:bg-gray-50'}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    c.id === currentAccountId ? 'bg-[#1A1A1A] text-white' : 'bg-[#F8F8F6] text-[#666]'
                  }`}
                >
                  <Building2 size={18} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold truncate text-[#1A1A1A]">
                    {c.name}
                  </div>
                  <div
                    className={`text-xs truncate ${c.id === currentAccountId ? 'text-[#1A1A1A]/70' : 'text-[#666]'}`}
                  >
                    {c.industry || getTypeLabel(c.type)}
                  </div>
                </div>
                {c.id === currentAccountId && <div className="ml-auto w-2 h-2 rounded-full bg-[#1A1A1A]"></div>}
              </div>
              {c.id === currentAccountId && (
                <div className="mt-3 w-full bg-[#1A1A1A]/10 h-1 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1A1A1A]"
                    style={{ width: `${c.healthScore || 50}%` }}
                  ></div>
                </div>
              )}
            </Card>
          </Link>
        ))
      )}
    </div>
  );
};
