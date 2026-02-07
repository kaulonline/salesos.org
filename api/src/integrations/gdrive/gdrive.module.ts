import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../database/prisma.module';
import { GDriveService } from './gdrive.service';
import { GDriveController } from './gdrive.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [GDriveController],
  providers: [GDriveService],
  exports: [GDriveService],
})
export class GDriveModule {}
