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
  Res,
  Req,
  SetMetadata,
  CanActivate,
  ExecutionContext,
  Injectable,
  Ip,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import type { Response, Request } from 'express';
import { Reflector } from '@nestjs/core';
import { Throttle } from '@nestjs/throttler';
import { AccessRequestsService } from './access-requests.service';
import { AIEnrichmentResult } from './access-request-ai.service';
import {
  CreateAccessRequestDto,
  UpdateAccessRequestDto,
  AccessRequestStatus,
  AccessRequestType,
  SendOrgCodeDto,
} from './dto';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';

// Roles decorator
const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// Roles guard
@Injectable()
class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!roles) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    return roles.includes(user?.role);
  }
}

@ApiTags('Access Requests')
@ApiBearerAuth('JWT')
@Controller('access-requests')
export class AccessRequestsController {
  constructor(private readonly accessRequestsService: AccessRequestsService) {}

  /**
   * PUBLIC: Submit an access request
   * POST /api/access-requests
   *
   * Rate limited: 3 requests per minute per IP
   */
  @Post()
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute per IP
  async create(
    @Body() dto: CreateAccessRequestDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Headers('x-forwarded-for') forwardedFor: string,
  ) {
    // Get real IP (handle proxies)
    const clientIp = forwardedFor?.split(',')[0]?.trim() || ip;

    return this.accessRequestsService.create(dto, {
      ip: clientIp,
      userAgent: userAgent || 'unknown',
    });
  }

  /**
   * ADMIN: Get all access requests
   * GET /api/access-requests
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async findAll(
    @Query('status') status?: AccessRequestStatus,
    @Query('requestType') requestType?: AccessRequestType,
    @Query('search') search?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.accessRequestsService.findAll({
      status,
      requestType,
      search,
      assignedToId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  /**
   * ADMIN: Get access request stats
   * GET /api/access-requests/stats
   */
  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getStats() {
    return this.accessRequestsService.getStats();
  }

  /**
   * ADMIN: Export access requests as CSV
   * GET /api/access-requests/export
   */
  @Get('export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async exportCsv(
    @Query('status') status: AccessRequestStatus,
    @Res() res: Response,
  ) {
    const csv = await this.accessRequestsService.exportCsv(status);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=access-requests-${new Date().toISOString().split('T')[0]}.csv`,
    );
    res.send(csv);
  }

  /**
   * ADMIN: Get AI-sorted access requests (prioritized by score)
   * GET /api/access-requests/ai-sorted
   * NOTE: This must be before /:id to avoid route conflicts
   */
  @Get('ai-sorted')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getAISorted(
    @Query('status') status?: string,
    @Query('minScore') minScore?: string,
    @Query('priority') priority?: string,
    @Query('limit') limit?: string,
  ) {
    return this.accessRequestsService.getAISorted({
      status,
      minScore: minScore ? parseInt(minScore, 10) : undefined,
      priority,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  /**
   * ADMIN: Get single access request
   * GET /api/access-requests/:id
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async findOne(@Param('id') id: string) {
    return this.accessRequestsService.findOne(id);
  }

  /**
   * ADMIN: Update access request
   * PATCH /api/access-requests/:id
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAccessRequestDto,
  ) {
    return this.accessRequestsService.update(id, dto);
  }

  /**
   * ADMIN: Send organization code to user
   * POST /api/access-requests/:id/send-code
   */
  @Post(':id/send-code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async sendOrganizationCode(
    @Param('id') id: string,
    @Body() dto: SendOrgCodeDto,
  ) {
    return this.accessRequestsService.sendOrganizationCode(id, dto);
  }

  /**
   * ADMIN: Convert access request to lead
   * POST /api/access-requests/:id/convert
   */
  @Post(':id/convert')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async convertToLead(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.accessRequestsService.convertToLead(id, user.id);
  }

  /**
   * ADMIN: Delete access request
   * DELETE /api/access-requests/:id
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async delete(@Param('id') id: string) {
    return this.accessRequestsService.delete(id);
  }

  /**
   * ADMIN: Re-enrich access request with AI
   * POST /api/access-requests/:id/enrich
   */
  @Post(':id/enrich')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async reEnrich(@Param('id') id: string): Promise<{ success: boolean; enrichment: AIEnrichmentResult }> {
    return this.accessRequestsService.reEnrich(id);
  }
}
