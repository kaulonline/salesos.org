import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { EmailTrackingService } from './email-tracking.service';
import { EmailTrackingUtils } from './email-tracking.utils';
import * as imaps from 'imap-simple';
import { simpleParser, ParsedMail } from 'mailparser';

interface ImapConfig {
  imap: {
    user: string;
    password: string;
    host: string;
    port: number;
    tls: boolean;
    authTimeout: number;
    tlsOptions: { rejectUnauthorized: boolean };
  };
}

@Injectable()
export class ImapPollingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ImapPollingService.name);
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private isPolling = false;
  private isEnabled = false;
  private connection: imaps.ImapSimple | null = null;
  private config: ImapConfig | null = null;
  private lastPollTime: Date = new Date();

  // Track processed message IDs to avoid duplicates
  private processedMessageIds = new Set<string>();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly emailTrackingService: EmailTrackingService,
    private readonly trackingUtils: EmailTrackingUtils,
  ) {}

  async onModuleInit() {
    const gmailUser = this.configService.get<string>('GMAIL_USER');
    const gmailAppPassword = this.configService.get<string>('GMAIL_APP_PASSWORD');
    const imapEnabled = this.configService.get<string>('GMAIL_IMAP_ENABLED', 'false');

    if (imapEnabled.toLowerCase() !== 'true') {
      this.logger.log('IMAP polling is disabled (set GMAIL_IMAP_ENABLED=true to enable)');
      return;
    }

    if (!gmailUser || !gmailAppPassword) {
      this.logger.warn('IMAP polling disabled: GMAIL_USER or GMAIL_APP_PASSWORD not configured');
      return;
    }

    this.config = {
      imap: {
        user: gmailUser,
        password: gmailAppPassword,
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        authTimeout: 10000,
        tlsOptions: { rejectUnauthorized: false },
      },
    };

    this.isEnabled = true;
    this.logger.log(`IMAP polling enabled for: ${gmailUser}`);

    // Load previously processed message IDs from database
    await this.loadProcessedMessageIds();

    // Start polling
    const pollIntervalMs = parseInt(
      this.configService.get<string>('GMAIL_POLL_INTERVAL_MS', '60000'),
      10,
    );

    this.startPolling(pollIntervalMs);
  }

  async onModuleDestroy() {
    this.stopPolling();
    await this.disconnect();
  }

  /**
   * Load already processed message IDs from database to avoid reprocessing
   */
  private async loadProcessedMessageIds() {
    try {
      const recentEmails = await this.prisma.emailMessage.findMany({
        where: {
          direction: 'INBOUND',
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
        select: { messageId: true },
      });

      recentEmails.forEach((email) => {
        this.processedMessageIds.add(email.messageId);
      });

      this.logger.log(`Loaded ${this.processedMessageIds.size} processed message IDs`);
    } catch (error) {
      this.logger.error(`Failed to load processed message IDs: ${error.message}`);
    }
  }

  /**
   * Start the polling interval
   */
  startPolling(intervalMs: number = 60000) {
    if (this.pollingInterval) {
      this.stopPolling();
    }

    this.logger.log(`Starting IMAP polling every ${intervalMs / 1000} seconds`);

    // Initial poll
    this.pollForNewEmails().catch((err) => {
      this.logger.error(`Initial poll failed: ${err.message}`);
    });

    // Set up recurring poll
    this.pollingInterval = setInterval(() => {
      this.pollForNewEmails().catch((err) => {
        this.logger.error(`Polling error: ${err.message}`);
      });
    }, intervalMs);
  }

  /**
   * Stop the polling interval
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      this.logger.log('IMAP polling stopped');
    }
  }

  /**
   * Connect to IMAP server
   */
  private async connect(): Promise<imaps.ImapSimple> {
    if (this.connection) {
      try {
        // Test if connection is still alive
        await this.connection.openBox('INBOX');
        return this.connection;
      } catch {
        // Connection died, need to reconnect
        this.connection = null;
      }
    }

    if (!this.config) {
      throw new Error('IMAP not configured');
    }

    this.logger.debug('Connecting to IMAP server...');
    this.connection = await imaps.connect(this.config);
    this.logger.debug('Connected to IMAP server');
    return this.connection;
  }

  /**
   * Disconnect from IMAP server
   */
  private async disconnect() {
    if (this.connection) {
      try {
        this.connection.end();
      } catch (error) {
        this.logger.debug(`Disconnect error: ${error.message}`);
      }
      this.connection = null;
    }
  }

  /**
   * Poll for new emails in the inbox
   */
  async pollForNewEmails(): Promise<void> {
    if (!this.isEnabled) return;
    if (this.isPolling) {
      this.logger.debug('Skipping poll - already in progress');
      return;
    }

    this.isPolling = true;
    const startTime = Date.now();

    try {
      const connection = await this.connect();
      await connection.openBox('INBOX');

      // Search for emails received since last poll
      // Use UNSEEN flag to get unread emails, or SINCE for date-based
      const searchCriteria = [
        'UNSEEN',
        ['SINCE', this.formatImapDate(this.lastPollTime)],
      ];

      const fetchOptions = {
        bodies: ['HEADER', 'TEXT', ''],
        markSeen: false, // Don't mark as seen until processed
        struct: true,
      };

      const messages = await connection.search(searchCriteria, fetchOptions);
      // Only log if there are messages to process
      if (messages.length > 0) {
        this.logger.debug(`Found ${messages.length} unread messages`);
      }

      let processedCount = 0;
      let skippedCount = 0;

      for (const message of messages) {
        try {
          const result = await this.processMessage(message, connection);
          if (result === 'processed') {
            processedCount++;
          } else if (result === 'skipped') {
            skippedCount++;
          }
        } catch (error) {
          this.logger.error(`Failed to process message: ${error.message}`);
        }
      }

      this.lastPollTime = new Date();

      if (processedCount > 0 || skippedCount > 0) {
        this.logger.log(
          `Poll completed in ${Date.now() - startTime}ms: ${processedCount} processed, ${skippedCount} skipped`,
        );
      }
    } catch (error) {
      this.logger.error(`Poll failed: ${error.message}`);
      // Reset connection on error
      await this.disconnect();
    } finally {
      this.isPolling = false;
    }
  }

  /**
   * Process a single email message
   */
  private async processMessage(
    message: imaps.Message,
    connection: imaps.ImapSimple,
  ): Promise<'processed' | 'skipped' | 'error'> {
    try {
      // Get the full email body
      const all = message.parts.find((part) => part.which === '');
      if (!all) {
        this.logger.warn('No message body found');
        return 'error';
      }

      // Parse the email
      const parsed = await simpleParser(all.body);
      const messageId = parsed.messageId || `generated-${Date.now()}-${Math.random()}`;

      // Skip if already processed
      if (this.processedMessageIds.has(messageId)) {
        return 'skipped';
      }

      // Check if this is a reply to one of our emails
      const inReplyTo = parsed.inReplyTo;
      const references = this.parseReferences(parsed.references);
      const bodyContent = (parsed.html || '') + (parsed.text || '');

      // Extract tracking ID from email body (hidden markers in quoted content)
      const trackingInfo = this.trackingUtils.extractTrackingIdFromBody(bodyContent);

      // Check by Message-ID/References OR by tracking ID in body
      const isReply = await this.isReplyToOurEmail(inReplyTo, references, trackingInfo);
      if (!isReply) {
        // Not a reply to our emails, skip but don't mark as error
        return 'skipped';
      }

      this.logger.log(`Processing inbound email: ${parsed.subject} from ${parsed.from?.text}${trackingInfo.trackingId ? ` (tracking: ${trackingInfo.trackingId})` : ''}`);

      // Extract email data
      const fromEmail = parsed.from?.value?.[0]?.address || '';
      const fromName = parsed.from?.value?.[0]?.name || '';
      const toEmails = parsed.to
        ? (Array.isArray(parsed.to) ? parsed.to : [parsed.to])
            .flatMap((addr) => addr.value.map((v) => v.address || ''))
            .filter(Boolean)
        : [];
      const ccEmails = parsed.cc
        ? (Array.isArray(parsed.cc) ? parsed.cc : [parsed.cc])
            .flatMap((addr) => addr.value.map((v) => v.address || ''))
            .filter(Boolean)
        : [];

      // Process through the email tracking service
      await this.emailTrackingService.processInboundEmail({
        messageId,
        inReplyTo: inReplyTo || undefined,
        references,
        fromEmail,
        fromName,
        toEmails,
        ccEmails,
        subject: parsed.subject || '(No Subject)',
        bodyHtml: parsed.html || undefined,
        bodyText: parsed.text || undefined,
        receivedAt: parsed.date || new Date(),
      });

      // Mark as processed
      this.processedMessageIds.add(messageId);

      // Mark email as seen in Gmail
      await this.markAsSeen(message, connection);

      return 'processed';
    } catch (error) {
      this.logger.error(`Error processing message: ${error.message}`);
      return 'error';
    }
  }

  /**
   * Check if email is a reply to one of our outbound emails
   * Checks by: 1) Message-ID/References headers, 2) Tracking ID in body
   */
  private async isReplyToOurEmail(
    inReplyTo?: string,
    references?: string[],
    trackingInfo?: { trackingId?: string; threadId?: string },
  ): Promise<boolean> {
    this.logger.debug(`isReplyToOurEmail check - inReplyTo: ${inReplyTo}, references: ${JSON.stringify(references)}, trackingInfo: ${JSON.stringify(trackingInfo)}`);
    
    // Method 1: Check by tracking ID in body (most reliable for our emails)
    if (trackingInfo?.trackingId) {
      const emailByTrackingId = await this.prisma.emailMessage.findFirst({
        where: {
          direction: 'OUTBOUND',
          metadata: {
            path: ['trackingId'],
            equals: trackingInfo.trackingId,
          },
        },
      });
      if (emailByTrackingId) {
        this.logger.debug(`Matched by tracking ID: ${trackingInfo.trackingId}`);
        return true;
      }
    }

    // Method 2: Check by thread ID directly
    if (trackingInfo?.threadId) {
      const thread = await this.prisma.emailThread.findUnique({
        where: { id: trackingInfo.threadId },
      });
      if (thread) {
        this.logger.debug(`Matched by thread ID: ${trackingInfo.threadId}`);
        return true;
      }
    }

    // Method 3: Check by Message-ID/References headers
    if (!inReplyTo && (!references || references.length === 0)) {
      return false;
    }

    // Check if any of the referenced message IDs exist in our database
    const messageIdsToCheck = [
      ...(inReplyTo ? [inReplyTo] : []),
      ...(references || []),
    ].filter(Boolean);

    if (messageIdsToCheck.length === 0) {
      return false;
    }

    const existingEmail = await this.prisma.emailMessage.findFirst({
      where: {
        messageId: { in: messageIdsToCheck },
        direction: 'OUTBOUND',
      },
    });

    if (existingEmail) {
      this.logger.debug(`Matched by Message-ID header`);
    } else {
      this.logger.debug(`No match found for messageIds: ${JSON.stringify(messageIdsToCheck)}`);
    }

    return !!existingEmail;
  }

  /**
   * Parse references header into array
   */
  private parseReferences(references: string | string[] | undefined): string[] {
    if (!references) return [];
    if (Array.isArray(references)) return references;
    // References header is space-separated
    return references.split(/\s+/).filter(Boolean);
  }

  /**
   * Mark message as seen in the mailbox
   */
  private async markAsSeen(
    message: imaps.Message,
    connection: imaps.ImapSimple,
  ): Promise<void> {
    try {
      const uid = message.attributes.uid;
      await connection.addFlags(uid, ['\\Seen']);
    } catch (error) {
      this.logger.warn(`Failed to mark message as seen: ${error.message}`);
    }
  }

  /**
   * Format date for IMAP SINCE search
   */
  private formatImapDate(date: Date): string {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return `${date.getDate()}-${months[date.getMonth()]}-${date.getFullYear()}`;
  }

  /**
   * Force an immediate poll (for testing/manual trigger)
   */
  async forcePoll(): Promise<{ success: boolean; message: string }> {
    if (!this.isEnabled) {
      return { success: false, message: 'IMAP polling is not enabled' };
    }

    try {
      await this.pollForNewEmails();
      return { success: true, message: 'Poll completed successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get polling status
   */
  getStatus(): {
    enabled: boolean;
    isPolling: boolean;
    lastPollTime: Date;
    processedCount: number;
  } {
    return {
      enabled: this.isEnabled,
      isPolling: this.isPolling,
      lastPollTime: this.lastPollTime,
      processedCount: this.processedMessageIds.size,
    };
  }
}
