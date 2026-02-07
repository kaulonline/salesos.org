import { Module } from '@nestjs/common';
import { TeamMessagesController } from './team-messages.controller';
import { TeamMessagesService } from './team-messages.service';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TeamMessagesController],
  providers: [TeamMessagesService],
  exports: [TeamMessagesService],
})
export class TeamMessagesModule {}
