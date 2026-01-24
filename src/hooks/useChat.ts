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
  sendMessage: (content: string) => Promise<void>;
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
  const eventSourceRef = useRef<EventSource | null>(null);

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

  const sendMessage = useCallback(async (content: string) => {
    if (!currentConversation) {
      setError('No conversation selected');
      return;
    }

    // Add user message to UI immediately
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId: currentConversation.id,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Create placeholder for assistant response
    const assistantMessageId = `temp-assistant-${Date.now()}`;
    const assistantMessage: Message = {
      id: assistantMessageId,
      conversationId: currentConversation.id,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    setStreaming(true);
    setError(null);

    try {
      // Use streaming endpoint
      const eventSource = conversationsApi.streamMessage(currentConversation.id, content);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.delta) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId
                  ? { ...m, content: m.content + data.delta }
                  : m
              )
            );
          }
          if (data.done) {
            eventSource.close();
            eventSourceRef.current = null;
            setStreaming(false);
            // Update message with final content if provided
            if (data.fullContent) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId
                    ? { ...m, content: data.fullContent, id: data.id || m.id }
                    : m
                )
              );
            }
          }
        } catch {
          // Ignore parse errors for keepalive messages
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        eventSourceRef.current = null;
        setStreaming(false);
        // If we got some content, don't show error
        const assistantMsg = messages.find((m) => m.id === assistantMessageId);
        if (!assistantMsg || !assistantMsg.content) {
          setError('Connection lost. Please try again.');
        }
      };
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message || e.message || 'Failed to send message');
      setStreaming(false);
      // Remove the empty assistant message on error
      setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId));
    }
  }, [currentConversation, messages]);

  const deleteConversation = useCallback(async (id: string) => {
    await conversationsApi.delete(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (currentConversation?.id === id) {
      setCurrentConversation(null);
      setMessages([]);
    }
  }, [currentConversation]);

  const clearCurrentConversation = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
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
