import React from 'react';
import { Link } from 'react-router-dom';
import { Briefcase } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { QuickLogActivity } from '../shared/QuickLogActivity';
import { FieldChangeHistory } from '../audit/FieldChangeHistory';
import type { Contact, Opportunity } from '../../types';

interface ContactMainContentProps {
  contact: Contact;
  opportunities: Opportunity[];
  onEdit: () => void;
}

export const ContactMainContent: React.FC<ContactMainContentProps> = ({
  contact,
  opportunities,
  onEdit,
}) => {
  return (
    <div className="lg:col-span-7 space-y-6">
      {/* Quick Log Activity */}
      <QuickLogActivity entityType="contact" entityId={contact.id} />

      {/* Related Opportunities */}
      <Card className="p-8">
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-xl font-medium text-[#1A1A1A]">Related Opportunities</h3>
          <Link
            to="/dashboard/deals"
            className="text-xs font-bold text-[#1A1A1A] bg-[#EAD07D] px-4 py-2 rounded-full hover:bg-[#E5C973] transition-colors"
          >
            Add Opportunity
          </Link>
        </div>

        {opportunities && opportunities.length > 0 ? (
          <div className="space-y-3">
            {opportunities.map((opp) => (
              <Link
                key={opp.id}
                to={`/dashboard/deals/${opp.id}`}
                className="flex items-center justify-between p-4 bg-[#F8F8F6] rounded-xl hover:bg-[#EAD07D]/20 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                    <Briefcase size={18} className="text-[#666]" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#1A1A1A] group-hover:text-[#1A1A1A]">
                      {opp.name}
                    </div>
                    <div className="text-xs text-[#666]">{opp.stage}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-[#1A1A1A]">
                    ${(opp.amount || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-[#666]">{opp.probability || 0}% probability</div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-[#F8F8F6] rounded-xl">
            <Briefcase size={32} className="mx-auto mb-3 text-[#999] opacity-40" />
            <p className="text-sm text-[#666] mb-3">No opportunities linked to this contact</p>
            <Link
              to="/dashboard/deals"
              className="text-xs font-bold text-[#1A1A1A] hover:text-[#EAD07D]"
            >
              Create an opportunity
            </Link>
          </div>
        )}
      </Card>

      {/* Field Change History */}
      <FieldChangeHistory entityType="contact" entityId={contact.id} />

      {/* Engagement Chart */}
      <Card className="p-8">
        <h3 className="text-xl font-medium text-[#1A1A1A] mb-6">Engagement Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#F8F8F6] rounded-xl p-6 text-center">
            <div className="text-4xl font-light text-[#1A1A1A] mb-2">
              {contact.engagementScore || 0}
            </div>
            <div className="text-sm text-[#666]">Engagement Score</div>
            <div className="mt-3 h-2 bg-[#F0EBD8] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#EAD07D] rounded-full"
                style={{ width: `${contact.engagementScore || 0}%` }}
              ></div>
            </div>
          </div>
          <div className="bg-[#F8F8F6] rounded-xl p-6 text-center">
            <div className="text-4xl font-light text-[#1A1A1A] mb-2">
              {contact.responseRate ? `${Math.round(contact.responseRate * 100)}%` : '0%'}
            </div>
            <div className="text-sm text-[#666]">Response Rate</div>
            <div className="mt-3 h-2 bg-[#F0EBD8] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1A1A1A] rounded-full"
                style={{ width: `${(contact.responseRate || 0) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="bg-[#F8F8F6] rounded-xl p-6 text-center">
            <div className="text-4xl font-light text-[#1A1A1A] mb-2">
              {opportunities?.length || 0}
            </div>
            <div className="text-sm text-[#666]">Active Opportunities</div>
          </div>
        </div>
      </Card>
    </div>
  );
};
