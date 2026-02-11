import React, { useState, useMemo } from 'react';
import {
  X,
  Users,
  Plus,
  RefreshCw,
  Search,
  Building2,
  Check,
  Minus,
  Globe,
  Factory,
  DollarSign,
} from 'lucide-react';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useTerritory } from '../../hooks';
import { typeLabels, formatCurrency } from './types';
import { useToast } from '../ui/Toast';
import type { Account } from '../../types';

interface TerritoryDetailDrawerProps {
  territoryId: string;
  onClose: () => void;
  allCompanies: Account[];
}

export const TerritoryDetailDrawer: React.FC<TerritoryDetailDrawerProps> = ({
  territoryId,
  onClose,
  allCompanies,
}) => {
  const {
    territory,
    accounts,
    loading,
    autoAssign,
    recalculate,
    assignAccounts,
    removeAccount,
    isAutoAssigning,
    isRecalculating,
    isAssigningAccounts,
    isRemovingAccount,
  } = useTerritory(territoryId);

  const { showToast } = useToast();
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [accountSearch, setAccountSearch] = useState('');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

  const availableAccounts = useMemo(() => {
    const assignedIds = new Set(accounts.map(a => a.id));
    return allCompanies.filter(c => !assignedIds.has(c.id));
  }, [allCompanies, accounts]);

  const filteredAvailableAccounts = useMemo(() => {
    if (!accountSearch) return availableAccounts.slice(0, 50);
    const search = accountSearch.toLowerCase();
    return availableAccounts.filter(a =>
      a.name?.toLowerCase().includes(search) ||
      a.industry?.toLowerCase().includes(search)
    ).slice(0, 50);
  }, [availableAccounts, accountSearch]);

  const handleAssignAccounts = async () => {
    if (selectedAccountIds.length === 0) return;
    try {
      await assignAccounts({ accountIds: selectedAccountIds });
      showToast({ type: 'success', title: 'Accounts Assigned Successfully' });
      setSelectedAccountIds([]);
      setShowAccountPicker(false);
      setAccountSearch('');
    } catch (error) {
      console.error('Failed to assign accounts:', error);
      showToast({ type: 'error', title: 'Failed to Assign Accounts', message: (error as Error).message || 'Please try again' });
    }
  };

  const handleRemoveAccount = async (accountId: string) => {
    try {
      await removeAccount(accountId);
      showToast({ type: 'success', title: 'Account Removed' });
    } catch (error) {
      console.error('Failed to remove account:', error);
      showToast({ type: 'error', title: 'Failed to Remove Account', message: (error as Error).message || 'Please try again' });
    }
  };

  const toggleAccountSelection = (accountId: string) => {
    setSelectedAccountIds(prev =>
      prev.includes(accountId) ? prev.filter(id => id !== accountId) : [...prev, accountId]
    );
  };

  if (loading || !territory) {
    return (
      <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white shadow-2xl z-50">
        <div className="p-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-4 w-32 mb-8" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50">
      <div
        className="fixed inset-y-0 right-0 w-full max-w-xl bg-white shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b border-black/5 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-semibold text-[#1A1A1A]">{territory.name}</h2>
            <span className="text-sm text-[#999]">{typeLabels[territory.type]}</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#666] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Performance Stats */}
          {territory.performanceStats && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#F8F8F6] rounded-xl p-4">
                <p className="text-sm text-[#666]">Pipeline Value</p>
                <p className="text-2xl font-light text-[#1A1A1A]">
                  {formatCurrency(territory.performanceStats.pipelineValue)}
                </p>
              </div>
              <div className="bg-[#F8F8F6] rounded-xl p-4">
                <p className="text-sm text-[#666]">Closed Won</p>
                <p className="text-2xl font-light text-[#93C01F]">
                  {formatCurrency(territory.performanceStats.closedWonValue)}
                </p>
              </div>
              <div className="bg-[#F8F8F6] rounded-xl p-4">
                <p className="text-sm text-[#666]">Win Rate</p>
                <p className="text-2xl font-light text-[#1A1A1A]">
                  {(Number(territory.performanceStats.winRate) || 0).toFixed(0)}%
                </p>
              </div>
              <div className="bg-[#F8F8F6] rounded-xl p-4">
                <p className="text-sm text-[#666]">Avg Deal Size</p>
                <p className="text-2xl font-light text-[#1A1A1A]">
                  {formatCurrency(territory.performanceStats.avgDealSize)}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => autoAssign()}
              disabled={isAutoAssigning}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#1A1A1A] text-white rounded-xl font-medium text-sm hover:bg-[#333] transition-colors disabled:opacity-50"
            >
              <Users size={16} />
              {isAutoAssigning ? 'Assigning...' : 'Auto-Assign'}
            </button>
            <button
              onClick={() => setShowAccountPicker(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#EAD07D] text-[#1A1A1A] rounded-xl font-medium text-sm hover:bg-[#d4bc6c] transition-colors"
            >
              <Plus size={16} />
              Add Accounts
            </button>
            <button
              onClick={() => recalculate()}
              disabled={isRecalculating}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#F8F8F6] text-[#1A1A1A] rounded-xl font-medium text-sm hover:bg-[#F0EBD8] transition-colors disabled:opacity-50"
              title="Recalculate stats"
            >
              <RefreshCw size={16} className={isRecalculating ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Account Picker Modal */}
          {showAccountPicker && (
            <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
                <div className="p-4 border-b border-black/5 flex items-center justify-between">
                  <h3 className="font-semibold text-[#1A1A1A]">Add Accounts to Territory</h3>
                  <button
                    onClick={() => {
                      setShowAccountPicker(false);
                      setSelectedAccountIds([]);
                      setAccountSearch('');
                    }}
                    className="p-1 text-[#666] hover:text-[#1A1A1A]"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-4 border-b border-black/5">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" size={16} />
                    <input
                      type="text"
                      placeholder="Search accounts..."
                      value={accountSearch}
                      onChange={(e) => setAccountSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#F8F8F6] text-sm outline-none focus:ring-1 focus:ring-[#EAD07D]"
                    />
                  </div>
                  {selectedAccountIds.length > 0 && (
                    <p className="text-xs text-[#666] mt-2">{selectedAccountIds.length} account(s) selected</p>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                  {filteredAvailableAccounts.length === 0 ? (
                    <div className="text-center py-8 text-[#666]">
                      <Building2 size={32} className="mx-auto mb-2 text-[#999]" />
                      <p>No available accounts</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredAvailableAccounts.map(account => (
                        <button
                          key={account.id}
                          onClick={() => toggleAccountSelection(account.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${
                            selectedAccountIds.includes(account.id)
                              ? 'bg-[#EAD07D]/20 border border-[#EAD07D]'
                              : 'hover:bg-[#F8F8F6]'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            selectedAccountIds.includes(account.id)
                              ? 'bg-[#EAD07D] border-[#EAD07D]'
                              : 'border-[#ccc]'
                          }`}>
                            {selectedAccountIds.includes(account.id) && <Check size={12} className="text-[#1A1A1A]" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-[#1A1A1A] truncate">{account.name}</p>
                            <p className="text-xs text-[#999]">
                              {account.industry || 'Unknown'} • {account.billingState || 'Unknown'}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-black/5 flex gap-3">
                  <button
                    onClick={() => {
                      setShowAccountPicker(false);
                      setSelectedAccountIds([]);
                      setAccountSearch('');
                    }}
                    className="flex-1 py-2.5 bg-[#F8F8F6] text-[#666] rounded-xl font-medium text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssignAccounts}
                    disabled={selectedAccountIds.length === 0 || isAssigningAccounts}
                    className="flex-1 py-2.5 bg-[#1A1A1A] text-white rounded-xl font-medium text-sm disabled:opacity-50"
                  >
                    {isAssigningAccounts ? 'Adding...' : `Add ${selectedAccountIds.length || ''} Account${selectedAccountIds.length !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Accounts List */}
          <div>
            <h3 className="text-sm font-medium text-[#1A1A1A] mb-3">
              Accounts ({accounts.length})
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {accounts.length === 0 ? (
                <div className="text-center py-8 text-[#666]">
                  <Building2 size={32} className="mx-auto mb-2 text-[#999]" />
                  <p>No accounts assigned</p>
                  <p className="text-sm text-[#999]">Use auto-assign or manually add accounts</p>
                </div>
              ) : (
                accounts.map(account => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#1A1A1A] truncate">{account.name}</p>
                      <p className="text-xs text-[#999]">
                        {account.industry || 'Unknown'} • {account.billingState || 'Unknown'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-medium text-[#1A1A1A]">
                          {formatCurrency(account.openPipeline)}
                        </p>
                        <p className="text-xs text-[#999]">{account.deals} deals</p>
                      </div>
                      <button
                        onClick={() => handleRemoveAccount(account.id)}
                        disabled={isRemovingAccount}
                        className="p-1.5 text-[#999] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove from territory"
                      >
                        <Minus size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Criteria Display */}
          {territory.criteria && Object.keys(territory.criteria).length > 0 && (
            <div className="border-t border-black/5 pt-6">
              <h3 className="text-sm font-medium text-[#1A1A1A] mb-3">Assignment Criteria</h3>
              <div className="space-y-2 text-sm">
                {territory.criteria.states?.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Globe size={14} className="text-[#999] mt-0.5" />
                    <div>
                      <span className="text-[#666]">States: </span>
                      <span className="text-[#1A1A1A]">{territory.criteria.states.join(', ')}</span>
                    </div>
                  </div>
                )}
                {territory.criteria.industries?.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Factory size={14} className="text-[#999] mt-0.5" />
                    <div>
                      <span className="text-[#666]">Industries: </span>
                      <span className="text-[#1A1A1A]">{territory.criteria.industries.join(', ')}</span>
                    </div>
                  </div>
                )}
                {(territory.criteria.minEmployees || territory.criteria.maxEmployees) && (
                  <div className="flex items-start gap-2">
                    <Users size={14} className="text-[#999] mt-0.5" />
                    <div>
                      <span className="text-[#666]">Employees: </span>
                      <span className="text-[#1A1A1A]">
                        {territory.criteria.minEmployees || 0} - {territory.criteria.maxEmployees || '∞'}
                      </span>
                    </div>
                  </div>
                )}
                {(territory.criteria.minRevenue || territory.criteria.maxRevenue) && (
                  <div className="flex items-start gap-2">
                    <DollarSign size={14} className="text-[#999] mt-0.5" />
                    <div>
                      <span className="text-[#666]">Revenue: </span>
                      <span className="text-[#1A1A1A]">
                        {formatCurrency(territory.criteria.minRevenue || 0)} - {territory.criteria.maxRevenue ? formatCurrency(territory.criteria.maxRevenue) : '∞'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
