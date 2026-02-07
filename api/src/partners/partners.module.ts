import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { LLMModule } from '../llm/llm.module';
import { PartnersController } from './partners.controller';
import { PartnerPortalController } from './partner-portal.controller';
import { PartnersService } from './partners.service';
import { DealRegistrationService } from './deal-registration.service';
import { PartnersAIService } from './partners-ai.service';

@Module({
  imports: [PrismaModule, LLMModule],
  controllers: [PartnersController, PartnerPortalController],
  providers: [PartnersService, DealRegistrationService, PartnersAIService],
  exports: [PartnersService, DealRegistrationService, PartnersAIService],
})
export class PartnersModule {}
