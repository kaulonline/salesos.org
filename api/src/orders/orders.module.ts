import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderPdfGenerator } from './pdf-generator.util';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderPdfGenerator],
  exports: [OrdersService, OrderPdfGenerator],
})
export class OrdersModule {}
