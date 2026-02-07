// Outcome Billing Module - Outcome-based billing system
import { Module, Global, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { OutcomeBillingService } from './outcome-billing.service';
import {
  OutcomeBillingController,
  AdminOutcomeBillingController,
} from './outcome-billing.controller';
import { OutcomeInvoiceGeneratorService } from './outcome-invoice-generator.service';
import { PrismaModule } from '../database/prisma.module';
import { PaymentsModule } from '../payments/payments.module';

@Global() // Make OutcomeBillingService available globally for LicenseGuard
@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(),
    forwardRef(() => PaymentsModule),
  ],
  controllers: [OutcomeBillingController, AdminOutcomeBillingController],
  providers: [OutcomeBillingService, OutcomeInvoiceGeneratorService],
  exports: [OutcomeBillingService],
})
export class OutcomeBillingModule {}
