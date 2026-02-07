import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PackageAuthRequest } from '../guards/package-auth.guard';

/**
 * Parameter decorator to get the authenticated Salesforce package user
 *
 * Usage:
 * @Get('profile')
 * @UseGuards(PackageUserAuthGuard)
 * async getProfile(@PackageUser() user: SalesforcePackageUser) {
 *   return user;
 * }
 */
export const PackageUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<PackageAuthRequest>();
    const user = request.packageUser;

    if (!user) {
      return null;
    }

    // If a specific property is requested, return just that
    if (data) {
      return user[data];
    }

    return user;
  },
);

/**
 * Parameter decorator to get the Salesforce package installation
 *
 * Usage:
 * @Get('config')
 * @UseGuards(PackageAuthGuard)
 * async getConfig(@PackageInstallation() installation: SalesforcePackageInstallation) {
 *   return installation;
 * }
 */
export const PackageInstallation = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<PackageAuthRequest>();
    const installation = request.packageInstallation;

    if (!installation) {
      return null;
    }

    // If a specific property is requested, return just that
    if (data) {
      return installation[data];
    }

    return installation;
  },
);
