import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenAIService } from './openai.service';
import { AIController } from './ai.controller';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [AIController],
  providers: [OpenAIService],
  exports: [OpenAIService],
})
export class AIModule {}
