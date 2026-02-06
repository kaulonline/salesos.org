import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Play,
  CheckCircle,
  Clock,
  Users,
  Target,
  ChevronRight,
  ChevronDown,
  Edit2,
  Copy,
  Trash2,
  X,
  Zap,
  Phone,
  Mail,
  Video,
  FileText,
  Pause,
  AlertCircle,
  Sparkles,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { usePlaybooks, usePlaybook, usePlaybookExecutions } from '../../src/hooks';
import { useAIBuilder } from '../../src/hooks/useAIBuilder';
import { AIBuilderEntityType, isPlaybookConfig } from '../../src/types/aiBuilder';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../src/components/ui/Toast';
import type {
  Playbook,
  PlaybookStep,
  PlaybookExecution,
  PlaybookTrigger,
  PlaybookStepType,
  CreatePlaybookDto,
  CreatePlaybookStepDto,
} from '../../src/types/playbook';

const stepIcons: Record<PlaybookStepType, React.ReactNode> = {
  TASK: <CheckCircle size={16} />,
  EMAIL: <Mail size={16} />,
  CALL: <Phone size={16} />,
  MEETING: <Video size={16} />,
  WAIT: <Clock size={16} />,
  CONDITION: <AlertCircle size={16} />,
};

const stepColors: Record<PlaybookStepType, string> = {
  TASK: 'bg-[#EAD07D]/20 text-[#1A1A1A]',
  EMAIL: 'bg-blue-100 text-blue-600',
  CALL: 'bg-[#93C01F]/20 text-[#93C01F]',
  MEETING: 'bg-purple-100 text-purple-600',
  WAIT: 'bg-orange-100 text-orange-600',
  CONDITION: 'bg-pink-100 text-pink-600',
};

const triggerLabels: Record<PlaybookTrigger, string> = {
  MANUAL: 'Manual',
  DEAL_CREATED: 'Deal Created',
  DEAL_STAGE_CHANGE: 'Stage Change',
  LEAD_QUALIFIED: 'Lead Qualified',
  ACCOUNT_CREATED: 'Account Created',
};

