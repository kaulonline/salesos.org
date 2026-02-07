import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/strategies/jwt-auth.guard';
import { SegmentService } from './segment.service';

@ApiTags('Integrations - Segment')
@Controller('integrations/segment')
export class SegmentController {
  constructor(private readonly segmentService: SegmentService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Segment connection status' })
  async getStatus() {
    return this.segmentService.getStatus();
  }

  @Post('test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test Segment connection' })
  async testConnection() {
    return this.segmentService.testConnection();
  }

  @Post('configure')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Configure Segment write key' })
  async configure(@Body() body: { writeKey: string }) {
    await this.segmentService.saveCredentials({ writeKey: body.writeKey });
    return { success: true, message: 'Segment configured successfully' };
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect Segment' })
  async disconnect() {
    await this.segmentService.disconnect();
    return { success: true, message: 'Segment disconnected' };
  }

  @Post('track')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Track an event' })
  async track(@Body() body: {
    userId?: string;
    anonymousId?: string;
    event: string;
    properties?: Record<string, any>;
  }) {
    const result = await this.segmentService.track(body);
    return { success: true, data: result };
  }

  @Post('identify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Identify a user' })
  async identify(@Body() body: {
    userId: string;
    traits?: Record<string, any>;
  }) {
    const result = await this.segmentService.identify(body);
    return { success: true, data: result };
  }

  @Post('page')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Track a page view' })
  async page(@Body() body: {
    userId?: string;
    anonymousId?: string;
    name?: string;
    properties?: Record<string, any>;
  }) {
    const result = await this.segmentService.page(body);
    return { success: true, data: result };
  }

  @Post('group')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Associate user with group' })
  async group(@Body() body: {
    userId: string;
    groupId: string;
    traits?: Record<string, any>;
  }) {
    const result = await this.segmentService.group(body);
    return { success: true, data: result };
  }
}
