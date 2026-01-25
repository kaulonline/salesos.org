import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Plus,
  MessageSquare,
  Trash2,
  Sparkles,
  User,
  Bot,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { useChat } from '../../src/hooks/useChat';
import { FeatureGate, Features } from '../../src/components/FeatureGate';

export const AIChat: React.FC = () => {
  const {
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
  } = useChat();

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || streaming) return;

    const content = inputValue.trim();
    setInputValue('');

    if (!currentConversation) {
      const conv = await createConversation({ initialMessage: content });
      // Message will be sent after conversation is created
    } else {
      await sendMessage(content);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = async () => {
    clearCurrentConversation();
    await createConversation();
    inputRef.current?.focus();
  };

  return (
    <FeatureGate feature={Features.AI_CHAT}>
    <div className="max-w-7xl mx-auto h-[calc(100vh-140px)] flex gap-6 animate-in fade-in duration-500">
      {/* Sidebar - Conversations List */}
      <div className="w-80 flex-shrink-0 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#1A1A1A]">Conversations</h2>
          <button
            onClick={handleNewChat}
            className="p-2 rounded-xl bg-[#1A1A1A] text-white hover:bg-black transition-colors"
          >
            <Plus size={18} />
          </button>
        </div>

        <Card className="flex-1 overflow-hidden flex flex-col p-0">
          {loading && conversations.length === 0 ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-4 text-center text-[#666]">
              <div>
                <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs mt-1">Start a new chat to get started</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`p-3 rounded-xl cursor-pointer transition-all group ${
                    currentConversation?.id === conv.id
                      ? 'bg-[#EAD07D]/20'
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => selectConversation(conv.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-[#1A1A1A] truncate text-sm">
                        {conv.title || 'New Conversation'}
                      </h4>
                      <p className="text-xs text-[#666] truncate mt-1">
                        {conv.lastMessageAt
                          ? new Date(conv.lastMessageAt).toLocaleDateString()
                          : 'No messages'}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conv.id);
                      }}
                      className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-100 text-[#999] hover:text-red-600 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col overflow-hidden p-0">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#EAD07D] to-[#D4C06D] flex items-center justify-center">
            <Sparkles size={20} className="text-[#1A1A1A]" />
          </div>
          <div>
            <h1 className="font-bold text-[#1A1A1A]">IRIS Sales Assistant</h1>
            <p className="text-xs text-[#666]">AI-powered sales intelligence</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 rounded-2xl bg-[#EAD07D]/20 flex items-center justify-center mx-auto mb-4">
                  <Sparkles size={32} className="text-[#EAD07D]" />
                </div>
                <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">How can I help you today?</h3>
                <p className="text-[#666] text-sm mb-6">
                  I can help you analyze deals, score leads, draft emails, prepare for meetings, and provide sales insights.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    'Analyze my pipeline',
                    'Score my top leads',
                    'Draft a follow-up email',
                    'Prepare for a meeting'
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInputValue(suggestion)}
                      className="p-3 rounded-xl bg-[#F8F8F6] text-sm text-[#666] hover:bg-[#EAD07D]/20 hover:text-[#1A1A1A] transition-all text-left"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    message.role === 'user'
                      ? 'bg-[#1A1A1A]'
                      : 'bg-gradient-to-br from-[#EAD07D] to-[#D4C06D]'
                  }`}>
                    {message.role === 'user' ? (
                      <User size={16} className="text-white" />
                    ) : (
                      <Bot size={16} className="text-[#1A1A1A]" />
                    )}
                  </div>
                  <div className={`flex-1 max-w-[80%] ${message.role === 'user' ? 'text-right' : ''}`}>
                    <div className={`inline-block p-4 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-[#1A1A1A] text-white'
                        : 'bg-[#F8F8F6] text-[#1A1A1A]'
                    }`}>
                      <p className="whitespace-pre-wrap text-sm">{message.content || (streaming && message.role === 'assistant' ? '...' : '')}</p>
                    </div>
                    <p className="text-[10px] text-[#999] mt-1">
                      {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about your sales..."
                className="w-full px-5 py-4 rounded-2xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none pr-12 transition-all"
                disabled={streaming}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || streaming}
              className="w-12 h-12 rounded-xl bg-[#1A1A1A] text-white flex items-center justify-center hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {streaming ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Send size={20} />
              )}
            </button>
          </div>
          <p className="text-[10px] text-[#999] mt-2 text-center">
            IRIS may produce inaccurate information. Verify important details.
          </p>
        </div>
      </Card>
    </div>
    </FeatureGate>
  );
};
