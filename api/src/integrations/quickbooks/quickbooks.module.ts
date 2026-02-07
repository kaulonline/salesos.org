import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../database/prisma.module';
import { QuickBooksService } from './quickbooks.service';
import { QuickBooksController } from './quickbooks.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [QuickBooksController],
  providers: [QuickBooksService],
  exports: [QuickBooksService],
})
export class QuickBooksModule {}
