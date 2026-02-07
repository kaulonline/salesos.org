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
import { ZoominfoService } from './zoominfo.service';
import {
  SearchCompanyDto,
  GetCompanyChangesDto,
  SearchContactsDto,
} from './dto';

@ApiTags('Integrations - ZoomInfo')
@ApiBearerAuth()
@Controller('integrations/zoominfo')
@UseGuards(JwtAuthGuard)
export class ZoominfoController {
  constructor(private readonly zoominfoService: ZoominfoService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get ZoomInfo connection status' })
  @ApiResponse({ status: 200, description: 'Connection status' })
  async getStatus() {
    const isConnected = await this.zoominfoService.isConnected();
    return { connected: isConnected };
  }

  @Post('test')
  @ApiOperation({ summary: 'Test ZoomInfo connection' })
  @ApiResponse({ status: 200, description: 'Connection test result' })
  async testConnection() {
    return this.zoominfoService.testConnection();
  }

  @Post('companies/search')
  @ApiOperation({ summary: 'Search for companies' })
  @ApiResponse({ status: 200, description: 'Company search results' })
  async searchCompanies(@Body() dto: SearchCompanyDto) {
    return this.zoominfoService.searchCompany(dto);
  }

  @Post('executive-changes')
  @ApiOperation({ summary: 'Get executive changes for companies' })
  @ApiResponse({ status: 200, description: 'Executive changes' })
  async getExecutiveChanges(@Body() dto: GetCompanyChangesDto) {
    return this.zoominfoService.getExecutiveChanges(dto.companyIds, dto.daysBack);
  }

  @Post('funding-events')
  @ApiOperation({ summary: 'Get funding events for companies' })
  @ApiResponse({ status: 200, description: 'Funding events' })
  async getFundingEvents(@Body() dto: GetCompanyChangesDto) {
    return this.zoominfoService.getFundingEvents(dto.companyIds, dto.daysBack);
  }

  @Post('tech-changes')
  @ApiOperation({ summary: 'Get technology stack changes for companies' })
  @ApiResponse({ status: 200, description: 'Tech stack changes' })
  async getTechStackChanges(@Body() dto: GetCompanyChangesDto) {
    return this.zoominfoService.getTechStackChanges(dto.companyIds, dto.daysBack);
  }

  @Post('news')
  @ApiOperation({ summary: 'Get news for companies' })
  @ApiResponse({ status: 200, description: 'Company news' })
  async getCompanyNews(@Body() dto: GetCompanyChangesDto) {
    return this.zoominfoService.getCompanyNews(dto.companyIds, dto.daysBack);
  }

  @Post('contacts/search')
  @ApiOperation({ summary: 'Search for contacts' })
  @ApiResponse({ status: 200, description: 'Contact search results' })
  async searchContacts(@Body() dto: SearchContactsDto) {
    return this.zoominfoService.searchContacts(dto);
  }

  @Post('detect-signals')
  @ApiOperation({ summary: 'Detect all signals for companies' })
  @ApiResponse({ status: 200, description: 'All detected signals' })
  async detectSignals(@Body() dto: GetCompanyChangesDto) {
    return this.zoominfoService.detectSignals(dto.companyIds, dto.daysBack);
  }
}
