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
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMeetings } from '../../src/hooks';
import { meetingsApi } from '../../src/api/meetings';
import { Skeleton } from '../../components/ui/Skeleton';
import { Card } from '../../components/ui/Card';
import { useToast } from '../../src/components/ui/Toast';
import type { Meeting, MeetingAnalysis, MeetingInsights } from '../../src/types/meeting';

type SentimentType = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';

const sentimentConfig: Record<SentimentType, { label: string; color: string; bg: string; icon: typeof ThumbsUp }> = {
  POSITIVE: { label: 'Positive', color: 'text-[#93C01F]', bg: 'bg-[#93C01F]/20', icon: ThumbsUp },
  NEUTRAL: { label: 'Neutral', color: 'text-[#666]', bg: 'bg-[#F8F8F6]', icon: TrendingUp },
  NEGATIVE: { label: 'Needs Attention', color: 'text-[#EAD07D]', bg: 'bg-[#EAD07D]/20', icon: ThumbsDown },
};

// Convert sentiment score (0-100) to sentiment type
const getSentimentFromScore = (score?: number): SentimentType => {
  if (score === undefined || score === null) return 'NEUTRAL';
  if (score >= 70) return 'POSITIVE';
  if (score >= 40) return 'NEUTRAL';
  return 'NEGATIVE';
};

// Calculate meeting duration in minutes
const getMeetingDuration = (meeting: Meeting): number => {
  const start = new Date(meeting.startTime);
  const end = new Date(meeting.endTime);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
};

