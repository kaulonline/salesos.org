import { Module } from '@nestjs/common';
import { CrmAdminService } from './crm-admin.service';
import { CrmAdminController } from './crm-admin.controller';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CrmAdminService],
  controllers: [CrmAdminController],
  exports: [CrmAdminService],
})
export class CrmAdminModule {}
