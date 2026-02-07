import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../database/prisma.module';
import { DropboxService } from './dropbox.service';
import { DropboxController } from './dropbox.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [DropboxController],
  providers: [DropboxService],
  exports: [DropboxService],
})
export class DropboxModule {}
