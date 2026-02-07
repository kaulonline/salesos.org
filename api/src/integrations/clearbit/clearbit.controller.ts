import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/strategies/jwt-auth.guard';
import { ClearbitService } from './clearbit.service';

@ApiTags('Integrations - Clearbit')
@Controller('integrations/clearbit')
export class ClearbitController {
  constructor(private readonly clearbitService: ClearbitService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Clearbit connection status' })
  async getStatus() {
    return this.clearbitService.getStatus();
  }

  @Post('test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test Clearbit connection' })
  async testConnection() {
    return this.clearbitService.testConnection();
  }

  @Post('configure')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Configure Clearbit API key' })
  async configure(@Body() body: { apiKey: string }) {
    await this.clearbitService.saveApiKey(body.apiKey);
    return { success: true, message: 'Clearbit configured successfully' };
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect Clearbit' })
  async disconnect() {
    await this.clearbitService.disconnect();
    return { success: true, message: 'Clearbit disconnected' };
  }

  @Get('enrich/company')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enrich company data' })
  async enrichCompany(@Query('domain') domain: string) {
    const data = await this.clearbitService.enrichCompany(domain);
    return { success: true, data };
  }

  @Get('enrich/person')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enrich person data' })
  async enrichPerson(@Query('email') email: string) {
    const data = await this.clearbitService.enrichPerson(email);
    return { success: true, data };
  }

  @Get('enrich/combined')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enrich person and company data' })
  async enrichCombined(@Query('email') email: string) {
    const data = await this.clearbitService.enrichCombined(email);
    return { success: true, data };
  }

  @Get('reveal')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reveal company from IP' })
  async revealVisitor(@Query('ip') ip: string) {
    const data = await this.clearbitService.revealVisitor(ip);
    return { success: true, data };
  }

  @Post('prospector/search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search for prospects' })
  async prospectorSearch(@Body() body: {
    domain?: string;
    role?: string;
    seniority?: string;
    title?: string;
    limit?: number;
  }) {
    const data = await this.clearbitService.prospectorSearch(body);
    return { success: true, data };
  }
}
