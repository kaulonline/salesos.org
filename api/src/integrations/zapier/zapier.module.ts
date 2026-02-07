import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../database/prisma.module';
import { ZapierService } from './zapier.service';
import { ZapierController } from './zapier.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [ZapierController],
  providers: [ZapierService],
  exports: [ZapierService],
})
export class ZapierModule {}
