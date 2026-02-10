import { Module, forwardRef } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { PrismaModule } from '../database/prisma.module';
import { AnthropicModule } from '../anthropic/anthropic.module';
import { EnrichmentModule } from '../integrations/enrichment/enrichment.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { IntegrationEventsModule } from '../integrations/events/integration-events.module';
import { DuplicatesModule } from '../duplicates/duplicates.module';

@Module({
  imports: [
    PrismaModule,
    AnthropicModule,
    forwardRef(() => EnrichmentModule),
    WorkflowsModule,
    IntegrationEventsModule,
    DuplicatesModule,
  ],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
