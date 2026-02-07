import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../database/prisma.module';
import { AnthropicIntegrationService } from './anthropic.service';
import { AnthropicController } from './anthropic.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [AnthropicController],
  providers: [AnthropicIntegrationService],
  exports: [AnthropicIntegrationService],
})
export class AnthropicIntegrationModule {}
