import { Module } from '@nestjs/common';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { PrismaModule } from '../database/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PageIndexModule } from '../pageindex/pageindex.module';
import { IntegrationEventsModule } from '../integrations/events/integration-events.module';

@Module({
  imports: [PrismaModule, NotificationsModule, PageIndexModule, IntegrationEventsModule],
  controllers: [QuotesController],
  providers: [QuotesService],
  exports: [QuotesService],
})
export class QuotesModule {}
