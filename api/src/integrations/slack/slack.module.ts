import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../database/prisma.module';
import { SlackService } from './slack.service';
import { SlackController } from './slack.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [SlackController],
  providers: [SlackService],
  exports: [SlackService],
})
export class SlackModule {}
