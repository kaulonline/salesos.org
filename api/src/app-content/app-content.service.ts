import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateAppContentDto } from './dto/create-app-content.dto';
import { UpdateAppContentDto } from './dto/update-app-content.dto';
import { AppContentType } from '@prisma/client';

@Injectable()
export class AppContentService {
  private readonly logger = new Logger(AppContentService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create new app content
   */
  async create(userId: string, createDto: CreateAppContentDto) {
    // Check if content with same type and version already exists
    const existing = await this.prisma.appContent.findFirst({
      where: {
        type: createDto.type,
        version: createDto.version,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Content with type ${createDto.type} and version ${createDto.version} already exists`,
      );
    }

    const content = await this.prisma.appContent.create({
      data: {
        ...createDto,
        lastUpdatedBy: userId,
      },
    });

    this.logger.log(`Created app content: ${content.type} v${content.version}`);
    return content;
  }

  /**
   * Find all app content
   */
  async findAll() {
    return this.prisma.appContent.findMany({
      orderBy: [
        { type: 'asc' },
        { version: 'desc' },
      ],
    });
  }

  /**
   * Find content by ID
   */
  async findOne(id: string) {
    const content = await this.prisma.appContent.findUnique({
      where: { id },
    });

    if (!content) {
      throw new NotFoundException(`App content with ID ${id} not found`);
    }

    return content;
  }

  /**
   * Find active content by type (returns the most recent active version)
   */
  async findByType(type: AppContentType) {
    const content = await this.prisma.appContent.findFirst({
      where: {
        type,
        isActive: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    if (!content) {
      throw new NotFoundException(`No active content found for type ${type}`);
    }

    return content;
  }

  /**
   * Find all versions of content by type
   */
  async findAllByType(type: AppContentType) {
    return this.prisma.appContent.findMany({
      where: { type },
      orderBy: { version: 'desc' },
    });
  }

  /**
   * Update app content
   */
  async update(id: string, userId: string, updateDto: UpdateAppContentDto) {
    const existing = await this.prisma.appContent.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`App content with ID ${id} not found`);
    }

    // If changing version, check for conflicts
    if (updateDto.version && updateDto.version !== existing.version) {
      const conflict = await this.prisma.appContent.findFirst({
        where: {
          type: existing.type,
          version: updateDto.version,
          id: { not: id },
        },
      });

      if (conflict) {
        throw new ConflictException(
          `Content with type ${existing.type} and version ${updateDto.version} already exists`,
        );
      }
    }

    const updated = await this.prisma.appContent.update({
      where: { id },
      data: {
        ...updateDto,
        lastUpdatedBy: userId,
      },
    });

    this.logger.log(`Updated app content: ${updated.type} v${updated.version}`);
    return updated;
  }

  /**
   * Delete app content
   */
  async remove(id: string) {
    const existing = await this.prisma.appContent.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`App content with ID ${id} not found`);
    }

    await this.prisma.appContent.delete({ where: { id } });

    this.logger.log(`Deleted app content: ${existing.type} v${existing.version}`);
    return { message: 'App content deleted successfully' };
  }

  /**
   * Activate a specific content version and deactivate others of the same type
   */
  async activateVersion(id: string, userId: string) {
    const content = await this.prisma.appContent.findUnique({
      where: { id },
    });

    if (!content) {
      throw new NotFoundException(`App content with ID ${id} not found`);
    }

    // Deactivate all other versions of this type
    await this.prisma.appContent.updateMany({
      where: {
        type: content.type,
        id: { not: id },
      },
      data: { isActive: false },
    });

    // Activate the specified version
    const updated = await this.prisma.appContent.update({
      where: { id },
      data: {
        isActive: true,
        lastUpdatedBy: userId,
      },
    });

    this.logger.log(`Activated app content: ${updated.type} v${updated.version}`);
    return updated;
  }

  /**
   * Update or create content by type
   * If content exists for type, updates it; otherwise creates new
   */
  async upsertByType(type: AppContentType, userId: string, updateDto: UpdateAppContentDto) {
    const existing = await this.prisma.appContent.findFirst({
      where: {
        type,
        isActive: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (existing) {
      // Update existing content
      const updated = await this.prisma.appContent.update({
        where: { id: existing.id },
        data: {
          ...updateDto,
          lastUpdatedBy: userId,
        },
      });
      this.logger.log(`Updated app content by type: ${type}`);
      return updated;
    } else {
      // Create new content
      const newVersion = updateDto.version || '1.0.0';
      const content = await this.prisma.appContent.create({
        data: {
          type,
          title: updateDto.title || type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
          content: updateDto.content || '',
          version: newVersion,
          isActive: true,
          lastUpdatedBy: userId,
        },
      });
      this.logger.log(`Created app content by type: ${type} v${newVersion}`);
      return content;
    }
  }

  /**
   * Get content for public access (no auth required)
   * Returns only active content
   */
  async getPublicContent(type: AppContentType) {
    const content = await this.prisma.appContent.findFirst({
      where: {
        type,
        isActive: true,
      },
      select: {
        id: true,
        type: true,
        title: true,
        content: true,
        version: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    if (!content) {
      throw new NotFoundException(`No active content found for type ${type}`);
    }

    return content;
  }
}
