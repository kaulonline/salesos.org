/**
 * Email Provider Interface
 * Defines the contract that all email providers must implement
 */

export interface EmailSendOptions {
  to: string | string[];
  from?: string;
  fromName?: string;
  subject: string;
  html: string;
  text?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  headers?: Record<string, string>;
  attachments?: EmailAttachment[];
  tags?: string[];
  metadata?: Record<string, string>;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  encoding?: 'base64' | 'utf-8';
  cid?: string; // Content-ID for inline images
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  providerId?: string; // Provider-specific ID
  error?: string;
  errorCode?: string;
}

export interface EmailProviderConfig {
  provider: 'gmail' | 'sendgrid' | 'aws-ses' | 'mailgun' | 'postmark' | 'smtp';
  apiKey?: string;
  apiSecret?: string;
  username?: string;
  password?: string;
  region?: string;
  domain?: string;
  host?: string;
  port?: number;
  secure?: boolean;
  fromEmail?: string;
  fromName?: string;
}

export interface IEmailProvider {
  /**
   * Provider name for logging and identification
   */
  readonly name: string;

  /**
   * Initialize the provider with configuration
   */
  initialize(config: EmailProviderConfig): Promise<void>;

  /**
   * Check if the provider is properly configured and ready
   */
  isReady(): boolean;

  /**
   * Verify the connection/credentials
   */
  verify(): Promise<boolean>;

  /**
   * Send an email
   */
  send(options: EmailSendOptions): Promise<EmailSendResult>;

  /**
   * Send multiple emails (batch send if supported)
   */
  sendBatch?(options: EmailSendOptions[]): Promise<EmailSendResult[]>;
}
