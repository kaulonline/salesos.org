import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto, PermissionDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('Profiles & Permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new profile' })
  async create(@Body() dto: CreateProfileDto) {
    return this.profilesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all profiles' })
  @ApiQuery({ name: 'isSystem', type: Boolean, required: false })
  async findAll(@Query('isSystem') isSystem?: string) {
    return this.profilesService.findAll({
      isSystem: isSystem !== undefined ? isSystem === 'true' : undefined,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get profile statistics' })
  async getStats() {
    return this.profilesService.getStats();
  }

  @Get('permission-modules')
  @ApiOperation({ summary: 'Get available permission modules' })
  async getPermissionModules() {
    return this.profilesService.getPermissionModules();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a profile by ID' })
  async findOne(@Param('id') id: string) {
    return this.profilesService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a profile' })
  async update(@Param('id') id: string, @Body() dto: UpdateProfileDto) {
    return this.profilesService.update(id, dto);
  }

  @Patch(':id/permissions')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update profile permissions' })
  async updatePermissions(
    @Param('id') id: string,
    @Body() body: { permissions: PermissionDto[] },
  ) {
    return this.profilesService.updatePermissions(id, body.permissions);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a profile' })
  async remove(@Param('id') id: string) {
    return this.profilesService.remove(id);
  }

  @Post(':id/clone')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Clone a profile' })
  async clone(@Param('id') id: string, @Body() body: { name: string }) {
    return this.profilesService.clone(id, body.name);
  }

  @Post(':id/set-default')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Set profile as default' })
  async setDefault(@Param('id') id: string) {
    return this.profilesService.setDefault(id);
  }

  @Get(':id/users')
  @ApiOperation({ summary: 'Get users assigned to profile' })
  async getUsersInProfile(@Param('id') id: string) {
    return this.profilesService.getUsersInProfile(id);
  }

  @Post(':id/assign-users')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Assign users to profile' })
  async assignUsers(
    @Param('id') id: string,
    @Body() body: { userIds: string[] },
    @Request() req,
  ) {
    return this.profilesService.assignUsers(id, body.userIds, req.user.id);
  }

  @Delete(':id/users/:userId')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Remove user from profile' })
  async removeUserFromProfile(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.profilesService.removeUserFromProfile(id, userId);
  }
}
