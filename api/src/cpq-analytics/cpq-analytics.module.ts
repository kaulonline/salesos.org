import { Module } from '@nestjs/common';
import { CpqAnalyticsService } from './cpq-analytics.service';
import { CpqAnalyticsController } from './cpq-analytics.controller';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CpqAnalyticsController],
  providers: [CpqAnalyticsService],
  exports: [CpqAnalyticsService],
})
export class CpqAnalyticsModule {}
