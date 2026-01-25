import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Send,
  X,
  Sparkles,
  User,
  Bot,
  Loader2,
  AlertCircle,
  MessageSquare,
  Minus,
  Maximize2
} from 'lucide-react';
import { useChat } from '../src/hooks/useChat';

export const FloatingChat: React.FC = () => {
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
    clearCurrentConversation,
  } = useChat();

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showConversations, setShowConversations] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchConversations();
    }
  }, [isOpen, fetchConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim() || streaming) return;

    const content = inputValue.trim();
    setInputValue('');

    if (!currentConversation) {
      // Create conversation first, then send the message with the new conversation ID
      const newConversation = await createConversation();
      if (newConversation) {
        // Pass the conversation ID directly to avoid state timing issues
        await sendMessage(content, newConversation.id);
      }
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
    setShowConversations(false);
    inputRef.current?.focus();
  };

  const handleSelectConversation = async (id: string) => {
    await selectConversation(id);
    setShowConversations(false);
  };

  const toggleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setShowConversations(false);
    }
  };

  // Sizes based on expanded state
  const chatWidth = isExpanded ? 'w-[500px]' : 'w-[380px]';
  const chatHeight = isExpanded ? 'h-[600px]' : 'h-[500px]';

  return (
    <>
      {/* Floating Chat Panel */}
      <div
        className={`fixed bottom-24 right-6 z-50 transition-all duration-300 ease-out ${
          isOpen
            ? `opacity-100 translate-y-0 ${chatWidth} ${chatHeight}`
            : 'opacity-0 translate-y-4 w-0 h-0 pointer-events-none'
        }`}
      >
        <div className="w-full h-full bg-white rounded-3xl shadow-2xl border border-black/5 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-[#1A1A1A] to-[#2D2D2D] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#EAD07D] to-[#D4BC5E] flex items-center justify-center shadow-lg">
                <Sparkles size={20} className="text-[#1A1A1A]" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">IRIS Assistant</h3>
                <p className="text-[10px] text-white/60">AI-powered sales intelligence</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowConversations(!showConversations)}
                className={`p-2 rounded-xl transition-all ${
                  showConversations
                    ? 'bg-[#EAD07D] text-[#1A1A1A]'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
                title="Conversations"
              >
                <MessageSquare size={16} />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all"
                title={isExpanded ? 'Minimize' : 'Expand'}
              >
                {isExpanded ? <Minus size={16} /> : <Maximize2 size={16} />}
              </button>
              <button
                onClick={toggleOpen}
                className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Conversations Panel */}
          {showConversations && (
            <div className="absolute top-[72px] left-0 right-0 bottom-0 bg-white z-10 flex flex-col animate-in slide-in-from-left-2 duration-200">
              <div className="p-4 border-b border-black/5 flex items-center justify-between">
                <h4 className="font-semibold text-[#1A1A1A] text-sm">Conversations</h4>
                <button
                  onClick={handleNewChat}
                  className="px-3 py-1.5 rounded-xl bg-[#1A1A1A] text-white text-xs font-medium hover:bg-black transition-colors"
                >
                  New Chat
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {loading && conversations.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={20} className="animate-spin text-[#999]" />
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="text-center py-8 text-[#666]">
                    <MessageSquare size={24} className="mx-auto mb-2 opacity-30" />
                    <p className="text-xs">No conversations yet</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {conversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => handleSelectConversation(conv.id)}
                        className={`w-full p-3 rounded-xl text-left transition-all ${
                          currentConversation?.id === conv.id
                            ? 'bg-[#EAD07D]/20 border border-[#EAD07D]/30'
                            : 'hover:bg-[#F8F8F6]'
                        }`}
                      >
                        <p className="font-medium text-[#1A1A1A] text-sm truncate">
                          {conv.title || 'New Conversation'}
                        </p>
                        <p className="text-[10px] text-[#999] mt-0.5">
                          {conv.lastMessageAt
                            ? new Date(conv.lastMessageAt).toLocaleDateString()
                            : 'No messages'}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center px-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#EAD07D]/20 to-[#EAD07D]/10 flex items-center justify-center mx-auto mb-4">
                    <Sparkles size={24} className="text-[#EAD07D]" />
                  </div>
                  <h4 className="font-semibold text-[#1A1A1A] text-sm mb-1">How can I help?</h4>
                  <p className="text-[#666] text-xs mb-4">
                    Ask me about deals, leads, or sales insights
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      'Analyze pipeline',
                      'Score leads',
                      'Draft email',
                      'Meeting prep'
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setInputValue(suggestion)}
                        className="p-2.5 rounded-xl bg-[#F8F8F6] text-xs text-[#666] hover:bg-[#EAD07D]/20 hover:text-[#1A1A1A] transition-all text-left"
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
                    className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        message.role === 'user'
                          ? 'bg-[#1A1A1A]'
                          : 'bg-gradient-to-br from-[#EAD07D] to-[#D4BC5E]'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <User size={14} className="text-white" />
                      ) : (
                        <Bot size={14} className="text-[#1A1A1A]" />
                      )}
                    </div>
                    <div className={`flex-1 max-w-[85%] ${message.role === 'user' ? 'text-right' : ''}`}>
                      <div
                        className={`inline-block px-4 py-3 rounded-2xl ${
                          message.role === 'user'
                            ? 'bg-[#1A1A1A] text-white rounded-br-md'
                            : 'bg-[#F8F8F6] text-[#1A1A1A] rounded-bl-md'
                        }`}
                      >
                        {message.role === 'assistant' ? (
                          <div className="prose prose-sm max-w-none text-sm leading-relaxed prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-strong:text-[#1A1A1A] prose-headings:text-[#1A1A1A] prose-headings:font-semibold prose-h2:mt-5 prose-h2:mb-2 prose-h2:text-base prose-h3:mt-4 prose-h3:mb-2 prose-h3:text-sm prose-h4:mt-3 prose-h4:mb-1 prose-hr:my-4 prose-hr:border-black/10">
                            <ReactMarkdown>
                              {message.content || (streaming ? '...' : '')}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">
                            {message.content}
                          </p>
                        )}
                      </div>
                      <p className="text-[9px] text-[#999] mt-1 px-1">
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
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
            <div className="mx-4 mb-2 p-2.5 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-xs">
              <AlertCircle size={14} />
              <span className="truncate">{error}</span>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t border-black/5 bg-[#FAFAF8]">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything..."
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-black/5 focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm transition-all placeholder:text-[#999]"
                  disabled={streaming}
                />
              </div>
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || streaming}
                className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#1A1A1A] to-[#2D2D2D] text-white flex items-center justify-center hover:from-black hover:to-[#1A1A1A] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-black/20"
              >
                {streaming ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={toggleOpen}
        className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ease-out ${
          isOpen
            ? 'scale-0 opacity-0'
            : 'scale-100 opacity-100 hover:scale-110'
        }`}
      >
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#EAD07D] to-[#D4BC5E] rounded-2xl blur-lg opacity-40 animate-pulse" />

          {/* Button */}
          <div className="relative w-14 h-14 bg-gradient-to-br from-[#1A1A1A] to-[#2D2D2D] rounded-2xl flex items-center justify-center shadow-2xl shadow-black/30 border border-white/10">
            <Sparkles size={24} className="text-[#EAD07D]" />
          </div>

          {/* Notification dot */}
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-[#EAD07D] to-[#D4BC5E] rounded-full border-2 border-white flex items-center justify-center">
            <span className="text-[8px] font-bold text-[#1A1A1A]">AI</span>
          </div>
        </div>
      </button>
    </>
  );
};

export default FloatingChat;
