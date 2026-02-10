import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EntityAuditService } from '../audit/entity-audit.service';
import { DuplicateSetStatus } from '@prisma/client';

interface MergeParams {
  duplicateSetId: string;
  survivorId: string;
  mergedIds: string[];
  fieldResolutions?: Record<string, { sourceId: string; value: any }>;
  userId?: string;
  organizationId: string;
  entityType: string;
}

@Injectable()
export class DuplicateDetectionService {
  private readonly logger = new Logger(DuplicateDetectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entityAuditService: EntityAuditService,
  ) {}

  /**
   * Scan for duplicates of a given entity against others in the same organization.
   */
  async scanForDuplicates(organizationId: string, entityType: string, entityId: string): Promise<void> {
    try {
      if (entityType === 'lead') {
        await this.scanLeadDuplicates(organizationId, entityId);
      } else if (entityType === 'contact') {
        await this.scanContactDuplicates(organizationId, entityId);
      }
    } catch (error) {
      this.logger.error(`Duplicate scan failed for ${entityType}:${entityId}: ${error.message}`);
    }
  }

  private async scanLeadDuplicates(organizationId: string, entityId: string): Promise<void> {
    const lead = await this.prisma.lead.findUnique({ where: { id: entityId } });
    if (!lead) return;

    const candidates = await this.prisma.lead.findMany({
      where: {
        organizationId,
        id: { not: entityId },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        company: true,
      },
    });

    for (const candidate of candidates) {
      let confidence = 0;
      const reasons: string[] = [];

      // Exact email match
      if (lead.email && candidate.email && lead.email.toLowerCase() === candidate.email.toLowerCase()) {
        confidence = Math.max(confidence, 0.95);
        reasons.push('exact email match');
      }

      // Same company + similar name
      if (lead.company && candidate.company &&
          lead.company.toLowerCase() === candidate.company.toLowerCase()) {
        const nameA = `${lead.firstName} ${lead.lastName}`.toLowerCase();
        const nameB = `${candidate.firstName} ${candidate.lastName}`.toLowerCase();
        if (nameA === nameB || nameA.includes(nameB) || nameB.includes(nameA)) {
          confidence = Math.max(confidence, 0.7);
          reasons.push('same company + similar name');
        }
      }

      // Exact phone match
      if (lead.phone && candidate.phone) {
        const normalizedA = lead.phone.replace(/\D/g, '');
        const normalizedB = candidate.phone.replace(/\D/g, '');
        if (normalizedA.length >= 7 && normalizedA === normalizedB) {
          confidence = Math.max(confidence, 0.6);
          reasons.push('exact phone match');
        }
      }

      if (confidence >= 0.6) {
        await this.createDuplicateSetIfNew(organizationId, 'lead', [entityId, candidate.id], confidence, reasons.join(', '));
      }
    }
  }

