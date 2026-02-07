import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../database/prisma.module';
import { SegmentService } from './segment.service';
import { SegmentController } from './segment.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [SegmentController],
  providers: [SegmentService],
  exports: [SegmentService],
})
export class SegmentModule {}
