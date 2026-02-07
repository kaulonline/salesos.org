import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { LLMModule } from '../llm/llm.module';
import { SplitsController } from './splits.controller';
import { SplitsService } from './splits.service';
import { SplitsAIService } from './splits-ai.service';

@Module({
  imports: [PrismaModule, LLMModule],
  controllers: [SplitsController],
  providers: [SplitsService, SplitsAIService],
  exports: [SplitsService, SplitsAIService],
})
export class SplitsModule {}
