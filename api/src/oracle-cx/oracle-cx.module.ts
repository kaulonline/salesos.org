import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { OracleCXService } from './oracle-cx.service';
import { OracleCXController } from './oracle-cx.controller';
import { PrismaService } from '../database/prisma.service';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    AdminModule,
    ScheduleModule.forRoot(), // For proactive token refresh scheduling
  ],
  providers: [OracleCXService, PrismaService],
  controllers: [OracleCXController],
  exports: [OracleCXService],
})
export class OracleCXModule {}
