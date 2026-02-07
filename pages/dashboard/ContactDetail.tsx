import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';
import { useContact, useContacts } from '../../src/hooks';
import {
  ContactSidebar,
  ContactHeader,
  ContactAccordions,
  ContactMainContent,
  EditContactModal,
  DeleteConfirmModal,
} from '../../src/components/contacts';
import type { UpdateContactDto } from '../../src/types';

export const ContactDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { contact, opportunities, loading, error, refetch } = useContact(id);
  const { contacts: recentContacts, loading: contactsLoading, update, remove, isUpdating, isDeleting } = useContacts();

  const [openSection, setOpenSection] = useState<string | null>('basic');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState<UpdateContactDto>({});

  // Initialize edit form when contact loads
  useEffect(() => {
    if (contact) {
      setEditForm({
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone,
        mobilePhone: contact.mobilePhone,
        title: contact.title,
        department: contact.department,
        role: contact.role,
        seniorityLevel: contact.seniorityLevel,
        doNotCall: contact.doNotCall,
        doNotEmail: contact.doNotEmail,
      });
    }
  }, [contact]);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const handleEdit = async () => {
    if (!id) return;
    try {
      await update(id, editForm);
      await refetch();
      setShowEditModal(false);
    } catch (err) {
      console.error('Failed to update contact:', err);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await remove(id);
      navigate('/dashboard/contacts');
    } catch (err) {
      console.error('Failed to delete contact:', err);
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

  if (error || !contact) {
    return (
      <div className="max-w-[1600px] mx-auto p-6">
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle size={48} className="text-red-400 mb-4" />
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">Contact Not Found</h2>
          <p className="text-[#666] mb-6">
            {error || 'This contact may have been deleted or you may not have access to it.'}
          </p>
          <button
            onClick={() => navigate('/dashboard/contacts')}
            className="flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white rounded-full font-medium hover:bg-[#333] transition-colors"
          >
            <ArrowLeft size={16} /> Back to Contacts
          </button>
        </div>
      </div>
    );
  }

  const fullName = `${contact.firstName} ${contact.lastName}`;

  return (
    <div className="max-w-[1600px] mx-auto p-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Sidebar */}
        <ContactSidebar
          currentContactId={contact.id}
          contacts={recentContacts}
          loading={contactsLoading}
        />

        {/* Main Profile Area */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <ContactHeader
            contact={contact}
            onEdit={() => setShowEditModal(true)}
            onDelete={() => setShowDeleteConfirm(true)}
          />

          {/* Middle Row: Content & Details */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
            {/* Accordions Column */}
            <ContactAccordions
              contact={contact}
              openSection={openSection}
              onToggleSection={toggleSection}
            />

            {/* Main Content Area */}
            <ContactMainContent
              contact={contact}
              opportunities={opportunities || []}
              onEdit={() => setShowEditModal(true)}
            />
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <EditContactModal
          contact={contact}
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
    </div>
  );
};
