// Gateway Configuration Service - Manages payment gateway settings
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PaymentGateway } from '@prisma/client';
import * as crypto from 'crypto';

// SECURITY: Require encryption key in production - no default fallback
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const IV_LENGTH = 16;

// Validate encryption key on module load
// Note: Logger not available at module load time, use process.stderr for critical startup warnings
if (!ENCRYPTION_KEY) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CRITICAL: ENCRYPTION_KEY environment variable is required in production for payment credential encryption');
  }
  // Use stderr for startup warnings - no sensitive data exposed here
  process.stderr.write('[GatewayConfigService] WARNING: ENCRYPTION_KEY not set - payment credential encryption will fail. Set this in production!\n');
}

function encrypt(text: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY not configured - cannot encrypt payment credentials');
  }
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  if (!ENCRYPTION_KEY) {
    // Use stderr for critical security errors - no sensitive data exposed
    process.stderr.write('[GatewayConfigService] ERROR: ENCRYPTION_KEY not configured - cannot decrypt payment credentials\n');
    return '';
  }
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return '';
  }
}

@Injectable()
export class GatewayConfigService {
  private readonly logger = new Logger(GatewayConfigService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getGatewayConfigs() {
    const configs = await this.prisma.paymentGatewayConfig.findMany({
      orderBy: { provider: 'asc' },
    });

    // Return configs without exposing secret keys
    return configs.map(config => ({
      ...config,
      secretKey: config.secretKey ? '••••••••' : null,
      webhookSecret: config.webhookSecret ? '••••••••' : null,
      hasSecretKey: !!config.secretKey,
      hasWebhookSecret: !!config.webhookSecret,
    }));
  }

  async getGatewayConfig(provider: PaymentGateway) {
    let config = await this.prisma.paymentGatewayConfig.findUnique({
      where: { provider },
    });

    if (!config) {
      // Create default config if it doesn't exist
      config = await this.prisma.paymentGatewayConfig.create({
        data: {
          provider,
          name: provider === 'STRIPE' ? 'Stripe' : 'Razorpay',
          isActive: false,
          testMode: true,
          supportedCurrencies: provider === 'STRIPE' ? ['USD', 'EUR', 'GBP'] : ['INR'],
          supportedCountries: provider === 'STRIPE' ? ['US', 'GB', 'EU'] : ['IN'],
          connectionStatus: 'untested',
        },
      });
    }

    return config;
  }

  async getDecryptedSecretKey(provider: PaymentGateway): Promise<string | null> {
    const config = await this.prisma.paymentGatewayConfig.findUnique({
      where: { provider },
    });

    if (!config?.secretKey) {
      // Fall back to environment variable
      if (provider === 'STRIPE') {
        return process.env.STRIPE_SECRET_KEY || null;
      } else {
        return process.env.RAZORPAY_KEY_SECRET || null;
      }
    }

    return decrypt(config.secretKey);
  }

  async getDecryptedWebhookSecret(provider: PaymentGateway): Promise<string | null> {
    const config = await this.prisma.paymentGatewayConfig.findUnique({
      where: { provider },
    });

    if (!config?.webhookSecret) {
      // Fall back to environment variable
      if (provider === 'STRIPE') {
        return process.env.STRIPE_WEBHOOK_SECRET || null;
      } else {
        return process.env.RAZORPAY_WEBHOOK_SECRET || null;
      }
    }

    return decrypt(config.webhookSecret);
  }

  async getPublicKey(provider: PaymentGateway): Promise<string | null> {
    const config = await this.prisma.paymentGatewayConfig.findUnique({
      where: { provider },
    });

    if (!config?.publicKey) {
      // Fall back to environment variable
      if (provider === 'STRIPE') {
        return process.env.STRIPE_PUBLISHABLE_KEY || null;
      } else {
        return process.env.RAZORPAY_KEY_ID || null;
      }
    }

    return config.publicKey;
  }

  async updateGatewayConfig(provider: PaymentGateway, data: {
    name?: string;
    isActive?: boolean;
    isDefault?: boolean;
    publicKey?: string;
    secretKey?: string;
    webhookSecret?: string;
    supportedCurrencies?: string[];
    supportedCountries?: string[];
    testMode?: boolean;
  }) {
    // If setting as default, unset other defaults
    if (data.isDefault) {
      await this.prisma.paymentGatewayConfig.updateMany({
        where: { provider: { not: provider } },
        data: { isDefault: false },
      });
    }

    // Encrypt secrets before storing
    const updateData: any = { ...data };
    if (data.secretKey && data.secretKey !== '••••••••') {
      updateData.secretKey = encrypt(data.secretKey);
    } else {
      delete updateData.secretKey;
    }
    if (data.webhookSecret && data.webhookSecret !== '••••••••') {
      updateData.webhookSecret = encrypt(data.webhookSecret);
    } else {
      delete updateData.webhookSecret;
    }

    const config = await this.prisma.paymentGatewayConfig.upsert({
      where: { provider },
      create: {
        provider,
        name: data.name || (provider === 'STRIPE' ? 'Stripe' : 'Razorpay'),
        isActive: data.isActive ?? false,
        isDefault: data.isDefault ?? false,
        publicKey: data.publicKey,
        secretKey: updateData.secretKey,
        webhookSecret: updateData.webhookSecret,
        supportedCurrencies: data.supportedCurrencies || (provider === 'STRIPE' ? ['USD'] : ['INR']),
        supportedCountries: data.supportedCountries || (provider === 'STRIPE' ? ['US'] : ['IN']),
        testMode: data.testMode ?? true,
        connectionStatus: 'untested',
      },
      update: updateData,
    });

    return {
      ...config,
      secretKey: config.secretKey ? '••••••••' : null,
      webhookSecret: config.webhookSecret ? '••••••••' : null,
      hasSecretKey: !!config.secretKey,
      hasWebhookSecret: !!config.webhookSecret,
    };
  }

  async testConnection(provider: PaymentGateway): Promise<{ success: boolean; message: string }> {
    const config = await this.getGatewayConfig(provider);
    const secretKey = await this.getDecryptedSecretKey(provider);

    if (!secretKey) {
      await this.updateConnectionStatus(provider, 'error');
      return { success: false, message: 'Secret key not configured' };
    }

    try {
      if (provider === 'STRIPE') {
        const Stripe = require('stripe');
        const stripe = new Stripe(secretKey);
        // Test by fetching account info
        await stripe.accounts.retrieve();
        await this.updateConnectionStatus(provider, 'connected');
        return { success: true, message: 'Successfully connected to Stripe' };
      } else if (provider === 'RAZORPAY') {
        const Razorpay = require('razorpay');
        const publicKey = await this.getPublicKey(provider);
        if (!publicKey) {
          await this.updateConnectionStatus(provider, 'error');
          return { success: false, message: 'Public key not configured' };
        }
        const razorpay = new Razorpay({
          key_id: publicKey,
          key_secret: secretKey,
        });
        // Test by fetching orders (will fail with empty result, not error)
        await razorpay.orders.all({ count: 1 });
        await this.updateConnectionStatus(provider, 'connected');
        return { success: true, message: 'Successfully connected to Razorpay' };
      }

      return { success: false, message: 'Unknown provider' };
    } catch (error: any) {
      this.logger.error(`Failed to connect to ${provider}:`, error);
      await this.updateConnectionStatus(provider, 'error');
      return {
        success: false,
        message: error.message || `Failed to connect to ${provider}`
      };
    }
  }

  private async updateConnectionStatus(provider: PaymentGateway, status: string) {
    await this.prisma.paymentGatewayConfig.update({
      where: { provider },
      data: {
        connectionStatus: status,
        lastTestedAt: new Date(),
      },
    });
  }

  async isGatewayActive(provider: PaymentGateway): Promise<boolean> {
    const config = await this.prisma.paymentGatewayConfig.findUnique({
      where: { provider },
    });
    return config?.isActive ?? false;
  }

  async getActiveGateway(): Promise<PaymentGateway | null> {
    const defaultGateway = await this.prisma.paymentGatewayConfig.findFirst({
      where: { isActive: true, isDefault: true },
    });

    if (defaultGateway) return defaultGateway.provider;

    const anyActive = await this.prisma.paymentGatewayConfig.findFirst({
      where: { isActive: true },
    });

    return anyActive?.provider || null;
  }
}
