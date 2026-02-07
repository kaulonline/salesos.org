import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IEmailProvider,
  EmailProviderConfig,
  EmailSendOptions,
  EmailSendResult,
} from './email-provider.interface';
import { GmailProvider } from './gmail.provider';
import { SendGridProvider } from './sendgrid.provider';
import { AwsSesProvider } from './aws-ses.provider';
import { MailgunProvider } from './mailgun.provider';

export type EmailProviderType = 'gmail' | 'sendgrid' | 'aws-ses' | 'mailgun' | 'smtp';

interface ProviderWithPriority {
  provider: IEmailProvider;
  priority: number;
  name: string;
}

/**
 * Email Provider Factory
 * Manages multiple email providers with automatic failover
 */
@Injectable()
export class EmailProviderFactory implements OnModuleInit {
  private readonly logger = new Logger(EmailProviderFactory.name);
  private providers: ProviderWithPriority[] = [];
  private primaryProvider: IEmailProvider | null = null;
  private isInitialized = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeProviders();
  }

  /**
   * Initialize all configured providers
   */
  private async initializeProviders(): Promise<void> {
    const configuredProviders: Array<{ type: EmailProviderType; config: EmailProviderConfig; priority: number }> = [];

    // Check for Gmail/SMTP configuration
    const gmailUser = this.configService.get<string>('GMAIL_USER');
    const gmailPassword = this.configService.get<string>('GMAIL_APP_PASSWORD');
    if (gmailUser && gmailPassword) {
      configuredProviders.push({
        type: 'gmail',
        config: {
          provider: 'gmail',
          username: gmailUser,
          password: gmailPassword,
          fromEmail: gmailUser,
          fromName: this.configService.get<string>('EMAIL_FROM_NAME') || 'IRIS Sales CRM',
        },
        priority: 1,
      });
    }

    // Check for SendGrid configuration
    const sendgridKey = this.configService.get<string>('SENDGRID_API_KEY');
    if (sendgridKey) {
      configuredProviders.push({
        type: 'sendgrid',
        config: {
          provider: 'sendgrid',
          apiKey: sendgridKey,
          fromEmail: this.configService.get<string>('SENDGRID_FROM_EMAIL') || this.configService.get<string>('EMAIL_FROM'),
          fromName: this.configService.get<string>('EMAIL_FROM_NAME') || 'IRIS Sales CRM',
        },
        priority: 2,
      });
    }

    // Check for AWS SES configuration
    const awsAccessKey = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const awsSecretKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    const awsSesRegion = this.configService.get<string>('AWS_SES_REGION');
    if (awsAccessKey && awsSecretKey) {
      configuredProviders.push({
        type: 'aws-ses',
        config: {
          provider: 'aws-ses',
          apiKey: awsAccessKey,
          apiSecret: awsSecretKey,
          region: awsSesRegion || 'us-east-1',
          fromEmail: this.configService.get<string>('AWS_SES_FROM_EMAIL') || this.configService.get<string>('EMAIL_FROM'),
          fromName: this.configService.get<string>('EMAIL_FROM_NAME') || 'IRIS Sales CRM',
        },
        priority: 3,
      });
    }

    // Check for Mailgun configuration
    const mailgunKey = this.configService.get<string>('MAILGUN_API_KEY');
    const mailgunDomain = this.configService.get<string>('MAILGUN_DOMAIN');
    if (mailgunKey && mailgunDomain) {
      configuredProviders.push({
        type: 'mailgun',
        config: {
          provider: 'mailgun',
          apiKey: mailgunKey,
          domain: mailgunDomain,
          region: this.configService.get<string>('MAILGUN_REGION'),
          fromEmail: this.configService.get<string>('MAILGUN_FROM_EMAIL') || this.configService.get<string>('EMAIL_FROM'),
          fromName: this.configService.get<string>('EMAIL_FROM_NAME') || 'IRIS Sales CRM',
        },
        priority: 4,
      });
    }

    // Check for custom SMTP configuration
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPassword = this.configService.get<string>('SMTP_PASSWORD');
    if (smtpHost && smtpUser && smtpPassword) {
      configuredProviders.push({
        type: 'smtp',
        config: {
          provider: 'smtp',
          host: smtpHost,
          port: parseInt(this.configService.get<string>('SMTP_PORT') || '587'),
          secure: this.configService.get<string>('SMTP_SECURE') === 'true',
          username: smtpUser,
          password: smtpPassword,
          fromEmail: this.configService.get<string>('SMTP_FROM_EMAIL') || smtpUser,
          fromName: this.configService.get<string>('EMAIL_FROM_NAME') || 'IRIS Sales CRM',
        },
        priority: 5,
      });
    }

    // Sort by priority (lower number = higher priority)
    configuredProviders.sort((a, b) => a.priority - b.priority);

    // Initialize each provider
    for (const { type, config, priority } of configuredProviders) {
      try {
        const provider = this.createProvider(type);
        await provider.initialize(config);

        if (provider.isReady()) {
          this.providers.push({ provider, priority, name: type });
          this.logger.log(`Email provider initialized: ${type} (priority: ${priority})`);

          if (!this.primaryProvider) {
            this.primaryProvider = provider;
            this.logger.log(`Primary email provider set to: ${type}`);
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to initialize ${type} provider: ${error.message}`);
      }
    }

    if (this.providers.length === 0) {
      this.logger.warn('No email providers configured - email sending will be disabled');
    } else {
      this.logger.log(`Email provider factory initialized with ${this.providers.length} provider(s)`);
    }

    this.isInitialized = true;
  }

  /**
   * Create a provider instance by type
   */
  private createProvider(type: EmailProviderType): IEmailProvider {
    switch (type) {
      case 'gmail':
      case 'smtp':
        return new GmailProvider();
      case 'sendgrid':
        return new SendGridProvider();
      case 'aws-ses':
        return new AwsSesProvider();
      case 'mailgun':
        return new MailgunProvider();
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }

  /**
   * Check if any provider is ready
   */
  isReady(): boolean {
    return this.providers.some(p => p.provider.isReady());
  }

  /**
   * Get the primary (highest priority) provider
   */
  getPrimaryProvider(): IEmailProvider | null {
    return this.primaryProvider;
  }

  /**
   * Get all available providers
   */
  getAvailableProviders(): string[] {
    return this.providers.filter(p => p.provider.isReady()).map(p => p.name);
  }

  /**
   * Send an email with automatic failover
   */
  async send(options: EmailSendOptions): Promise<EmailSendResult> {
    if (!this.isReady()) {
      return { success: false, error: 'No email providers available' };
    }

    // Try each provider in priority order
    for (const { provider, name } of this.providers) {
      if (!provider.isReady()) continue;

      try {
        const result = await provider.send(options);
        if (result.success) {
          return { ...result, providerId: `${name}:${result.providerId || result.messageId}` };
        }

        this.logger.warn(`Provider ${name} failed, trying next: ${result.error}`);
      } catch (error) {
        this.logger.warn(`Provider ${name} threw error, trying next: ${error.message}`);
      }
    }

    return { success: false, error: 'All email providers failed' };
  }

  /**
   * Send an email using a specific provider
   */
  async sendWithProvider(providerName: EmailProviderType, options: EmailSendOptions): Promise<EmailSendResult> {
    const providerEntry = this.providers.find(p => p.name === providerName);

    if (!providerEntry) {
      return { success: false, error: `Provider ${providerName} not available` };
    }

    if (!providerEntry.provider.isReady()) {
      return { success: false, error: `Provider ${providerName} not ready` };
    }

    return providerEntry.provider.send(options);
  }

  /**
   * Send multiple emails (uses batch if provider supports it)
   */
  async sendBatch(options: EmailSendOptions[]): Promise<EmailSendResult[]> {
    if (!this.primaryProvider?.isReady()) {
      return options.map(() => ({ success: false, error: 'No email provider available' }));
    }

    if (this.primaryProvider.sendBatch) {
      return this.primaryProvider.sendBatch(options);
    }

    // Fall back to individual sends
    return Promise.all(options.map(opt => this.send(opt)));
  }

  /**
   * Get provider health status
   */
  async getHealthStatus(): Promise<Record<string, { ready: boolean; verified: boolean }>> {
    const status: Record<string, { ready: boolean; verified: boolean }> = {};

    for (const { provider, name } of this.providers) {
      status[name] = {
        ready: provider.isReady(),
        verified: await provider.verify(),
      };
    }

    return status;
  }
}
