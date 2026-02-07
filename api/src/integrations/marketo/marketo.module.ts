import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../database/prisma.module';
import { MarketoService } from './marketo.service';
import { MarketoController } from './marketo.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [MarketoController],
  providers: [MarketoService],
  exports: [MarketoService],
})
export class MarketoModule {}
