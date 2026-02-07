import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../database/prisma.module';
import { ZoominfoService } from './zoominfo.service';
import { ZoominfoController } from './zoominfo.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [ZoominfoController],
  providers: [ZoominfoService],
  exports: [ZoominfoService],
})
export class ZoominfoModule {}
