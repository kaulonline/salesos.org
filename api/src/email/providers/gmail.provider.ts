import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import {
  IEmailProvider,
  EmailProviderConfig,
  EmailSendOptions,
  EmailSendResult,
} from './email-provider.interface';

/**
 * Gmail/SMTP Email Provider
 * Uses nodemailer to send emails via Gmail or custom SMTP
 */
export class GmailProvider implements IEmailProvider {
  readonly name = 'gmail';
  private readonly logger = new Logger(GmailProvider.name);
  private transporter: Transporter | null = null;
  private config: EmailProviderConfig | null = null;
  private ready = false;

  async initialize(config: EmailProviderConfig): Promise<void> {
    this.config = config;

    if (config.provider === 'smtp' && config.host) {
      // Custom SMTP configuration
      this.transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port || 587,
        secure: config.secure ?? false,
        auth: {
          user: config.username,
          pass: config.password,
        },
      });
    } else {
      // Gmail configuration
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: config.username,
          pass: config.password,
        },
      });
    }

    try {
      await this.transporter.verify();
      this.ready = true;
      this.logger.log(`Gmail/SMTP provider initialized: ${config.username}`);
    } catch (error) {
      this.ready = false;
      this.logger.error(`Gmail/SMTP initialization failed: ${error.message}`);
      throw error;
    }
  }

  isReady(): boolean {
    return this.ready && this.transporter !== null;
  }

  async verify(): Promise<boolean> {
    if (!this.transporter) return false;
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }

  async send(options: EmailSendOptions): Promise<EmailSendResult> {
    if (!this.isReady()) {
      return { success: false, error: 'Gmail provider not initialized' };
    }

    try {
      const toAddresses = Array.isArray(options.to) ? options.to.join(', ') : options.to;
      const fromAddress = options.from || this.config?.fromEmail || this.config?.username;
      const fromName = options.fromName || this.config?.fromName || 'IRIS Sales CRM';

      const mailOptions: nodemailer.SendMailOptions = {
        from: `"${fromName}" <${fromAddress}>`,
        to: toAddresses,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      if (options.cc?.length) {
        mailOptions.cc = options.cc.join(', ');
      }

      if (options.bcc?.length) {
        mailOptions.bcc = options.bcc.join(', ');
      }

      if (options.replyTo) {
        mailOptions.replyTo = options.replyTo;
      }

      if (options.attachments?.length) {
        mailOptions.attachments = options.attachments.map(att => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
          encoding: att.encoding,
          cid: att.cid,
        }));
      }

      const info = await this.transporter!.sendMail(mailOptions);

      this.logger.debug(`Email sent via Gmail: ${info.messageId}`);
      return {
        success: true,
        messageId: info.messageId,
        providerId: info.messageId,
      };
    } catch (error) {
      this.logger.error(`Gmail send failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        errorCode: error.code,
      };
    }
  }
}
