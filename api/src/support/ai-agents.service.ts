import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AIAgentSpecialization, AIAgentStatus, Prisma } from '@prisma/client';
import { CreateAIAgentDto, UpdateAIAgentDto } from './dto/ai-agent.dto';

export interface AIAgentFilters {
  status?: AIAgentStatus;
  specialization?: AIAgentSpecialization;
  isOnline?: boolean;
  search?: string;
}

@Injectable()
export class AIAgentsService {
  private readonly logger = new Logger(AIAgentsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new AI agent
   */
  async create(dto: CreateAIAgentDto) {
    // Generate slug from name if not provided
    const slug = dto.slug || this.generateSlug(dto.name);

    // Check for duplicate slug
    const existing = await this.prisma.supportAIAgent.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new ConflictException(`Agent with slug "${slug}" already exists`);
    }

    const agent = await this.prisma.supportAIAgent.create({
      data: {
        name: dto.name,
        slug,
        avatar: dto.avatar || this.generateAvatar(dto.name),
        specialization: dto.specialization,
        systemPrompt: dto.systemPrompt,
        capabilities: dto.capabilities || this.getDefaultCapabilities(dto.specialization),
        model: dto.model || 'claude-sonnet-4-20250514',
        temperature: dto.temperature ?? 0.3,
        autoReply: dto.autoReply ?? true,
        escalateAfter: dto.escalateAfter,
        maxRetries: dto.maxRetries ?? 3,
        responseDelay: dto.responseDelay ?? 0,
        workingHoursStart: dto.workingHoursStart,
        workingHoursEnd: dto.workingHoursEnd,
        workingDays: dto.workingDays,
        timezone: dto.timezone,
        metadata: dto.metadata,
        status: AIAgentStatus.ACTIVE,
        isOnline: true,
      },
    });

    this.logger.log(`Created AI agent: ${agent.name} (${agent.id})`);
    return agent;
  }

  /**
   * Get all AI agents with optional filters
   */
  async findAll(filters?: AIAgentFilters) {
    const where: Prisma.SupportAIAgentWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.specialization) {
      where.specialization = filters.specialization;
    }

