import client from './client';
import type {
  Meeting,
  CreateMeetingDto,
  UpdateMeetingDto,
  MeetingAnalysis,
  MeetingInsights,
  MeetingType,
  MeetingStatus,
  QueryFilters,
} from '../types';

export interface MeetingFilters extends QueryFilters {
  status?: string;
  type?: string;
  accountId?: string;
  opportunityId?: string;
  startDate?: string;
  endDate?: string;
}

// Map backend platform to frontend type
const platformToType = (platform: string): MeetingType => {
  switch (platform?.toUpperCase()) {
    case 'ZOOM':
    case 'TEAMS':
    case 'MEET':
      return 'VIDEO';
    case 'PHONE':
      return 'CALL';
    case 'IN_PERSON':
      return 'IN_PERSON';
    case 'WEBINAR':
      return 'WEBINAR';
    default:
      return 'VIDEO';
  }
};

// Map backend status to frontend status
const mapStatus = (status: string): MeetingStatus => {
  switch (status?.toUpperCase()) {
    case 'SCHEDULED':
      return 'SCHEDULED';
    case 'IN_PROGRESS':
    case 'LIVE':
      return 'IN_PROGRESS';
    case 'COMPLETED':
    case 'ENDED':
      return 'COMPLETED';
    case 'CANCELLED':
      return 'CANCELLED';
    case 'NO_SHOW':
      return 'NO_SHOW';
    default:
      return 'SCHEDULED';
  }
};

// Transform backend MeetingSession to frontend Meeting
const transformMeeting = (backendMeeting: any): Meeting => ({
  id: backendMeeting.id,
  ownerId: backendMeeting.ownerId || backendMeeting.userId,
  title: backendMeeting.title,
  description: backendMeeting.description,
  type: platformToType(backendMeeting.platform),
  status: mapStatus(backendMeeting.status),
  startTime: backendMeeting.scheduledStart || backendMeeting.scheduledAt,
  endTime: backendMeeting.scheduledEnd || backendMeeting.endedAt || backendMeeting.scheduledStart,
  location: backendMeeting.location,
  meetingLink: backendMeeting.meetingUrl || backendMeeting.meetingLink,
  accountId: backendMeeting.accountId,
  opportunityId: backendMeeting.opportunityId,
  leadId: backendMeeting.leadId,
  recordingUrl: backendMeeting.recordingUrl,
  transcriptUrl: backendMeeting.transcriptUrl,
  summary: backendMeeting.summary,
  actionItems: backendMeeting.actionItems,
  sentimentScore: backendMeeting.sentimentScore,
  keyTopics: backendMeeting.keyTopics,
  metadata: backendMeeting.metadata,
  createdAt: backendMeeting.createdAt,
  updatedAt: backendMeeting.updatedAt,
  participants: backendMeeting.participants || backendMeeting.attendees || [],
  account: backendMeeting.account,
  opportunity: backendMeeting.opportunity,
  owner: backendMeeting.owner,
});

export const meetingsApi = {
  /**
   * Get all meetings with optional filters
   */
  getAll: async (filters?: MeetingFilters): Promise<Meeting[]> => {
    const params = new URLSearchParams();
    if (filters) {
      // Map frontend filter names to backend filter names
      const filterMapping: Record<string, string> = {
        startDate: 'dateFrom',
        endDate: 'dateTo',
        type: 'platform',
      };

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          const backendKey = filterMapping[key] || key;
          params.append(backendKey, String(value));
        }
      });
    }
    const response = await client.get<any[]>(`/meetings?${params.toString()}`);
    return response.data.map(transformMeeting);
  },

  /**
   * Get a single meeting by ID
   */
  getById: async (id: string): Promise<Meeting> => {
    const response = await client.get<any>(`/meetings/${id}`);
    return transformMeeting(response.data);
  },

  /**
   * Create a new meeting
   */
  create: async (data: CreateMeetingDto): Promise<Meeting> => {
    // Transform frontend DTO to backend format
    const backendData = {
      title: data.title,
      description: data.description,
      platform: data.type?.toUpperCase() || 'ZOOM',
      scheduledStart: data.startTime,
      scheduledEnd: data.endTime,
      meetingUrl: data.meetingLink,
      accountId: data.accountId,
      opportunityId: data.opportunityId,
      leadId: data.leadId,
    };
    const response = await client.post<any>('/meetings', backendData);
    return transformMeeting(response.data);
  },

  /**
   * Update a meeting
   */
  update: async (id: string, data: UpdateMeetingDto): Promise<Meeting> => {
    // Transform frontend DTO to backend format
    const backendData: any = {};
    if (data.title) backendData.title = data.title;
    if (data.description) backendData.description = data.description;
    if (data.type) backendData.platform = data.type.toUpperCase();
    if (data.startTime) backendData.scheduledStart = data.startTime;
    if (data.endTime) backendData.scheduledEnd = data.endTime;
    if (data.meetingLink) backendData.meetingUrl = data.meetingLink;
    if (data.status) backendData.status = data.status;

    const response = await client.patch<any>(`/meetings/${id}`, backendData);
    return transformMeeting(response.data);
  },

  /**
   * Delete a meeting
   */
  delete: async (id: string): Promise<void> => {
    await client.delete(`/meetings/${id}`);
  },

  /**
   * Get meeting analysis (AI-generated)
   */
  getAnalysis: async (id: string): Promise<MeetingAnalysis> => {
    const response = await client.get<MeetingAnalysis>(`/meetings/${id}/analysis`);
    return response.data;
  },

  /**
   * Get meeting insights (AI-generated)
   */
  getInsights: async (id: string): Promise<MeetingInsights> => {
    const response = await client.get<MeetingInsights>(`/meetings/${id}/insights`);
    return response.data;
  },
};

export default meetingsApi;
