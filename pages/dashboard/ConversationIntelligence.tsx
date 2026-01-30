import React, { useState, useMemo } from 'react';
import {
  Mic,
  Play,
  Pause,
  Phone,
  Video,
  Clock,
  Calendar,
  User,
  Building2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  Brain,
  Search,
  Filter,
  Download,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Volume2,
  BarChart3,
  Target,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDeals, useContacts } from '../../src/hooks';
import { Skeleton } from '../../components/ui/Skeleton';

interface Conversation {
  id: string;
  type: 'CALL' | 'VIDEO_MEETING';
  title: string;
  date: string;
  duration: number;
  participants: {
    id: string;
    name: string;
    role: string;
    avatar?: string;
  }[];
  deal?: {
    id: string;
    name: string;
  };
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  talkRatio: { rep: number; customer: number };
  topics: string[];
  keyMoments: {
    timestamp: number;
    type: 'OBJECTION' | 'COMMITMENT' | 'QUESTION' | 'NEXT_STEP' | 'COMPETITOR';
    text: string;
  }[];
  summary: string;
  actionItems: string[];
  transcript?: {
    timestamp: number;
    speaker: string;
    text: string;
  }[];
  coachingInsights?: string[];
}

// Sample conversations
const sampleConversations: Conversation[] = [
  {
    id: '1',
    type: 'CALL',
    title: 'Discovery Call - TechCorp Inc',
    date: '2026-01-30T10:00:00Z',
    duration: 32,
    participants: [
      { id: '1', name: 'Sarah Johnson', role: 'Account Executive' },
      { id: '2', name: 'Mike Chen', role: 'VP of Sales at TechCorp' },
    ],
    deal: { id: 'd1', name: 'TechCorp Enterprise Deal' },
    sentiment: 'POSITIVE',
    talkRatio: { rep: 35, customer: 65 },
    topics: ['Pricing', 'Implementation', 'Integration', 'Timeline'],
    keyMoments: [
      { timestamp: 245, type: 'OBJECTION', text: 'The implementation timeline seems too long for our needs' },
      { timestamp: 580, type: 'COMMITMENT', text: 'We can definitely move forward with a pilot program' },
      { timestamp: 890, type: 'NEXT_STEP', text: 'Let\'s schedule a technical demo for next week' },
      { timestamp: 1200, type: 'COMPETITOR', text: 'We\'re also evaluating Salesforce for this' },
    ],
    summary: 'Positive discovery call with strong buying signals. Customer showed interest in pilot program. Main concern is implementation timeline. Follow-up technical demo scheduled.',
    actionItems: [
      'Schedule technical demo for next week',
      'Send implementation timeline proposal',
      'Prepare competitive comparison vs Salesforce',
    ],
    coachingInsights: [
      'Great talk ratio - customer spoke 65% of the time',
      'Handled pricing objection effectively',
      'Could have probed deeper on competitor evaluation criteria',
    ],
  },
  {
    id: '2',
    type: 'VIDEO_MEETING',
    title: 'Demo - GlobalTech Solutions',
    date: '2026-01-29T14:30:00Z',
    duration: 45,
    participants: [
      { id: '1', name: 'David Kim', role: 'Solution Engineer' },
      { id: '3', name: 'Emily Watson', role: 'CTO at GlobalTech' },
      { id: '4', name: 'James Miller', role: 'IT Director at GlobalTech' },
    ],
    deal: { id: 'd2', name: 'GlobalTech Platform Migration' },
    sentiment: 'NEUTRAL',
    talkRatio: { rep: 55, customer: 45 },
    topics: ['Features', 'Security', 'API', 'Support'],
    keyMoments: [
      { timestamp: 300, type: 'QUESTION', text: 'How does your API handle rate limiting?' },
      { timestamp: 720, type: 'OBJECTION', text: 'The security certifications need to be SOC 2 Type II' },
      { timestamp: 1500, type: 'COMMITMENT', text: 'The team is impressed with the dashboard' },
    ],
    summary: 'Technical demo went well. Team was impressed with features but raised security certification concerns. Need to provide SOC 2 documentation.',
    actionItems: [
      'Send SOC 2 Type II certification',
      'Provide API documentation',
      'Schedule follow-up with security team',
    ],
    coachingInsights: [
      'Consider letting the customer drive the demo more',
      'Strong technical knowledge demonstrated',
      'Security concerns should have been addressed earlier',
    ],
  },
  {
    id: '3',
    type: 'CALL',
    title: 'Negotiation - StartupXYZ',
    date: '2026-01-28T11:00:00Z',
    duration: 28,
    participants: [
      { id: '1', name: 'Sarah Johnson', role: 'Account Executive' },
      { id: '5', name: 'Alex Turner', role: 'CEO at StartupXYZ' },
    ],
    deal: { id: 'd3', name: 'StartupXYZ Annual Contract' },
    sentiment: 'NEGATIVE',
    talkRatio: { rep: 45, customer: 55 },
    topics: ['Pricing', 'Contract Terms', 'Budget'],
    keyMoments: [
      { timestamp: 180, type: 'OBJECTION', text: 'The pricing is 40% higher than our budget' },
      { timestamp: 420, type: 'QUESTION', text: 'Are there any startup discounts available?' },
      { timestamp: 900, type: 'OBJECTION', text: 'Our board won\'t approve this expense right now' },
    ],
    summary: 'Challenging negotiation call. Customer facing budget constraints and board approval issues. May need to revisit in Q2 or offer alternative pricing structure.',
    actionItems: [
      'Prepare startup discount proposal',
      'Create ROI analysis for board presentation',
      'Schedule follow-up for Q2',
    ],
    coachingInsights: [
      'Budget constraints identified late - consider earlier discovery',
      'Good handling of pricing objection',
      'Could have explored multi-year discount option',
    ],
  },
];

