import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { LLMModule } from '../llm/llm.module';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { SupportContractsService } from './support-contracts.service';
import { AssetsAIService } from './assets-ai.service';

@Module({
  imports: [PrismaModule, LLMModule],
  controllers: [AssetsController],
  providers: [AssetsService, SupportContractsService, AssetsAIService],
  exports: [AssetsService, SupportContractsService, AssetsAIService],
})
export class AssetsModule {}
