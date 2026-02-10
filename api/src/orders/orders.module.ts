import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderPdfGenerator } from './pdf-generator.util';
import { PrismaModule } from '../database/prisma.module';
import { IntegrationEventsModule } from '../integrations/events/integration-events.module';

@Module({
  imports: [PrismaModule, IntegrationEventsModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderPdfGenerator],
  exports: [OrdersService, OrderPdfGenerator],
})
export class OrdersModule {}
