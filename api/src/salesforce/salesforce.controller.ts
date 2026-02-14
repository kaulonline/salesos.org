import {
  Controller,
  Get,
  Post,
  Patch,
  Query,
  Body,
  Param,
  Req,
  Res,
  UseGuards,
  Logger,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import type { Response, Request } from 'express';
import { SalesforceService } from './salesforce.service';
import { SalesforceCdcService } from './salesforce-cdc.service';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { PrismaService } from '../database/prisma.service';
import * as crypto from 'crypto';
import { RequireFeature, LicenseFeatures } from '../licensing/decorators/license.decorator';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    role: string;
  };
}

@ApiTags('Salesforce Sync')
@ApiBearerAuth('JWT')
@Controller('salesforce')
export class SalesforceController {
  private readonly logger = new Logger(SalesforceController.name);

  constructor(
    private readonly salesforceService: SalesforceService,
    private readonly salesforceCdcService: SalesforceCdcService,
    private readonly prisma: PrismaService,
  ) {
    // OAuth cleanup moved to SalesforceService as a cron job
  }

  /**
   * Get Salesforce connection status
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus(@Req() req: AuthenticatedRequest) {
    return this.salesforceService.getConnectionStatus(req.user.userId);
  }

  /**
   * Get OAuth authorization URL
   */
  @Get('auth/url')
  @RequireFeature(LicenseFeatures.CRM_SALESFORCE)
  async getAuthUrl(@Req() req: AuthenticatedRequest) {
    // Check if Salesforce is enabled
    const isEnabled = await this.salesforceService.isEnabled();
    if (!isEnabled) {
      return { error: 'Salesforce integration is not enabled. Please contact your administrator.' };
    }

    // Generate a random state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');
    
    // Store the state in database (works across cluster instances)
    await this.prisma.oAuthState.create({
      data: {
        state,
        userId: req.user.userId,
        provider: 'SALESFORCE',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
    });

    const authUrl = await this.salesforceService.getAuthorizationUrl(state);
    
    return { authUrl };
  }

  /**
   * OAuth callback handler
   */
  @Get('oauth/callback')
  async handleOAuthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Res() res: Response,
  ) {
    // Return HTML that closes the popup and notifies the parent
    const sendResponse = (success: boolean, message: string) => {
      res.setHeader('Content-Type', 'text/html');
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Salesforce Connection</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
              }
              .container {
                text-align: center;
                padding: 40px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                max-width: 400px;
              }
              .success { color: #10B981; }
              .error { color: #EF4444; }
              .icon { font-size: 48px; margin-bottom: 16px; }
              h1 { margin: 0 0 12px 0; font-size: 24px; }
              p { color: #6B7280; margin: 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">${success ? '✓' : '✗'}</div>
              <h1 class="${success ? 'success' : 'error'}">
                ${success ? 'Connected!' : 'Connection Failed'}
              </h1>
              <p>${message}</p>
              <p style="margin-top: 16px; font-size: 14px;">This window will close automatically...</p>
            </div>
            <script>
              // Notify parent window and close
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'salesforce-oauth-callback', 
                  success: ${success},
                  message: '${message.replace(/'/g, "\\'")}' 
                }, '*');
              }
              setTimeout(() => window.close(), 2000);
            </script>
          </body>
        </html>
      `);
    };

    // Handle errors from Salesforce
    if (error) {
      this.logger.error(`OAuth error: ${error} - ${errorDescription}`);
      return sendResponse(false, errorDescription || 'Authorization denied');
    }

    // Validate state from database
    const stateData = await this.prisma.oAuthState.findUnique({
      where: { state },
    });
    
    if (!stateData || stateData.expiresAt < new Date()) {
      this.logger.error('Invalid or expired OAuth state');
      // Clean up expired state if it exists
      if (stateData) {
        await this.prisma.oAuthState.delete({ where: { state } }).catch(() => {});
      }
      return sendResponse(false, 'Invalid or expired authorization request');
    }

    // Remove used state
    await this.prisma.oAuthState.delete({ where: { state } }).catch(() => {});

    try {
      // Exchange code for tokens
      const tokens = await this.salesforceService.exchangeCodeForTokens(code);

      // Get user identity
      const identity = await this.salesforceService.getUserIdentity(
        tokens.access_token,
        tokens.id
      );

      // Store the connection
      await this.salesforceService.storeConnection(stateData.userId, tokens, identity);

      // Start CDC streaming for real-time change notifications
      this.salesforceCdcService.connectUser(stateData.userId).catch((err) => {
        this.logger.error(`Failed to start CDC for user ${stateData.userId}: ${err.message}`);
      });

      this.logger.log(`Salesforce connected for user ${stateData.userId}`);
      return sendResponse(true, `Connected as ${identity.display_name}`);
    } catch (err: any) {
      this.logger.error('OAuth callback error:', err);
      return sendResponse(false, err.message || 'Failed to complete connection');
    }
  }

  /**
   * Disconnect from Salesforce
   */
  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  async disconnect(@Req() req: AuthenticatedRequest) {
    // Disconnect CDC streaming first
    await this.salesforceCdcService.disconnectUser(req.user.userId);

    await this.salesforceService.disconnect(req.user.userId);
    return { success: true, message: 'Salesforce disconnected successfully' };
  }

  /**
   * Refresh the access token
   */
  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  async refreshToken(@Req() req: AuthenticatedRequest) {
    try {
      const { accessToken } = await this.salesforceService.getValidAccessToken(req.user.userId);
      const status = await this.salesforceService.getConnectionStatus(req.user.userId);
      return { 
        success: true, 
        expiresAt: status.connection?.expiresAt 
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Test the connection
   */
  @Get('test')
  @UseGuards(JwtAuthGuard)
  async testConnection(@Req() req: AuthenticatedRequest) {
    return this.salesforceService.testConnection(req.user.userId);
  }

  /**
   * Get CDC (Change Data Capture) streaming status
   */
  @Get('cdc/status')
  @UseGuards(JwtAuthGuard)
  async getCdcStatus(@Req() req: AuthenticatedRequest) {
    return this.salesforceCdcService.getConnectionStatus(req.user.userId);
  }

  /**
   * Reconnect CDC streaming (e.g., after token refresh)
   */
  @Post('cdc/reconnect')
  @UseGuards(JwtAuthGuard)
  async reconnectCdc(@Req() req: AuthenticatedRequest) {
    const success = await this.salesforceCdcService.reconnectUser(req.user.userId);
    return { success, message: success ? 'CDC reconnected' : 'Failed to reconnect CDC' };
  }

  /**
   * Get sync settings
   */
  @Get('settings')
  @UseGuards(JwtAuthGuard)
  async getSyncSettings(@Req() req: AuthenticatedRequest) {
    return this.salesforceService.getSyncSettings(req.user.userId);
  }

  /**
   * Update sync settings
   */
  @Patch('settings')
  @UseGuards(JwtAuthGuard)
  async updateSyncSettings(
    @Req() req: AuthenticatedRequest,
    @Body() settings: any,
  ) {
    await this.salesforceService.updateSyncSettings(req.user.userId, settings);
    return { success: true };
  }

  /**
   * Execute a SOQL query (for admin/testing)
   */
  @Post('query')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async query(
    @Req() req: AuthenticatedRequest,
    @Body('soql') soql: string,
  ) {
    return this.salesforceService.query(req.user.userId, soql);
  }

  /**
   * Describe an SObject
   */
  @Get('describe/:sobjectType')
  @UseGuards(JwtAuthGuard)
  async describeSObject(
    @Req() req: AuthenticatedRequest,
    @Query('sobjectType') sobjectType: string,
  ) {
    return this.salesforceService.describeSObject(req.user.userId, sobjectType);
  }

  /**
   * Get dashboard statistics from Salesforce CRM
   * Returns aggregated metrics for the Sales Command Center
   */
  @Get('dashboard-stats')
  @UseGuards(JwtAuthGuard)
  async getDashboardStats(@Req() req: AuthenticatedRequest) {
    return this.salesforceService.getDashboardStats(req.user.userId);
  }

  /**
   * Get valid converted lead statuses from Salesforce
   * These are the statuses that can be used when converting a lead
   */
  @Get('leads/converted-statuses')
  @UseGuards(JwtAuthGuard)
  async getLeadConvertedStatuses(@Req() req: AuthenticatedRequest) {
    return this.salesforceService.getLeadConvertedStatuses(req.user.userId);
  }

  /**
   * List leads from Salesforce with pagination and smart sorting
   */
  @Get('leads')
  @UseGuards(JwtAuthGuard)
  async listLeads(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('page') page?: string,
    @Query('status') status?: string,
    @Query('rating') rating?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    const pageSize = parseInt(limit || '50', 10);
    const pageNum = page ? parseInt(page, 10) : 1;
    const calculatedOffset = offset ? parseInt(offset, 10) : (pageNum - 1) * pageSize;

    return this.salesforceService.listSalesforceLeads(
      req.user.userId,
      pageSize,
      calculatedOffset,
      { status, rating, search, sortBy: sortBy as any, sortOrder: sortOrder as any },
    );
  }

  /**
   * Get a single lead from Salesforce by ID
   */
  @Get('leads/:id')
  @UseGuards(JwtAuthGuard)
  async getLead(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.salesforceService.getSingleRecord(req.user.userId, 'Lead', id);
  }

  /**
   * List opportunities from Salesforce with pagination and smart sorting
   */
  @Get('opportunities')
  @UseGuards(JwtAuthGuard)
  async listOpportunities(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('page') page?: string,
    @Query('stage') stage?: string,
    @Query('isClosed') isClosed?: string,
    @Query('minAmount') minAmount?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    const pageSize = parseInt(limit || '50', 10);
    const pageNum = page ? parseInt(page, 10) : 1;
    const calculatedOffset = offset ? parseInt(offset, 10) : (pageNum - 1) * pageSize;

    return this.salesforceService.listSalesforceOpportunities(
      req.user.userId,
      pageSize,
      calculatedOffset,
      {
        stage,
        isClosed: isClosed !== undefined ? isClosed === 'true' : undefined,
        minAmount: minAmount ? parseFloat(minAmount) : undefined,
        search,
        sortBy: sortBy as any,
        sortOrder: sortOrder as any,
      },
    );
  }

  /**
   * Get a single opportunity from Salesforce by ID
   */
  @Get('opportunities/:id')
  @UseGuards(JwtAuthGuard)
  async getOpportunity(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.salesforceService.getSingleRecord(req.user.userId, 'Opportunity', id);
  }

  /**
   * List accounts from Salesforce with pagination and smart sorting
   */
  @Get('accounts')
  @UseGuards(JwtAuthGuard)
  async listAccounts(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('page') page?: string,
    @Query('industry') industry?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    const pageSize = parseInt(limit || '50', 10);
    const pageNum = page ? parseInt(page, 10) : 1;
    const calculatedOffset = offset ? parseInt(offset, 10) : (pageNum - 1) * pageSize;

    return this.salesforceService.listSalesforceAccounts(
      req.user.userId,
      pageSize,
      calculatedOffset,
      { industry, type, search, sortBy: sortBy as any, sortOrder: sortOrder as any },
    );
  }

  /**
   * Get a single account from Salesforce by ID
   */
  @Get('accounts/:id')
  @UseGuards(JwtAuthGuard)
  async getAccount(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.salesforceService.getSingleRecord(req.user.userId, 'Account', id);
  }

  /**
   * List contacts from Salesforce with pagination
   */
  @Get('contacts')
  @UseGuards(JwtAuthGuard)
  async listContacts(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('page') page?: string,
    @Query('accountId') accountId?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    const pageSize = parseInt(limit || '50', 10);
    const pageNum = page ? parseInt(page, 10) : 1;
    const calculatedOffset = offset ? parseInt(offset, 10) : (pageNum - 1) * pageSize;

    return this.salesforceService.listSalesforceContacts(
      req.user.userId,
      pageSize,
      calculatedOffset,
      { accountId, search, sortBy: sortBy as any, sortOrder: sortOrder as any },
    );
  }

  /**
   * Get a single contact from Salesforce by ID
   */
  @Get('contacts/:id')
  @UseGuards(JwtAuthGuard)
  async getContact(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.salesforceService.getSingleRecord(req.user.userId, 'Contact', id);
  }

  /**
   * List quotes from Salesforce with pagination
   */
  @Get('quotes')
  @UseGuards(JwtAuthGuard)
  async listQuotes(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('page') page?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    const pageSize = parseInt(limit || '50', 10);
    const pageNum = page ? parseInt(page, 10) : 1;
    const calculatedOffset = offset ? parseInt(offset, 10) : (pageNum - 1) * pageSize;

    return this.salesforceService.listSalesforceQuotes(
      req.user.userId,
      pageSize,
      calculatedOffset,
      { status, search, sortBy: sortBy as any, sortOrder: sortOrder as any },
    );
  }

  /**
   * List contracts from Salesforce with pagination
   */
  @Get('contracts')
  @UseGuards(JwtAuthGuard)
  async listContracts(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('page') page?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    const pageSize = parseInt(limit || '50', 10);
    const pageNum = page ? parseInt(page, 10) : 1;
    const calculatedOffset = offset ? parseInt(offset, 10) : (pageNum - 1) * pageSize;

    return this.salesforceService.listSalesforceContracts(
      req.user.userId,
      pageSize,
      calculatedOffset,
      { status, search, sortBy: sortBy as any, sortOrder: sortOrder as any },
    );
  }

  /**
   * Convert a Salesforce Lead to Account, Contact, and optionally Opportunity
   */
  @Post('leads/:leadId/convert')
  @UseGuards(JwtAuthGuard)
  async convertLead(
    @Req() req: AuthenticatedRequest,
    @Param('leadId') leadId: string,
    @Body() body: {
      convertedStatus: string;
      doNotCreateOpportunity?: boolean;
      opportunityName?: string;
      accountId?: string;
      contactId?: string;
      ownerId?: string;
    },
  ) {
    this.logger.log(`Converting Salesforce lead ${leadId} for user ${req.user.userId}`);
    return this.salesforceService.convertLead(req.user.userId, leadId, body);
  }

  /**
   * Create a new Salesforce SObject record
   * Supports Lead, Account, Contact, Opportunity, etc.
   * Automatically converts camelCase field names to PascalCase for Salesforce
   */
  @Post('sobjects/:sobjectType')
  @UseGuards(JwtAuthGuard)
  async createSObject(
    @Req() req: AuthenticatedRequest,
    @Param('sobjectType') sobjectType: string,
    @Body() data: any,
  ) {
    // Transform camelCase field names to PascalCase for Salesforce API
    let transformedData = this.transformFieldNames(data);
    // Auto-fill country when state is provided (Salesforce requires country with state)
    transformedData = this.autoFillCountryFields(transformedData);
    this.logger.debug(`Creating ${sobjectType} with: ${JSON.stringify(transformedData)}`);
    const result = await this.salesforceService.create(req.user.userId, sobjectType, transformedData);
    return result;
  }

  /**
   * Update a Salesforce SObject record
   * Supports Lead, Account, Contact, Opportunity, etc.
   * Automatically converts camelCase field names to PascalCase for Salesforce
   */
  @Patch('sobjects/:sobjectType/:recordId')
  @UseGuards(JwtAuthGuard)
  async updateSObject(
    @Req() req: AuthenticatedRequest,
    @Param('sobjectType') sobjectType: string,
    @Param('recordId') recordId: string,
    @Body() data: any,
  ) {
    // Transform camelCase field names to PascalCase for Salesforce API
    let transformedData = this.transformFieldNames(data);
    // Auto-fill country when state is provided (Salesforce requires country with state)
    transformedData = this.autoFillCountryFields(transformedData);
    this.logger.debug(`Updating ${sobjectType}/${recordId} with: ${JSON.stringify(transformedData)}`);
    await this.salesforceService.update(req.user.userId, sobjectType, recordId, transformedData);
    return { success: true };
  }

  /**
   * Transform camelCase field names to PascalCase for Salesforce API
   * e.g., firstName -> FirstName, mobilePhone -> MobilePhone
   */
  private transformFieldNames(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const transformed: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Skip if already PascalCase (starts with uppercase) or is a special field
      if (key[0] === key[0].toUpperCase() || key === 'Id') {
        transformed[key] = value;
      } else {
        // Convert camelCase to PascalCase
        const pascalKey = key.charAt(0).toUpperCase() + key.slice(1);
        transformed[pascalKey] = value;
      }
    }
    return transformed;
  }

  /**
   * Auto-fill country fields and normalize state names
   * Salesforce State/Country Picklists require:
   * - Country to be set before state
   * - Full state names (e.g., "New York" not "NY")
   */
  private autoFillCountryFields(data: any): any {
    if (!data || typeof data !== 'object') return data;

    // Address type prefixes used in Salesforce (Mailing, Billing, Shipping, Other)
    const addressPrefixes = ['Mailing', 'Billing', 'Shipping', 'Other', ''];

    for (const prefix of addressPrefixes) {
      const stateField = prefix ? `${prefix}State` : 'State';
      const countryField = prefix ? `${prefix}Country` : 'Country';

      // Convert state abbreviation to full name if needed
      if (data[stateField]) {
        const fullStateName = this.getFullStateName(data[stateField]);
        if (fullStateName !== data[stateField]) {
          this.logger.debug(`Converted ${stateField} from "${data[stateField]}" to "${fullStateName}"`);
          data[stateField] = fullStateName;
        }
      }

      // If state is provided but country is not, default to United States
      if (data[stateField] && !data[countryField]) {
        data[countryField] = 'United States';
        this.logger.debug(`Auto-filled ${countryField}=United States for ${stateField}=${data[stateField]}`);
      }
    }

    return data;
  }

  /**
   * Convert US state abbreviation to full name
   * Returns original value if not a recognized abbreviation
   */
  private getFullStateName(stateCode: string): string {
    const usStates: Record<string, string> = {
      'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
      'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
      'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
      'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
      'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
      'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
      'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
      'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
      'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
      'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
      'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
      'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
      'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia',
      'PR': 'Puerto Rico', 'VI': 'Virgin Islands', 'GU': 'Guam',
    };

    const upperCode = stateCode.toUpperCase().trim();
    return usStates[upperCode] || stateCode;
  }
}
