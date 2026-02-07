import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Phone, Mail, Sparkles, ExternalLink, Flame, MoreVertical, Edit3, Trash2, Database
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { EnrichButton } from '../enrichment';
import { LeadScoringBadge, AIEmailDraftButton } from '../ai';
import {
  getStatusLabel, getStatusVariant, getRatingLabel, getRatingColor, getSourceLabel, formatCurrency, calculateDaysSinceContact
} from './types';
import type { Lead } from '../../types';

interface LeadHeaderProps {
  lead: Lead;
  onScore: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onEnriched?: () => void;
  scoringLead: boolean;
}

export const LeadHeader: React.FC<LeadHeaderProps> = ({
  lead,
  onScore,
  onEdit,
  onDelete,
  onEnriched,
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
              <div className="w-20 h-20 rounded-2xl bg-[#EAD07D] flex items-center justify-center shadow-md text-2xl font-bold text-[#1A1A1A]">
                {initials}
              </div>
              {lead.rating === 'HOT' && (
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shadow">
                  <Flame size={12} className="text-white" />
                </div>
              )}
            </div>

            {/* Name, Title, Badges */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-2xl font-semibold text-[#1A1A1A] truncate">{fullName}</h1>
                  <p className="text-[#666] truncate">
                    {lead.title || 'No title'}
                    {lead.company && ` at ${lead.company}`}
                  </p>
                </div>
              </div>

              {/* Badges Row */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Badge variant={getStatusVariant(lead.status)} size="sm" dot>
                  {getStatusLabel(lead.status)}
                </Badge>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRatingColor(lead.rating)}`}>
                  {getRatingLabel(lead.rating)}
                </span>
                {lead.leadSource && (
                  <Badge variant="outline" size="sm">
                    {getSourceLabel(lead.leadSource)}
                  </Badge>
                )}
                <LeadScoringBadge
                  lead={{
                    id: lead.id,
                    name: fullName,
                    email: lead.email,
                    company: lead.company,
                    title: lead.title,
                    source: lead.leadSource,
                    industry: lead.industry,
                  }}
                  existingScore={lead.leadScore}
                />
              </div>

              {/* Contact Info Row */}
              <div className="flex flex-wrap gap-4 mt-3 text-sm">
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="text-[#666] hover:text-[#1A1A1A] flex items-center gap-1.5">
                    <Mail size={14} />
                    <span className="truncate max-w-[200px]">{lead.email}</span>
                  </a>
                )}
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} className="text-[#666] hover:text-[#1A1A1A] flex items-center gap-1.5">
                    <Phone size={14} />
                    {lead.phone}
                  </a>
                )}
                {lead.website && (
                  <a
                    href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#666] hover:text-[#1A1A1A] flex items-center gap-1.5"
                  >
                    <ExternalLink size={14} />
                    {lead.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </div>

              {lead.description && (
                <p className="text-sm text-[#666] mt-3 line-clamp-2">{lead.description}</p>
              )}
            </div>
          </div>

          {/* Right: Actions + Stats */}
          <div className="flex flex-col gap-4 lg:items-end">
            {/* Action Buttons Row */}
            <div className="flex flex-wrap gap-2">
              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  className="w-9 h-9 rounded-full bg-[#F8F8F6] flex items-center justify-center text-[#666] hover:bg-[#EAD07D] hover:text-[#1A1A1A] transition-colors"
                  title="Send Email"
                >
                  <Mail size={16} />
                </a>
              )}
              {lead.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  className="w-9 h-9 rounded-full bg-[#F8F8F6] flex items-center justify-center text-[#666] hover:bg-[#EAD07D] hover:text-[#1A1A1A] transition-colors"
                  title="Call"
                >
                  <Phone size={16} />
                </a>
              )}
              <button
                onClick={onScore}
                disabled={scoringLead}
                className="w-9 h-9 rounded-full bg-[#F8F8F6] flex items-center justify-center text-[#666] hover:bg-[#EAD07D] hover:text-[#1A1A1A] transition-colors disabled:opacity-50"
                title="AI Score"
              >
                <Sparkles size={16} className={scoringLead ? 'animate-pulse' : ''} />
              </button>
              {lead.email && (
                <AIEmailDraftButton
                  recipientName={fullName}
                  recipientCompany={lead.company}
                  recipientTitle={lead.title}
                  purpose="cold_outreach"
                  painPoints={lead.painPoints}
                />
              )}
              <EnrichButton
                entityType="lead"
                entityId={lead.id}
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
                <div className="text-xl font-bold text-[#1A1A1A]">{lead.leadScore || 0}</div>
                <div className="text-[10px] text-[#1A1A1A]/60 uppercase font-semibold">Score</div>
              </div>
              <div className="bg-[#1A1A1A] rounded-xl px-4 py-2 text-center min-w-[80px]">
                <div className="text-xl font-bold text-white">
                  {daysSinceContact !== null ? `${daysSinceContact}d` : '-'}
                </div>
                <div className="text-[10px] text-white/50 uppercase font-semibold">Last Contact</div>
              </div>
              <div className="bg-[#F8F8F6] rounded-xl px-4 py-2 text-center min-w-[90px]">
                <div className="text-lg font-bold text-[#1A1A1A]">
                  {formatCurrency(lead.budget)}
                </div>
                <div className="text-[10px] text-[#999] uppercase font-semibold">Budget</div>
              </div>
              <div className="bg-[#666] rounded-xl px-4 py-2 text-center min-w-[80px]">
                <div className="text-sm font-bold text-white capitalize leading-tight">
                  {lead.buyingIntent?.toLowerCase() || 'Unknown'}
                </div>
                <div className="text-[10px] text-white/60 uppercase font-semibold">Intent</div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
