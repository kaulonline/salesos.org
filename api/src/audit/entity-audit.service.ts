import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

interface TrackChangesParams {
  organizationId: string;
  entityType: string;
  entityId: string;
  userId?: string;
  before: Record<string, any>;
  after: Record<string, any>;
  trackedFields: string[];
}

@Injectable()
export class EntityAuditService {
  private readonly logger = new Logger(EntityAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Compare before/after snapshots and record field-level changes.
   * Fire-and-forget — errors are logged but not thrown.
   */
  async trackChanges(params: TrackChangesParams): Promise<void> {
    const { organizationId, entityType, entityId, userId, before, after, trackedFields } = params;

    try {
      const changes: {
        organizationId: string;
        entityType: string;
        entityId: string;
        userId: string | undefined;
        fieldName: string;
        oldValue: string | null;
        newValue: string | null;
      }[] = [];

      for (const field of trackedFields) {
        const oldVal = before[field];
        const newVal = after[field];

        // Skip if both are null/undefined
        if (oldVal == null && newVal == null) continue;

        // Stringify for comparison (handles Date, objects, etc.)
        const oldStr = oldVal != null ? JSON.stringify(oldVal) : null;
        const newStr = newVal != null ? JSON.stringify(newVal) : null;

        // Skip if values are equal
        if (oldStr === newStr) continue;

        changes.push({
          organizationId,
          entityType,
          entityId,
          userId: userId || undefined,
          fieldName: field,
          oldValue: oldStr,
          newValue: newStr,
        });
      }

      if (changes.length === 0) return;

      await this.prisma.entityFieldChange.createMany({ data: changes });

      this.logger.debug(
        `Tracked ${changes.length} field change(s) for ${entityType}:${entityId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to track field changes for ${entityType}:${entityId}: ${error.message}`,
      );
    }
  }
}
