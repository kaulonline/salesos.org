import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Workflow,
  Plus,
  Play,
  Pause,
  Settings,
  Zap,
  Mail,
  Clock,
  GitBranch,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Search,
  Users,
  Target,
  Calendar,
  FileText,
  Bell,
  Sparkles,
  TrendingUp,
  Phone,
  MessageSquare,
  RefreshCw,
  Eye,
  MoreHorizontal,
  Trash2,
  Edit,
  ChevronRight,
  X,
  Building2,
  ListTodo,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { ConfirmationModal } from '../../src/components/ui/ConfirmationModal';
import { useFeatureFlags } from '../../src/hooks';
import { useAuth } from '../../src/context/AuthContext';
import {
  workflowsApi,
  WorkflowStatus,
  WorkflowTriggerType,
  WorkflowActionType,
  WorkflowEntityType,
  ConditionOperator,
  type Workflow as WorkflowType,
  type WorkflowStats,
  type CreateWorkflowRequest,
  type WorkflowAction,
  type WorkflowCondition,
} from '../../src/api/workflows';
import { AIBuilderTrigger } from '../../src/components/AIBuilder/AIBuilderTrigger';
import { AIBuilderModal } from '../../src/components/AIBuilder/AIBuilderModal';
import { AIBuilderEntityType, WorkflowConfig } from '../../src/types/aiBuilder';

interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ElementType;
  popular: boolean;
  trigger: { type: WorkflowTriggerType; entity: WorkflowEntityType; label: string; icon: React.ElementType };
  actions: { type: WorkflowActionType; label: string; icon: React.ElementType; config: Record<string, unknown> }[];
}

const TEMPLATES: AutomationTemplate[] = [
  {
    id: '1',
    name: 'New Lead Welcome Sequence',
    description: 'Send personalized welcome email when a new lead is captured, then follow up after 3 days.',
    category: 'Lead',
    icon: Users,
    popular: true,
    trigger: { type: WorkflowTriggerType.RECORD_CREATED, entity: WorkflowEntityType.LEAD, label: 'Lead Created', icon: Users },
    actions: [
      { type: WorkflowActionType.SEND_EMAIL, label: 'Send Welcome Email', icon: Mail, config: { subject: 'Welcome!', body: 'Thank you for your interest.' } },
      { type: WorkflowActionType.CREATE_TASK, label: 'Follow-up Task', icon: ListTodo, config: { subject: 'Follow up with {{firstName}}', dueInDays: 3 } },
    ],
  },
  {
    id: '2',
    name: 'Opportunity Stage Notification',
    description: 'Notify team when an opportunity moves to Proposal stage.',
    category: 'Opportunity',
    icon: Target,
    popular: true,
    trigger: { type: WorkflowTriggerType.STAGE_CHANGED, entity: WorkflowEntityType.OPPORTUNITY, label: 'Stage Changed', icon: Target },
    actions: [
      { type: WorkflowActionType.SEND_NOTIFICATION, label: 'Notify Team', icon: Bell, config: { title: 'Stage Changed', message: 'Opportunity moved to Proposal', notifyOwner: true } },
    ],
  },
  {
    id: '3',
    name: 'Meeting Follow-up',
    description: 'Auto-create follow-up task after meeting with contact.',
    category: 'Contact',
    icon: Calendar,
    popular: true,
    trigger: { type: WorkflowTriggerType.RECORD_UPDATED, entity: WorkflowEntityType.CONTACT, label: 'Contact Updated', icon: Calendar },
    actions: [
      { type: WorkflowActionType.CREATE_TASK, label: 'Create Follow-up', icon: ListTodo, config: { subject: 'Follow up with {{firstName}}', dueInDays: 1 } },
    ],
  },
  {
    id: '4',
    name: 'At-Risk Opportunity Alert',
    description: "Alert owner when opportunity hasn't been touched in 7 days.",
    category: 'Opportunity',
    icon: TrendingUp,
    popular: false,
    trigger: { type: WorkflowTriggerType.TIME_BASED, entity: WorkflowEntityType.OPPORTUNITY, label: 'Time-Based', icon: Clock },
    actions: [
      { type: WorkflowActionType.SEND_NOTIFICATION, label: 'Alert Owner', icon: Bell, config: { title: 'Stale Opportunity', message: 'No activity in 7 days', notifyOwner: true } },
    ],
  },
  {
    id: '5',
    name: 'Lead Assignment',
    description: 'Automatically assign new leads to sales team using round-robin.',
    category: 'Lead',
    icon: Users,
    popular: false,
    trigger: { type: WorkflowTriggerType.RECORD_CREATED, entity: WorkflowEntityType.LEAD, label: 'Lead Created', icon: Users },
    actions: [
      { type: WorkflowActionType.ASSIGN_OWNER, label: 'Assign Owner', icon: Users, config: { roundRobin: true } },
    ],
  },
  {
    id: '6',
    name: 'Account Activity Log',
    description: 'Log activity when account is updated',
    category: 'Account',
    icon: Building2,
    popular: false,
    trigger: { type: WorkflowTriggerType.RECORD_UPDATED, entity: WorkflowEntityType.ACCOUNT, label: 'Account Updated', icon: Building2 },
    actions: [
      { type: WorkflowActionType.CREATE_ACTIVITY, label: 'Log Activity', icon: FileText, config: { type: 'NOTE', subject: 'Account Updated' } },
    ],
  },
];

