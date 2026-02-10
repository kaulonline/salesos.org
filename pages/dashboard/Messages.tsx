import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, Hash, Lock, Users, Send, MoreHorizontal, Smile, Pin, Edit2, Trash2, X, ChevronDown } from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';
import { Card } from '../../components/ui/Card';
import { useTeamChannels, useChannelMessages, useDirectConversations, useDirectMessages, useUserSearch } from '../../src/hooks/useTeamMessages';
import { useAuth } from '../../src/context/AuthContext';
import type { TeamChannel, DirectConversation, TeamMessage, TeamUser, TeamChannelType } from '../../src/api/teamMessages';
import { formatDistanceToNow } from 'date-fns';

type ViewMode = 'channels' | 'direct';
type SelectedItem = { type: 'channel'; id: string } | { type: 'direct'; id: string; userId: string };

// Create Channel Modal
const CreateChannelModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string, type: TeamChannelType) => Promise<void>;
}> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TeamChannelType>('PUBLIC');
  const [creating, setCreating] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await onCreate(name.trim(), description.trim(), type);
      setName('');
      setDescription('');
      setType('PUBLIC');
      onClose();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 pb-4 shrink-0">
          <h2 className="text-xl font-semibold">Create Channel</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 overflow-y-auto flex-1 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Channel Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., general, sales-team"
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EAD07D] focus:border-transparent"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this channel about?"
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EAD07D] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Channel Type</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setType('PUBLIC')}
                  className={`flex-1 py-2 px-4 rounded-xl border text-sm font-medium transition-colors ${
                    type === 'PUBLIC' ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <Hash size={14} className="inline mr-1" /> Public
                </button>
                <button
                  type="button"
                  onClick={() => setType('PRIVATE')}
                  className={`flex-1 py-2 px-4 rounded-xl border text-sm font-medium transition-colors ${
                    type === 'PRIVATE' ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <Lock size={14} className="inline mr-1" /> Private
                </button>
              </div>
            </div>
          </div>
          <div className="p-6 pt-4 flex gap-3 shrink-0">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || creating}
              className="flex-1 py-2.5 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-black transition-colors disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// User Search for DMs
const UserSearchModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSelect: (user: TeamUser) => void;
}> = ({ isOpen, onClose, onSelect }) => {
  const [query, setQuery] = useState('');
  const { search, results, searching } = useUserSearch();

  useEffect(() => {
    if (query.length >= 2) {
      search(query);
    }
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 pb-4 shrink-0">
          <h2 className="text-xl font-semibold">New Message</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <div className="px-6 pb-4 shrink-0">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EAD07D] focus:border-transparent"
              autoFocus
            />
          </div>
        </div>
        <div className="px-6 pb-6 overflow-y-auto flex-1">
          {searching ? (
            <div className="py-8 text-center text-gray-500">Searching...</div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              {query.length < 2 ? 'Type to search for team members' : 'No users found'}
            </div>
          ) : (
            results.map((user) => (
              <button
                key={user.id}
                onClick={() => { onSelect(user); onClose(); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#EAD07D] to-[#E5C973] flex items-center justify-center font-bold text-[#1A1A1A]">
                  {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="font-medium text-[#1A1A1A]">{user.name || 'Unnamed User'}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Message Component
const MessageItem: React.FC<{
  message: TeamMessage;
  currentUserId: string;
  onDelete: (id: string) => void;
}> = ({ message, currentUserId, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);
  const isOwnMessage = message.senderId === currentUserId;
  const timeAgo = formatDistanceToNow(new Date(message.createdAt), { addSuffix: true });

  return (
    <div className="group flex gap-3 px-4 py-2 hover:bg-gray-50/50 transition-colors">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#EAD07D] to-[#E5C973] flex items-center justify-center font-bold text-[#1A1A1A] text-sm flex-shrink-0">
        {message.sender.name?.[0]?.toUpperCase() || message.sender.email[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-[#1A1A1A] text-sm">{message.sender.name || message.sender.email}</span>
          <span className="text-xs text-gray-400">{timeAgo}</span>
          {message.isEdited && <span className="text-xs text-gray-400">(edited)</span>}
          {message.isPinned && <Pin size={12} className="text-[#EAD07D]" />}
        </div>
        <p className="text-[#1A1A1A] text-sm whitespace-pre-wrap break-words">{message.content}</p>
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className="flex gap-1 mt-1">
            {Object.entries(message.reactions).map(([emoji, users]) => (
              <span key={emoji} className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">
                {emoji} {users.length}
              </span>
            ))}
          </div>
        )}
      </div>
      {isOwnMessage && (
        <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          >
            <MoreHorizontal size={16} />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                <button
                  onClick={() => { onDelete(message.id); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// Message Composer
const MessageComposer: React.FC<{
  onSend: (content: string) => Promise<void>;
  placeholder?: string;
  sending?: boolean;
}> = ({ onSend, placeholder = 'Type a message...', sending }) => {
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sending) return;
    await onSend(message.trim());
    setMessage('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-gray-100 p-4">
      <div className="flex items-end gap-2">
        <div className="flex-1 bg-gray-50 rounded-xl border border-gray-200 focus-within:border-[#EAD07D] focus-within:ring-2 focus-within:ring-[#EAD07D]/20 transition-all">
          <textarea
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="w-full px-4 py-3 bg-transparent resize-none focus:outline-none text-sm"
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
        </div>
        <button
          type="submit"
          disabled={!message.trim() || sending}
          className="w-10 h-10 flex items-center justify-center bg-[#1A1A1A] text-white rounded-xl hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={18} />
        </button>
      </div>
    </form>
  );
};

export const Messages: React.FC = () => {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('channels');
  const [selected, setSelected] = useState<SelectedItem | null>(null);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { myChannels, discoverable, loading: channelsLoading, createChannel, joinChannel } = useTeamChannels();
  const { conversations, loading: conversationsLoading, startConversation } = useDirectConversations();

  const {
    messages: channelMessages,
    channel,
    loading: channelMessagesLoading,
    sendMessage: sendChannelMessage,
    deleteMessage: deleteChannelMessage,
    sending: sendingChannelMessage,
  } = useChannelMessages(selected?.type === 'channel' ? selected.id : undefined);

  const {
    messages: directMessages,
    conversation,
    loading: directMessagesLoading,
    sendMessage: sendDirectMessage,
    sending: sendingDirectMessage,
  } = useDirectMessages(selected?.type === 'direct' ? selected.id : undefined);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [channelMessages, directMessages]);

  const handleCreateChannel = async (name: string, description: string, type: TeamChannelType) => {
    const newChannel = await createChannel({ name, description, type });
    setSelected({ type: 'channel', id: newChannel.id });
  };

  const handleStartDM = async (targetUser: TeamUser) => {
    const conv = await startConversation(targetUser.id);
    setSelected({ type: 'direct', id: conv.id, userId: targetUser.id });
    setViewMode('direct');
  };

  const handleSendMessage = async (content: string) => {
    if (selected?.type === 'channel') {
      await sendChannelMessage(content);
    } else if (selected?.type === 'direct') {
      await sendDirectMessage(content, selected.userId);
    }
  };

  const isLoading = channelsLoading || conversationsLoading;

  if (isLoading) {
    return (
      <div className="h-[calc(100dvh-200px)]" style={{ minHeight: 'calc(100vh - 200px)' }}>
        <Skeleton className="h-10 w-48 mb-4" />
        <Skeleton className="h-full rounded-[2rem]" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-200px)] animate-in fade-in duration-500" style={{ minHeight: 'calc(100vh - 200px)' }}>
      <div className="mb-6">
        <h1 className="text-4xl font-medium text-[#1A1A1A]">Messages</h1>
        <p className="text-[#666] mt-1">Team communication and collaboration</p>
      </div>

      <Card className="h-[calc(100%-80px)] flex overflow-hidden">
        {/* Sidebar - hidden on mobile when conversation is selected */}
        <div className={`${selected && !showMobileSidebar ? 'hidden md:flex' : 'flex'} w-full md:w-64 border-r border-gray-100 flex-col shrink-0`}>
          {/* View Toggle */}
          <div className="p-3 border-b border-gray-100">
            <div className="flex bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('channels')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  viewMode === 'channels' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Channels
              </button>
              <button
                onClick={() => setViewMode('direct')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  viewMode === 'direct' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Direct
              </button>
            </div>
          </div>

          {/* Add Button */}
          <div className="p-3 border-b border-gray-100">
            <button
              onClick={() => viewMode === 'channels' ? setShowCreateChannel(true) : setShowNewDM(true)}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-[#1A1A1A] border border-dashed border-gray-300 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-colors"
            >
              <Plus size={16} />
              {viewMode === 'channels' ? 'New Channel' : 'New Message'}
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {viewMode === 'channels' ? (
              <>
                {myChannels.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    No channels yet. Create one to get started!
                  </div>
                ) : (
                  myChannels.map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => { setSelected({ type: 'channel', id: ch.id }); setShowMobileSidebar(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                        selected?.type === 'channel' && selected.id === ch.id ? 'bg-[#EAD07D]/10' : ''
                      }`}
                    >
                      {ch.type === 'PRIVATE' ? (
                        <Lock size={16} className="text-gray-400" />
                      ) : (
                        <Hash size={16} className="text-gray-400" />
                      )}
                      <span className="font-medium text-sm truncate">{ch.name}</span>
                    </button>
                  ))
                )}
                {discoverable.length > 0 && (
                  <>
                    <div className="px-3 py-2 text-xs font-medium text-gray-400 uppercase">Discover</div>
                    {discoverable.map((ch) => (
                      <button
                        key={ch.id}
                        onClick={() => joinChannel(ch.id).then(() => setSelected({ type: 'channel', id: ch.id }))}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
                      >
                        <Hash size={16} className="text-gray-400" />
                        <span className="text-sm truncate text-gray-600">{ch.name}</span>
                      </button>
                    ))}
                  </>
                )}
              </>
            ) : (
              <>
                {conversations.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    No conversations yet. Start a new message!
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => { setSelected({ type: 'direct', id: conv.id, userId: conv.otherUser.id }); setShowMobileSidebar(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                        selected?.type === 'direct' && selected.id === conv.id ? 'bg-[#EAD07D]/10' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#EAD07D] to-[#E5C973] flex items-center justify-center font-bold text-[#1A1A1A] text-xs">
                        {conv.otherUser.name?.[0]?.toUpperCase() || conv.otherUser.email[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{conv.otherUser.name || conv.otherUser.email}</p>
                        {conv.lastMessage && (
                          <p className="text-xs text-gray-500 truncate">{conv.lastMessage.content}</p>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </>
            )}
          </div>
        </div>

        {/* Main Content - hidden on mobile when sidebar is shown */}
        <div className={`${!selected || showMobileSidebar ? 'hidden md:flex' : 'flex'} flex-1 flex-col`}>
          {selected ? (
            <>
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowMobileSidebar(true)}
                    className="md:hidden p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg mr-1"
                  >
                    <ChevronDown size={18} className="rotate-90" />
                  </button>
                  {selected.type === 'channel' ? (
                    <>
                      {channel?.type === 'PRIVATE' ? <Lock size={18} /> : <Hash size={18} />}
                      <span className="font-semibold">{channel?.name}</span>
                      <span className="text-sm text-gray-500">{channel?.members.length} members</span>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#EAD07D] to-[#E5C973] flex items-center justify-center font-bold text-[#1A1A1A] text-xs">
                        {conversation?.otherUser.name?.[0]?.toUpperCase() || conversation?.otherUser.email[0].toUpperCase()}
                      </div>
                      <span className="font-semibold">{conversation?.otherUser.name || conversation?.otherUser.email}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto">
                {(selected.type === 'channel' ? channelMessagesLoading : directMessagesLoading) ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-6 h-6 border-2 border-[#EAD07D] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (selected.type === 'channel' ? channelMessages : directMessages).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <Users size={48} className="text-gray-300 mb-3" />
                    <p>No messages yet</p>
                    <p className="text-sm">Start the conversation!</p>
                  </div>
                ) : (
                  <div className="py-2">
                    {(selected.type === 'channel' ? channelMessages : directMessages).map((msg) => (
                      <MessageItem
                        key={msg.id}
                        message={msg}
                        currentUserId={user?.id || ''}
                        onDelete={selected.type === 'channel' ? deleteChannelMessage : () => {}}
                      />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Composer */}
              <MessageComposer
                onSend={handleSendMessage}
                placeholder={selected.type === 'channel' ? `Message #${channel?.name}` : `Message ${conversation?.otherUser.name || conversation?.otherUser.email}`}
                sending={selected.type === 'channel' ? sendingChannelMessage : sendingDirectMessage}
              />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
              <Users size={64} className="text-gray-300 mb-4" />
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm">Choose a channel or start a new message</p>
            </div>
          )}
        </div>
      </Card>

      {/* Modals */}
      <CreateChannelModal
        isOpen={showCreateChannel}
        onClose={() => setShowCreateChannel(false)}
        onCreate={handleCreateChannel}
      />
      <UserSearchModal
        isOpen={showNewDM}
        onClose={() => setShowNewDM(false)}
        onSelect={handleStartDM}
      />
    </div>
  );
};
