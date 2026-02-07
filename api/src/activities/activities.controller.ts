import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { ActivityType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { CurrentOrganization } from '../common/decorators/organization.decorator';

@Controller('activities')
@UseGuards(JwtAuthGuard)
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post()
  create(
    @Request() req,
    @Body() createDto: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user.userId;
    return this.activitiesService.createActivity(createDto, userId, organizationId);
  }

  @Get()
  findAll(
    @Request() req,
    @Query('type') type?: ActivityType,
    @Query('leadId') leadId?: string,
    @Query('accountId') accountId?: string,
    @Query('contactId') contactId?: string,
    @Query('opportunityId') opportunityId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentOrganization() organizationId?: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.activitiesService.listActivities({
      type,
      userId: req.user.userId,
      leadId,
      accountId,
      contactId,
      opportunityId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    }, organizationId!, isAdmin);
  }

  @Get('stats')
  getStats(
    @Request() req,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.activitiesService.getActivityStats(organizationId, userId, isAdmin);
  }

  @Get('count')
  getActivityCount(
    @Request() req,
    @Query('date') date?: string,
    @Query('type') type?: ActivityType,
    @CurrentOrganization() organizationId?: string,
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.activitiesService.getActivityCountByDate(userId, organizationId!, date, type, isAdmin);
  }

  @Get('timeline/:recordType/:recordId')
  getTimeline(
    @Request() req,
    @Param('recordType') recordType: string,
    @Param('recordId') recordId: string,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.activitiesService.getTimeline(recordType, recordId, organizationId, userId, isAdmin);
  }

  @Get(':id')
  findOne(
    @Request() req,
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.activitiesService.getActivity(id, req.user.userId, organizationId, isAdmin);
  }

  @Post(':id/extract-insights')
  extractInsights(
    @Request() req,
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.activitiesService.extractInsights(id, req.user.userId, organizationId, isAdmin);
  }
}
