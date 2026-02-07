import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { OpportunitiesService } from './opportunities.service';
import { OpportunityStage } from '@prisma/client';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { SalesforceService } from '../salesforce/salesforce.service';
import { CurrentOrganization } from '../common/decorators/organization.decorator';

// Map human-readable stage names (from Salesforce) to Prisma enum values
const STAGE_NAME_MAP: Record<string, OpportunityStage> = {
  'prospecting': OpportunityStage.PROSPECTING,
  'qualification': OpportunityStage.QUALIFICATION,
  'needs analysis': OpportunityStage.NEEDS_ANALYSIS,
  'value proposition': OpportunityStage.VALUE_PROPOSITION,
  'id. decision makers': OpportunityStage.DECISION_MAKERS_IDENTIFIED,
  'decision makers identified': OpportunityStage.DECISION_MAKERS_IDENTIFIED,
  'perception analysis': OpportunityStage.PERCEPTION_ANALYSIS,
  'proposal/price quote': OpportunityStage.PROPOSAL_PRICE_QUOTE,
  'proposal price quote': OpportunityStage.PROPOSAL_PRICE_QUOTE,
  'negotiation/review': OpportunityStage.NEGOTIATION_REVIEW,
  'negotiation review': OpportunityStage.NEGOTIATION_REVIEW,
  'closed won': OpportunityStage.CLOSED_WON,
  'closed lost': OpportunityStage.CLOSED_LOST,
};

function parseStage(stage?: string): OpportunityStage | undefined {
  if (!stage) return undefined;

  // Check if it's already a valid enum value
  if (Object.values(OpportunityStage).includes(stage as OpportunityStage)) {
    return stage as OpportunityStage;
  }

  // Try to map from human-readable name
  const normalized = stage.toLowerCase().trim();
  return STAGE_NAME_MAP[normalized];
}

@Controller('opportunities')
@UseGuards(JwtAuthGuard)
export class OpportunitiesController {
  private readonly logger = new Logger(OpportunitiesController.name);

  constructor(
    private readonly opportunitiesService: OpportunitiesService,
    private readonly salesforceService: SalesforceService,
  ) {}

  @Post()
  create(@Request() req, @Body() createDto: any, @CurrentOrganization() organizationId: string) {
    const userId = req.user.userId;

    // Transform and sanitize the DTO
    const transformedDto = this.sanitizeOpportunityDto(createDto);

    return this.opportunitiesService.createOpportunity(transformedDto, userId, organizationId);
  }

  @Get()
  async findAll(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Query('stage') stage?: string,
    @Query('accountId') accountId?: string,
    @Query('isClosed') isClosed?: string,
    @Query('minAmount') minAmount?: string,
    @Query('search') search?: string,
    @Query('source') source?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const ownerId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';

    // If source=salesforce, fetch from Salesforce instead
    if (source === 'salesforce') {
      try {
        const result = await this.salesforceService.query(
          ownerId,
          `SELECT Id, Name, Amount, StageName, CloseDate, AccountId, Account.Name, OwnerId, CreatedDate, Probability, Description
           FROM Opportunity
           ORDER BY Amount DESC NULLS LAST
           LIMIT 100`
        );
        // Transform Salesforce opportunities to match local format
        return (result.records || []).map((opp: any) => ({
          id: opp.Id,
          name: opp.Name,
          amount: opp.Amount || 0,
          stage: opp.StageName?.replace(/\s+/g, '_').toUpperCase(),
          closeDate: opp.CloseDate,
          accountId: opp.AccountId,
          accountName: opp.Account?.Name,
          ownerId: opp.OwnerId,
          probability: opp.Probability,
          description: opp.Description,
          createdAt: opp.CreatedDate,
          source: 'salesforce',
        }));
      } catch (error) {
        // Log error without exposing sensitive details
        this.logger.error(`Failed to fetch Salesforce opportunities for userId: ${ownerId}`, error instanceof Error ? error.message : 'Unknown error');
        return [];
      }
    }

    return this.opportunitiesService.listOpportunities({
      stage: parseStage(stage),
      accountId,
      isClosed: isClosed !== undefined ? isClosed === 'true' : undefined,
      minAmount: minAmount ? parseFloat(minAmount) : undefined,
      search,
      ownerId,
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
    }, organizationId, isAdmin);
  }

  @Get('pipeline/stats')
  getPipelineStats(@Request() req, @CurrentOrganization() organizationId: string) {
    const ownerId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.opportunitiesService.getPipelineStats(organizationId, ownerId, isAdmin);
  }

  @Get('forecast')
  getForecast(@Request() req, @CurrentOrganization() organizationId: string) {
    const ownerId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.opportunitiesService.getForecast(organizationId, ownerId, isAdmin);
  }

