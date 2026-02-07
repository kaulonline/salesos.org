import { Module } from '@nestjs/common';
import { EmailTemplatesController } from './email-templates.controller';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EmailTemplatesController],
})
export class EmailTemplatesModule {}
