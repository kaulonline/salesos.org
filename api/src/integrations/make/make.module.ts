import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../database/prisma.module';
import { MakeService } from './make.service';
import { MakeController } from './make.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [MakeController],
  providers: [MakeService],
  exports: [MakeService],
})
export class MakeModule {}
