import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamMessagesApi } from '../api/teamMessages';
import type { CreateChannelDto, UpdateChannelDto, SendMessageDto } from '../api/teamMessages';

// Query keys
export const teamMessagesKeys = {
  all: ['teamMessages'] as const,
  channels: () => [...teamMessagesKeys.all, 'channels'] as const,
  channel: (id: string) => [...teamMessagesKeys.all, 'channel', id] as const,
  channelMessages: (id: string, page?: number) => [...teamMessagesKeys.all, 'channelMessages', id, page] as const,
  conversations: () => [...teamMessagesKeys.all, 'conversations'] as const,
  conversation: (id: string) => [...teamMessagesKeys.all, 'conversation', id] as const,
  directMessages: (id: string, page?: number) => [...teamMessagesKeys.all, 'directMessages', id, page] as const,
};

export function useTeamChannels() {
  const queryClient = useQueryClient();

  const channelsQuery = useQuery({
    queryKey: teamMessagesKeys.channels(),
    queryFn: () => teamMessagesApi.getChannels(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateChannelDto) => teamMessagesApi.createChannel(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamMessagesKeys.channels() });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateChannelDto }) =>
      teamMessagesApi.updateChannel(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamMessagesKeys.channels() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => teamMessagesApi.deleteChannel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamMessagesKeys.channels() });
    },
  });

  const joinMutation = useMutation({
    mutationFn: (id: string) => teamMessagesApi.joinChannel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamMessagesKeys.channels() });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: (id: string) => teamMessagesApi.leaveChannel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamMessagesKeys.channels() });
    },
  });

  return {
    myChannels: channelsQuery.data?.myChannels || [],
    discoverable: channelsQuery.data?.discoverable || [],
    loading: channelsQuery.isLoading,
    error: channelsQuery.error,

    createChannel: createMutation.mutateAsync,
    updateChannel: (id: string, data: UpdateChannelDto) => updateMutation.mutateAsync({ id, data }),
    deleteChannel: deleteMutation.mutateAsync,
    joinChannel: joinMutation.mutateAsync,
    leaveChannel: leaveMutation.mutateAsync,

    creating: createMutation.isPending,
    updating: updateMutation.isPending,
    deleting: deleteMutation.isPending,

    refetch: channelsQuery.refetch,
  };
}

export function useChannelMessages(channelId: string | undefined, page = 1) {
  const queryClient = useQueryClient();

  const messagesQuery = useQuery({
    queryKey: teamMessagesKeys.channelMessages(channelId || '', page),
    queryFn: () => teamMessagesApi.getChannelMessages(channelId!, page),
    enabled: !!channelId,
  });

  const sendMutation = useMutation({
    mutationFn: (data: SendMessageDto) => teamMessagesApi.sendMessage(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamMessagesKeys.channelMessages(channelId || '') });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (messageId: string) => teamMessagesApi.deleteMessage(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamMessagesKeys.channelMessages(channelId || '') });
    },
  });

  const reactionMutation = useMutation({
    mutationFn: ({ messageId, emoji, add }: { messageId: string; emoji: string; add: boolean }) =>
      add ? teamMessagesApi.addReaction(messageId, emoji) : teamMessagesApi.removeReaction(messageId, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamMessagesKeys.channelMessages(channelId || '') });
    },
  });

  return {
    messages: messagesQuery.data?.messages || [],
    channel: messagesQuery.data?.channel,
    total: messagesQuery.data?.total || 0,
    totalPages: messagesQuery.data?.totalPages || 1,
    loading: messagesQuery.isLoading,
    error: messagesQuery.error,

    sendMessage: (content: string, parentId?: string) =>
      sendMutation.mutateAsync({ content, channelId, parentId }),
    deleteMessage: deleteMutation.mutateAsync,
    toggleReaction: (messageId: string, emoji: string, add: boolean) =>
      reactionMutation.mutateAsync({ messageId, emoji, add }),

    sending: sendMutation.isPending,
    refetch: messagesQuery.refetch,
  };
}

export function useDirectConversations() {
  const queryClient = useQueryClient();

  const conversationsQuery = useQuery({
    queryKey: teamMessagesKeys.conversations(),
    queryFn: () => teamMessagesApi.getDirectConversations(),
  });

  const createMutation = useMutation({
    mutationFn: (userId: string) => teamMessagesApi.getOrCreateDirectConversation(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamMessagesKeys.conversations() });
    },
  });

  return {
    conversations: conversationsQuery.data || [],
    loading: conversationsQuery.isLoading,
    error: conversationsQuery.error,

    startConversation: createMutation.mutateAsync,
    starting: createMutation.isPending,

    refetch: conversationsQuery.refetch,
  };
}

export function useDirectMessages(conversationId: string | undefined, page = 1) {
  const queryClient = useQueryClient();

  const messagesQuery = useQuery({
    queryKey: teamMessagesKeys.directMessages(conversationId || '', page),
    queryFn: () => teamMessagesApi.getDirectMessages(conversationId!, page),
    enabled: !!conversationId,
  });

  const sendMutation = useMutation({
    mutationFn: (data: SendMessageDto) => teamMessagesApi.sendMessage(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamMessagesKeys.directMessages(conversationId || '') });
      queryClient.invalidateQueries({ queryKey: teamMessagesKeys.conversations() });
    },
  });

  return {
    messages: messagesQuery.data?.messages || [],
    conversation: messagesQuery.data?.conversation,
    total: messagesQuery.data?.total || 0,
    totalPages: messagesQuery.data?.totalPages || 1,
    loading: messagesQuery.isLoading,
    error: messagesQuery.error,

    sendMessage: (content: string, directUserId: string) =>
      sendMutation.mutateAsync({ content, directUserId }),

    sending: sendMutation.isPending,
    refetch: messagesQuery.refetch,
  };
}

export function useUserSearch() {
  const searchMutation = useMutation({
    mutationFn: (query: string) => teamMessagesApi.searchUsers(query),
  });

  return {
    search: searchMutation.mutateAsync,
    results: searchMutation.data || [],
    searching: searchMutation.isPending,
  };
}
