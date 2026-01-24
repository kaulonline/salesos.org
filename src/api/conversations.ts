import client from './client';
import type {
  Conversation,
  Message,
  CreateConversationDto,
  SendMessageDto,
} from '../types';

export const conversationsApi = {
  /**
   * Get all conversations
   */
  getAll: async (): Promise<Conversation[]> => {
    const response = await client.get<Conversation[]>('/conversations');
    return response.data;
  },

  /**
   * Get a single conversation by ID
   */
  getById: async (id: string): Promise<Conversation> => {
    const response = await client.get<Conversation>(`/conversations/${id}`);
    return response.data;
  },

  /**
   * Create a new conversation
   */
  create: async (data: CreateConversationDto): Promise<Conversation> => {
    const response = await client.post<Conversation>('/conversations', data);
    return response.data;
  },

  /**
   * Send a message in a conversation (non-streaming)
   */
  sendMessage: async (conversationId: string, data: SendMessageDto): Promise<Message> => {
    const response = await client.post<Message>(
      `/conversations/${conversationId}/messages`,
      data
    );
    return response.data;
  },

  /**
   * Send a message and get streaming response
   * Returns an EventSource for SSE streaming
   */
  streamMessage: (conversationId: string, content: string): EventSource => {
    const token = localStorage.getItem('token');
    const baseUrl = import.meta.env.VITE_API_URL || '/api';
    const url = `${baseUrl}/conversations/${conversationId}/messages/stream?content=${encodeURIComponent(content)}&token=${token}`;
    return new EventSource(url);
  },

  /**
   * Delete a conversation
   */
  delete: async (id: string): Promise<void> => {
    await client.delete(`/conversations/${id}`);
  },
};

export default conversationsApi;
