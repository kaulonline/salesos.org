import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Ip,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { ClientErrorService } from './client-errors.service';
import { ReportClientErrorDto, ClientErrorQueryDto } from './dto';

/**
 * Controller for receiving client error reports from mobile and web applications.
 *
 * This controller provides:
 * - Public endpoint for reporting errors (no auth required for error reporting)
 * - Protected admin endpoints for viewing and analyzing errors
 *
 * The public reporting endpoint is intentionally unauthenticated to ensure
 * errors can be reported even when authentication fails.
 */
@Controller('errors')
export class ClientErrorsController {
  constructor(private readonly clientErrorService: ClientErrorService) {}

  // ============================================================================
  // PUBLIC ENDPOINTS - No authentication required
  // ============================================================================

  /**
   * Report a client error
   *
   * This endpoint accepts error reports from client applications.
   * It's intentionally public to allow error reporting even when auth fails.
   *
   * @param errorData - The error report data
   * @param ip - Client IP address (auto-injected)
   */
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async reportError(
    @Body() errorData: ReportClientErrorDto,
    @Ip() ip: string,
  ) {
    const result = await this.clientErrorService.reportError(errorData, ip);

    return {
      success: true,
      received: result.received,
      id: result.id,
    };
  }

  // ============================================================================
  // ADMIN ENDPOINTS - Authentication required
  // ============================================================================

  /**
   * Get client errors with filtering and pagination
   *
   * @param query - Filter and pagination options
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getClientErrors(@Query() query: ClientErrorQueryDto) {
    return this.clientErrorService.getClientErrors(query);
  }

  /**
   * Get client error statistics
   *
   * @param days - Number of days to include in statistics (default: 7)
   */
  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getClientErrorStats(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 7;
    return this.clientErrorService.getClientErrorStats(daysNum);
  }

  /**
   * Get filter options for client errors
   * Returns available values for source, platform, screen, and version filters
   */
  @Get('filters')
  @UseGuards(JwtAuthGuard)
  async getFilterOptions() {
    return this.clientErrorService.getFilterOptions();
  }

  /**
   * Get a single client error by ID
   *
   * @param id - Error log ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getClientErrorById(@Param('id') id: string) {
    return this.clientErrorService.getClientErrorById(id);
  }

  /**
   * Get errors for a specific device
   * Useful for debugging device-specific issues
   *
   * @param deviceId - Device identifier
   * @param limit - Maximum number of errors to return (default: 50)
   */
  @Get('device/:deviceId')
  @UseGuards(JwtAuthGuard)
  async getErrorsByDevice(
    @Param('deviceId') deviceId: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? Math.min(parseInt(limit, 10), 100) : 50;
    return this.clientErrorService.getErrorsByDevice(deviceId, limitNum);
  }
}
