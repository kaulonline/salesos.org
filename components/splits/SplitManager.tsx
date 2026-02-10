import React, { useState } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Check,
  X,
  Loader2,
  Sparkles,
  AlertTriangle,
  PieChart,
  TrendingUp,
  Lightbulb,
  BarChart3,
  AlertCircle,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { splitsApi } from '../../src/api/splits';

interface Split {
  id: string;
  userId: string;
  user?: { name?: string; email?: string };
  splitType: string;
  splitPercent: number;
  splitAmount?: number;
  status: string;
  includeInQuota: boolean;
  includeInForecast: boolean;
}

interface SplitManagerProps {
  opportunityId: string;
  opportunityAmount?: number;
  dealAmount?: number; // alias for opportunityAmount
  splits?: Split[];
  onRefresh?: () => void;
  canEdit?: boolean;
}

const SPLIT_TYPE_LABELS: Record<string, string> = {
  REVENUE: 'Revenue',
  OVERLAY: 'Overlay',
  QUOTA: 'Quota Credit',
  REFERRAL: 'Referral',
  MANAGEMENT: 'Management',
};

const SPLIT_TYPE_COLORS: Record<string, string> = {
  REVENUE: 'bg-green-100 text-green-700',
  OVERLAY: 'bg-blue-100 text-blue-700',
  QUOTA: 'bg-purple-100 text-purple-700',
  REFERRAL: 'bg-orange-100 text-orange-700',
  MANAGEMENT: 'bg-gray-100 text-gray-700',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  LOCKED: 'bg-gray-100 text-gray-700',
};

