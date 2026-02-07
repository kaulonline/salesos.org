import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/strategies/jwt-auth.guard';
import { LookerService } from './looker.service';

@ApiTags('Integrations - Looker')
@Controller('integrations/looker')
export class LookerController {
  constructor(private readonly lookerService: LookerService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Looker connection status' })
  async getStatus() {
    return this.lookerService.getStatus();
  }

  @Post('test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test Looker connection' })
  async testConnection() {
    return this.lookerService.testConnection();
  }

  @Post('connect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Connect to Looker' })
  async connect() {
    await this.lookerService.initiateOAuth();
    return { success: true, message: 'Looker connected' };
  }

  @Post('configure')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Configure Looker credentials' })
  async configure(@Body() body: { clientId: string; clientSecret: string; baseUrl: string }) {
    await this.lookerService.saveCredentials({
      clientId: body.clientId,
      clientSecret: body.clientSecret,
      baseUrl: body.baseUrl,
    });
    return { success: true, message: 'Looker configured successfully' };
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect Looker' })
  async disconnect() {
    await this.lookerService.disconnect();
    return { success: true, message: 'Looker disconnected' };
  }

  @Get('dashboards')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Looker dashboards' })
  async getDashboards() {
    const dashboards = await this.lookerService.getDashboards();
    return { success: true, data: dashboards };
  }

  @Get('looks')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Looker looks' })
  async getLooks() {
    const looks = await this.lookerService.getLooks();
    return { success: true, data: looks };
  }

  @Get('looks/:lookId/run')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Run a look' })
  async runLook(
    @Param('lookId') lookId: number,
    @Query('format') format?: string,
  ) {
    const result = await this.lookerService.runLook(lookId, format);
    return { success: true, data: result };
  }

  @Get('queries/:queryId/run')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Run a query' })
  async runQuery(@Param('queryId') queryId: number) {
    const result = await this.lookerService.runQuery(queryId);
    return { success: true, data: result };
  }
}
