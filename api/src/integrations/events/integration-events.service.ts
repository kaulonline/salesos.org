import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SlackService } from '../slack/slack.service';
import { ZapierService } from '../zapier/zapier.service';
import { MakeService } from '../make/make.service';
import { SegmentService } from '../segment/segment.service';
import { HubSpotService } from '../hubspot/hubspot.service';
import { MarketoService } from '../marketo/marketo.service';
import { IntercomService } from '../intercom/intercom.service';
import { DocuSignService } from '../docusign/docusign.service';
import { PandaDocService } from '../pandadoc/pandadoc.service';
import { QuickBooksService } from '../quickbooks/quickbooks.service';
import { XeroService } from '../xero/xero.service';
import { MicrosoftGraphService } from '../microsoft-graph/microsoft-graph.service';
import { DropboxService } from '../dropbox/dropbox.service';
import { GDriveService } from '../gdrive/gdrive.service';
import { OpenAIIntegrationService } from '../openai/openai.service';
import { AnthropicIntegrationService } from '../anthropic/anthropic.service';
import { CrmEvent, CrmEventType } from './crm-event.types';
import axios from 'axios';

@Injectable()
export class IntegrationEventsService {
  private readonly logger = new Logger(IntegrationEventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly slackService: SlackService,
    private readonly zapierService: ZapierService,
    private readonly makeService: MakeService,
    private readonly segmentService: SegmentService,
    private readonly hubspotService: HubSpotService,
    private readonly marketoService: MarketoService,
    private readonly intercomService: IntercomService,
    private readonly docusignService: DocuSignService,
    private readonly pandadocService: PandaDocService,
    private readonly quickbooksService: QuickBooksService,
    private readonly xeroService: XeroService,
    private readonly microsoftGraphService: MicrosoftGraphService,
    private readonly dropboxService: DropboxService,
    private readonly gdriveService: GDriveService,
    private readonly openaiService: OpenAIIntegrationService,
    private readonly anthropicService: AnthropicIntegrationService,
  ) {}

  // ──────────────────────────────────────
  // Persistence Helpers
  // ──────────────────────────────────────

  /**
   * Log a sync event and track its outcome (success/failure/duration).
   * Wraps an integration dispatch so every call is persisted.
   */
  private async logSyncEvent(
    organizationId: string,
    provider: string,
    event: CrmEvent,
    fn: () => Promise<{ externalId?: string; responseData?: any } | void>,
  ): Promise<void> {
    const log = await this.prisma.integrationSyncLog.create({
      data: {
        organizationId,
        provider,
        eventType: event.type,
        entityType: event.entityType,
        entityId: event.entityId,
        status: 'pending',
      },
    });
    const start = Date.now();
    try {
      const result = await fn();
      await this.prisma.integrationSyncLog.update({
        where: { id: log.id },
        data: {
          status: 'success',
          externalId: result?.externalId ?? undefined,
          responseData: result?.responseData
            ? JSON.parse(JSON.stringify(result.responseData))
            : undefined,
          durationMs: Date.now() - start,
        },
      });
    } catch (error: any) {
      await this.prisma.integrationSyncLog.update({
        where: { id: log.id },
        data: {
          status: 'failed',
          errorMessage: error.message?.substring(0, 500),
          durationMs: Date.now() - start,
        },
      });
    }
  }

  /**
   * Find or create an entity mapping for a given provider.
   * Returns existing mapping if one exists, null otherwise.
   */
  private async findEntityMapping(
    organizationId: string,
    entityType: string,
    entityId: string,
    provider: string,
  ) {
    return this.prisma.integrationEntityMapping.findUnique({
      where: {
        organizationId_entityType_entityId_provider: {
          organizationId,
          entityType,
          entityId,
          provider,
        },
      },
    });
  }

  /**
   * Create or update an entity mapping after syncing to an external system.
   */
  private async upsertEntityMapping(
    organizationId: string,
    entityType: string,
    entityId: string,
    provider: string,
    externalId: string,
    externalUrl?: string,
  ) {
    await this.prisma.integrationEntityMapping.upsert({
      where: {
        organizationId_entityType_entityId_provider: {
          organizationId,
          entityType,
          entityId,
          provider,
        },
      },
      update: {
        externalId,
        externalUrl: externalUrl ?? undefined,
        lastSyncedAt: new Date(),
      },
      create: {
        organizationId,
        entityType,
        entityId,
        provider,
        externalId,
        externalUrl,
      },
    });
  }

  /**
   * Store a file reference from cloud storage integrations.
   */
  private async storeAttachment(data: {
    organizationId: string;
    entityType: string;
    entityId: string;
    provider: string;
    externalId?: string;
    fileName: string;
    fileUrl?: string;
    fileType?: string;
    eventType?: string;
  }) {
    await this.prisma.integrationAttachment.create({ data });
  }

