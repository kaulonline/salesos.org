// PageIndex Service - NestJS Module for Document Indexing
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PageIndexController } from './pageindex.controller';
import { PageIndexService } from './pageindex.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 120000, // 2 minutes for long document processing
      maxRedirects: 5,
    }),
  ],
  controllers: [PageIndexController],
  providers: [PageIndexService],
  exports: [PageIndexService],
})
export class PageIndexModule {}
