import { Logger } from '@nestjs/common';
import {
  IEmailProvider,
  EmailProviderConfig,
  EmailSendOptions,
  EmailSendResult,
} from './email-provider.interface';

/**
 * AWS SES Email Provider
 * Uses AWS SES API v2 to send emails
 */
export class AwsSesProvider implements IEmailProvider {
  readonly name = 'aws-ses';
  private readonly logger = new Logger(AwsSesProvider.name);
  private config: EmailProviderConfig | null = null;
  private ready = false;
  private region: string = 'us-east-1';
  private accessKeyId: string = '';
  private secretAccessKey: string = '';

  async initialize(config: EmailProviderConfig): Promise<void> {
    if (!config.apiKey || !config.apiSecret) {
      throw new Error('AWS access key ID and secret are required');
    }

    this.config = config;
    this.accessKeyId = config.apiKey;
    this.secretAccessKey = config.apiSecret;
    this.region = config.region || 'us-east-1';

    try {
      const verified = await this.verify();
      if (verified) {
        this.ready = true;
        this.logger.log(`AWS SES provider initialized in region: ${this.region}`);
      }
    } catch (error) {
      this.ready = false;
      this.logger.error(`AWS SES initialization failed: ${error.message}`);
      throw error;
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  async verify(): Promise<boolean> {
    // AWS SES verification would require AWS SDK
    // For now, we'll assume it's ready if credentials are provided
    return !!(this.accessKeyId && this.secretAccessKey);
  }

  async send(options: EmailSendOptions): Promise<EmailSendResult> {
    if (!this.isReady()) {
      return { success: false, error: 'AWS SES provider not initialized' };
    }

    try {
      const toAddresses = Array.isArray(options.to) ? options.to : [options.to];
      const fromAddress = options.from || this.config?.fromEmail;
      const fromName = options.fromName || this.config?.fromName || 'IRIS Sales CRM';

      if (!fromAddress) {
        return { success: false, error: 'From address is required' };
      }

      // Build the request payload for SES v2 API
      const payload = {
        FromEmailAddress: `${fromName} <${fromAddress}>`,
        Destination: {
          ToAddresses: toAddresses,
          CcAddresses: options.cc || [],
          BccAddresses: options.bcc || [],
        },
        Content: {
          Simple: {
            Subject: {
              Data: options.subject,
              Charset: 'UTF-8',
            },
            Body: {
              Html: {
                Data: options.html,
                Charset: 'UTF-8',
              },
              ...(options.text ? {
                Text: {
                  Data: options.text,
                  Charset: 'UTF-8',
                },
              } : {}),
            },
          },
        },
        ...(options.replyTo ? { ReplyToAddresses: [options.replyTo] } : {}),
        ...(options.tags?.length ? {
          EmailTags: options.tags.map(tag => ({ Name: 'tag', Value: tag })),
        } : {}),
      };

      // Generate AWS Signature v4 for the request
      const endpoint = `https://email.${this.region}.amazonaws.com/v2/email/outbound-emails`;
      const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
      const dateStamp = date.substring(0, 8);

      // Create the canonical request
      const signedHeaders = 'content-type;host;x-amz-date';
      const bodyHash = await this.sha256Hash(JSON.stringify(payload));
      const canonicalRequest = [
        'POST',
        '/v2/email/outbound-emails',
        '',
        `content-type:application/json`,
        `host:email.${this.region}.amazonaws.com`,
        `x-amz-date:${date}`,
        '',
        signedHeaders,
        bodyHash,
      ].join('\n');

      // Create string to sign
      const algorithm = 'AWS4-HMAC-SHA256';
      const credentialScope = `${dateStamp}/${this.region}/ses/aws4_request`;
      const stringToSign = [
        algorithm,
        date,
        credentialScope,
        await this.sha256Hash(canonicalRequest),
      ].join('\n');

      // Calculate signature
      const signingKey = await this.getSignatureKey(this.secretAccessKey, dateStamp, this.region, 'ses');
      const signature = await this.hmacHex(signingKey, stringToSign);

      // Create authorization header
      const authorization = `${algorithm} Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Amz-Date': date,
          'Authorization': authorization,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        const messageId = result.MessageId || `ses-${Date.now()}`;
        this.logger.debug(`Email sent via AWS SES: ${messageId}`);
        return {
          success: true,
          messageId,
          providerId: messageId,
        };
      } else {
        const errorBody = await response.text();
        this.logger.error(`AWS SES send failed: ${errorBody}`);
        return {
          success: false,
          error: errorBody,
          errorCode: response.status.toString(),
        };
      }
    } catch (error) {
      this.logger.error(`AWS SES send error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Helper methods for AWS Signature v4
  private async sha256Hash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async hmac(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
  }

  private async hmacHex(key: ArrayBuffer, data: string): Promise<string> {
    const result = await this.hmac(key, data);
    return Array.from(new Uint8Array(result))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async getSignatureKey(
    key: string,
    dateStamp: string,
    regionName: string,
    serviceName: string
  ): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const kDate = await this.hmac(encoder.encode('AWS4' + key).buffer as ArrayBuffer, dateStamp);
    const kRegion = await this.hmac(kDate, regionName);
    const kService = await this.hmac(kRegion, serviceName);
    return this.hmac(kService, 'aws4_request');
  }
}
