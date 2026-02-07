import React, { useState, useEffect } from 'react';
import {
  Building2,
  Phone,
  Globe,
  ExternalLink,
  Edit3,
  Trash2,
  MoreVertical,
  Heart,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { EnrichButton } from '../enrichment';
import {
  formatDate,
  formatCurrency,
  getTypeLabel,
  getTypeVariant,
  getStatusLabel,
  getRatingLabel,
  getChurnRiskLabel,
  getChurnRiskColor,
} from './types';
import type { Account } from '../../types';

interface AccountHeaderProps {
  account: Account;
  onEdit: () => void;
  onDelete: () => void;
  onEnriched?: () => void;
}

export const AccountHeader: React.FC<AccountHeaderProps> = ({
  account,
  onEdit,
  onDelete,
  onEnriched,
}) => {
  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = () => setActionMenuOpen(false);
    if (actionMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [actionMenuOpen]);

  const daysSinceActivity = account.lastActivityDate
    ? Math.floor((Date.now() - new Date(account.lastActivityDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

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
              <div className="w-20 h-20 rounded-2xl bg-[#EAD07D] flex items-center justify-center shadow-md">
                <Building2 size={32} className="text-[#1A1A1A]" />
              </div>
              {account.type === 'CUSTOMER' && (
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#93C01F] flex items-center justify-center shadow">
                  <Heart size={12} className="text-white" />
                </div>
              )}
              {account.churnRisk === 'HIGH' && (
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shadow">
                  <AlertTriangle size={12} className="text-white" />
                </div>
              )}
            </div>

            {/* Name, Industry, Badges */}
            <div className="flex-1 min-w-0">
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold text-[#1A1A1A] truncate">{account.name}</h1>
                <p className="text-[#666] truncate">
                  {account.industry || 'No industry'}
                  {account.website && (
                    <>
                      {' · '}
                      <a
                        href={account.website.startsWith('http') ? account.website : `https://${account.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[#EAD07D] transition-colors inline-flex items-center gap-1"
                      >
                        {account.domain || account.website.replace(/^https?:\/\//, '')}
                        <ExternalLink size={12} />
                      </a>
                    </>
                  )}
                </p>
              </div>

              {/* Badges Row */}
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant={getTypeVariant(account.type)} size="sm" dot>
                  {getTypeLabel(account.type)}
                </Badge>
                {account.accountStatus && (
                  <Badge variant={account.accountStatus === 'AT_RISK' ? 'danger' : 'outline'} size="sm">
                    {getStatusLabel(account.accountStatus)}
                  </Badge>
                )}
                {account.rating && (
                  <Badge variant={account.rating === 'HOT' ? 'yellow' : 'default'} size="sm">
                    {getRatingLabel(account.rating)}
                  </Badge>
                )}
                {account.churnRisk && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getChurnRiskColor(account.churnRisk)}`}>
                    {getChurnRiskLabel(account.churnRisk)}
                  </span>
                )}
              </div>

              {/* Info Row */}
              <div className="flex flex-wrap gap-4 mt-3 text-sm">
                {account.numberOfEmployees && (
                  <span className="text-[#666]">
                    <span className="text-[#999]">Employees:</span> {account.numberOfEmployees.toLocaleString()}
                  </span>
                )}
                {account.annualRevenue && (
                  <span className="text-[#666]">
                    <span className="text-[#999]">Revenue:</span> {formatCurrency(account.annualRevenue)}
                  </span>
                )}
                {account.phone && (
                  <a href={`tel:${account.phone}`} className="text-[#666] hover:text-[#1A1A1A] flex items-center gap-1.5">
                    <Phone size={14} />
                    {account.phone}
                  </a>
                )}
              </div>

              {account.description && (
                <p className="text-sm text-[#666] mt-3 line-clamp-2">{account.description}</p>
              )}
            </div>
          </div>

          {/* Right: Actions + Stats */}
          <div className="flex flex-col gap-4 lg:items-end">
            {/* Action Buttons Row */}
            <div className="flex flex-wrap gap-2">
              {account.phone && (
                <a
                  href={`tel:${account.phone}`}
                  className="w-9 h-9 rounded-full bg-[#F8F8F6] flex items-center justify-center text-[#666] hover:bg-[#EAD07D] hover:text-[#1A1A1A] transition-colors"
                  title="Call"
                >
                  <Phone size={16} />
                </a>
              )}
              {account.website && (
                <a
                  href={account.website.startsWith('http') ? account.website : `https://${account.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-[#F8F8F6] flex items-center justify-center text-[#666] hover:bg-[#EAD07D] hover:text-[#1A1A1A] transition-colors"
                  title="Website"
                >
                  <Globe size={16} />
                </a>
              )}
              <EnrichButton
                entityType="account"
                entityId={account.id}
                entityName={account.name}
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
                <div className="text-xl font-bold text-[#1A1A1A]">{account.healthScore || 0}</div>
                <div className="text-[10px] text-[#1A1A1A]/60 uppercase font-semibold">Health</div>
              </div>
              <div className="bg-[#1A1A1A] rounded-xl px-4 py-2 text-center min-w-[90px]">
                <div className="text-lg font-bold text-white">
                  {formatCurrency(account.lifetimeValue)}
                </div>
                <div className="text-[10px] text-white/50 uppercase font-semibold">LTV</div>
              </div>
              <div className="bg-[#F8F8F6] rounded-xl px-4 py-2 text-center min-w-[80px]">
                <div className="text-xl font-bold text-[#1A1A1A]">
                  {daysSinceActivity !== null ? `${daysSinceActivity}d` : '-'}
                </div>
                <div className="text-[10px] text-[#999] uppercase font-semibold">Activity</div>
              </div>
              <div className="bg-[#1A1A1A] rounded-xl px-4 py-2 text-center min-w-[70px]">
                <div className="text-xl font-bold text-white">
                  {(account._count?.opportunities || account.opportunityCount) || 0}
                </div>
                <div className="text-[10px] text-white/60 uppercase font-semibold">Deals</div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
