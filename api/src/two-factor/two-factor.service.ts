import { Injectable, BadRequestException, NotFoundException, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);
  private readonly APP_NAME = 'SalesOS';

  constructor(private prisma: PrismaService) {}

  async getStatus(userId: string) {
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
      include: {
        trustedDevices: {
          select: {
            id: true,
            deviceName: true,
            deviceType: true,
            lastUsedAt: true,
          },
        },
      },
    });

    if (!twoFactorAuth) {
      return {
        enabled: false,
        enabledAt: null,
        backupCodesRemaining: 0,
        trustedDevicesCount: 0,
      };
    }

    const backupCodesRemaining = twoFactorAuth.backupCodes.length - twoFactorAuth.backupCodesUsed;

    return {
      enabled: twoFactorAuth.isEnabled,
      enabledAt: twoFactorAuth.enabledAt,
      backupCodesRemaining,
      trustedDevicesCount: twoFactorAuth.trustedDevices.length,
    };
  }

  async setup(userId: string) {
    // Check if 2FA already enabled
    const existing = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (existing?.isEnabled) {
      throw new BadRequestException('Two-factor authentication is already enabled');
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `${this.APP_NAME}`,
      issuer: this.APP_NAME,
      length: 32,
    });

    // Generate backup codes
    const backupCodes = this.generateBackupCodes(10);

    // Generate QR code
    if (!secret.otpauth_url) {
      throw new BadRequestException('Failed to generate OTP auth URL');
    }
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Store or update the 2FA record (not enabled yet)
    await this.prisma.twoFactorAuth.upsert({
      where: { userId },
      update: {
        secret: this.encryptSecret(secret.base32),
        backupCodes: backupCodes.map(code => this.hashBackupCode(code)),
        backupCodesUsed: 0,
        isEnabled: false,
      },
      create: {
        userId,
        secret: this.encryptSecret(secret.base32),
        backupCodes: backupCodes.map(code => this.hashBackupCode(code)),
        isEnabled: false,
      },
    });

    return {
      qrCode: qrCodeUrl,
      secret: secret.base32,
      backupCodes,
    };
  }

  async verifySetup(userId: string, code: string) {
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactorAuth) {
      throw new NotFoundException('Two-factor setup not initiated');
    }

    if (twoFactorAuth.isEnabled) {
      throw new BadRequestException('Two-factor authentication is already enabled');
    }

    const secret = this.decryptSecret(twoFactorAuth.secret);
    const isValid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    // Enable 2FA
    await this.prisma.twoFactorAuth.update({
      where: { userId },
      data: {
        isEnabled: true,
        enabledAt: new Date(),
        lastVerifiedAt: new Date(),
      },
    });

    return { success: true, message: 'Two-factor authentication enabled successfully' };
  }

  async verify(userId: string, code: string) {
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactorAuth || !twoFactorAuth.isEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    // Check if locked
    if (twoFactorAuth.lockedUntil && twoFactorAuth.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account is temporarily locked. Please try again later.');
    }

    const secret = this.decryptSecret(twoFactorAuth.secret);
    const isValid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (!isValid) {
      // Check backup codes
      const backupCodeValid = await this.verifyBackupCode(userId, code);
      if (!backupCodeValid) {
        await this.handleFailedAttempt(userId, twoFactorAuth.failedAttempts);
        throw new UnauthorizedException('Invalid verification code');
      }
    }

    // Reset failed attempts
    await this.prisma.twoFactorAuth.update({
      where: { userId },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
        lastVerifiedAt: new Date(),
      },
    });

    return { success: true };
  }

  async disable(userId: string, password: string) {
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactorAuth || !twoFactorAuth.isEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    // Note: Password verification should be done in the controller
    // using the auth service

    await this.prisma.twoFactorAuth.update({
      where: { userId },
      data: {
        isEnabled: false,
        secret: '',
        backupCodes: [],
        backupCodesUsed: 0,
      },
    });

    // Remove all trusted devices
    await this.prisma.trustedDevice.deleteMany({
      where: { twoFactorAuthId: twoFactorAuth.id },
    });

    return { success: true, message: 'Two-factor authentication disabled' };
  }

  async getBackupCodes(userId: string) {
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactorAuth || !twoFactorAuth.isEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    // Return masked backup codes with usage status
    return {
      totalCodes: twoFactorAuth.backupCodes.length,
      usedCodes: twoFactorAuth.backupCodesUsed,
      remainingCodes: twoFactorAuth.backupCodes.length - twoFactorAuth.backupCodesUsed,
    };
  }

  async regenerateBackupCodes(userId: string) {
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactorAuth || !twoFactorAuth.isEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    const newCodes = this.generateBackupCodes(10);

    await this.prisma.twoFactorAuth.update({
      where: { userId },
      data: {
        backupCodes: newCodes.map(code => this.hashBackupCode(code)),
        backupCodesUsed: 0,
      },
    });

    return { backupCodes: newCodes };
  }

  async getTrustedDevices(userId: string) {
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactorAuth) {
      return [];
    }

    return this.prisma.trustedDevice.findMany({
      where: { twoFactorAuthId: twoFactorAuth.id },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  async addTrustedDevice(
    userId: string,
    deviceInfo: {
      deviceName: string;
      deviceType: string;
      browserInfo?: string;
      ipAddress?: string;
      location?: string;
      deviceFingerprint: string;
    },
  ) {
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactorAuth || !twoFactorAuth.isEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // Trust for 30 days

    return this.prisma.trustedDevice.upsert({
      where: {
        twoFactorAuthId_deviceFingerprint: {
          twoFactorAuthId: twoFactorAuth.id,
          deviceFingerprint: deviceInfo.deviceFingerprint,
        },
      },
      update: {
        ...deviceInfo,
        lastUsedAt: new Date(),
        expiresAt,
      },
      create: {
        twoFactorAuthId: twoFactorAuth.id,
        ...deviceInfo,
        expiresAt,
      },
    });
  }

  async removeTrustedDevice(userId: string, deviceId: string) {
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactorAuth) {
      throw new NotFoundException('Two-factor authentication not found');
    }

    const device = await this.prisma.trustedDevice.findFirst({
      where: {
        id: deviceId,
        twoFactorAuthId: twoFactorAuth.id,
      },
    });

    if (!device) {
      throw new NotFoundException('Trusted device not found');
    }

    await this.prisma.trustedDevice.delete({
      where: { id: deviceId },
    });

    return { success: true };
  }

  async removeAllTrustedDevices(userId: string) {
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactorAuth) {
      throw new NotFoundException('Two-factor authentication not found');
    }

    await this.prisma.trustedDevice.deleteMany({
      where: { twoFactorAuthId: twoFactorAuth.id },
    });

    return { success: true };
  }

  async isTrustedDevice(userId: string, deviceFingerprint: string): Promise<boolean> {
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactorAuth || !twoFactorAuth.isEnabled) {
      return true; // No 2FA, device is "trusted"
    }

    const device = await this.prisma.trustedDevice.findFirst({
      where: {
        twoFactorAuthId: twoFactorAuth.id,
        deviceFingerprint,
        expiresAt: { gt: new Date() },
      },
    });

    if (device) {
      // Update last used
      await this.prisma.trustedDevice.update({
        where: { id: device.id },
        data: { lastUsedAt: new Date() },
      });
      return true;
    }

    return false;
  }

  // Private helper methods
  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }
    return codes;
  }

  private hashBackupCode(code: string): string {
    return crypto.createHash('sha256').update(code.replace('-', '')).digest('hex');
  }

  private async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactorAuth) return false;

    const hashedCode = this.hashBackupCode(code);
    const codeIndex = twoFactorAuth.backupCodes.indexOf(hashedCode);

    if (codeIndex === -1) return false;

    // Mark code as used by removing it
    const updatedCodes = [...twoFactorAuth.backupCodes];
    updatedCodes.splice(codeIndex, 1);

    await this.prisma.twoFactorAuth.update({
      where: { userId },
      data: {
        backupCodes: updatedCodes,
        backupCodesUsed: twoFactorAuth.backupCodesUsed + 1,
        lastBackupCodeUsedAt: new Date(),
      },
    });

    return true;
  }

  private async handleFailedAttempt(userId: string, currentAttempts: number) {
    const newAttempts = currentAttempts + 1;
    let lockedUntil: Date | null = null;

    if (newAttempts >= 5) {
      lockedUntil = new Date();
      lockedUntil.setMinutes(lockedUntil.getMinutes() + 15);
    }

    await this.prisma.twoFactorAuth.update({
      where: { userId },
      data: {
        failedAttempts: newAttempts,
        lockedUntil,
      },
    });
  }

  private encryptSecret(secret: string): string {
    // SECURITY: Require encryption key in production
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('CRITICAL: ENCRYPTION_KEY required for 2FA secret encryption in production');
      }
      this.logger.warn('ENCRYPTION_KEY not set - using dev fallback for 2FA encryption');
    }
    const encryptionKey = key || 'dev-only-key-not-for-production!';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey.slice(0, 32).padEnd(32, '0')), iv);
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decryptSecret(encryptedSecret: string): string {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      if (process.env.NODE_ENV === 'production') {
        this.logger.error('ENCRYPTION_KEY not configured - cannot decrypt 2FA secret');
        throw new Error('2FA configuration error');
      }
    }
    const encryptionKey = key || 'dev-only-key-not-for-production!';
    const parts = encryptedSecret.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encryptionKey.slice(0, 32).padEnd(32, '0')), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
