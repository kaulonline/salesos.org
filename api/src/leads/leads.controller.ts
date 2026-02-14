import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import { LeadStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { CurrentOrganization } from '../common/decorators/organization.decorator';

@ApiTags('Leads')
@ApiBearerAuth('JWT')
@Controller('leads')
@UseGuards(JwtAuthGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  create(
    @Request() req,
    @Body() createLeadDto: CreateLeadDto,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user.userId;
    return this.leadsService.create(userId, createLeadDto, organizationId);
  }

  @Get()
  findAll(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Query('status') status?: LeadStatus,
    @Query('rating') rating?: string,
    @Query('leadSource') leadSource?: string,
    @Query('minScore') minScore?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.leadsService.findAll(
      userId,
      organizationId,
      {
        status,
        rating,
        leadSource,
        minScore: minScore ? parseInt(minScore) : undefined,
        cursor,
        limit: limit ? parseInt(limit) : undefined,
      },
      isAdmin,
    );
  }

  @Get('stats')
  getStats(@Request() req, @CurrentOrganization() organizationId: string) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.leadsService.getStats(userId, organizationId, isAdmin);
  }

  @Get(':id')
  findOne(
    @Request() req,
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.leadsService.findOne(id, userId, organizationId, isAdmin);
  }

  @Patch(':id')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateLeadDto: UpdateLeadDto,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.leadsService.update(id, userId, organizationId, updateLeadDto, isAdmin);
  }

  @Post(':id/score')
  scoreLead(
    @Request() req,
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.leadsService.scoreLead(id, userId, organizationId, isAdmin);
  }

  @Post(':id/convert')
  convertLead(
    @Param('id') id: string,
    @Request() req,
    @Body() convertLeadDto: ConvertLeadDto,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.leadsService.convertLead(id, userId, organizationId, convertLeadDto, isAdmin);
  }

  @Delete(':id')
  remove(
    @Request() req,
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.leadsService.remove(id, userId, organizationId, isAdmin);
  }

  // Bulk Operations
  @Post('bulk/update')
  bulkUpdate(
    @Request() req,
    @Body() body: { ids: string[]; updates: UpdateLeadDto },
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.leadsService.bulkUpdate(body.ids, userId, organizationId, body.updates, isAdmin);
  }

  @Post('bulk/delete')
  bulkDelete(
    @Request() req,
    @Body() body: { ids: string[] },
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.leadsService.bulkDelete(body.ids, userId, organizationId, isAdmin);
  }

  @Post('bulk/assign')
  bulkAssign(
    @Request() req,
    @Body() body: { ids: string[]; newOwnerId: string },
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.leadsService.bulkAssign(body.ids, userId, organizationId, body.newOwnerId, isAdmin);
  }
}
