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
  MoreVertical,
  Zap,
  Phone,
  Mail,
  Video,
  FileText,
  Calendar,
} from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';

interface PlaybookStep {
  id: string;
  order: number;
  title: string;
  description: string;
  type: 'TASK' | 'EMAIL' | 'CALL' | 'MEETING' | 'DOCUMENT';
  daysOffset: number;
  required: boolean;
}

interface Playbook {
  id: string;
  name: string;
  description: string;
  stage: string;
  dealType: string;
  steps: PlaybookStep[];
  usageCount: number;
  successRate: number;
  isActive: boolean;
}

const stepIcons: Record<string, React.ReactNode> = {
  TASK: <CheckCircle size={16} />,
  EMAIL: <Mail size={16} />,
  CALL: <Phone size={16} />,
  MEETING: <Video size={16} />,
  DOCUMENT: <FileText size={16} />,
};

const stepColors: Record<string, string> = {
  TASK: 'bg-[#EAD07D]/20 text-[#1A1A1A]',
  EMAIL: 'bg-blue-100 text-blue-600',
  CALL: 'bg-[#93C01F]/20 text-[#93C01F]',
  MEETING: 'bg-purple-100 text-purple-600',
  DOCUMENT: 'bg-[#F0EBD8] text-[#666]',
};

// Sample playbooks
const samplePlaybooks: Playbook[] = [
  {
    id: '1',
    name: 'Enterprise Discovery',
    description: 'Comprehensive discovery process for enterprise deals over $100K',
    stage: 'QUALIFICATION',
    dealType: 'Enterprise',
    usageCount: 45,
    successRate: 72,
    isActive: true,
    steps: [
      { id: '1-1', order: 1, title: 'Send intro email', description: 'Personalized introduction with value proposition', type: 'EMAIL', daysOffset: 0, required: true },
      { id: '1-2', order: 2, title: 'Discovery call', description: 'Initial 30-min discovery to understand needs', type: 'CALL', daysOffset: 2, required: true },
      { id: '1-3', order: 3, title: 'Send meeting summary', description: 'Email recap with key points and next steps', type: 'EMAIL', daysOffset: 2, required: true },
      { id: '1-4', order: 4, title: 'Technical deep-dive', description: '60-min technical requirements session', type: 'MEETING', daysOffset: 5, required: false },
      { id: '1-5', order: 5, title: 'Prepare proposal', description: 'Create customized proposal document', type: 'DOCUMENT', daysOffset: 7, required: true },
    ],
  },
  {
    id: '2',
    name: 'SMB Fast Track',
    description: 'Accelerated sales process for small business deals',
    stage: 'PROSPECTING',
    dealType: 'SMB',
    usageCount: 128,
    successRate: 65,
    isActive: true,
    steps: [
      { id: '2-1', order: 1, title: 'Quick intro call', description: '15-min intro and qualification', type: 'CALL', daysOffset: 0, required: true },
      { id: '2-2', order: 2, title: 'Send pricing', description: 'Standard pricing with quick-start options', type: 'EMAIL', daysOffset: 1, required: true },
      { id: '2-3', order: 3, title: 'Demo meeting', description: '30-min product demonstration', type: 'MEETING', daysOffset: 3, required: true },
      { id: '2-4', order: 4, title: 'Follow-up task', description: 'Check in on decision status', type: 'TASK', daysOffset: 5, required: false },
    ],
  },
  {
    id: '3',
    name: 'Renewal Playbook',
    description: 'Proactive renewal process starting 90 days before expiry',
    stage: 'NEGOTIATION_REVIEW',
    dealType: 'Renewal',
    usageCount: 67,
    successRate: 85,
    isActive: true,
    steps: [
      { id: '3-1', order: 1, title: 'Health check email', description: 'Send usage report and ROI summary', type: 'EMAIL', daysOffset: -90, required: true },
      { id: '3-2', order: 2, title: 'QBR meeting', description: 'Quarterly business review', type: 'MEETING', daysOffset: -85, required: true },
      { id: '3-3', order: 3, title: 'Renewal proposal', description: 'Send renewal terms and pricing', type: 'DOCUMENT', daysOffset: -60, required: true },
      { id: '3-4', order: 4, title: 'Executive sponsor call', description: 'Connect with exec for strategic alignment', type: 'CALL', daysOffset: -45, required: false },
      { id: '3-5', order: 5, title: 'Contract review', description: 'Final contract negotiation', type: 'TASK', daysOffset: -30, required: true },
    ],
  },
  {
    id: '4',
    name: 'Competitive Displacement',
    description: 'Strategy for winning deals against specific competitors',
    stage: 'VALUE_PROPOSITION',
    dealType: 'Competitive',
    usageCount: 23,
    successRate: 58,
    isActive: false,
    steps: [
      { id: '4-1', order: 1, title: 'Competitive research', description: 'Document current solution pain points', type: 'TASK', daysOffset: 0, required: true },
      { id: '4-2', order: 2, title: 'ROI comparison', description: 'Build TCO comparison document', type: 'DOCUMENT', daysOffset: 2, required: true },
      { id: '4-3', order: 3, title: 'Champion call', description: 'Build internal champion relationship', type: 'CALL', daysOffset: 4, required: true },
      { id: '4-4', order: 4, title: 'Proof of concept', description: 'Set up POC environment', type: 'TASK', daysOffset: 7, required: false },
    ],
  },
];

