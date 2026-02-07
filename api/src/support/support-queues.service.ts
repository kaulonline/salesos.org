import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TicketCategory, TicketPriority, Prisma } from '@prisma/client';
import { CreateQueueDto, UpdateQueueDto, AssignAgentDto } from './dto/queue.dto';

@Injectable()
export class SupportQueuesService {
  private readonly logger = new Logger(SupportQueuesService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new support queue
   */
  async create(dto: CreateQueueDto) {
    const slug = dto.slug || this.generateSlug(dto.name);

    // Check for duplicate slug
    const existing = await this.prisma.supportQueue.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new ConflictException(`Queue with slug "${slug}" already exists`);
    }

    // If this is the default queue, unset any existing default
    if (dto.isDefault) {
      await this.prisma.supportQueue.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const queue = await this.prisma.supportQueue.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        categories: dto.categories || [],
        priorities: dto.priorities || [],
        keywords: dto.keywords || [],
        isDefault: dto.isDefault || false,
        maxCapacity: dto.maxCapacity,
        slaMultiplier: dto.slaMultiplier ?? 1.0,
        metadata: dto.metadata,
        isActive: true,
      },
    });

    this.logger.log(`Created support queue: ${queue.name} (${queue.id})`);
    return queue;
  }

  /**
   * Get all queues
   */
  async findAll(activeOnly = false) {
    const where: Prisma.SupportQueueWhereInput = {};

    if (activeOnly) {
      where.isActive = true;
    }

    const queues = await this.prisma.supportQueue.findMany({
      where,
      include: {
        agents: {
          include: {
            agent: {
              select: {
                id: true,
                name: true,
                avatar: true,
                specialization: true,
                status: true,
                isOnline: true,
              },
            },
          },
          orderBy: { priority: 'desc' },
        },
        _count: {
          select: {
            tickets: true,
          },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    return queues;
  }

  /**
   * Get a single queue by ID
   */
  async findOne(id: string) {
    const queue = await this.prisma.supportQueue.findUnique({
      where: { id },
      include: {
        agents: {
          include: {
            agent: true,
          },
          orderBy: { priority: 'desc' },
        },
        _count: {
          select: {
            tickets: true,
          },
        },
      },
    });

    if (!queue) {
      throw new NotFoundException(`Queue with ID "${id}" not found`);
    }

    return queue;
  }

  /**
   * Update a queue
   */
  async update(id: string, dto: UpdateQueueDto) {
    await this.findOne(id);

    // If updating slug, check for duplicates
    if (dto.slug) {
      const existing = await this.prisma.supportQueue.findFirst({
        where: {
          slug: dto.slug,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException(`Queue with slug "${dto.slug}" already exists`);
      }
    }

    // If setting as default, unset any existing default
    if (dto.isDefault) {
      await this.prisma.supportQueue.updateMany({
        where: { isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
    }

    const updated = await this.prisma.supportQueue.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.slug && { slug: dto.slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.categories && { categories: dto.categories }),
        ...(dto.priorities && { priorities: dto.priorities }),
        ...(dto.keywords && { keywords: dto.keywords }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
        ...(dto.maxCapacity !== undefined && { maxCapacity: dto.maxCapacity }),
        ...(dto.slaMultiplier !== undefined && { slaMultiplier: dto.slaMultiplier }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.metadata && { metadata: dto.metadata }),
      },
      include: {
        agents: {
          include: {
            agent: true,
          },
        },
      },
    });

    this.logger.log(`Updated queue: ${updated.name} (${updated.id})`);
    return updated;
  }

  /**
   * Delete a queue
   */
  async remove(id: string) {
    const queue = await this.findOne(id);

    if (queue.isDefault) {
      throw new ConflictException('Cannot delete the default queue');
    }

    await this.prisma.supportQueue.delete({
      where: { id },
    });

    this.logger.log(`Deleted queue: ${id}`);
    return { success: true };
  }

  /**
   * Assign an agent to a queue
   */
  async assignAgent(queueId: string, dto: AssignAgentDto) {
    await this.findOne(queueId);

    // Verify agent exists
    const agent = await this.prisma.supportAIAgent.findUnique({
      where: { id: dto.agentId },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID "${dto.agentId}" not found`);
    }

    // Check if already assigned
    const existing = await this.prisma.supportQueueAgent.findUnique({
      where: {
        queueId_agentId: {
          queueId,
          agentId: dto.agentId,
        },
      },
    });

    if (existing) {
      // Update priority if different
      if (dto.priority !== undefined && dto.priority !== existing.priority) {
        return this.prisma.supportQueueAgent.update({
          where: { id: existing.id },
          data: { priority: dto.priority },
          include: { agent: true, queue: true },
        });
      }
      return existing;
    }

    const assignment = await this.prisma.supportQueueAgent.create({
      data: {
        queueId,
        agentId: dto.agentId,
        priority: dto.priority ?? 0,
        isActive: true,
      },
      include: { agent: true, queue: true },
    });

    this.logger.log(`Assigned agent ${agent.name} to queue ${queueId}`);
    return assignment;
  }

  /**
   * Remove an agent from a queue
   */
  async removeAgent(queueId: string, agentId: string) {
    const assignment = await this.prisma.supportQueueAgent.findUnique({
      where: {
        queueId_agentId: { queueId, agentId },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Agent is not assigned to this queue');
    }

    await this.prisma.supportQueueAgent.delete({
      where: { id: assignment.id },
    });

    this.logger.log(`Removed agent ${agentId} from queue ${queueId}`);
    return { success: true };
  }

  /**
   * Route a ticket to the appropriate queue based on its properties
   */
  async routeTicket(ticket: {
    category: TicketCategory;
    priority: TicketPriority;
    subject: string;
    description: string;
  }): Promise<string | null> {
    // Get all active queues
    const queues = await this.prisma.supportQueue.findMany({
      where: { isActive: true },
      orderBy: { isDefault: 'asc' }, // Non-default first, so we check specific queues before fallback
    });

    const textToMatch = `${ticket.subject} ${ticket.description}`.toLowerCase();

    for (const queue of queues) {
      if (queue.isDefault) continue; // Skip default queue in first pass

      // Check category match
      const categories = queue.categories as TicketCategory[] | null;
      if (categories && categories.length > 0) {
        if (categories.includes(ticket.category)) {
          return queue.id;
        }
      }

      // Check priority match
      const priorities = queue.priorities as TicketPriority[] | null;
      if (priorities && priorities.length > 0) {
        if (priorities.includes(ticket.priority)) {
          return queue.id;
        }
      }

      // Check keyword match
      const keywords = queue.keywords as string[] | null;
      if (keywords && keywords.length > 0) {
        for (const keyword of keywords) {
          if (textToMatch.includes(keyword.toLowerCase())) {
            return queue.id;
          }
        }
      }
    }

    // Return default queue if no match
    const defaultQueue = queues.find(q => q.isDefault);
    return defaultQueue?.id || null;
  }

  /**
   * Get the best available agent from a queue
   */
  async getBestAgent(queueId: string): Promise<string | null> {
    const queueAgents = await this.prisma.supportQueueAgent.findMany({
      where: {
        queueId,
        isActive: true,
        agent: {
          status: 'ACTIVE',
          isOnline: true,
        },
      },
      include: {
        agent: true,
      },
      orderBy: [
        { priority: 'desc' }, // Higher priority first
      ],
    });

    if (queueAgents.length === 0) {
      return null;
    }

    // Sort by load (fewer tickets = preferred)
    const agentLoads = await Promise.all(
      queueAgents.map(async (qa) => {
        const activeTickets = await this.prisma.supportTicket.count({
          where: {
            aiAgentId: qa.agentId,
            status: { in: ['OPEN', 'IN_PROGRESS'] },
          },
        });
        return {
          agentId: qa.agentId,
          priority: qa.priority,
          load: activeTickets,
          csatAverage: qa.agent.csatAverage || 0,
        };
      })
    );

    // Sort by: priority (desc), load (asc), CSAT (desc)
    agentLoads.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      if (a.load !== b.load) return a.load - b.load;
      return b.csatAverage - a.csatAverage;
    });

    return agentLoads[0]?.agentId || null;
  }

  /**
   * Get queue stats
   */
  async getStats() {
    const [total, active, withAgents] = await Promise.all([
      this.prisma.supportQueue.count(),
      this.prisma.supportQueue.count({ where: { isActive: true } }),
      this.prisma.supportQueue.count({
        where: {
          agents: { some: {} },
        },
      }),
    ]);

    const queueLoads = await this.prisma.supportQueue.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        currentTickets: true,
        maxCapacity: true,
        _count: {
          select: { agents: true },
        },
      },
    });

    return {
      total,
      active,
      withAgents,
      queueLoads,
    };
  }

  // Helper methods
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
