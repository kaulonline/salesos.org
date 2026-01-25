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
   * Uses fetch with POST for SSE streaming
   * Backend SSE format: { type: 'text'|'done'|'error', text?: string, assistantMessageId?: string, error?: string }
   */
  streamMessage: async (
    conversationId: string,
    content: string,
    onChunk: (data: {
      type: string;
      text?: string;
      assistantMessageId?: string;
      error?: string;
      suggestedFollowUps?: string[];
    }) => void,
    onError: (error: Error) => void
  ): Promise<void> => {
    const token = localStorage.getItem('token');
    const baseUrl = import.meta.env.VITE_API_URL || '/api';
    const url = `${baseUrl}/conversations/${conversationId}/messages/stream`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              onChunk(data);
              if (data.type === 'done' || data.type === 'error') {
                return;
              }
            } catch {
              // Ignore parse errors for keepalive messages
            }
          }
        }
      }
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Stream failed'));
    }
  },

  /**
   * Delete a conversation
   */
  delete: async (id: string): Promise<void> => {
    await client.delete(`/conversations/${id}`);
  },
};

export default conversationsApi;
