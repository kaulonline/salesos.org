import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Avatar } from '../../../components/ui/Avatar';
import { Skeleton } from '../../../components/ui/Skeleton';
import type { Contact } from '../../types';

interface ContactSidebarProps {
  currentContactId: string;
  contacts: Contact[];
  loading: boolean;
}

export const ContactSidebar: React.FC<ContactSidebarProps> = ({
  currentContactId,
  contacts,
  loading,
}) => {
  const navigate = useNavigate();

  return (
    <div className="lg:w-80 shrink-0 space-y-4 hidden xl:block">
      <button
        onClick={() => navigate('/dashboard/contacts')}
        className="flex items-center gap-2 text-[#666] hover:text-[#1A1A1A] mb-8 transition-colors font-medium group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to
        Contacts
      </button>

      {loading ? (
        [1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-3xl" />)
      ) : (
        contacts.slice(0, 5).map((c) => (
          <Link to={`/dashboard/contacts/${c.id}`} key={c.id} className="block group">
            <Card
              padding="sm"
              className={`rounded-3xl transition-all ${c.id === currentContactId ? 'bg-[#EAD07D]' : 'hover:bg-gray-50'}`}
            >
              <div className="flex items-center gap-3">
                <Avatar
                  name={`${c.firstName} ${c.lastName}`}
                  src={c.avatarUrl}
                  size="sm"
                  className={c.id === currentContactId ? 'ring-2 ring-[#1A1A1A]' : ''}
                />
                <div className="min-w-0">
                  <div className="text-sm font-bold truncate text-[#1A1A1A]">
                    {c.firstName} {c.lastName}
                  </div>
                  <div
                    className={`text-xs truncate ${c.id === currentContactId ? 'text-[#1A1A1A]/70' : 'text-[#666]'}`}
                  >
                    {c.title || c.account?.name || 'No title'}
                  </div>
                </div>
                {c.id === currentContactId && <div className="ml-auto w-2 h-2 rounded-full bg-[#1A1A1A]"></div>}
              </div>
              {c.id === currentContactId && (
                <div className="mt-3 w-full bg-[#1A1A1A]/10 h-1 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1A1A1A]"
                    style={{ width: `${c.engagementScore || 50}%` }}
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
