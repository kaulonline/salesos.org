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
  Request,
  SetMetadata,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

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
import { NotificationsGateway } from './notifications.gateway';
import { ApnsPushService } from './apns-push.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  SendNotificationDto,
  BroadcastNotificationDto,
  ScheduleNotificationDto,
  NotificationFiltersDto,
} from './dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly apnsPushService: ApnsPushService,
  ) {}

  // ==================== USER NOTIFICATION ENDPOINTS ====================

  @Get('notifications')
  async getUserNotifications(
    @Request() req,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
    @Query('unreadOnly') unreadOnly: string = 'false',
  ) {
    return this.notificationsService.getUserNotifications(
      req.user.userId,
      parseInt(page, 10),
      parseInt(pageSize, 10),
      unreadOnly === 'true',
    );
  }

  @Post('notifications/:id/read')
  async markAsRead(@Request() req, @Param('id') id: string) {
    return this.notificationsService.markAsRead(id, req.user.userId);
  }

  @Post('notifications/read-all')
  async markAllAsRead(@Request() req) {
    return this.notificationsService.markAllAsRead(req.user.userId);
  }

  @Delete('notifications/:id')
  async deleteNotification(@Request() req, @Param('id') id: string) {
    return this.notificationsService.deleteNotification(id, req.user.userId);
  }

  // ==================== ADMIN NOTIFICATION ENDPOINTS ====================

  @Get('admin/notifications')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  async getNotifications(@Query() filters: NotificationFiltersDto) {
    return this.notificationsService.getNotifications(filters);
  }

  @Get('admin/notifications/stats')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  async getNotificationStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.notificationsService.getNotificationStats(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('admin/notifications/online-users')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  async getOnlineUsers() {
    return {
      count: this.notificationsGateway.getOnlineUserCount(),
      userIds: this.notificationsGateway.getOnlineUserIds(),
    };
  }

  @Get('admin/notifications/search-users')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  async searchUsersForNotification(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.searchUsers(
      query,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('admin/notifications/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  async getNotificationById(@Param('id') id: string) {
    return this.notificationsService.getNotificationById(id);
  }

  @Post('admin/notifications/send')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  async sendNotification(
    @Request() req,
    @Body() dto: SendNotificationDto & { userId: string },
  ) {
    const notification = await this.notificationsService.sendToUser(
      dto.userId,
      dto,
      req.user.userId,
    );

    // Push via WebSocket - only mark as sent if user is online
    const wsPushed = this.notificationsGateway.pushToUser(dto.userId, {
      id: notification.id,
      title: notification.title,
      body: notification.body,
      type: notification.type,
      priority: notification.priority,
      action: notification.action || undefined,
      actionData: notification.actionData as Record<string, any> | undefined,
      createdAt: notification.createdAt,
    });

    // If user not connected via WebSocket, send via APNs push
    let apnsPushed = { sent: 0, failed: 0 };
    if (!wsPushed) {
      apnsPushed = await this.apnsPushService.sendToUser(
        dto.userId,
        notification.title,
        notification.body,
        {
          data: {
            notificationId: notification.id,
            type: notification.type,
            action: notification.action,
          },
          notificationId: notification.id,
        },
      );
    }

    // Mark as sent if delivered via either channel
    if (wsPushed || apnsPushed.sent > 0) {
      await this.notificationsService.markAsSent(notification.id);
    }

    return { ...notification, wsPushed, apnsPushed };
  }

  @Post('admin/notifications/broadcast')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async broadcastNotification(
    @Request() req,
    @Body() dto: BroadcastNotificationDto,
  ) {
    const result = await this.notificationsService.broadcast(dto, req.user.userId);

    // Push via WebSocket to all targeted users, fallback to APNs for offline users
    let wsPushedCount = 0;
    let apnsPushedCount = 0;
    for (const notification of result.notifications) {
      if (notification.userId) {
        const wsPushed = this.notificationsGateway.pushToUser(notification.userId, {
          id: notification.id,
          title: notification.title,
          body: notification.body,
          type: notification.type,
          priority: notification.priority,
          action: notification.action || undefined,
          actionData: notification.actionData as Record<string, any> | undefined,
          createdAt: notification.createdAt,
        });

        if (wsPushed) {
          await this.notificationsService.markAsSent(notification.id);
          wsPushedCount++;
        } else {
          // Fallback to APNs for offline users
          const apnsResult = await this.apnsPushService.sendToUser(
            notification.userId,
            notification.title,
            notification.body,
            {
              data: {
                notificationId: notification.id,
                type: notification.type,
                action: notification.action,
              },
              notificationId: notification.id,
            },
          );
          if (apnsResult.sent > 0) {
            await this.notificationsService.markAsSent(notification.id);
            apnsPushedCount++;
          }
        }
      }
    }

    return { ...result, wsPushedCount, apnsPushedCount };
  }

  @Post('admin/notifications/schedule')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  async scheduleNotification(
    @Request() req,
    @Body() dto: ScheduleNotificationDto,
  ) {
    return this.notificationsService.scheduleNotification(dto, req.user.userId);
  }

  // ==================== TEMPLATE ENDPOINTS ====================

  @Get('admin/notification-templates')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  async getTemplates(@Query('activeOnly') activeOnly: string = 'false') {
    return this.notificationsService.getTemplates(activeOnly === 'true');
  }

  @Get('admin/notification-templates/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  async getTemplateById(@Param('id') id: string) {
    return this.notificationsService.getTemplateById(id);
  }

  @Post('admin/notification-templates')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async createTemplate(@Body() dto: CreateTemplateDto) {
    return this.notificationsService.createTemplate(dto);
  }

  @Put('admin/notification-templates/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async updateTemplate(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.notificationsService.updateTemplate(id, dto);
  }

  @Delete('admin/notification-templates/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async deleteTemplate(@Param('id') id: string) {
    return this.notificationsService.deleteTemplate(id);
  }
}