export const Playbooks: React.FC = () => {
  const [playbooks] = useState<Playbook[]>(samplePlaybooks);
  const [expandedPlaybook, setExpandedPlaybook] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const filteredPlaybooks = playbooks.filter(p => {
    if (filter === 'active') return p.isActive;
    if (filter === 'inactive') return !p.isActive;
    return true;
  });

  const totalUsage = playbooks.reduce((sum, p) => sum + p.usageCount, 0);
  const avgSuccessRate = playbooks.length > 0
    ? Math.round(playbooks.reduce((sum, p) => sum + p.successRate, 0) / playbooks.length)
    : 0;

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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                <BookOpen size={18} className="text-[#1A1A1A]" />
              </div>
              <span className="text-sm text-[#666]">Total Playbooks</span>
            </div>
            <p className="text-3xl font-light text-[#1A1A1A]">{playbooks.length}</p>
          </div>
          <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#93C01F]/20 flex items-center justify-center">
                <CheckCircle size={18} className="text-[#93C01F]" />
              </div>
              <span className="text-sm text-[#666]">Active</span>
            </div>
            <p className="text-3xl font-light text-[#1A1A1A]">{playbooks.filter(p => p.isActive).length}</p>
          </div>
          <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Play size={18} className="text-blue-600" />
              </div>
              <span className="text-sm text-[#666]">Total Usage</span>
            </div>
            <p className="text-3xl font-light text-[#1A1A1A]">{totalUsage}</p>
          </div>
          <div className="bg-[#1A1A1A] rounded-[24px] p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                <Target size={18} className="text-[#EAD07D]" />
              </div>
              <span className="text-sm text-white/60">Avg Success Rate</span>
            </div>
            <p className="text-3xl font-light text-white">{avgSuccessRate}%</p>
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
                        <p className="text-sm text-[#666] mb-2">{playbook.description}</p>
                        <div className="flex items-center gap-4 text-xs text-[#999]">
                          <span className="flex items-center gap-1">
                            <Target size={12} />
                            {playbook.stage.replace(/_/g, ' ')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users size={12} />
                            {playbook.dealType}
                          </span>
                          <span className="flex items-center gap-1">
                            <Zap size={12} />
                            {playbook.steps.length} steps
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-light text-[#1A1A1A]">{playbook.successRate}%</p>
                        <p className="text-xs text-[#999]">success rate</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-light text-[#1A1A1A]">{playbook.usageCount}</p>
                        <p className="text-xs text-[#999]">times used</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button className="p-2 text-[#999] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] rounded-lg transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button className="p-2 text-[#999] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] rounded-lg transition-colors">
                          <Copy size={16} />
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
                      <div className="relative">
                        {/* Vertical line */}
                        <div className="absolute left-[23px] top-8 bottom-8 w-0.5 bg-[#F0EBD8]" />

                        <div className="space-y-4">
                          {playbook.steps.map((step, idx) => (
                            <div key={step.id} className="flex items-start gap-4 relative">
                              {/* Step number */}
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 z-10 ${stepColors[step.type]}`}>
                                {stepIcons[step.type]}
                              </div>

                              {/* Step content */}
                              <div className="flex-1 bg-[#F8F8F6] rounded-xl p-4">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs text-[#999]">Step {step.order}</span>
                                      {step.required && (
                                        <span className="px-1.5 py-0.5 bg-[#EAD07D]/20 text-[#1A1A1A] text-[10px] font-semibold rounded">
                                          Required
                                        </span>
                                      )}
                                    </div>
                                    <h5 className="font-medium text-[#1A1A1A]">{step.title}</h5>
                                    <p className="text-sm text-[#666] mt-1">{step.description}</p>
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

                      {/* Actions */}
                      <div className="flex items-center gap-3 mt-6 pt-4 border-t border-black/5">
                        <button className="flex items-center gap-2 px-5 py-2.5 bg-[#1A1A1A] text-white rounded-full font-medium text-sm hover:bg-[#333] transition-colors">
                          <Play size={16} />
                          Apply to Deal
                        </button>
                        <button className="flex items-center gap-2 px-5 py-2.5 bg-[#F8F8F6] text-[#1A1A1A] rounded-full font-medium text-sm hover:bg-[#EAD07D]/20 transition-colors">
                          <Edit2 size={16} />
                          Edit Playbook
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredPlaybooks.length === 0 && (
          <div className="bg-white rounded-[32px] p-12 shadow-sm border border-black/5 text-center">
            <div className="w-20 h-20 bg-[#F8F8F6] rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen size={32} className="text-[#999]" />
            </div>
            <h3 className="text-xl font-medium text-[#1A1A1A] mb-2">No playbooks found</h3>
            <p className="text-[#666] mb-6">Create your first playbook to standardize your sales process</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white rounded-full font-medium hover:bg-[#333] transition-colors"
            >
              <Plus size={18} />
              Create Playbook
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Playbooks;
