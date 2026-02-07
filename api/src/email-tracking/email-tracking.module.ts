import { Module, forwardRef } from '@nestjs/common';
import { EmailTrackingController } from './email-tracking.controller';
import { TrackingPixelController } from './tracking-pixel.controller';
import { EmailTrackingService } from './email-tracking.service';
import { EmailTrackingUtils } from './email-tracking.utils';
import { ImapPollingService } from './imap-polling.service';
import { PrismaModule } from '../database/prisma.module';
import { ActivitiesModule } from '../activities/activities.module';
import { AnthropicModule } from '../anthropic/anthropic.module';
import { EmailModule } from '../email/email.module';
import { MeetingsModule } from '../meetings/meetings.module';

@Module({
  imports: [
    PrismaModule,
    ActivitiesModule,
    AnthropicModule,
    EmailModule,
    forwardRef(() => MeetingsModule), // For ZoomService access
  ],
  controllers: [EmailTrackingController, TrackingPixelController],
  providers: [EmailTrackingService, EmailTrackingUtils, ImapPollingService],
  exports: [EmailTrackingService, EmailTrackingUtils, ImapPollingService],
})
export class EmailTrackingModule { }

