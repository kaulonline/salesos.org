import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  GitBranch,
  Play,
  Pause,
  Edit3,
  Trash2,
  Copy,
  X,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Users,
  User,
  Shuffle,
  Target,
  CheckCircle,
  ArrowRight,
  GripVertical,
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useAssignmentRules } from '../../../src/hooks/useAssignmentRules';
import type { AssignmentRule, CreateAssignmentRuleDto, RuleCondition } from '../../../src/types';
import type { AssignmentRuleEntity, AssignmentMethod, ConditionOperator } from '../../../src/types/assignmentRule';
import { LEAD_ASSIGNABLE_FIELDS, OPPORTUNITY_ASSIGNABLE_FIELDS, CONDITION_OPERATOR_LABELS } from '../../../src/types/assignmentRule';
import { AIBuilderModal, AIBuilderTrigger } from '../../../src/components/AIBuilder';
import { AIBuilderEntityType, AssignmentRuleConfig, SingleAssignmentRule } from '../../../src/types/aiBuilder';

const ENTITY_TYPE_LABELS: Record<AssignmentRuleEntity, string> = {
  LEAD: 'Leads',
  OPPORTUNITY: 'Opportunities',
};

const ASSIGNMENT_TYPE_CONFIG: Record<AssignmentMethod, { label: string; icon: React.ReactNode }> = {
  ROUND_ROBIN: { label: 'Round Robin', icon: <Shuffle size={16} /> },
  LOAD_BALANCED: { label: 'Load Balanced', icon: <Users size={16} /> },
  FIXED: { label: 'Fixed Assignment', icon: <User size={16} /> },
  TERRITORY: { label: 'Territory Based', icon: <Target size={16} /> },
  LEAD_SCORE: { label: 'Lead Score Based', icon: <Target size={16} /> },
};

// Condition fields by entity type
const CONDITION_FIELDS = {
  LEAD: LEAD_ASSIGNABLE_FIELDS.map(f => ({ key: f.field, label: f.label })),
  OPPORTUNITY: OPPORTUNITY_ASSIGNABLE_FIELDS.map(f => ({ key: f.field, label: f.label })),
};

// Condition operators
const CONDITION_OPERATORS = Object.entries(CONDITION_OPERATOR_LABELS).map(([key, label]) => ({
  key,
  label,
}));

interface CreateRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateAssignmentRuleDto) => Promise<void>;
}

