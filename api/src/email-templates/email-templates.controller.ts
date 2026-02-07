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
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { PrismaService } from '../database/prisma.service';
import { Prisma, EmailTemplateStatus } from '@prisma/client';

/**
 * User-accessible email templates controller
 * Allows all authenticated users to:
 * - View templates (all templates or filtered by targetRoles)
 * - Create, update, and delete their own templates
 */
@ApiTags('Email Templates')
@ApiBearerAuth()
@Controller('email-templates')
@UseGuards(JwtAuthGuard)
export class EmailTemplatesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Get all accessible email templates' })
  async getTemplates(
    @Request() req,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const userId = req.user.userId;
    const userRole = req.user.role?.toUpperCase() || 'USER';
    const pageNum = parseInt(page || '1', 10);
    const size = parseInt(pageSize || '50', 10);
    const skip = (pageNum - 1) * size;

    // Build where clause: templates with no targetRoles OR matching user's role OR created by user
    const where: Prisma.EmailTemplateWhereInput = {
      OR: [
        { targetRoles: { isEmpty: true } }, // Available to all
        { targetRoles: { has: userRole } }, // Available to user's role
        { createdBy: userId }, // User's own templates
      ],
    };

    if (category) {
      where.category = category as any;
    }

    if (status) {
      where.status = status as EmailTemplateStatus;
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { subject: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [templates, total] = await Promise.all([
      this.prisma.emailTemplate.findMany({
        where,
        skip,
        take: size,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.emailTemplate.count({ where }),
    ]);

    // Add creator info by fetching users
    const creatorIds = [...new Set(templates.map(t => t.createdBy).filter(Boolean))];
    const creators = creatorIds.length > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: creatorIds as string[] } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const creatorsMap = new Map(creators.map(c => [c.id, c]));

    const templatesWithCreator = templates.map(t => ({
      ...t,
      creator: t.createdBy ? creatorsMap.get(t.createdBy) || null : null,
      isActive: t.status === 'ACTIVE',
      isShared: t.targetRoles.length === 0, // Empty targetRoles = shared with all
    }));

    return {
      items: templatesWithCreator,
      total,
      page: pageNum,
      pageSize: size,
      totalPages: Math.ceil(total / size),
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get email template statistics for current user' })
  async getStats(@Request() req) {
    const userId = req.user.userId;
    const userRole = req.user.role?.toUpperCase() || 'USER';

    // Get accessible templates
    const where: Prisma.EmailTemplateWhereInput = {
      OR: [
        { targetRoles: { isEmpty: true } },
        { targetRoles: { has: userRole } },
        { createdBy: userId },
      ],
    };

    const [total, active, ownTemplates, categoryStats] = await Promise.all([
      this.prisma.emailTemplate.count({ where }),
      this.prisma.emailTemplate.count({ where: { ...where, status: 'ACTIVE' } }),
      this.prisma.emailTemplate.count({ where: { createdBy: userId } }),
      this.prisma.emailTemplate.groupBy({
        by: ['category'],
        where,
        _count: true,
      }),
    ]);

    const byCategory = categoryStats.reduce(
      (acc, item) => ({ ...acc, [item.category]: item._count }),
      {} as Record<string, number>,
    );

    return {
      total,
      active,
      shared: total - ownTemplates,
      own: ownTemplates,
      byCategory,
      topTemplates: [],
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get email template by ID' })
  async getTemplate(@Request() req, @Param('id') id: string) {
    const userId = req.user.userId;
    const userRole = req.user.role?.toUpperCase() || 'USER';

    const template = await this.prisma.emailTemplate.findFirst({
      where: {
        id,
        OR: [
          { targetRoles: { isEmpty: true } },
          { targetRoles: { has: userRole } },
          { createdBy: userId },
        ],
      },
    });

    if (!template) {
      throw new NotFoundException('Template not found or access denied');
    }

    // Get creator info
    let creator: { id: string; name: string | null; email: string } | null = null;
    if (template.createdBy) {
      creator = await this.prisma.user.findUnique({
        where: { id: template.createdBy },
        select: { id: true, name: true, email: true },
      });
    }

    return {
      ...template,
      creator,
      isActive: template.status === 'ACTIVE',
      isShared: template.targetRoles.length === 0,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new email template' })
  async createTemplate(
    @Request() req,
    @Body()
    body: {
      name: string;
      subject: string;
      bodyHtml?: string;
      bodyText?: string;
      body?: string; // Alias for bodyHtml for frontend compatibility
      description?: string;
      category?: string;
      isShared?: boolean;
      variables?: string[];
    },
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';

    // Generate slug from name
    const slug = body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now();

    // Non-admins can only create templates for themselves (with targetRoles containing their role)
    const targetRoles = isAdmin && body.isShared ? [] : [req.user.role?.toUpperCase() || 'USER'];

    return this.prisma.emailTemplate.create({
      data: {
        name: body.name,
        slug,
        description: body.description,
        subject: body.subject,
        bodyHtml: body.bodyHtml || body.body || '',
        bodyText: body.bodyText,
        category: (body.category as any) || 'CUSTOM',
        status: 'ACTIVE',
        variables: body.variables || [],
        targetRoles,
        createdBy: userId,
      },
    });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an email template' })
  async updateTemplate(
    @Request() req,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      subject?: string;
      bodyHtml?: string;
      bodyText?: string;
      body?: string;
      description?: string;
      category?: string;
      isShared?: boolean;
      isActive?: boolean;
      status?: string;
      variables?: string[];
    },
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';

    // Check ownership (admins can edit any template)
    const template = await this.prisma.emailTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    if (!isAdmin && template.createdBy !== userId) {
      throw new ForbiddenException('You can only edit your own templates');
    }

    // Build update data
    const updateData: Prisma.EmailTemplateUpdateInput = {};

    if (body.name) updateData.name = body.name;
    if (body.subject) updateData.subject = body.subject;
    if (body.bodyHtml || body.body) updateData.bodyHtml = body.bodyHtml || body.body;
    if (body.bodyText !== undefined) updateData.bodyText = body.bodyText;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.category) updateData.category = body.category as any;
    if (body.variables) updateData.variables = body.variables;
    if (body.status) updateData.status = body.status as EmailTemplateStatus;
    if (body.isActive !== undefined) {
      updateData.status = body.isActive ? 'ACTIVE' : 'DRAFT';
    }

    // Only admins can change sharing (targetRoles)
    if (isAdmin && body.isShared !== undefined) {
      updateData.targetRoles = body.isShared ? [] : [req.user.role?.toUpperCase() || 'USER'];
    }

    updateData.lastEditedBy = userId;

    return this.prisma.emailTemplate.update({
      where: { id },
      data: updateData,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an email template' })
  async deleteTemplate(@Request() req, @Param('id') id: string) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';

    // Check ownership (admins can delete any template)
    const template = await this.prisma.emailTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    if (!isAdmin && template.createdBy !== userId) {
      throw new ForbiddenException('You can only delete your own templates');
    }

    await this.prisma.emailTemplate.delete({ where: { id } });

    return { message: 'Template deleted successfully' };
  }

  @Post(':id/clone')
  @ApiOperation({ summary: 'Clone an email template' })
  async cloneTemplate(
    @Request() req,
    @Param('id') id: string,
    @Body('name') name?: string,
  ) {
    const userId = req.user.userId;
    const userRole = req.user.role?.toUpperCase() || 'USER';

    // Get original template (must be accessible to user)
    const template = await this.prisma.emailTemplate.findFirst({
      where: {
        id,
        OR: [
          { targetRoles: { isEmpty: true } },
          { targetRoles: { has: userRole } },
          { createdBy: userId },
        ],
      },
    });

    if (!template) {
      throw new NotFoundException('Template not found or access denied');
    }

    const newName = name || `${template.name} (Copy)`;
    const slug = newName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now();

    // Create clone (always owned by current user, not shared)
    return this.prisma.emailTemplate.create({
      data: {
        name: newName,
        slug,
        description: template.description,
        subject: template.subject,
        bodyHtml: template.bodyHtml,
        bodyText: template.bodyText,
        preheader: template.preheader,
        category: template.category,
        status: 'ACTIVE',
        variables: template.variables,
        useIrisBranding: template.useIrisBranding,
        ctaText: template.ctaText,
        ctaUrl: template.ctaUrl,
        targetRoles: [userRole], // Clone is private by default
        createdBy: userId,
      },
    });
  }

  @Post(':id/preview')
  @ApiOperation({ summary: 'Preview template with variables' })
  async previewTemplate(
    @Request() req,
    @Param('id') id: string,
    @Body('variables') variables: Record<string, string>,
  ) {
    const userId = req.user.userId;
    const userRole = req.user.role?.toUpperCase() || 'USER';

    const template = await this.prisma.emailTemplate.findFirst({
      where: {
        id,
        OR: [
          { targetRoles: { isEmpty: true } },
          { targetRoles: { has: userRole } },
          { createdBy: userId },
        ],
      },
    });

    if (!template) {
      throw new NotFoundException('Template not found or access denied');
    }

    // Simple variable replacement
    let subject = template.subject;
    let body = template.bodyHtml || '';

    for (const [key, value] of Object.entries(variables || {})) {
      const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      subject = subject.replace(pattern, String(value));
      body = body.replace(pattern, String(value));
    }

    return { subject, body };
  }
}
