import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Plus, Check, Trash2, UserPlus, Loader2 } from 'lucide-react';
import { Avatar } from '../../../components/ui/Avatar';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { getRoleLabel, OPPORTUNITY_CONTACT_ROLES } from './types';
import { useToast } from '../ui/Toast';
import type { OpportunityContactRole, Contact } from '../../types';

interface BuyerCommitteeMember {
  id: string;
  contactId: string;
  role: OpportunityContactRole;
  isPrimary: boolean;
  contact?: {
    firstName?: string;
    lastName?: string;
    title?: string;
    avatarUrl?: string;
  };
}

interface BuyerCommitteeProps {
  members: BuyerCommitteeMember[];
  loading: boolean;
  availableContacts: Contact[];
  contactsLoading: boolean;
  accountId?: string;
  onAddContact: (data: { contactId: string; role: OpportunityContactRole; isPrimary: boolean }) => Promise<unknown>;
  onRemoveContact: (contactId: string) => Promise<unknown>;
  onSetPrimary: (contactId: string) => Promise<unknown>;
  isAdding: boolean;
  isRemoving: boolean;
}

export const BuyerCommittee: React.FC<BuyerCommitteeProps> = ({
  members,
  loading,
  availableContacts,
  contactsLoading,
  accountId,
  onAddContact,
  onRemoveContact,
  onSetPrimary,
  isAdding,
  isRemoving,
}) => {
  const { showToast } = useToast();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState('');
  const [selectedRole, setSelectedRole] = useState<OpportunityContactRole>('INFLUENCER');

  // Get contacts not already in committee
  const contactsNotInCommittee = availableContacts.filter(
    (c) => !members.some((m) => m.contactId === c.id)
  );

  const handleAdd = async () => {
    if (!selectedContactId || !selectedRole) return;
    try {
      await onAddContact({
        contactId: selectedContactId,
        role: selectedRole,
        isPrimary: members.length === 0,
      });
      showToast({ type: 'success', title: 'Contact Added to Committee' });
      setShowAddModal(false);
      setSelectedContactId('');
      setSelectedRole('INFLUENCER');
    } catch (err) {
      console.error('Failed to add contact to buyer committee:', err);
      showToast({ type: 'error', title: 'Failed to Add Contact', message: (err as Error).message || 'Please try again' });
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-[#F2F1EA] p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-[#1A1A1A] flex items-center gap-2">
            <Users size={16} className="text-[#888]" />
            Buyer Committee
          </h3>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 text-xs font-medium text-[#888] hover:text-[#1A1A1A] transition-colors"
          >
            <Plus size={14} />
            Add
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-[#F8F8F6] flex items-center justify-center mx-auto mb-3">
              <Users size={20} className="text-[#999]" />
            </div>
            <p className="text-xs text-[#888] mb-4">No stakeholders added</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-xs font-semibold text-[#1A1A1A] bg-[#EAD07D] px-4 py-2 rounded-full hover:bg-[#E5C56B] transition-colors"
            >
              Add Stakeholder
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-3 bg-[#FAFAFA] rounded-xl group hover:bg-[#F2F1EA] transition-colors"
              >
                <Avatar src={member.contact?.avatarUrl} className="w-8 h-8" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/dashboard/contacts/${member.contactId}`}
                      className="text-xs font-semibold text-[#1A1A1A] hover:underline truncate"
                    >
                      {member.contact?.firstName} {member.contact?.lastName}
                    </Link>
                    {member.isPrimary && (
                      <Badge variant="yellow" size="sm">Primary</Badge>
                    )}
                  </div>
                  <div className="text-[10px] text-[#888] truncate">
                    {getRoleLabel(member.role)}
                    {member.contact?.title && ` · ${member.contact.title}`}
                  </div>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!member.isPrimary && (
                    <button
                      onClick={() => onSetPrimary(member.contactId)}
                      className="p-1.5 text-[#888] hover:text-[#1A1A1A] hover:bg-white rounded-lg transition-colors"
                      title="Set as primary"
                    >
                      <Check size={12} />
                    </button>
                  )}
                  <button
                    onClick={() => onRemoveContact(member.contactId)}
                    disabled={isRemoving}
                    className="p-1.5 text-[#888] hover:text-red-500 hover:bg-white rounded-lg transition-colors disabled:opacity-50"
                    title="Remove"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center gap-3 p-6 pb-0 shrink-0">
              <div className="w-10 h-10 rounded-full bg-[#F2F1EA] flex items-center justify-center">
                <UserPlus size={18} className="text-[#666]" />
              </div>
              <h3 className="text-lg font-semibold text-[#1A1A1A]">Add to Committee</h3>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {contactsLoading ? (
                <div className="py-8 flex justify-center">
                  <Loader2 size={24} className="animate-spin text-[#999]" />
                </div>
              ) : contactsNotInCommittee.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 rounded-full bg-[#F8F8F6] flex items-center justify-center mx-auto mb-3">
                    <Users size={20} className="text-[#999]" />
                  </div>
                  <p className="text-sm text-[#666] mb-4">
                    {availableContacts.length === 0
                      ? 'No contacts found for this account'
                      : 'All contacts are already added'}
                  </p>
                  <Link
                    to={`/dashboard/contacts?accountId=${accountId}`}
                    className="text-xs font-semibold text-[#1A1A1A] bg-[#EAD07D] px-4 py-2 rounded-full hover:bg-[#E5C56B] transition-colors inline-block"
                  >
                    Add New Contact
                  </Link>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-[#888] mb-2">Contact</label>
                    <select
                      value={selectedContactId}
                      onChange={(e) => setSelectedContactId(e.target.value)}
                      className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EAD07D] bg-white text-sm"
                    >
                      <option value="">Select a contact...</option>
                      {contactsNotInCommittee.map((contact) => (
                        <option key={contact.id} value={contact.id}>
                          {contact.firstName} {contact.lastName}
                          {contact.title ? ` - ${contact.title}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-6">
                    <label className="block text-xs font-medium text-[#888] mb-2">Role</label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as OpportunityContactRole)}
                      className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EAD07D] bg-white text-sm"
                    >
                      {OPPORTUNITY_CONTACT_ROLES.map((role) => (
                        <option key={role} value={role}>{getRoleLabel(role)}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowAddModal(false);
                        setSelectedContactId('');
                        setSelectedRole('INFLUENCER');
                      }}
                      className="flex-1 px-4 py-2.5 text-[#666] hover:text-[#1A1A1A] font-medium transition-colors rounded-xl hover:bg-[#F8F8F6]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAdd}
                      disabled={isAdding || !selectedContactId}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-[#333] transition-colors disabled:opacity-50"
                    >
                      {isAdding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                      Add
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
