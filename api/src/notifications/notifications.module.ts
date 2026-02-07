import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { ApnsPushService } from './apns-push.service';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { SignalEventsHandler } from './signal-events.handler';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    ScheduleModule.forRoot(),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'super-secret-key-change-in-prod',
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsGateway,
    ApnsPushService,
    NotificationSchedulerService,
    SignalEventsHandler,
  ],
  exports: [
    NotificationsService,
    NotificationsGateway,
    ApnsPushService,
    NotificationSchedulerService,
    SignalEventsHandler,
  ],
})
export class NotificationsModule {}
