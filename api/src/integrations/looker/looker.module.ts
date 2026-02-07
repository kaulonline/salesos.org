import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../database/prisma.module';
import { LookerService } from './looker.service';
import { LookerController } from './looker.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [LookerController],
  providers: [LookerService],
  exports: [LookerService],
})
export class LookerModule {}
