import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Avatar } from '../../../components/ui/Avatar';
import { Skeleton } from '../../../components/ui/Skeleton';
import type { Lead } from '../../types';

interface LeadSidebarProps {
  currentLeadId: string;
  leads: Lead[];
  loading: boolean;
}

export const LeadSidebar: React.FC<LeadSidebarProps> = ({
  currentLeadId,
  leads,
  loading,
}) => {
  const navigate = useNavigate();

  return (
    <div className="lg:w-80 shrink-0 space-y-4 hidden xl:block">
      <button
        onClick={() => navigate('/dashboard/leads')}
        className="flex items-center gap-2 text-[#666] hover:text-[#1A1A1A] mb-8 transition-colors font-medium group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to
        Leads
      </button>

      {loading ? (
        [1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-3xl" />)
      ) : (
        leads.slice(0, 5).map((l) => (
          <Link to={`/dashboard/leads/${l.id}`} key={l.id} className="block group">
            <Card
              padding="sm"
              className={`rounded-3xl transition-all ${l.id === currentLeadId ? 'bg-[#EAD07D]' : 'hover:bg-gray-50'}`}
            >
              <div className="flex items-center gap-3">
                <Avatar
                  name={`${l.firstName} ${l.lastName}`}
                  size="sm"
                  className={l.id === currentLeadId ? 'ring-2 ring-[#1A1A1A]' : ''}
                />
                <div className="min-w-0">
                  <div className="text-sm font-bold truncate text-[#1A1A1A]">
                    {l.firstName} {l.lastName}
                  </div>
                  <div
                    className={`text-xs truncate ${l.id === currentLeadId ? 'text-[#1A1A1A]/70' : 'text-[#666]'}`}
                  >
                    {l.company || 'No company'}
                  </div>
                </div>
                {l.id === currentLeadId && <div className="ml-auto w-2 h-2 rounded-full bg-[#1A1A1A]"></div>}
              </div>
              {l.id === currentLeadId && (
                <div className="mt-3 w-full bg-[#1A1A1A]/10 h-1 rounded-full overflow-hidden">
                  <div className="h-full bg-[#1A1A1A]" style={{ width: `${l.leadScore || 50}%` }}></div>
                </div>
              )}
            </Card>
          </Link>
        ))
      )}
    </div>
  );
};
