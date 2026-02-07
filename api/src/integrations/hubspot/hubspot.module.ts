import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../database/prisma.module';
import { HubSpotService } from './hubspot.service';
import { HubSpotController } from './hubspot.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [HubSpotController],
  providers: [HubSpotService],
  exports: [HubSpotService],
})
export class HubSpotModule {}
