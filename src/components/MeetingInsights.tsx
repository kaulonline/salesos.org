import React, { useState } from 'react';
import {
  FileText,
  CheckSquare,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Mail,
  Loader2,
  Send,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from 'lucide-react';
import { useMeetingAnalysis, PostMeetingAnalysis, ActionItem } from '../hooks/useMeetingIntelligence';

interface MeetingInsightsProps {
  meetingId: string;
  className?: string;
}

export function MeetingInsights({ meetingId, className = '' }: MeetingInsightsProps) {
  const { analysis, isLoading, submitNotes, isSubmitting } = useMeetingAnalysis(meetingId);
  const [notes, setNotes] = useState('');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-[#EAD07D]" />
          <span className="text-gray-600">Loading meeting analysis...</span>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${className}`}>
        <div className="px-4 py-3 bg-gradient-to-r from-[#1A1A1A] to-[#2A2A2A]">
          <h3 className="text-sm font-medium text-white">Post-Meeting Analysis</h3>
          <p className="text-xs text-gray-400">Submit your meeting notes for AI analysis</p>
        </div>
        <div className="p-4">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Paste your meeting notes, transcript, or summary here..."
            className="w-full h-40 px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#EAD07D] focus:border-transparent"
          />
          <button
            onClick={() => submitNotes(notes)}
            disabled={!notes.trim() || isSubmitting}
            className="mt-3 w-full py-2.5 bg-[#1A1A1A] text-white rounded-lg text-sm font-medium hover:bg-[#2A2A2A] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Analyze Meeting
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-[#1A1A1A] to-[#2A2A2A]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-white">Meeting Analysis</h3>
            <p className="text-xs text-gray-400">
              Generated {new Date(analysis.generatedAt).toLocaleString()}
            </p>
          </div>
          <SentimentBadge sentiment={analysis.sentimentAnalysis.overall} />
        </div>
      </div>

      {/* Content */}
      <div className="divide-y divide-gray-100">
        {/* Summary */}
        <AnalysisSection
          title="Summary"
          icon={FileText}
          copyable
          onCopy={() => copyToClipboard(analysis.summary, 'summary')}
          isCopied={copiedSection === 'summary'}
        >
          <p className="text-sm text-gray-700">{analysis.summary}</p>
        </AnalysisSection>

        {/* Key Topics */}
        <AnalysisSection title="Key Topics" icon={Lightbulb}>
          <div className="flex flex-wrap gap-2">
            {analysis.keyTopics.map((topic, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-[#EAD07D]/10 text-[#1A1A1A] rounded-md text-xs font-medium"
              >
                {topic}
              </span>
            ))}
          </div>
        </AnalysisSection>

        {/* Action Items */}
        <AnalysisSection
          title="Action Items"
          icon={CheckSquare}
          badge={`${analysis.actionItems.length}`}
        >
          <div className="space-y-2">
            {analysis.actionItems.map((item, i) => (
              <ActionItemCard key={i} item={item} />
            ))}
          </div>
        </AnalysisSection>

        {/* Next Steps */}
        <AnalysisSection title="Next Steps" icon={TrendingUp}>
          <ol className="space-y-2">
            {analysis.nextSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-[#EAD07D] font-medium">{i + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
        </AnalysisSection>

        {/* Risks */}
        {analysis.risks && analysis.risks.length > 0 && (
          <AnalysisSection title="Risks Identified" icon={AlertTriangle}>
            <ul className="space-y-1">
              {analysis.risks.map((risk, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                  <span className="text-red-500">•</span>
                  {risk}
                </li>
              ))}
            </ul>
          </AnalysisSection>
        )}

        {/* Opportunities */}
        {analysis.opportunities && analysis.opportunities.length > 0 && (
          <AnalysisSection title="Opportunities" icon={Lightbulb}>
            <ul className="space-y-1">
              {analysis.opportunities.map((opp, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-green-700">
                  <span className="text-green-500">•</span>
                  {opp}
                </li>
              ))}
            </ul>
          </AnalysisSection>
        )}

        {/* Follow-up Draft */}
        {analysis.followUpDraft && (
          <AnalysisSection
            title="Follow-up Email Draft"
            icon={Mail}
            copyable
            onCopy={() => copyToClipboard(analysis.followUpDraft!, 'email')}
            isCopied={copiedSection === 'email'}
          >
            <div className="bg-gray-50 rounded-lg p-3">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                {analysis.followUpDraft}
              </pre>
            </div>
          </AnalysisSection>
        )}
      </div>
    </div>
  );
}

// Sentiment badge component
function SentimentBadge({ sentiment }: { sentiment: 'positive' | 'neutral' | 'negative' }) {
  const styles = {
    positive: 'bg-green-500/20 text-green-400',
    neutral: 'bg-gray-500/20 text-gray-300',
    negative: 'bg-red-500/20 text-red-400',
  };

  const icons = {
    positive: '↑',
    neutral: '→',
    negative: '↓',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[sentiment]}`}>
      {icons[sentiment]} {sentiment}
    </span>
  );
}

// Analysis section component
function AnalysisSection({
  title,
  icon: Icon,
  badge,
  copyable,
  onCopy,
  isCopied,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  copyable?: boolean;
  onCopy?: () => void;
  isCopied?: boolean;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-900">{title}</span>
          {badge && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 rounded">
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {copyable && onCopy && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopy();
              }}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="Copy to clipboard"
            >
              {isCopied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 text-gray-400" />
              )}
            </button>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>
      {expanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// Action item card component
function ActionItemCard({ item }: { item: ActionItem }) {
  const priorityStyles = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
      <input
        type="checkbox"
        className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#1A1A1A] focus:ring-[#EAD07D]"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">{item.description}</p>
        <div className="flex items-center gap-2 mt-1">
          {item.assignee && (
            <span className="text-xs text-gray-500">Assigned to: {item.assignee}</span>
          )}
          {item.dueDate && (
            <span className="text-xs text-gray-500">
              Due: {new Date(item.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${priorityStyles[item.priority]}`}>
        {item.priority}
      </span>
    </div>
  );
}

export default MeetingInsights;
