import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { PipelinesController } from './pipelines.controller';
import { PipelinesService } from './pipelines.service';

@Module({
  imports: [PrismaModule],
  controllers: [PipelinesController],
  providers: [PipelinesService],
  exports: [PipelinesService],
})
export class PipelinesModule {
  // Note: Default pipelines are created per-organization when an organization is created,
  // not at application startup. The ensureDefaultPipeline method requires an organizationId
  // and should be called during organization creation/onboarding flow.
}
