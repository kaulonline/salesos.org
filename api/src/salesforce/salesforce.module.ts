import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SalesforceService } from './salesforce.service';
import { SalesforceController } from './salesforce.controller';
import { SalesforceCdcService } from './salesforce-cdc.service';
import { PrismaService } from '../database/prisma.service';
import { AdminModule } from '../admin/admin.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    AdminModule,
    ScheduleModule.forRoot(), // For proactive token refresh scheduling
    forwardRef(() => NotificationsModule), // For CDC push notifications
  ],
  providers: [SalesforceService, SalesforceCdcService, PrismaService],
  controllers: [SalesforceController],
  exports: [SalesforceService, SalesforceCdcService],
})
export class SalesforceModule {}
