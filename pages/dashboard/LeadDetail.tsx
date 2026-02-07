import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';
import { useLead, useLeads } from '../../src/hooks';
import {
  LeadSidebar,
  LeadHeader,
  LeadAccordions,
  LeadScoreSection,
  EditLeadModal,
  DeleteConfirmModal,
  ConvertLeadModal,
} from '../../src/components/leads';
import type { UpdateLeadDto, ConvertLeadDto } from '../../src/types';

export const LeadDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lead, loading, error, refetch } = useLead(id);
  const { leads: recentLeads, loading: leadsLoading, update, remove, score, convert, isUpdating, isDeleting, isConverting } = useLeads();

  const [openSection, setOpenSection] = useState<string | null>('basic');
  const [scoringLead, setScoringLead] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState<UpdateLeadDto>({});

  // Convert form state
  const [convertForm, setConvertForm] = useState<ConvertLeadDto>({
    createAccount: true,
    createContact: true,
    createOpportunity: false,
  });

  // Initialize edit form when lead loads
  useEffect(() => {
    if (lead) {
      setEditForm({
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        title: lead.title,
        status: lead.status,
        rating: lead.rating,
        description: lead.description,
      });
    }
  }, [lead]);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const handleScore = async () => {
    if (!id) return;
    setScoringLead(true);
    try {
      await score(id);
      await refetch();
    } catch (err) {
      console.error('Failed to score lead:', err);
    } finally {
      setScoringLead(false);
    }
  };

  const handleEdit = async () => {
    if (!id) return;
    try {
      await update(id, editForm);
      await refetch();
      setShowEditModal(false);
    } catch (err) {
      console.error('Failed to update lead:', err);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await remove(id);
      navigate('/dashboard/leads');
    } catch (err) {
      console.error('Failed to delete lead:', err);
    }
  };

  const handleConvert = async () => {
    if (!id) return;
    try {
      await convert(id, convertForm);
      navigate('/dashboard/contacts');
    } catch (err) {
      console.error('Failed to convert lead:', err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-80 shrink-0 hidden xl:block space-y-4">
            <Skeleton className="h-6 w-32 mb-6" />
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-3xl" />
            ))}
          </div>
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
              <Skeleton className="lg:col-span-8 h-[340px] rounded-[2rem]" />
              <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
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

  if (error || !lead) {
    return (
      <div className="max-w-[1600px] mx-auto p-6">
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle size={48} className="text-red-400 mb-4" />
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">Lead Not Found</h2>
          <p className="text-[#666] mb-6">
            {error || 'This lead may have been deleted or you may not have access to it.'}
          </p>
          <button
            onClick={() => navigate('/dashboard/leads')}
            className="flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white rounded-full font-medium hover:bg-[#333] transition-colors"
          >
            <ArrowLeft size={16} /> Back to Leads
          </button>
        </div>
      </div>
    );
  }

  const fullName = `${lead.firstName} ${lead.lastName}`;

  return (
    <div className="max-w-[1600px] mx-auto p-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Sidebar */}
        <LeadSidebar
          currentLeadId={lead.id}
          leads={recentLeads}
          loading={leadsLoading}
        />

        {/* Main Profile Area */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <LeadHeader
            lead={lead}
            onScore={handleScore}
            onEdit={() => setShowEditModal(true)}
            onDelete={() => setShowDeleteConfirm(true)}
            scoringLead={scoringLead}
          />

          {/* Middle Row: Content & Details */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
            {/* Accordions Column */}
            <LeadAccordions
              lead={lead}
              openSection={openSection}
              onToggleSection={toggleSection}
            />

            {/* Score Section */}
            <LeadScoreSection
              lead={lead}
              onScore={handleScore}
              onEdit={() => setShowEditModal(true)}
              onConvert={() => setShowConvertModal(true)}
              scoringLead={scoringLead}
            />
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <EditLeadModal
          lead={lead}
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
          fullName={fullName}
          onClose={() => setShowDeleteConfirm(false)}
          onDelete={handleDelete}
          isDeleting={isDeleting}
        />
      )}

      {/* Convert Modal */}
      {showConvertModal && (
        <ConvertLeadModal
          lead={lead}
          fullName={fullName}
          convertForm={convertForm}
          setConvertForm={setConvertForm}
          onClose={() => setShowConvertModal(false)}
          onConvert={handleConvert}
          isConverting={isConverting}
        />
      )}
    </div>
  );
};
