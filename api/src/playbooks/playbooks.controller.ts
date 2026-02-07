import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { PlaybooksService } from './playbooks.service';
import { CurrentOrganization } from '../common/decorators/organization.decorator';
import {
  PlaybookTrigger,
  PlaybookStepType,
  PlaybookExecutionStatus,
} from '@prisma/client';

@Controller('playbooks')
@UseGuards(JwtAuthGuard)
export class PlaybooksController {
  constructor(private readonly playbooksService: PlaybooksService) {}

  // ============================================
  // Playbook CRUD
  // ============================================

  @Get()
  async findAll(
    @CurrentOrganization() organizationId: string,
    @Query('isActive') isActive?: string,
    @Query('trigger') trigger?: PlaybookTrigger,
  ) {
    return this.playbooksService.findAll(organizationId, {
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      trigger,
    });
  }

  @Get('stats')
  async getStats(@CurrentOrganization() organizationId: string) {
    return this.playbooksService.getStats(organizationId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.playbooksService.findOne(id, organizationId);
  }

  @Post()
  async create(
    @Body() body: {
      name: string;
      description?: string;
      trigger: PlaybookTrigger;
      targetStage?: string;
      targetDealType?: string;
      isActive?: boolean;
      steps?: Array<{
        type: PlaybookStepType;
        title: string;
        description?: string;
        daysOffset?: number;
        isRequired?: boolean;
        config?: Record<string, any>;
      }>;
    },
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    return this.playbooksService.create(body, userId, organizationId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      description?: string;
      trigger?: PlaybookTrigger;
      targetStage?: string;
      targetDealType?: string;
      isActive?: boolean;
    },
    @CurrentOrganization() organizationId: string,
  ) {
    return this.playbooksService.update(id, body, organizationId);
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.playbooksService.delete(id, organizationId);
  }

  @Post(':id/duplicate')
  async duplicate(
    @Param('id') id: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    return this.playbooksService.duplicate(id, userId, organizationId);
  }

  // ============================================
  // Step Management
  // ============================================

  @Post(':id/steps')
  async addStep(
    @Param('id') id: string,
    @Body() body: {
      type: PlaybookStepType;
      title: string;
      description?: string;
      daysOffset?: number;
      isRequired?: boolean;
      config?: Record<string, any>;
    },
    @CurrentOrganization() organizationId: string,
  ) {
    return this.playbooksService.addStep(id, body, organizationId);
  }

  @Patch(':id/steps/:stepId')
  async updateStep(
    @Param('id') id: string,
    @Param('stepId') stepId: string,
    @Body() body: {
      type?: PlaybookStepType;
      title?: string;
      description?: string;
      daysOffset?: number;
      isRequired?: boolean;
      config?: Record<string, any>;
      order?: number;
    },
    @CurrentOrganization() organizationId: string,
  ) {
    return this.playbooksService.updateStep(id, stepId, body, organizationId);
  }

  @Delete(':id/steps/:stepId')
  async deleteStep(
    @Param('id') id: string,
    @Param('stepId') stepId: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.playbooksService.deleteStep(id, stepId, organizationId);
  }

  @Post(':id/steps/reorder')
  async reorderSteps(
    @Param('id') id: string,
    @Body() body: { stepIds: string[] },
    @CurrentOrganization() organizationId: string,
  ) {
    return this.playbooksService.reorderSteps(id, body.stepIds, organizationId);
  }

  // ============================================
  // Execution Management
  // ============================================

  @Get('executions/list')
  async getExecutions(
    @CurrentOrganization() organizationId: string,
    @Req() req: any,
    @Query('playbookId') playbookId?: string,
    @Query('dealId') dealId?: string,
    @Query('status') status?: PlaybookExecutionStatus,
  ) {
    const userId = req?.user?.userId || req?.user?.id;
    return this.playbooksService.getExecutions(organizationId, {
      playbookId,
      dealId,
      status,
      userId,
    });
  }

  @Get('executions/:executionId')
  async getExecution(
    @Param('executionId') executionId: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.playbooksService.getExecution(executionId, organizationId);
  }

  @Post(':id/start')
  async startExecution(
    @Param('id') id: string,
    @Body() body: {
      dealId?: string;
      leadId?: string;
      accountId?: string;
    },
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    return this.playbooksService.startExecution(id, body, userId, organizationId);
  }

  @Post('executions/:executionId/steps/:stepId/complete')
  async completeStep(
    @Param('executionId') executionId: string,
    @Param('stepId') stepId: string,
    @Body() body: { outcome?: string; notes?: string },
    @CurrentOrganization() organizationId: string,
  ) {
    return this.playbooksService.completeStep(executionId, stepId, organizationId, body.outcome, body.notes);
  }

  @Post('executions/:executionId/steps/:stepId/skip')
  async skipStep(
    @Param('executionId') executionId: string,
    @Param('stepId') stepId: string,
    @Body() body: { reason?: string },
    @CurrentOrganization() organizationId: string,
  ) {
    return this.playbooksService.skipStep(executionId, stepId, organizationId, body.reason);
  }

  @Post('executions/:executionId/cancel')
  async cancelExecution(
    @Param('executionId') executionId: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.playbooksService.cancelExecution(executionId, organizationId);
  }
}