const CreateRuleModal: React.FC<CreateRuleModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<CreateAssignmentRuleDto>>({
    name: '',
    entity: 'LEAD',
    method: 'ROUND_ROBIN',
    conditions: [],
    assignees: [],
  });
  const [conditions, setConditions] = useState<Omit<RuleCondition, 'id'>[]>([]);

  const addCondition = () => {
    setConditions([...conditions, { field: '', operator: 'EQUALS' as ConditionOperator, value: '' }]);
  };

  const updateCondition = (index: number, updates: Partial<RuleCondition>) => {
    setConditions(conditions.map((c, i) => i === index ? { ...c, ...updates } : c));
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!formData.name?.trim()) {
      setError('Rule name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onCreate({
        ...formData,
        conditions,
      } as CreateAssignmentRuleDto);
      onClose();
      resetForm();
    } catch (err) {
      setError((err as Error).message || 'Failed to create rule');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      entity: 'LEAD',
      method: 'ROUND_ROBIN',
      conditions: [],
      assignees: [],
    });
    setConditions([]);
    setStep(1);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-8 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-2xl font-medium text-[#1A1A1A]">New Assignment Rule</h2>
            <div className="flex items-center gap-2 mt-2">
              {[1, 2, 3].map(s => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full flex-1 max-w-[60px] ${
                    s <= step ? 'bg-[#1A1A1A]' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-[#666] hover:text-[#1A1A1A]">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm mb-4 flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-medium text-[#1A1A1A]">Basic Information</h3>

              <div>
                <label className="text-xs font-medium text-[#666] mb-1 block">Rule Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Assign California Leads"
                  className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#666] mb-1 block">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe when this rule should trigger..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#666] mb-1 block">Entity Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(ENTITY_TYPE_LABELS) as [AssignmentRuleEntity, string][]).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFormData({ ...formData, entity: value })}
                      className={`px-4 py-3 rounded-xl border text-left transition-colors ${
                        formData.entity === value
                          ? 'border-[#EAD07D] bg-[#EAD07D]/10'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium text-[#1A1A1A]">{label}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-[#1A1A1A]">Conditions</h3>
                <button
                  onClick={addCondition}
                  className="flex items-center gap-1 text-sm text-[#1A1A1A] hover:underline"
                >
                  <Plus size={16} />
                  Add Condition
                </button>
              </div>

              {conditions.length === 0 ? (
                <div className="text-center py-8 bg-[#F8F8F6] rounded-xl">
                  <GitBranch className="w-10 h-10 text-[#888] mx-auto mb-2" />
                  <p className="text-[#666] text-sm">No conditions added</p>
                  <p className="text-[#888] text-xs mt-1">
                    This rule will match all {ENTITY_TYPE_LABELS[formData.entity as AssignmentRuleEntity]}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {conditions.map((condition, index) => (
                    <div key={index} className="flex items-start gap-2 p-4 bg-[#F8F8F6] rounded-xl">
                      <GripVertical size={18} className="text-[#888] mt-2 shrink-0" />
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <select
                          value={condition.field}
                          onChange={(e) => updateCondition(index, { field: e.target.value })}
                          className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm outline-none focus:border-[#EAD07D]"
                        >
                          <option value="">Select field</option>
                          {CONDITION_FIELDS[formData.entity as AssignmentRuleEntity]?.map(field => (
                            <option key={field.key} value={field.key}>{field.label}</option>
                          ))}
                        </select>
                        <select
                          value={condition.operator}
                          onChange={(e) => updateCondition(index, { operator: e.target.value as any })}
                          className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm outline-none focus:border-[#EAD07D]"
                        >
                          {CONDITION_OPERATORS.map(op => (
                            <option key={op.key} value={op.key}>{op.label}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={condition.value as string}
                          onChange={(e) => updateCondition(index, { value: e.target.value })}
                          placeholder="Value"
                          className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm outline-none focus:border-[#EAD07D]"
                        />
                      </div>
                      <button
                        onClick={() => removeCondition(index)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-[#666] hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-medium text-[#1A1A1A]">Assignment Method</h3>

              <div className="grid grid-cols-2 gap-3">
                {(Object.entries(ASSIGNMENT_TYPE_CONFIG) as [AssignmentMethod, typeof ASSIGNMENT_TYPE_CONFIG[AssignmentMethod]][]).map(([value, config]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFormData({ ...formData, method: value })}
                    className={`p-4 rounded-xl border text-left transition-colors ${
                      formData.method === value
                        ? 'border-[#EAD07D] bg-[#EAD07D]/10'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {config.icon}
                      <span className="font-medium text-[#1A1A1A]">{config.label}</span>
                    </div>
                    <p className="text-xs text-[#666]">
                      {value === 'ROUND_ROBIN' && 'Distribute evenly among team members'}
                      {value === 'LOAD_BALANCED' && 'Assign to least busy team member'}
                      {value === 'FIXED' && 'Always assign to a specific person'}
                      {value === 'TERRITORY' && 'Assign based on territory rules'}
                      {value === 'LEAD_SCORE' && 'Assign based on lead score'}
                    </p>
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs font-medium text-[#666] mb-1 block">Assignees</label>
                <p className="text-xs text-[#888] mb-2">
                  Select team members who will receive assignments from this rule
                </p>
                <div className="p-4 bg-[#F8F8F6] rounded-xl text-center text-[#666] text-sm">
                  Team member selection would be populated from your team data
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-8 pt-4 border-t border-gray-100">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-6 py-3 rounded-full border border-gray-200 text-[#666] hover:bg-gray-50 transition-colors font-medium"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-full border border-gray-200 text-[#666] hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex-1 px-4 py-3 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Rule'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default function AssignmentRulesPage() {
  const { rules, stats, loading, error, create, update, remove, reorder } = useAssignmentRules();
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState<AssignmentRuleEntity | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAIBuilder, setShowAIBuilder] = useState(false);

  // Handle AI-generated assignment rules
  const handleAIRuleApply = async (config: Record<string, any>) => {
    try {
      const aiConfig = config as AssignmentRuleConfig;

      // Map AI method to our AssignmentMethod
      const methodMap: Record<string, AssignmentMethod> = {
        round_robin: 'ROUND_ROBIN',
        roundrobin: 'ROUND_ROBIN',
        load_balanced: 'LOAD_BALANCED',
        loadbalanced: 'LOAD_BALANCED',
        fixed: 'FIXED',
        territory: 'TERRITORY',
        lead_score: 'LEAD_SCORE',
        leadscore: 'LEAD_SCORE',
      };

      // Map operator strings to our ConditionOperator
      const operatorMap: Record<string, ConditionOperator> = {
        equals: 'EQUALS',
        '=': 'EQUALS',
        '==': 'EQUALS',
        not_equals: 'NOT_EQUALS',
        '!=': 'NOT_EQUALS',
        contains: 'CONTAINS',
        not_contains: 'NOT_CONTAINS',
        starts_with: 'STARTS_WITH',
        ends_with: 'ENDS_WITH',
        is_empty: 'IS_EMPTY',
        is_not_empty: 'IS_NOT_EMPTY',
        greater_than: 'GREATER_THAN',
        '>': 'GREATER_THAN',
        less_than: 'LESS_THAN',
        '<': 'LESS_THAN',
        greater_or_equal: 'GREATER_OR_EQUAL',
        '>=': 'GREATER_OR_EQUAL',
        less_or_equal: 'LESS_OR_EQUAL',
        '<=': 'LESS_OR_EQUAL',
        in_list: 'IN_LIST',
        not_in_list: 'NOT_IN_LIST',
      };

      // Check if it's multiple rules or a single rule
      if (aiConfig.rules && Array.isArray(aiConfig.rules)) {
        // Multiple rules
        for (const rule of aiConfig.rules) {
          await createRuleFromAIConfig(rule, methodMap, operatorMap);
        }
      } else if (aiConfig.name) {
        // Single rule format
        await createRuleFromAIConfig(aiConfig as any, methodMap, operatorMap);
      }
    } catch (err) {
      console.error('Failed to create assignment rule:', err);
      alert((err as Error).message || 'Failed to create assignment rule');
    }
  };

  const createRuleFromAIConfig = async (
    rule: SingleAssignmentRule | AssignmentRuleConfig,
    methodMap: Record<string, AssignmentMethod>,
    operatorMap: Record<string, ConditionOperator>
  ) => {
    const ruleData: CreateAssignmentRuleDto = {
      name: rule.name || 'AI Generated Rule',
      description: rule.description,
      entity: (rule.entity as AssignmentRuleEntity) || 'LEAD',
      method: methodMap[rule.method?.toLowerCase() || ''] || 'ROUND_ROBIN',
      conditions: (rule.conditions || []).map(c => ({
        field: c.field,
        operator: operatorMap[c.operator?.toLowerCase() || ''] || 'EQUALS',
        value: c.value,
      })),
      assignees: (rule.assignees || []).map(a => ({
        userId: a.userId,
        weight: a.weight,
      })),
    };

    await create(ruleData);
  };

  const filteredRules = useMemo(() => {
    return rules.filter(rule => {
      const matchesSearch =
        rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rule.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesEntity = entityFilter === 'all' || rule.entity === entityFilter;
      return matchesSearch && matchesEntity;
    });
  }, [rules, searchQuery, entityFilter]);

  const handleToggleActive = async (rule: AssignmentRule) => {
    try {
      await update(rule.id, { isActive: !rule.isActive });
    } catch (err) {
      console.error('Failed to toggle rule:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    try {
      await remove(id);
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-medium text-[#1A1A1A]">Assignment Rules</h1>
        <p className="text-[#666] mt-1">Automate lead and deal assignment to your team</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <p className="text-2xl font-semibold text-[#1A1A1A]">{stats.total}</p>
            <p className="text-sm text-[#666]">Total Rules</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-semibold text-green-600">{stats.active}</p>
            <p className="text-sm text-[#666]">Active</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-semibold text-[#666]">{stats.inactive}</p>
            <p className="text-sm text-[#666]">Inactive</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-semibold text-blue-600">{stats.totalAssignments}</p>
            <p className="text-sm text-[#666]">Assignments</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-semibold text-[#EAD07D]">{stats.assignmentsToday}</p>
            <p className="text-sm text-[#666]">Today</p>
          </Card>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888]" size={18} />
            <input
              type="text"
              placeholder="Search rules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white border border-gray-200 focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm"
            />
          </div>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value as AssignmentRuleEntity | 'all')}
            className="px-4 py-2.5 rounded-full bg-white border border-gray-200 focus:border-[#EAD07D] outline-none text-sm"
          >
            <option value="all">All Entities</option>
            {Object.entries(ENTITY_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <AIBuilderTrigger
            onClick={() => setShowAIBuilder(true)}
            label="Create with AI"
            variant="secondary"
          />
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium"
          >
            <Plus size={18} />
            New Rule
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-red-600">{error}</p>
        </Card>
      )}

      {/* Rules List */}
      {!loading && (
        <div className="space-y-3">
          {filteredRules.map((rule, index) => (
            <Card key={rule.id} className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <GripVertical size={18} className="text-[#888] cursor-grab" />
                    <span className="text-sm text-[#888] w-6">{index + 1}</span>
                  </div>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    rule.isActive ? 'bg-green-100' : 'bg-[#F8F8F6]'
                  }`}>
                    <GitBranch size={24} className={rule.isActive ? 'text-green-600' : 'text-[#888]'} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-[#1A1A1A]">{rule.name}</p>
                      <Badge variant={rule.isActive ? 'green' : 'neutral'} size="sm">
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="blue" size="sm">
                        {ENTITY_TYPE_LABELS[rule.entity]}
                      </Badge>
                    </div>
                    <p className="text-sm text-[#666] mt-0.5">
                      {rule.description || 'No description'}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-[#888]">
                      <span className="flex items-center gap-1">
                        {ASSIGNMENT_TYPE_CONFIG[rule.method].icon}
                        {ASSIGNMENT_TYPE_CONFIG[rule.method].label}
                      </span>
                      <span>·</span>
                      <span>{rule.conditions.length} conditions</span>
                      <span>·</span>
                      <span>{rule.assignees.length} assignees</span>
                      {rule.stats && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <CheckCircle size={12} />
                            {rule.stats.totalAssignments} assignments
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleActive(rule)}
                    className={`p-2 rounded-lg transition-colors ${
                      rule.isActive
                        ? 'hover:bg-yellow-50 text-green-600 hover:text-yellow-600'
                        : 'hover:bg-green-50 text-[#666] hover:text-green-600'
                    }`}
                    title={rule.isActive ? 'Pause rule' : 'Activate rule'}
                  >
                    {rule.isActive ? <Pause size={18} /> : <Play size={18} />}
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="p-2 hover:bg-red-50 rounded-lg text-[#666] hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredRules.length === 0 && (
        <Card className="p-12 text-center">
          <GitBranch className="w-12 h-12 text-[#888] mx-auto mb-4" />
          <p className="text-[#666]">No assignment rules found</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 text-sm text-[#1A1A1A] hover:underline"
          >
            Create your first rule
          </button>
        </Card>
      )}

      <CreateRuleModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={create}
      />

      <AIBuilderModal
        isOpen={showAIBuilder}
        onClose={() => setShowAIBuilder(false)}
        entityType={AIBuilderEntityType.ASSIGNMENT_RULE}
        entityLabel="Assignment Rule"
        onApply={handleAIRuleApply}
      />
    </div>
  );
}
