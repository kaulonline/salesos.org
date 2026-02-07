import React from 'react';
import { ChevronDown, ChevronUp, MapPin, Clock } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { ContactTimeline } from '../../../components/dashboard';
import { formatDate, getStatusLabel } from './types';
import type { Lead } from '../../types';

interface LeadAccordionsProps {
  lead: Lead;
  openSection: string | null;
  onToggleSection: (section: string) => void;
}

export const LeadAccordions: React.FC<LeadAccordionsProps> = ({
  lead,
  openSection,
  onToggleSection,
}) => {
  return (
    <div className="lg:col-span-5 space-y-4">
      {/* Basic Information */}
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
              <span className="text-sm text-[#666]">Lead ID</span>
              <span className="text-sm font-bold text-[#1A1A1A] font-mono text-xs">
                {lead.id.slice(0, 8)}...
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-[#666]">Status</span>
              <span className="text-sm font-bold text-[#1A1A1A]">{getStatusLabel(lead.status)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-[#666]">Industry</span>
              <span className="text-sm font-bold text-[#1A1A1A]">{lead.industry || 'Not set'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-[#666]">Employees</span>
              <span className="text-sm font-bold text-[#1A1A1A]">
                {lead.numberOfEmployees?.toLocaleString() || 'Not set'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-[#666]">Created</span>
              <span className="text-sm font-bold text-[#1A1A1A]">{formatDate(lead.createdAt)}</span>
            </div>
          </div>
        )}
      </Card>

      {/* Address */}
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
            {lead.street || lead.city || lead.state || lead.country ? (
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-[#999] mt-0.5" />
                <div className="text-sm text-[#1A1A1A]">
                  {lead.street && <div>{lead.street}</div>}
                  <div>
                    {[lead.city, lead.state, lead.postalCode].filter(Boolean).join(', ')}
                  </div>
                  {lead.country && <div>{lead.country}</div>}
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#666]">No address information</p>
            )}
          </div>
        )}
      </Card>

      {/* Pain Points & Timeline */}
      <Card padding="sm" className="px-6 py-4 border border-black/5">
        <button
          onClick={() => onToggleSection('pain')}
          className="w-full flex justify-between items-center text-[#1A1A1A] font-medium"
        >
          Pain Points & Timeline
          {openSection === 'pain' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {openSection === 'pain' && (
          <div className="mt-4 space-y-4 animate-in slide-in-from-top-2">
            {lead.painPoints && lead.painPoints.length > 0 ? (
              <div>
                <div className="text-xs font-bold text-[#999] uppercase tracking-wide mb-2">
                  Pain Points
                </div>
                <div className="flex flex-wrap gap-2">
                  {lead.painPoints.map((point, i) => (
                    <Badge key={i} variant="outline" size="sm">
                      {point}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#666]">No pain points recorded</p>
            )}
            {lead.timeline && (
              <div className="pt-4 border-t border-gray-50">
                <div className="text-xs font-bold text-[#999] uppercase tracking-wide mb-2">
                  Timeline
                </div>
                <div className="flex items-center gap-2 text-sm text-[#1A1A1A]">
                  <Clock size={14} className="text-[#999]" />
                  {lead.timeline}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Activity Timeline */}
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
            <ContactTimeline leadId={lead.id} limit={5} />
          </div>
        )}
      </Card>
    </div>
  );
};
