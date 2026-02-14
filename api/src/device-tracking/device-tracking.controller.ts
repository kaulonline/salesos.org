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
  Request,
  SetMetadata,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { DeviceTrackingService } from './device-tracking.service';

// Role-based access control
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

@Injectable()
export class RolesGuard implements CanActivate {
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
import {
  RegisterDeviceDto,
  UpdateDeviceDto,
  StartSessionDto,
  TrackFeatureUsageDto,
  DeviceAnalyticsFiltersDto,
  SessionAnalyticsFiltersDto,
  UpdatePushTokenDto,
  UpdatePushPreferencesDto,
} from './dto';
import { ApnsPushService } from '../notifications/apns-push.service';

@ApiTags('Device Tracking')
@ApiBearerAuth('JWT')
@Controller()
@UseGuards(JwtAuthGuard)
export class DeviceTrackingController {
  constructor(
    private readonly deviceTrackingService: DeviceTrackingService,
    private readonly apnsPushService: ApnsPushService,
  ) {}

  // ==================== USER DEVICE ENDPOINTS ====================

  @Post('devices/register')
  async registerDevice(@Request() req, @Body() dto: RegisterDeviceDto) {
    return this.deviceTrackingService.registerDevice(req.user.userId, dto);
  }

  @Patch('devices/:id')
  async updateDevice(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateDeviceDto,
  ) {
    return this.deviceTrackingService.updateDevice(id, req.user.userId, dto);
  }

  @Get('devices')
  async getUserDevices(@Request() req) {
    return this.deviceTrackingService.getUserDevices(req.user.userId);
  }

  // Push status endpoint - must be before :id route
  @Get('devices/push-status')
  async getPushStatus() {
    return this.apnsPushService.getStatus();
  }

  @Get('devices/:id')
  async getDevice(@Request() req, @Param('id') id: string) {
    return this.deviceTrackingService.getDeviceById(id, req.user.userId);
  }

  @Delete('devices/:id')
  async deactivateDevice(@Request() req, @Param('id') id: string) {
    return this.deviceTrackingService.deactivateDevice(id, req.user.userId);
  }

  // ==================== PUSH NOTIFICATION ENDPOINTS ====================

  @Post('devices/push-token')
  async updatePushToken(@Request() req, @Body() dto: UpdatePushTokenDto) {
    const device = await this.deviceTrackingService.updatePushToken(req.user.userId, dto);
    return {
      success: true,
      device: {
        id: device.id,
        deviceId: device.deviceId,
        pushEnabled: device.pushEnabled,
        hasPushToken: !!device.pushToken,
      },
    };
  }

  @Post('devices/push-preferences')
  async updatePushPreferences(@Request() req, @Body() dto: UpdatePushPreferencesDto) {
    const device = await this.deviceTrackingService.updatePushPreferences(req.user.userId, dto);
    return {
      success: true,
      pushEnabled: device.pushEnabled,
    };
  }

  @Post('devices/test-push')
  async testPush(@Request() req) {
    const result = await this.apnsPushService.sendToUser(
      req.user.userId,
      'Test Notification',
      'Push notifications are working!',
      {
        data: { type: 'test' },
      },
    );
    return {
      success: result.sent > 0,
      sent: result.sent,
      failed: result.failed,
    };
  }

  // ==================== USER SESSION ENDPOINTS ====================

  @Post('sessions/start')
  async startSession(@Request() req, @Body() dto: StartSessionDto) {
    // Extract IP and user agent from request
    const ipAddress = dto.ipAddress || req.ip || req.connection?.remoteAddress;
    const userAgent = dto.userAgent || req.headers['user-agent'];
    return this.deviceTrackingService.startSession(req.user.userId, {
      ...dto,
      ipAddress,
      userAgent,
    });
  }

  @Post('sessions/:id/heartbeat')
  async updateSessionActivity(@Request() req, @Param('id') id: string) {
    return this.deviceTrackingService.updateSessionActivity(id, req.user.userId);
  }

  @Post('sessions/:id/end')
  async endSession(@Request() req, @Param('id') id: string) {
    return this.deviceTrackingService.endSession(id, req.user.userId);
  }

  @Get('sessions/current')
  async getCurrentSession(@Request() req) {
    return this.deviceTrackingService.getCurrentSession(req.user.userId);
  }

  @Get('sessions/active')
  async getActiveSessions(@Request() req) {
    return this.deviceTrackingService.getActiveSessions(req.user.userId);
  }

  @Post('sessions/end-others')
  async endOtherSessions(@Request() req) {
    return this.deviceTrackingService.endOtherSessions(req.user.userId);
  }

  // ==================== FEATURE USAGE ENDPOINT ====================

  @Post('usage/track')
  async trackFeatureUsage(@Request() req, @Body() dto: TrackFeatureUsageDto) {
    return this.deviceTrackingService.trackFeatureUsage(req.user.userId, dto);
  }

  @Get('usage/device/:deviceId')
  async getDeviceFeatureUsage(
    @Request() req,
    @Param('deviceId') deviceId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.deviceTrackingService.getDeviceFeatureUsage(
      deviceId,
      req.user.userId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  // ==================== ADMIN ENDPOINTS ====================

  @Get('admin/observability/users/active')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  async getActiveUsersSummary() {
    return this.deviceTrackingService.getActiveUsersSummary();
  }

  @Get('admin/observability/devices')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  async getDeviceAnalytics(@Query() filters: DeviceAnalyticsFiltersDto) {
    return this.deviceTrackingService.getDeviceAnalytics(filters);
  }

  @Get('admin/observability/sessions')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  async getSessionAnalytics(@Query() filters: SessionAnalyticsFiltersDto) {
    return this.deviceTrackingService.getSessionAnalytics(filters);
  }

  @Get('admin/devices')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  async getAllDevices(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
    @Query('search') search?: string,
  ) {
    return this.deviceTrackingService.getAllDevices(
      parseInt(page, 10),
      parseInt(pageSize, 10),
      search,
    );
  }

  @Get('admin/sessions')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  async getAllSessions(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
    @Query() filters: SessionAnalyticsFiltersDto,
  ) {
    return this.deviceTrackingService.getAllSessions(
      parseInt(page, 10),
      parseInt(pageSize, 10),
      filters,
    );
  }

  @Post('admin/sessions/expire-inactive')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async expireInactiveSessions(
    @Query('inactivityMinutes') inactivityMinutes: string = '60',
  ) {
    return this.deviceTrackingService.expireInactiveSessions(
      parseInt(inactivityMinutes, 10),
    );
  }
}