const getTriggerIcon = (triggerType: WorkflowTriggerType): React.ElementType => {
  const icons: Record<WorkflowTriggerType, React.ElementType> = {
    [WorkflowTriggerType.RECORD_CREATED]: Plus,
    [WorkflowTriggerType.RECORD_UPDATED]: Edit,
    [WorkflowTriggerType.RECORD_DELETED]: Trash2,
    [WorkflowTriggerType.FIELD_CHANGED]: GitBranch,
    [WorkflowTriggerType.STAGE_CHANGED]: Target,
    [WorkflowTriggerType.TIME_BASED]: Clock,
    [WorkflowTriggerType.WEBHOOK]: Zap,
    [WorkflowTriggerType.MANUAL]: Play,
  };
  return icons[triggerType] || Zap;
};

const getActionIcon = (actionType: WorkflowActionType): React.ElementType => {
  const icons: Record<WorkflowActionType, React.ElementType> = {
    [WorkflowActionType.SEND_EMAIL]: Mail,
    [WorkflowActionType.CREATE_TASK]: ListTodo,
    [WorkflowActionType.UPDATE_FIELD]: Edit,
    [WorkflowActionType.SEND_NOTIFICATION]: Bell,
    [WorkflowActionType.WEBHOOK_CALL]: Zap,
    [WorkflowActionType.ASSIGN_OWNER]: Users,
    [WorkflowActionType.ADD_TAG]: Plus,
    [WorkflowActionType.REMOVE_TAG]: X,
    [WorkflowActionType.CREATE_ACTIVITY]: FileText,
  };
  return icons[actionType] || Zap;
};

const getEntityIcon = (entityType: WorkflowEntityType): React.ElementType => {
  const icons: Record<WorkflowEntityType, React.ElementType> = {
    [WorkflowEntityType.LEAD]: Users,
    [WorkflowEntityType.CONTACT]: Users,
    [WorkflowEntityType.ACCOUNT]: Building2,
    [WorkflowEntityType.OPPORTUNITY]: Target,
    [WorkflowEntityType.TASK]: ListTodo,
  };
  return icons[entityType] || Users;
};

