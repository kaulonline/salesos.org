import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { GetUserTokenDto, TokenResponseDto, ValidateTokenResponseDto } from './dto/package-auth.dto';
import { RegisterInstallationDto, RegisterInstallationResponseDto } from './dto/register-installation.dto';

@Injectable()
export class SalesforcePackageAuthService {
  private readonly logger = new Logger(SalesforcePackageAuthService.name);
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: number = 3600; // 1 hour in seconds
  private readonly refreshTokenExpiresIn: number = 30 * 24 * 60 * 60; // 30 days in seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.jwtSecret = this.config.get<string>('JWT_SECRET') || 'iris-salesforce-package-secret';
  }

  /**
   * Generate a secure random string for API keys
   */
  private generateApiKey(): string {
    return `iris_pkg_${crypto.randomBytes(32).toString('hex')}`;
  }

  /**
   * Generate a secure random string for secrets
   */
  private generateSecret(): string {
    return crypto.randomBytes(48).toString('base64url');
  }

  /**
   * Encrypt sensitive data using AES-256-GCM
   */
  private encrypt(plaintext: string): string {
    const key = crypto.scryptSync(this.jwtSecret, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt sensitive data
   */
  private decrypt(ciphertext: string): string {
    const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':');

    const key = crypto.scryptSync(this.jwtSecret, 'salt', 32);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  }

  /**
   * Register a new Salesforce org installation
   */
  async registerInstallation(dto: RegisterInstallationDto): Promise<RegisterInstallationResponseDto> {
    this.logger.log(`Registering Salesforce package installation for org: ${dto.orgId}`);

    // Check if org already registered
    const existing = await this.prisma.salesforcePackageInstallation.findUnique({
      where: { orgId: dto.orgId },
    });

    if (existing && existing.isActive) {
      throw new ConflictException('Organization is already registered. Contact support to reset.');
    }

    // Generate credentials
    const packageApiKey = this.generateApiKey();
    const packageSecret = this.generateSecret();

    // If existing but inactive, reactivate
    if (existing) {
      const updated = await this.prisma.salesforcePackageInstallation.update({
        where: { id: existing.id },
        data: {
          orgName: dto.orgName,
          instanceUrl: dto.instanceUrl,
          adminEmail: dto.adminEmail,
          packageApiKey: this.encrypt(packageApiKey),
          packageSecret: this.encrypt(packageSecret),
          isActive: true,
          apiCallsToday: 0,
          lastResetDate: new Date(),
          salesforceVersion: dto.salesforceVersion,
          packageVersion: dto.packageVersion,
          updatedAt: new Date(),
        },
      });

      return {
        success: true,
        installation: {
          id: updated.id,
          orgId: updated.orgId,
          packageApiKey,
          packageSecret,
          apiCallLimit: updated.apiCallLimit,
        },
        message: 'Installation reactivated successfully',
      };
    }

    // Create new installation
    const installation = await this.prisma.salesforcePackageInstallation.create({
      data: {
        orgId: dto.orgId,
        orgName: dto.orgName,
        instanceUrl: dto.instanceUrl,
        adminEmail: dto.adminEmail,
        packageApiKey: this.encrypt(packageApiKey),
        packageSecret: this.encrypt(packageSecret),
        isActive: true,
        features: ['ai_chat', 'document_search', 'web_research'],
        apiCallLimit: 10000, // Default daily limit
        salesforceVersion: dto.salesforceVersion,
        packageVersion: dto.packageVersion,
      },
    });

    this.logger.log(`Installation created: ${installation.id} for org: ${dto.orgId}`);

    return {
      success: true,
      installation: {
        id: installation.id,
        orgId: installation.orgId,
        packageApiKey,
        packageSecret,
        apiCallLimit: installation.apiCallLimit,
      },
      message: 'Installation registered successfully',
    };
  }

  /**
   * Reconnect an existing Salesforce org installation (regenerate credentials)
   */
  async reconnectInstallation(dto: RegisterInstallationDto): Promise<RegisterInstallationResponseDto> {
    this.logger.log(`Reconnecting Salesforce package installation for org: ${dto.orgId}`);

    // Find existing installation
    const existing = await this.prisma.salesforcePackageInstallation.findUnique({
      where: { orgId: dto.orgId },
    });

    if (!existing) {
      // No existing installation - just register normally
      return this.registerInstallation(dto);
    }

    // Generate new credentials
    const packageApiKey = this.generateApiKey();
    const packageSecret = this.generateSecret();

    // Update installation with new credentials
    const updated = await this.prisma.salesforcePackageInstallation.update({
      where: { id: existing.id },
      data: {
        orgName: dto.orgName,
        instanceUrl: dto.instanceUrl,
        adminEmail: dto.adminEmail,
        packageApiKey: this.encrypt(packageApiKey),
        packageSecret: this.encrypt(packageSecret),
        isActive: true,
        apiCallsToday: 0,
        lastResetDate: new Date(),
        salesforceVersion: dto.salesforceVersion,
        packageVersion: dto.packageVersion,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Installation reconnected: ${updated.id} for org: ${dto.orgId}`);

    return {
      success: true,
      installation: {
        id: updated.id,
        orgId: updated.orgId,
        packageApiKey,
        packageSecret,
        apiCallLimit: updated.apiCallLimit,
      },
      message: 'Installation reconnected successfully',
    };
  }

  /**
   * Validate package API key and get installation
   */
  async validatePackageKey(packageApiKey: string, orgId: string): Promise<any> {
    const installations = await this.prisma.salesforcePackageInstallation.findMany({
      where: { orgId, isActive: true },
    });

    for (const installation of installations) {
      try {
        const decryptedKey = this.decrypt(installation.packageApiKey);
        if (decryptedKey === packageApiKey) {
          return installation;
        }
      } catch (error) {
        // Decryption failed, try next
        continue;
      }
    }

    return null;
  }

  /**
   * Get or create user token for Salesforce package user
   */
  async getUserToken(
    installation: any,
    dto: GetUserTokenDto,
  ): Promise<TokenResponseDto> {
    this.logger.log(`Getting token for Salesforce user: ${dto.salesforceUserId}`);

    // Find or create package user
    let packageUser = await this.prisma.salesforcePackageUser.findUnique({
      where: {
        installationId_salesforceUserId: {
          installationId: installation.id,
          salesforceUserId: dto.salesforceUserId,
        },
      },
    });

    const refreshToken = this.generateSecret();
    const tokenExpiresAt = new Date(Date.now() + this.jwtExpiresIn * 1000);

    if (!packageUser) {
      // Create new user
      packageUser = await this.prisma.salesforcePackageUser.create({
        data: {
          installationId: installation.id,
          salesforceUserId: dto.salesforceUserId,
          email: dto.email,
          name: dto.name,
          accessToken: '', // Will be updated below
          refreshToken: this.encrypt(refreshToken),
          tokenExpiresAt,
          preferences: dto.metadata || {},
        },
      });
    } else {
      // Update existing user
      packageUser = await this.prisma.salesforcePackageUser.update({
        where: { id: packageUser.id },
        data: {
          email: dto.email,
          name: dto.name,
          refreshToken: this.encrypt(refreshToken),
          tokenExpiresAt,
          lastActiveAt: new Date(),
          preferences: (dto.metadata || packageUser.preferences) as any,
        },
      });
    }

    // Generate JWT access token
    const accessToken = jwt.sign(
      {
        userId: packageUser.id,
        salesforceUserId: packageUser.salesforceUserId,
        orgId: installation.orgId,
        installationId: installation.id,
        type: 'salesforce_package',
      },
      this.jwtSecret,
      { expiresIn: this.jwtExpiresIn },
    );

    // Store encrypted access token
    await this.prisma.salesforcePackageUser.update({
      where: { id: packageUser.id },
      data: { accessToken: this.encrypt(accessToken) },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: this.jwtExpiresIn,
      token_type: 'Bearer',
      user: {
        id: packageUser.id,
        salesforceUserId: packageUser.salesforceUserId,
        email: packageUser.email,
        name: packageUser.name,
      },
    };
  }

  /**
   * Refresh an expired access token
   */
  async refreshUserToken(
    installation: any,
    refreshToken: string,
  ): Promise<{ access_token: string; expires_in: number; token_type: 'Bearer' }> {
    // Find user by refresh token
    const users = await this.prisma.salesforcePackageUser.findMany({
      where: { installationId: installation.id },
    });

    let matchedUser: typeof users[number] | null = null;
    for (const user of users) {
      try {
        const decryptedToken = this.decrypt(user.refreshToken);
        if (decryptedToken === refreshToken) {
          matchedUser = user;
          break;
        }
      } catch (error) {
        continue;
      }
    }

    if (!matchedUser) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Generate new access token
    const accessToken = jwt.sign(
      {
        userId: matchedUser.id,
        salesforceUserId: matchedUser.salesforceUserId,
        orgId: installation.orgId,
        installationId: installation.id,
        type: 'salesforce_package',
      },
      this.jwtSecret,
      { expiresIn: this.jwtExpiresIn },
    );

    // Update user
    await this.prisma.salesforcePackageUser.update({
      where: { id: matchedUser.id },
      data: {
        accessToken: this.encrypt(accessToken),
        tokenExpiresAt: new Date(Date.now() + this.jwtExpiresIn * 1000),
        lastActiveAt: new Date(),
      },
    });

    return {
      access_token: accessToken,
      expires_in: this.jwtExpiresIn,
      token_type: 'Bearer',
    };
  }

  /**
   * Validate a user access token
   */
  async validateUserToken(
    accessToken: string,
    installation: any,
  ): Promise<ValidateTokenResponseDto> {
    try {
      const decoded = jwt.verify(accessToken, this.jwtSecret) as any;

      if (decoded.type !== 'salesforce_package' || decoded.installationId !== installation.id) {
        return { valid: false };
      }

      const user = await this.prisma.salesforcePackageUser.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        return { valid: false };
      }

      return {
        valid: true,
        user: {
          id: user.id,
          salesforceUserId: user.salesforceUserId,
          email: user.email,
          name: user.name,
        },
        expiresAt: new Date(decoded.exp * 1000).toISOString(),
      };
    } catch (error) {
      return { valid: false };
    }
  }

  /**
   * Decode and validate JWT token, returning user info
   */
  async getUserFromToken(accessToken: string): Promise<any> {
    try {
      const decoded = jwt.verify(accessToken, this.jwtSecret) as any;

      if (decoded.type !== 'salesforce_package') {
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.prisma.salesforcePackageUser.findUnique({
        where: { id: decoded.userId },
        include: { installation: true },
      });

      if (!user || !user.installation.isActive) {
        throw new UnauthorizedException('User or installation not found');
      }

      return {
        ...user,
        orgId: decoded.orgId,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException('Invalid token');
      }
      throw error;
    }
  }
}
