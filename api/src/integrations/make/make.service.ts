import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import {
  BaseIntegrationService,
  ConnectionTestResult,
  IntegrationCredentials,
} from '../base/base-integration.service';
import axios from 'axios';

@Injectable()
export class MakeService extends BaseIntegrationService {
  protected readonly provider = 'make';
  protected readonly displayName = 'Make';
  protected readonly logger = new Logger(MakeService.name);

  constructor(
    protected readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super(prisma);
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const credentials = await this.getCredentials();
    if (!credentials?.webhookUrl) {
      return { success: false, message: 'No webhook URL configured' };
    }

    try {
      new URL(credentials.webhookUrl);
      return {
        success: true,
        message: 'Make webhook configured',
        details: { webhookConfigured: true },
      };
    } catch {
      return { success: false, message: 'Invalid webhook URL format' };
    }
  }

  async saveWebhook(webhookUrl: string): Promise<void> {
    const credentials: IntegrationCredentials = { webhookUrl };
    await this.saveCredentials(credentials);
  }

  async triggerWebhook(data: Record<string, any>): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.webhookUrl) throw new Error('Make not connected');

    const response = await axios.post(credentials.webhookUrl, data, {
      headers: { 'Content-Type': 'application/json' },
    });

    return response.data;
  }

  async triggerNewLead(lead: {
    id: string;
    name: string;
    email?: string;
    company?: string;
    source?: string;
  }): Promise<any> {
    return this.triggerWebhook({
      event: 'new_lead',
      timestamp: new Date().toISOString(),
      data: lead,
    });
  }

  async triggerDealWon(deal: {
    id: string;
    name: string;
    value: number;
    accountName?: string;
  }): Promise<any> {
    return this.triggerWebhook({
      event: 'deal_won',
      timestamp: new Date().toISOString(),
      data: deal,
    });
  }

  async triggerDealStageChange(deal: {
    id: string;
    name: string;
    previousStage: string;
    newStage: string;
  }): Promise<any> {
    return this.triggerWebhook({
      event: 'deal_stage_changed',
      timestamp: new Date().toISOString(),
      data: deal,
    });
  }

  async triggerContactCreated(contact: {
    id: string;
    name: string;
    email?: string;
    accountId?: string;
  }): Promise<any> {
    return this.triggerWebhook({
      event: 'contact_created',
      timestamp: new Date().toISOString(),
      data: contact,
    });
  }
}
