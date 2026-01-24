export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title?: string;
  context?: string;
  leadId?: string;
  contactId?: string;
  accountId?: string;
  opportunityId?: string;
  isActive: boolean;
  lastMessageAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
}

export interface CreateConversationDto {
  title?: string;
  context?: string;
  leadId?: string;
  contactId?: string;
  accountId?: string;
  opportunityId?: string;
  initialMessage?: string;
}

export interface SendMessageDto {
  content: string;
  stream?: boolean;
}

export interface StreamingMessage {
  id: string;
  delta: string;
  done: boolean;
  fullContent?: string;
}
