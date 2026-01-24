export type MeetingStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export type MeetingType = 'CALL' | 'VIDEO' | 'IN_PERSON' | 'WEBINAR';

export interface MeetingParticipant {
  id: string;
  meetingId: string;
  contactId?: string;
  userId?: string;
  email: string;
  name: string;
  role?: string;
  attended?: boolean;
  contact?: {
    id: string;
    firstName: string;
    lastName: string;
    title?: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface Meeting {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  type: MeetingType;
  status: MeetingStatus;
  startTime: string;
  endTime: string;
  location?: string;
  meetingLink?: string;
  accountId?: string;
  opportunityId?: string;
  leadId?: string;
  recordingUrl?: string;
  transcriptUrl?: string;
  summary?: string;
  actionItems?: string[];
  sentimentScore?: number;
  keyTopics?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  participants?: MeetingParticipant[];
  account?: {
    id: string;
    name: string;
  };
  opportunity?: {
    id: string;
    name: string;
  };
}

export interface CreateMeetingDto {
  title: string;
  description?: string;
  type: MeetingType;
  startTime: string;
  endTime: string;
  location?: string;
  meetingLink?: string;
  accountId?: string;
  opportunityId?: string;
  leadId?: string;
  participantEmails?: string[];
}

export interface UpdateMeetingDto extends Partial<CreateMeetingDto> {
  status?: MeetingStatus;
}

export interface MeetingAnalysis {
  summary: string;
  keyTopics: string[];
  actionItems: {
    item: string;
    assignee?: string;
    dueDate?: string;
  }[];
  sentimentScore: number;
  participantEngagement: {
    participantId: string;
    name: string;
    talkTime: number;
    sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  }[];
  nextSteps: string[];
  risks: string[];
}

export interface MeetingInsights {
  objections: string[];
  buyingSignals: string[];
  competitorMentions: string[];
  budgetDiscussion?: {
    mentioned: boolean;
    details?: string;
  };
  decisionMakers: {
    name: string;
    role?: string;
    influence: 'HIGH' | 'MEDIUM' | 'LOW';
  }[];
}
