import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../database/prisma.module';
import { GongService } from './gong.service';
import { GongController } from './gong.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [GongController],
  providers: [GongService],
  exports: [GongService],
})
export class GongModule {}