export const ConversationIntelligence: React.FC = () => {
  const { meetings: allMeetings, loading, refetch } = useMeetings({ limit: 100 });
  const { showToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  // Filter to only completed meetings client-side
  const meetings = useMemo(() =>
    allMeetings.filter(m => m.status === 'COMPLETED'),
    [allMeetings]
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [filterSentiment, setFilterSentiment] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  // Analysis state for selected meeting
  const [analysis, setAnalysis] = useState<MeetingAnalysis | null>(null);
  const [insights, setInsights] = useState<MeetingInsights | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Fetch analysis when meeting is selected
  const handleSelectMeeting = async (meetingId: string) => {
    setSelectedMeetingId(meetingId);
    setAnalysis(null);
    setInsights(null);
    setAnalysisError(null);
    setLoadingAnalysis(true);

    try {
      const [analysisData, insightsData] = await Promise.allSettled([
        meetingsApi.getAnalysis(meetingId),
        meetingsApi.getInsights(meetingId),
      ]);

      if (analysisData.status === 'fulfilled') {
        setAnalysis(analysisData.value);
      }
      if (insightsData.status === 'fulfilled') {
        setInsights(insightsData.value);
      }
    } catch (err: any) {
      setAnalysisError(err.message || 'Failed to load analysis');
    } finally {
      setLoadingAnalysis(false);
    }
  };

  // Filter meetings
  const filteredMeetings = useMemo(() => {
    return meetings.filter(meeting => {
      // Search filter
      const matchesSearch =
        meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        meeting.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        meeting.account?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        meeting.keyTopics?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

      // Sentiment filter
      const sentiment = getSentimentFromScore(meeting.sentimentScore);
      const matchesSentiment = filterSentiment === 'all' || sentiment === filterSentiment;

      // Type filter
      const matchesType = filterType === 'all' ||
        (filterType === 'CALL' && meeting.type === 'CALL') ||
        (filterType === 'VIDEO' && (meeting.type === 'VIDEO' || meeting.type === 'WEBINAR'));

      return matchesSearch && matchesSentiment && matchesType;
    });
  }, [meetings, searchTerm, filterSentiment, filterType]);

  const selectedMeeting = selectedMeetingId
    ? meetings.find(m => m.id === selectedMeetingId)
    : null;

  // Aggregate stats
  const stats = useMemo(() => {
    const completedMeetings = meetings.filter(m => m.status === 'COMPLETED');
    const total = completedMeetings.length;
    if (total === 0) return { total: 0, positive: 0, avgDuration: 0, withRecording: 0 };

    const positive = completedMeetings.filter(m => getSentimentFromScore(m.sentimentScore) === 'POSITIVE').length;
    const totalDuration = completedMeetings.reduce((sum, m) => sum + getMeetingDuration(m), 0);
    const avgDuration = Math.round(totalDuration / total);
    const withRecording = completedMeetings.filter(m => m.recordingUrl).length;

    return { total, positive, avgDuration, withRecording };
  }, [meetings]);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-black/10 text-[#666] hover:text-[#1A1A1A] transition-colors font-medium text-sm"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            <button
              onClick={async () => {
                if (isExporting) return;
                setIsExporting(true);

                try {
                  // Warn if exporting large dataset
                  if (meetings.length > 500) {
                    showToast({
                      type: 'info',
                      title: 'Large Export',
                      message: `Exporting ${meetings.length} records, this may take a moment...`,
                      duration: 3000,
                    });
                  }

                  // Generate CSV of meeting data
                  const csvData = meetings.map(m => ({
                    title: m.title,
                    date: new Date(m.startTime).toISOString(),
                    duration: getMeetingDuration(m),
                    type: m.type,
                    sentiment: getSentimentFromScore(m.sentimentScore),
                    sentimentScore: m.sentimentScore || 0,
                    account: m.account?.name || '',
                    topics: m.keyTopics?.join('; ') || '',
                    summary: m.summary || '',
                  }));

                  const headers = ['Title', 'Date', 'Duration (min)', 'Type', 'Sentiment', 'Sentiment Score', 'Account', 'Topics', 'Summary'];
                  const csvContent = [
                    headers.join(','),
                    ...csvData.map(row =>
                      [row.title, row.date, row.duration, row.type, row.sentiment, row.sentimentScore, row.account, row.topics, row.summary]
                        .map(v => `"${String(v).replace(/"/g, '""')}"`)
                        .join(',')
                    )
                  ].join('\n');

                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(blob);
                  link.download = `conversation-intelligence-${new Date().toISOString().split('T')[0]}.csv`;
                  link.click();
                  URL.revokeObjectURL(link.href);

                  showToast({
                    type: 'success',
                    title: 'Export Complete',
                    message: `Successfully exported ${meetings.length} conversations`,
                  });
                } catch (error) {
                  showToast({
                    type: 'error',
                    title: 'Export Failed',
                    message: (error as Error).message || 'Could not export conversation data',
                  });
                } finally {
                  setIsExporting(false);
                }
              }}
              disabled={isExporting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium text-sm disabled:opacity-50"
            >
              {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {isExporting ? 'Exporting...' : 'Export Report'}
            </button>
          </div>
        </div>

        {/* Empty State */}
        {meetings.length === 0 ? (
          <Card className="p-12">
            <div className="max-w-lg mx-auto text-center">
              <div className="w-20 h-20 rounded-2xl bg-[#F0EBD8] flex items-center justify-center mx-auto mb-6">
                <Mic size={40} className="text-[#999]" />
              </div>
              <h2 className="text-2xl font-light text-[#1A1A1A] mb-3">No Completed Meetings Yet</h2>
              <p className="text-[#666] mb-8">
                Once you have completed meetings with recordings or notes,
                AI-powered conversation insights will appear here.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-left">
                <div className="bg-[#F8F8F6] rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare size={16} className="text-[#EAD07D]" />
                    <h3 className="font-medium text-[#1A1A1A]">Transcription</h3>
                  </div>
                  <p className="text-sm text-[#666]">Automatic call transcription with speaker identification</p>
                </div>
                <div className="bg-[#F8F8F6] rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain size={16} className="text-purple-600" />
                    <h3 className="font-medium text-[#1A1A1A]">AI Analysis</h3>
                  </div>
                  <p className="text-sm text-[#666]">Key moments, objections, and commitments detected</p>
                </div>
                <div className="bg-[#F8F8F6] rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ThumbsUp size={16} className="text-[#93C01F]" />
                    <h3 className="font-medium text-[#1A1A1A]">Sentiment</h3>
                  </div>
                  <p className="text-sm text-[#666]">Track conversation sentiment and customer engagement</p>
                </div>
                <div className="bg-[#F8F8F6] rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb size={16} className="text-blue-600" />
                    <h3 className="font-medium text-[#1A1A1A]">Coaching</h3>
                  </div>
                  <p className="text-sm text-[#666]">AI-powered coaching suggestions for improvement</p>
                </div>
              </div>
              <Link
                to="/dashboard/calendar"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white rounded-full font-medium hover:bg-[#333] transition-colors"
              >
                <Calendar size={18} />
                View Calendar
              </Link>
            </div>
          </Card>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card variant="small" className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                    <Mic size={18} className="text-[#1A1A1A]" />
                  </div>
                  <span className="text-sm text-[#666]">Analyzed Calls</span>
                </div>
                <p className="text-3xl font-light text-[#1A1A1A]">{stats.total}</p>
              </Card>
              <Card variant="small" className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#93C01F]/20 flex items-center justify-center">
                    <ThumbsUp size={18} className="text-[#93C01F]" />
                  </div>
                  <span className="text-sm text-[#666]">Positive Sentiment</span>
                </div>
                <p className="text-3xl font-light text-[#1A1A1A]">
                  {stats.total > 0 ? Math.round((stats.positive / stats.total) * 100) : 0}%
                </p>
              </Card>
              <Card variant="small" className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Clock size={18} className="text-blue-600" />
                  </div>
                  <span className="text-sm text-[#666]">Avg Duration</span>
                </div>
                <p className="text-3xl font-light text-[#1A1A1A]">{formatDuration(stats.avgDuration)}</p>
              </Card>
              <Card variant="dark" className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                    <Volume2 size={18} className="text-[#EAD07D]" />
                  </div>
                  <span className="text-sm text-white/60">With Recording</span>
                </div>
                <p className="text-3xl font-light text-white">{stats.withRecording}</p>
                <p className="text-xs text-white/40">Available for playback</p>
              </Card>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Conversations List */}
              <div className="lg:col-span-5">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-[#1A1A1A]">Recent Conversations</h2>
                    <div className="flex gap-2">
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-3 py-1.5 rounded-lg bg-[#F8F8F6] text-sm focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none"
                      >
                        <option value="all">All Types</option>
                        <option value="CALL">Calls</option>
                        <option value="VIDEO">Video</option>
                      </select>
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
                    {filteredMeetings.length === 0 ? (
                      <div className="py-12 text-center">
                        <Search size={32} className="mx-auto text-[#999] opacity-40 mb-3" />
                        <p className="text-[#666]">No conversations match your filters</p>
                      </div>
                    ) : (
                      filteredMeetings.map(meeting => {
                        const sentiment = getSentimentFromScore(meeting.sentimentScore);
                        const sentimentInfo = sentimentConfig[sentiment];
                        const SentimentIcon = sentimentInfo.icon;
                        const isSelected = selectedMeetingId === meeting.id;
                        const duration = getMeetingDuration(meeting);

                        return (
                          <button
                            key={meeting.id}
                            onClick={() => handleSelectMeeting(meeting.id)}
                            className={`w-full text-left p-4 rounded-xl transition-all ${
                              isSelected
                                ? 'bg-[#1A1A1A] text-white'
                                : 'bg-[#F8F8F6] hover:bg-[#F0EBD8]'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                isSelected ? 'bg-white/10' : meeting.type === 'CALL' ? 'bg-[#93C01F]/20' : 'bg-purple-100'
                              }`}>
                                {meeting.type === 'CALL' ? (
                                  <Phone size={16} className={isSelected ? 'text-white' : 'text-[#93C01F]'} />
                                ) : (
                                  <Video size={16} className={isSelected ? 'text-white' : 'text-purple-600'} />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className={`font-medium text-sm truncate ${isSelected ? 'text-white' : 'text-[#1A1A1A]'}`}>
                                  {meeting.title}
                                </h3>
                                <p className={`text-xs mt-1 ${isSelected ? 'text-white/60' : 'text-[#666]'}`}>
                                  {formatDate(meeting.startTime)} {duration > 0 && `• ${formatDuration(duration)}`}
                                </p>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                                    isSelected ? 'bg-white/10 text-white' : `${sentimentInfo.bg} ${sentimentInfo.color}`
                                  }`}>
                                    <SentimentIcon size={10} />
                                    {sentimentInfo.label}
                                  </span>
                                  {meeting.account && (
                                    <span className={`text-xs ${isSelected ? 'text-white/40' : 'text-[#999]'}`}>
                                      {meeting.account.name}
                                    </span>
                                  )}
                                  {meeting.recordingUrl && (
                                    <span className={`text-xs ${isSelected ? 'text-white/40' : 'text-[#999]'}`}>
                                      <Volume2 size={10} className="inline mr-1" />
                                      Recording
                                    </span>
                                  )}
                                </div>
                              </div>
                              <ChevronRight size={16} className={isSelected ? 'text-white/60' : 'text-[#999]'} />
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </Card>
              </div>

              {/* Conversation Detail */}
              <div className="lg:col-span-7">
                {selectedMeeting ? (
                  <div className="space-y-6">
                    {/* Summary Card */}
                    <Card className="p-6">
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex-1 min-w-0">
                          <h2 className="text-xl font-semibold text-[#1A1A1A]">{selectedMeeting.title}</h2>
                          <p className="text-sm text-[#666] mt-1">
                            {new Date(selectedMeeting.startTime).toLocaleString()} • {formatDuration(getMeetingDuration(selectedMeeting))}
                          </p>
                          {selectedMeeting.account && (
                            <Link
                              to={`/dashboard/companies/${selectedMeeting.accountId}`}
                              className="inline-flex items-center gap-1 text-sm text-[#666] hover:text-[#1A1A1A] mt-2"
                            >
                              <Building2 size={14} />
                              {selectedMeeting.account.name}
                              <ExternalLink size={12} />
                            </Link>
                          )}
                        </div>
                        {selectedMeeting.recordingUrl && (
                          <a
                            href={selectedMeeting.recordingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-3 bg-[#1A1A1A] text-white rounded-xl hover:bg-[#333] transition-colors"
                          >
                            <Play size={20} />
                          </a>
                        )}
                      </div>

                      {/* Participants */}
                      {selectedMeeting.participants && selectedMeeting.participants.length > 0 && (
                        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-black/5">
                          {selectedMeeting.participants.map(p => (
                            <div key={p.id} className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-[#F0EBD8] flex items-center justify-center">
                                <User size={14} className="text-[#666]" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-[#1A1A1A]">{p.name}</p>
                                <p className="text-xs text-[#999]">{p.role || 'Participant'}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Loading state for analysis */}
                      {loadingAnalysis && (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 size={24} className="animate-spin text-[#EAD07D]" />
                          <span className="ml-2 text-[#666]">Loading AI analysis...</span>
                        </div>
                      )}

                      {/* Error state for analysis */}
                      {analysisError && !loadingAnalysis && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                          <div className="flex items-center gap-2 text-red-700">
                            <AlertTriangle size={16} />
                            <span className="text-sm font-medium">Analysis unavailable</span>
                          </div>
                          <p className="text-sm text-red-600 mt-1">{analysisError}</p>
                        </div>
                      )}

                      {/* AI Summary */}
                      {(selectedMeeting.summary || analysis?.summary) && !loadingAnalysis && (
                        <div className="bg-[#F8F8F6] rounded-xl p-4 mb-6">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles size={14} className="text-[#EAD07D]" />
                            <span className="text-sm font-medium text-[#1A1A1A]">AI Summary</span>
                          </div>
                          <p className="text-sm text-[#666]">{analysis?.summary || selectedMeeting.summary}</p>
                        </div>
                      )}

                      {/* Sentiment Score */}
                      {selectedMeeting.sentimentScore !== undefined && !loadingAnalysis && (
                        <div className="mb-6">
                          <p className="text-sm font-medium text-[#666] mb-2">Sentiment Score</p>
                          <div className="flex items-center gap-4">
                            <div className="flex-1 h-3 bg-[#F0EBD8] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  selectedMeeting.sentimentScore >= 70 ? 'bg-[#93C01F]' :
                                  selectedMeeting.sentimentScore >= 40 ? 'bg-[#EAD07D]' : 'bg-red-400'
                                }`}
                                style={{ width: `${selectedMeeting.sentimentScore}%` }}
                              />
                            </div>
                            <span className="text-lg font-semibold text-[#1A1A1A]">{selectedMeeting.sentimentScore}%</span>
                          </div>
                        </div>
                      )}

                      {/* Topics */}
                      {(selectedMeeting.keyTopics?.length || analysis?.keyTopics?.length) && !loadingAnalysis ? (
                        <div>
                          <p className="text-sm font-medium text-[#666] mb-2">Topics Discussed</p>
                          <div className="flex flex-wrap gap-2">
                            {(analysis?.keyTopics || selectedMeeting.keyTopics || []).map((topic, i) => (
                              <span key={i} className="px-3 py-1 bg-[#F0EBD8] text-[#1A1A1A] rounded-full text-sm">
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </Card>

                    {/* Action Items */}
                    {(selectedMeeting.actionItems?.length || analysis?.actionItems?.length) && !loadingAnalysis ? (
                      <Card className="p-6">
                        <h3 className="font-semibold text-[#1A1A1A] mb-4">Action Items</h3>
                        <div className="space-y-3">
                          {(analysis?.actionItems || selectedMeeting.actionItems?.map(item => ({ item })) || []).map((action, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 bg-[#F8F8F6] rounded-xl">
                              <CheckCircle size={16} className="text-[#93C01F] mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <span className="text-sm text-[#1A1A1A]">
                                  {typeof action === 'string' ? action : action.item}
                                </span>
                                {typeof action !== 'string' && action.assignee && (
                                  <p className="text-xs text-[#999] mt-1">Assigned to: {action.assignee}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    ) : null}

                    {/* Insights from AI */}
                    {insights && !loadingAnalysis && (
                      <Card variant="dark" className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <Lightbulb size={18} className="text-[#EAD07D]" />
                          <h3 className="font-semibold text-white">AI Insights</h3>
                        </div>

                        <div className="space-y-4">
                          {insights.buyingSignals?.length > 0 && (
                            <div>
                              <p className="text-xs text-white/60 uppercase tracking-wider mb-2">Buying Signals</p>
                              <div className="space-y-2">
                                {insights.buyingSignals.map((signal, i) => (
                                  <div key={i} className="flex items-start gap-2">
                                    <ThumbsUp size={12} className="text-[#93C01F] mt-1" />
                                    <span className="text-sm text-white/80">{signal}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {insights.objections?.length > 0 && (
                            <div>
                              <p className="text-xs text-white/60 uppercase tracking-wider mb-2">Objections Raised</p>
                              <div className="space-y-2">
                                {insights.objections.map((objection, i) => (
                                  <div key={i} className="flex items-start gap-2">
                                    <AlertTriangle size={12} className="text-[#EAD07D] mt-1" />
                                    <span className="text-sm text-white/80">{objection}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {insights.competitorMentions?.length > 0 && (
                            <div>
                              <p className="text-xs text-white/60 uppercase tracking-wider mb-2">Competitor Mentions</p>
                              <div className="flex flex-wrap gap-2">
                                {insights.competitorMentions.map((comp, i) => (
                                  <span key={i} className="px-2 py-1 bg-white/10 rounded text-xs text-white/80">
                                    {comp}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {insights.decisionMakers?.length > 0 && (
                            <div>
                              <p className="text-xs text-white/60 uppercase tracking-wider mb-2">Decision Makers</p>
                              <div className="space-y-2">
                                {insights.decisionMakers.map((dm, i) => (
                                  <div key={i} className="flex items-center gap-2">
                                    <User size={12} className="text-white/60" />
                                    <span className="text-sm text-white/80">{dm.name}</span>
                                    {dm.role && <span className="text-xs text-white/40">({dm.role})</span>}
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                                      dm.influence === 'HIGH' ? 'bg-[#93C01F]/20 text-[#93C01F]' :
                                      dm.influence === 'MEDIUM' ? 'bg-[#EAD07D]/20 text-[#EAD07D]' :
                                      'bg-white/10 text-white/60'
                                    }`}>
                                      {dm.influence}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    )}

                    {/* Next Steps */}
                    {analysis?.nextSteps?.length > 0 && !loadingAnalysis && (
                      <Card className="p-6">
                        <h3 className="font-semibold text-[#1A1A1A] mb-4">Recommended Next Steps</h3>
                        <div className="space-y-2">
                          {analysis.nextSteps.map((step, i) => (
                            <div key={i} className="flex items-start gap-3">
                              <div className="w-6 h-6 rounded-full bg-[#EAD07D] flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-semibold text-[#1A1A1A]">{i + 1}</span>
                              </div>
                              <span className="text-sm text-[#666]">{step}</span>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}

                    {/* Transcript Link */}
                    {selectedMeeting.transcriptUrl && (
                      <a
                        href={selectedMeeting.transcriptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 p-4 bg-[#F8F8F6] rounded-xl hover:bg-[#F0EBD8] transition-colors"
                      >
                        <FileText size={18} className="text-[#666]" />
                        <span className="text-sm font-medium text-[#1A1A1A]">View Full Transcript</span>
                        <ExternalLink size={14} className="text-[#999]" />
                      </a>
                    )}
                  </div>
                ) : (
                  <Card className="p-12 text-center">
                    <Brain size={48} className="mx-auto text-[#999] opacity-40 mb-4" />
                    <h3 className="text-lg font-medium text-[#1A1A1A] mb-2">Select a Conversation</h3>
                    <p className="text-[#666]">Choose a conversation from the list to view AI-powered insights</p>
                  </Card>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ConversationIntelligence;
