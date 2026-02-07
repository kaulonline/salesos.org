import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Phone, Mail, Sparkles, ExternalLink, Flame, MoreVertical, Edit3, Trash2
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import {
  getStatusLabel, getStatusVariant, getRatingLabel, getRatingColor, getSourceLabel, formatCurrency, calculateDaysSinceContact
} from './types';
import type { Lead } from '../../types';

interface LeadHeaderProps {
  lead: Lead;
  onScore: () => void;
  onEdit: () => void;
  onDelete: () => void;
  scoringLead: boolean;
}

export const LeadHeader: React.FC<LeadHeaderProps> = ({
  lead,
  onScore,
  onEdit,
  onDelete,
  scoringLead,
}) => {
  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  const fullName = `${lead.firstName} ${lead.lastName}`;
  const initials = `${lead.firstName?.[0] || ''}${lead.lastName?.[0] || ''}`.toUpperCase();
  const daysSinceContact = calculateDaysSinceContact(lead.lastContactedAt);

  // Close action menu on outside click
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
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2rem] bg-gradient-to-br from-[#EAD07D] to-[#E5C973] flex items-center justify-center shadow-lg text-3xl font-bold text-[#1A1A1A]">
            {initials}
          </div>
          {lead.rating === 'HOT' && (
            <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
              <Flame size={20} className="text-white" />
            </div>
          )}
        </div>

        <div className="flex-1 relative z-10">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h1 className="text-3xl font-medium text-[#1A1A1A] mb-1">{fullName}</h1>
              <div className="text-[#666] text-lg mb-4">
                {lead.title ? `${lead.title} at ` : ''}
                {lead.company || 'No company'}
              </div>
            </div>
            <div className="flex gap-2">
              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#1A1A1A] hover:bg-[#EAD07D] transition-colors shadow-sm"
                >
                  <Mail size={18} />
                </a>
              )}
              {lead.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#1A1A1A] hover:bg-[#EAD07D] transition-colors shadow-sm"
                >
                  <Phone size={18} />
                </a>
              )}
              <button
                onClick={onScore}
                disabled={scoringLead}
                className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#1A1A1A] hover:bg-[#EAD07D] transition-colors shadow-sm disabled:opacity-50"
                title="AI Score"
              >
                <Sparkles size={18} className={scoringLead ? 'animate-pulse' : ''} />
              </button>
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
                      <Edit3 size={16} /> Edit Lead
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                        setActionMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 size={16} /> Delete Lead
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <Badge variant={getStatusVariant(lead.status)} size="md" dot>
              {getStatusLabel(lead.status)}
            </Badge>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRatingColor(lead.rating)}`}>
              {getRatingLabel(lead.rating)}
            </span>
            {lead.leadSource && (
              <Badge variant="outline" size="md">
                {getSourceLabel(lead.leadSource)}
              </Badge>
            )}
          </div>

          {lead.description && (
            <p className="text-[#666] leading-relaxed text-sm mb-6 max-w-xl">{lead.description}</p>
          )}

          <div className="border-t border-black/5 pt-6 space-y-4">
            {lead.email && (
              <div>
                <div className="text-xs font-bold text-[#999] uppercase tracking-wide mb-1">Email</div>
                <a href={`mailto:${lead.email}`} className="text-sm font-bold text-[#1A1A1A] hover:text-[#EAD07D]">
                  {lead.email}
                </a>
              </div>
            )}
            {lead.phone && (
              <div>
                <div className="text-xs font-bold text-[#999] uppercase tracking-wide mb-1">Phone</div>
                <a href={`tel:${lead.phone}`} className="text-sm font-bold text-[#1A1A1A] hover:text-[#EAD07D]">
                  {lead.phone}
                </a>
              </div>
            )}
            {lead.website && (
              <div>
                <div className="text-xs font-bold text-[#999] uppercase tracking-wide mb-1">Website</div>
                <a
                  href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-bold text-[#1A1A1A] hover:text-[#EAD07D] inline-flex items-center gap-1"
                >
                  {lead.website.replace(/^https?:\/\//, '')}
                  <ExternalLink size={12} />
                </a>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Stats Pills */}
      <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card
          variant="yellow"
          className="flex flex-col justify-between group hover:scale-[1.02] transition-transform"
        >
          <div>
            <div className="flex items-baseline text-[#1A1A1A] mb-1">
              <span className="text-3xl font-bold">{lead.leadScore || 0}</span>
              <span className="text-lg font-bold opacity-60">/100</span>
            </div>
            <div className="text-xs text-[#1A1A1A]/60 uppercase font-bold tracking-wider">Lead Score</div>
          </div>
        </Card>
        <Card
          variant="dark"
          className="flex flex-col justify-between group hover:scale-[1.02] transition-transform"
        >
          <div>
            <div className="flex items-baseline text-white mb-1">
              <span className="text-3xl font-bold">{daysSinceContact !== null ? daysSinceContact : '-'}</span>
              {daysSinceContact !== null && <span className="text-xl font-bold text-white/60 ml-0.5">d</span>}
            </div>
            <div className="text-xs text-white/50 uppercase font-bold tracking-wider">Since Contact</div>
          </div>
        </Card>
        <Card className="flex flex-col justify-between group hover:scale-[1.02] transition-transform border border-black/5">
          <div>
            <div className="text-2xl font-medium text-[#1A1A1A] mb-1">
              {formatCurrency(lead.budget)}
            </div>
            <div className="text-xs text-[#999] uppercase font-bold tracking-wider">Budget</div>
          </div>
        </Card>
        <Card className="bg-[#999] text-white flex flex-col justify-between group hover:scale-[1.02] transition-transform">
          <div>
            <div className="text-xl font-medium text-white mb-1 capitalize">
              {lead.buyingIntent?.toLowerCase() || 'Unknown'}
            </div>
            <div className="text-xs text-white/70 uppercase font-bold tracking-wider">Buying Intent</div>
          </div>
        </Card>
      </div>
    </div>
  );
};
