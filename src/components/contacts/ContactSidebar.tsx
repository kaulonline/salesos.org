import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Briefcase } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Avatar } from '../../../components/ui/Avatar';
import { useContacts } from '../../hooks';
import type { Contact, Opportunity } from '../../types';

interface ContactSidebarProps {
  currentContactId: string;
  contact: Contact;
}

export const ContactSidebar: React.FC<ContactSidebarProps> = ({
  currentContactId,
  contact,
}) => {
  const navigate = useNavigate();
  const accountId = contact.accountId || contact.account?.id;
  const { contacts: siblingContacts, loading: siblingsLoading } = useContacts(
    accountId ? { accountId } : undefined
  );
  const opportunities: Opportunity[] = (contact as any).opportunities || [];

  // Filter out the current contact from siblings
  const otherContacts = siblingContacts.filter((c) => c.id !== currentContactId);

  return (
    <div className="xl:w-72 shrink-0 space-y-4 hidden xl:block">
      <button
        onClick={() => navigate('/dashboard/contacts')}
        className="flex items-center gap-2 text-[#666] hover:text-[#1A1A1A] mb-6 transition-colors font-medium group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to
        Contacts
      </button>

      {/* Current Contact */}
      <Card padding="sm" className="rounded-3xl bg-[#EAD07D]">
        <div className="flex items-center gap-3">
          <Avatar
            name={`${contact.firstName} ${contact.lastName}`}
            src={contact.avatarUrl}
            size="sm"
            className="ring-2 ring-[#1A1A1A]"
          />
          <div className="min-w-0">
            <div className="text-sm font-bold truncate text-[#1A1A1A]">
              {contact.firstName} {contact.lastName}
            </div>
            <div className="text-xs truncate text-[#1A1A1A]/70">
              {contact.title || contact.account?.name || 'No title'}
            </div>
          </div>
        </div>
      </Card>

      {/* Same-Account Contacts */}
      {accountId && (
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <Users size={14} className="text-[#999]" />
            <span className="text-xs font-semibold text-[#999] uppercase tracking-wide">
              {contact.account?.name ? `At ${contact.account.name}` : 'Same Account'}
            </span>
          </div>
          {siblingsLoading ? (
            <div className="text-xs text-[#999] px-1">Loading...</div>
          ) : otherContacts.length === 0 ? (
            <div className="text-xs text-[#999] px-1">No other contacts</div>
          ) : (
            otherContacts.slice(0, 5).map((c) => (
              <Link to={`/dashboard/contacts/${c.id}`} key={c.id} className="block group">
                <Card padding="sm" className="rounded-2xl hover:bg-[#F8F8F6] transition-all mb-2">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={`${c.firstName} ${c.lastName}`}
                      src={c.avatarUrl}
                      size="sm"
                    />
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
      )}

      {/* Related Opportunities */}
      {opportunities.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <Briefcase size={14} className="text-[#999]" />
            <span className="text-xs font-semibold text-[#999] uppercase tracking-wide">Deals</span>
            <span className="text-xs text-[#999]">({opportunities.length})</span>
          </div>
          {opportunities.slice(0, 5).map((opp) => (
            <Link to={`/dashboard/deals/${opp.id}`} key={opp.id} className="block group">
              <Card padding="sm" className="rounded-2xl hover:bg-[#F8F8F6] transition-all mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F8F8F6] text-[#666] flex items-center justify-center">
                    <Briefcase size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate text-[#1A1A1A]">{opp.name}</div>
                    <div className="text-xs truncate text-[#666]">{opp.stage?.replace(/_/g, ' ')}</div>
                  </div>
                  <div className="text-xs font-semibold text-[#666]">
                    ${(opp.amount || 0).toLocaleString()}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
