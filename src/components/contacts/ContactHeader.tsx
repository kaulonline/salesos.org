import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Phone, Mail, Linkedin, Twitter, MoreVertical, Edit3, Trash2, Star, Shield
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import {
  getRoleLabel, getRoleVariant, getSeniorityLabel, getBuyingPowerLabel, getInfluenceColor, calculateDaysSinceContact
} from './types';
import type { Contact } from '../../types';

interface ContactHeaderProps {
  contact: Contact;
  onEdit: () => void;
  onDelete: () => void;
}

export const ContactHeader: React.FC<ContactHeaderProps> = ({
  contact,
  onEdit,
  onDelete,
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
      {/* Profile Card */}
      <Card
        variant="ghost"
        padding="lg"
        className="lg:col-span-8 p-8 lg:p-10 relative flex flex-col md:flex-row gap-8 items-start"
      >
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white rounded-full blur-[80px] opacity-60 pointer-events-none -translate-y-1/2 translate-x-1/2"></div>

        <div className="shrink-0 relative">
          {contact.avatarUrl ? (
            <img
              src={contact.avatarUrl}
              alt={fullName}
              className="w-32 h-32 md:w-40 md:h-40 rounded-[2rem] object-cover shadow-lg"
            />
          ) : (
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2rem] bg-gradient-to-br from-[#EAD07D] to-[#E5C973] flex items-center justify-center shadow-lg text-3xl font-bold text-[#1A1A1A]">
              {initials}
            </div>
          )}
          {contact.role === 'CHAMPION' && (
            <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
              <Star size={20} className="text-white" />
            </div>
          )}
        </div>

        <div className="flex-1 relative z-10">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h1 className="text-3xl font-medium text-[#1A1A1A] mb-1">{fullName}</h1>
              <div className="text-[#666] text-lg mb-4">
                {contact.title ? `${contact.title}` : ''}
                {contact.title && contact.account?.name && ' at '}
                {contact.account?.name && (
                  <Link
                    to={`/dashboard/companies/${contact.account.id}`}
                    className="hover:text-[#EAD07D] transition-colors"
                  >
                    {contact.account.name}
                  </Link>
                )}
                {!contact.title && !contact.account?.name && 'No title or company'}
              </div>
            </div>
            <div className="flex gap-2">
              {contact.email && !contact.doNotEmail && (
                <a
                  href={`mailto:${contact.email}`}
                  className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#1A1A1A] hover:bg-[#EAD07D] transition-colors shadow-sm"
                >
                  <Mail size={18} />
                </a>
              )}
              {contact.phone && !contact.doNotCall && (
                <a
                  href={`tel:${contact.phone}`}
                  className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#1A1A1A] hover:bg-[#EAD07D] transition-colors shadow-sm"
                >
                  <Phone size={18} />
                </a>
              )}
              {contact.linkedinUrl && (
                <a
                  href={contact.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#1A1A1A] hover:bg-[#0077B5] hover:text-white transition-colors shadow-sm"
                >
                  <Linkedin size={18} />
                </a>
              )}
              {contact.twitterHandle && (
                <a
                  href={`https://twitter.com/${contact.twitterHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#1A1A1A] hover:bg-[#1DA1F2] hover:text-white transition-colors shadow-sm"
                >
                  <Twitter size={18} />
                </a>
              )}
              {/* Action Menu */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActionMenuOpen(!actionMenuOpen);
                  }}
                  className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#1A1A1A] hover:bg-[#EAD07D] transition-colors shadow-sm"
                  title="More Actions"
                >
                  <MoreVertical size={18} />
                </button>
                {actionMenuOpen && (
                  <div className="absolute right-0 top-12 bg-white rounded-xl shadow-lg border border-gray-100 py-2 min-w-[160px] z-50">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                        setActionMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-[#1A1A1A] hover:bg-[#F8F8F6] flex items-center gap-2"
                    >
                      <Edit3 size={16} /> Edit Contact
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                        setActionMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 size={16} /> Delete Contact
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {contact.role && (
              <Badge variant={getRoleVariant(contact.role)} size="md" dot>
                {getRoleLabel(contact.role)}
              </Badge>
            )}
            {contact.seniorityLevel && (
              <Badge variant="outline" size="md">
                {getSeniorityLabel(contact.seniorityLevel)}
              </Badge>
            )}
            {contact.influenceLevel && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getInfluenceColor(contact.influenceLevel)}`}>
                {contact.influenceLevel} Influence
              </span>
            )}
            {(contact.doNotCall || contact.doNotEmail) && (
              <Badge variant="danger" size="md">
                <Shield size={12} className="mr-1" />
                {contact.doNotCall && contact.doNotEmail ? 'Do Not Contact' : contact.doNotCall ? 'Do Not Call' : 'Do Not Email'}
              </Badge>
            )}
          </div>

          {contact.communicationStyle && (
            <p className="text-[#666] leading-relaxed text-sm mb-6 max-w-xl">
              <span className="font-medium">Communication Style:</span> {contact.communicationStyle}
            </p>
          )}

          <div className="border-t border-black/5 pt-6 space-y-4">
            {contact.email && (
              <div>
                <div className="text-xs font-bold text-[#999] uppercase tracking-wide mb-1">Email</div>
                <a href={`mailto:${contact.email}`} className="text-sm font-bold text-[#1A1A1A] hover:text-[#EAD07D]">
                  {contact.email}
                </a>
              </div>
            )}
            {contact.phone && (
              <div>
                <div className="text-xs font-bold text-[#999] uppercase tracking-wide mb-1">Phone</div>
                <a href={`tel:${contact.phone}`} className="text-sm font-bold text-[#1A1A1A] hover:text-[#EAD07D]">
                  {contact.phone}
                </a>
              </div>
            )}
            {contact.department && (
              <div>
                <div className="text-xs font-bold text-[#999] uppercase tracking-wide mb-1">Department</div>
                <div className="text-sm font-bold text-[#1A1A1A]">{contact.department}</div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Stats Pills */}
      <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card variant="yellow" className="flex flex-col justify-between group hover:scale-[1.02] transition-transform">
          <div>
            <div className="flex items-baseline text-[#1A1A1A] mb-1">
              <span className="text-3xl font-bold">{contact.engagementScore || 0}</span>
              <span className="text-lg font-bold opacity-60">/100</span>
            </div>
            <div className="text-xs text-[#1A1A1A]/60 uppercase font-bold tracking-wider">Engagement</div>
          </div>
        </Card>
        <Card variant="dark" className="flex flex-col justify-between group hover:scale-[1.02] transition-transform">
          <div>
            <div className="text-3xl font-medium text-white mb-1">
              {contact.responseRate ? `${Math.round(contact.responseRate * 100)}%` : '-'}
            </div>
            <div className="text-xs text-white/50 uppercase font-bold tracking-wider">Response Rate</div>
          </div>
        </Card>
        <Card className="flex flex-col justify-between group hover:scale-[1.02] transition-transform border border-black/5">
          <div>
            <div className="text-3xl font-medium text-[#1A1A1A] mb-1">
              {daysSinceContact !== null ? daysSinceContact : '-'}
              {daysSinceContact !== null && <span className="text-lg text-[#999]">d</span>}
            </div>
            <div className="text-xs text-[#999] uppercase font-bold tracking-wider">Since Contact</div>
          </div>
        </Card>
        <Card className="bg-[#1A1A1A] text-white flex flex-col justify-between group hover:scale-[1.02] transition-transform">
          <div>
            <div className="text-lg font-bold text-white mb-1 leading-tight">
              {getBuyingPowerLabel(contact.buyingPower)}
            </div>
            <div className="text-xs text-white/60 uppercase font-bold tracking-wider">Buying Power</div>
          </div>
        </Card>
      </div>
    </div>
  );
};
