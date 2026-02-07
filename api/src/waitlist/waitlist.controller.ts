import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  SetMetadata,
  CanActivate,
  ExecutionContext,
  Injectable,
  Ip,
  Headers,
} from '@nestjs/common';
import type { Response } from 'express';
import { Reflector } from '@nestjs/core';
import { Throttle } from '@nestjs/throttler';
import { WaitlistService } from './waitlist.service';
import { CreateWaitlistDto, UpdateWaitlistDto, WaitlistStatus } from './dto';
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

@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  /**
   * PUBLIC: Subscribe to waitlist
   * POST /api/waitlist/subscribe
   *
   * Rate limited: 3 requests per minute, 10 per hour per IP
   * This prevents spam while allowing legitimate retries
   */
  @Post('subscribe')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute per IP
  async subscribe(
    @Body() dto: CreateWaitlistDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Headers('x-forwarded-for') forwardedFor: string,
  ) {
    // Get real IP (handle proxies)
    const clientIp = forwardedFor?.split(',')[0]?.trim() || ip;

    return this.waitlistService.subscribe(dto, {
      ip: clientIp,
      userAgent: userAgent || 'unknown',
    });
  }

  /**
   * ADMIN: Get all subscribers
   * GET /api/waitlist
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getAll(
    @Query('status') status?: WaitlistStatus,
    @Query('search') search?: string,
    @Query('source') source?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.waitlistService.getAll({
      status,
      search,
      source,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  /**
   * ADMIN: Get waitlist stats
   * GET /api/waitlist/stats
   */
  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getStats() {
    return this.waitlistService.getStats();
  }

  /**
   * ADMIN: Export subscribers as CSV
   * GET /api/waitlist/export
   */
  @Get('export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async exportCsv(
    @Query('status') status: WaitlistStatus,
    @Res() res: Response,
  ) {
    const csv = await this.waitlistService.exportCsv(status);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=waitlist-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  }

  /**
   * ADMIN: Update subscriber
   * PUT /api/waitlist/:id
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async update(@Param('id') id: string, @Body() dto: UpdateWaitlistDto) {
    return this.waitlistService.update(id, dto);
  }

  /**
   * ADMIN: Delete subscriber
   * DELETE /api/waitlist/:id
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async delete(@Param('id') id: string) {
    return this.waitlistService.delete(id);
  }

  /**
   * ADMIN: Bulk delete subscribers
   * POST /api/waitlist/bulk-delete
   */
  @Post('bulk-delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async bulkDelete(@Body() body: { ids: string[] }) {
    return this.waitlistService.bulkDelete(body.ids);
  }
}