export const Automations: React.FC = () => {
  const { flags: featureFlags, loading: flagsLoading } = useFeatureFlags();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [workflows, setWorkflows] = useState<WorkflowType[]>([]);
  const [stats, setStats] = useState<WorkflowStats | null>(null);
  const [workflowsLoading, setWorkflowsLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AutomationTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'templates'>('templates');
  const [showAIBuilder, setShowAIBuilder] = useState(false);

  // Confirmation modal state
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; workflowId: string | null }>({
    isOpen: false,
    workflowId: null,
  });
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch workflows and stats in parallel but independently
  const fetchWorkflows = useCallback(async () => {
    try {
      setWorkflowsLoading(true);
      const workflowsData = await workflowsApi.getAll();
      setWorkflows(workflowsData.workflows);
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
    } finally {
      setWorkflowsLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const statsData = await workflowsApi.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch workflow stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch in parallel but don't block on each other
    fetchWorkflows();
    fetchStats();
  }, [fetchWorkflows, fetchStats]);

  // Default to enabled, only disable if explicitly set to false
  const automationsEnabled = useMemo(() => {
    if (flagsLoading || !featureFlags) return true; // Show content while loading
    const flag = featureFlags.find((f: { key: string }) => f.key === 'automations_enabled');
    return flag?.enabled ?? true;
  }, [featureFlags, flagsLoading]);

  const filteredTemplates = useMemo(() => {
    return TEMPLATES.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === 'all' || t.category.toLowerCase() === selectedCategory.toLowerCase();
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const filteredWorkflows = useMemo(() => {
    if (!searchQuery) return workflows;
    return workflows.filter(
      (w) =>
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (w.description && w.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [workflows, searchQuery]);

  const categories = ['all', 'Lead', 'Opportunity', 'Contact', 'Account'];

  const handleUseTemplate = async (template: AutomationTemplate) => {
    try {
      const workflowData: CreateWorkflowRequest = {
        name: template.name,
        description: template.description,
        triggerType: template.trigger.type,
        triggerEntity: template.trigger.entity,
        actions: template.actions.map((a) => ({
          type: a.type,
          config: a.config,
        })),
      };

      await workflowsApi.create(workflowData);
      await fetchWorkflows();
      setActiveTab('active');
    } catch (error) {
      console.error('Failed to create workflow:', error);
    }
  };

  const handleToggleWorkflow = async (workflow: WorkflowType) => {
    try {
      if (workflow.status === WorkflowStatus.ACTIVE) {
        await workflowsApi.deactivate(workflow.id);
      } else {
        await workflowsApi.activate(workflow.id);
      }
      await fetchWorkflows();
    } catch (error) {
      console.error('Failed to toggle workflow:', error);
    }
  };

  const handleDeleteWorkflow = (workflowId: string) => {
    setDeleteModal({ isOpen: true, workflowId });
  };

  const confirmDeleteWorkflow = async () => {
    if (!deleteModal.workflowId) return;
    setDeleteLoading(true);
    try {
      await workflowsApi.delete(deleteModal.workflowId);
      await fetchWorkflows();
    } catch (error) {
      console.error('Failed to delete workflow:', error);
    } finally {
      setDeleteLoading(false);
      setDeleteModal({ isOpen: false, workflowId: null });
    }
  };

  const handleAIWorkflowApply = async (config: Record<string, any>) => {
    try {
      const workflowConfig = config as WorkflowConfig;

      // Map trigger type
      const triggerTypeMap: Record<string, WorkflowTriggerType> = {
        RECORD_CREATED: WorkflowTriggerType.RECORD_CREATED,
        RECORD_UPDATED: WorkflowTriggerType.RECORD_UPDATED,
        STAGE_CHANGED: WorkflowTriggerType.STAGE_CHANGED,
        FIELD_CHANGED: WorkflowTriggerType.FIELD_CHANGED,
        DATE_REACHED: WorkflowTriggerType.TIME_BASED,
        MANUAL: WorkflowTriggerType.MANUAL,
      };

      // Map entity type
      const entityTypeMap: Record<string, WorkflowEntityType> = {
        LEAD: WorkflowEntityType.LEAD,
        CONTACT: WorkflowEntityType.CONTACT,
        ACCOUNT: WorkflowEntityType.ACCOUNT,
        OPPORTUNITY: WorkflowEntityType.OPPORTUNITY,
        TASK: WorkflowEntityType.TASK,
      };

      // Map action types
      const actionTypeMap: Record<string, WorkflowActionType> = {
        SEND_EMAIL: WorkflowActionType.SEND_EMAIL,
        CREATE_TASK: WorkflowActionType.CREATE_TASK,
        UPDATE_FIELD: WorkflowActionType.UPDATE_FIELD,
        NOTIFY_USER: WorkflowActionType.SEND_NOTIFICATION,
        ASSIGN_TO: WorkflowActionType.ASSIGN_OWNER,
        ADD_TAG: WorkflowActionType.ADD_TAG,
        WEBHOOK: WorkflowActionType.WEBHOOK_CALL,
      };

      const workflowData: CreateWorkflowRequest = {
        name: workflowConfig.name,
        description: workflowConfig.description,
        triggerType: triggerTypeMap[workflowConfig.trigger.type] || WorkflowTriggerType.RECORD_CREATED,
        triggerEntity: entityTypeMap[workflowConfig.trigger.entity] || WorkflowEntityType.LEAD,
        conditions: workflowConfig.conditions?.map((cond, idx) => ({
          field: cond.field,
          operator: cond.operator as ConditionOperator,
          value: cond.value,
          order: idx,
        })),
        actions: workflowConfig.actions.map((action) => ({
          type: actionTypeMap[action.type] || WorkflowActionType.SEND_NOTIFICATION,
          config: action.config,
        })),
      };

      await workflowsApi.create(workflowData);
      await fetchWorkflows();
      setActiveTab('active');
      setShowAIBuilder(false);
    } catch (error) {
      console.error('Failed to create workflow from AI:', error);
    }
  };

  // Only show full-page loading if we're on the active tab and workflows are loading
  // Templates tab can render immediately since templates are static
  const showFullPageLoading = activeTab === 'active' && workflowsLoading && workflows.length === 0;

  if (!automationsEnabled) {
    return (
      <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 rounded-3xl bg-[#F8F8F6] flex items-center justify-center mb-6">
            <Workflow size={40} className="text-[#999]" />
          </div>
          <h2 className="text-2xl font-bold text-[#1A1A1A] mb-2">Automations Not Enabled</h2>
          <p className="text-[#666] mb-6 text-center max-w-md">
            Automations are not enabled for your organization. Contact your administrator to enable
            this feature.
          </p>
          {user?.role === 'ADMIN' && (
            <button className="px-6 py-3 bg-[#1A1A1A] text-white rounded-full font-medium hover:bg-black transition-colors">
              Enable in Admin Settings
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center text-[#EAD07D]">
              <Workflow size={20} />
            </div>
            <h1 className="text-3xl font-medium text-[#1A1A1A]">Automations</h1>
          </div>
          <p className="text-[#666]">Build workflows that work while you sleep</p>
        </div>
        <div className="flex items-center gap-3">
          <AIBuilderTrigger
            onClick={() => setShowAIBuilder(true)}
            label="Create with AI"
            variant="secondary"
          />
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-black transition-colors shadow-lg"
          >
            <Plus size={18} />
            New Automation
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="p-5 flex items-center justify-between">
          <div>
            {statsLoading ? (
              <Skeleton className="h-9 w-12 mb-1" />
            ) : (
              <div className="text-3xl font-bold text-[#1A1A1A]">{stats?.activeWorkflows || 0}</div>
            )}
            <div className="text-sm text-[#666]">Active Automations</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
            <Zap size={22} className="text-[#1A1A1A]" />
          </div>
        </Card>
        <Card className="p-5 flex items-center justify-between">
          <div>
            {statsLoading ? (
              <Skeleton className="h-9 w-12 mb-1" />
            ) : (
              <div className="text-3xl font-bold text-[#1A1A1A]">{stats?.totalExecutions || 0}</div>
            )}
            <div className="text-sm text-[#666]">Total Runs</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#F8F8F6] flex items-center justify-center">
            <RefreshCw size={22} className="text-[#666]" />
          </div>
        </Card>
        <Card className="p-5 flex items-center justify-between">
          <div>
            {statsLoading ? (
              <Skeleton className="h-9 w-16 mb-1" />
            ) : (
              <div className="text-3xl font-bold text-[#1A1A1A]">
                {stats && stats.totalExecutions > 0
                  ? `${((stats.successfulExecutions / stats.totalExecutions) * 100).toFixed(0)}%`
                  : '--'}
              </div>
            )}
            <div className="text-sm text-[#666]">Success Rate</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
            <CheckCircle2 size={22} className="text-[#EAD07D]" />
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 rounded-xl font-medium transition-all ${
            activeTab === 'active'
              ? 'bg-[#1A1A1A] text-white'
              : 'bg-white border border-gray-200 text-[#666] hover:bg-gray-50'
          }`}
        >
          Active Workflows ({workflows.filter((w) => w.status === WorkflowStatus.ACTIVE).length})
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 rounded-xl font-medium transition-all ${
            activeTab === 'templates'
              ? 'bg-[#1A1A1A] text-white'
              : 'bg-white border border-gray-200 text-[#666] hover:bg-gray-50'
          }`}
        >
          Templates
        </button>
      </div>

      {activeTab === 'active' ? (
        /* Active Workflows */
        <div className="space-y-4">
          {workflowsLoading ? (
            // Inline loading for workflows
            [1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))
          ) : filteredWorkflows.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2 border-gray-200">
              <div className="w-16 h-16 rounded-2xl bg-[#F8F8F6] flex items-center justify-center mx-auto mb-4">
                <Sparkles size={28} className="text-[#EAD07D]" />
              </div>
              <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">No automations yet</h3>
              <p className="text-[#666] mb-6 max-w-md mx-auto">
                Create your first automation to save time and automate repetitive tasks. Start with
                a template or create a custom workflow.
              </p>
              <button
                onClick={() => setActiveTab('templates')}
                className="px-6 py-3 bg-[#1A1A1A] text-white rounded-full font-medium hover:bg-black transition-colors"
              >
                Browse Templates
              </button>
            </Card>
          ) : (
            filteredWorkflows.map((workflow) => {
              const TriggerIcon = getTriggerIcon(workflow.triggerType);
              const EntityIcon = getEntityIcon(workflow.triggerEntity);
              return (
                <Card key={workflow.id} className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          workflow.status === WorkflowStatus.ACTIVE
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        <Workflow size={24} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-[#1A1A1A]">{workflow.name}</h4>
                          <Badge
                            variant={workflow.status === WorkflowStatus.ACTIVE ? 'green' : 'default'}
                            size="sm"
                          >
                            {workflow.status}
                          </Badge>
                        </div>
                        {workflow.description && (
                          <p className="text-sm text-[#666] mt-1">{workflow.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-[#999]">
                          <span className="flex items-center gap-1">
                            <TriggerIcon size={12} />
                            {workflow.triggerType.replace(/_/g, ' ')}
                          </span>
                          <span className="flex items-center gap-1">
                            <EntityIcon size={12} />
                            {workflow.triggerEntity}
                          </span>
                          <span className="flex items-center gap-1">
                            <Zap size={12} />
                            {workflow.actions?.length || 0} action(s)
                          </span>
                          {workflow.executionCount !== undefined && (
                            <span className="flex items-center gap-1">
                              <RefreshCw size={12} />
                              {workflow.executionCount} runs
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleWorkflow(workflow)}
                        className={`p-2 rounded-lg transition-colors ${
                          workflow.status === WorkflowStatus.ACTIVE
                            ? 'bg-green-100 text-green-600 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                        title={
                          workflow.status === WorkflowStatus.ACTIVE
                            ? 'Deactivate'
                            : 'Activate'
                        }
                      >
                        {workflow.status === WorkflowStatus.ACTIVE ? (
                          <Pause size={18} />
                        ) : (
                          <Play size={18} />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteWorkflow(workflow.id)}
                        className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      ) : (
        /* Templates Section */
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-[#1A1A1A]">Start with a Template</h3>
              <p className="text-sm text-[#666]">
                Choose a pre-built automation to get started quickly
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999]"
              />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none transition-all"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium capitalize whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-[#1A1A1A] text-white'
                      : 'bg-white border border-gray-200 text-[#666] hover:bg-gray-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Template Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template, index) => {
              const Icon = template.icon;
              return (
                <div
                  key={template.id}
                  className="p-5 border border-gray-100 rounded-2xl hover:border-[#EAD07D] hover:shadow-lg transition-all cursor-pointer group"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center text-[#EAD07D] group-hover:scale-110 transition-transform">
                        <Icon size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-[#1A1A1A] text-sm">{template.name}</h4>
                          {template.popular && (
                            <Badge variant="yellow" size="sm">
                              Popular
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-[#999]">{template.category}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-[#666] mb-4 line-clamp-2">{template.description}</p>

                  {/* Workflow Visual */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-4">
                    <div className="flex items-center gap-1 px-2 py-1 bg-[#F8F8F6] rounded text-[10px] font-medium text-[#666]">
                      <template.trigger.icon size={10} />
                      {template.trigger.label}
                    </div>
                    {template.actions.slice(0, 2).map((action, i) => (
                      <React.Fragment key={i}>
                        <ArrowRight size={10} className="text-[#ccc]" />
                        <div className="flex items-center gap-1 px-2 py-1 bg-[#F8F8F6] rounded text-[10px] font-medium text-[#666]">
                          <action.icon size={10} />
                          {action.label}
                        </div>
                      </React.Fragment>
                    ))}
                    {template.actions.length > 2 && (
                      <span className="text-[10px] text-[#999]">
                        +{template.actions.length - 2}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleUseTemplate(template)}
                    className="w-full py-2.5 bg-[#F8F8F6] text-[#1A1A1A] rounded-xl text-sm font-medium hover:bg-[#EAD07D] transition-colors"
                  >
                    Use Template
                  </button>
                </div>
              );
            })}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12">
              <Workflow size={48} className="mx-auto mb-4 text-[#999] opacity-40" />
              <p className="text-[#666]">No templates match your search</p>
            </div>
          )}
        </Card>
      )}

      {/* AI Builder Modal */}
      <AIBuilderModal
        isOpen={showAIBuilder}
        onClose={() => setShowAIBuilder(false)}
        entityType={AIBuilderEntityType.WORKFLOW}
        entityLabel="Workflow"
        onApply={handleAIWorkflowApply}
      />

      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, workflowId: null })}
        onConfirm={confirmDeleteWorkflow}
        title="Delete Workflow"
        message="Are you sure you want to delete this workflow? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
};
