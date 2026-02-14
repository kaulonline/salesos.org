// Admin Module - Wires up admin service and controller
import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ApplicationLogService } from './application-log.service';
import { UsageTrackingService } from './usage-tracking.service';
import { UsageTrackingController } from './usage-tracking.controller';
import { SystemSettingsService } from './system-settings.service';
import { DatabaseBackupService } from './database-backup.service';
import { PrismaModule } from '../database/prisma.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { EmailModule } from '../email/email.module';
import { JwtModule } from '@nestjs/jwt';

@Global() // Make ApplicationLogService and SystemSettingsService available globally
@Module({
  imports: [
    PrismaModule,
    IntegrationsModule,
    EmailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AdminController, UsageTrackingController],
  providers: [AdminService, ApplicationLogService, UsageTrackingService, SystemSettingsService, DatabaseBackupService],
  exports: [AdminService, ApplicationLogService, UsageTrackingService, SystemSettingsService, DatabaseBackupService],
})
export class AdminModule {}
