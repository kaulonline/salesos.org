import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../database/prisma.module';
import { OpenAIIntegrationService } from './openai.service';
import { OpenAIController } from './openai.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [OpenAIController],
  providers: [OpenAIIntegrationService],
  exports: [OpenAIIntegrationService],
})
export class OpenAIIntegrationModule {}
