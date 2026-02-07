import { Module, Global } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailProviderFactory } from './providers/email-provider.factory';
import { PremiumEmailService } from './premium-email.service';
import { SalesOSEmailService } from './salesos-email.service';

@Global()
@Module({
  providers: [EmailService, EmailProviderFactory, PremiumEmailService, SalesOSEmailService],
  exports: [EmailService, EmailProviderFactory, PremiumEmailService, SalesOSEmailService],
})
export class EmailModule {}