const sentimentConfig = {
  POSITIVE: { label: 'Positive', color: 'text-[#93C01F]', bg: 'bg-[#93C01F]/20', icon: ThumbsUp },
  NEUTRAL: { label: 'Neutral', color: 'text-[#666]', bg: 'bg-[#F8F8F6]', icon: TrendingUp },
  NEGATIVE: { label: 'Needs Attention', color: 'text-[#EAD07D]', bg: 'bg-[#EAD07D]/20', icon: ThumbsDown },
};

const momentTypeConfig = {
  OBJECTION: { label: 'Objection', color: 'text-[#EAD07D]', bg: 'bg-[#EAD07D]/20' },
  COMMITMENT: { label: 'Commitment', color: 'text-[#93C01F]', bg: 'bg-[#93C01F]/20' },
  QUESTION: { label: 'Question', color: 'text-blue-600', bg: 'bg-blue-100' },
  NEXT_STEP: { label: 'Next Step', color: 'text-purple-600', bg: 'bg-purple-100' },
  COMPETITOR: { label: 'Competitor', color: 'text-[#1A1A1A]', bg: 'bg-[#F0EBD8]' },
};

export const ConversationIntelligence: React.FC = () => {
  const { deals, loading: dealsLoading } = useDeals();
  const { contacts, loading: contactsLoading } = useContacts();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [filterSentiment, setFilterSentiment] = useState<string>('all');
  const [showTranscript, setShowTranscript] = useState(false);

  const loading = dealsLoading || contactsLoading;

  const filteredConversations = useMemo(() => {
    return sampleConversations.filter(conv => {
      const matchesSearch = conv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.topics.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesSentiment = filterSentiment === 'all' || conv.sentiment === filterSentiment;
      return matchesSearch && matchesSentiment;
    });
  }, [searchTerm, filterSentiment]);

  const selectedConv = selectedConversation
    ? sampleConversations.find(c => c.id === selectedConversation)
    : null;

  // Aggregate stats
  const stats = useMemo(() => {
    const total = sampleConversations.length;
    const positive = sampleConversations.filter(c => c.sentiment === 'POSITIVE').length;
    const avgDuration = Math.round(sampleConversations.reduce((sum, c) => sum + c.duration, 0) / total);
    const avgTalkRatio = Math.round(
      sampleConversations.reduce((sum, c) => sum + c.talkRatio.rep, 0) / total
    );

    return { total, positive, avgDuration, avgTalkRatio };
  }, []);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 lg:p-8">
        <div className="max-w-[1600px] mx-auto space-y-6">
          <Skeleton className="h-12 w-64 rounded-2xl" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
          <Skeleton className="h-[500px] rounded-3xl" />
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
            <div className="w-14 h-14 rounded-2xl bg-[#1A1A1A] flex items-center justify-center">
              <Brain size={28} className="text-[#EAD07D]" />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-light text-[#1A1A1A]">Conversation Intelligence</h1>
              <p className="text-[#666] mt-1">AI-powered insights from your sales conversations</p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium text-sm">
            <Download size={16} />
            Export Report
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                <Mic size={18} className="text-[#1A1A1A]" />
              </div>
              <span className="text-sm text-[#666]">Total Calls</span>
            </div>
            <p className="text-3xl font-light text-[#1A1A1A]">{stats.total}</p>
          </div>
          <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#93C01F]/20 flex items-center justify-center">
                <ThumbsUp size={18} className="text-[#93C01F]" />
              </div>
              <span className="text-sm text-[#666]">Positive Sentiment</span>
            </div>
            <p className="text-3xl font-light text-[#1A1A1A]">{Math.round((stats.positive / stats.total) * 100)}%</p>
          </div>
          <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Clock size={18} className="text-blue-600" />
              </div>
              <span className="text-sm text-[#666]">Avg Duration</span>
            </div>
            <p className="text-3xl font-light text-[#1A1A1A]">{stats.avgDuration}m</p>
          </div>
          <div className="bg-[#1A1A1A] rounded-[24px] p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                <BarChart3 size={18} className="text-[#EAD07D]" />
              </div>
              <span className="text-sm text-white/60">Avg Talk Ratio</span>
            </div>
            <p className="text-3xl font-light text-white">{stats.avgTalkRatio}%</p>
            <p className="text-xs text-white/40">Rep speaking time</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Conversations List */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-black/5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#1A1A1A]">Recent Conversations</h2>
                <select
                  value={filterSentiment}
                  onChange={(e) => setFilterSentiment(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-[#F8F8F6] text-sm focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none"
                >
                  <option value="all">All Sentiment</option>
                  <option value="POSITIVE">Positive</option>
                  <option value="NEUTRAL">Neutral</option>
                  <option value="NEGATIVE">Needs Attention</option>
                </select>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" size={16} />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F8F8F6] focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                />
              </div>

              {/* List */}
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredConversations.map(conv => {
                  const sentiment = sentimentConfig[conv.sentiment];
                  const SentimentIcon = sentiment.icon;
                  const isSelected = selectedConversation === conv.id;

                  return (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv.id)}
                      className={`w-full text-left p-4 rounded-xl transition-all ${
                        isSelected
                          ? 'bg-[#1A1A1A] text-white'
                          : 'bg-[#F8F8F6] hover:bg-[#F0EBD8]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-white/10' : conv.type === 'CALL' ? 'bg-[#93C01F]/20' : 'bg-purple-100'
                        }`}>
                          {conv.type === 'CALL' ? (
                            <Phone size={16} className={isSelected ? 'text-white' : 'text-[#93C01F]'} />
                          ) : (
                            <Video size={16} className={isSelected ? 'text-white' : 'text-purple-600'} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-medium text-sm truncate ${isSelected ? 'text-white' : 'text-[#1A1A1A]'}`}>
                            {conv.title}
                          </h3>
                          <p className={`text-xs mt-1 ${isSelected ? 'text-white/60' : 'text-[#666]'}`}>
                            {new Date(conv.date).toLocaleDateString()} • {formatDuration(conv.duration)}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                              isSelected ? 'bg-white/10 text-white' : `${sentiment.bg} ${sentiment.color}`
                            }`}>
                              <SentimentIcon size={10} />
                              {sentiment.label}
                            </span>
                            {conv.deal && (
                              <span className={`text-xs ${isSelected ? 'text-white/40' : 'text-[#999]'}`}>
                                {conv.deal.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={16} className={isSelected ? 'text-white/60' : 'text-[#999]'} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Conversation Detail */}
          <div className="lg:col-span-7">
            {selectedConv ? (
              <div className="space-y-6">
                {/* Summary Card */}
                <div className="bg-white rounded-[32px] p-6 shadow-sm border border-black/5">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold text-[#1A1A1A]">{selectedConv.title}</h2>
                      <p className="text-sm text-[#666] mt-1">
                        {new Date(selectedConv.date).toLocaleString()} • {formatDuration(selectedConv.duration)}
                      </p>
                    </div>
                    <button className="p-3 bg-[#1A1A1A] text-white rounded-xl hover:bg-[#333] transition-colors">
                      <Play size={20} />
                    </button>
                  </div>

                  {/* Participants */}
                  <div className="flex items-center gap-4 mb-6 pb-6 border-b border-black/5">
                    {selectedConv.participants.map(p => (
                      <div key={p.id} className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#F0EBD8] flex items-center justify-center">
                          <User size={14} className="text-[#666]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#1A1A1A]">{p.name}</p>
                          <p className="text-xs text-[#999]">{p.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Talk Ratio */}
                  <div className="mb-6">
                    <p className="text-sm font-medium text-[#666] mb-2">Talk Ratio</p>
                    <div className="h-3 bg-[#F0EBD8] rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-[#EAD07D]"
                        style={{ width: `${selectedConv.talkRatio.rep}%` }}
                        title={`Rep: ${selectedConv.talkRatio.rep}%`}
                      />
                      <div
                        className="h-full bg-[#93C01F]"
                        style={{ width: `${selectedConv.talkRatio.customer}%` }}
                        title={`Customer: ${selectedConv.talkRatio.customer}%`}
                      />
                    </div>
                    <div className="flex justify-between mt-2 text-xs">
                      <span className="text-[#666]">Rep: {selectedConv.talkRatio.rep}%</span>
                      <span className="text-[#666]">Customer: {selectedConv.talkRatio.customer}%</span>
                    </div>
                  </div>

                  {/* AI Summary */}
                  <div className="bg-[#F8F8F6] rounded-xl p-4 mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={14} className="text-[#EAD07D]" />
                      <span className="text-sm font-medium text-[#1A1A1A]">AI Summary</span>
                    </div>
                    <p className="text-sm text-[#666]">{selectedConv.summary}</p>
                  </div>

                  {/* Topics */}
                  <div>
                    <p className="text-sm font-medium text-[#666] mb-2">Topics Discussed</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedConv.topics.map((topic, i) => (
                        <span key={i} className="px-3 py-1 bg-[#F0EBD8] text-[#1A1A1A] rounded-full text-sm">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Key Moments */}
                <div className="bg-white rounded-[32px] p-6 shadow-sm border border-black/5">
                  <h3 className="font-semibold text-[#1A1A1A] mb-4">Key Moments</h3>
                  <div className="space-y-3">
                    {selectedConv.keyMoments.map((moment, i) => {
                      const config = momentTypeConfig[moment.type];
                      return (
                        <div key={i} className="flex items-start gap-3 p-3 bg-[#F8F8F6] rounded-xl">
                          <span className="text-xs text-[#999] w-12">{formatTimestamp(moment.timestamp)}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.color}`}>
                            {config.label}
                          </span>
                          <p className="text-sm text-[#666] flex-1">"{moment.text}"</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Action Items */}
                <div className="bg-white rounded-[32px] p-6 shadow-sm border border-black/5">
                  <h3 className="font-semibold text-[#1A1A1A] mb-4">Action Items</h3>
                  <div className="space-y-2">
                    {selectedConv.actionItems.map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <CheckCircle size={16} className="text-[#999] mt-0.5" />
                        <span className="text-sm text-[#666]">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Coaching Insights */}
                {selectedConv.coachingInsights && (
                  <div className="bg-[#1A1A1A] rounded-[32px] p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Lightbulb size={18} className="text-[#EAD07D]" />
                      <h3 className="font-semibold text-white">AI Coaching Insights</h3>
                    </div>
                    <div className="space-y-3">
                      {selectedConv.coachingInsights.map((insight, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-[#EAD07D]/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs text-[#EAD07D]">{i + 1}</span>
                          </div>
                          <p className="text-sm text-white/80">{insight}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-[32px] p-12 shadow-sm border border-black/5 text-center">
                <Brain size={48} className="mx-auto text-[#999] opacity-40 mb-4" />
                <h3 className="text-lg font-medium text-[#1A1A1A] mb-2">Select a Conversation</h3>
                <p className="text-[#666]">Choose a conversation from the list to view AI-powered insights</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversationIntelligence;
