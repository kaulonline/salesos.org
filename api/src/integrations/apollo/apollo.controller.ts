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
import { ApolloService } from './apollo.service';

@ApiTags('Integrations - Apollo')
@Controller('integrations/apollo')
export class ApolloController {
  constructor(private readonly apolloService: ApolloService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Apollo connection status' })
  async getStatus() {
    return this.apolloService.getStatus();
  }

  @Post('test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test Apollo connection' })
  async testConnection() {
    return this.apolloService.testConnection();
  }

  @Post('configure')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Configure Apollo API key' })
  async configure(@Body() body: { apiKey: string }) {
    await this.apolloService.saveApiKey(body.apiKey);
    return { success: true, message: 'Apollo configured successfully' };
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect Apollo' })
  async disconnect() {
    await this.apolloService.disconnect();
    return { success: true, message: 'Apollo disconnected' };
  }

  @Post('search/people')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search people in Apollo' })
  async searchPeople(@Body() body: {
    personTitles?: string[];
    personLocations?: string[];
    organizationIds?: string[];
    perPage?: number;
    page?: number;
  }) {
    const results = await this.apolloService.searchPeople(body);
    return { success: true, data: results };
  }

  @Post('search/organizations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search organizations in Apollo' })
  async searchOrganizations(@Body() body: {
    organizationNames?: string[];
    organizationLocations?: string[];
    organizationIndustries?: string[];
    perPage?: number;
    page?: number;
  }) {
    const results = await this.apolloService.searchOrganizations(body);
    return { success: true, data: results };
  }

  @Get('enrich/person')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enrich person data' })
  async enrichPerson(@Query('email') email: string) {
    const data = await this.apolloService.enrichPerson(email);
    return { success: true, data };
  }

  @Get('enrich/company')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enrich company data' })
  async enrichCompany(@Query('domain') domain: string) {
    const data = await this.apolloService.enrichCompany(domain);
    return { success: true, data };
  }
}
