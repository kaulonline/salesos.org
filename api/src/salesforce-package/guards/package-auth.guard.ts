import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { SalesforcePackageAuthService } from '../salesforce-package-auth.service';
import { PrismaService } from '../../database/prisma.service';

export interface PackageAuthRequest extends Request {
  packageInstallation?: any;
  packageUser?: any;
}

@Injectable()
export class PackageAuthGuard implements CanActivate {
  private readonly logger = new Logger(PackageAuthGuard.name);

  constructor(
    private readonly authService: SalesforcePackageAuthService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<PackageAuthRequest>();

    // Extract headers
    const authHeader = request.headers['authorization'] as string;
    const packageKey = request.headers['x-package-key'] as string;
    const orgId = request.headers['x-salesforce-org'] as string;

    // Validate package installation
    if (!packageKey || !orgId) {
      throw new UnauthorizedException('Missing package authentication headers');
    }

    const installation = await this.authService.validatePackageKey(packageKey, orgId);
    if (!installation) {
      throw new UnauthorizedException('Invalid package API key');
    }

    if (!installation.isActive) {
      throw new ForbiddenException('Package installation is inactive');
    }

    // Check rate limits
    await this.checkRateLimits(installation);

    // Attach installation to request
    request.packageInstallation = installation;

    // If user token provided, validate it
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const userToken = authHeader.substring(7);
      try {
        const user = await this.authService.getUserFromToken(userToken);
        request.packageUser = user;
      } catch (error) {
        // User token validation failed, but package key is valid
        // This is okay for some endpoints like /auth/token
        this.logger.debug('User token validation failed:', error.message);
      }
    }

    return true;
  }

  private async checkRateLimits(installation: any): Promise<void> {
    // Check if we need to reset daily counter
    const now = new Date();
    const lastReset = new Date(installation.lastResetDate);
    const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);

    if (hoursSinceReset >= 24) {
      // Reset daily counter
      await this.prisma.salesforcePackageInstallation.update({
        where: { id: installation.id },
        data: {
          apiCallsToday: 1,
          lastResetDate: now,
        },
      });
      return;
    }

    // Check if limit exceeded
    if (installation.apiCallsToday >= installation.apiCallLimit) {
      throw new ForbiddenException({
        error: 'Rate limit exceeded',
        limit: installation.apiCallLimit,
        remaining: 0,
        resetAt: new Date(lastReset.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    // Increment counter
    await this.prisma.salesforcePackageInstallation.update({
      where: { id: installation.id },
      data: {
        apiCallsToday: { increment: 1 },
        lastActivityAt: now,
      },
    });
  }
}

/**
 * Guard that requires a valid user token in addition to package key
 */
@Injectable()
export class PackageUserAuthGuard implements CanActivate {
  private readonly logger = new Logger(PackageUserAuthGuard.name);

  constructor(
    private readonly authService: SalesforcePackageAuthService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<PackageAuthRequest>();

    // Extract headers
    const packageKey = request.headers['x-package-key'] as string;
    const orgId = request.headers['x-salesforce-org'] as string;

    // Validate package installation first
    if (!packageKey || !orgId) {
      throw new UnauthorizedException('Missing package authentication headers');
    }

    const installation = await this.authService.validatePackageKey(packageKey, orgId);
    if (!installation) {
      throw new UnauthorizedException('Invalid package API key');
    }

    if (!installation.isActive) {
      throw new ForbiddenException('Package installation is inactive');
    }

    // Attach installation to request
    request.packageInstallation = installation;

    // Then, require user token
    const authHeader = request.headers['authorization'] as string;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('User access token required');
    }

    const userToken = authHeader.substring(7);
    const user = await this.authService.getUserFromToken(userToken);

    if (!user) {
      throw new UnauthorizedException('Invalid user token');
    }

    request.packageUser = user;
    return true;
  }
}
