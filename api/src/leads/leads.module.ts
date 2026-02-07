import { Module, forwardRef } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { PrismaModule } from '../database/prisma.module';
import { AnthropicModule } from '../anthropic/anthropic.module';
import { EnrichmentModule } from '../integrations/enrichment/enrichment.module';

@Module({
  imports: [
    PrismaModule,
    AnthropicModule,
    forwardRef(() => EnrichmentModule),
  ],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
