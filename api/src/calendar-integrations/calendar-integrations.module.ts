import { Module } from '@nestjs/common';
import { CalendarIntegrationsController } from './calendar-integrations.controller';
import { CalendarIntegrationsService } from './calendar-integrations.service';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CalendarIntegrationsController],
  providers: [CalendarIntegrationsService],
  exports: [CalendarIntegrationsService],
})
export class CalendarIntegrationsModule {}