  /**
   * Dispatch a CRM event to all connected integrations for the organization.
   * Fire-and-forget — errors are logged but do not propagate.
   */
  async dispatchCrmEvent(organizationId: string, event: CrmEvent): Promise<void> {
    try {
      const configs = await this.prisma.integrationConfig.findMany({
        where: {
          organizationId,
          status: 'connected',
          provider: {
            in: [
              'slack', 'zapier', 'make', 'segment',
              'hubspot', 'marketo', 'intercom',
              'docusign', 'pandadoc',
              'quickbooks', 'xero',
              'microsoft365', 'dropbox', 'gdrive',
              'openai', 'anthropic',
            ],
          },
        },
      });

      if (configs.length === 0) return;

      const dispatches: Promise<void>[] = [];
      let aiProcessed = false; // Only run AI processing once (prefer OpenAI over Anthropic)

      for (const config of configs) {
        const orgId = organizationId;
        const provider = config.provider;

        switch (provider) {
          // Notification / webhook integrations
          case 'slack':
            dispatches.push(this.logSyncEvent(orgId, provider, event, () => this.sendSlackNotification(config, event)));
            break;
          case 'zapier':
            dispatches.push(this.logSyncEvent(orgId, provider, event, () => this.triggerZapierWebhook(config, event)));
            break;
          case 'make':
            dispatches.push(this.logSyncEvent(orgId, provider, event, () => this.triggerMakeWebhook(config, event)));
            break;

          // Analytics
          case 'segment':
            dispatches.push(this.logSyncEvent(orgId, provider, event, () => this.trackSegmentEvent(config, event)));
            break;

          // CRM sync
          case 'hubspot':
            dispatches.push(this.logSyncEvent(orgId, provider, event, () => this.syncToHubSpot(config, event)));
            break;
          case 'marketo':
            dispatches.push(this.logSyncEvent(orgId, provider, event, () => this.syncToMarketo(config, event)));
            break;
          case 'intercom':
            dispatches.push(this.logSyncEvent(orgId, provider, event, () => this.syncToIntercom(config, event)));
            break;

          // Document signing (only for QUOTE_SENT)
          case 'docusign':
            if (event.type === CrmEventType.QUOTE_SENT) {
              dispatches.push(this.logSyncEvent(orgId, provider, event, () => this.createDocuSignEnvelope(config, event)));
            }
            break;
          case 'pandadoc':
            if (event.type === CrmEventType.QUOTE_SENT) {
              dispatches.push(this.logSyncEvent(orgId, provider, event, () => this.createPandaDocDocument(config, event)));
            }
            break;

          // Accounting (only for ORDER_CREATED, DEAL_WON)
          case 'quickbooks':
            if (event.type === CrmEventType.ORDER_CREATED || event.type === CrmEventType.DEAL_WON) {
              dispatches.push(this.logSyncEvent(orgId, provider, event, () => this.syncToQuickBooks(config, event)));
            }
            break;
          case 'xero':
            if (event.type === CrmEventType.ORDER_CREATED || event.type === CrmEventType.DEAL_WON) {
              dispatches.push(this.logSyncEvent(orgId, provider, event, () => this.syncToXero(config, event)));
            }
            break;

          // Microsoft 365 (calendar / email)
          case 'microsoft365':
            dispatches.push(this.logSyncEvent(orgId, provider, event, () => this.syncToMicrosoftGraph(config, event)));
            break;

          // File storage — archive documents on key events
          case 'dropbox':
            if ([CrmEventType.QUOTE_SENT, CrmEventType.ORDER_CREATED, CrmEventType.DEAL_WON].includes(event.type)) {
              dispatches.push(this.logSyncEvent(orgId, provider, event, () => this.archiveToDropbox(config, event)));
            }
            break;
          case 'gdrive':
            if ([CrmEventType.QUOTE_SENT, CrmEventType.ORDER_CREATED, CrmEventType.DEAL_WON].includes(event.type)) {
              dispatches.push(this.logSyncEvent(orgId, provider, event, () => this.archiveToGDrive(config, event)));
            }
            break;

          // AI — auto-score leads, auto-analyze deals (only process once)
          case 'openai':
            if (!aiProcessed) {
              aiProcessed = true;
              dispatches.push(this.logSyncEvent(orgId, provider, event, () => this.aiAutoProcess('openai', event)));
            }
            break;
          case 'anthropic':
            if (!aiProcessed) {
              aiProcessed = true;
              dispatches.push(this.logSyncEvent(orgId, provider, event, () => this.aiAutoProcess('anthropic', event)));
            }
            break;
        }
      }

      await Promise.allSettled(dispatches);
    } catch (error: any) {
      this.logger.error(`Failed to dispatch CRM event ${event.type}: ${error.message}`);
    }
  }

  // ──────────────────────────────────────
  // Slack
  // ──────────────────────────────────────

  private async sendSlackNotification(config: any, event: CrmEvent): Promise<{ externalId?: string; responseData?: any } | void> {
    try {
      this.slackService.setOrganizationContext(event.organizationId);

      const settings = (config.settings || {}) as Record<string, any>;
      const channel = settings.notificationChannel || settings.slackChannel || 'general';
      const { text, blocks } = this.formatSlackMessage(event);

      await this.slackService.sendMessage(channel, text, blocks);

      this.logger.debug(`Slack notification sent for ${event.type} to #${channel}`);
    } catch (error: any) {
      this.logger.warn(`Slack notification failed for ${event.type}: ${error.message}`);
      throw error;
    } finally {
      this.slackService.clearOrganizationContext();
    }
  }

