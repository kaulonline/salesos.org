import { Logger } from '@nestjs/common';
import {
  IEmailProvider,
  EmailProviderConfig,
  EmailSendOptions,
  EmailSendResult,
} from './email-provider.interface';

/**
 * Mailgun Email Provider
 * Uses Mailgun API to send emails
 */
export class MailgunProvider implements IEmailProvider {
  readonly name = 'mailgun';
  private readonly logger = new Logger(MailgunProvider.name);
  private config: EmailProviderConfig | null = null;
  private ready = false;
  private apiKey: string = '';
  private domain: string = '';
  private baseUrl: string = 'https://api.mailgun.net';

  async initialize(config: EmailProviderConfig): Promise<void> {
    if (!config.apiKey || !config.domain) {
      throw new Error('Mailgun API key and domain are required');
    }

    this.config = config;
    this.apiKey = config.apiKey;
    this.domain = config.domain;

    // Use EU endpoint if region is set to 'eu'
    if (config.region === 'eu') {
      this.baseUrl = 'https://api.eu.mailgun.net';
    }

    try {
      const verified = await this.verify();
      if (verified) {
        this.ready = true;
        this.logger.log(`Mailgun provider initialized for domain: ${this.domain}`);
      }
    } catch (error) {
      this.ready = false;
      this.logger.error(`Mailgun initialization failed: ${error.message}`);
      throw error;
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  async verify(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/v3/domains/${this.domain}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async send(options: EmailSendOptions): Promise<EmailSendResult> {
    if (!this.isReady()) {
      return { success: false, error: 'Mailgun provider not initialized' };
    }

    try {
      const toAddresses = Array.isArray(options.to) ? options.to.join(', ') : options.to;
      const fromAddress = options.from || this.config?.fromEmail;
      const fromName = options.fromName || this.config?.fromName || 'IRIS Sales CRM';

      if (!fromAddress) {
        return { success: false, error: 'From address is required' };
      }

      const formData = new FormData();
      formData.append('from', `${fromName} <${fromAddress}>`);
      formData.append('to', toAddresses);
      formData.append('subject', options.subject);
      formData.append('html', options.html);

      if (options.text) {
        formData.append('text', options.text);
      }

      if (options.cc?.length) {
        formData.append('cc', options.cc.join(', '));
      }

      if (options.bcc?.length) {
        formData.append('bcc', options.bcc.join(', '));
      }

      if (options.replyTo) {
        formData.append('h:Reply-To', options.replyTo);
      }

      // Add custom headers
      if (options.headers) {
        for (const [key, value] of Object.entries(options.headers)) {
          formData.append(`h:${key}`, value);
        }
      }

      // Add tags
      if (options.tags?.length) {
        options.tags.forEach(tag => formData.append('o:tag', tag));
      }

      // Add metadata
      if (options.metadata) {
        for (const [key, value] of Object.entries(options.metadata)) {
          formData.append(`v:${key}`, value);
        }
      }

      // Add attachments
      if (options.attachments?.length) {
        for (const att of options.attachments) {
          let content: BlobPart;
          if (typeof att.content === 'string') {
            content = att.content;
          } else if (Buffer.isBuffer(att.content)) {
            content = new Uint8Array(att.content);
          } else {
            content = att.content as BlobPart;
          }
          const blob = new Blob([content], { type: att.contentType || 'application/octet-stream' });
          if (att.cid) {
            formData.append('inline', blob, att.filename);
          } else {
            formData.append('attachment', blob, att.filename);
          }
        }
      }

      const response = await fetch(`${this.baseUrl}/v3/${this.domain}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`,
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        const messageId = result.id || `mg-${Date.now()}`;
        this.logger.debug(`Email sent via Mailgun: ${messageId}`);
        return {
          success: true,
          messageId,
          providerId: result.id,
        };
      } else {
        const errorBody = await response.text();
        this.logger.error(`Mailgun send failed: ${errorBody}`);
        return {
          success: false,
          error: errorBody,
          errorCode: response.status.toString(),
        };
      }
    } catch (error) {
      this.logger.error(`Mailgun send error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
