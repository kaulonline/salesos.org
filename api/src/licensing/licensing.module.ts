// Licensing Module - Comprehensive license management for feature access control
import { Module, Global, forwardRef } from '@nestjs/common';
import { PublicLicensingController, LicensingController } from './licensing.controller';
import { LicensingService } from './licensing.service';
import { RevenueForecastService } from './revenue-forecast.service';
import { LicenseGuard } from './guards/license.guard';
import { PrismaModule } from '../database/prisma.module';
import { AIModule } from '../ai/ai.module';
import { OutcomeBillingModule } from '../outcome-billing/outcome-billing.module';

@Global() // Make LicensingService available globally for guards and decorators
@Module({
  imports: [PrismaModule, AIModule, forwardRef(() => OutcomeBillingModule)],
  controllers: [PublicLicensingController, LicensingController],
  providers: [LicensingService, RevenueForecastService, LicenseGuard],
  exports: [LicensingService, LicenseGuard],
})
export class LicensingModule {}
