import { Injectable, BadRequestException, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { DataAccessLevel } from '@prisma/client';
import { CreateProfileDto, PermissionDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

// Define permission modules
export const PERMISSION_MODULES = [
  'leads',
  'contacts',
  'accounts',
  'opportunities',
  'products',
  'quotes',
  'tasks',
  'activities',
  'campaigns',
  'reports',
  'email_templates',
  'custom_fields',
  'assignment_rules',
  'web_forms',
  'api_keys',
  'webhooks',
  'team',
  'settings',
];

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);

  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProfileDto) {
    // Check for duplicate name
    const existing = await this.prisma.profile.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(`Profile with name "${dto.name}" already exists`);
    }

    // Create profile with permissions
    return this.prisma.profile.create({
      data: {
        name: dto.name,
        description: dto.description,
        permissions: dto.permissions ? {
          create: dto.permissions.map(p => ({
            module: p.module,
            canRead: p.canRead ?? false,
            canCreate: p.canCreate ?? false,
            canEdit: p.canEdit ?? false,
            canDelete: p.canDelete ?? false,
            dataAccess: p.dataAccess ?? 'OWN',
          })),
        } : undefined,
      },
      include: {
        permissions: true,
        _count: { select: { users: true } },
      },
    });
  }

  async findAll(filters?: { isSystem?: boolean }) {
    const where: any = {};

    if (filters?.isSystem !== undefined) {
      where.isSystem = filters.isSystem;
    }

    return this.prisma.profile.findMany({
      where,
      include: {
        permissions: true,
        _count: { select: { users: true } },
      },
      orderBy: [
        { isSystem: 'desc' },
        { name: 'asc' },
      ],
    });
  }

  async findOne(id: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id },
      include: {
        permissions: true,
        _count: { select: { users: true } },
      },
    });

    if (!profile) {
      throw new NotFoundException(`Profile with ID "${id}" not found`);
    }

    return profile;
  }

  async update(id: string, dto: UpdateProfileDto) {
    const profile = await this.prisma.profile.findUnique({
      where: { id },
    });

    if (!profile) {
      throw new NotFoundException(`Profile with ID "${id}" not found`);
    }

    if (profile.isSystem && dto.name && dto.name !== profile.name) {
      throw new BadRequestException('Cannot rename system profiles');
    }

    // Check for duplicate name
    if (dto.name && dto.name !== profile.name) {
      const existing = await this.prisma.profile.findUnique({
        where: { name: dto.name },
      });
      if (existing) {
        throw new ConflictException(`Profile with name "${dto.name}" already exists`);
      }
    }

    return this.prisma.profile.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
      },
      include: {
        permissions: true,
        _count: { select: { users: true } },
      },
    });
  }

  async updatePermissions(id: string, permissions: PermissionDto[]) {
    const profile = await this.prisma.profile.findUnique({
      where: { id },
    });

    if (!profile) {
      throw new NotFoundException(`Profile with ID "${id}" not found`);
    }

    // Delete existing permissions and create new ones
    await this.prisma.$transaction([
      this.prisma.profilePermission.deleteMany({
        where: { profileId: id },
      }),
      ...permissions.map(p =>
        this.prisma.profilePermission.create({
          data: {
            profileId: id,
            module: p.module,
            canRead: p.canRead ?? false,
            canCreate: p.canCreate ?? false,
            canEdit: p.canEdit ?? false,
            canDelete: p.canDelete ?? false,
            dataAccess: p.dataAccess ?? 'OWN',
          },
        })
      ),
    ]);

    return this.findOne(id);
  }

  async remove(id: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });

    if (!profile) {
      throw new NotFoundException(`Profile with ID "${id}" not found`);
    }

    if (profile.isSystem) {
      throw new BadRequestException('Cannot delete system profiles');
    }

    if (profile._count.users > 0) {
      throw new BadRequestException('Cannot delete profile with assigned users');
    }

    return this.prisma.profile.delete({
      where: { id },
    });
  }

  async clone(id: string, newName: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id },
      include: { permissions: true },
    });

    if (!profile) {
      throw new NotFoundException(`Profile with ID "${id}" not found`);
    }

    // Check for duplicate name
    const existing = await this.prisma.profile.findUnique({
      where: { name: newName },
    });
    if (existing) {
      throw new ConflictException(`Profile with name "${newName}" already exists`);
    }

    return this.prisma.profile.create({
      data: {
        name: newName,
        description: profile.description,
        isSystem: false,
        permissions: {
          create: profile.permissions.map(p => ({
            module: p.module,
            canRead: p.canRead,
            canCreate: p.canCreate,
            canEdit: p.canEdit,
            canDelete: p.canDelete,
            dataAccess: p.dataAccess,
          })),
        },
      },
      include: {
        permissions: true,
        _count: { select: { users: true } },
      },
    });
  }

  async setDefault(id: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id },
    });

    if (!profile) {
      throw new NotFoundException(`Profile with ID "${id}" not found`);
    }

    // Unset current default and set new default
    await this.prisma.$transaction([
      this.prisma.profile.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      }),
      this.prisma.profile.update({
        where: { id },
        data: { isDefault: true },
      }),
    ]);

    return this.findOne(id);
  }

  async assignUsers(profileId: string, userIds: string[], assignedBy: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      throw new NotFoundException(`Profile with ID "${profileId}" not found`);
    }

    const assignments = await Promise.all(
      userIds.map(userId =>
        this.prisma.userProfile.upsert({
          where: {
            userId_profileId: { userId, profileId },
          },
          update: {},
          create: {
            userId,
            profileId,
            assignedBy,
          },
        })
      )
    );

    return { assigned: assignments.length };
  }

  async removeUserFromProfile(profileId: string, userId: string) {
    return this.prisma.userProfile.delete({
      where: {
        userId_profileId: { userId, profileId },
      },
    });
  }

  async getUsersInProfile(profileId: string) {
    const assignments = await this.prisma.userProfile.findMany({
      where: { profileId },
      select: { userId: true, assignedAt: true },
    });

    return assignments;
  }

  async getPermissionModules() {
    return PERMISSION_MODULES.map(module => ({
      module,
      label: module.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    }));
  }

  async getStats() {
    const [total, system, custom, withUsers] = await Promise.all([
      this.prisma.profile.count(),
      this.prisma.profile.count({ where: { isSystem: true } }),
      this.prisma.profile.count({ where: { isSystem: false } }),
      this.prisma.userProfile.groupBy({
        by: ['profileId'],
        _count: true,
      }),
    ]);

    return {
      total,
      system,
      custom,
      totalUsers: withUsers.reduce((sum, p) => sum + p._count, 0),
    };
  }

  // Permission check helper
  async checkPermission(
    userId: string,
    module: string,
    action: 'read' | 'create' | 'edit' | 'delete',
  ): Promise<{ allowed: boolean; dataAccess: DataAccessLevel }> {
    const userProfiles = await this.prisma.userProfile.findMany({
      where: { userId },
      include: {
        profile: {
          include: {
            permissions: {
              where: { module },
            },
          },
        },
      },
    });

    // Check all assigned profiles
    for (const up of userProfiles) {
      const permission = up.profile.permissions[0];
      if (permission) {
        const actionField = `can${action.charAt(0).toUpperCase() + action.slice(1)}`;
        if (permission[actionField]) {
          return { allowed: true, dataAccess: permission.dataAccess };
        }
      }
    }

    return { allowed: false, dataAccess: 'NONE' };
  }
}