  private async scanContactDuplicates(organizationId: string, entityId: string): Promise<void> {
    const contact = await this.prisma.contact.findUnique({ where: { id: entityId } });
    if (!contact) return;

    const candidates = await this.prisma.contact.findMany({
      where: {
        organizationId,
        id: { not: entityId },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
    });

    for (const candidate of candidates) {
      let confidence = 0;
      const reasons: string[] = [];

      if (contact.email && candidate.email && contact.email.toLowerCase() === candidate.email.toLowerCase()) {
        confidence = Math.max(confidence, 0.95);
        reasons.push('exact email match');
      }

      if (contact.phone && candidate.phone) {
        const normalizedA = contact.phone.replace(/\D/g, '');
        const normalizedB = candidate.phone.replace(/\D/g, '');
        if (normalizedA.length >= 7 && normalizedA === normalizedB) {
          confidence = Math.max(confidence, 0.6);
          reasons.push('exact phone match');
        }
      }

      if (confidence >= 0.6) {
        await this.createDuplicateSetIfNew(organizationId, 'contact', [entityId, candidate.id], confidence, reasons.join(', '));
      }
    }
  }

  private async createDuplicateSetIfNew(
    organizationId: string,
    entityType: string,
    entityIds: string[],
    confidence: number,
    matchReason: string,
  ): Promise<void> {
    // Check if an OPEN duplicate set already contains these entities
    const existingSets = await this.prisma.duplicateSet.findMany({
      where: {
        organizationId,
        entityType,
        status: DuplicateSetStatus.OPEN,
        members: {
          some: { entityId: { in: entityIds } },
        },
      },
      include: { members: true },
    });

    // If any existing set already contains both entities, skip
    for (const set of existingSets) {
      const memberIds = set.members.map(m => m.entityId);
      if (entityIds.every(id => memberIds.includes(id))) {
        return;
      }
    }

    await this.prisma.duplicateSet.create({
      data: {
        organizationId,
        entityType,
        confidence,
        matchReason,
        members: {
          create: entityIds.map((id, index) => ({
            entityId: id,
            isPrimary: index === 0,
          })),
        },
      },
    });

    this.logger.log(`Created duplicate set for ${entityType}: ${entityIds.join(', ')} (${matchReason})`);
  }

  /**
   * List duplicate sets with filtering.
   */
  async getDuplicateSets(organizationId: string, entityType?: string, status?: DuplicateSetStatus) {
    const where: any = { organizationId };
    if (entityType) where.entityType = entityType;
    if (status) where.status = status;

    return this.prisma.duplicateSet.findMany({
      where,
      include: {
        members: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /**
   * Get a single duplicate set with member details.
   */
  async getDuplicateSet(id: string) {
    const set = await this.prisma.duplicateSet.findUnique({
      where: { id },
      include: { members: true },
    });
    if (!set) throw new NotFoundException(`Duplicate set ${id} not found`);
    return set;
  }

  /**
   * Dismiss a duplicate set.
   */
  async dismissDuplicateSet(id: string, userId: string) {
    const set = await this.prisma.duplicateSet.findUnique({ where: { id } });
    if (!set) throw new NotFoundException(`Duplicate set ${id} not found`);

    return this.prisma.duplicateSet.update({
      where: { id },
      data: {
        status: DuplicateSetStatus.DISMISSED,
        resolvedAt: new Date(),
        resolvedBy: userId,
      },
    });
  }

  /**
   * Merge entities: apply field resolutions to survivor, reassign relations, delete merged records.
   */
  async mergeEntities(params: MergeParams) {
    const { duplicateSetId, survivorId, mergedIds, fieldResolutions, userId, organizationId, entityType } = params;

    if (entityType === 'lead') {
      return this.mergeLeads(duplicateSetId, survivorId, mergedIds, fieldResolutions, userId, organizationId);
    }

    throw new Error(`Merge not yet supported for entity type: ${entityType}`);
  }

  private async mergeLeads(
    duplicateSetId: string,
    survivorId: string,
    mergedIds: string[],
    fieldResolutions: Record<string, { sourceId: string; value: any }> | undefined,
    userId: string | undefined,
    organizationId: string,
  ) {
    const survivor = await this.prisma.lead.findUnique({ where: { id: survivorId } });
    if (!survivor) throw new NotFoundException(`Survivor lead ${survivorId} not found`);

    // Apply field resolutions to survivor
    const updateData: Record<string, any> = {};
    if (fieldResolutions) {
      for (const [field, resolution] of Object.entries(fieldResolutions)) {
        if (resolution.sourceId !== survivorId) {
          updateData[field] = resolution.value;
        }
      }
    }

    if (Object.keys(updateData).length > 0) {
      const updated = await this.prisma.lead.update({
        where: { id: survivorId },
        data: updateData,
      });

      // Track field changes from merge
      await this.entityAuditService.trackChanges({
        organizationId,
        entityType: 'lead',
        entityId: survivorId,
        userId,
        before: survivor,
        after: updated,
        trackedFields: Object.keys(updateData),
      });
    }

    // Reassign related records from merged leads to survivor
    for (const mergedId of mergedIds) {
      await this.prisma.activity.updateMany({
        where: { leadId: mergedId },
        data: { leadId: survivorId },
      });
      await this.prisma.note.updateMany({
        where: { leadId: mergedId },
        data: { leadId: survivorId },
      });
    }

    // Delete merged leads
    await this.prisma.lead.deleteMany({
      where: { id: { in: mergedIds } },
    });

    // Create merge history record
    await this.prisma.mergeHistory.create({
      data: {
        organizationId,
        entityType: 'lead',
        survivorId,
        mergedIds,
        mergedBy: userId,
        fieldResolutions: fieldResolutions || undefined,
        duplicateSetId,
      },
    });

    // Mark duplicate set as merged
    if (duplicateSetId) {
      await this.prisma.duplicateSet.update({
        where: { id: duplicateSetId },
        data: {
          status: DuplicateSetStatus.MERGED,
          resolvedAt: new Date(),
          resolvedBy: userId,
        },
      });
    }

    this.logger.log(`Merged leads [${mergedIds.join(', ')}] into survivor ${survivorId}`);

    return { survivorId, mergedIds, duplicateSetId };
  }
}
