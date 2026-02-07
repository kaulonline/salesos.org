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
}

export const AccountHeader: React.FC<AccountHeaderProps> = ({
  account,
  onEdit,
  onDelete,
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
      {/* Profile Card */}
      <Card
        variant="ghost"
        padding="lg"
        className="lg:col-span-8 p-8 lg:p-10 relative flex flex-col md:flex-row gap-8 items-start"
      >
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white rounded-full blur-[80px] opacity-60 pointer-events-none -translate-y-1/2 translate-x-1/2"></div>

        <div className="shrink-0 relative">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2rem] bg-gradient-to-br from-[#EAD07D] to-[#E5C973] flex items-center justify-center shadow-lg">
            <Building2 size={48} className="text-[#1A1A1A]" />
          </div>
          {account.type === 'CUSTOMER' && (
            <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-[#93C01F] flex items-center justify-center shadow-lg">
              <Heart size={20} className="text-white" />
            </div>
          )}
          {account.churnRisk === 'HIGH' && (
            <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
              <AlertTriangle size={20} className="text-white" />
            </div>
          )}
        </div>

        <div className="flex-1 relative z-10">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h1 className="text-3xl font-medium text-[#1A1A1A] mb-1">{account.name}</h1>
              <div className="text-[#666] text-lg mb-4">
                {account.industry || 'No industry specified'}
                {account.website && (
                  <>
                    {' '}&bull;{' '}
                    <a
                      href={account.website.startsWith('http') ? account.website : `https://${account.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[#EAD07D] transition-colors inline-flex items-center gap-1"
                    >
                      {account.domain || account.website}
                      <ExternalLink size={14} />
                    </a>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {account.phone && (
                <a
                  href={`tel:${account.phone}`}
                  className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#1A1A1A] hover:bg-[#EAD07D] transition-colors shadow-sm"
                >
                  <Phone size={18} />
                </a>
              )}
              {account.website && (
                <a
                  href={account.website.startsWith('http') ? account.website : `https://${account.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#1A1A1A] hover:bg-[#EAD07D] transition-colors shadow-sm"
                >
                  <Globe size={18} />
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
                      <Edit3 size={16} /> Edit Account
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                        setActionMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 size={16} /> Delete Account
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <Badge variant={getTypeVariant(account.type)} size="md" dot>
              {getTypeLabel(account.type)}
            </Badge>
            {account.accountStatus && (
              <Badge variant={account.accountStatus === 'AT_RISK' ? 'danger' : 'outline'} size="md">
                {getStatusLabel(account.accountStatus)}
              </Badge>
            )}
            {account.rating && (
              <Badge variant={account.rating === 'HOT' ? 'yellow' : 'default'} size="md">
                {getRatingLabel(account.rating)}
              </Badge>
            )}
            {account.churnRisk && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getChurnRiskColor(account.churnRisk)}`}>
                {getChurnRiskLabel(account.churnRisk)}
              </span>
            )}
          </div>

          {account.description && (
            <p className="text-[#666] leading-relaxed text-sm mb-6 max-w-xl line-clamp-3">
              {account.description}
            </p>
          )}

          <div className="border-t border-black/5 pt-6 grid grid-cols-2 gap-4">
            {account.numberOfEmployees && (
              <div>
                <div className="text-xs font-bold text-[#999] uppercase tracking-wide mb-1">Employees</div>
                <div className="text-sm font-bold text-[#1A1A1A]">
                  {account.numberOfEmployees.toLocaleString()}
                </div>
              </div>
            )}
            {account.annualRevenue && (
              <div>
                <div className="text-xs font-bold text-[#999] uppercase tracking-wide mb-1">Annual Revenue</div>
                <div className="text-sm font-bold text-[#1A1A1A]">
                  {formatCurrency(account.annualRevenue)}
                </div>
              </div>
            )}
            {account.phone && (
              <div>
                <div className="text-xs font-bold text-[#999] uppercase tracking-wide mb-1">Phone</div>
                <a
                  href={`tel:${account.phone}`}
                  className="text-sm font-bold text-[#1A1A1A] hover:text-[#EAD07D]"
                >
                  {account.phone}
                </a>
              </div>
            )}
            <div>
              <div className="text-xs font-bold text-[#999] uppercase tracking-wide mb-1">Created</div>
              <div className="text-sm font-bold text-[#1A1A1A]">{formatDate(account.createdAt)}</div>
            </div>
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
              <span className="text-3xl font-bold">{account.healthScore || 0}</span>
              <span className="text-lg font-bold opacity-60">/100</span>
            </div>
            <div className="text-xs text-[#1A1A1A]/60 uppercase font-bold tracking-wider">Health Score</div>
          </div>
        </Card>
        <Card
          variant="dark"
          className="flex flex-col justify-between group hover:scale-[1.02] transition-transform"
        >
          <div>
            <div className="text-3xl font-medium text-white mb-1">
              {formatCurrency(account.lifetimeValue)}
            </div>
            <div className="text-xs text-white/50 uppercase font-bold tracking-wider">Lifetime Value</div>
          </div>
        </Card>
        <Card className="flex flex-col justify-between group hover:scale-[1.02] transition-transform border border-black/5">
          <div>
            <div className="text-3xl font-medium text-[#1A1A1A] mb-1">
              {daysSinceActivity !== null ? daysSinceActivity : '-'}
              {daysSinceActivity !== null && <span className="text-lg text-[#999]">d</span>}
            </div>
            <div className="text-xs text-[#999] uppercase font-bold tracking-wider">Since Activity</div>
          </div>
        </Card>
        <Card className="bg-[#1A1A1A] text-white flex flex-col justify-between group hover:scale-[1.02] transition-transform">
          <div>
            <div className="text-3xl font-bold text-white mb-1">
              {(account._count?.opportunities || account.opportunityCount) || 0}
            </div>
            <div className="text-xs text-white/60 uppercase font-bold tracking-wider">Open Deals</div>
          </div>
        </Card>
      </div>
    </div>
  );
};
