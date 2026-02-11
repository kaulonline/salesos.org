import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, X, Loader2 } from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';
import { useCompany, useCompanies, useDeals, useContacts } from '../../src/hooks';
import {
  AccountSidebar,
  AccountHeader,
  AccountAccordions,
  AccountMainContent,
  EditAccountModal,
  DeleteConfirmModal,
} from '../../src/components/accounts';
import { DetailBreadcrumb } from '../../src/components/shared/DetailBreadcrumb';
import type { UpdateAccountDto, CreateOpportunityDto, CreateContactDto, OpportunityStage } from '../../src/types';

export const AccountDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { company, hierarchy, revenue, loading, error, refetch } = useCompany(id);
  const { companies: recentCompanies, loading: companiesLoading, update, remove, isUpdating, isDeleting } = useCompanies();
  const { create: createDeal, isCreating: isCreatingDeal } = useDeals();
  const { create: createContact, isCreating: isCreatingContact } = useContacts();

  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['basic']));
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNewDealModal, setShowNewDealModal] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState<UpdateAccountDto>({});

  // New deal form state
  const [newDealForm, setNewDealForm] = useState<Partial<CreateOpportunityDto>>({
    name: '',
    amount: undefined,
    stage: 'PROSPECTING' as OpportunityStage,
  });

  // New contact form state
  const [newContactForm, setNewContactForm] = useState<Partial<CreateContactDto>>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    title: '',
  });

  // Initialize edit form when company loads
  useEffect(() => {
    if (company) {
      setEditForm({
        name: company.name,
        website: company.website,
        phone: company.phone,
        industry: company.industry,
        type: company.type,
        numberOfEmployees: company.numberOfEmployees,
        annualRevenue: company.annualRevenue,
        description: company.description,
      });
    }
  }, [company]);

  const toggleSection = (section: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const handleEdit = async () => {
    if (!id) return;
    try {
      await update(id, editForm);
      await refetch();
      setShowEditModal(false);
    } catch (err) {
      console.error('Failed to update account:', err);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await remove(id);
      navigate('/dashboard/companies');
    } catch (err) {
      console.error('Failed to delete account:', err);
    }
  };

  const handleCreateDeal = async () => {
    if (!id || !newDealForm.name) return;
    try {
      await createDeal({
        accountId: id,
        name: newDealForm.name,
        amount: newDealForm.amount,
        stage: newDealForm.stage || 'PROSPECTING',
      });
      setShowNewDealModal(false);
      setNewDealForm({ name: '', amount: undefined, stage: 'PROSPECTING' });
      await refetch();
    } catch (err) {
      console.error('Failed to create deal:', err);
    }
  };

  const handleCreateContact = async () => {
    if (!id || !newContactForm.firstName || !newContactForm.lastName) return;
    try {
      await createContact({
        accountId: id,
        firstName: newContactForm.firstName,
        lastName: newContactForm.lastName,
        email: newContactForm.email,
        phone: newContactForm.phone,
        title: newContactForm.title,
      });
      setShowAddContactModal(false);
      setNewContactForm({ firstName: '', lastName: '', email: '', phone: '', title: '' });
      await refetch();
    } catch (err) {
      console.error('Failed to create contact:', err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto p-6">
        <div className="flex flex-col xl:flex-row gap-6">
          <div className="xl:w-72 shrink-0 hidden xl:block space-y-4">
            <Skeleton className="h-6 w-32 mb-6" />
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-3xl" />
            ))}
          </div>
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
              <Skeleton className="lg:col-span-5 h-[340px] rounded-[2rem]" />
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-[160px] rounded-[2rem]" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="max-w-[1600px] mx-auto p-6">
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle size={48} className="text-red-400 mb-4" />
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">Account Not Found</h2>
          <p className="text-[#666] mb-6">
            {error || 'This account may have been deleted or you may not have access to it.'}
          </p>
          <button
            onClick={() => navigate('/dashboard/companies')}
            className="flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white rounded-full font-medium hover:bg-[#333] transition-colors"
          >
            <ArrowLeft size={16} /> Back to Accounts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto p-6 animate-in fade-in duration-500">
      <DetailBreadcrumb items={[
        { label: 'Accounts', path: '/dashboard/companies' },
        { label: company.name },
      ]} />
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Left Sidebar */}
        <AccountSidebar
          currentAccountId={company.id}
          company={company}
        />

        {/* Main Profile Area */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <AccountHeader
            account={company}
            onEdit={() => setShowEditModal(true)}
            onDelete={() => setShowDeleteConfirm(true)}
          />

          {/* Middle Row: Content & Details */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
            {/* Accordions Column */}
            <AccountAccordions
              account={company}
              hierarchy={hierarchy}
              openSections={openSections}
              onToggleSection={toggleSection}
            />

            {/* Main Content Area */}
            <AccountMainContent
              account={company}
              revenue={revenue}
              onEdit={() => setShowEditModal(true)}
              onNewDeal={() => setShowNewDealModal(true)}
              onAddContact={() => setShowAddContactModal(true)}
              onSchedule={() => navigate('/dashboard/calendar')}
            />
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <EditAccountModal
          account={company}
          editForm={editForm}
          setEditForm={setEditForm}
          onClose={() => setShowEditModal(false)}
          onSave={handleEdit}
          isUpdating={isUpdating}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          accountName={company.name}
          onClose={() => setShowDeleteConfirm(false)}
          onDelete={handleDelete}
          isDeleting={isDeleting}
        />
      )}

      {/* New Deal Modal */}
      {showNewDealModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-black/5 shrink-0">
              <h2 className="text-xl font-medium text-[#1A1A1A]">New Deal for {company.name}</h2>
              <button
                onClick={() => setShowNewDealModal(false)}
                className="w-8 h-8 rounded-full bg-[#F8F8F6] flex items-center justify-center hover:bg-[#F0EBD8] transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-[#666] mb-1">Deal Name *</label>
                <input
                  type="text"
                  value={newDealForm.name || ''}
                  onChange={(e) => setNewDealForm({ ...newDealForm, name: e.target.value })}
                  placeholder="e.g., Enterprise License Q1"
                  className="w-full px-3 py-2 border border-black/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#666] mb-1">Amount</label>
                <input
                  type="number"
                  value={newDealForm.amount || ''}
                  onChange={(e) => setNewDealForm({ ...newDealForm, amount: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="e.g., 50000"
                  className="w-full px-3 py-2 border border-black/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#666] mb-1">Stage</label>
                <select
                  value={newDealForm.stage || 'PROSPECTING'}
                  onChange={(e) => setNewDealForm({ ...newDealForm, stage: e.target.value as OpportunityStage })}
                  className="w-full px-3 py-2 border border-black/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                >
                  <option value="PROSPECTING">Prospecting</option>
                  <option value="QUALIFICATION">Qualification</option>
                  <option value="NEEDS_ANALYSIS">Needs Analysis</option>
                  <option value="VALUE_PROPOSITION">Value Proposition</option>
                  <option value="PROPOSAL_PRICE_QUOTE">Proposal/Quote</option>
                  <option value="NEGOTIATION_REVIEW">Negotiation</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-black/5 flex gap-3 shrink-0">
              <button
                onClick={() => setShowNewDealModal(false)}
                className="flex-1 px-4 py-2.5 text-[#666] hover:text-[#1A1A1A] font-medium transition-colors rounded-xl hover:bg-[#F8F8F6]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDeal}
                disabled={isCreatingDeal || !newDealForm.name}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-black transition-colors disabled:opacity-50"
              >
                {isCreatingDeal && <Loader2 size={16} className="animate-spin" />}
                Create Deal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddContactModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-black/5 shrink-0">
              <h2 className="text-xl font-medium text-[#1A1A1A]">Add Contact to {company.name}</h2>
              <button
                onClick={() => setShowAddContactModal(false)}
                className="w-8 h-8 rounded-full bg-[#F8F8F6] flex items-center justify-center hover:bg-[#F0EBD8] transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#666] mb-1">First Name *</label>
                  <input
                    type="text"
                    value={newContactForm.firstName || ''}
                    onChange={(e) => setNewContactForm({ ...newContactForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-black/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#666] mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={newContactForm.lastName || ''}
                    onChange={(e) => setNewContactForm({ ...newContactForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-black/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#666] mb-1">Email</label>
                <input
                  type="email"
                  value={newContactForm.email || ''}
                  onChange={(e) => setNewContactForm({ ...newContactForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-black/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#666] mb-1">Phone</label>
                <input
                  type="tel"
                  value={newContactForm.phone || ''}
                  onChange={(e) => setNewContactForm({ ...newContactForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-black/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#666] mb-1">Title</label>
                <input
                  type="text"
                  value={newContactForm.title || ''}
                  onChange={(e) => setNewContactForm({ ...newContactForm, title: e.target.value })}
                  placeholder="e.g., VP of Sales"
                  className="w-full px-3 py-2 border border-black/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                />
              </div>
            </div>
            <div className="p-6 border-t border-black/5 flex gap-3 shrink-0">
              <button
                onClick={() => setShowAddContactModal(false)}
                className="flex-1 px-4 py-2.5 text-[#666] hover:text-[#1A1A1A] font-medium transition-colors rounded-xl hover:bg-[#F8F8F6]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateContact}
                disabled={isCreatingContact || !newContactForm.firstName || !newContactForm.lastName}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-black transition-colors disabled:opacity-50"
              >
                {isCreatingContact && <Loader2 size={16} className="animate-spin" />}
                Add Contact
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountDetail;
