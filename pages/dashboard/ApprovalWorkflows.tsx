import React, { useState } from 'react';
import {
  Search,
  Plus,
  GitBranch,
  X,
  Loader2,
  Trash2,
  Edit2,
  AlertCircle,
  Check,
  Copy,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronRight,
  Users,
  User,
  Shield,
  GripVertical,
  Clock,
  FileText,
  ShoppingCart,
  Percent,
} from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { useToast } from '../../src/components/ui/Toast';
import { useApprovalWorkflows, useApprovalWorkflow } from '../../src/hooks/useApprovalWorkflows';
import type {
  ApprovalWorkflow,
  ApprovalStep,
  CreateApprovalWorkflowDto,
  UpdateApprovalWorkflowDto,
  CreateApprovalStepDto,
  UpdateApprovalStepDto,
  ApprovalEntity,
  ApproverType,
  WorkflowCondition,
  ConditionOperator,
  APPROVAL_ENTITIES,
  APPROVER_TYPES,
} from '../../src/types/approvalWorkflow';

const ENTITY_CONFIG: Record<ApprovalEntity, { icon: React.ElementType; color: string; bg: string }> = {
  QUOTE: { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100' },
  DISCOUNT: { icon: Percent, color: 'text-purple-600', bg: 'bg-purple-100' },
  ORDER: { icon: ShoppingCart, color: 'text-green-600', bg: 'bg-green-100' },
  CONTRACT: { icon: Shield, color: 'text-orange-600', bg: 'bg-orange-100' },
};

const ENTITY_LABELS: Record<ApprovalEntity, string> = {
  QUOTE: 'Quote',
  DISCOUNT: 'Discount',
  ORDER: 'Order',
  CONTRACT: 'Contract',
};

const APPROVER_TYPE_CONFIG: Record<ApproverType, { icon: React.ElementType; label: string }> = {
  USER: { icon: User, label: 'Specific User' },
  ROLE: { icon: Users, label: 'Role' },
  MANAGER: { icon: User, label: 'Manager' },
  SKIP_LEVEL_MANAGER: { icon: Users, label: 'Skip-Level Manager' },
};

export const ApprovalWorkflows: React.FC = () => {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState<ApprovalEntity | ''>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<ApprovalWorkflow | null>(null);
  const [expandedWorkflow, setExpandedWorkflow] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const {
    workflows,
    stats,
    loading,
    create,
    update,
    remove,
    clone,
    toggleActive,
    isCreating,
    isUpdating,
    isDeleting,
  } = useApprovalWorkflows({ entity: entityFilter || undefined });

  const filteredWorkflows = workflows.filter(
    (w) =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateWorkflow = async (data: CreateApprovalWorkflowDto) => {
    try {
      await create(data);
      setShowCreateModal(false);
      showToast({ type: 'success', title: 'Workflow Created' });
    } catch (error) {
      console.error('Failed to create workflow:', error);
      showToast({ type: 'error', title: 'Failed to Create Workflow', message: (error as Error).message || 'Please try again' });
    }
  };

  const handleUpdateWorkflow = async (id: string, data: UpdateApprovalWorkflowDto) => {
    try {
      await update(id, data);
      setEditingWorkflow(null);
      showToast({ type: 'success', title: 'Workflow Updated' });
    } catch (error) {
      console.error('Failed to update workflow:', error);
      showToast({ type: 'error', title: 'Failed to Update Workflow', message: (error as Error).message || 'Please try again' });
    }
  };

  const handleDeleteWorkflow = async (id: string) => {
    try {
      await remove(id);
      setDeleteConfirm(null);
      showToast({ type: 'success', title: 'Workflow Deleted' });
    } catch (error) {
      console.error('Failed to delete workflow:', error);
      showToast({ type: 'error', title: 'Failed to Delete Workflow', message: (error as Error).message || 'Please try again' });
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await toggleActive(id);
    } catch (error) {
      console.error('Failed to toggle workflow:', error);
      showToast({ type: 'error', title: 'Failed to Toggle Workflow', message: (error as Error).message || 'Please try again' });
    }
  };

  const handleCloneWorkflow = async (workflow: ApprovalWorkflow) => {
    try {
      await clone(workflow.id, `${workflow.name} (Copy)`);
      showToast({ type: 'success', title: 'Workflow Cloned' });
    } catch (error) {
      console.error('Failed to clone workflow:', error);
      showToast({ type: 'error', title: 'Failed to Clone Workflow', message: (error as Error).message || 'Please try again' });
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-10 flex flex-col md:flex-row justify-between items-end gap-6">
          <div>
            <Skeleton className="h-10 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-64 rounded-full" />
            <Skeleton className="h-10 w-32 rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <h1 className="text-4xl font-medium text-[#1A1A1A] mb-2">Approval Workflows</h1>
          <p className="text-[#666]">Configure multi-level approval chains for quotes and discounts.</p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search workflows..."
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded-full text-sm outline-none shadow-sm focus:ring-1 focus:ring-[#EAD07D]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value as ApprovalEntity | '')}
            className="px-4 py-2.5 bg-white rounded-full text-sm outline-none shadow-sm focus:ring-1 focus:ring-[#EAD07D]"
          >
            <option value="">All Types</option>
            {Object.entries(ENTITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#1A1A1A] text-white rounded-full text-sm font-bold shadow-lg hover:bg-black transition-all"
          >
            <Plus size={16} /> New Workflow
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
              <GitBranch size={18} className="text-[#1A1A1A]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A1A1A]">{stats.total}</div>
              <div className="text-xs text-[#666]">Total Workflows</div>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <Check size={18} className="text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A1A1A]">{stats.active}</div>
              <div className="text-xs text-[#666]">Active</div>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F8F8F6] flex items-center justify-center">
              <Clock size={18} className="text-[#666]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A1A1A]">{stats.pendingRequests}</div>
              <div className="text-xs text-[#666]">Pending</div>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
              <Clock size={18} className="text-[#EAD07D]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A1A1A]">
                {stats.avgApprovalTime.toFixed(1)}h
              </div>
              <div className="text-xs text-[#666]">Avg Time</div>
            </div>
          </Card>
        </div>
      )}

      {/* Workflows List */}
      {filteredWorkflows.length === 0 ? (
        <Card className="p-12 text-center">
          <GitBranch size={48} className="mx-auto text-[#999] mb-4" />
          <h3 className="text-xl font-medium text-[#1A1A1A] mb-2">
            {searchQuery || entityFilter ? 'No workflows found' : 'No approval workflows yet'}
          </h3>
          <p className="text-[#666] mb-6">
            {searchQuery || entityFilter
              ? 'Try different search terms or filters'
              : 'Create your first workflow to require approvals.'}
          </p>
          {!searchQuery && !entityFilter && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-black transition-colors"
            >
              <Plus size={18} />
              Create Workflow
            </button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredWorkflows.map((workflow) => {
            const entityConfig = ENTITY_CONFIG[workflow.entity];
            const EntityIcon = entityConfig.icon;
            const isExpanded = expandedWorkflow === workflow.id;

            return (
              <Card
                key={workflow.id}
                className={`overflow-hidden transition-all duration-300 ${
                  !workflow.isActive ? 'opacity-60' : ''
                }`}
              >
                {/* Workflow Header */}
                <div className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setExpandedWorkflow(isExpanded ? null : workflow.id)}
                      className="p-1 hover:bg-[#F8F8F6] rounded transition-colors"
                    >
                      {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </button>
                    <div className={`w-12 h-12 rounded-xl ${entityConfig.bg} flex items-center justify-center`}>
                      <EntityIcon size={20} className={entityConfig.color} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-[#1A1A1A]">{workflow.name}</h3>
                        {!workflow.isActive && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-[#666]">
                        <span>{ENTITY_LABELS[workflow.entity]}</span>
                        <span>·</span>
                        <span>{workflow.steps.length} step{workflow.steps.length !== 1 ? 's' : ''}</span>
                        {workflow.conditions.length > 0 && (
                          <>
                            <span>·</span>
                            <span>{workflow.conditions.length} condition{workflow.conditions.length !== 1 ? 's' : ''}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(workflow.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        workflow.isActive ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'
                      }`}
                      title={workflow.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {workflow.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    </button>
                    <button
                      onClick={() => setEditingWorkflow(workflow)}
                      className="p-2 rounded-lg text-[#666] hover:bg-[#F8F8F6] hover:text-[#1A1A1A]"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleCloneWorkflow(workflow)}
                      className="p-2 rounded-lg text-[#666] hover:bg-[#F8F8F6] hover:text-[#1A1A1A]"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(workflow.id)}
                      className="p-2 rounded-lg text-[#666] hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Expanded Steps View */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-5 bg-[#FAFAFA]">
                    {workflow.description && (
                      <p className="text-sm text-[#666] mb-4">{workflow.description}</p>
                    )}

                    {/* Conditions */}
                    {workflow.conditions.length > 0 && (
                      <div className="mb-4">
                        <div className="text-xs font-medium text-[#666] uppercase tracking-wider mb-2">
                          Conditions
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {workflow.conditions.map((condition, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-white border border-[#E5E5E5] rounded-lg text-sm"
                            >
                              {condition.field} {condition.operator.toLowerCase().replace(/_/g, ' ')} {String(condition.value)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Steps */}
                    <div className="text-xs font-medium text-[#666] uppercase tracking-wider mb-3">
                      Approval Steps
                    </div>
                    <div className="space-y-2">
                      {workflow.steps
                        .sort((a, b) => a.order - b.order)
                        .map((step, index) => {
                          const approverConfig = APPROVER_TYPE_CONFIG[step.approverType];
                          const ApproverIcon = approverConfig.icon;

                          return (
                            <div
                              key={step.id}
                              className="flex items-center gap-3 p-3 bg-white border border-[#E5E5E5] rounded-xl"
                            >
                              <div className="w-8 h-8 rounded-full bg-[#EAD07D] flex items-center justify-center text-sm font-bold text-[#1A1A1A]">
                                {index + 1}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-[#1A1A1A]">{step.name}</div>
                                <div className="flex items-center gap-2 text-xs text-[#666]">
                                  <ApproverIcon size={12} />
                                  <span>{approverConfig.label}</span>
                                  {step.approverName && <span>· {step.approverName}</span>}
                                  {step.autoApproveAfterHours && (
                                    <span>· Auto-approve after {step.autoApproveAfterHours}h</span>
                                  )}
                                </div>
                              </div>
                              {step.requireComment && (
                                <span className="px-2 py-0.5 rounded text-xs bg-[#F8F8F6] text-[#666]">
                                  Comment Required
                                </span>
                              )}
                            </div>
                          );
                        })}
                    </div>

                    <button
                      onClick={() => setEditingWorkflow(workflow)}
                      className="mt-4 text-sm text-[#1A1A1A] font-medium hover:underline"
                    >
                      Edit Steps & Conditions
                    </button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingWorkflow) && (
        <ApprovalWorkflowModal
          workflow={editingWorkflow}
          onClose={() => {
            setShowCreateModal(false);
            setEditingWorkflow(null);
          }}
          onSave={
            editingWorkflow
              ? (data) => handleUpdateWorkflow(editingWorkflow.id, data)
              : (data) => handleCreateWorkflow(data as CreateApprovalWorkflowDto)
          }
          saving={isCreating || isUpdating}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#1A1A1A]">Delete Workflow</h3>
                <p className="text-sm text-[#666]">This will remove all approval steps.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-[#666] hover:text-[#1A1A1A] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteWorkflow(deleteConfirm)}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Delete
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

// Approval Workflow Modal Component
interface ApprovalWorkflowModalProps {
  workflow: ApprovalWorkflow | null;
  onClose: () => void;
  onSave: (data: CreateApprovalWorkflowDto | UpdateApprovalWorkflowDto) => Promise<void>;
  saving: boolean;
}

const ApprovalWorkflowModal: React.FC<ApprovalWorkflowModalProps> = ({ workflow, onClose, onSave, saving }) => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState<CreateApprovalWorkflowDto>({
    name: workflow?.name || '',
    description: workflow?.description || '',
    entity: workflow?.entity || 'QUOTE',
    conditions: workflow?.conditions || [],
    isActive: workflow?.isActive ?? true,
    priority: workflow?.priority || 1,
  });
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'general' | 'steps' | 'conditions'>('general');

  // For step management when editing
  const { addStep, updateStep, deleteStep, isAddingStep } = useApprovalWorkflow(workflow?.id);
  const [newStep, setNewStep] = useState<CreateApprovalStepDto | null>(null);
  const [editingStep, setEditingStep] = useState<ApprovalStep | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Workflow name is required');
      return;
    }

    try {
      await onSave(formData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save workflow');
    }
  };

  const handleAddStep = async () => {
    if (!newStep || !workflow) return;
    try {
      await addStep(newStep);
      setNewStep(null);
      showToast({ type: 'success', title: 'Step Added' });
    } catch (err) {
      console.error('Failed to add step:', err);
      showToast({ type: 'error', title: 'Failed to Add Step', message: (err as Error).message || 'Please try again' });
    }
  };

  const handleUpdateStep = async () => {
    if (!editingStep || !workflow) return;
    try {
      await updateStep(editingStep.id, {
        name: editingStep.name,
        approverType: editingStep.approverType,
        requireComment: editingStep.requireComment,
        allowDelegation: editingStep.allowDelegation,
      });
      setEditingStep(null);
      showToast({ type: 'success', title: 'Step Updated' });
    } catch (err) {
      console.error('Failed to update step:', err);
      showToast({ type: 'error', title: 'Failed to Update Step', message: (err as Error).message || 'Please try again' });
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!workflow) return;
    try {
      await deleteStep(stepId);
      showToast({ type: 'success', title: 'Step Deleted' });
    } catch (err) {
      console.error('Failed to delete step:', err);
      showToast({ type: 'error', title: 'Failed to Delete Step', message: (err as Error).message || 'Please try again' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-2xl p-6 my-8 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-6 shrink-0">
          <h2 className="text-xl font-semibold text-[#1A1A1A]">
            {workflow ? 'Edit Workflow' : 'Create Approval Workflow'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-[#F8F8F6] flex items-center justify-center text-[#666]"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm shrink-0">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[#F8F8F6] rounded-xl mb-6 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'general' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#666] hover:text-[#1A1A1A]'
            }`}
          >
            General
          </button>
          {workflow && (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('steps')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'steps' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#666] hover:text-[#1A1A1A]'
                }`}
              >
                Steps ({workflow.steps.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('conditions')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'conditions' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#666] hover:text-[#1A1A1A]'
                }`}
              >
                Conditions
              </button>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'general' && (
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-[#666] mb-1">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                    placeholder="Quote Approval Workflow"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#666] mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm resize-none"
                    rows={2}
                    placeholder="Describe when this workflow applies..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#666] mb-1">Entity Type</label>
                    <select
                      value={formData.entity}
                      onChange={(e) => setFormData({ ...formData, entity: e.target.value as ApprovalEntity })}
                      disabled={!!workflow}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm disabled:opacity-50"
                    >
                      {Object.entries(ENTITY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#666] mb-1">Priority</label>
                    <input
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                      min="1"
                    />
                    <p className="text-xs text-[#999] mt-1">Higher priority workflows are checked first</p>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-[#EAD07D] focus:ring-[#EAD07D]"
                  />
                  <span className="text-sm font-medium text-[#1A1A1A]">Active</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 text-sm font-medium text-[#666] hover:text-[#1A1A1A] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium hover:bg-black transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      {workflow ? 'Update' : 'Create'}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'steps' && workflow && (
            <div className="space-y-4">
              {/* Existing Steps */}
              {workflow.steps
                .sort((a, b) => a.order - b.order)
                .map((step, index) => (
                  <div
                    key={step.id}
                    className="flex items-center gap-3 p-4 bg-[#F8F8F6] rounded-xl"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#EAD07D] flex items-center justify-center text-sm font-bold text-[#1A1A1A]">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-[#1A1A1A]">{step.name}</div>
                      <div className="text-xs text-[#666]">
                        {APPROVER_TYPE_CONFIG[step.approverType].label}
                        {step.requireComment && ' · Comment required'}
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingStep(step)}
                      className="p-2 rounded-lg text-[#666] hover:bg-white hover:text-[#1A1A1A]"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteStep(step.id)}
                      className="p-2 rounded-lg text-[#666] hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}

              {/* Add New Step Form */}
              {newStep ? (
                <div className="p-4 bg-[#F8F8F6] rounded-xl space-y-3">
                  <input
                    type="text"
                    value={newStep.name}
                    onChange={(e) => setNewStep({ ...newStep, name: e.target.value })}
                    placeholder="Step name"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#E5E5E5] text-sm"
                  />
                  <select
                    value={newStep.approverType}
                    onChange={(e) => setNewStep({ ...newStep, approverType: e.target.value as ApproverType })}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#E5E5E5] text-sm"
                  >
                    {Object.entries(APPROVER_TYPE_CONFIG).map(([value, config]) => (
                      <option key={value} value={value}>{config.label}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newStep.requireComment}
                      onChange={(e) => setNewStep({ ...newStep, requireComment: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-sm">Require comment</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddStep}
                      disabled={isAddingStep || !newStep.name}
                      className="px-4 py-2 bg-[#1A1A1A] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      {isAddingStep ? <Loader2 size={14} className="animate-spin" /> : 'Add Step'}
                    </button>
                    <button
                      onClick={() => setNewStep(null)}
                      className="px-4 py-2 text-[#666] hover:text-[#1A1A1A] text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setNewStep({
                    order: workflow.steps.length + 1,
                    name: '',
                    approverType: 'MANAGER',
                    requireComment: false,
                    allowDelegation: true,
                  })}
                  className="w-full p-4 border-2 border-dashed border-[#E5E5E5] rounded-xl text-[#666] hover:border-[#EAD07D] hover:text-[#1A1A1A] transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  Add Approval Step
                </button>
              )}
            </div>
          )}

          {activeTab === 'conditions' && workflow && (
            <div className="space-y-4">
              <p className="text-sm text-[#666]">
                Conditions determine when this workflow applies. If no conditions are set, the workflow applies to all {ENTITY_LABELS[workflow.entity].toLowerCase()}s.
              </p>

              {workflow.conditions.length === 0 ? (
                <div className="text-center py-8 text-[#666]">
                  <p>No conditions configured.</p>
                  <p className="text-sm">This workflow applies to all {ENTITY_LABELS[workflow.entity].toLowerCase()}s.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {workflow.conditions.map((condition, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-3 bg-[#F8F8F6] rounded-lg">
                      <span className="font-medium">{condition.field}</span>
                      <span className="text-[#666]">{condition.operator.toLowerCase().replace(/_/g, ' ')}</span>
                      <span>{String(condition.value)}</span>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-[#999]">
                Condition editing is available in the full workflow editor.
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ApprovalWorkflows;
