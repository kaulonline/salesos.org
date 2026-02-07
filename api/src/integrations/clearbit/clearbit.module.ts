import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../database/prisma.module';
import { ClearbitService } from './clearbit.service';
import { ClearbitController } from './clearbit.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [ClearbitController],
  providers: [ClearbitService],
  exports: [ClearbitService],
})
export class ClearbitModule {}
