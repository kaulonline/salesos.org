import { Module, OnModuleInit } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../database/prisma.module';
import { AdminModule } from '../admin/admin.module';
import { EmailModule } from '../email/email.module';
import { EmailAdminController } from './email-admin.controller';
import { EmailTemplatesService } from './email-templates.service';
import { EmailQueueService } from './email-queue.service';
import { EmailTriggersService } from './email-triggers.service';

@Module({
  imports: [
    PrismaModule,
    AdminModule,
    EmailModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [EmailAdminController],
  providers: [
    EmailTemplatesService,
    EmailQueueService,
    EmailTriggersService,
  ],
  exports: [
    EmailTemplatesService,
    EmailQueueService,
    EmailTriggersService,
  ],
})
export class EmailAdminModule implements OnModuleInit {
  constructor(private readonly templatesService: EmailTemplatesService) {}

  async onModuleInit() {
    // Initialize default email templates
    await this.templatesService.initializeDefaultTemplates();
  }
}
