// AI Generated Code by Deloitte + Cursor (BEGIN)
import { Module } from '@nestjs/common';
import { VideoCoachingService } from './video-coaching.service';
import { VideoCoachingController } from './video-coaching.controller';
import { CoachingGoalsController } from './coaching-goals.controller';
import { ActionItemTrackerService } from './action-item-tracker.service';
import { ActionItemTrackerController } from './action-item-tracker.controller';
import { CoachingEffectivenessService } from './coaching-effectiveness.service';
import { CoachingEffectivenessController } from './coaching-effectiveness.controller';
import { CoachingRealtimeService } from './coaching-realtime.service';
import { PrismaModule } from '../database/prisma.module';
import { AnthropicModule } from '../anthropic/anthropic.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, AnthropicModule, NotificationsModule],
  controllers: [
    VideoCoachingController,
    CoachingGoalsController,
    ActionItemTrackerController,
    CoachingEffectivenessController,
  ],
  providers: [
    VideoCoachingService, 
    ActionItemTrackerService, 
    CoachingEffectivenessService,
    CoachingRealtimeService,
  ],
  exports: [
    VideoCoachingService, 
    ActionItemTrackerService, 
    CoachingEffectivenessService,
    CoachingRealtimeService,
  ],
})
export class CoachingModule {}
// AI Generated Code by Deloitte + Cursor (END)
