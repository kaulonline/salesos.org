import React, { useState } from 'react';
import {
  User,
  Building2,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  RefreshCw,
  Calendar,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useMeetingBriefing, MeetingBriefing, AttendeeInfo } from '../hooks/useMeetingIntelligence';

interface MeetingPrepProps {
  meetingId: string;
  meetingTitle?: string;
  meetingTime?: string;
  className?: string;
}

export function MeetingPrep({
  meetingId,
  meetingTitle,
  meetingTime,
  className = '',
}: MeetingPrepProps) {
  const { briefing, isLoading, error, generateBriefing, isGenerating } = useMeetingBriefing(meetingId);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['attendees', 'topics', 'questions'])
  );

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-[#EAD07D]" />
          <span className="text-gray-600">Loading meeting briefing...</span>
        </div>
      </div>
    );
  }

  if (error || !briefing) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
        <div className="text-center">
          <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 mb-3">No briefing available yet</p>
          <button
            onClick={() => generateBriefing()}
            disabled={isGenerating}
            className="px-4 py-2 bg-[#1A1A1A] text-white rounded-lg text-sm font-medium hover:bg-[#2A2A2A] disabled:opacity-50 flex items-center gap-2 mx-auto"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Briefing
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#EAD07D]/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[#EAD07D]" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white">
                {meetingTitle || 'Meeting Briefing'}
              </h3>
              {meetingTime && (
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(meetingTime).toLocaleString()}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => generateBriefing()}
            disabled={isGenerating}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Refresh briefing"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${isGenerating ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="divide-y divide-gray-100">
        {/* Attendees */}
        <CollapsibleSection
          title="Attendees"
          icon={User}
          expanded={expandedSections.has('attendees')}
          onToggle={() => toggleSection('attendees')}
          badge={`${briefing.attendees.length}`}
        >
          <div className="space-y-3">
            {briefing.attendees.map((attendee, i) => (
              <AttendeeCard key={i} attendee={attendee} />
            ))}
          </div>
        </CollapsibleSection>

        {/* Company Insights */}
        {briefing.companyInsights && (
          <CollapsibleSection
            title="Company Insights"
            icon={Building2}
            expanded={expandedSections.has('company')}
            onToggle={() => toggleSection('company')}
          >
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-gray-900">{briefing.companyInsights.name}</h4>
                <p className="text-xs text-gray-500">{briefing.companyInsights.industry} • {briefing.companyInsights.size}</p>
              </div>
              {briefing.companyInsights.challenges && briefing.companyInsights.challenges.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">Key Challenges</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {briefing.companyInsights.challenges.map((c, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-red-500">•</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {briefing.companyInsights.recentNews && briefing.companyInsights.recentNews.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">Recent News</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {briefing.companyInsights.recentNews.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* Deal Context */}
        {briefing.dealContext && (
          <CollapsibleSection
            title="Opportunity Context"
            icon={TrendingUp}
            expanded={expandedSections.has('deal')}
            onToggle={() => toggleSection('deal')}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">{briefing.dealContext.dealName}</span>
                <span className="text-sm font-semibold text-green-600">
                  ${briefing.dealContext.value.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-gray-500">Stage: {briefing.dealContext.stage}</p>
              {briefing.dealContext.risks && briefing.dealContext.risks.length > 0 && (
                <div className="p-2 bg-red-50 rounded-lg">
                  <p className="text-xs font-medium text-red-700 mb-1">Risks to Address</p>
                  <ul className="text-xs text-red-600 space-y-0.5">
                    {briefing.dealContext.risks.map((r, i) => (
                      <li key={i}>• {r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* Suggested Topics */}
        <CollapsibleSection
          title="Suggested Topics"
          icon={MessageSquare}
          expanded={expandedSections.has('topics')}
          onToggle={() => toggleSection('topics')}
        >
          <ul className="space-y-2">
            {briefing.suggestedTopics.map((topic, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-[#EAD07D] mt-0.5">•</span>
                {topic}
              </li>
            ))}
          </ul>
        </CollapsibleSection>

        {/* Recommended Questions */}
        <CollapsibleSection
          title="Questions to Ask"
          icon={Lightbulb}
          expanded={expandedSections.has('questions')}
          onToggle={() => toggleSection('questions')}
          badge="AI"
        >
          <ol className="space-y-2">
            {briefing.recommendedQuestions.map((q, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-gray-400 font-medium">{i + 1}.</span>
                {q}
              </li>
            ))}
          </ol>
        </CollapsibleSection>

        {/* Potential Objections */}
        {briefing.potentialObjections && briefing.potentialObjections.length > 0 && (
          <CollapsibleSection
            title="Objection Handling"
            icon={AlertTriangle}
            expanded={expandedSections.has('objections')}
            onToggle={() => toggleSection('objections')}
          >
            <div className="space-y-3">
              {briefing.potentialObjections.map((obj, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    "{obj.objection}"
                  </p>
                  <p className="text-xs text-gray-600">
                    <span className="font-medium text-green-600">Response:</span> {obj.suggestedResponse}
                  </p>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}
      </div>
    </div>
  );
}

// Collapsible section component
function CollapsibleSection({
  title,
  icon: Icon,
  expanded,
  onToggle,
  badge,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  expanded: boolean;
  onToggle: () => void;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-900">{title}</span>
          {badge && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-[#EAD07D] text-[#1A1A1A] rounded">
              {badge}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {expanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// Attendee card component
function AttendeeCard({ attendee }: { attendee: AttendeeInfo }) {
  const roleColors: Record<string, string> = {
    champion: 'bg-green-100 text-green-700',
    decision_maker: 'bg-purple-100 text-purple-700',
    influencer: 'bg-blue-100 text-blue-700',
    user: 'bg-gray-100 text-gray-700',
    unknown: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-gray-900">{attendee.name}</h4>
            {attendee.linkedInUrl && (
              <a
                href={attendee.linkedInUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <p className="text-xs text-gray-500">
            {attendee.title}{attendee.company ? ` at ${attendee.company}` : ''}
          </p>
        </div>
        {attendee.role && (
          <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${roleColors[attendee.role]}`}>
            {attendee.role.replace('_', ' ')}
          </span>
        )}
      </div>
      {attendee.communicationStyle && (
        <p className="text-xs text-gray-600 mb-1">
          <span className="font-medium">Style:</span> {attendee.communicationStyle}
        </p>
      )}
      {attendee.priorities && attendee.priorities.length > 0 && (
        <div className="text-xs text-gray-600">
          <span className="font-medium">Priorities:</span> {attendee.priorities.join(', ')}
        </div>
      )}
    </div>
  );
}

export default MeetingPrep;
