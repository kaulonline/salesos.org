import { Module } from '@nestjs/common';
import { WebhooksManagementService } from './webhooks-management.service';
import { WebhooksManagementController } from './webhooks-management.controller';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WebhooksManagementController],
  providers: [WebhooksManagementService],
  exports: [WebhooksManagementService],
})
export class WebhooksManagementModule {}
