import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as imaps from 'imap-simple';
import { simpleParser, ParsedMail } from 'mailparser';
import { SupportService } from './support.service';
import { InboundEmailDto } from './dto/inbound-email.dto';

/**
 * Email Polling Service
 * Polls Gmail/IMAP for customer replies to support tickets
 *
 * Checks every 2 minutes for new emails with case IDs in subject
 */
@Injectable()
export class EmailPollingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailPollingService.name);
  private isPolling = false;
  private lastPollTime: Date | null = null;
  private processedMessageIds = new Set<string>();
  private enabled = false;

  constructor(private readonly supportService: SupportService) {}

  async onModuleInit() {
    // Check if IMAP is configured (Gmail or custom SMTP)
    const imapHost = process.env.IMAP_HOST || process.env.GMAIL_IMAP_HOST ||
                     (process.env.GMAIL_USER ? 'imap.gmail.com' : undefined);
    const imapUser = process.env.IMAP_USER || process.env.GMAIL_USER || process.env.EMAIL_USER;
    const imapPass = process.env.IMAP_PASSWORD || process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASSWORD;

    if (imapHost && imapUser && imapPass) {
      this.enabled = true;
      this.logger.log(`Email polling enabled for ${imapUser}`);

      // Do initial poll on startup
      setTimeout(() => this.pollForReplies(), 10000);
    } else {
      this.logger.warn('Email polling disabled - IMAP credentials not configured');
      this.logger.warn('Set IMAP_HOST, IMAP_USER, IMAP_PASSWORD (or GMAIL_* equivalents) to enable');
    }
  }

  async onModuleDestroy() {
    this.enabled = false;
  }

  /**
   * Poll for new support ticket replies every 2 minutes
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async scheduledPoll() {
    // In cluster mode, only run on the primary worker
    const instanceId = process.env.NODE_APP_INSTANCE || '0';
    if (instanceId !== '0') return;

    if (!this.enabled) return;

    // Skip if last poll was less than 2 minutes ago
    if (this.lastPollTime && Date.now() - this.lastPollTime.getTime() < 90000) {
      return;
    }

    await this.pollForReplies();
  }

  /**
   * Manual trigger for polling (can be called via admin API)
   */
  async pollForReplies(): Promise<{ processed: number; errors: number }> {
    if (!this.enabled) {
      this.logger.warn('Email polling is not enabled');
      return { processed: 0, errors: 0 };
    }

    if (this.isPolling) {
      this.logger.debug('Poll already in progress, skipping');
      return { processed: 0, errors: 0 };
    }

    this.isPolling = true;
    this.lastPollTime = new Date();
    let processed = 0;
    let errors = 0;

    try {
      const config = this.getImapConfig();
      this.logger.debug(`Connecting to IMAP: ${config.imap.host}`);

      const connection = await imaps.connect(config);

      try {
        await connection.openBox('INBOX');

        // Search for unread emails from the last 24 hours with case ID pattern
        const searchCriteria = [
          'UNSEEN',
          ['SINCE', new Date(Date.now() - 24 * 60 * 60 * 1000)],
        ];

        const fetchOptions = {
          bodies: ['HEADER', 'TEXT', ''],
          markSeen: false, // We'll mark as seen after successful processing
        };

        const messages = await connection.search(searchCriteria, fetchOptions);
        this.logger.debug(`Found ${messages.length} unread emails`);

        for (const message of messages) {
          try {
            const messageId = message.attributes.uid.toString();

            // Skip if already processed (in case of race conditions)
            if (this.processedMessageIds.has(messageId)) {
              continue;
            }

            // Get the full email content
            const all = message.parts.find(p => p.which === '');
            if (!all) continue;

            const parsed = await simpleParser(all.body);

            // Check if this is a support ticket reply (has case ID in subject)
            const caseIdMatch = parsed.subject?.match(/\[?(IR-\d{4}-\d{2,})\]?/i);
            if (!caseIdMatch) {
              continue; // Not a support ticket reply
            }

            const caseId = caseIdMatch[1].toUpperCase();

            // Convert to InboundEmailDto format
            const fromAddress = Array.isArray(parsed.from)
              ? parsed.from[0]?.text || ''
              : parsed.from?.text || '';
            const toAddress = Array.isArray(parsed.to)
              ? parsed.to[0]?.text || ''
              : parsed.to?.text || '';
            const fromName = Array.isArray(parsed.from)
              ? parsed.from[0]?.value?.[0]?.name
              : parsed.from?.value?.[0]?.name;

            this.logger.log(`Processing email reply for case ${caseId} from ${fromAddress}`);

            const emailDto: InboundEmailDto = {
              from: this.extractEmail(fromAddress),
              fromName,
              to: this.extractEmail(toAddress),
              subject: parsed.subject || '',
              text: parsed.text || '',
              html: parsed.html || undefined,
              messageId: parsed.messageId,
              inReplyTo: parsed.inReplyTo,
              references: Array.isArray(parsed.references)
                ? parsed.references.join(' ')
                : parsed.references,
            };

            // Process through support service
            const result = await this.supportService.processInboundEmail(emailDto);

            if (result.success) {
              processed++;
              this.processedMessageIds.add(messageId);

              // Mark as read
              await connection.addFlags(message.attributes.uid, ['\\Seen']);

              this.logger.log(`Successfully processed email for ${caseId}`);
            } else {
              errors++;
              this.logger.warn(`Failed to process email for ${caseId}: ${result.message}`);
            }
          } catch (err) {
            errors++;
            this.logger.error(`Error processing email: ${err.message}`);
          }
        }

        // Cleanup old processed message IDs (keep last 1000)
        if (this.processedMessageIds.size > 1000) {
          const idsArray = Array.from(this.processedMessageIds);
          this.processedMessageIds = new Set(idsArray.slice(-500));
        }

      } finally {
        await connection.end();
      }

    } catch (err) {
      this.logger.error(`IMAP connection error: ${err.message}`);
      errors++;
    } finally {
      this.isPolling = false;
    }

    if (processed > 0 || errors > 0) {
      this.logger.log(`Email poll complete: ${processed} processed, ${errors} errors`);
    }

    return { processed, errors };
  }

  /**
   * Get IMAP configuration from environment
   */
  private getImapConfig(): imaps.ImapSimpleOptions {
    const host = process.env.IMAP_HOST || process.env.GMAIL_IMAP_HOST ||
                 (process.env.GMAIL_USER ? 'imap.gmail.com' : 'imap.gmail.com');
    const port = parseInt(process.env.IMAP_PORT || '993', 10);
    const user = process.env.IMAP_USER || process.env.GMAIL_USER || process.env.EMAIL_USER || '';
    const password = process.env.IMAP_PASSWORD || process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASSWORD || '';

    return {
      imap: {
        user,
        password,
        host,
        port,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 10000,
      },
    };
  }

  /**
   * Extract email address from a string like "Name <email@example.com>"
   */
  private extractEmail(str: string): string {
    const match = str.match(/<([^>]+)>/);
    if (match) return match[1].toLowerCase();
    // If no angle brackets, assume the whole string is an email
    return str.trim().toLowerCase();
  }

  /**
   * Get polling status for admin dashboard
   */
  getStatus(): {
    enabled: boolean;
    lastPoll: Date | null;
    isPolling: boolean;
    processedCount: number;
  } {
    return {
      enabled: this.enabled,
      lastPoll: this.lastPollTime,
      isPolling: this.isPolling,
      processedCount: this.processedMessageIds.size,
    };
  }
}
