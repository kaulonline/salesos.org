import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DeviceTrackingService } from './device-tracking.service';
import { DeviceTrackingController } from './device-tracking.controller';
import { PrismaModule } from '../database/prisma.module';
import { ApnsPushService } from '../notifications/apns-push.service';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [DeviceTrackingController],
  providers: [DeviceTrackingService, ApnsPushService],
  exports: [DeviceTrackingService, ApnsPushService],
})
export class DeviceTrackingModule {}
