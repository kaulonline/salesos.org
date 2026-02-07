import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../database/prisma.module';
import { OktaService } from './okta.service';
import { OktaController } from './okta.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [OktaController],
  providers: [OktaService],
  exports: [OktaService],
})
export class OktaModule {}
