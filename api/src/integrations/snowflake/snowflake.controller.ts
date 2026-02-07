import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/strategies/jwt-auth.guard';
import { SnowflakeService } from './snowflake.service';
import {
  GetUsageMetricsDto,
  GetStrategicAccountDataDto,
  GetPipelineDataDto,
} from './dto';

@ApiTags('Integrations - Snowflake')
@ApiBearerAuth()
@Controller('integrations/snowflake')
@UseGuards(JwtAuthGuard)
export class SnowflakeController {
  constructor(private readonly snowflakeService: SnowflakeService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get Snowflake connection status' })
  @ApiResponse({ status: 200, description: 'Connection status' })
  async getStatus() {
    const isConnected = await this.snowflakeService.isConnected();
    return { connected: isConnected };
  }

  @Post('test')
  @ApiOperation({ summary: 'Test Snowflake connection' })
  @ApiResponse({ status: 200, description: 'Connection test result' })
  async testConnection() {
    return this.snowflakeService.testConnection();
  }

  @Get('usage-metrics')
  @ApiOperation({ summary: 'Get usage metrics for an account' })
  @ApiResponse({ status: 200, description: 'Usage metrics data' })
  async getUsageMetrics(@Query() dto: GetUsageMetricsDto) {
    return this.snowflakeService.getUsageMetrics(dto.accountId, dto.timeframe);
  }

  @Post('strategic-accounts')
  @ApiOperation({ summary: 'Get strategic account data' })
  @ApiResponse({ status: 200, description: 'Strategic account data' })
  async getStrategicAccountData(@Body() dto: GetStrategicAccountDataDto) {
    return this.snowflakeService.getStrategicAccountData(dto.accountIds);
  }

  @Get('pipeline')
  @ApiOperation({ summary: 'Get global pipeline data' })
  @ApiResponse({ status: 200, description: 'Pipeline data' })
  async getPipelineData(@Query() dto: GetPipelineDataDto) {
    return this.snowflakeService.getPipelineData(dto.region, dto.timeframe as any);
  }

  @Post('detect-changes')
  @ApiOperation({ summary: 'Detect usage changes for accounts' })
  @ApiResponse({ status: 200, description: 'Detected usage changes' })
  async detectUsageChanges(@Body() dto: GetStrategicAccountDataDto) {
    return this.snowflakeService.detectUsageChanges(dto.accountIds);
  }
}
