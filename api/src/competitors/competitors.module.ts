import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { LLMModule } from '../llm/llm.module';
import { CompetitorsController } from './competitors.controller';
import { CompetitorsService } from './competitors.service';
import { BattlecardsService } from './battlecards.service';
import { CompetitorsAIService } from './competitors-ai.service';

@Module({
  imports: [PrismaModule, LLMModule],
  controllers: [CompetitorsController],
  providers: [CompetitorsService, BattlecardsService, CompetitorsAIService],
  exports: [CompetitorsService, BattlecardsService, CompetitorsAIService],
})
export class CompetitorsModule {}
