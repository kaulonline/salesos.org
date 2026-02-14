import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  SetMetadata,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { FeatureVisibilityService } from './feature-visibility.service';

// Role-based access control
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!roles) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    return roles.includes(user?.role);
  }
}
import {
  CreateVisibilityRuleDto,
  UpdateVisibilityRuleDto,
  GetVisibleFeaturesDto,
} from './dto';
import { DeviceType } from '@prisma/client';

@ApiTags('Feature Visibility')
@ApiBearerAuth('JWT')
@Controller()
@UseGuards(JwtAuthGuard)
export class FeatureVisibilityController {
  constructor(
    private readonly featureVisibilityService: FeatureVisibilityService,
  ) {}

  // ==================== USER ENDPOINTS ====================

  @Get('features/visible')
  async getVisibleFeatures(
    @Request() req,
    @Query('deviceType') deviceType?: DeviceType,
  ) {
    return this.featureVisibilityService.getVisibleFeatures(
      req.user.userId,
      deviceType || DeviceType.DESKTOP_WEB,
    );
  }

  @Get('features/config')
  async getFeatureConfig(
    @Request() req,
    @Query('deviceType') deviceType?: DeviceType,
  ) {
    return this.featureVisibilityService.getFeatureConfigForDevice(
      req.user.userId,
      deviceType || DeviceType.DESKTOP_WEB,
    );
  }

  @Get('features/check/:featureKey')
  async checkFeatureAccess(
    @Request() req,
    @Param('featureKey') featureKey: string,
    @Query('deviceType') deviceType?: DeviceType,
  ) {
    return this.featureVisibilityService.checkFeatureVisibility(
      req.user.userId,
      featureKey,
      deviceType || DeviceType.DESKTOP_WEB,
    );
  }

  // ==================== ADMIN ENDPOINTS ====================

  @Get('admin/feature-visibility')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  async getVisibilityRules() {
    return this.featureVisibilityService.getVisibilityRules();
  }

  @Get('admin/feature-visibility/:featureKey')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  async getVisibilityRule(@Param('featureKey') featureKey: string) {
    return this.featureVisibilityService.getVisibilityRuleByFeature(featureKey);
  }

  @Post('admin/feature-visibility')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async createVisibilityRule(@Body() dto: CreateVisibilityRuleDto) {
    return this.featureVisibilityService.createVisibilityRule(dto);
  }

  @Put('admin/feature-visibility/:featureKey')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async updateVisibilityRule(
    @Param('featureKey') featureKey: string,
    @Body() dto: UpdateVisibilityRuleDto,
  ) {
    return this.featureVisibilityService.updateVisibilityRule(featureKey, dto);
  }

  @Delete('admin/feature-visibility/:featureKey')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async deleteVisibilityRule(@Param('featureKey') featureKey: string) {
    return this.featureVisibilityService.deleteVisibilityRule(featureKey);
  }

  @Post('admin/feature-visibility/initialize-defaults')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async initializeDefaultRules() {
    return this.featureVisibilityService.initializeDefaultRules();
  }

  @Get('admin/observability/license-usage')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  async getFeatureUsageByLicenseTier() {
    return this.featureVisibilityService.getFeatureUsageByLicenseTier();
  }
}
