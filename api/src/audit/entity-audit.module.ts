import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { EntityAuditService } from './entity-audit.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [EntityAuditService],
  exports: [EntityAuditService],
})
export class EntityAuditModule {}
