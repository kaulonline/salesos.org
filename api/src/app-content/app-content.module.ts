import { Module } from '@nestjs/common';
import { AppContentService } from './app-content.service';
import { AppContentController } from './app-content.controller';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AppContentController],
  providers: [AppContentService],
  exports: [AppContentService],
})
export class AppContentModule {}
