import { Module } from '@nestjs/common';
import { ClientErrorsController } from './client-errors.controller';
import { ClientErrorService } from './client-errors.service';
import { PrismaModule } from '../database/prisma.module';
import { AdminModule } from '../admin/admin.module';

/**
 * Module for receiving and managing client error reports from mobile and web applications.
 *
 * This module provides:
 * - Public endpoint for error reporting (POST /api/errors)
 * - Admin endpoints for error monitoring and analysis
 * - Integration with ApplicationLogService for unified logging
 * - Statistics and analytics for error tracking
 *
 * Features:
 * - Persistent storage of client errors in the database
 * - Error categorization by source (mobile/web), platform, screen
 * - Device-specific error tracking for debugging
 * - Trend analysis and top error identification
 */
@Module({
  imports: [
    PrismaModule,
    AdminModule, // Provides ApplicationLogService
  ],
  controllers: [ClientErrorsController],
  providers: [ClientErrorService],
  exports: [ClientErrorService],
})
export class ClientErrorsModule {}