  // Opportunity Contacts (Buyer Committee) Routes - MUST be before @Get(':id')
  @Get(':id/contacts')
  getContacts(@Request() req, @Param('id') id: string, @CurrentOrganization() organizationId: string) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.opportunitiesService.getContacts(id, userId, organizationId, isAdmin);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string, @CurrentOrganization() organizationId: string) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.opportunitiesService.getOpportunity(id, userId, organizationId, isAdmin);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() updateDto: any, @CurrentOrganization() organizationId: string) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';

    // Transform and sanitize the DTO
    const transformedDto = this.sanitizeOpportunityDto(updateDto);

    return this.opportunitiesService.updateOpportunity(id, userId, transformedDto, organizationId, isAdmin);
  }

  /**
   * Sanitize and transform opportunity DTO to match Prisma schema
   * Maps Salesforce field names to Prisma field names and removes invalid fields
   */
  private sanitizeOpportunityDto(dto: any): any {
    const result: any = {};

    // Valid Prisma fields for Opportunity
    const validFields = [
      'name', 'opportunitySource', 'type', 'stage', 'amount', 'probability',
      'expectedRevenue', 'discount', 'closeDate', 'needsAnalysis', 'proposedSolution',
      'competitors', 'nextStep', 'winProbability', 'riskFactors', 'recommendedActions',
      'dealVelocity', 'isClosed', 'isWon', 'lostReason', 'closedDate', 'metadata',
      'accountId', 'campaignId'
    ];

    // Field name mappings (Salesforce/Mobile -> Prisma)
    const fieldMappings: Record<string, string> = {
      'stageName': 'stage',
      'StageName': 'stage',
      'Name': 'name',
      'Amount': 'amount',
      'Probability': 'probability',
      'CloseDate': 'closeDate',
      'NextStep': 'nextStep',
      'AccountId': 'accountId',
      'CampaignId': 'campaignId',
      'Type': 'type',
    };

    // Fields to ignore (exist in Salesforce but not in our schema)
    const ignoredFields = [
      'description', 'Description', 'leadSource', 'LeadSource',
      'Id', 'id', 'CreatedDate', 'LastModifiedDate', 'OwnerId',
      'ForecastCategory', 'ForecastCategoryName', 'HasOpportunityLineItem',
      'IqScore', 'LastStageChangeDate', 'ContactId'
    ];

    for (const [key, value] of Object.entries(dto)) {
      // Skip ignored fields
      if (ignoredFields.includes(key)) continue;

      // Map field name if needed
      const mappedKey = fieldMappings[key] || key;

      // Only include valid fields
      if (validFields.includes(mappedKey)) {
        result[mappedKey] = value;
      }
    }

    // Transform stage to enum if it's a string
    if (result.stage && typeof result.stage === 'string') {
      result.stage = parseStage(result.stage);
    }

    // Transform closeDate to ISO-8601 DateTime if it's just a date string
    if (result.closeDate && typeof result.closeDate === 'string') {
      // If it's just a date (YYYY-MM-DD), convert to full ISO DateTime
      if (/^\d{4}-\d{2}-\d{2}$/.test(result.closeDate)) {
        result.closeDate = new Date(result.closeDate + 'T00:00:00.000Z');
      } else {
        result.closeDate = new Date(result.closeDate);
      }
    }

    return result;
  }

  @Post(':id/advance')
  advanceStage(@Request() req, @Param('id') id: string, @CurrentOrganization() organizationId: string) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.opportunitiesService.advanceStage(id, userId, organizationId, isAdmin);
  }

  @Post(':id/close-won')
  closeWon(@Request() req, @Param('id') id: string, @CurrentOrganization() organizationId: string) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.opportunitiesService.closeWon(id, userId, organizationId, isAdmin);
  }

  @Post(':id/close-lost')
  closeLost(@Request() req, @Param('id') id: string, @Body() body: { reason?: string }, @CurrentOrganization() organizationId: string) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.opportunitiesService.closeLost(id, userId, organizationId, body.reason, isAdmin);
  }

  @Post(':id/analyze')
  analyze(@Request() req, @Param('id') id: string, @CurrentOrganization() organizationId: string): Promise<any> {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.opportunitiesService.analyzeOpportunity(id, userId, organizationId, isAdmin);
  }

  @Post(':id/contacts')
  addContact(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { contactId: string; role?: string; isPrimary?: boolean },
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.opportunitiesService.addContact(id, userId, body.contactId, organizationId, body.role, body.isPrimary, isAdmin);
  }

  @Patch(':id/contacts/:contactId')
  updateContact(
    @Request() req,
    @Param('id') id: string,
    @Param('contactId') contactId: string,
    @Body() body: { role?: string; isPrimary?: boolean },
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.opportunitiesService.updateContact(id, contactId, userId, body, organizationId, isAdmin);
  }

  @Delete(':id/contacts/:contactId')
  removeContact(
    @Request() req,
    @Param('id') id: string,
    @Param('contactId') contactId: string,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.opportunitiesService.removeContact(id, contactId, userId, organizationId, isAdmin);
  }

  @Post(':id/contacts/:contactId/set-primary')
  setPrimaryContact(
    @Request() req,
    @Param('id') id: string,
    @Param('contactId') contactId: string,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.opportunitiesService.setPrimaryContact(id, contactId, userId, organizationId, isAdmin);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    // Soft delete would be better in production
    return { message: 'Delete not implemented - use close-lost instead' };
  }

  // Bulk Operations
  @Post('bulk/update')
  async bulkUpdate(
    @Request() req,
    @Body() body: { ids: string[]; updates: any },
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.opportunitiesService.bulkUpdate(body.ids, userId, body.updates, organizationId, isAdmin);
  }

  @Post('bulk/delete')
  async bulkDelete(
    @Request() req,
    @Body() body: { ids: string[] },
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.opportunitiesService.bulkDelete(body.ids, userId, organizationId, isAdmin);
  }

  @Post('bulk/assign')
  async bulkAssign(
    @Request() req,
    @Body() body: { ids: string[]; newOwnerId: string },
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.opportunitiesService.bulkAssign(body.ids, userId, body.newOwnerId, organizationId, isAdmin);
  }

  @Post('bulk/stage')
  async bulkUpdateStage(
    @Request() req,
    @Body() body: { ids: string[]; stage: string },
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.opportunitiesService.bulkUpdateStage(body.ids, userId, body.stage, organizationId, isAdmin);
  }
}