export const SplitManager: React.FC<SplitManagerProps> = ({
  opportunityId,
  opportunityAmount,
  dealAmount,
  splits = [],
  onRefresh,
  canEdit = true,
}) => {
  const resolvedAmount = opportunityAmount ?? dealAmount;
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [aiSuggestions, setAISuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [loadingConflicts, setLoadingConflicts] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [quotaImpact, setQuotaImpact] = useState<any[]>([]);
  const [loadingQuotaImpact, setLoadingQuotaImpact] = useState(false);

  const totalPercent = splits.reduce((sum, s) => sum + s.splitPercent, 0);
  const isOverAllocated = totalPercent > 100;
  const isUnderAllocated = totalPercent < 100 && splits.length > 0;

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleGetAISuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const suggestions = await splitsApi.suggestSplits(opportunityId);
      setAISuggestions(suggestions);
      setShowAISuggestions(true);
    } catch (error) {
      console.error('Failed to get AI suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleDetectConflicts = async () => {
    setLoadingConflicts(true);
    try {
      const result = await splitsApi.detectConflicts(opportunityId);
      setConflicts(result);
    } catch (error) {
      console.error('Failed to detect conflicts:', error);
    } finally {
      setLoadingConflicts(false);
    }
  };

  const handleGetAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const result = await splitsApi.getAnalytics(opportunityId);
      setAnalytics(result);
    } catch (error) {
      console.error('Failed to get analytics:', error);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleGetQuotaImpact = async () => {
    setLoadingQuotaImpact(true);
    try {
      const result = await splitsApi.analyzeQuotaImpact(opportunityId);
      setQuotaImpact(result);
    } catch (error) {
      console.error('Failed to get quota impact:', error);
    } finally {
      setLoadingQuotaImpact(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with AI Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-[#1A1A1A]" />
          <h3 className="font-semibold text-[#1A1A1A]">Revenue Splits</h3>
          <Badge className={totalPercent === 100 ? 'bg-green-100 text-green-700' : isOverAllocated ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}>
            {totalPercent.toFixed(0)}% allocated
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGetAISuggestions}
            disabled={loadingSuggestions}
            className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-[#EAD07D] to-[#D4B85C] text-[#1A1A1A] rounded-lg text-xs font-medium hover:shadow-md transition-all disabled:opacity-50"
          >
            {loadingSuggestions ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            AI Suggest
          </button>
          <button
            onClick={handleDetectConflicts}
            disabled={loadingConflicts}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#F8F8F6] text-[#666] rounded-lg text-xs font-medium hover:bg-[#EAD07D]/20 transition-all disabled:opacity-50"
          >
            {loadingConflicts ? <Loader2 size={12} className="animate-spin" /> : <AlertTriangle size={12} />}
            Check Conflicts
          </button>
          <button
            onClick={handleGetQuotaImpact}
            disabled={loadingQuotaImpact}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#F8F8F6] text-[#666] rounded-lg text-xs font-medium hover:bg-[#EAD07D]/20 transition-all disabled:opacity-50"
          >
            {loadingQuotaImpact ? <Loader2 size={12} className="animate-spin" /> : <BarChart3 size={12} />}
            Quota Impact
          </button>
        </div>
      </div>

      {/* Conflicts Alert */}
      {conflicts.length > 0 && (
        <Card className="p-4 bg-red-50 border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-red-600" />
            <span className="font-semibold text-red-700">Split Conflicts Detected</span>
          </div>
          <div className="space-y-2">
            {conflicts.map((conflict, i) => (
              <div key={i} className="bg-white rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-semibold ${
                    conflict.severity === 'HIGH' ? 'text-red-600' :
                    conflict.severity === 'MEDIUM' ? 'text-orange-600' :
                    'text-yellow-600'
                  }`}>{conflict.severity}</span>
                  <Badge className="bg-red-100 text-red-700 text-xs">{conflict.type}</Badge>
                </div>
                <p className="text-sm text-[#666]">{conflict.description}</p>
                <p className="text-xs text-green-700 mt-1 flex items-center gap-1">
                  <Lightbulb size={10} />
                  {conflict.suggestedResolution}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* AI Suggestions */}
      {showAISuggestions && aiSuggestions.length > 0 && (
        <Card className="p-4 bg-gradient-to-br from-[#EAD07D]/10 to-[#EAD07D]/5 border border-[#EAD07D]/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#EAD07D]" />
              <span className="font-semibold text-[#1A1A1A]">AI Suggested Splits</span>
            </div>
            <button
              onClick={() => setShowAISuggestions(false)}
              className="text-[#666] hover:text-[#1A1A1A]"
            >
              <X size={16} />
            </button>
          </div>
          <div className="space-y-2">
            {aiSuggestions.map((suggestion, i) => (
              <div key={i} className="flex items-center justify-between bg-white rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#EAD07D]/20 flex items-center justify-center text-xs font-bold text-[#1A1A1A]">
                    {suggestion.suggestedPercent}%
                  </div>
                  <div>
                    <div className="font-medium text-[#1A1A1A]">{suggestion.userName}</div>
                    <div className="text-xs text-[#666]">{SPLIT_TYPE_LABELS[suggestion.splitType] || suggestion.splitType}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-[#666] max-w-[200px]">{suggestion.reasoning}</div>
                  {suggestion.historicalBasis && (
                    <div className="text-xs text-[#999] mt-1">{suggestion.historicalBasis}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Quota Impact Analysis */}
      {quotaImpact.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={16} className="text-[#1A1A1A]" />
            <span className="font-semibold text-[#1A1A1A]">Quota Impact Analysis</span>
          </div>
          <div className="space-y-2">
            {quotaImpact.map((impact, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-lg">
                <div>
                  <div className="font-medium text-[#1A1A1A]">{impact.userName}</div>
                  <div className="text-xs text-[#666]">Credit: {formatCurrency(impact.creditAmount)}</div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#666]">{(impact.attainmentBefore * 100).toFixed(0)}%</span>
                    <span className="text-[#999]">→</span>
                    <span className={`text-sm font-medium ${
                      impact.impactAssessment === 'POSITIVE' ? 'text-green-600' :
                      impact.impactAssessment === 'NEGATIVE' ? 'text-red-600' :
                      'text-[#666]'
                    }`}>{(impact.attainmentAfter * 100).toFixed(0)}%</span>
                  </div>
                  <div className={`text-xs ${
                    impact.impactAssessment === 'POSITIVE' ? 'text-green-600' :
                    impact.impactAssessment === 'NEGATIVE' ? 'text-red-600' :
                    'text-[#666]'
                  }`}>
                    {impact.impactAssessment === 'POSITIVE' ? '↑ Positive Impact' :
                     impact.impactAssessment === 'NEGATIVE' ? '↓ Negative Impact' :
                     'Neutral Impact'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Current Splits */}
      <Card className="overflow-hidden">
        {splits.length === 0 ? (
          <div className="p-8 text-center">
            <PieChart size={40} className="mx-auto text-[#999] mb-3" />
            <p className="text-[#666] mb-4">No splits configured for this opportunity</p>
            <button
              onClick={handleGetAISuggestions}
              disabled={loadingSuggestions}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#EAD07D] text-[#1A1A1A] rounded-xl text-sm font-medium"
            >
              {loadingSuggestions ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Get AI Suggestions
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5 bg-[#F8F8F6]">
                <th className="px-4 py-3 text-left font-medium text-[#666]">Team Member</th>
                <th className="px-4 py-3 text-left font-medium text-[#666]">Type</th>
                <th className="px-4 py-3 text-left font-medium text-[#666]">%</th>
                <th className="px-4 py-3 text-left font-medium text-[#666]">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-[#666]">Status</th>
                <th className="px-4 py-3 text-left font-medium text-[#666]">Flags</th>
              </tr>
            </thead>
            <tbody>
              {splits.map((split) => (
                <tr key={split.id} className="border-b border-black/5 hover:bg-[#F8F8F6]">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[#1A1A1A]">
                      {split.user?.name || split.user?.email || 'Unknown'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={SPLIT_TYPE_COLORS[split.splitType] || 'bg-gray-100 text-gray-700'}>
                      {SPLIT_TYPE_LABELS[split.splitType] || split.splitType}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-medium text-[#1A1A1A]">
                    {split.splitPercent.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-[#666]">
                    {formatCurrency(split.splitAmount || (resolvedAmount ? resolvedAmount * split.splitPercent / 100 : undefined))}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={STATUS_COLORS[split.status] || 'bg-gray-100 text-gray-700'}>
                      {split.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {split.includeInQuota && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">Quota</span>
                      )}
                      {split.includeInForecast && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">Forecast</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#F8F8F6]">
                <td className="px-4 py-3 font-semibold text-[#1A1A1A]" colSpan={2}>Total</td>
                <td className={`px-4 py-3 font-bold ${isOverAllocated ? 'text-red-600' : 'text-[#1A1A1A]'}`}>
                  {totalPercent.toFixed(1)}%
                </td>
                <td className="px-4 py-3 font-semibold text-[#1A1A1A]">
                  {formatCurrency(resolvedAmount)}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        )}
      </Card>

      {/* Allocation Warning */}
      {(isOverAllocated || isUnderAllocated) && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl ${
          isOverAllocated ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'
        }`}>
          <AlertCircle size={16} />
          <span className="text-sm">
            {isOverAllocated
              ? `Over-allocated by ${(totalPercent - 100).toFixed(1)}% - splits exceed 100%`
              : `${(100 - totalPercent).toFixed(1)}% of credit is unallocated`}
          </span>
        </div>
      )}
    </div>
  );
};

export default SplitManager;