    if (filters?.isOnline !== undefined) {
      where.isOnline = filters.isOnline;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { slug: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const agents = await this.prisma.supportAIAgent.findMany({
      where,
      include: {
        queues: {
          include: {
            queue: true,
          },
        },
        _count: {
          select: {
            ticketsAssigned: true,
            responses: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return agents;
  }

  /**
   * Get a single AI agent by ID
   */
  async findOne(id: string) {
    const agent = await this.prisma.supportAIAgent.findUnique({
      where: { id },
      include: {
        queues: {
          include: {
            queue: true,
          },
        },
        _count: {
          select: {
            ticketsAssigned: true,
            responses: true,
          },
        },
      },
    });

    if (!agent) {
      throw new NotFoundException(`AI agent with ID "${id}" not found`);
    }

    return agent;
  }

  /**
   * Get agent by slug
   */
  async findBySlug(slug: string) {
    const agent = await this.prisma.supportAIAgent.findUnique({
      where: { slug },
      include: {
        queues: {
          include: {
            queue: true,
          },
        },
      },
    });

    if (!agent) {
      throw new NotFoundException(`AI agent with slug "${slug}" not found`);
    }

    return agent;
  }

  /**
   * Update an AI agent
   */
  async update(id: string, dto: UpdateAIAgentDto) {
    // Verify agent exists
    await this.findOne(id);

    // If updating slug, check for duplicates
    if (dto.slug) {
      const existing = await this.prisma.supportAIAgent.findFirst({
        where: {
          slug: dto.slug,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException(`Agent with slug "${dto.slug}" already exists`);
      }
    }

    const updated = await this.prisma.supportAIAgent.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.slug && { slug: dto.slug }),
        ...(dto.avatar && { avatar: dto.avatar }),
        ...(dto.specialization && { specialization: dto.specialization }),
        ...(dto.systemPrompt !== undefined && { systemPrompt: dto.systemPrompt }),
        ...(dto.capabilities && { capabilities: dto.capabilities }),
        ...(dto.model && { model: dto.model }),
        ...(dto.temperature !== undefined && { temperature: dto.temperature }),
        ...(dto.autoReply !== undefined && { autoReply: dto.autoReply }),
        ...(dto.escalateAfter !== undefined && { escalateAfter: dto.escalateAfter }),
        ...(dto.maxRetries !== undefined && { maxRetries: dto.maxRetries }),
        ...(dto.responseDelay !== undefined && { responseDelay: dto.responseDelay }),
        ...(dto.workingHoursStart !== undefined && { workingHoursStart: dto.workingHoursStart }),
        ...(dto.workingHoursEnd !== undefined && { workingHoursEnd: dto.workingHoursEnd }),
        ...(dto.workingDays !== undefined && { workingDays: dto.workingDays }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone }),
        ...(dto.status && { status: dto.status }),
        ...(dto.isOnline !== undefined && { isOnline: dto.isOnline }),
        ...(dto.metadata && { metadata: dto.metadata }),
      },
      include: {
        queues: {
          include: {
            queue: true,
          },
        },
      },
    });

    this.logger.log(`Updated AI agent: ${updated.name} (${updated.id})`);
    return updated;
  }

  /**
   * Delete an AI agent
   */
  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.supportAIAgent.delete({
      where: { id },
    });

    this.logger.log(`Deleted AI agent: ${id}`);
    return { success: true };
  }

  /**
   * Toggle agent online status
   */
  async toggleOnline(id: string) {
    const agent = await this.findOne(id);

    const updated = await this.prisma.supportAIAgent.update({
      where: { id },
      data: {
        isOnline: !agent.isOnline,
        lastActiveAt: new Date(),
      },
    });

    this.logger.log(`Toggled AI agent ${updated.name} online status to: ${updated.isOnline}`);
    return updated;
  }

  /**
   * Update agent metrics (called periodically or after ticket resolution)
   */
  async updateMetrics(id: string) {
    const agent = await this.findOne(id);

    // Calculate metrics from actual data
    const [ticketStats, csatStats] = await Promise.all([
      this.prisma.supportTicket.aggregate({
        where: { aiAgentId: id },
        _count: true,
      }),
      this.prisma.supportTicket.aggregate({
        where: {
          aiAgentId: id,
          csatRating: { not: null },
        },
        _avg: { csatRating: true },
      }),
    ]);

    // Calculate average resolution time
    const resolvedTickets = await this.prisma.supportTicket.findMany({
      where: {
        aiAgentId: id,
        resolvedAt: { not: null },
      },
      select: {
        createdAt: true,
        resolvedAt: true,
      },
    });

    let avgResolutionTime: number | null = null;
    if (resolvedTickets.length > 0) {
      const totalMinutes = resolvedTickets.reduce((sum, ticket) => {
        const diff = ticket.resolvedAt!.getTime() - ticket.createdAt.getTime();
        return sum + diff / (1000 * 60); // Convert to minutes
      }, 0);
      avgResolutionTime = Math.round(totalMinutes / resolvedTickets.length);
    }

    // Calculate escalation rate
    const escalatedCount = await this.prisma.supportTicket.count({
      where: {
        aiAgentId: id,
        escalationLevel: { gte: 3 },
      },
    });
    const escalationRate = ticketStats._count > 0
      ? (escalatedCount / ticketStats._count) * 100
      : null;

    return this.prisma.supportAIAgent.update({
      where: { id },
      data: {
        totalTicketsHandled: ticketStats._count,
        avgResolutionTime,
        csatAverage: csatStats._avg.csatRating,
        escalationRate,
        lastActiveAt: new Date(),
      },
    });
  }

  /**
   * Get available agents for assignment (online and active)
   */
  async getAvailableAgents(specialization?: AIAgentSpecialization) {
    const where: Prisma.SupportAIAgentWhereInput = {
      status: AIAgentStatus.ACTIVE,
      isOnline: true,
    };

    if (specialization) {
      where.specialization = specialization;
    }

    return this.prisma.supportAIAgent.findMany({
      where,
      orderBy: [
        { totalTicketsHandled: 'asc' }, // Load balance - assign to least busy
        { csatAverage: 'desc' }, // Prefer higher rated agents
      ],
    });
  }

  /**
   * Get agent stats summary
   */
  async getStats() {
    const [total, byStatus, bySpecialization, online] = await Promise.all([
      this.prisma.supportAIAgent.count(),
      this.prisma.supportAIAgent.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.supportAIAgent.groupBy({
        by: ['specialization'],
        _count: true,
      }),
      this.prisma.supportAIAgent.count({
        where: { isOnline: true, status: AIAgentStatus.ACTIVE },
      }),
    ]);

    return {
      total,
      online,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {} as Record<string, number>),
      bySpecialization: bySpecialization.reduce((acc, item) => {
        acc[item.specialization] = item._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  // Helper methods
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private generateAvatar(name: string): string {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  private getDefaultCapabilities(specialization: AIAgentSpecialization): Record<string, boolean> {
    const base = {
      read_ticket: true,
      respond_to_customer: true,
      add_internal_note: true,
      search_knowledge_base: true,
    };

    const specialized: Record<AIAgentSpecialization, Record<string, boolean>> = {
      GENERAL: {
        ...base,
        update_priority: true,
      },
      TECHNICAL: {
        ...base,
        access_logs: true,
        run_diagnostics: true,
        update_priority: true,
      },
      BILLING: {
        ...base,
        view_subscription: true,
        apply_credits: true,
        generate_invoice: true,
      },
      ONBOARDING: {
        ...base,
        send_welcome_email: true,
        create_demo_data: true,
        schedule_call: true,
      },
      ESCALATION: {
        ...base,
        escalate_to_human: true,
        update_priority: true,
        access_all_tickets: true,
      },
      SALES: {
        ...base,
        create_opportunity: true,
        send_quote: true,
        schedule_demo: true,
      },
      ENTERPRISE: {
        ...base,
        access_all_tickets: true,
        update_priority: true,
        escalate_to_human: true,
        view_account_health: true,
      },
    };

    return specialized[specialization] || base;
  }
}
