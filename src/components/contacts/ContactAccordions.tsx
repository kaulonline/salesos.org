import React from 'react';
import { ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { ContactTimeline } from '../../../components/dashboard';
import { formatDate, getStatusLabel } from './types';
import type { Contact } from '../../types';

interface ContactAccordionsProps {
  contact: Contact;
  openSection: string | null;
  onToggleSection: (section: string) => void;
}

export const ContactAccordions: React.FC<ContactAccordionsProps> = ({
  contact,
  openSection,
  onToggleSection,
}) => {
  return (
    <div className="lg:col-span-4 space-y-4">
      <Card padding="sm" className="px-6 py-4 border border-black/5">
        <button
          onClick={() => onToggleSection('basic')}
          className="w-full flex justify-between items-center text-[#1A1A1A] font-medium"
        >
          Basic Information
          {openSection === 'basic' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {openSection === 'basic' && (
          <div className="mt-4 space-y-4 animate-in slide-in-from-top-2">
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-[#666]">Contact ID</span>
              <span className="text-sm font-bold text-[#1A1A1A] font-mono text-xs">
                {contact.id.slice(0, 8)}...
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-[#666]">Status</span>
              <span className="text-sm font-bold text-[#1A1A1A]">
                {getStatusLabel(contact.contactStatus)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-[#666]">Mobile</span>
              <span className="text-sm font-bold text-[#1A1A1A]">{contact.mobilePhone || 'Not set'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-[#666]">Last Email</span>
              <span className="text-sm font-bold text-[#1A1A1A]">{formatDate(contact.lastEmailDate)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-[#666]">Created</span>
              <span className="text-sm font-bold text-[#1A1A1A]">{formatDate(contact.createdAt)}</span>
            </div>
          </div>
        )}
      </Card>

      <Card padding="sm" className="px-6 py-4 border border-black/5">
        <button
          onClick={() => onToggleSection('address')}
          className="w-full flex justify-between items-center text-[#1A1A1A] font-medium"
        >
          Address
          {openSection === 'address' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {openSection === 'address' && (
          <div className="mt-4 animate-in slide-in-from-top-2">
            {contact.mailingStreet || contact.mailingCity || contact.mailingState || contact.mailingCountry ? (
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-[#999] mt-0.5" />
                <div className="text-sm text-[#1A1A1A]">
                  {contact.mailingStreet && <div>{contact.mailingStreet}</div>}
                  <div>
                    {[contact.mailingCity, contact.mailingState, contact.mailingPostalCode]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                  {contact.mailingCountry && <div>{contact.mailingCountry}</div>}
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#666]">No address information</p>
            )}
          </div>
        )}
      </Card>

      <Card padding="sm" className="px-6 py-4 border border-black/5">
        <button
          onClick={() => onToggleSection('interests')}
          className="w-full flex justify-between items-center text-[#1A1A1A] font-medium"
        >
          Interests
          {openSection === 'interests' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {openSection === 'interests' && (
          <div className="mt-4 animate-in slide-in-from-top-2">
            {contact.interests && contact.interests.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {contact.interests.map((interest, i) => (
                  <Badge key={i} variant="outline" size="sm">
                    {interest}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#666]">No interests recorded</p>
            )}
          </div>
        )}
      </Card>

      <Card padding="sm" className="px-6 py-4 border border-black/5">
        <button
          onClick={() => onToggleSection('timeline')}
          className="w-full flex justify-between items-center text-[#1A1A1A] font-medium"
        >
          Activity Timeline
          {openSection === 'timeline' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {openSection === 'timeline' && (
          <div className="mt-4 animate-in slide-in-from-top-2">
            <ContactTimeline contactId={contact.id} limit={5} />
          </div>
        )}
      </Card>
    </div>
  );
};
