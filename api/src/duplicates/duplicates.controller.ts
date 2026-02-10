import { Controller, Get, Post, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { CurrentOrganization } from '../common/decorators/organization.decorator';
import { DuplicateDetectionService } from './duplicate-detection.service';
import { DuplicateSetStatus } from '@prisma/client';

// Inline roles guard for this controller
import { SetMetadata, CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

const Roles = (...roles: string[]) => SetMetadata('roles', roles);

@Injectable()
class DupRolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) return true;
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return false;
    return requiredRoles.includes(user.role);
  }
}

@ApiTags('Duplicates')
@ApiBearerAuth()
@Controller('duplicates')
@UseGuards(JwtAuthGuard, DupRolesGuard)
export class DuplicatesController {
  constructor(private readonly duplicateDetectionService: DuplicateDetectionService) {}

  @Get()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'List duplicate sets' })
  @ApiResponse({ status: 200, description: 'List of duplicate sets' })
  async getDuplicateSets(
    @CurrentOrganization() organizationId: string,
    @Query('entityType') entityType?: string,
    @Query('status') status?: DuplicateSetStatus,
  ) {
    return this.duplicateDetectionService.getDuplicateSets(organizationId, entityType, status);
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get duplicate set details' })
  @ApiResponse({ status: 200, description: 'Duplicate set with member details' })
  async getDuplicateSet(@Param('id') id: string) {
    return this.duplicateDetectionService.getDuplicateSet(id);
  }

  @Post('scan/:entityType/:entityId')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Trigger duplicate scan for a specific entity' })
  @ApiResponse({ status: 200, description: 'Scan completed' })
  async scanForDuplicates(
    @CurrentOrganization() organizationId: string,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    await this.duplicateDetectionService.scanForDuplicates(organizationId, entityType, entityId);
    return { message: 'Scan completed' };
  }

  @Post(':id/dismiss')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Dismiss a duplicate set' })
  @ApiResponse({ status: 200, description: 'Duplicate set dismissed' })
  async dismissDuplicateSet(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.duplicateDetectionService.dismissDuplicateSet(id, req.user?.id);
  }

  @Post(':id/merge')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Merge entities in a duplicate set' })
  @ApiResponse({ status: 200, description: 'Entities merged' })
  async mergeEntities(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
    @Request() req: any,
    @Body() body: {
      survivorId: string;
      mergedIds: string[];
      entityType: string;
      fieldResolutions?: Record<string, { sourceId: string; value: any }>;
    },
  ) {
    return this.duplicateDetectionService.mergeEntities({
      duplicateSetId: id,
      survivorId: body.survivorId,
      mergedIds: body.mergedIds,
      entityType: body.entityType,
      fieldResolutions: body.fieldResolutions,
      userId: req.user?.id,
      organizationId,
    });
  }
}
