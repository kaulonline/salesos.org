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
import { MarketoService } from './marketo.service';

@ApiTags('Integrations - Marketo')
@Controller('integrations/marketo')
export class MarketoController {
  constructor(private readonly marketoService: MarketoService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Marketo connection status' })
  async getStatus() {
    return this.marketoService.getStatus();
  }

  @Post('test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test Marketo connection' })
  async testConnection() {
    return this.marketoService.testConnection();
  }

  @Post('configure')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Configure Marketo credentials' })
  async configure(@Body() body: { clientId: string; clientSecret: string; munchkinId: string }) {
    await this.marketoService.saveCredentials({
      clientId: body.clientId,
      clientSecret: body.clientSecret,
      munchkinId: body.munchkinId,
    });
    return { success: true, message: 'Marketo configured successfully' };
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect Marketo' })
  async disconnect() {
    await this.marketoService.disconnect();
    return { success: true, message: 'Marketo disconnected' };
  }

  @Get('leads')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Marketo leads' })
  async getLeads(
    @Query('filterType') filterType: string,
    @Query('filterValues') filterValues: string,
  ) {
    const leads = await this.marketoService.getLeads(filterType, filterValues.split(','));
    return { success: true, data: leads };
  }

  @Get('campaigns')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Marketo campaigns' })
  async getCampaigns() {
    const campaigns = await this.marketoService.getCampaigns();
    return { success: true, data: campaigns };
  }

  @Get('lists')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Marketo lists' })
  async getLists() {
    const lists = await this.marketoService.getLists();
    return { success: true, data: lists };
  }

  @Post('lists/:listId/leads')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add leads to list' })
  async addLeadToList(
    @Param('listId') listId: number,
    @Body() body: { leadIds: number[] },
  ) {
    const result = await this.marketoService.addLeadToList(listId, body.leadIds);
    return { success: true, data: result };
  }

  @Post('leads')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or update leads' })
  async createOrUpdateLeads(@Body() body: { leads: any[] }) {
    const result = await this.marketoService.createOrUpdateLeads(body.leads);
    return { success: true, data: result };
  }
}
