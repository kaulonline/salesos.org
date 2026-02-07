import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import {
  BaseIntegrationService,
  ConnectionTestResult,
  IntegrationCredentials,
  OAuthResult,
} from '../base/base-integration.service';
import Stripe from 'stripe';

@Injectable()
export class StripeService extends BaseIntegrationService {
  protected readonly provider = 'stripe';
  protected readonly displayName = 'Stripe';
  protected readonly logger = new Logger(StripeService.name);

  private readonly clientId: string;
  private readonly redirectUri: string;

  constructor(
    protected readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super(prisma);
    this.clientId = this.configService.get('STRIPE_CLIENT_ID') || '';
    this.redirectUri = this.configService.get('STRIPE_REDIRECT_URI') ||
      `${this.configService.get('APP_URL')}/api/integrations/stripe/callback`;
  }

  private async getStripeClient(): Promise<Stripe | null> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) return null;
    return new Stripe(credentials.accessToken, { apiVersion: '2025-12-15.clover' });
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const stripe = await this.getStripeClient();
    if (!stripe) {
      return { success: false, message: 'No Stripe API key configured' };
    }

    try {
      const account = await stripe.accounts.retrieve();
      return {
        success: true,
        message: `Connected to Stripe account: ${account.business_profile?.name || account.id}`,
        details: {
          accountId: account.id,
          businessName: account.business_profile?.name,
          country: account.country,
          currency: account.default_currency,
        },
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection failed' };
    }
  }

  async initiateOAuth(): Promise<OAuthResult> {
    if (!this.clientId) {
      throw new Error('Stripe OAuth not configured. Set STRIPE_CLIENT_ID in environment.');
    }

    const state = this.generateState();
    const authUrl = `https://connect.stripe.com/oauth/authorize?` +
      `response_type=code&` +
      `client_id=${this.clientId}&` +
      `scope=read_write&` +
      `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
      `state=${state}`;

    return { authUrl, state };
  }

  async handleOAuthCallback(code: string): Promise<IntegrationCredentials> {
    const stripe = new Stripe(this.configService.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2025-12-15.clover',
    });

    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code,
    });

    const credentials: IntegrationCredentials = {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      stripeUserId: response.stripe_user_id,
      scope: response.scope,
    };

    await this.saveCredentials(credentials);
    return credentials;
  }

  async saveApiKey(apiKey: string): Promise<void> {
    // Verify the API key works
    const stripe = new Stripe(apiKey, { apiVersion: '2025-12-15.clover' });
    await stripe.accounts.retrieve(); // Will throw if invalid

    await this.saveCredentials({ accessToken: apiKey });
  }

  async getCustomers(limit = 100, startingAfter?: string): Promise<any> {
    const stripe = await this.getStripeClient();
    if (!stripe) throw new Error('Stripe not connected');

    const customers = await stripe.customers.list({
      limit,
      starting_after: startingAfter,
    });

    return customers;
  }

  async getInvoices(limit = 100, startingAfter?: string): Promise<any> {
    const stripe = await this.getStripeClient();
    if (!stripe) throw new Error('Stripe not connected');

    const invoices = await stripe.invoices.list({
      limit,
      starting_after: startingAfter,
    });

    return invoices;
  }

  async getSubscriptions(limit = 100, startingAfter?: string): Promise<any> {
    const stripe = await this.getStripeClient();
    if (!stripe) throw new Error('Stripe not connected');

    const subscriptions = await stripe.subscriptions.list({
      limit,
      starting_after: startingAfter,
    });

    return subscriptions;
  }

  async getPayments(limit = 100, startingAfter?: string): Promise<any> {
    const stripe = await this.getStripeClient();
    if (!stripe) throw new Error('Stripe not connected');

    const payments = await stripe.paymentIntents.list({
      limit,
      starting_after: startingAfter,
    });

    return payments;
  }

  async getRevenueData(startDate: Date, endDate: Date): Promise<any> {
    const stripe = await this.getStripeClient();
    if (!stripe) throw new Error('Stripe not connected');

    const charges = await stripe.charges.list({
      created: {
        gte: Math.floor(startDate.getTime() / 1000),
        lte: Math.floor(endDate.getTime() / 1000),
      },
      limit: 100,
    });

    const totalRevenue = charges.data
      .filter(c => c.status === 'succeeded')
      .reduce((sum, c) => sum + c.amount, 0) / 100;

    return {
      totalRevenue,
      currency: charges.data[0]?.currency || 'usd',
      chargeCount: charges.data.length,
    };
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