  private formatSlackMessage(event: CrmEvent): { text: string; blocks?: any[] } {
    const d = event.data;

    switch (event.type) {
      case CrmEventType.DEAL_WON: {
        const amount = d.amount ? `$${Number(d.amount).toLocaleString()}` : 'N/A';
        const text = `Deal Won: "${d.name}" for ${amount}`;
        return {
          text,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `:tada: *Deal Won: "${d.name}"*\n*Amount:* ${amount} | *Owner:* ${d.ownerName || 'Unknown'}\n*Account:* ${d.accountName || 'Unknown'}`,
              },
            },
          ],
        };
      }

      case CrmEventType.DEAL_LOST: {
        const amount = d.amount ? `$${Number(d.amount).toLocaleString()}` : 'N/A';
        const text = `Deal Lost: "${d.name}" (${amount})`;
        return {
          text,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `:x: *Deal Lost: "${d.name}"*\n*Amount:* ${amount}${d.lostReason ? ` | *Reason:* ${d.lostReason}` : ''}\n*Account:* ${d.accountName || 'Unknown'}`,
              },
            },
          ],
        };
      }

      case CrmEventType.DEAL_CREATED: {
        const amount = d.amount ? `$${Number(d.amount).toLocaleString()}` : 'N/A';
        const text = `New Deal: "${d.name}" (${amount})`;
        return {
          text,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `:handshake: *New Deal: "${d.name}"*\n*Amount:* ${amount} | *Stage:* ${d.stage || 'Prospecting'}\n*Account:* ${d.accountName || 'Unknown'}`,
              },
            },
          ],
        };
      }

      case CrmEventType.DEAL_STAGE_CHANGED: {
        const text = `Deal Stage Changed: "${d.name}" moved to ${d.newStage}`;
        return {
          text,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `:arrow_right: *Deal Stage Changed: "${d.name}"*\n*From:* ${d.previousStage} → *To:* ${d.newStage}`,
              },
            },
          ],
        };
      }

      case CrmEventType.LEAD_CREATED: {
        const text = `New Lead: ${d.name}${d.company ? ` (${d.company})` : ''}`;
        return {
          text,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `:inbox_tray: *New Lead: ${d.name}*${d.title ? `\n*Title:* ${d.title}` : ''}${d.company ? ` | *Company:* ${d.company}` : ''}\n*Source:* ${d.leadSource || 'Unknown'}${d.leadScore ? ` | *Score:* ${d.leadScore}` : ''}`,
              },
            },
          ],
        };
      }

      case CrmEventType.LEAD_CONVERTED: {
        const text = `Lead Converted: ${d.name}`;
        return {
          text,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `:white_check_mark: *Lead Converted: ${d.name}*\n*Account:* ${d.accountName || 'Created'}${d.opportunityName ? ` | *Opportunity:* ${d.opportunityName}` : ''}`,
              },
            },
          ],
        };
      }

      case CrmEventType.CONTACT_CREATED: {
        const text = `New Contact: ${d.name}`;
        return {
          text,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `:bust_in_silhouette: *New Contact: ${d.name}*${d.title ? `\n*Title:* ${d.title}` : ''}${d.accountName ? ` | *Account:* ${d.accountName}` : ''}`,
              },
            },
          ],
        };
      }

      case CrmEventType.ACCOUNT_CREATED: {
        const text = `New Account: ${d.name}`;
        return {
          text,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `:office: *New Account: ${d.name}*${d.industry ? `\n*Industry:* ${d.industry}` : ''}${d.type ? ` | *Type:* ${d.type}` : ''}`,
              },
            },
          ],
        };
      }

      case CrmEventType.QUOTE_SENT: {
        const amount = d.totalPrice ? `$${Number(d.totalPrice).toLocaleString()}` : 'N/A';
        const text = `Quote Sent: "${d.name}" (${amount})`;
        return {
          text,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `:page_facing_up: *Quote Sent: "${d.name}"*\n*Amount:* ${amount} | *Quote #:* ${d.quoteNumber || 'N/A'}`,
              },
            },
          ],
        };
      }

      case CrmEventType.ORDER_CREATED: {
        const amount = d.total ? `$${Number(d.total).toLocaleString()}` : 'N/A';
        const text = `New Order: ${d.orderNumber} (${amount})`;
        return {
          text,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `:package: *New Order: ${d.orderNumber}*\n*Amount:* ${amount}${d.accountName ? ` | *Account:* ${d.accountName}` : ''}`,
              },
            },
          ],
        };
      }

      default:
        return { text: `CRM Event: ${event.type}` };
    }
  }

  // ──────────────────────────────────────
  // Zapier
  // ──────────────────────────────────────

  private async triggerZapierWebhook(config: any, event: CrmEvent): Promise<void> {
    try {
      this.zapierService.setOrganizationContext(event.organizationId);

      switch (event.type) {
        case CrmEventType.LEAD_CREATED:
          await this.zapierService.triggerNewLead({
            id: event.entityId,
            name: event.data.name,
            email: event.data.email,
            company: event.data.company,
            source: event.data.leadSource,
          });
          break;

        case CrmEventType.DEAL_WON:
          await this.zapierService.triggerDealWon({
            id: event.entityId,
            name: event.data.name,
            value: event.data.amount || 0,
            accountName: event.data.accountName,
          });
          break;

        case CrmEventType.DEAL_LOST:
          await this.zapierService.triggerDealLost({
            id: event.entityId,
            name: event.data.name,
            value: event.data.amount || 0,
            lostReason: event.data.lostReason,
          });
          break;

        case CrmEventType.QUOTE_SENT:
          await this.zapierService.triggerQuoteSent({
            id: event.entityId,
            name: event.data.name,
            totalAmount: event.data.totalPrice || 0,
            recipientEmail: event.data.recipientEmail,
          });
          break;

        case CrmEventType.ORDER_CREATED:
          await this.zapierService.triggerOrderCreated({
            id: event.entityId,
            orderNumber: event.data.orderNumber,
            totalAmount: event.data.total || 0,
            accountName: event.data.accountName,
          });
          break;

        default:
          await this.zapierService.triggerWebhook({
            event: event.type.toLowerCase(),
            timestamp: event.timestamp,
            entityId: event.entityId,
            entityType: event.entityType,
            data: event.data,
          });
          break;
      }

      this.logger.debug(`Zapier webhook triggered for ${event.type}`);
    } catch (error: any) {
      this.logger.warn(`Zapier webhook failed for ${event.type}: ${error.message}`);
      throw error;
    } finally {
      this.zapierService.clearOrganizationContext();
    }
  }

  // ──────────────────────────────────────
  // Make (Integromat)
  // ──────────────────────────────────────

  private async triggerMakeWebhook(config: any, event: CrmEvent): Promise<void> {
    try {
      this.makeService.setOrganizationContext(event.organizationId);

      switch (event.type) {
        case CrmEventType.LEAD_CREATED:
          await this.makeService.triggerNewLead({
            id: event.entityId,
            name: event.data.name,
            email: event.data.email,
            company: event.data.company,
            source: event.data.leadSource,
          });
          break;

        case CrmEventType.DEAL_WON:
          await this.makeService.triggerDealWon({
            id: event.entityId,
            name: event.data.name,
            value: event.data.amount || 0,
            accountName: event.data.accountName,
          });
          break;

        case CrmEventType.DEAL_STAGE_CHANGED:
          await this.makeService.triggerDealStageChange({
            id: event.entityId,
            name: event.data.name,
            previousStage: event.data.previousStage,
            newStage: event.data.newStage,
          });
          break;

        case CrmEventType.CONTACT_CREATED:
          await this.makeService.triggerContactCreated({
            id: event.entityId,
            name: event.data.name,
            email: event.data.email,
            accountId: event.data.accountId,
          });
          break;

        default:
          await this.makeService.triggerWebhook({
            event: event.type.toLowerCase(),
            timestamp: event.timestamp,
            entityId: event.entityId,
            entityType: event.entityType,
            data: event.data,
          });
          break;
      }

      this.logger.debug(`Make webhook triggered for ${event.type}`);
    } catch (error: any) {
      this.logger.warn(`Make webhook failed for ${event.type}: ${error.message}`);
      throw error;
    } finally {
      this.makeService.clearOrganizationContext();
    }
  }

  // ──────────────────────────────────────
  // Segment (Analytics)
  // ──────────────────────────────────────

  private async trackSegmentEvent(config: any, event: CrmEvent): Promise<void> {
    try {
      this.segmentService.setOrganizationContext(event.organizationId);

      // Map CRM event types to Segment event names
      const eventNameMap: Record<CrmEventType, string> = {
        [CrmEventType.LEAD_CREATED]: 'Lead Created',
        [CrmEventType.LEAD_CONVERTED]: 'Lead Converted',
        [CrmEventType.DEAL_CREATED]: 'Deal Created',
        [CrmEventType.DEAL_STAGE_CHANGED]: 'Deal Stage Changed',
        [CrmEventType.DEAL_WON]: 'Deal Won',
        [CrmEventType.DEAL_LOST]: 'Deal Lost',
        [CrmEventType.CONTACT_CREATED]: 'Contact Created',
        [CrmEventType.ACCOUNT_CREATED]: 'Account Created',
        [CrmEventType.QUOTE_SENT]: 'Quote Sent',
        [CrmEventType.ORDER_CREATED]: 'Order Created',
        [CrmEventType.TASK_COMPLETED]: 'Task Completed',
      };

      await this.segmentService.track({
        userId: event.userId || event.organizationId,
        event: eventNameMap[event.type] || event.type,
        properties: {
          entityId: event.entityId,
          entityType: event.entityType,
          organizationId: event.organizationId,
          ...event.data,
        },
        context: {
          app: { name: 'SalesOS CRM', version: '1.0' },
        },
      });

      this.logger.debug(`Segment event tracked: ${eventNameMap[event.type]}`);
    } catch (error: any) {
      this.logger.warn(`Segment tracking failed for ${event.type}: ${error.message}`);
      throw error;
    } finally {
      this.segmentService.clearOrganizationContext();
    }
  }

  // ──────────────────────────────────────
  // HubSpot (CRM Sync)
  // ──────────────────────────────────────

  private async syncToHubSpot(config: any, event: CrmEvent): Promise<{ externalId?: string; responseData?: any } | void> {
    try {
      this.hubspotService.setOrganizationContext(event.organizationId);
      const credentials = await this.hubspotService['getCredentials'](event.organizationId);
      if (!credentials?.accessToken) return;

      const headers = {
        Authorization: `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
      };

      switch (event.type) {
        case CrmEventType.CONTACT_CREATED:
        case CrmEventType.LEAD_CREATED: {
          // Check for existing mapping
          const existing = await this.findEntityMapping(event.organizationId, event.entityType, event.entityId, 'hubspot');

          const nameParts = (event.data.name || '').split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          const contactProps = {
            firstname: firstName,
            lastname: lastName,
            email: event.data.email || '',
            company: event.data.company || event.data.accountName || '',
            jobtitle: event.data.title || '',
            phone: event.data.phone || '',
            lifecyclestage: event.type === CrmEventType.LEAD_CREATED ? 'lead' : 'opportunity',
            hs_lead_status: event.type === CrmEventType.LEAD_CREATED ? 'NEW' : undefined,
          };

          if (existing) {
            await axios.patch(
              `https://api.hubapi.com/crm/v3/objects/contacts/${existing.externalId}`,
              { properties: contactProps },
              { headers },
            );
            this.logger.debug(`HubSpot contact updated for ${event.type}`);
            return { externalId: existing.externalId };
          }

          const resp = await axios.post(
            'https://api.hubapi.com/crm/v3/objects/contacts',
            { properties: contactProps },
            { headers },
          );
          const hubspotId = resp.data?.id;
          if (hubspotId) {
            await this.upsertEntityMapping(
              event.organizationId, event.entityType, event.entityId, 'hubspot',
              hubspotId, `https://app.hubspot.com/contacts/${hubspotId}`,
            );
          }
          this.logger.debug(`HubSpot contact created for ${event.type}`);
          return { externalId: hubspotId };
        }

        case CrmEventType.DEAL_CREATED:
        case CrmEventType.DEAL_WON:
        case CrmEventType.DEAL_LOST: {
          const existing = await this.findEntityMapping(event.organizationId, event.entityType, event.entityId, 'hubspot');

          const stageMap: Record<string, string> = {
            [CrmEventType.DEAL_CREATED]: 'appointmentscheduled',
            [CrmEventType.DEAL_WON]: 'closedwon',
            [CrmEventType.DEAL_LOST]: 'closedlost',
          };
          const dealProps = {
            dealname: event.data.name || '',
            amount: event.data.amount ? String(event.data.amount) : '0',
            dealstage: stageMap[event.type] || 'appointmentscheduled',
            pipeline: 'default',
            closedate: event.type !== CrmEventType.DEAL_CREATED
              ? new Date().toISOString()
              : undefined,
          };

          if (existing) {
            await axios.patch(
              `https://api.hubapi.com/crm/v3/objects/deals/${existing.externalId}`,
              { properties: dealProps },
              { headers },
            );
            this.logger.debug(`HubSpot deal updated for ${event.type}`);
            return { externalId: existing.externalId };
          }

          const resp = await axios.post(
            'https://api.hubapi.com/crm/v3/objects/deals',
            { properties: dealProps },
            { headers },
          );
          const dealId = resp.data?.id;
          if (dealId) {
            await this.upsertEntityMapping(
              event.organizationId, event.entityType, event.entityId, 'hubspot',
              dealId, `https://app.hubspot.com/deals/${dealId}`,
            );
          }
          this.logger.debug(`HubSpot deal synced for ${event.type}`);
          return { externalId: dealId };
        }

        case CrmEventType.ACCOUNT_CREATED: {
          const existing = await this.findEntityMapping(event.organizationId, event.entityType, event.entityId, 'hubspot');
          const companyProps = {
            name: event.data.name || '',
            domain: event.data.website || '',
            industry: event.data.industry || '',
            phone: event.data.phone || '',
          };

          if (existing) {
            await axios.patch(
              `https://api.hubapi.com/crm/v3/objects/companies/${existing.externalId}`,
              { properties: companyProps },
              { headers },
            );
            this.logger.debug(`HubSpot company updated for ${event.type}`);
            return { externalId: existing.externalId };
          }

          const resp = await axios.post(
            'https://api.hubapi.com/crm/v3/objects/companies',
            { properties: companyProps },
            { headers },
          );
          const companyId = resp.data?.id;
          if (companyId) {
            await this.upsertEntityMapping(
              event.organizationId, event.entityType, event.entityId, 'hubspot',
              companyId, `https://app.hubspot.com/companies/${companyId}`,
            );
          }
          this.logger.debug(`HubSpot company created for ${event.type}`);
          return { externalId: companyId };
        }

        case CrmEventType.DEAL_STAGE_CHANGED: {
          // Check for existing deal mapping and update the stage
          const existing = await this.findEntityMapping(event.organizationId, event.entityType, event.entityId, 'hubspot');
          if (existing) {
            await axios.patch(
              `https://api.hubapi.com/crm/v3/objects/deals/${existing.externalId}`,
              { properties: { dealstage: event.data.newStage?.toLowerCase() || 'appointmentscheduled' } },
              { headers },
            );
            this.logger.debug(`HubSpot deal stage updated`);
            return { externalId: existing.externalId };
          }
          // Fallback: log a note
          await axios.post(
            'https://api.hubapi.com/crm/v3/objects/notes',
            {
              properties: {
                hs_note_body: `Deal "${event.data.name}" moved from ${event.data.previousStage} to ${event.data.newStage}`,
                hs_timestamp: new Date().toISOString(),
              },
            },
            { headers },
          );
          this.logger.debug(`HubSpot note created for deal stage change`);
          break;
        }
      }
    } catch (error: any) {
      this.logger.warn(`HubSpot sync failed for ${event.type}: ${error.message}`);
      throw error;
    } finally {
      this.hubspotService.clearOrganizationContext();
    }
  }

  // ──────────────────────────────────────
  // Marketo (Marketing Automation)
  // ──────────────────────────────────────

  private async syncToMarketo(config: any, event: CrmEvent): Promise<{ externalId?: string; responseData?: any } | void> {
    // Only sync lead-related events to Marketo
    if (
      event.type !== CrmEventType.LEAD_CREATED &&
      event.type !== CrmEventType.LEAD_CONVERTED &&
      event.type !== CrmEventType.CONTACT_CREATED
    ) {
      return;
    }

    try {
      this.marketoService.setOrganizationContext(event.organizationId);

      const nameParts = (event.data.name || '').split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const leadData: any = {
        email: event.data.email,
        firstName,
        lastName,
        company: event.data.company || event.data.accountName || '',
        title: event.data.title || '',
        leadSource: event.data.leadSource || 'SalesOS CRM',
      };

      // Remove undefined/empty values
      Object.keys(leadData).forEach(key => {
        if (!leadData[key]) delete leadData[key];
      });

      if (leadData.email) {
        const result = await this.marketoService.createOrUpdateLeads([leadData]);
        const marketoId = result?.[0]?.id || result?.result?.[0]?.id;
        if (marketoId) {
          await this.upsertEntityMapping(
            event.organizationId, event.entityType, event.entityId, 'marketo',
            String(marketoId),
          );
        }
        this.logger.debug(`Marketo lead synced for ${event.type}: ${event.data.email}`);
        return { externalId: marketoId ? String(marketoId) : undefined };
      }
    } catch (error: any) {
      this.logger.warn(`Marketo sync failed for ${event.type}: ${error.message}`);
      throw error;
    } finally {
      this.marketoService.clearOrganizationContext();
    }
  }

  // ──────────────────────────────────────
  // Intercom (Customer Messaging)
  // ──────────────────────────────────────

  private async syncToIntercom(config: any, event: CrmEvent): Promise<{ externalId?: string; responseData?: any } | void> {
    try {
      this.intercomService.setOrganizationContext(event.organizationId);
      const credentials = await this.intercomService['getCredentials'](event.organizationId);
      if (!credentials?.accessToken) return;

      const headers = {
        Authorization: `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      switch (event.type) {
        case CrmEventType.CONTACT_CREATED:
        case CrmEventType.LEAD_CREATED: {
          const existing = await this.findEntityMapping(event.organizationId, event.entityType, event.entityId, 'intercom');
          const contactData = {
            role: event.type === CrmEventType.LEAD_CREATED ? 'lead' : 'user',
            email: event.data.email || undefined,
            name: event.data.name || undefined,
            custom_attributes: {
              salesos_id: event.entityId,
              company: event.data.company || event.data.accountName || '',
              title: event.data.title || '',
              lead_source: event.data.leadSource || '',
            },
          };

          if (existing) {
            await axios.put(
              `https://api.intercom.io/contacts/${existing.externalId}`,
              contactData,
              { headers },
            );
            this.logger.debug(`Intercom contact updated for ${event.type}`);
            return { externalId: existing.externalId };
          }

          const resp = await axios.post(
            'https://api.intercom.io/contacts',
            contactData,
            { headers },
          );
          const intercomId = resp.data?.id;
          if (intercomId) {
            await this.upsertEntityMapping(
              event.organizationId, event.entityType, event.entityId, 'intercom',
              intercomId, `https://app.intercom.com/a/apps/_/contacts/${intercomId}`,
            );
          }
          this.logger.debug(`Intercom contact created for ${event.type}`);
          return { externalId: intercomId };
        }

        case CrmEventType.ACCOUNT_CREATED: {
          const existing = await this.findEntityMapping(event.organizationId, event.entityType, event.entityId, 'intercom');
          const companyData = {
            name: event.data.name || '',
            company_id: event.entityId,
            industry: event.data.industry || '',
            website: event.data.website || '',
            custom_attributes: {
              salesos_id: event.entityId,
              type: event.data.type || '',
            },
          };

          if (existing) {
            await axios.put(
              `https://api.intercom.io/companies/${existing.externalId}`,
              companyData,
              { headers },
            );
            this.logger.debug(`Intercom company updated for ${event.type}`);
            return { externalId: existing.externalId };
          }

          const resp = await axios.post(
            'https://api.intercom.io/companies',
            companyData,
            { headers },
          );
          const companyId = resp.data?.id;
          if (companyId) {
            await this.upsertEntityMapping(
              event.organizationId, event.entityType, event.entityId, 'intercom',
              companyId,
            );
          }
          this.logger.debug(`Intercom company created for ${event.type}`);
          return { externalId: companyId };
        }

        case CrmEventType.DEAL_WON: {
          await axios.post(
            'https://api.intercom.io/events',
            {
              event_name: 'deal-won',
              created_at: Math.floor(Date.now() / 1000),
              email: event.data.contactEmail || undefined,
              metadata: {
                deal_name: event.data.name,
                amount: event.data.amount || 0,
                account_name: event.data.accountName || '',
              },
            },
            { headers },
          );
          this.logger.debug(`Intercom deal-won event logged`);
          break;
        }
      }
    } catch (error: any) {
      this.logger.warn(`Intercom sync failed for ${event.type}: ${error.message}`);
      throw error;
    } finally {
      this.intercomService.clearOrganizationContext();
    }
  }

  // ──────────────────────────────────────
  // DocuSign (Document Signing)
  // ──────────────────────────────────────

  private async createDocuSignEnvelope(config: any, event: CrmEvent): Promise<void> {
    try {
      this.docusignService.setOrganizationContext(event.organizationId);

      const settings = (config.settings || {}) as Record<string, any>;
      if (!settings.autoSendOnQuote) return; // Only auto-send if setting is enabled

      // Create a signing envelope for the quote
      await this.docusignService.createEnvelope({
        documentBase64: event.data.documentBase64 || '',
        documentName: `${event.data.quoteNumber || 'Quote'} - ${event.data.name || 'Document'}`,
        signerEmail: event.data.recipientEmail || event.data.contactEmail || '',
        signerName: event.data.recipientName || event.data.contactName || 'Customer',
        subject: `Please sign: ${event.data.name || 'Quote'}`,
      });

      this.logger.debug(`DocuSign envelope created for quote ${event.data.quoteNumber}`);
    } catch (error: any) {
      this.logger.warn(`DocuSign envelope creation failed: ${error.message}`);
      throw error;
    } finally {
      this.docusignService.clearOrganizationContext();
    }
  }

  // ──────────────────────────────────────
  // PandaDoc (Document Signing)
  // ──────────────────────────────────────

  private async createPandaDocDocument(config: any, event: CrmEvent): Promise<void> {
    try {
      this.pandadocService.setOrganizationContext(event.organizationId);

      const settings = (config.settings || {}) as Record<string, any>;
      if (!settings.autoSendOnQuote) return; // Only auto-send if setting is enabled

      const recipientEmail = event.data.recipientEmail || event.data.contactEmail || '';
      if (!recipientEmail) return;

      // Create and send a PandaDoc document for the quote
      const doc = await this.pandadocService.createDocument({
        name: `${event.data.quoteNumber || 'Quote'} - ${event.data.name || 'Document'}`,
        templateId: settings.quoteTemplateId,
        recipients: [
          { email: recipientEmail, role: 'signer' },
        ],
        tokens: [
          { name: 'Quote.Name', value: event.data.name || '' },
          { name: 'Quote.Number', value: event.data.quoteNumber || '' },
          { name: 'Quote.Amount', value: event.data.totalPrice ? `$${Number(event.data.totalPrice).toLocaleString()}` : '' },
        ],
      });

      if (doc?.id && settings.autoSendDocument) {
        await this.pandadocService.sendDocument(
          doc.id,
          `Please review and sign ${event.data.name || 'this quote'}`,
          `Quote ${event.data.quoteNumber || ''} for your review`,
        );
      }

      this.logger.debug(`PandaDoc document created for quote ${event.data.quoteNumber}`);
    } catch (error: any) {
      this.logger.warn(`PandaDoc document creation failed: ${error.message}`);
      throw error;
    } finally {
      this.pandadocService.clearOrganizationContext();
    }
  }

  // ──────────────────────────────────────
  // QuickBooks (Accounting)
  // ──────────────────────────────────────

  private async syncToQuickBooks(config: any, event: CrmEvent): Promise<{ externalId?: string; responseData?: any } | void> {
    try {
      this.quickbooksService.setOrganizationContext(event.organizationId);
      const credentials = await this.quickbooksService['getCredentials'](event.organizationId);
      if (!credentials?.accessToken || !credentials?.realmId) return;

      const settings = (config.settings || {}) as Record<string, any>;
      const environment = settings.environment === 'production' ? 'production' : 'sandbox';
      const baseUrl = environment === 'production'
        ? 'https://quickbooks.api.intuit.com'
        : 'https://sandbox-quickbooks.api.intuit.com';

      const headers = {
        Authorization: `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      if (event.type === CrmEventType.ORDER_CREATED) {
        const existing = await this.findEntityMapping(event.organizationId, event.entityType, event.entityId, 'quickbooks');
        if (existing) {
          this.logger.debug(`QuickBooks invoice already exists for order ${event.data.orderNumber}`);
          return { externalId: existing.externalId };
        }

        const lineItems = event.data.lineItems || [];
        const lines = lineItems.length > 0
          ? lineItems.map((item: any, idx: number) => ({
              Id: String(idx + 1),
              LineNum: idx + 1,
              Amount: item.totalPrice || item.unitPrice * item.quantity || 0,
              DetailType: 'SalesItemLineDetail',
              Description: item.productName || item.description || 'Item',
              SalesItemLineDetail: {
                Qty: item.quantity || 1,
                UnitPrice: item.unitPrice || 0,
              },
            }))
          : [{
              Id: '1',
              LineNum: 1,
              Amount: event.data.total || 0,
              DetailType: 'SalesItemLineDetail',
              Description: event.data.name || `Order ${event.data.orderNumber}`,
              SalesItemLineDetail: {
                Qty: 1,
                UnitPrice: event.data.total || 0,
              },
            }];

        const resp = await axios.post(
          `${baseUrl}/v3/company/${credentials.realmId}/invoice`,
          {
            Line: lines,
            CustomerRef: {
              name: event.data.accountName || 'Customer',
            },
            DocNumber: event.data.orderNumber,
            TxnDate: new Date().toISOString().split('T')[0],
          },
          { headers },
        );
        const invoiceId = resp.data?.Invoice?.Id;
        if (invoiceId) {
          await this.upsertEntityMapping(
            event.organizationId, event.entityType, event.entityId, 'quickbooks',
            String(invoiceId),
            `${baseUrl.includes('sandbox') ? 'https://app.sandbox.qbo.intuit.com' : 'https://app.qbo.intuit.com'}/app/invoice?txnId=${invoiceId}`,
          );
        }
        this.logger.debug(`QuickBooks invoice created for order ${event.data.orderNumber}`);
        return { externalId: invoiceId ? String(invoiceId) : undefined };
      }

      if (event.type === CrmEventType.DEAL_WON) {
        const existing = await this.findEntityMapping(event.organizationId, event.entityType, event.entityId, 'quickbooks');
        if (existing) {
          this.logger.debug(`QuickBooks sales receipt already exists for deal ${event.data.name}`);
          return { externalId: existing.externalId };
        }

        const resp = await axios.post(
          `${baseUrl}/v3/company/${credentials.realmId}/salesreceipt`,
          {
            Line: [{
              Id: '1',
              LineNum: 1,
              Amount: event.data.amount || 0,
              DetailType: 'SalesItemLineDetail',
              Description: event.data.name || 'Deal',
              SalesItemLineDetail: {
                Qty: 1,
                UnitPrice: event.data.amount || 0,
              },
            }],
            CustomerRef: {
              name: event.data.accountName || 'Customer',
            },
            TxnDate: new Date().toISOString().split('T')[0],
          },
          { headers },
        );
        const receiptId = resp.data?.SalesReceipt?.Id;
        if (receiptId) {
          await this.upsertEntityMapping(
            event.organizationId, event.entityType, event.entityId, 'quickbooks',
            String(receiptId),
          );
        }
        this.logger.debug(`QuickBooks sales receipt created for deal won: ${event.data.name}`);
        return { externalId: receiptId ? String(receiptId) : undefined };
      }
    } catch (error: any) {
      this.logger.warn(`QuickBooks sync failed for ${event.type}: ${error.message}`);
      throw error;
    } finally {
      this.quickbooksService.clearOrganizationContext();
    }
  }

  // ──────────────────────────────────────
  // Xero (Accounting)
  // ──────────────────────────────────────

  private async syncToXero(config: any, event: CrmEvent): Promise<{ externalId?: string; responseData?: any } | void> {
    try {
      this.xeroService.setOrganizationContext(event.organizationId);
      const credentials = await this.xeroService['getCredentials'](event.organizationId);
      if (!credentials?.accessToken || !credentials?.tenantId) return;

      const headers = {
        Authorization: `Bearer ${credentials.accessToken}`,
        'Xero-Tenant-Id': credentials.tenantId,
        'Content-Type': 'application/json',
      };

      if (event.type === CrmEventType.ORDER_CREATED) {
        const existing = await this.findEntityMapping(event.organizationId, event.entityType, event.entityId, 'xero');
        if (existing) {
          this.logger.debug(`Xero invoice already exists for order ${event.data.orderNumber}`);
          return { externalId: existing.externalId };
        }

        const lineItems = event.data.lineItems || [];
        const xeroLineItems = lineItems.length > 0
          ? lineItems.map((item: any) => ({
              Description: item.productName || item.description || 'Item',
              Quantity: item.quantity || 1,
              UnitAmount: item.unitPrice || 0,
              AccountCode: '200',
            }))
          : [{
              Description: event.data.name || `Order ${event.data.orderNumber}`,
              Quantity: 1,
              UnitAmount: event.data.total || 0,
              AccountCode: '200',
            }];

        const resp = await axios.post(
          'https://api.xero.com/api.xro/2.0/Invoices',
          {
            Type: 'ACCREC',
            Contact: {
              Name: event.data.accountName || 'Customer',
            },
            LineItems: xeroLineItems,
            Date: new Date().toISOString().split('T')[0],
            DueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            Reference: event.data.orderNumber,
            Status: 'DRAFT',
          },
          { headers },
        );
        const invoiceId = resp.data?.Invoices?.[0]?.InvoiceID;
        if (invoiceId) {
          await this.upsertEntityMapping(
            event.organizationId, event.entityType, event.entityId, 'xero',
            invoiceId, `https://go.xero.com/AccountsReceivable/Edit.aspx?InvoiceID=${invoiceId}`,
          );
        }
        this.logger.debug(`Xero invoice created for order ${event.data.orderNumber}`);
        return { externalId: invoiceId };
      }

      if (event.type === CrmEventType.DEAL_WON) {
        const existing = await this.findEntityMapping(event.organizationId, event.entityType, event.entityId, 'xero');
        if (existing) {
          this.logger.debug(`Xero invoice already exists for deal ${event.data.name}`);
          return { externalId: existing.externalId };
        }

        const resp = await axios.post(
          'https://api.xero.com/api.xro/2.0/Invoices',
          {
            Type: 'ACCREC',
            Contact: {
              Name: event.data.accountName || 'Customer',
            },
            LineItems: [{
              Description: event.data.name || 'Deal',
              Quantity: 1,
              UnitAmount: event.data.amount || 0,
              AccountCode: '200',
            }],
            Date: new Date().toISOString().split('T')[0],
            DueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            Status: 'DRAFT',
          },
          { headers },
        );
        const invoiceId = resp.data?.Invoices?.[0]?.InvoiceID;
        if (invoiceId) {
          await this.upsertEntityMapping(
            event.organizationId, event.entityType, event.entityId, 'xero',
            invoiceId, `https://go.xero.com/AccountsReceivable/Edit.aspx?InvoiceID=${invoiceId}`,
          );
        }
        this.logger.debug(`Xero invoice created for deal won: ${event.data.name}`);
        return { externalId: invoiceId };
      }
    } catch (error: any) {
      this.logger.warn(`Xero sync failed for ${event.type}: ${error.message}`);
      throw error;
    } finally {
      this.xeroService.clearOrganizationContext();
    }
  }

  // ──────────────────────────────────────
  // Microsoft Graph (Calendar / Email)
  // ──────────────────────────────────────

  private async syncToMicrosoftGraph(config: any, event: CrmEvent): Promise<void> {
    try {
      if (!event.userId) return; // Microsoft Graph requires a user context

      switch (event.type) {
        case CrmEventType.DEAL_WON: {
          // Create a follow-up calendar event to celebrate / plan post-sale
          await this.microsoftGraphService.createEvent(event.userId, {
            subject: `Follow-up: Deal Won — ${event.data.name || 'New Deal'}`,
            startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
            endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(), // +30min
            body: `<p>Deal "<b>${event.data.name}</b>" has been closed-won for <b>$${Number(event.data.amount || 0).toLocaleString()}</b>.</p>` +
              `<p>Account: ${event.data.accountName || 'N/A'}</p>` +
              `<p>Schedule onboarding and post-sale handoff.</p>`,
          });
          this.logger.debug(`Microsoft Graph calendar event created for deal won: ${event.data.name}`);
          break;
        }

        case CrmEventType.QUOTE_SENT: {
          // Send the quote via email through Microsoft Graph
          const recipientEmail = event.data.recipientEmail || event.data.contactEmail;
          if (recipientEmail) {
            await this.microsoftGraphService.sendEmail(event.userId, {
              to: [recipientEmail],
              subject: `Quote: ${event.data.name || event.data.quoteNumber || 'Your Quote'}`,
              body: `<p>Please find your quote details below:</p>` +
                `<p><b>Quote:</b> ${event.data.name || 'N/A'}</p>` +
                `<p><b>Quote #:</b> ${event.data.quoteNumber || 'N/A'}</p>` +
                `<p><b>Amount:</b> $${Number(event.data.totalPrice || 0).toLocaleString()}</p>` +
                `<p>Please reply if you have any questions.</p>`,
            });
            this.logger.debug(`Microsoft Graph email sent for quote: ${event.data.quoteNumber}`);
          }
          break;
        }

        case CrmEventType.DEAL_STAGE_CHANGED: {
          // Create a calendar reminder for follow-up on stage change
          await this.microsoftGraphService.createEvent(event.userId, {
            subject: `Follow-up: ${event.data.name || 'Deal'} → ${event.data.newStage}`,
            startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // In 2 days
            endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString(), // +15min
            body: `<p>Deal "<b>${event.data.name}</b>" moved from <i>${event.data.previousStage}</i> to <b>${event.data.newStage}</b>.</p>` +
              `<p>Review deal progress and plan next steps.</p>`,
          });
          this.logger.debug(`Microsoft Graph calendar reminder for stage change: ${event.data.name}`);
          break;
        }
      }
    } catch (error: any) {
      this.logger.warn(`Microsoft Graph sync failed for ${event.type}: ${error.message}`);
      throw error;
    }
  }

  // ──────────────────────────────────────
  // Dropbox (Document Archival)
  // ──────────────────────────────────────

  private async archiveToDropbox(config: any, event: CrmEvent): Promise<{ externalId?: string; responseData?: any } | void> {
    try {
      this.dropboxService.setOrganizationContext(event.organizationId);

      const timestamp = new Date().toISOString().split('T')[0];
      let path: string;
      let content: string;

      switch (event.type) {
        case CrmEventType.QUOTE_SENT: {
          const quoteName = (event.data.name || event.data.quoteNumber || 'Quote').replace(/[/\\]/g, '-');
          path = `/SalesOS/Quotes/${quoteName}_${timestamp}.txt`;
          content = [
            `Quote: ${event.data.name || 'N/A'}`,
            `Quote Number: ${event.data.quoteNumber || 'N/A'}`,
            `Amount: $${Number(event.data.totalPrice || 0).toLocaleString()}`,
            `Sent: ${event.timestamp}`,
            `Recipient: ${event.data.recipientEmail || event.data.contactEmail || 'N/A'}`,
          ].join('\n');
          break;
        }

        case CrmEventType.ORDER_CREATED: {
          const orderNum = (event.data.orderNumber || 'Order').replace(/[/\\]/g, '-');
          path = `/SalesOS/Orders/${orderNum}_${timestamp}.txt`;
          content = [
            `Order: ${event.data.orderNumber || 'N/A'}`,
            `Account: ${event.data.accountName || 'N/A'}`,
            `Total: $${Number(event.data.total || 0).toLocaleString()}`,
            `Created: ${event.timestamp}`,
          ].join('\n');
          break;
        }

        case CrmEventType.DEAL_WON: {
          const dealName = (event.data.name || 'Deal').replace(/[/\\]/g, '-');
          path = `/SalesOS/Deals/Won/${dealName}_${timestamp}.txt`;
          content = [
            `Deal Won: ${event.data.name || 'N/A'}`,
            `Amount: $${Number(event.data.amount || 0).toLocaleString()}`,
            `Account: ${event.data.accountName || 'N/A'}`,
            `Closed: ${event.timestamp}`,
          ].join('\n');
          break;
        }

        default:
          return;
      }

      const result = await this.dropboxService.uploadFile(path, Buffer.from(content, 'utf-8'));
      const fileId = result?.id || result?.path_display;
      const fileName = path.split('/').pop() || 'document';

      // Store attachment reference
      await this.storeAttachment({
        organizationId: event.organizationId,
        entityType: event.entityType,
        entityId: event.entityId,
        provider: 'dropbox',
        externalId: fileId || undefined,
        fileName,
        fileUrl: result?.sharedUrl || result?.path_display || path,
        fileType: 'document',
        eventType: event.type,
      });

      this.logger.debug(`Dropbox archive created: ${path}`);
      return { externalId: fileId };
    } catch (error: any) {
      this.logger.warn(`Dropbox archive failed for ${event.type}: ${error.message}`);
      throw error;
    } finally {
      this.dropboxService.clearOrganizationContext();
    }
  }

  // ──────────────────────────────────────
  // Google Drive (Folder Archival)
  // ──────────────────────────────────────

  private async archiveToGDrive(config: any, event: CrmEvent): Promise<{ externalId?: string; responseData?: any } | void> {
    try {
      this.gdriveService.setOrganizationContext(event.organizationId);

      const settings = (config.settings || {}) as Record<string, any>;
      const rootFolderId = settings.salesosFolderId || undefined;
      let folderId: string | undefined;
      let folderName: string;

      switch (event.type) {
        case CrmEventType.DEAL_WON: {
          const dealName = (event.data.name || 'Deal').replace(/[/\\]/g, '-');
          folderName = `Won — ${dealName} ($${Number(event.data.amount || 0).toLocaleString()})`;
          const result = await this.gdriveService.createFolder(folderName, rootFolderId);
          folderId = result?.id;
          this.logger.debug(`Google Drive folder created for deal won: ${event.data.name}`);
          break;
        }

        case CrmEventType.QUOTE_SENT: {
          const quoteName = (event.data.name || event.data.quoteNumber || 'Quote').replace(/[/\\]/g, '-');
          folderName = `Quote — ${quoteName}`;
          const result = await this.gdriveService.createFolder(folderName, rootFolderId);
          folderId = result?.id;
          this.logger.debug(`Google Drive folder created for quote: ${event.data.quoteNumber}`);
          break;
        }

        case CrmEventType.ORDER_CREATED: {
          const orderNum = (event.data.orderNumber || 'Order').replace(/[/\\]/g, '-');
          folderName = `Order — ${orderNum}`;
          const result = await this.gdriveService.createFolder(folderName, rootFolderId);
          folderId = result?.id;
          this.logger.debug(`Google Drive folder created for order: ${event.data.orderNumber}`);
          break;
        }

        default:
          return;
      }

      // Store attachment reference
      await this.storeAttachment({
        organizationId: event.organizationId,
        entityType: event.entityType,
        entityId: event.entityId,
        provider: 'gdrive',
        externalId: folderId || undefined,
        fileName: folderName!,
        fileUrl: folderId ? `https://drive.google.com/drive/folders/${folderId}` : undefined,
        fileType: 'folder',
        eventType: event.type,
      });

      return { externalId: folderId };
    } catch (error: any) {
      this.logger.warn(`Google Drive archive failed for ${event.type}: ${error.message}`);
      throw error;
    } finally {
      this.gdriveService.clearOrganizationContext();
    }
  }

  // ──────────────────────────────────────
  // AI Auto-Processing (OpenAI / Anthropic)
  // ──────────────────────────────────────

  private async aiAutoProcess(provider: 'openai' | 'anthropic', event: CrmEvent): Promise<void> {
    try {
      switch (event.type) {
        case CrmEventType.LEAD_CREATED:
          await this.aiScoreLead(provider, event);
          break;

        case CrmEventType.DEAL_CREATED:
        case CrmEventType.DEAL_STAGE_CHANGED:
          await this.aiAnalyzeDeal(provider, event);
          break;
      }
    } catch (error: any) {
      this.logger.warn(`AI auto-process (${provider}) failed for ${event.type}: ${error.message}`);
      throw error;
    }
  }

  private async aiScoreLead(provider: 'openai' | 'anthropic', event: CrmEvent): Promise<void> {
    const leadData = {
      name: `${event.data.firstName || ''} ${event.data.lastName || ''}`.trim() || event.data.name || 'Unknown',
      company: event.data.company,
      title: event.data.title,
      email: event.data.email,
      source: event.data.leadSource,
      industry: event.data.industry,
    };

    let result: { score: number; confidence: number; reasoning: string; strengths: string[]; weaknesses: string[]; recommendations: string[] };

    if (provider === 'openai') {
      this.openaiService.setOrganizationContext(event.organizationId);
      try {
        result = await this.openaiService.scoreLead(leadData);
      } finally {
        this.openaiService.clearOrganizationContext();
      }
    } else {
      this.anthropicService.setOrganizationContext(event.organizationId);
      try {
        result = await this.anthropicService.scoreLead(leadData);
      } finally {
        this.anthropicService.clearOrganizationContext();
      }
    }

    // Fetch existing metadata to merge
    const lead = await this.prisma.lead.findUnique({ where: { id: event.entityId }, select: { metadata: true } });
    const existingMetadata = (lead?.metadata as Record<string, any>) || {};

    await this.prisma.lead.update({
      where: { id: event.entityId },
      data: {
        leadScore: result.score,
        metadata: {
          ...existingMetadata,
          aiScoring: {
            score: result.score,
            confidence: result.confidence,
            reasoning: result.reasoning,
            strengths: result.strengths,
            weaknesses: result.weaknesses,
            recommendations: result.recommendations,
            provider,
            scoredAt: new Date().toISOString(),
          },
        },
      },
    });

    this.logger.log(`AI (${provider}) scored lead ${event.entityId}: ${result.score}/100`);
  }

  private async aiAnalyzeDeal(provider: 'openai' | 'anthropic', event: CrmEvent): Promise<void> {
    const dealInfo = {
      dealName: event.data.name || 'Unknown Deal',
      amount: event.data.amount || 0,
      stage: event.data.newStage || event.data.stage || 'Unknown',
      daysInStage: event.data.dealVelocity || 0,
      activities: event.data.recentActivities || [],
      notes: event.data.notes || '',
    };

    let analysis: any;

    if (provider === 'openai') {
      this.openaiService.setOrganizationContext(event.organizationId);
      try {
        analysis = await this.openaiService.analyzeDeal(dealInfo);
      } finally {
        this.openaiService.clearOrganizationContext();
      }
    } else {
      this.anthropicService.setOrganizationContext(event.organizationId);
      try {
        analysis = await this.anthropicService.analyzeDealUnified(dealInfo);
      } finally {
        this.anthropicService.clearOrganizationContext();
      }
    }

    // Extract structured data from analysis
    const riskScore = analysis?.riskScore || analysis?.risk_score;
    const recommendedActions = analysis?.recommendedActions || analysis?.recommended_actions || [];
    const potentialBlockers = analysis?.potentialBlockers || analysis?.potential_blockers || [];

    // Fetch existing metadata to merge
    const opp = await this.prisma.opportunity.findUnique({
      where: { id: event.entityId },
      select: { metadata: true },
    });
    const existingMetadata = (opp?.metadata as Record<string, any>) || {};

    // Update opportunity with AI insights
    const updateData: any = {
      metadata: {
        ...existingMetadata,
        aiAnalysis: {
          ...analysis,
          provider,
          analyzedAt: new Date().toISOString(),
        },
      },
    };

    // Update structured fields if we have valid data
    if (riskScore && typeof riskScore === 'number') {
      updateData.winProbability = Math.max(0, Math.min(1, (10 - riskScore) / 10));
    }
    if (Array.isArray(recommendedActions) && recommendedActions.length > 0) {
      updateData.recommendedActions = recommendedActions.map((a: any) => typeof a === 'string' ? a : a.action || String(a));
    }
    if (Array.isArray(potentialBlockers) && potentialBlockers.length > 0) {
      updateData.riskFactors = potentialBlockers.map((b: any) => typeof b === 'string' ? b : String(b));
    }

    await this.prisma.opportunity.update({
      where: { id: event.entityId },
      data: updateData,
    });

    this.logger.log(`AI (${provider}) analyzed deal ${event.entityId}: risk=${riskScore || 'N/A'}`);
  }
}
