import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../database/prisma.module';
import { DocuSignService } from './docusign.service';
import { DocuSignController } from './docusign.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [DocuSignController],
  providers: [DocuSignService],
  exports: [DocuSignService],
})
export class DocuSignModule {}
