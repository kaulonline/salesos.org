/**
 * Dashboard Module
 *
 * AI-Generated Code - GitHub Copilot
 */

import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { SalesforceModule } from '../salesforce/salesforce.module';
import { OracleCXModule } from '../oracle-cx/oracle-cx.module';

@Module({
  imports: [SalesforceModule, OracleCXModule],
  controllers: [DashboardController],
})
export class DashboardModule {}
