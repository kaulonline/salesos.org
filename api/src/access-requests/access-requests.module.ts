import { Module } from '@nestjs/common';
import { AccessRequestsController } from './access-requests.controller';
import { AccessRequestsService } from './access-requests.service';
import { AccessRequestAIService } from './access-request-ai.service';
import { PrismaModule } from '../database/prisma.module';
import { EmailModule } from '../email/email.module';
import { LLMModule } from '../llm/llm.module';

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    LLMModule, // For AI enrichment
  ],
  controllers: [AccessRequestsController],
  providers: [
    AccessRequestsService,
    AccessRequestAIService,
  ],
  exports: [AccessRequestsService, AccessRequestAIService],
})
export class AccessRequestsModule {}
