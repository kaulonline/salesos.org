import { Module } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { ActivitiesController } from './activities.controller';
import { PrismaModule } from '../database/prisma.module';
import { AnthropicModule } from '../anthropic/anthropic.module';

@Module({
  imports: [PrismaModule, AnthropicModule],
  controllers: [ActivitiesController],
  providers: [ActivitiesService],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
