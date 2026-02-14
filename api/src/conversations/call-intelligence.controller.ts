import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { CallIntelligenceService } from './call-intelligence.service';
import {
  CallSearchFiltersDto,
  SavedSearchDto,
  TrackerDefinitionDto,
  CreateStreamDto,
} from './dto/call-search.dto';

@ApiTags('Call Intelligence')
@ApiBearerAuth('JWT')
@Controller('calls')
@UseGuards(JwtAuthGuard)
export class CallIntelligenceController {
  constructor(private readonly callService: CallIntelligenceService) {}

  /**
   * Search calls with transcript content
   */
  @Get('search')
  async searchCalls(@Query() filters: CallSearchFiltersDto, @Request() req: any) {
    return this.callService.searchCalls(
      filters,
      req.user.userId,
      req.user.role?.toUpperCase() === 'ADMIN',
    );
  }

  /**
   * Save a search for quick access
   */
  @Post('searches')
  async saveSearch(@Body() dto: SavedSearchDto, @Request() req: any) {
    return this.callService.saveSearch(dto, req.user.userId);
  }

  /**
   * Get saved searches
   */
  @Get('saved/searches')
  async getSavedSearches(@Request() req: any) {
    return this.callService.getSavedSearches(req.user.userId);
  }

  /**
   * Create or update a tracker
   */
  @Post('trackers')
  async upsertTracker(@Body() dto: TrackerDefinitionDto, @Request() req: any) {
    return this.callService.upsertTracker(dto, req.user.userId);
  }

  /**
   * Get tracker definitions
   */
  @Get('config/trackers')
  async getTrackers(@Request() req: any) {
    return this.callService.getTrackers(req.user.userId);
  }

  /**
   * Create a stream (saved search with notifications)
   */
  @Post('streams')
  async createStream(@Body() dto: CreateStreamDto, @Request() req: any) {
    return this.callService.createStream(dto, req.user.userId);
  }

  /**
   * Get call details with full transcript
   * NOTE: This route must come after all fixed routes to avoid conflicts
   */
  @Get(':callId')
  async getCallDetails(@Param('callId') callId: string, @Request() req: any) {
    return this.callService.getCallDetails(callId, req.user.userId);
  }

  /**
   * AI-powered call analysis
   */
  @Get(':callId/analyze')
  async analyzeCall(@Param('callId') callId: string) {
    return this.callService.analyzeCall(callId);
  }
}