export const Playbooks: React.FC = () => {
  const { playbooks, stats, loading, create, remove, duplicate, isCreating, isDeleting, isDuplicating } = usePlaybooks();
  const { executions } = usePlaybookExecutions();
  const { showToast } = useToast();
  const [expandedPlaybook, setExpandedPlaybook] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // AI Builder hook
  const { generate, isGenerating } = useAIBuilder(AIBuilderEntityType.PLAYBOOK);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);
  const [showAiSection, setShowAiSection] = useState(true);

  // Form state
  const [formData, setFormData] = useState<CreatePlaybookDto>({
    name: '',
    description: '',
    trigger: 'MANUAL',
    isActive: true,
    steps: [],
  });
  const [newStep, setNewStep] = useState<CreatePlaybookStepDto>({
    type: 'TASK',
    title: '',
    description: '',
    daysOffset: 0,
    isRequired: true,
  });

  const filteredPlaybooks = playbooks.filter(p => {
    if (filter === 'active') return p.isActive;
    if (filter === 'inactive') return !p.isActive;
    return true;
  });

  const totalExecutions = stats?.totalExecutions || 0;
  const completedExecutions = stats?.completedExecutions || 0;
  const successRate = totalExecutions > 0 ? Math.round((completedExecutions / totalExecutions) * 100) : 0;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await create(formData);
      setShowCreateModal(false);
      setFormData({ name: '', description: '', trigger: 'MANUAL', isActive: true, steps: [] });
      setAiPrompt('');
      setAiError(null);
      showToast({ type: 'success', title: 'Playbook Created', message: `"${formData.name}" has been created successfully` });
    } catch (error) {
      showToast({ type: 'error', title: 'Creation Failed', message: (error as Error).message || 'Could not create playbook' });
    }
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim() || isGenerating) return;
    setAiError(null);

    try {
      const response = await generate(aiPrompt.trim());
      if (response.success && response.rawConfig && isPlaybookConfig(response.rawConfig)) {
        const config = response.rawConfig;
        setFormData({
          name: config.name || '',
          description: config.description || '',
          trigger: config.trigger || 'MANUAL',
          targetStage: config.targetStage || undefined,
          targetDealType: config.targetDealType || undefined,
          isActive: config.isActive !== false,
          steps: (config.steps || []).map((step: any) => ({
            type: step.type || 'TASK',
            title: step.title || '',
            description: step.description || '',
            daysOffset: step.daysOffset || 0,
            isRequired: step.isRequired !== false,
            config: step.config || undefined,
          })),
        });
        setShowAiSection(false); // Collapse AI section after generation
      } else {
        setAiError(response.error || 'Failed to generate playbook. Please try rephrasing your request.');
      }
    } catch (err: any) {
      setAiError(err.message || 'Something went wrong. Please try again.');
    }
  };

  const aiExamples = [
    'Enterprise discovery process using MEDDIC',
    'Lead qualification playbook using BANT',
    'Deal closing sequence for negotiation stage',
    'Customer onboarding and handoff process',
  ];

  const handleDelete = async (id: string) => {
    try {
      await remove(id);
      setShowDeleteConfirm(null);
      showToast({ type: 'success', title: 'Playbook Deleted', message: 'The playbook has been removed' });
    } catch (error) {
      showToast({ type: 'error', title: 'Delete Failed', message: (error as Error).message || 'Could not delete playbook' });
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await duplicate(id);
      showToast({ type: 'success', title: 'Playbook Duplicated', message: 'A copy of the playbook has been created' });
    } catch (error) {
      showToast({ type: 'error', title: 'Duplicate Failed', message: (error as Error).message || 'Could not duplicate playbook' });
    }
  };

  const addStepToForm = () => {
    if (newStep.title) {
      setFormData({
        ...formData,
        steps: [...(formData.steps || []), { ...newStep }],
      });
      setNewStep({ type: 'TASK', title: '', description: '', daysOffset: 0, isRequired: true });
    }
  };

  const removeStepFromForm = (index: number) => {
    setFormData({
      ...formData,
      steps: (formData.steps || []).filter((_, i) => i !== index),
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 lg:p-8">
        <div className="max-w-[1600px] mx-auto space-y-6">
          <Skeleton className="h-12 w-64 rounded-2xl" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
          <Skeleton className="h-[400px] rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#EAD07D]/20 flex items-center justify-center">
              <BookOpen size={28} className="text-[#1A1A1A]" />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-light text-[#1A1A1A]">Sales Playbooks</h1>
              <p className="text-[#666] mt-1">Guided selling workflows for consistent success</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium text-sm"
          >
            <Plus size={16} />
            Create Playbook
          </button>
        </div>

        {/* Empty State */}
        {playbooks.length === 0 ? (
          <div className="bg-white rounded-[32px] p-12 shadow-sm border border-black/5">
            <div className="max-w-lg mx-auto text-center">
              <div className="w-20 h-20 rounded-2xl bg-[#F0EBD8] flex items-center justify-center mx-auto mb-6">
                <BookOpen size={40} className="text-[#999]" />
              </div>
              <h2 className="text-2xl font-light text-[#1A1A1A] mb-3">No Playbooks Yet</h2>
              <p className="text-[#666] mb-8">
                Create guided selling workflows to standardize your sales process and improve win rates.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-left">
                <div className="bg-[#F8F8F6] rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail size={16} className="text-blue-600" />
                    <h3 className="font-medium text-[#1A1A1A]">Email Sequences</h3>
                  </div>
                  <p className="text-sm text-[#666]">Automated email follow-ups at key stages</p>
                </div>
                <div className="bg-[#F8F8F6] rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Phone size={16} className="text-[#93C01F]" />
                    <h3 className="font-medium text-[#1A1A1A]">Call Scripts</h3>
                  </div>
                  <p className="text-sm text-[#666]">Guided call frameworks for consistency</p>
                </div>
                <div className="bg-[#F8F8F6] rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Video size={16} className="text-purple-600" />
                    <h3 className="font-medium text-[#1A1A1A]">Meeting Templates</h3>
                  </div>
                  <p className="text-sm text-[#666]">Structured agendas for demos and reviews</p>
                </div>
                <div className="bg-[#F8F8F6] rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle size={16} className="text-[#EAD07D]" />
                    <h3 className="font-medium text-[#1A1A1A]">Task Checklists</h3>
                  </div>
                  <p className="text-sm text-[#666]">Required steps before stage progression</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-[#1A1A1A] text-white rounded-full font-medium hover:bg-[#333] transition-colors"
              >
                Create Your First Playbook
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                    <BookOpen size={18} className="text-[#1A1A1A]" />
                  </div>
                  <span className="text-sm text-[#666]">Total Playbooks</span>
                </div>
                <p className="text-3xl font-light text-[#1A1A1A]">{stats?.totalPlaybooks || playbooks.length}</p>
              </div>
              <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#93C01F]/20 flex items-center justify-center">
                    <CheckCircle size={18} className="text-[#93C01F]" />
                  </div>
                  <span className="text-sm text-[#666]">Active</span>
                </div>
                <p className="text-3xl font-light text-[#1A1A1A]">{stats?.activePlaybooks || playbooks.filter(p => p.isActive).length}</p>
              </div>
              <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Play size={18} className="text-blue-600" />
                  </div>
                  <span className="text-sm text-[#666]">Total Executions</span>
                </div>
                <p className="text-3xl font-light text-[#1A1A1A]">{totalExecutions}</p>
              </div>
              <div className="bg-[#1A1A1A] rounded-[24px] p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                    <Target size={18} className="text-[#EAD07D]" />
                  </div>
                  <span className="text-sm text-white/60">Completion Rate</span>
                </div>
                <p className="text-3xl font-light text-white">{successRate}%</p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 mb-6">
              {[
                { id: 'all', label: 'All Playbooks' },
                { id: 'active', label: 'Active' },
                { id: 'inactive', label: 'Inactive' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id as any)}
                  className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${
                    filter === tab.id
                      ? 'bg-[#1A1A1A] text-white'
                      : 'bg-white border border-black/10 text-[#666] hover:bg-[#F8F8F6]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Playbooks List */}
            <div className="space-y-4">
              {filteredPlaybooks.map(playbook => {
                const isExpanded = expandedPlaybook === playbook.id;
                const executionCount = playbook._count?.executions || 0;

                return (
                  <div
                    key={playbook.id}
                    className="bg-white rounded-[24px] shadow-sm border border-black/5 overflow-hidden"
                  >
                    {/* Playbook Header */}
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            playbook.isActive ? 'bg-[#93C01F]/20' : 'bg-[#F8F8F6]'
                          }`}>
                            <BookOpen size={20} className={playbook.isActive ? 'text-[#93C01F]' : 'text-[#999]'} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-semibold text-[#1A1A1A]">{playbook.name}</h3>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                playbook.isActive ? 'bg-[#93C01F]/20 text-[#93C01F]' : 'bg-[#F8F8F6] text-[#999]'
                              }`}>
                                {playbook.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <p className="text-sm text-[#666] mb-2">{playbook.description || 'No description'}</p>
                            <div className="flex items-center gap-4 text-xs text-[#999]">
                              <span className="flex items-center gap-1">
                                <Zap size={12} />
                                {triggerLabels[playbook.trigger]}
                              </span>
                              {playbook.targetStage && (
                                <span className="flex items-center gap-1">
                                  <Target size={12} />
                                  {playbook.targetStage.replace(/_/g, ' ')}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <CheckCircle size={12} />
                                {playbook.steps.length} steps
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-2xl font-light text-[#1A1A1A]">{executionCount}</p>
                            <p className="text-xs text-[#999]">executions</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDuplicate(playbook.id)}
                              disabled={isDuplicating}
                              className="p-2 text-[#999] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] rounded-lg transition-colors"
                              title="Duplicate"
                            >
                              <Copy size={16} />
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(playbook.id)}
                              className="p-2 text-[#999] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                            <button
                              onClick={() => setExpandedPlaybook(isExpanded ? null : playbook.id)}
                              className="p-2 text-[#999] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] rounded-lg transition-colors"
                            >
                              <ChevronDown size={18} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Steps */}
                    {isExpanded && (
                      <div className="px-6 pb-6 border-t border-black/5">
                        <div className="pt-4">
                          <h4 className="text-sm font-semibold text-[#1A1A1A] mb-4">Playbook Steps</h4>
                          {playbook.steps.length === 0 ? (
                            <div className="text-center py-8 text-[#666]">
                              <CheckCircle size={32} className="mx-auto mb-2 text-[#999]" />
                              <p>No steps defined</p>
                              <p className="text-sm text-[#999]">Add steps to this playbook</p>
                            </div>
                          ) : (
                            <div className="relative">
                              {/* Vertical line */}
                              <div className="absolute left-[23px] top-8 bottom-8 w-0.5 bg-[#F0EBD8]" />

                              <div className="space-y-4">
                                {playbook.steps.map((step) => (
                                  <div key={step.id} className="flex items-start gap-4 relative">
                                    {/* Step icon */}
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 z-10 ${stepColors[step.type]}`}>
                                      {stepIcons[step.type]}
                                    </div>

                                    {/* Step content */}
                                    <div className="flex-1 bg-[#F8F8F6] rounded-xl p-4">
                                      <div className="flex items-start justify-between">
                                        <div>
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs text-[#999]">Step {step.order}</span>
                                            {step.isRequired && (
                                              <span className="px-1.5 py-0.5 bg-[#EAD07D]/20 text-[#1A1A1A] text-[10px] font-semibold rounded">
                                                Required
                                              </span>
                                            )}
                                          </div>
                                          <h5 className="font-medium text-[#1A1A1A]">{step.title}</h5>
                                          {step.description && (
                                            <p className="text-sm text-[#666] mt-1">{step.description}</p>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-[#999]">
                                          <Clock size={12} />
                                          {step.daysOffset === 0 ? 'Day 0' :
                                           step.daysOffset > 0 ? `Day +${step.daysOffset}` :
                                           `Day ${step.daysOffset}`}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Empty State for filtered */}
            {filteredPlaybooks.length === 0 && (
              <div className="bg-white rounded-[32px] p-12 shadow-sm border border-black/5 text-center">
                <div className="w-20 h-20 bg-[#F8F8F6] rounded-full flex items-center justify-center mx-auto mb-6">
                  <BookOpen size={32} className="text-[#999]" />
                </div>
                <h3 className="text-xl font-medium text-[#1A1A1A] mb-2">No playbooks found</h3>
                <p className="text-[#666] mb-6">No playbooks match the current filter</p>
                <button
                  onClick={() => setFilter('all')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#F8F8F6] text-[#1A1A1A] rounded-full font-medium hover:bg-[#F0EBD8] transition-colors"
                >
                  Show All Playbooks
                </button>
              </div>
            )}
          </>
        )}

        {/* Create Playbook Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl w-full max-w-2xl my-8 animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center p-8 pb-0">
                <h2 className="text-2xl font-medium text-[#1A1A1A]">Create Playbook</h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setAiPrompt('');
                    setAiError(null);
                    setShowAiSection(true);
                    setFormData({ name: '', description: '', trigger: 'MANUAL', isActive: true, steps: [] });
                  }}
                  className="text-[#666] hover:text-[#1A1A1A]"
                >
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-8 pt-6 space-y-5">
                {/* AI Generation Section */}
                <div className={`border rounded-2xl overflow-hidden transition-all ${showAiSection ? 'border-[#EAD07D] bg-[#EAD07D]/5' : 'border-black/10 bg-[#F8F8F6]'}`}>
                  <button
                    type="button"
                    onClick={() => setShowAiSection(!showAiSection)}
                    className="w-full flex items-center justify-between p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${showAiSection ? 'bg-[#EAD07D]/20' : 'bg-white'}`}>
                        <Sparkles size={18} className={showAiSection ? 'text-[#1A1A1A]' : 'text-[#999]'} />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-[#1A1A1A] text-sm">AI Assistant</p>
                        <p className="text-xs text-[#666]">Describe your playbook and AI will generate it</p>
                      </div>
                    </div>
                    <ChevronDown size={18} className={`text-[#999] transition-transform ${showAiSection ? 'rotate-180' : ''}`} />
                  </button>

                  {showAiSection && (
                    <div className="px-4 pb-4 space-y-3">
                      <div className="relative">
                        <textarea
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          placeholder="e.g., Create an enterprise discovery process using MEDDIC methodology with tasks, calls, and meetings..."
                          className="w-full px-4 py-3 pr-24 rounded-xl bg-white border border-black/10 focus:border-[#EAD07D] focus:ring-1 focus:ring-[#EAD07D]/20 outline-none text-sm resize-none"
                          rows={2}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleAiGenerate();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleAiGenerate}
                          disabled={isGenerating || !aiPrompt.trim()}
                          className="absolute right-2 bottom-2 px-4 py-2 bg-[#1A1A1A] text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-[#333] transition-colors flex items-center gap-2"
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles size={14} />
                              Generate
                            </>
                          )}
                        </button>
                      </div>

                      {aiError && (
                        <div className="flex items-start gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-sm">
                          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                          {aiError}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs text-[#999]">Try:</span>
                        {aiExamples.map((example, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setAiPrompt(example)}
                            className="text-xs px-2.5 py-1 bg-white border border-black/10 rounded-full text-[#666] hover:border-[#EAD07D] hover:text-[#1A1A1A] transition-colors"
                          >
                            {example}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Divider when AI section is collapsed and form has content */}
                {!showAiSection && formData.name && (
                  <div className="flex items-center gap-3 text-xs text-[#999]">
                    <div className="flex-1 h-px bg-black/10" />
                    <span>Generated playbook - edit below</span>
                    <div className="flex-1 h-px bg-black/10" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                      placeholder="e.g., Enterprise Discovery Process"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Trigger</label>
                    <select
                      value={formData.trigger}
                      onChange={(e) => setFormData({ ...formData, trigger: e.target.value as PlaybookTrigger })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                    >
                      {Object.entries(triggerLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Target Stage</label>
                    <input
                      type="text"
                      value={formData.targetStage || ''}
                      onChange={(e) => setFormData({ ...formData, targetStage: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                      placeholder="e.g., Discovery"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm resize-none"
                      placeholder="Describe the purpose of this playbook..."
                      rows={2}
                    />
                  </div>
                </div>

                {/* Steps Section */}
                <div className="border-t border-black/5 pt-5">
                  <h3 className="text-sm font-medium text-[#1A1A1A] mb-4">Steps</h3>

                  {/* Existing Steps */}
                  {(formData.steps || []).length > 0 && (
                    <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                      {formData.steps!.map((step, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-[#F8F8F6] rounded-xl">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${stepColors[step.type]}`}>
                            {stepIcons[step.type]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-[#1A1A1A] text-sm">{step.title}</p>
                              {step.isRequired && (
                                <span className="px-1.5 py-0.5 bg-[#EAD07D]/20 text-[#1A1A1A] text-[10px] font-semibold rounded">
                                  Required
                                </span>
                              )}
                            </div>
                            {step.description && (
                              <p className="text-xs text-[#666] mt-0.5 line-clamp-2">{step.description}</p>
                            )}
                            <p className="text-xs text-[#999] mt-1">Day {step.daysOffset}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeStepFromForm(index)}
                            className="p-1 text-[#999] hover:text-red-500 flex-shrink-0"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add New Step */}
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <select
                        value={newStep.type}
                        onChange={(e) => setNewStep({ ...newStep, type: e.target.value as PlaybookStepType })}
                        className="w-full px-3 py-2 rounded-lg bg-[#F8F8F6] text-sm outline-none"
                      >
                        <option value="TASK">Task</option>
                        <option value="EMAIL">Email</option>
                        <option value="CALL">Call</option>
                        <option value="MEETING">Meeting</option>
                        <option value="WAIT">Wait</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={newStep.title}
                        onChange={(e) => setNewStep({ ...newStep, title: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-[#F8F8F6] text-sm outline-none"
                        placeholder="Step title"
                      />
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={newStep.daysOffset}
                        onChange={(e) => setNewStep({ ...newStep, daysOffset: parseInt(e.target.value) || 0 })}
                        className="w-16 px-3 py-2 rounded-lg bg-[#F8F8F6] text-sm outline-none text-center"
                        placeholder="Day"
                      />
                      <button
                        type="button"
                        onClick={addStepToForm}
                        disabled={!newStep.title}
                        className="px-4 py-2 bg-[#1A1A1A] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-black/5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setAiPrompt('');
                      setAiError(null);
                      setShowAiSection(true);
                      setFormData({ name: '', description: '', trigger: 'MANUAL', isActive: true, steps: [] });
                    }}
                    className="flex-1 py-3 bg-[#F8F8F6] text-[#666] rounded-xl font-medium text-sm hover:bg-[#F0EBD8] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="flex-1 py-3 bg-[#1A1A1A] text-white rounded-xl font-medium text-sm hover:bg-[#333] transition-colors disabled:opacity-50"
                  >
                    {isCreating ? 'Creating...' : 'Create Playbook'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm animate-in fade-in zoom-in duration-200 p-8">
              <h2 className="text-xl font-medium text-[#1A1A1A] mb-3">Delete Playbook</h2>
              <p className="text-[#666] mb-6">
                Are you sure you want to delete this playbook? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 py-2.5 bg-[#F8F8F6] text-[#666] rounded-xl font-medium text-sm hover:bg-[#F0EBD8] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(showDeleteConfirm)}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-medium text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Playbooks;
