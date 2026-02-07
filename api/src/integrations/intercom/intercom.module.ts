import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../database/prisma.module';
import { IntercomService } from './intercom.service';
import { IntercomController } from './intercom.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [IntercomController],
  providers: [IntercomService],
  exports: [IntercomService],
})
export class IntercomModule {}
