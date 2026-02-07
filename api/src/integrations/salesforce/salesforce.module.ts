import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../database/prisma.module';
import { SalesforceService } from './salesforce.service';
import { SalesforceController } from './salesforce.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [SalesforceController],
  providers: [SalesforceService],
  exports: [SalesforceService],
})
export class SalesforceModule {}
