import { Module } from '@nestjs/common';
import { EmailIntegrationsController } from './email-integrations.controller';
import { EmailIntegrationsService } from './email-integrations.service';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EmailIntegrationsController],
  providers: [EmailIntegrationsService],
  exports: [EmailIntegrationsService],
})
export class EmailIntegrationsModule {}
