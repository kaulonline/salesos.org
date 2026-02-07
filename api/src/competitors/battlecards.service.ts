import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface CreateBattlecardDto {
  title: string;
  overview?: string;
  keyTalkingPoints?: string[];
  objectionHandling?: { objection: string; response: string }[];
  trapQuestions?: string[];
  winThemes?: string[];
  loseThemes?: string[];
  pricingComparison?: string;
}

export interface UpdateBattlecardDto extends Partial<CreateBattlecardDto> {
  isActive?: boolean;
}

@Injectable()
export class BattlecardsService {
  private readonly logger = new Logger(BattlecardsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByCompetitor(competitorId: string, activeOnly: boolean, organizationId: string) {
    // Verify competitor access
    const competitor = await this.prisma.competitor.findFirst({
      where: { id: competitorId, organizationId },
    });

    if (!competitor) {
      throw new NotFoundException('Competitor not found');
    }

    const where: any = { competitorId };
    if (activeOnly) {
      where.isActive = true;
    }

    return this.prisma.battlecard.findMany({
      where,
      orderBy: [{ isActive: 'desc' }, { version: 'desc' }],
    });
  }

  async findOne(id: string, organizationId: string) {
    const battlecard = await this.prisma.battlecard.findUnique({
      where: { id },
      include: {
        competitor: { select: { id: true, name: true, organizationId: true } },
      },
    });

    if (!battlecard || battlecard.competitor.organizationId !== organizationId) {
      throw new NotFoundException('Battlecard not found');
    }

    return battlecard;
  }

  async create(competitorId: string, dto: CreateBattlecardDto, organizationId: string) {
    // Verify competitor access
    const competitor = await this.prisma.competitor.findFirst({
      where: { id: competitorId, organizationId },
    });

    if (!competitor) {
      throw new NotFoundException('Competitor not found');
    }

    // Get current max version
    const existing = await this.prisma.battlecard.findMany({
      where: { competitorId },
      orderBy: { version: 'desc' },
      take: 1,
    });

    const version = existing.length > 0 ? existing[0].version + 1 : 1;

    // Deactivate previous battlecards with same title
    if (existing.length > 0) {
      await this.prisma.battlecard.updateMany({
        where: { competitorId, title: dto.title },
        data: { isActive: false },
      });
    }

    const battlecard = await this.prisma.battlecard.create({
      data: {
        competitorId,
        title: dto.title,
        overview: dto.overview,
        keyTalkingPoints: dto.keyTalkingPoints || [],
        objectionHandling: dto.objectionHandling || [],
        trapQuestions: dto.trapQuestions || [],
        winThemes: dto.winThemes || [],
        loseThemes: dto.loseThemes || [],
        pricingComparison: dto.pricingComparison,
        version,
        isActive: true,
      },
    });

    this.logger.log(`Created battlecard v${version} for competitor ${competitorId}`);
    return battlecard;
  }

  async update(id: string, dto: UpdateBattlecardDto, organizationId: string) {
    await this.findOne(id, organizationId);

    return this.prisma.battlecard.update({
      where: { id },
      data: {
        title: dto.title,
        overview: dto.overview,
        keyTalkingPoints: dto.keyTalkingPoints,
        objectionHandling: dto.objectionHandling,
        trapQuestions: dto.trapQuestions,
        winThemes: dto.winThemes,
        loseThemes: dto.loseThemes,
        pricingComparison: dto.pricingComparison,
        isActive: dto.isActive,
      },
    });
  }

  async delete(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    await this.prisma.battlecard.delete({ where: { id } });
    return { success: true };
  }

  async getActiveBattlecard(competitorId: string) {
    return this.prisma.battlecard.findFirst({
      where: { competitorId, isActive: true },
      orderBy: { version: 'desc' },
    });
  }
}
