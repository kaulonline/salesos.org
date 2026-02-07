import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { NotificationStatus, PushTokenType, DeviceType } from '@prisma/client';
import * as http2 from 'http2';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';

interface APNsPayload {
  aps: {
    alert: {
      title: string;
      body: string;
      subtitle?: string;
    };
    badge?: number;
    sound?: string;
    'thread-id'?: string;
    'content-available'?: number;
    'mutable-content'?: number;
    category?: string;
  };
  // Custom data
  [key: string]: any;
}

interface PushResult {
  success: boolean;
  deviceToken: string;
  apnsId?: string;
  error?: string;
  statusCode?: number;
}

@Injectable()
export class ApnsPushService implements OnModuleInit {
  private readonly logger = new Logger(ApnsPushService.name);
  private privateKey: string | null = null;
  private jwtToken: string | null = null;
  private jwtExpiresAt: number = 0;

  // APNs Configuration
  private readonly keyId: string;
  private readonly teamId: string;
  private readonly bundleId: string;
  private readonly isProduction: boolean;

  // APNs endpoints
  private readonly APNS_HOST_PRODUCTION = 'api.push.apple.com';
  private readonly APNS_HOST_SANDBOX = 'api.sandbox.push.apple.com';

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.keyId = this.configService.get<string>('APNS_KEY_ID') || 'QX9HLC9PRU';
    this.teamId = this.configService.get<string>('APNS_TEAM_ID') || '';
    this.bundleId = this.configService.get<string>('APNS_BUNDLE_ID') || 'com.iriseller.irisMobile';
    // Use explicit APNS_ENVIRONMENT for flexibility (sandbox for dev builds, production for App Store)
    const apnsEnv = this.configService.get<string>('APNS_ENVIRONMENT');
    this.isProduction = apnsEnv === 'production';
  }

  async onModuleInit() {
    await this.loadPrivateKey();
  }

  private async loadPrivateKey(): Promise<void> {
    try {
      // Try multiple possible locations for the key file
      const possiblePaths = [
        this.configService.get<string>('APNS_KEY_PATH'),
        path.join(process.cwd(), 'config', 'apns', `AuthKey_${this.keyId}.p8`),
        path.join(process.cwd(), '..', 'config', 'apns', `AuthKey_${this.keyId}.p8`),
        path.join(__dirname, '..', '..', 'config', 'apns', `AuthKey_${this.keyId}.p8`),
      ].filter(Boolean);

      for (const keyPath of possiblePaths) {
        if (keyPath && fs.existsSync(keyPath)) {
          this.privateKey = fs.readFileSync(keyPath, 'utf8');
          this.logger.log(`APNs private key loaded from: ${keyPath}`);
          return;
        }
      }

      this.logger.warn('APNs private key not found. Push notifications will be disabled.');
    } catch (error) {
      this.logger.error('Failed to load APNs private key:', error);
    }
  }

  private generateJWT(): string {
    const now = Math.floor(Date.now() / 1000);

    // JWT is valid for 1 hour, but we refresh it every 50 minutes
    if (this.jwtToken && this.jwtExpiresAt > now + 600) {
      return this.jwtToken;
    }

    if (!this.privateKey) {
      throw new Error('APNs private key not loaded');
    }

    if (!this.teamId) {
      throw new Error('APNS_TEAM_ID not configured');
    }

    this.jwtToken = jwt.sign(
      {
        iss: this.teamId,
        iat: now,
      },
      this.privateKey,
      {
        algorithm: 'ES256',
        header: {
          alg: 'ES256',
          kid: this.keyId,
        },
      },
    );

    this.jwtExpiresAt = now + 3600; // 1 hour
    this.logger.debug('Generated new APNs JWT token');

    return this.jwtToken;
  }

  private getAPNsHost(): string {
    return this.isProduction ? this.APNS_HOST_PRODUCTION : this.APNS_HOST_SANDBOX;
  }

  /**
   * Send a push notification to a single device
   */
  async sendToDevice(
    deviceToken: string,
    title: string,
    body: string,
    options: {
      subtitle?: string;
      badge?: number;
      sound?: string;
      threadId?: string;
      category?: string;
      data?: Record<string, any>;
      collapseId?: string;
      priority?: 'immediate' | 'normal';
      expiration?: number;
    } = {},
  ): Promise<PushResult> {
    if (!this.privateKey) {
      return {
        success: false,
        deviceToken,
        error: 'APNs not configured - private key missing',
      };
    }

    const payload: APNsPayload = {
      aps: {
        alert: {
          title,
          body,
          ...(options.subtitle && { subtitle: options.subtitle }),
        },
        ...(options.badge !== undefined && { badge: options.badge }),
        sound: options.sound || 'default',
        ...(options.threadId && { 'thread-id': options.threadId }),
        ...(options.category && { category: options.category }),
      },
      ...(options.data || {}),
    };

    return this.sendRawNotification(deviceToken, payload, options);
  }

  /**
   * Send a raw APNs notification
   */
  private sendRawNotification(
    deviceToken: string,
    payload: APNsPayload,
    options: {
      collapseId?: string;
      priority?: 'immediate' | 'normal';
      expiration?: number;
    } = {},
  ): Promise<PushResult> {
    return new Promise((resolve) => {
      try {
        const jwtToken = this.generateJWT();
        const host = this.getAPNsHost();
        const payloadString = JSON.stringify(payload);

        this.logger.warn(`Sending push to ${deviceToken.substring(0, 12)}... via ${host}`);
        this.logger.warn(`Payload: ${payloadString}`);

        const client = http2.connect(`https://${host}`);

        client.on('error', (err) => {
          this.logger.error(`APNs connection error: ${err.message}`);
          resolve({
            success: false,
            deviceToken,
            error: `Connection error: ${err.message}`,
          });
        });

        const headers = {
          ':method': 'POST',
          ':path': `/3/device/${deviceToken}`,
          'authorization': `bearer ${jwtToken}`,
          'apns-topic': this.bundleId,
          'apns-push-type': 'alert',
          'apns-priority': '10', // High priority for immediate delivery
          ...(options.collapseId && { 'apns-collapse-id': options.collapseId }),
          ...(options.expiration && { 'apns-expiration': options.expiration.toString() }),
        };

        const req = client.request(headers);

        let responseData = '';
        let statusCode = 0;
        let apnsId = '';

        req.on('response', (headers) => {
          statusCode = headers[':status'] as number;
          apnsId = headers['apns-id'] as string;
        });

        req.on('data', (chunk) => {
          responseData += chunk;
        });

        req.on('end', () => {
          client.close();

          if (statusCode === 200) {
            this.logger.warn(`Push sent successfully to ${deviceToken.substring(0, 8)}..., apnsId: ${apnsId}`);
            resolve({
              success: true,
              deviceToken,
              apnsId,
              statusCode,
            });
          } else {
            let errorReason = 'Unknown error';
            try {
              const errorBody = JSON.parse(responseData);
              errorReason = errorBody.reason || errorReason;
            } catch {
              // Ignore parse errors
            }

            this.logger.warn(`Push failed (${statusCode}): ${errorReason}`);
            resolve({
              success: false,
              deviceToken,
              error: errorReason,
              statusCode,
            });
          }
        });

        req.on('error', (err) => {
          client.close();
          this.logger.error(`Request error: ${err.message}`);
          resolve({
            success: false,
            deviceToken,
            error: `Request error: ${err.message}`,
          });
        });

        req.write(payloadString);
        req.end();
      } catch (error) {
        this.logger.error('Error sending push notification:', error);
        resolve({
          success: false,
          deviceToken,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });
  }

  /**
   * Send a push notification to a user (all their active iOS devices)
   */
  async sendToUser(
    userId: string,
    title: string,
    body: string,
    options: {
      subtitle?: string;
      badge?: number;
      sound?: string;
      threadId?: string;
      category?: string;
      data?: Record<string, any>;
      notificationId?: string;
    } = {},
  ): Promise<{ sent: number; failed: number; results: PushResult[] }> {
    // Get all active iOS devices with push tokens for this user
    const devices = await this.prisma.userDevice.findMany({
      where: {
        userId,
        isActive: true,
        pushEnabled: true,
        pushToken: { not: null },
        pushTokenType: PushTokenType.APNS,
        deviceType: { in: [DeviceType.MOBILE_IOS, DeviceType.TABLET_IPAD] },
      },
    });

    if (devices.length === 0) {
      this.logger.debug(`No active iOS devices found for user ${userId}`);
      return { sent: 0, failed: 0, results: [] };
    }

    const results: PushResult[] = [];
    let sent = 0;
    let failed = 0;

    for (const device of devices) {
      if (!device.pushToken) continue;

      const result = await this.sendToDevice(device.pushToken, title, body, options);
      results.push(result);

      if (result.success) {
        sent++;
      } else {
        failed++;

        // Handle invalid tokens
        if (result.error === 'BadDeviceToken' || result.error === 'Unregistered') {
          this.logger.warn(`Invalidating token for device ${device.id}`);
          await this.prisma.userDevice.update({
            where: { id: device.id },
            data: {
              pushToken: null,
              pushTokenUpdatedAt: new Date(),
            },
          });
        }
      }
    }

    // Update notification status if notificationId provided
    if (options.notificationId && sent > 0) {
      await this.prisma.pushNotification.update({
        where: { id: options.notificationId },
        data: {
          status: NotificationStatus.SENT,
          sentAt: new Date(),
        },
      });
    }

    return { sent, failed, results };
  }

  /**
   * Send a silent push notification (for background updates)
   */
  async sendSilentPush(
    deviceToken: string,
    data: Record<string, any>,
  ): Promise<PushResult> {
    if (!this.privateKey) {
      return {
        success: false,
        deviceToken,
        error: 'APNs not configured',
      };
    }

    const payload: APNsPayload = {
      aps: {
        alert: { title: '', body: '' },
        'content-available': 1,
      },
      ...data,
    };

    // Remove the empty alert for silent push
    delete (payload.aps as any).alert;
    payload.aps['content-available'] = 1;

    return this.sendRawNotification(deviceToken, payload, { priority: 'normal' });
  }

  /**
   * Get push notification status
   */
  getStatus(): {
    configured: boolean;
    keyId: string;
    teamId: string;
    bundleId: string;
    environment: string;
  } {
    return {
      configured: !!this.privateKey && !!this.teamId,
      keyId: this.keyId,
      teamId: this.teamId ? `${this.teamId.substring(0, 4)}****` : 'NOT SET',
      bundleId: this.bundleId,
      environment: this.isProduction ? 'production' : 'sandbox',
    };
  }
}
