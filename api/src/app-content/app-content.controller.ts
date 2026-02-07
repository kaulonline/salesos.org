import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AppContentService } from './app-content.service';
import { CreateAppContentDto } from './dto/create-app-content.dto';
import { UpdateAppContentDto } from './dto/update-app-content.dto';
import { AppContentType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { SetMetadata } from '@nestjs/common';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// Roles decorator
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// Roles guard for admin-only routes
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

@Controller('app-content')
export class AppContentController {
  constructor(private readonly appContentService: AppContentService) {}

  /**
   * Convert kebab-case URL param to AppContentType enum
   * e.g., "terms-of-service" -> "TERMS_OF_SERVICE"
   */
  private parseContentType(type: string): AppContentType {
    const enumValue = type.toUpperCase().replace(/-/g, '_');
    if (Object.values(AppContentType).includes(enumValue as AppContentType)) {
      return enumValue as AppContentType;
    }
    throw new Error(`Invalid content type: ${type}`);
  }

  // ============================================
  // PUBLIC ENDPOINTS (No Auth Required)
  // ============================================

  /**
   * Get active content by type - Public endpoint for mobile app
   * GET /api/app-content/public/:type
   */
  @Get('public/:type')
  getPublicContent(@Param('type') type: string) {
    return this.appContentService.getPublicContent(this.parseContentType(type));
  }

  // ============================================
  // AUTHENTICATED ENDPOINTS
  // ============================================

  /**
   * Get all app content
   * GET /api/app-content
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.appContentService.findAll();
  }

  /**
   * Get active content by type
   * GET /api/app-content/:type
   */
  @Get(':type')
  @UseGuards(JwtAuthGuard)
  findByType(@Param('type') type: string) {
    return this.appContentService.findByType(this.parseContentType(type));
  }

  /**
   * Get all versions of content by type
   * GET /api/app-content/:type/versions
   */
  @Get(':type/versions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findAllVersionsByType(@Param('type') type: string) {
    return this.appContentService.findAllByType(this.parseContentType(type));
  }

  // ============================================
  // ADMIN-ONLY ENDPOINTS
  // ============================================

  /**
   * Create new app content
   * POST /api/app-content
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(@Request() req, @Body() createDto: CreateAppContentDto) {
    const userId = req.user.userId;
    return this.appContentService.create(userId, createDto);
  }

  /**
   * Update app content by type (upsert - creates if not exists)
   * PUT /api/app-content/type/:type
   */
  @Put('type/:type')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  updateByType(
    @Request() req,
    @Param('type') type: string,
    @Body() updateDto: UpdateAppContentDto,
  ) {
    const userId = req.user.userId;
    return this.appContentService.upsertByType(this.parseContentType(type), userId, updateDto);
  }

  /**
   * Update app content by ID
   * PUT /api/app-content/:id
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateAppContentDto,
  ) {
    const userId = req.user.userId;
    return this.appContentService.update(id, userId, updateDto);
  }

  /**
   * Activate a specific content version (deactivates others of same type)
   * POST /api/app-content/:id/activate
   */
  @Post(':id/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  activateVersion(@Request() req, @Param('id') id: string) {
    const userId = req.user.userId;
    return this.appContentService.activateVersion(id, userId);
  }

  /**
   * Delete app content by ID
   * DELETE /api/app-content/:id
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.appContentService.remove(id);
  }
}
