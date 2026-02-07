import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Phone, Mail, Linkedin, Twitter, MoreVertical, Edit3, Trash2, Star, Shield
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { EnrichButton } from '../enrichment';
import { AIEmailDraftButton } from '../ai';
import {
  getRoleLabel, getRoleVariant, getSeniorityLabel, getBuyingPowerLabel, getInfluenceColor, calculateDaysSinceContact
} from './types';
import type { Contact } from '../../types';

interface ContactHeaderProps {
  contact: Contact;
  onEdit: () => void;
  onDelete: () => void;
  onEnriched?: () => void;
}

export const ContactHeader: React.FC<ContactHeaderProps> = ({
  contact,
  onEdit,
  onDelete,
  onEnriched,
}) => {
  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  const fullName = `${contact.firstName} ${contact.lastName}`;
  const initials = `${contact.firstName?.[0] || ''}${contact.lastName?.[0] || ''}`.toUpperCase();
  const daysSinceContact = calculateDaysSinceContact(contact.lastContactedAt);

  useEffect(() => {
    const handleClickOutside = () => setActionMenuOpen(false);
    if (actionMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [actionMenuOpen]);

  return (
    <div className="mb-6">
      {/* Main Header Card */}
      <Card
        variant="ghost"
        padding="lg"
        className="p-6 relative"
      >
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Avatar + Basic Info */}
          <div className="flex gap-5 flex-1 min-w-0">
            {/* Avatar */}
            <div className="shrink-0 relative">
              {contact.avatarUrl ? (
                <img
                  src={contact.avatarUrl}
                  alt={fullName}
                  className="w-20 h-20 rounded-2xl object-cover shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-[#EAD07D] flex items-center justify-center shadow-md text-2xl font-bold text-[#1A1A1A]">
                  {initials}
                </div>
              )}
              {contact.role === 'CHAMPION' && (
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow">
                  <Star size={12} className="text-white" />
                </div>
              )}
            </div>

            {/* Name, Title, Badges */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-2xl font-semibold text-[#1A1A1A] truncate">{fullName}</h1>
                  <p className="text-[#666] truncate">
                    {contact.title || 'No title'}
                    {contact.account?.name && (
                      <>
                        {' at '}
                        <Link
                          to={`/dashboard/companies/${contact.account.id}`}
                          className="text-[#1A1A1A] font-medium hover:text-[#EAD07D] transition-colors"
                        >
                          {contact.account.name}
                        </Link>
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Badges Row */}
              <div className="flex flex-wrap gap-2 mt-3">
                {contact.role && (
                  <Badge variant={getRoleVariant(contact.role)} size="sm" dot>
                    {getRoleLabel(contact.role)}
                  </Badge>
                )}
                {contact.seniorityLevel && (
                  <Badge variant="outline" size="sm">
                    {getSeniorityLabel(contact.seniorityLevel)}
                  </Badge>
                )}
                {contact.influenceLevel && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getInfluenceColor(contact.influenceLevel)}`}>
                    {contact.influenceLevel} Influence
                  </span>
                )}
                {(contact.doNotCall || contact.doNotEmail) && (
                  <Badge variant="danger" size="sm">
                    <Shield size={10} className="mr-1" />
                    {contact.doNotCall && contact.doNotEmail ? 'DNC' : contact.doNotCall ? 'No Call' : 'No Email'}
                  </Badge>
                )}
              </div>

              {/* Contact Info Row */}
              <div className="flex flex-wrap gap-4 mt-3 text-sm">
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="text-[#666] hover:text-[#1A1A1A] flex items-center gap-1.5">
                    <Mail size={14} />
                    <span className="truncate max-w-[200px]">{contact.email}</span>
                  </a>
                )}
                {contact.phone && (
                  <a href={`tel:${contact.phone}`} className="text-[#666] hover:text-[#1A1A1A] flex items-center gap-1.5">
                    <Phone size={14} />
                    {contact.phone}
                  </a>
                )}
                {contact.department && (
                  <span className="text-[#666] flex items-center gap-1.5">
                    <span className="text-[#999]">Dept:</span> {contact.department}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions + Stats */}
          <div className="flex flex-col gap-4 lg:items-end">
            {/* Action Buttons Row */}
            <div className="flex flex-wrap gap-2">
              {contact.email && !contact.doNotEmail && (
                <a
                  href={`mailto:${contact.email}`}
                  className="w-9 h-9 rounded-full bg-[#F8F8F6] flex items-center justify-center text-[#666] hover:bg-[#EAD07D] hover:text-[#1A1A1A] transition-colors"
                  title="Send Email"
                >
                  <Mail size={16} />
                </a>
              )}
              {contact.phone && !contact.doNotCall && (
                <a
                  href={`tel:${contact.phone}`}
                  className="w-9 h-9 rounded-full bg-[#F8F8F6] flex items-center justify-center text-[#666] hover:bg-[#EAD07D] hover:text-[#1A1A1A] transition-colors"
                  title="Call"
                >
                  <Phone size={16} />
                </a>
              )}
              {contact.linkedinUrl && (
                <a
                  href={contact.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-[#F8F8F6] flex items-center justify-center text-[#666] hover:bg-[#0077B5] hover:text-white transition-colors"
                  title="LinkedIn"
                >
                  <Linkedin size={16} />
                </a>
              )}
              {contact.email && !contact.doNotEmail && (
                <AIEmailDraftButton
                  recipientName={fullName}
                  recipientCompany={contact.account?.name}
                  recipientTitle={contact.title}
                  purpose="follow_up"
                />
              )}
              <EnrichButton
                entityType="contact"
                entityId={contact.id}
                entityName={fullName}
                onEnriched={onEnriched}
              />
              {/* Action Menu */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActionMenuOpen(!actionMenuOpen);
                  }}
                  className="w-9 h-9 rounded-full bg-[#F8F8F6] flex items-center justify-center text-[#666] hover:bg-[#1A1A1A] hover:text-white transition-colors"
                  title="More Actions"
                >
                  <MoreVertical size={16} />
                </button>
                {actionMenuOpen && (
                  <div className="absolute right-0 top-11 bg-white rounded-xl shadow-lg border border-gray-100 py-2 min-w-[150px] z-50">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                        setActionMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-[#1A1A1A] hover:bg-[#F8F8F6] flex items-center gap-2"
                    >
                      <Edit3 size={14} /> Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                        setActionMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Row */}
            <div className="flex gap-3">
              <div className="bg-[#EAD07D] rounded-xl px-4 py-2 text-center min-w-[80px]">
                <div className="text-xl font-bold text-[#1A1A1A]">{contact.engagementScore || 0}</div>
                <div className="text-[10px] text-[#1A1A1A]/60 uppercase font-semibold">Engagement</div>
              </div>
              <div className="bg-[#1A1A1A] rounded-xl px-4 py-2 text-center min-w-[80px]">
                <div className="text-xl font-bold text-white">
                  {contact.responseRate ? `${Math.round(contact.responseRate * 100)}%` : '-'}
                </div>
                <div className="text-[10px] text-white/50 uppercase font-semibold">Response</div>
              </div>
              <div className="bg-[#F8F8F6] rounded-xl px-4 py-2 text-center min-w-[80px]">
                <div className="text-xl font-bold text-[#1A1A1A]">
                  {daysSinceContact !== null ? `${daysSinceContact}d` : '-'}
                </div>
                <div className="text-[10px] text-[#999] uppercase font-semibold">Last Contact</div>
              </div>
              <div className="bg-[#1A1A1A] rounded-xl px-4 py-2 text-center min-w-[90px]">
                <div className="text-sm font-bold text-white leading-tight">
                  {getBuyingPowerLabel(contact.buyingPower)}
                </div>
                <div className="text-[10px] text-white/50 uppercase font-semibold">Buying Power</div>
              </div>
            </div>
          </div>
        </div>

        {/* Communication Style - if available */}
        {contact.communicationStyle && (
          <div className="mt-4 pt-4 border-t border-black/5">
            <p className="text-sm text-[#666]">
              <span className="font-medium text-[#1A1A1A]">Communication Style:</span> {contact.communicationStyle}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};
