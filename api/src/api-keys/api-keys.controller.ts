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
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';
import { ApiKeyStatus } from '@prisma/client';

@ApiTags('API Keys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new API key' })
  async create(@Request() req, @Body() dto: CreateApiKeyDto) {
    return this.apiKeysService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all API keys for current user' })
  @ApiQuery({ name: 'status', enum: ApiKeyStatus, required: false })
  async findAll(
    @Request() req,
    @Query('status') status?: ApiKeyStatus,
  ) {
    return this.apiKeysService.findAll(req.user.id, { status });
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get global API key statistics (admin only)' })
  async getGlobalStats() {
    return this.apiKeysService.getGlobalStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an API key by ID' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.apiKeysService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an API key' })
  async update(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: UpdateApiKeyDto,
  ) {
    return this.apiKeysService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an API key' })
  async remove(@Param('id') id: string, @Request() req) {
    return this.apiKeysService.remove(id, req.user.id);
  }

  @Post(':id/revoke')
  @ApiOperation({ summary: 'Revoke an API key' })
  async revoke(@Param('id') id: string, @Request() req) {
    return this.apiKeysService.revoke(id, req.user.id);
  }

  @Post(':id/regenerate')
  @ApiOperation({ summary: 'Regenerate an API key (creates new key value)' })
  async regenerate(@Param('id') id: string, @Request() req) {
    return this.apiKeysService.regenerate(id, req.user.id);
  }

  @Get(':id/usage')
  @ApiOperation({ summary: 'Get API key usage logs' })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  async getUsageLogs(
    @Param('id') id: string,
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.apiKeysService.getUsageLogs(id, req.user.id, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get API key usage statistics' })
  async getUsageStats(@Param('id') id: string, @Request() req) {
    return this.apiKeysService.getUsageStats(id, req.user.id);
  }
}
