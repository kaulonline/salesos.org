import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../database/prisma.module';
import { CalendlyService } from './calendly.service';
import { CalendlyController } from './calendly.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [CalendlyController],
  providers: [CalendlyService],
  exports: [CalendlyService],
})
export class CalendlyModule {}
