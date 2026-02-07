import { Module } from '@nestjs/common';
import { PriceBooksService } from './price-books.service';
import { PriceBooksController } from './price-books.controller';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PriceBooksController],
  providers: [PriceBooksService],
  exports: [PriceBooksService],
})
export class PriceBooksModule {}
