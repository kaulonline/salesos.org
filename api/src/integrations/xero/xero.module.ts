import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../database/prisma.module';
import { XeroService } from './xero.service';
import { XeroController } from './xero.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [XeroController],
  providers: [XeroService],
  exports: [XeroService],
})
export class XeroModule {}
