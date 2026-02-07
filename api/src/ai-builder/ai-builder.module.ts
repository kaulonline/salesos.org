import { Module } from '@nestjs/common';
import { AIBuilderController } from './ai-builder.controller';
import { AIBuilderService } from './ai-builder.service';

/**
 * AI Builder Module
 *
 * Enables users to generate CRM configurations from natural language descriptions.
 * Uses the global LLMService for AI generation.
 *
 * Supported entity types:
 * - Web Forms: Lead capture forms with fields, validation, styling
 * - Custom Fields: User-defined fields on CRM entities
 * - Email Templates: Professional email templates with merge fields
 * - Assignment Rules: Auto-assignment rules for leads and opportunities
 *
 * Future phases will add:
 * - Workflows: Automation triggers and actions
 * - Products: Product catalog entries
 * - Reports: Custom report configurations
 */
@Module({
  controllers: [AIBuilderController],
  providers: [AIBuilderService],
  exports: [AIBuilderService],
})
export class AIBuilderModule {}
