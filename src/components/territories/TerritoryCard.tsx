import React from 'react';
import { Map, Edit2, Trash2, Users, ChevronRight } from 'lucide-react';
import { typeLabels, typeColors, formatCurrency } from './types';
import type { Territory } from '../../types/territory';

interface TerritoryCardProps {
  territory: Territory;
  onEdit: (territory: Territory) => void;
  onDelete: (id: string) => void;
  onViewAccounts: (id: string) => void;
}

export const TerritoryCard: React.FC<TerritoryCardProps> = ({
  territory,
  onEdit,
  onDelete,
  onViewAccounts,
}) => {
  const color = territory.color || typeColors[territory.type] || '#3B82F6';

  return (
    <div className="bg-white rounded-[24px] p-6 shadow-sm border border-black/5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${color}20` }}
          >
            <Map size={20} style={{ color }} />
          </div>
          <div>
            <h3 className="font-semibold text-[#1A1A1A]">{territory.name}</h3>
            <span className="text-xs text-[#999] bg-[#F8F8F6] px-2 py-0.5 rounded-full">
              {typeLabels[territory.type]}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(territory)}
            className="p-2 text-[#999] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] rounded-lg transition-colors"
            title="Edit territory"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => onDelete(territory.id)}
            className="p-2 text-[#999] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete territory"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <p className="text-sm text-[#666] mb-4 line-clamp-2">
        {territory.description || 'No description'}
      </p>

      <div className="flex items-center gap-2 mb-4 text-sm">
        <Users size={14} className="text-[#999]" />
        <span className="text-[#666]">Owner:</span>
        <span className="font-medium text-[#1A1A1A]">
          {territory.owner?.name || 'Unassigned'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-[#F8F8F6] rounded-xl p-3 text-center">
          <p className="text-lg font-semibold text-[#1A1A1A]">{territory.accountCount}</p>
          <p className="text-xs text-[#999]">Accounts</p>
        </div>
        <div className="bg-[#F8F8F6] rounded-xl p-3 text-center">
          <p className="text-lg font-semibold text-[#1A1A1A]">
            {formatCurrency(territory.performanceStats?.pipelineValue || 0)}
          </p>
          <p className="text-xs text-[#999]">Pipeline</p>
        </div>
        <div className="bg-[#F8F8F6] rounded-xl p-3 text-center">
          <p className="text-lg font-semibold text-[#93C01F]">
            {formatCurrency(territory.performanceStats?.closedWonValue || 0)}
          </p>
          <p className="text-xs text-[#999]">Closed</p>
        </div>
      </div>

      {territory.performanceStats?.winRate !== undefined && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-[#666]">Win Rate</span>
            <span className="font-medium text-[#1A1A1A]">
              {(Number(territory.performanceStats.winRate) || 0).toFixed(0)}%
            </span>
          </div>
          <div className="h-2 bg-[#F0EBD8] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#93C01F] rounded-full transition-all"
              style={{ width: `${Number(territory.performanceStats.winRate) || 0}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={() => onViewAccounts(territory.id)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#1A1A1A] text-white rounded-xl font-medium text-sm hover:bg-[#333] transition-colors"
        >
          View Accounts
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};
