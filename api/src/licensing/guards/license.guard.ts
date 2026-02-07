// License Guard - Protects routes based on license and feature access
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LicensingService } from '../licensing.service';
import { OutcomeBillingService } from '../../outcome-billing/outcome-billing.service';
import { REQUIRE_LICENSE_KEY, REQUIRE_FEATURE_KEY } from '../decorators/license.decorator';

@Injectable()
export class LicenseGuard implements CanActivate {
  private readonly logger = new Logger(LicenseGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly licensingService: LicensingService,
    @Inject(forwardRef(() => OutcomeBillingService))
    private readonly outcomeBillingService: OutcomeBillingService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get metadata from decorators
    const requireLicense = this.reflector.getAllAndOverride<boolean>(REQUIRE_LICENSE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredFeatures = this.reflector.getAllAndOverride<string[]>(REQUIRE_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no license requirement specified, allow access
    if (!requireLicense && (!requiredFeatures || requiredFeatures.length === 0)) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      this.logger.warn('License check failed: No authenticated user');
      throw new ForbiddenException('Authentication required');
    }

    const userId = user.userId;

    // Check if user has an active license or outcome-based access
    if (requireLicense) {
      const license = await this.licensingService.getUserLicenseByUserId(userId);

      if (!license) {
        // Check if user has access through outcome-based billing
        const hasOutcomeAccess = await this.outcomeBillingService.userHasOutcomeBasedAccess(userId);

        if (hasOutcomeAccess) {
          this.logger.debug(`User ${userId} granted access via outcome billing plan`);
          // Mark as having outcome-based access
          request.outcomeBasedAccess = true;
        } else {
          this.logger.warn(`License check failed: User ${userId} has no active license or outcome billing plan`);
          throw new ForbiddenException({
            message: 'An active license is required to access this feature',
            code: 'LICENSE_REQUIRED',
          });
        }
      } else {
        // Attach license info to request for downstream use
        request.userLicense = license;
      }
    }

    // Check specific feature access
    if (requiredFeatures && requiredFeatures.length > 0) {
      // If user has outcome-based access, grant all features
      if (request.outcomeBasedAccess) {
        this.logger.debug(`User ${userId} granted all features via outcome billing plan`);
        const featureResults: Record<string, any> = {};
        for (const featureKey of requiredFeatures) {
          featureResults[featureKey] = {
            allowed: true,
            featureKey,
            reason: 'Granted via outcome billing plan',
          };
        }
        request.featureAccess = featureResults;
        return true;
      }

      const failedFeatures: string[] = [];
      const featureResults: Record<string, any> = {};

      for (const featureKey of requiredFeatures) {
        const result = await this.licensingService.checkFeatureAccess(userId, featureKey);
        featureResults[featureKey] = result;

        if (!result.allowed) {
          failedFeatures.push(featureKey);
          this.logger.warn(
            `Feature access denied: User ${userId} cannot access ${featureKey} - ${result.reason}`,
          );
        }
      }

      if (failedFeatures.length > 0) {
        // Check if user has outcome-based access as fallback
        const hasOutcomeAccess = await this.outcomeBillingService.userHasOutcomeBasedAccess(userId);
        if (hasOutcomeAccess) {
          this.logger.debug(`User ${userId} granted features via outcome billing (fallback)`);
          for (const featureKey of failedFeatures) {
            featureResults[featureKey] = {
              allowed: true,
              featureKey,
              reason: 'Granted via outcome billing plan',
            };
          }
          request.featureAccess = featureResults;
          request.outcomeBasedAccess = true;
          return true;
        }

        const firstFailure = featureResults[failedFeatures[0]];
        throw new ForbiddenException({
          message: firstFailure.reason || 'Feature access denied',
          code: 'FEATURE_ACCESS_DENIED',
          features: failedFeatures,
          details: featureResults,
        });
      }

      // Attach feature access info to request
      request.featureAccess = featureResults;
    }

    return true;
  }
}
