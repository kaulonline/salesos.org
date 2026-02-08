import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { ApprovalWorkflowsService } from './approval-workflows.service';
import { ApprovalWorkflowsController, ApprovalRequestsController } from './approval-workflows.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ApprovalWorkflowsController, ApprovalRequestsController],
  providers: [ApprovalWorkflowsService],
  exports: [ApprovalWorkflowsService],
})
export class ApprovalWorkflowsModule {}
