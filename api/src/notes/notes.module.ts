import { Module } from '@nestjs/common';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';
import { NoteIntelligenceService } from './note-intelligence.service';
import { PendingNoteActionsService } from './pending-note-actions.service';
import { PrismaModule } from '../database/prisma.module';
import { AnthropicModule } from '../anthropic/anthropic.module';

@Module({
  imports: [PrismaModule, AnthropicModule],
  controllers: [NotesController],
  providers: [NotesService, NoteIntelligenceService, PendingNoteActionsService],
  exports: [NotesService, NoteIntelligenceService, PendingNoteActionsService],
})
export class NotesModule {}
