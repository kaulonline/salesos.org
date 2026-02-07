import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { AnthropicModule } from '../anthropic/anthropic.module';
import { FinancialDataService } from './financial-data.service';

@Module({
  imports: [AnthropicModule],
  providers: [SearchService, FinancialDataService],
  controllers: [SearchController],
  exports: [SearchService, FinancialDataService],
})
export class SearchModule {}

