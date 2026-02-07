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
import { WebhooksManagementService } from './webhooks-management.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';

@ApiTags('Webhooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('webhooks')
export class WebhooksManagementController {
  constructor(private readonly webhooksService: WebhooksManagementService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new webhook' })
  async create(@Request() req, @Body() dto: CreateWebhookDto) {
    return this.webhooksService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all webhooks for current user' })
  @ApiQuery({ name: 'isActive', type: Boolean, required: false })
  async findAll(
    @Request() req,
    @Query('isActive') isActive?: string,
  ) {
    return this.webhooksService.findAll(req.user.id, {
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get('events')
  @ApiOperation({ summary: 'Get list of available webhook events' })
  async getAvailableEvents() {
    return this.webhooksService.getAvailableEvents();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get webhook statistics' })
  async getStats(@Request() req) {
    return this.webhooksService.getStats(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a webhook by ID' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.webhooksService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a webhook' })
  async update(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: UpdateWebhookDto,
  ) {
    return this.webhooksService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a webhook' })
  async remove(@Param('id') id: string, @Request() req) {
    return this.webhooksService.remove(id, req.user.id);
  }

  @Post(':id/regenerate-secret')
  @ApiOperation({ summary: 'Regenerate webhook secret' })
  async regenerateSecret(@Param('id') id: string, @Request() req) {
    return this.webhooksService.regenerateSecret(id, req.user.id);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Send a test webhook delivery' })
  async test(@Param('id') id: string, @Request() req) {
    return this.webhooksService.test(id, req.user.id);
  }

  @Get(':id/deliveries')
  @ApiOperation({ summary: 'Get webhook delivery logs' })
  @ApiQuery({ name: 'success', type: Boolean, required: false })
  @ApiQuery({ name: 'event', type: String, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  async getDeliveryLogs(
    @Param('id') id: string,
    @Request() req,
    @Query('success') success?: string,
    @Query('event') event?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.webhooksService.getDeliveryLogs(id, req.user.id, {
      success: success !== undefined ? success === 'true' : undefined,
      event,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }
}
