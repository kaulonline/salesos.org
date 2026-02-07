import { Module } from '@nestjs/common';
import { DigitalWorkersController } from './digital-workers.controller';
import { SignalsService } from './signals/signals.service';
import { CoachingAgendaService } from './coaching-agenda/coaching-agenda.service';
import { CoachingSessionsService } from './coaching-sessions/coaching-sessions.service';
import { PrismaModule } from '../database/prisma.module';
import { AnthropicModule } from '../anthropic/anthropic.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [
    PrismaModule,
    AnthropicModule,
    SearchModule,
  ],
  controllers: [DigitalWorkersController],
  providers: [
    SignalsService,
    CoachingAgendaService,
    CoachingSessionsService,
  ],
  exports: [
    SignalsService,
    CoachingAgendaService,
    CoachingSessionsService,
  ],
})
export class DigitalWorkersModule {}
