import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { DeviceType, SessionStatus, Prisma, PushTokenType } from '@prisma/client';
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

@Injectable()
export class DeviceTrackingService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== DEVICE MANAGEMENT ====================

  async registerDevice(userId: string, dto: RegisterDeviceDto) {
    // Upsert device - update if exists, create if not
    return this.prisma.userDevice.upsert({
      where: {
        userId_deviceId: {
          userId,
          deviceId: dto.deviceId,
        },
      },
      update: {
        deviceType: dto.deviceType,
        deviceName: dto.deviceName,
        deviceModel: dto.deviceModel,
        osVersion: dto.osVersion,
        appVersion: dto.appVersion,
        pushToken: dto.pushToken,
        pushTokenType: dto.pushTokenType,
        pushTokenUpdatedAt: dto.pushToken ? new Date() : undefined,
        metadata: dto.metadata as Prisma.InputJsonValue,
        isActive: true,
        lastSeenAt: new Date(),
      },
      create: {
        userId,
        deviceType: dto.deviceType,
        deviceId: dto.deviceId,
        deviceName: dto.deviceName,
        deviceModel: dto.deviceModel,
        osVersion: dto.osVersion,
        appVersion: dto.appVersion,
        pushToken: dto.pushToken,
        pushTokenType: dto.pushTokenType,
        pushTokenUpdatedAt: dto.pushToken ? new Date() : null,
        metadata: dto.metadata as Prisma.InputJsonValue,
      },
    });
  }

  // ==================== PUSH TOKEN MANAGEMENT ====================

  async updatePushToken(userId: string, dto: UpdatePushTokenDto) {
    const device = await this.prisma.userDevice.findUnique({
      where: {
        userId_deviceId: {
          userId,
          deviceId: dto.deviceId,
        },
      },
    });

    if (!device) {
      // Auto-register device with minimal info
      const deviceType = dto.pushTokenType === PushTokenType.APNS
        ? DeviceType.MOBILE_IOS
        : DeviceType.MOBILE_ANDROID;

      return this.prisma.userDevice.create({
        data: {
          userId,
          deviceId: dto.deviceId,
          deviceType,
          pushToken: dto.pushToken,
          pushTokenType: dto.pushTokenType,
          pushTokenUpdatedAt: new Date(),
          isActive: true,
          lastSeenAt: new Date(),
        },
      });
    }

    return this.prisma.userDevice.update({
      where: { id: device.id },
      data: {
        pushToken: dto.pushToken,
        pushTokenType: dto.pushTokenType,
        pushTokenUpdatedAt: new Date(),
        lastSeenAt: new Date(),
      },
    });
  }

  async updatePushPreferences(userId: string, dto: UpdatePushPreferencesDto) {
    const device = await this.prisma.userDevice.findUnique({
      where: {
        userId_deviceId: {
          userId,
          deviceId: dto.deviceId,
        },
      },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    return this.prisma.userDevice.update({
      where: { id: device.id },
      data: {
        pushEnabled: dto.pushEnabled,
      },
    });
  }

  async getActivePushDevices(userId: string) {
    return this.prisma.userDevice.findMany({
      where: {
        userId,
        isActive: true,
        pushEnabled: true,
        pushToken: { not: null },
      },
      orderBy: { lastSeenAt: 'desc' },
    });
  }

  async invalidatePushToken(pushToken: string) {
    return this.prisma.userDevice.updateMany({
      where: { pushToken },
      data: {
        pushToken: null,
        pushTokenUpdatedAt: new Date(),
      },
    });
  }

  async updateDevice(deviceId: string, userId: string, dto: UpdateDeviceDto) {
    const device = await this.prisma.userDevice.findFirst({
      where: { id: deviceId, userId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    return this.prisma.userDevice.update({
      where: { id: deviceId },
      data: {
        deviceName: dto.deviceName,
        osVersion: dto.osVersion,
        appVersion: dto.appVersion,
        isActive: dto.isActive,
        metadata: dto.metadata as Prisma.InputJsonValue,
        lastSeenAt: new Date(),
      },
    });
  }

  async getUserDevices(userId: string) {
    return this.prisma.userDevice.findMany({
      where: { userId, isActive: true },
      orderBy: { lastSeenAt: 'desc' },
    });
  }

  async deactivateDevice(deviceId: string, userId: string) {
    const device = await this.prisma.userDevice.findFirst({
      where: { id: deviceId, userId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    return this.prisma.userDevice.update({
      where: { id: deviceId },
      data: { isActive: false },
    });
  }

  async getDeviceById(deviceId: string, userId: string) {
    const device = await this.prisma.userDevice.findFirst({
      where: { id: deviceId, userId },
      include: {
        sessions: {
          take: 5,
          orderBy: { startedAt: 'desc' },
        },
      },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    return device;
  }

  // ==================== SESSION MANAGEMENT ====================

  async startSession(userId: string, dto: StartSessionDto) {
    // End any existing active sessions for this user on this device
    if (dto.deviceId) {
      await this.prisma.userSession.updateMany({
        where: {
          userId,
          deviceId: dto.deviceId,
          status: SessionStatus.ACTIVE,
        },
        data: {
          status: SessionStatus.ENDED,
          endedAt: new Date(),
        },
      });
    }

    // Create new session
    const session = await this.prisma.userSession.create({
      data: {
        userId,
        deviceId: dto.deviceId,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
        status: SessionStatus.ACTIVE,
      },
    });

    // Update device lastSeenAt
    if (dto.deviceId) {
      await this.prisma.userDevice.update({
        where: { id: dto.deviceId },
        data: { lastSeenAt: new Date() },
      });
    }

    return session;
  }

  async updateSessionActivity(sessionId: string, userId: string) {
    const session = await this.prisma.userSession.findFirst({
      where: { id: sessionId, userId, status: SessionStatus.ACTIVE },
    });

    if (!session) {
      throw new NotFoundException('Active session not found');
    }

    return this.prisma.userSession.update({
      where: { id: sessionId },
      data: {
        lastActivityAt: new Date(),
        apiCallCount: { increment: 1 },
      },
    });
  }

  async endSession(sessionId: string, userId: string) {
    const session = await this.prisma.userSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const endedAt = new Date();
    const durationSeconds = Math.floor(
      (endedAt.getTime() - session.startedAt.getTime()) / 1000,
    );

    return this.prisma.userSession.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.ENDED,
        endedAt,
        durationSeconds,
      },
    });
  }

  async getCurrentSession(userId: string) {
    return this.prisma.userSession.findFirst({
      where: { userId, status: SessionStatus.ACTIVE },
      include: { device: true },
      orderBy: { startedAt: 'desc' },
    });
  }

  async getActiveSessions(userId: string) {
    return this.prisma.userSession.findMany({
      where: { userId, status: SessionStatus.ACTIVE },
      include: { device: true },
      orderBy: { startedAt: 'desc' },
    });
  }

  async endOtherSessions(userId: string) {
    // Get the current session (most recent active session)
    const currentSession = await this.getCurrentSession(userId);

    // End all other active sessions except the current one
    const endedAt = new Date();
    const result = await this.prisma.userSession.updateMany({
      where: {
        userId,
        status: SessionStatus.ACTIVE,
        id: currentSession ? { not: currentSession.id } : undefined,
      },
      data: {
        status: SessionStatus.ENDED,
        endedAt,
      },
    });

    return {
      message: `Ended ${result.count} other session(s)`,
      count: result.count,
    };
  }

  // ==================== FEATURE USAGE TRACKING ====================

  async trackFeatureUsage(userId: string, dto: TrackFeatureUsageDto) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // If no deviceId provided, try to get from active session
    let deviceId = dto.deviceId;
    if (!deviceId) {
      const activeSession = await this.getCurrentSession(userId);
      deviceId = activeSession?.deviceId ?? undefined;
    }

    // If still no device, we can't track device-level usage
    if (!deviceId) {
      return null;
    }

    // Upsert usage record
    return this.prisma.deviceFeatureUsage.upsert({
      where: {
        deviceId_featureKey_date: {
          deviceId,
          featureKey: dto.featureKey,
          date: today,
        },
      },
      update: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
      create: {
        deviceId,
        userId,
        featureKey: dto.featureKey,
        date: today,
        usageCount: 1,
      },
    });
  }

  async getDeviceFeatureUsage(
    deviceId: string,
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const where: Prisma.DeviceFeatureUsageWhereInput = {
      deviceId,
      userId,
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    return this.prisma.deviceFeatureUsage.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  // ==================== ANALYTICS ====================

  async getDeviceAnalytics(filters?: DeviceAnalyticsFiltersDto) {
    const where: Prisma.UserDeviceWhereInput = {
      isActive: true,
    };

    if (filters?.deviceType) {
      where.deviceType = filters.deviceType;
    }

    // Get total devices
    const totalDevices = await this.prisma.userDevice.count({ where });

    // Get active devices (seen in last 24 hours)
    const activeDevices = await this.prisma.userDevice.count({
      where: {
        ...where,
        lastSeenAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    // Get breakdown by device type
    const byType = await this.prisma.userDevice.groupBy({
      by: ['deviceType'],
      where,
      _count: { id: true },
    });

    // Calculate percentages
    const typeBreakdown = byType.map((item) => ({
      type: item.deviceType,
      count: item._count.id,
      percentage: totalDevices > 0 ? Math.round((item._count.id / totalDevices) * 100) : 0,
    }));

    // Get device trends (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const devicesByDay = await this.prisma.$queryRaw<
      Array<{ date: Date; mobile: number; tablet: number; desktop: number }>
    >`
      SELECT
        DATE("createdAt") as date,
        COUNT(*) FILTER (WHERE "deviceType" IN ('MOBILE_IOS', 'MOBILE_ANDROID'))::int as mobile,
        COUNT(*) FILTER (WHERE "deviceType" IN ('TABLET_IPAD', 'TABLET_ANDROID'))::int as tablet,
        COUNT(*) FILTER (WHERE "deviceType" = 'DESKTOP_WEB')::int as desktop
      FROM user_devices
      WHERE "createdAt" >= ${sevenDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY date
    `;

    return {
      totalDevices,
      activeDevices,
      byType: typeBreakdown,
      trends: devicesByDay,
    };
  }

  async getSessionAnalytics(filters?: SessionAnalyticsFiltersDto) {
    const where: Prisma.UserSessionWhereInput = {};

    if (filters?.startDate) {
      where.startedAt = { gte: new Date(filters.startDate) };
    }
    if (filters?.endDate) {
      const existingFilter = (where.startedAt as Record<string, unknown>) || {};
      where.startedAt = { ...existingFilter, lte: new Date(filters.endDate) };
    }
    if (filters?.userId) {
      where.userId = filters.userId;
    }
    if (filters?.status) {
      where.status = filters.status;
    }

    // Get total sessions
    const totalSessions = await this.prisma.userSession.count({ where });

    // Get active sessions
    const activeSessions = await this.prisma.userSession.count({
      where: { ...where, status: SessionStatus.ACTIVE },
    });

    // Get average duration (completed sessions only)
    const avgDurationResult = await this.prisma.userSession.aggregate({
      where: { ...where, status: SessionStatus.ENDED, durationSeconds: { not: null } },
      _avg: { durationSeconds: true },
    });
    const avgDuration = Math.round(avgDurationResult._avg.durationSeconds ?? 0);

    // Get average API calls per session
    const avgApiCallsResult = await this.prisma.userSession.aggregate({
      where,
      _avg: { apiCallCount: true },
    });
    const avgApiCalls = Math.round(avgApiCallsResult._avg.apiCallCount ?? 0);

    // Sessions by device type
    const sessionsByDevice = await this.prisma.$queryRaw<
      Array<{ deviceType: DeviceType; sessions: number; avgDuration: number }>
    >`
      SELECT
        ud."deviceType" as "deviceType",
        COUNT(us.id)::int as sessions,
        COALESCE(AVG(us."durationSeconds")::int, 0) as "avgDuration"
      FROM user_sessions us
      LEFT JOIN user_devices ud ON us."deviceId" = ud.id
      WHERE us.status = 'ENDED'
      GROUP BY ud."deviceType"
    `;

    // Sessions by hour (for heatmap)
    const sessionsByHour = await this.prisma.$queryRaw<
      Array<{ hour: number; sessions: number }>
    >`
      SELECT
        EXTRACT(HOUR FROM "startedAt")::int as hour,
        COUNT(*)::int as sessions
      FROM user_sessions
      WHERE "startedAt" >= NOW() - INTERVAL '7 days'
      GROUP BY hour
      ORDER BY hour
    `;

    return {
      totalSessions,
      activeSessions,
      avgDuration,
      avgApiCalls,
      byDevice: sessionsByDevice.map((item) => ({
        deviceType: item.deviceType,
        sessions: Number(item.sessions),
        avgDuration: Number(item.avgDuration),
      })),
      byHour: sessionsByHour.map((item) => ({
        hour: Number(item.hour),
        sessions: Number(item.sessions),
      })),
    };
  }

  async getActiveUsersSummary() {
    // Users active in last 24 hours
    const activeToday = await this.prisma.userSession.groupBy({
      by: ['userId'],
      where: {
        startedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    // Users active in last 7 days
    const activeWeek = await this.prisma.userSession.groupBy({
      by: ['userId'],
      where: {
        startedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });

    // Currently online (active sessions)
    const currentlyOnline = await this.prisma.userSession.count({
      where: {
        status: SessionStatus.ACTIVE,
        lastActivityAt: { gte: new Date(Date.now() - 5 * 60 * 1000) }, // Active in last 5 mins
      },
    });

    // Mobile vs Desktop breakdown (active today)
    const deviceBreakdown = await this.prisma.$queryRaw<
      Array<{ deviceType: DeviceType; count: number }>
    >`
      SELECT
        ud."deviceType" as "deviceType",
        COUNT(DISTINCT us."userId")::int as count
      FROM user_sessions us
      JOIN user_devices ud ON us."deviceId" = ud.id
      WHERE us."startedAt" >= NOW() - INTERVAL '24 hours'
      GROUP BY ud."deviceType"
    `;

    return {
      activeToday: activeToday.length,
      activeWeek: activeWeek.length,
      currentlyOnline,
      deviceBreakdown: deviceBreakdown.map((item) => ({
        deviceType: item.deviceType,
        count: Number(item.count),
      })),
    };
  }

  // ==================== ADMIN UTILITIES ====================

  async expireInactiveSessions(inactivityMinutes: number = 60) {
    const cutoff = new Date(Date.now() - inactivityMinutes * 60 * 1000);

    const result = await this.prisma.userSession.updateMany({
      where: {
        status: SessionStatus.ACTIVE,
        lastActivityAt: { lt: cutoff },
      },
      data: {
        status: SessionStatus.EXPIRED,
        endedAt: new Date(),
      },
    });

    return { expiredCount: result.count };
  }

  async getAllDevices(page: number = 1, pageSize: number = 20, search?: string) {
    const skip = (page - 1) * pageSize;

    const where: Prisma.UserDeviceWhereInput = {};
    if (search) {
      where.OR = [
        { deviceName: { contains: search, mode: 'insensitive' } },
        { deviceModel: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [devices, total] = await Promise.all([
      this.prisma.userDevice.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, name: true } },
          _count: { select: { sessions: true } },
        },
        skip,
        take: pageSize,
        orderBy: { lastSeenAt: 'desc' },
      }),
      this.prisma.userDevice.count({ where }),
    ]);

    return {
      devices,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getAllSessions(
    page: number = 1,
    pageSize: number = 20,
    filters?: SessionAnalyticsFiltersDto,
  ) {
    const skip = (page - 1) * pageSize;

    const where: Prisma.UserSessionWhereInput = {};
    if (filters?.userId) {
      where.userId = filters.userId;
    }
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.startDate) {
      where.startedAt = { gte: new Date(filters.startDate) };
    }

    const [sessions, total] = await Promise.all([
      this.prisma.userSession.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, name: true } },
          device: { select: { id: true, deviceType: true, deviceName: true } },
        },
        skip,
        take: pageSize,
        orderBy: { startedAt: 'desc' },
      }),
      this.prisma.userSession.count({ where }),
    ]);

    return {
      sessions,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
