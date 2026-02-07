import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../database/prisma.module';
import { OpenAIIntegrationModule } from '../openai/openai.module';
import { AnthropicIntegrationModule } from '../anthropic/anthropic.module';
import { AIService } from './ai.service';
import { AIController } from './ai.controller';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    OpenAIIntegrationModule,
    AnthropicIntegrationModule,
  ],
  controllers: [AIController],
  providers: [AIService],
  exports: [AIService],
})
export class AIModule {}
