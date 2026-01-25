import client from './client';

// Types
export type TeamChannelType = 'PUBLIC' | 'PRIVATE' | 'ANNOUNCEMENT';

export interface TeamUser {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
}

export interface TeamChannelMember {
  id: string;
  channelId: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: TeamUser;
}

export interface TeamMessage {
  id: string;
  content: string;
  senderId: string;
  channelId?: string;
  directConversationId?: string;
  parentId?: string;
  isEdited: boolean;
  isPinned: boolean;
  attachments?: Array<{ name: string; url: string; type: string }>;
  reactions?: Record<string, string[]>;
  createdAt: string;
  updatedAt: string;
  sender: TeamUser;
  parent?: {
    id: string;
    content: string;
    sender: { id: string; name: string | null };
  };
  replies?: TeamMessage[];
  _count?: { replies: number };
}

export interface TeamChannel {
  id: string;
  name: string;
  description?: string;
  type: TeamChannelType;
  avatar?: string;
  isArchived: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  members: TeamChannelMember[];
  messages?: Array<{
    id: string;
    content: string;
    createdAt: string;
    sender: { id: string; name: string | null };
  }>;
  _count?: { messages: number; members: number };
}

export interface DirectConversation {
  id: string;
  user1Id: string;
  user2Id: string;
  createdAt: string;
  updatedAt: string;
  user1: TeamUser;
  user2: TeamUser;
  otherUser: TeamUser;
  lastMessage?: {
    id: string;
    content: string;
    createdAt: string;
    senderId: string;
  };
}

export interface CreateChannelDto {
  name: string;
  description?: string;
  type?: TeamChannelType;
  memberIds?: string[];
}

export interface UpdateChannelDto {
  name?: string;
  description?: string;
  type?: TeamChannelType;
  isArchived?: boolean;
}

export interface SendMessageDto {
  content: string;
  channelId?: string;
  directUserId?: string;
  parentId?: string;
  attachments?: Array<{ name: string; url: string; type: string }>;
}

export interface ChannelsResponse {
  myChannels: TeamChannel[];
  discoverable: Array<{
    id: string;
    name: string;
    description?: string;
    type: TeamChannelType;
    _count: { members: number; messages: number };
  }>;
}

export interface ChannelMessagesResponse {
  messages: TeamMessage[];
  channel: TeamChannel;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DirectMessagesResponse {
  messages: TeamMessage[];
  conversation: DirectConversation;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const teamMessagesApi = {
  // ==================== CHANNELS ====================

  async getChannels(): Promise<ChannelsResponse> {
    const response = await client.get('/team/channels');
    return response.data;
  },

  async getChannel(id: string): Promise<TeamChannel> {
    const response = await client.get(`/team/channels/${id}`);
    return response.data;
  },

  async createChannel(data: CreateChannelDto): Promise<TeamChannel> {
    const response = await client.post('/team/channels', data);
    return response.data;
  },

  async updateChannel(id: string, data: UpdateChannelDto): Promise<TeamChannel> {
    const response = await client.put(`/team/channels/${id}`, data);
    return response.data;
  },

  async deleteChannel(id: string): Promise<void> {
    await client.delete(`/team/channels/${id}`);
  },

  async joinChannel(id: string): Promise<TeamChannelMember> {
    const response = await client.post(`/team/channels/${id}/join`);
    return response.data;
  },

  async leaveChannel(id: string): Promise<void> {
    await client.post(`/team/channels/${id}/leave`);
  },

  async addChannelMembers(id: string, memberIds: string[]): Promise<TeamChannelMember[]> {
    const response = await client.post(`/team/channels/${id}/members`, { memberIds });
    return response.data;
  },

  async removeChannelMember(channelId: string, userId: string): Promise<void> {
    await client.delete(`/team/channels/${channelId}/members/${userId}`);
  },

  async getChannelMessages(id: string, page = 1, pageSize = 50): Promise<ChannelMessagesResponse> {
    const response = await client.get(`/team/channels/${id}/messages`, {
      params: { page, pageSize },
    });
    return response.data;
  },

  // ==================== DIRECT CONVERSATIONS ====================

  async getDirectConversations(): Promise<DirectConversation[]> {
    const response = await client.get('/team/conversations');
    return response.data;
  },

  async getOrCreateDirectConversation(userId: string): Promise<DirectConversation> {
    const response = await client.post(`/team/conversations/with/${userId}`);
    return response.data;
  },

  async getDirectMessages(conversationId: string, page = 1, pageSize = 50): Promise<DirectMessagesResponse> {
    const response = await client.get(`/team/conversations/${conversationId}/messages`, {
      params: { page, pageSize },
    });
    return response.data;
  },

  // ==================== MESSAGES ====================

  async sendMessage(data: SendMessageDto): Promise<TeamMessage> {
    const response = await client.post('/team/messages', data);
    return response.data;
  },

  async updateMessage(id: string, content: string): Promise<TeamMessage> {
    const response = await client.put(`/team/messages/${id}`, { content });
    return response.data;
  },

  async deleteMessage(id: string): Promise<void> {
    await client.delete(`/team/messages/${id}`);
  },

  async addReaction(messageId: string, emoji: string): Promise<TeamMessage> {
    const response = await client.post(`/team/messages/${messageId}/reactions`, { emoji });
    return response.data;
  },

  async removeReaction(messageId: string, emoji: string): Promise<TeamMessage> {
    const response = await client.delete(`/team/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`);
    return response.data;
  },

  async togglePinMessage(messageId: string): Promise<TeamMessage> {
    const response = await client.post(`/team/messages/${messageId}/pin`);
    return response.data;
  },

  // ==================== SEARCH ====================

  async searchUsers(query: string, limit = 10): Promise<TeamUser[]> {
    const response = await client.get('/team/users/search', {
      params: { q: query, limit },
    });
    return response.data;
  },
};

export default teamMessagesApi;
