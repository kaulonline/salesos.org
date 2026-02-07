import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TeamChannelType, Prisma } from '@prisma/client';
import { CreateChannelDto, UpdateChannelDto, SendMessageDto, UpdateMessageDto } from './dto';

@Injectable()
export class TeamMessagesService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== CHANNELS ====================

  async createChannel(userId: string, dto: CreateChannelDto) {
    const channel = await this.prisma.teamChannel.create({
      data: {
        name: dto.name,
        description: dto.description,
        type: dto.type || TeamChannelType.PUBLIC,
        createdById: userId,
        members: {
          create: [
            { userId, role: 'owner' },
            ...(dto.memberIds || []).filter(id => id !== userId).map(id => ({
              userId: id,
              role: 'member',
            })),
          ],
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
      },
    });

    return channel;
  }

  async updateChannel(channelId: string, userId: string, dto: UpdateChannelDto) {
    await this.verifyChannelPermission(channelId, userId, ['owner', 'admin']);

    return this.prisma.teamChannel.update({
      where: { id: channelId },
      data: dto,
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
      },
    });
  }

  async deleteChannel(channelId: string, userId: string) {
    await this.verifyChannelPermission(channelId, userId, ['owner']);

    return this.prisma.teamChannel.delete({
      where: { id: channelId },
    });
  }

  async getChannel(channelId: string, userId: string) {
    const channel = await this.prisma.teamChannel.findUnique({
      where: { id: channelId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    // For private channels, verify membership
    if (channel.type === TeamChannelType.PRIVATE) {
      const isMember = channel.members.some(m => m.userId === userId);
      if (!isMember) {
        throw new ForbiddenException('You do not have access to this channel');
      }
    }

    return channel;
  }

  async getUserChannels(userId: string) {
    const [memberChannels, publicChannels] = await Promise.all([
      // Channels user is a member of
      this.prisma.teamChannel.findMany({
        where: {
          members: { some: { userId } },
          isArchived: false,
        },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, avatarUrl: true },
              },
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              content: true,
              createdAt: true,
              sender: {
                select: { id: true, name: true },
              },
            },
          },
          _count: {
            select: { messages: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      // Public channels user is not a member of (for discovery)
      this.prisma.teamChannel.findMany({
        where: {
          type: TeamChannelType.PUBLIC,
          isArchived: false,
          members: { none: { userId } },
        },
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          _count: {
            select: { members: true, messages: true },
          },
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      myChannels: memberChannels,
      discoverable: publicChannels,
    };
  }

  async joinChannel(channelId: string, userId: string) {
    const channel = await this.prisma.teamChannel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    if (channel.type === TeamChannelType.PRIVATE) {
      throw new ForbiddenException('Cannot join private channel without invitation');
    }

    return this.prisma.teamChannelMember.create({
      data: {
        channelId,
        userId,
        role: 'member',
      },
    });
  }

  async leaveChannel(channelId: string, userId: string) {
    const member = await this.prisma.teamChannelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
    });

    if (!member) {
      throw new NotFoundException('Not a member of this channel');
    }

    if (member.role === 'owner') {
      // Transfer ownership or delete channel
      const otherAdmins = await this.prisma.teamChannelMember.findMany({
        where: {
          channelId,
          role: { in: ['admin', 'owner'] },
          userId: { not: userId },
        },
      });

      if (otherAdmins.length === 0) {
        const otherMembers = await this.prisma.teamChannelMember.findMany({
          where: { channelId, userId: { not: userId } },
          take: 1,
        });

        if (otherMembers.length > 0) {
          // Transfer to first member
          await this.prisma.teamChannelMember.update({
            where: { id: otherMembers[0].id },
            data: { role: 'owner' },
          });
        }
        // If no other members, channel will be orphaned - let owner delete it
      }
    }

    return this.prisma.teamChannelMember.delete({
      where: { channelId_userId: { channelId, userId } },
    });
  }

  async addChannelMembers(channelId: string, userId: string, memberIds: string[]) {
    await this.verifyChannelPermission(channelId, userId, ['owner', 'admin']);

    const results = await Promise.all(
      memberIds.map(async (memberId) => {
        try {
          return await this.prisma.teamChannelMember.create({
            data: {
              channelId,
              userId: memberId,
              role: 'member',
            },
            include: {
              user: {
                select: { id: true, name: true, email: true, avatarUrl: true },
              },
            },
          });
        } catch {
          // Already a member, skip
          return null;
        }
      }),
    );

    return results.filter(Boolean);
  }

  async removeChannelMember(channelId: string, userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      return this.leaveChannel(channelId, userId);
    }

    await this.verifyChannelPermission(channelId, userId, ['owner', 'admin']);

    return this.prisma.teamChannelMember.delete({
      where: { channelId_userId: { channelId, userId: targetUserId } },
    });
  }

  // ==================== DIRECT CONVERSATIONS ====================

  async getOrCreateDirectConversation(userId: string, otherUserId: string) {
    // Ensure consistent ordering for the unique constraint
    const [user1Id, user2Id] = [userId, otherUserId].sort();

    let conversation = await this.prisma.directConversation.findUnique({
      where: { user1Id_user2Id: { user1Id, user2Id } },
      include: {
        user1: { select: { id: true, name: true, email: true, avatarUrl: true } },
        user2: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    if (!conversation) {
      conversation = await this.prisma.directConversation.create({
        data: { user1Id, user2Id },
        include: {
          user1: { select: { id: true, name: true, email: true, avatarUrl: true } },
          user2: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      });
    }

    return conversation;
  }

  async getUserDirectConversations(userId: string) {
    const conversations = await this.prisma.directConversation.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      include: {
        user1: { select: { id: true, name: true, email: true, avatarUrl: true } },
        user2: { select: { id: true, name: true, email: true, avatarUrl: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            content: true,
            createdAt: true,
            senderId: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Transform to include the "other user" perspective
    return conversations.map(conv => ({
      ...conv,
      otherUser: conv.user1Id === userId ? conv.user2 : conv.user1,
      lastMessage: conv.messages[0] || null,
    }));
  }

  // ==================== MESSAGES ====================

  async sendMessage(userId: string, dto: SendMessageDto) {
    // Validate that either channelId or directUserId is provided
    if (!dto.channelId && !dto.directUserId) {
      throw new ForbiddenException('Must specify either channelId or directUserId');
    }

    let directConversationId: string | undefined;

    if (dto.channelId) {
      // Verify channel membership
      const membership = await this.prisma.teamChannelMember.findUnique({
        where: { channelId_userId: { channelId: dto.channelId, userId } },
      });

      if (!membership) {
        throw new ForbiddenException('You are not a member of this channel');
      }
    } else if (dto.directUserId) {
      // Get or create direct conversation
      const conversation = await this.getOrCreateDirectConversation(userId, dto.directUserId);
      directConversationId = conversation.id;
    }

    const message = await this.prisma.teamMessage.create({
      data: {
        content: dto.content,
        senderId: userId,
        channelId: dto.channelId,
        directConversationId,
        parentId: dto.parentId,
        attachments: dto.attachments as Prisma.InputJsonValue,
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        parent: {
          select: {
            id: true,
            content: true,
            sender: { select: { id: true, name: true } },
          },
        },
        _count: {
          select: { replies: true },
        },
      },
    });

    // Update channel/conversation updatedAt
    if (dto.channelId) {
      await this.prisma.teamChannel.update({
        where: { id: dto.channelId },
        data: { updatedAt: new Date() },
      });
    } else if (directConversationId) {
      await this.prisma.directConversation.update({
        where: { id: directConversationId },
        data: { updatedAt: new Date() },
      });
    }

    return message;
  }

  async updateMessage(messageId: string, userId: string, dto: UpdateMessageDto) {
    const message = await this.prisma.teamMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    return this.prisma.teamMessage.update({
      where: { id: messageId },
      data: {
        content: dto.content,
        isEdited: true,
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await this.prisma.teamMessage.findUnique({
      where: { id: messageId },
      include: { channel: { include: { members: true } } },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Allow sender or channel admin/owner to delete
    const isOwner = message.senderId === userId;
    const isChannelAdmin = message.channel?.members.some(
      m => m.userId === userId && ['owner', 'admin'].includes(m.role),
    );

    if (!isOwner && !isChannelAdmin) {
      throw new ForbiddenException('You cannot delete this message');
    }

    return this.prisma.teamMessage.delete({
      where: { id: messageId },
    });
  }

  async getChannelMessages(
    channelId: string,
    userId: string,
    page: number = 1,
    pageSize: number = 50,
  ) {
    // Verify access
    const channel = await this.getChannel(channelId, userId);

    const messages = await this.prisma.teamMessage.findMany({
      where: { channelId, parentId: null }, // Only top-level messages
      include: {
        sender: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        replies: {
          include: {
            sender: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: 'asc' },
          take: 3, // Preview of replies
        },
        _count: {
          select: { replies: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const total = await this.prisma.teamMessage.count({
      where: { channelId, parentId: null },
    });

    return {
      messages: messages.reverse(), // Return in chronological order
      channel,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getDirectMessages(
    conversationId: string,
    userId: string,
    page: number = 1,
    pageSize: number = 50,
  ) {
    // Verify user is part of the conversation
    const conversation = await this.prisma.directConversation.findUnique({
      where: { id: conversationId },
      include: {
        user1: { select: { id: true, name: true, email: true, avatarUrl: true } },
        user2: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
      throw new ForbiddenException('You are not part of this conversation');
    }

    const messages = await this.prisma.teamMessage.findMany({
      where: { directConversationId: conversationId },
      include: {
        sender: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const total = await this.prisma.teamMessage.count({
      where: { directConversationId: conversationId },
    });

    return {
      messages: messages.reverse(),
      conversation: {
        ...conversation,
        otherUser: conversation.user1Id === userId ? conversation.user2 : conversation.user1,
      },
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async addReaction(messageId: string, userId: string, emoji: string) {
    const message = await this.prisma.teamMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const reactions = (message.reactions as Record<string, string[]>) || {};
    if (!reactions[emoji]) {
      reactions[emoji] = [];
    }

    if (!reactions[emoji].includes(userId)) {
      reactions[emoji].push(userId);
    }

    return this.prisma.teamMessage.update({
      where: { id: messageId },
      data: { reactions: reactions as Prisma.InputJsonValue },
    });
  }

  async removeReaction(messageId: string, userId: string, emoji: string) {
    const message = await this.prisma.teamMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const reactions = (message.reactions as Record<string, string[]>) || {};
    if (reactions[emoji]) {
      reactions[emoji] = reactions[emoji].filter(id => id !== userId);
      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
      }
    }

    return this.prisma.teamMessage.update({
      where: { id: messageId },
      data: { reactions: reactions as Prisma.InputJsonValue },
    });
  }

  async pinMessage(messageId: string, userId: string) {
    const message = await this.prisma.teamMessage.findUnique({
      where: { id: messageId },
      include: { channel: { include: { members: true } } },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.channelId) {
      // Verify user has permission
      const isAdmin = message.channel?.members.some(
        m => m.userId === userId && ['owner', 'admin'].includes(m.role),
      );
      if (!isAdmin) {
        throw new ForbiddenException('Only channel admins can pin messages');
      }
    }

    return this.prisma.teamMessage.update({
      where: { id: messageId },
      data: { isPinned: !message.isPinned },
    });
  }

  // ==================== SEARCH ====================

  async searchUsers(query: string, currentUserId: string, limit: number = 10) {
    if (!query || query.length < 2) {
      return [];
    }

    return this.prisma.user.findMany({
      where: {
        AND: [
          { id: { not: currentUserId } },
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
            ],
          },
          { status: 'ACTIVE' },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
      take: limit,
    });
  }

  // ==================== HELPERS ====================

  private async verifyChannelPermission(
    channelId: string,
    userId: string,
    requiredRoles: string[],
  ) {
    const membership = await this.prisma.teamChannelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this channel');
    }

    if (!requiredRoles.includes(membership.role)) {
      throw new ForbiddenException('You do not have permission for this action');
    }
  }
}
