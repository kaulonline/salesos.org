import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SmartCaptureController } from './smart-capture.controller';
import { SmartCaptureService } from './smart-capture.service';
import { PrismaModule } from '../database/prisma.module';
import { LeadsModule } from '../leads/leads.module';
import { ContactsModule } from '../contacts/contacts.module';
import { AccountsModule } from '../accounts/accounts.module';
import { NotesModule } from '../notes/notes.module';
import { AnthropicModule } from '../anthropic/anthropic.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 120000, // 2 minutes for OCR processing
      maxRedirects: 5,
    }),
    PrismaModule,
    LeadsModule,
    ContactsModule,
    AccountsModule,
    NotesModule,
    AnthropicModule,
  ],
  controllers: [SmartCaptureController],
  providers: [SmartCaptureService],
  exports: [SmartCaptureService],
})
export class SmartCaptureModule {}
