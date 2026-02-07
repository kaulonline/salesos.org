import { Module } from '@nestjs/common';
import { FeatureVisibilityService } from './feature-visibility.service';
import { FeatureVisibilityController } from './feature-visibility.controller';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FeatureVisibilityController],
  providers: [FeatureVisibilityService],
  exports: [FeatureVisibilityService],
})
export class FeatureVisibilityModule {}
