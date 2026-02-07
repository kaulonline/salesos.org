import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../database/prisma.module';
import { LinkedInService } from './linkedin.service';
import { LinkedInController } from './linkedin.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [LinkedInController],
  providers: [LinkedInService],
  exports: [LinkedInService],
})
export class LinkedInModule {}
