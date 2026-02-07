import { Module, forwardRef } from '@nestjs/common';
import { RealtimeController } from './realtime.controller';
import { RealtimeService } from './realtime.service';
import { ConversationsModule } from '../conversations/conversations.module';

/**
 * Realtime Voice Module
 * Provides WebRTC-based real-time voice conversations with Azure OpenAI
 * Imports ConversationsModule to access CRM tool execution
 */
@Module({
  imports: [forwardRef(() => ConversationsModule)],
  controllers: [RealtimeController],
  providers: [RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
