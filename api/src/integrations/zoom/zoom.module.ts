import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../database/prisma.module';
import { ZoomService } from './zoom.service';
import { ZoomController } from './zoom.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [ZoomController],
  providers: [ZoomService],
  exports: [ZoomService],
})
export class ZoomModule {}
