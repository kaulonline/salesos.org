import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { MigrationStatus } from '@prisma/client';
import { MigrationFieldMapping } from './templates';

/**
 * Migration Tracking Service
 *
 * Manages CRM migration jobs, tracks progress, and maintains history.
 */
@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new migration job
   *
   * @param data - Migration creation data
   * @returns Created migration record
   */
  async createMigration(data: {
    organizationId: string;
    userId: string;
    sourceCRM: string;
    entityType: string;
    fileName: string;
    fileSize: number;
    totalRows: number;
    fieldMappings: MigrationFieldMapping[];
  }) {
    this.logger.log(
      `Creating migration: ${data.sourceCRM} ${data.entityType} (${data.totalRows} rows)`,
    );

    const migration = await this.prisma.migration.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        sourceCRM: data.sourceCRM,
        entityType: data.entityType,
        fileName: data.fileName,
        fileSize: data.fileSize,
        totalRows: data.totalRows,
        fieldMappings: data.fieldMappings as any, // Prisma Json type
        status: MigrationStatus.PENDING,
      },
    });

    this.logger.log(`Migration created with ID: ${migration.id}`);

    return migration;
  }

  /**
   * Update migration status
   *
   * @param migrationId - Migration ID
   * @param status - New status
   */
  async updateStatus(migrationId: string, status: MigrationStatus) {
    const updateData: any = { status };

    if (status === MigrationStatus.IN_PROGRESS) {
      updateData.startedAt = new Date();
    } else if (
      status === MigrationStatus.COMPLETED ||
      status === MigrationStatus.FAILED ||
      status === MigrationStatus.CANCELLED
    ) {
      updateData.completedAt = new Date();
    }

    return this.prisma.migration.update({
      where: { id: migrationId },
      data: updateData,
    });
  }

  /**
   * Update migration progress
   *
   * @param migrationId - Migration ID
   * @param progress - Progress data
   */
  async updateProgress(
    migrationId: string,
    progress: {
      successCount?: number;
      failedCount?: number;
      skippedCount?: number;
      errors?: any[];
    },
  ) {
    return this.prisma.migration.update({
      where: { id: migrationId },
      data: progress,
    });
  }

  /**
   * Get migration by ID
   *
   * @param migrationId - Migration ID
   * @param organizationId - Organization ID (for authorization check)
   * @returns Migration record
   */
  async getMigration(migrationId: string, organizationId: string) {
    const migration = await this.prisma.migration.findFirst({
      where: {
        id: migrationId,
        organizationId, // SECURITY: Prevent cross-tenant access
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!migration) {
      throw new NotFoundException(`Migration ${migrationId} not found`);
    }

    return migration;
  }

  /**
   * Get migration status (lightweight query for polling)
   *
   * @param migrationId - Migration ID
   * @param organizationId - Organization ID (for authorization check)
   * @returns Migration status data
   */
  async getMigrationStatus(migrationId: string, organizationId: string) {
    const migration = await this.prisma.migration.findFirst({
      where: {
        id: migrationId,
        organizationId, // SECURITY: Prevent cross-tenant access
      },
      select: {
        id: true,
        status: true,
        totalRows: true,
        successCount: true,
        failedCount: true,
        skippedCount: true,
        startedAt: true,
        completedAt: true,
        errors: true,
      },
    });

    if (!migration) {
      throw new NotFoundException(`Migration ${migrationId} not found`);
    }

    return migration;
  }

  /**
   * Get migration history for an organization
   *
   * @param organizationId - Organization ID
   * @param filters - Optional filters
   * @returns List of migrations
   */
  async getMigrationHistory(
    organizationId: string,
    filters?: {
      sourceCRM?: string;
      entityType?: string;
      status?: MigrationStatus;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: any = { organizationId };

    if (filters?.sourceCRM) {
      where.sourceCRM = filters.sourceCRM;
    }

    if (filters?.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    const [migrations, total] = await Promise.all([
      this.prisma.migration.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
      }),
      this.prisma.migration.count({ where }),
    ]);

    return {
      migrations,
      total,
      limit: filters?.limit || 50,
      offset: filters?.offset || 0,
    };
  }

  /**
   * Get migration statistics for an organization
   *
   * @param organizationId - Organization ID
   * @returns Migration statistics
   */
  async getMigrationStats(organizationId: string) {
    const migrations = await this.prisma.migration.findMany({
      where: { organizationId },
      select: {
        status: true,
        sourceCRM: true,
        entityType: true,
        successCount: true,
        failedCount: true,
        totalRows: true,
      },
    });

    // Calculate statistics
    const stats = {
      totalMigrations: migrations.length,
      completed: migrations.filter((m) => m.status === MigrationStatus.COMPLETED)
        .length,
      inProgress: migrations.filter(
        (m) => m.status === MigrationStatus.IN_PROGRESS,
      ).length,
      failed: migrations.filter((m) => m.status === MigrationStatus.FAILED)
        .length,
      totalRecordsImported: migrations.reduce(
        (sum, m) => sum + m.successCount,
        0,
      ),
      totalRecordsFailed: migrations.reduce((sum, m) => sum + m.failedCount, 0),
      bySourceCRM: {} as Record<string, number>,
      byEntityType: {} as Record<string, number>,
    };

    // Group by source CRM
    migrations.forEach((m) => {
      stats.bySourceCRM[m.sourceCRM] =
        (stats.bySourceCRM[m.sourceCRM] || 0) + 1;
    });

    // Group by entity type
    migrations.forEach((m) => {
      stats.byEntityType[m.entityType] =
        (stats.byEntityType[m.entityType] || 0) + 1;
    });

    return stats;
  }

  /**
   * Delete a migration record
   *
   * @param migrationId - Migration ID
   * @param organizationId - Organization ID (for authorization check)
   */
  async deleteMigration(migrationId: string, organizationId: string) {
    // Verify migration belongs to organization
    const migration = await this.prisma.migration.findFirst({
      where: {
        id: migrationId,
        organizationId,
      },
    });

    if (!migration) {
      throw new NotFoundException(`Migration ${migrationId} not found`);
    }

    await this.prisma.migration.delete({
      where: { id: migrationId },
    });

    this.logger.log(`Migration ${migrationId} deleted`);
  }

  /**
   * Cancel an in-progress migration
   *
   * @param migrationId - Migration ID
   * @param organizationId - Organization ID (for authorization check)
   */
  async cancelMigration(migrationId: string, organizationId: string) {
    const migration = await this.prisma.migration.findFirst({
      where: {
        id: migrationId,
        organizationId,
        status: MigrationStatus.IN_PROGRESS,
      },
    });

    if (!migration) {
      throw new NotFoundException(
        `In-progress migration ${migrationId} not found`,
      );
    }

    await this.prisma.migration.update({
      where: { id: migrationId },
      data: {
        status: MigrationStatus.CANCELLED,
        completedAt: new Date(),
      },
    });

    this.logger.log(`Migration ${migrationId} cancelled`);
  }
}
