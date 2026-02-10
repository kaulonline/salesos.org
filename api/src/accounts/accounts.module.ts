import { Module, forwardRef } from '@nestjs/common';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { PrismaModule } from '../database/prisma.module';
import { EnrichmentModule } from '../integrations/enrichment/enrichment.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { IntegrationEventsModule } from '../integrations/events/integration-events.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => EnrichmentModule),
    WorkflowsModule,
    IntegrationEventsModule,
  ],
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}
