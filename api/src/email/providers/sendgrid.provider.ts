import { Logger } from '@nestjs/common';
import {
  IEmailProvider,
  EmailProviderConfig,
  EmailSendOptions,
  EmailSendResult,
} from './email-provider.interface';

/**
 * SendGrid Email Provider
 * Uses SendGrid API v3 to send emails
 */
export class SendGridProvider implements IEmailProvider {
  readonly name = 'sendgrid';
  private readonly logger = new Logger(SendGridProvider.name);
  private config: EmailProviderConfig | null = null;
  private ready = false;
  private apiKey: string = '';

  async initialize(config: EmailProviderConfig): Promise<void> {
    if (!config.apiKey) {
      throw new Error('SendGrid API key is required');
    }

    this.config = config;
    this.apiKey = config.apiKey;

    // Verify the API key by making a test request
    try {
      const verified = await this.verify();
      if (verified) {
        this.ready = true;
        this.logger.log('SendGrid provider initialized');
      }
    } catch (error) {
      this.ready = false;
      this.logger.error(`SendGrid initialization failed: ${error.message}`);
      throw error;
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  async verify(): Promise<boolean> {
    try {
      // Test the API key by fetching user profile
      const response = await fetch('https://api.sendgrid.com/v3/user/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async send(options: EmailSendOptions): Promise<EmailSendResult> {
    if (!this.isReady()) {
      return { success: false, error: 'SendGrid provider not initialized' };
    }

    try {
      const toAddresses = Array.isArray(options.to) ? options.to : [options.to];
      const fromAddress = options.from || this.config?.fromEmail;
      const fromName = options.fromName || this.config?.fromName || 'IRIS Sales CRM';

      if (!fromAddress) {
        return { success: false, error: 'From address is required' };
      }

      const payload: any = {
        personalizations: [
          {
            to: toAddresses.map(email => ({ email })),
          },
        ],
        from: {
          email: fromAddress,
          name: fromName,
        },
        subject: options.subject,
        content: [
          {
            type: 'text/html',
            value: options.html,
          },
        ],
      };

      // Add plain text version if provided
      if (options.text) {
        payload.content.unshift({
          type: 'text/plain',
          value: options.text,
        });
      }

      // Add CC recipients
      if (options.cc?.length) {
        payload.personalizations[0].cc = options.cc.map(email => ({ email }));
      }

      // Add BCC recipients
      if (options.bcc?.length) {
        payload.personalizations[0].bcc = options.bcc.map(email => ({ email }));
      }

      // Add reply-to
      if (options.replyTo) {
        payload.reply_to = { email: options.replyTo };
      }

      // Add custom headers
      if (options.headers) {
        payload.headers = options.headers;
      }

      // Add tags for tracking
      if (options.tags?.length) {
        payload.categories = options.tags;
      }

      // Add metadata
      if (options.metadata) {
        payload.custom_args = options.metadata;
      }

      // Add attachments
      if (options.attachments?.length) {
        payload.attachments = options.attachments.map(att => ({
          content: typeof att.content === 'string'
            ? att.content
            : att.content.toString('base64'),
          filename: att.filename,
          type: att.contentType,
          disposition: att.cid ? 'inline' : 'attachment',
          content_id: att.cid,
        }));
      }

      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok || response.status === 202) {
        const messageId = response.headers.get('x-message-id') || `sg-${Date.now()}`;
        this.logger.debug(`Email sent via SendGrid: ${messageId}`);
        return {
          success: true,
          messageId,
          providerId: messageId,
        };
      } else {
        const errorBody = await response.text();
        this.logger.error(`SendGrid send failed: ${errorBody}`);
        return {
          success: false,
          error: errorBody,
          errorCode: response.status.toString(),
        };
      }
    } catch (error) {
      this.logger.error(`SendGrid send error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendBatch(options: EmailSendOptions[]): Promise<EmailSendResult[]> {
    // SendGrid supports batch sending, but for simplicity we'll send individually
    return Promise.all(options.map(opt => this.send(opt)));
  }
}
