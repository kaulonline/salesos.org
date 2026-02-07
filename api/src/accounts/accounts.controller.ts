import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { AccountType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { CurrentOrganization } from '../common/decorators/organization.decorator';

@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  async createAccount(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Body()
    body: {
      name: string;
      type: AccountType;
      industry?: string;
      phone?: string;
      website?: string;
      billingStreet?: string;
      billingCity?: string;
      billingState?: string;
      billingPostalCode?: string;
      billingCountry?: string;
      shippingStreet?: string;
      shippingCity?: string;
      shippingState?: string;
      shippingPostalCode?: string;
      shippingCountry?: string;
      annualRevenue?: number;
      numberOfEmployees?: number;
      description?: string;
      parentAccountId?: string;
    },
  ) {
    return this.accountsService.createAccount(body, req.user.userId, organizationId);
  }

  @Get()
  async listAccounts(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Query('type') type?: AccountType,
    @Query('industry') industry?: string,
    @Query('parentAccountId') parentAccountId?: string,
    @Query('search') search?: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.accountsService.listAccounts({
      type,
      industry,
      ownerId: req.user.userId,
      parentAccountId,
      search,
    }, organizationId, isAdmin);
  }

  @Get('stats')
  async getAccountStats(@Request() req, @CurrentOrganization() organizationId: string) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.accountsService.getAccountStats(organizationId, req.user.userId, isAdmin);
  }

  @Get(':id')
  async getAccount(@Request() req, @CurrentOrganization() organizationId: string, @Param('id') id: string) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.accountsService.getAccount(id, req.user.userId, organizationId, isAdmin);
  }

  @Get(':id/hierarchy')
  async getAccountHierarchy(@Request() req, @CurrentOrganization() organizationId: string, @Param('id') id: string) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.accountsService.getAccountHierarchy(id, req.user.userId, organizationId, isAdmin);
  }

  @Get(':id/revenue')
  async getAccountRevenue(@Request() req, @CurrentOrganization() organizationId: string, @Param('id') id: string) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.accountsService.getAccountRevenue(id, req.user.userId, organizationId, isAdmin);
  }

  @Patch(':id')
  async updateAccount(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      type?: AccountType;
      industry?: string;
      phone?: string;
      website?: string;
      billingStreet?: string;
      billingCity?: string;
      billingState?: string;
      billingPostalCode?: string;
      billingCountry?: string;
      shippingStreet?: string;
      shippingCity?: string;
      shippingState?: string;
      shippingPostalCode?: string;
      shippingCountry?: string;
      annualRevenue?: number;
      numberOfEmployees?: number;
      description?: string;
      parentAccountId?: string;
    },
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.accountsService.updateAccount(id, req.user.userId, body, organizationId, isAdmin);
  }

  @Delete(':id')
  async deleteAccount(@Request() req, @CurrentOrganization() organizationId: string, @Param('id') id: string) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    await this.accountsService.deleteAccount(id, req.user.userId, organizationId, isAdmin);
    return { message: 'Account deleted successfully' };
  }

  // Bulk Operations
  @Post('bulk/update')
  async bulkUpdate(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Body() body: { ids: string[]; updates: any },
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.accountsService.bulkUpdate(body.ids, req.user.userId, body.updates, organizationId, isAdmin);
  }

  @Post('bulk/delete')
  async bulkDelete(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Body() body: { ids: string[] },
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.accountsService.bulkDelete(body.ids, req.user.userId, organizationId, isAdmin);
  }

  @Post('bulk/assign')
  async bulkAssign(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Body() body: { ids: string[]; newOwnerId: string },
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.accountsService.bulkAssign(body.ids, req.user.userId, body.newOwnerId, organizationId, isAdmin);
  }
}
