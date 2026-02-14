// Database Backup Service - Manages PostgreSQL database backups
import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { ApplicationLogService, LogCategory, TransactionStatus } from './application-log.service';
import { BackupStatus, BackupType } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const execAsync = promisify(exec);
const fsPromises = fs.promises;

export interface CreateBackupDto {
  type?: BackupType;
  description?: string;
  compressed?: boolean;
  retentionDays?: number;
}

export interface BackupListQuery {
  status?: BackupStatus;
  type?: BackupType;
  limit?: number;
  offset?: number;
}

export interface BackupStats {
  totalBackups: number;
  completedBackups: number;
  failedBackups: number;
  totalSizeBytes: bigint;
  oldestBackup: Date | null;
  newestBackup: Date | null;
  scheduledBackups: number;
}

@Injectable()
export class DatabaseBackupService {
  private readonly logger = new Logger(DatabaseBackupService.name);
  private readonly backupDir: string;
  private readonly databaseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly applicationLogService: ApplicationLogService,
  ) {
    // Default backup directory
    this.backupDir = this.configService.get<string>('BACKUP_DIR') || '/opt/IRIS_Sales_GPT/api/backups';
    this.databaseUrl = this.configService.get<string>('DATABASE_URL') || '';

    // Ensure backup directory exists
    this.ensureBackupDirectory();
  }

  /**
   * Ensure backup directory exists
   */
  private async ensureBackupDirectory(): Promise<void> {
    try {
      await fsPromises.mkdir(this.backupDir, { recursive: true });
    } catch (error) {
      this.logger.error(`Failed to create backup directory: ${error.message}`);
    }
  }

  /**
   * Parse database URL to extract connection details
   */
  private parseDatabaseUrl(): { host: string; port: string; database: string; user: string; password: string } {
    try {
      const url = new URL(this.databaseUrl);
      return {
        host: url.hostname,
        port: url.port || '5432',
        database: url.pathname.slice(1).split('?')[0],
        user: url.username,
        password: url.password,
      };
    } catch (error) {
      this.logger.error(`Failed to parse DATABASE_URL: ${error.message}`);
      throw new BadRequestException('Invalid database configuration');
    }
  }

  /**
   * Generate backup filename
   */
  private generateFilename(type: BackupType, compressed: boolean): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = compressed ? '.sql.gz' : '.sql';
    return `backup_${type.toLowerCase()}_${timestamp}${extension}`;
  }

  /**
   * Calculate file checksum
   */
  private async calculateChecksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Get database statistics
   */
  private async getDatabaseStats(): Promise<{ tableCount: number; rowCount: bigint }> {
    try {
      // Get table count
      const tables = await this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint as count FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `;

      // Get approximate row count (faster than exact count)
      // Cast to bigint to ensure proper type handling
      const rows = await this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COALESCE(SUM(n_live_tup), 0)::bigint as count
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
      `;

      // Ensure we convert to BigInt properly (Prisma may return as number or string)
      const rowCountValue = rows[0]?.count;
      const rowCount = typeof rowCountValue === 'bigint'
        ? rowCountValue
        : BigInt(String(rowCountValue || 0));

      return {
        tableCount: Number(tables[0]?.count || 0),
        rowCount,
      };
    } catch (error) {
      this.logger.warn(`Failed to get database stats: ${error.message}`);
      return { tableCount: 0, rowCount: BigInt(0) };
    }
  }

  /**
   * Create a new database backup
   */
  async createBackup(dto: CreateBackupDto, userId: string): Promise<any> {
    const type = dto.type || BackupType.FULL;
    const compressed = dto.compressed ?? true;
    const retentionDays = dto.retentionDays || 30;
    const filename = this.generateFilename(type, compressed);
    const filePath = path.join(this.backupDir, filename);

    // Create backup record
    const backup = await this.prisma.databaseBackup.create({
      data: {
        type,
        status: BackupStatus.PENDING,
        filename,
        filePath,
        compressed,
        description: dto.description,
        retentionDays,
        expiresAt: new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000),
        createdBy: userId,
      },
    });

    // Log backup initiation
    await this.applicationLogService.logTransaction(
      'DatabaseBackupService.createBackup',
      'BACKUP_INITIATED',
      TransactionStatus.PENDING,
      `Database backup initiated: ${filename}`,
      {
        category: LogCategory.DATABASE,
        userId,
        entityType: 'DatabaseBackup',
        entityId: backup.id,
        metadata: { type, compressed, retentionDays },
        tags: ['backup', 'database'],
      }
    );

    // Start backup process asynchronously
    this.executeBackup(backup.id, filePath, type, compressed, userId).catch((error) => {
      this.logger.error(`Backup ${backup.id} failed: ${error.message}`);
    });

    return this.formatBackupResponse(backup);
  }

  /**
   * Execute the actual backup process
   */
  private async executeBackup(
    backupId: string,
    filePath: string,
    type: BackupType,
    compressed: boolean,
    userId: string,
  ): Promise<void> {
    const startTime = Date.now();
    const dbConfig = this.parseDatabaseUrl();

    try {
      // Update status to in progress
      await this.prisma.databaseBackup.update({
        where: { id: backupId },
        data: {
          status: BackupStatus.IN_PROGRESS,
          startedAt: new Date(),
          databaseName: dbConfig.database,
        },
      });

      // Build pg_dump command
      const pgDumpArgs = [
        `-h ${dbConfig.host}`,
        `-p ${dbConfig.port}`,
        `-U ${dbConfig.user}`,
        `-d ${dbConfig.database}`,
        '--no-password', // Use PGPASSWORD env var
      ];

      // Add type-specific options
      switch (type) {
        case BackupType.SCHEMA_ONLY:
          pgDumpArgs.push('--schema-only');
          break;
        case BackupType.DATA_ONLY:
          pgDumpArgs.push('--data-only');
          break;
        case BackupType.FULL:
        default:
          // Full backup, no additional flags needed
          break;
      }

      // Build command with optional compression
      let command: string;
      if (compressed) {
        command = `PGPASSWORD='${dbConfig.password}' pg_dump ${pgDumpArgs.join(' ')} | gzip > '${filePath}'`;
      } else {
        command = `PGPASSWORD='${dbConfig.password}' pg_dump ${pgDumpArgs.join(' ')} > '${filePath}'`;
      }

      // Execute backup
      await execAsync(command, {
        timeout: 30 * 60 * 1000, // 30 minute timeout
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer
      });

      // Get file stats
      const stats = await fsPromises.stat(filePath);
      const checksum = await this.calculateChecksum(filePath);
      const dbStats = await this.getDatabaseStats();
      const duration = Date.now() - startTime;

      // Update backup record with success
      const updatedBackup = await this.prisma.databaseBackup.update({
        where: { id: backupId },
        data: {
          status: BackupStatus.COMPLETED,
          completedAt: new Date(),
          size: stats.size,
          checksum,
          duration,
          tableCount: dbStats.tableCount,
          rowCount: dbStats.rowCount,
        },
      });

      // Log success
      await this.applicationLogService.logTransaction(
        'DatabaseBackupService.executeBackup',
        'BACKUP_COMPLETED',
        TransactionStatus.SUCCESS,
        `Database backup completed: ${updatedBackup.filename} (${this.formatBytes(stats.size)})`,
        {
          category: LogCategory.DATABASE,
          userId,
          entityType: 'DatabaseBackup',
          entityId: backupId,
          metadata: {
            size: stats.size.toString(),
            duration,
            tableCount: dbStats.tableCount,
            rowCount: dbStats.rowCount.toString(),
          },
          tags: ['backup', 'database', 'success'],
        }
      );

      this.logger.log(`Backup ${backupId} completed: ${this.formatBytes(stats.size)} in ${duration}ms`);
    } catch (error) {
      // Update backup record with failure
      await this.prisma.databaseBackup.update({
        where: { id: backupId },
        data: {
          status: BackupStatus.FAILED,
          completedAt: new Date(),
          duration: Date.now() - startTime,
          errorMessage: error.message,
        },
      });

      // Log failure
      await this.applicationLogService.logTransaction(
        'DatabaseBackupService.executeBackup',
        'BACKUP_FAILED',
        TransactionStatus.FAILED,
        `Database backup failed: ${error.message}`,
        {
          category: LogCategory.DATABASE,
          userId,
          entityType: 'DatabaseBackup',
          entityId: backupId,
          metadata: { error: error.message },
          tags: ['backup', 'database', 'failed'],
        }
      );

      this.logger.error(`Backup ${backupId} failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get list of backups
   */
  async getBackups(query: BackupListQuery): Promise<{ backups: any[]; total: number }> {
    const where: any = {
      // Exclude deleted backups by default
      status: { not: BackupStatus.DELETED },
    };
    // If specific status requested, override the default filter
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;

    const [backups, total] = await Promise.all([
      this.prisma.databaseBackup.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.limit || 20,
        skip: query.offset || 0,
      }),
      this.prisma.databaseBackup.count({ where }),
    ]);

    return {
      backups: backups.map(this.formatBackupResponse),
      total,
    };
  }

  /**
   * Get single backup by ID
   */
  async getBackup(id: string): Promise<any> {
    const backup = await this.prisma.databaseBackup.findUnique({
      where: { id },
    });

    if (!backup) {
      throw new NotFoundException('Backup not found');
    }

    return this.formatBackupResponse(backup);
  }

  /**
   * Delete a backup
   */
  async deleteBackup(id: string, userId: string): Promise<{ success: boolean; message: string }> {
    const backup = await this.prisma.databaseBackup.findUnique({
      where: { id },
    });

    if (!backup) {
      throw new NotFoundException('Backup not found');
    }

    // Delete file if exists
    if (backup.filePath) {
      try {
        await fsPromises.unlink(backup.filePath);
      } catch (error) {
        // File may already be deleted, log but don't fail
        this.logger.warn(`Failed to delete backup file: ${error.message}`);
      }
    }

    // Update status to deleted
    await this.prisma.databaseBackup.update({
      where: { id },
      data: { status: BackupStatus.DELETED },
    });

    // Log deletion
    await this.applicationLogService.info(
      'DatabaseBackupService.deleteBackup',
      `Backup deleted: ${backup.filename}`,
      {
        category: LogCategory.DATABASE,
        userId,
        entityType: 'DatabaseBackup',
        entityId: id,
        tags: ['backup', 'delete'],
      }
    );

    return { success: true, message: 'Backup deleted successfully' };
  }

  /**
   * Get backup statistics
   */
  async getBackupStats(): Promise<BackupStats> {
    // Exclude DELETED backups from all stats
    const notDeleted = { status: { not: BackupStatus.DELETED } };

    const [total, completed, failed, sizeResult, oldestResult, newestResult, schedules] = await Promise.all([
      this.prisma.databaseBackup.count({ where: notDeleted }),
      this.prisma.databaseBackup.count({ where: { status: BackupStatus.COMPLETED } }),
      this.prisma.databaseBackup.count({ where: { status: BackupStatus.FAILED } }),
      this.prisma.databaseBackup.aggregate({
        where: { status: BackupStatus.COMPLETED },
        _sum: { size: true },
      }),
      this.prisma.databaseBackup.findFirst({
        where: { status: BackupStatus.COMPLETED },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
      this.prisma.databaseBackup.findFirst({
        where: { status: BackupStatus.COMPLETED },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      this.prisma.backupSchedule.count({ where: { enabled: true } }),
    ]);

    return {
      totalBackups: total,
      completedBackups: completed,
      failedBackups: failed,
      totalSizeBytes: sizeResult._sum.size || BigInt(0),
      oldestBackup: oldestResult?.createdAt || null,
      newestBackup: newestResult?.createdAt || null,
      scheduledBackups: schedules,
    };
  }

  /**
   * Download backup file path
   */
  async getBackupFilePath(id: string): Promise<string> {
    const backup = await this.prisma.databaseBackup.findUnique({
      where: { id },
    });

    if (!backup) {
      throw new NotFoundException('Backup not found');
    }

    if (backup.status !== BackupStatus.COMPLETED) {
      throw new BadRequestException('Backup is not available for download');
    }

    if (!backup.filePath || !fs.existsSync(backup.filePath)) {
      throw new NotFoundException('Backup file not found');
    }

    return backup.filePath;
  }

  /**
   * Clean up expired backups
   */
  async cleanupExpiredBackups(): Promise<{ deleted: number }> {
    const expiredBackups = await this.prisma.databaseBackup.findMany({
      where: {
        expiresAt: { lte: new Date() },
        status: { not: BackupStatus.DELETED },
      },
    });

    let deleted = 0;
    for (const backup of expiredBackups) {
      try {
        if (backup.filePath && fs.existsSync(backup.filePath)) {
          await fsPromises.unlink(backup.filePath);
        }
        await this.prisma.databaseBackup.update({
          where: { id: backup.id },
          data: { status: BackupStatus.DELETED },
        });
        deleted++;
      } catch (error) {
        this.logger.error(`Failed to delete expired backup ${backup.id}: ${error.message}`);
      }
    }

    if (deleted > 0) {
      this.logger.log(`Cleaned up ${deleted} expired backups`);
    }

    return { deleted };
  }

  /**
   * Format backup response (convert BigInt to string for JSON serialization)
   */
  private formatBackupResponse(backup: any): any {
    return {
      ...backup,
      size: backup.size?.toString() || '0',
      rowCount: backup.rowCount?.toString() || null,
    };
  }

  /**
   * Format bytes to human readable
   */
  private formatBytes(bytes: number | bigint): string {
    const b = Number(bytes);
    if (b === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return parseFloat((b / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // ============================================
  // BACKUP SCHEDULES
  // ============================================

  /**
   * Get all backup schedules
   */
  async getSchedules(): Promise<any[]> {
    return this.prisma.backupSchedule.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create backup schedule
   */
  async createSchedule(data: {
    name: string;
    cronExpression?: string;
    backupType?: BackupType;
    retentionDays?: number;
  }, userId: string): Promise<any> {
    return this.prisma.backupSchedule.create({
      data: {
        name: data.name,
        cronExpression: data.cronExpression || '0 2 * * *',
        backupType: data.backupType || BackupType.FULL,
        retentionDays: data.retentionDays || 30,
        createdBy: userId,
      },
    });
  }

  /**
   * Update backup schedule
   */
  async updateSchedule(id: string, data: {
    name?: string;
    enabled?: boolean;
    cronExpression?: string;
    backupType?: BackupType;
    retentionDays?: number;
  }): Promise<any> {
    return this.prisma.backupSchedule.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete backup schedule
   */
  async deleteSchedule(id: string): Promise<{ success: boolean }> {
    await this.prisma.backupSchedule.delete({ where: { id } });
    return { success: true };
  }
}
