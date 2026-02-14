import { useState, useCallback, useRef } from 'react';
import { conversationsApi } from '../api/conversations';
import type { Conversation, Message, CreateConversationDto } from '../types';

interface UseChatReturn {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  streaming: boolean;
  error: string | null;
  fetchConversations: () => Promise<void>;
  createConversation: (data?: CreateConversationDto) => Promise<Conversation>;
  selectConversation: (id: string) => Promise<void>;
  sendMessage: (content: string, conversationId?: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  clearCurrentConversation: () => void;
}

export function useChat(): UseChatReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await conversationsApi.getAll();
      setConversations(data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message || e.message || 'Failed to fetch conversations');
    } finally {
      setLoading(false);
    }
  }, []);

  const createConversation = useCallback(async (data?: CreateConversationDto): Promise<Conversation> => {
    const conversation = await conversationsApi.create(data || {});
    setConversations((prev) => [conversation, ...prev]);
    setCurrentConversation(conversation);
    setMessages(conversation.messages || []);
    return conversation;
  }, []);

  const selectConversation = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const conversation = await conversationsApi.getById(id);
      setCurrentConversation(conversation);
      setMessages(conversation.messages || []);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message || e.message || 'Failed to load conversation');
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (content: string, conversationId?: string) => {
    // Use provided conversationId or fall back to currentConversation
    const targetConversationId = conversationId || currentConversation?.id;

    if (!targetConversationId) {
      setError('No conversation selected');
      return;
    }

    // Add user message to UI immediately
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId: targetConversationId,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Create placeholder for assistant response
    const assistantMessageId = `temp-assistant-${Date.now()}`;
    const assistantMessage: Message = {
      id: assistantMessageId,
      conversationId: targetConversationId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    setStreaming(true);
    setError(null);

    try {
      // Use streaming endpoint with callbacks
      // Backend SSE format: { type: 'start'|'text'|'done'|'error', text?: string, assistantMessageId?: string }
      await conversationsApi.streamMessage(
        targetConversationId,
        content,
        // onChunk callback
        (data) => {
          // Handle text chunks
          if (data.type === 'text' && data.text) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId
                  ? { ...m, content: m.content + data.text }
                  : m
              )
            );
          }
          // Handle completion
          if (data.type === 'done') {
            setStreaming(false);
            // Update message ID with the real one from backend
            if (data.assistantMessageId) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId
                    ? { ...m, id: data.assistantMessageId! }
                    : m
                )
              );
            }
          }
          // Handle errors from backend
          if (data.type === 'error') {
            setStreaming(false);
            setError(data.error || 'An error occurred');
          }
        },
        // onError callback (network/fetch errors)
        (err) => {
          setStreaming(false);
          setError(err.message || 'Connection lost. Please try again.');
        }
      );
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message || e.message || 'Failed to send message');
      setStreaming(false);
      // Remove the empty assistant message on error
      setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId));
    }
  }, [currentConversation]);

  const deleteConversation = useCallback(async (id: string) => {
    await conversationsApi.delete(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (currentConversation?.id === id) {
      setCurrentConversation(null);
      setMessages([]);
    }
  }, [currentConversation]);

  const clearCurrentConversation = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setCurrentConversation(null);
    setMessages([]);
    setStreaming(false);
  }, []);

  return {
    conversations,
    currentConversation,
    messages,
    loading,
    streaming,
    error,
    fetchConversations,
    createConversation,
    selectConversation,
    sendMessage,
    deleteConversation,
    clearCurrentConversation,
  };
}
