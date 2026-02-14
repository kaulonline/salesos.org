import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  ParseEnumPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { UsageTrackingService, UsageFilters } from './usage-tracking.service';
import { ApiServiceType } from '@prisma/client';

@ApiTags('Usage Tracking')
@ApiBearerAuth('JWT')
@Controller('admin/usage')
@UseGuards(JwtAuthGuard)
export class UsageTrackingController {
  constructor(private readonly usageService: UsageTrackingService) {}

  /**
   * Get dashboard statistics for usage overview
   */
  @Get('dashboard')
  async getDashboardStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('serviceType') serviceType?: ApiServiceType,
  ) {
    const filters: UsageFilters = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      serviceType,
    };

    return this.usageService.getDashboardStats(filters);
  }

  /**
   * Get all users' usage summary
   */
  @Get('users')
  async getAllUsersUsage(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('serviceType') serviceType?: ApiServiceType,
  ) {
    const filters: UsageFilters = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      serviceType,
    };

    return this.usageService.getAllUsersUsage(filters);
  }

  /**
   * Get detailed usage for a specific user
   */
  @Get('users/:userId')
  async getUserDetailedUsage(
    @Param('userId') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const filters: UsageFilters = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    return this.usageService.getUserDetailedUsage(userId, filters);
  }
}

