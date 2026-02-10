import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { DuplicateDetectionService } from './duplicate-detection.service';
import { DuplicatesController } from './duplicates.controller';

@Module({
  imports: [PrismaModule],
  controllers: [DuplicatesController],
  providers: [DuplicateDetectionService],
  exports: [DuplicateDetectionService],
})
export class DuplicatesModule {}
