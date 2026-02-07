import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { ContractStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { CurrentOrganization } from '../common/decorators/organization.decorator';

@Controller('contracts')
@UseGuards(JwtAuthGuard)
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  async createContract(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Body()
    body: {
      accountId: string;
      quoteId?: string;
      contractName: string;
      startDate?: Date;
      endDate?: Date;
      contractTerm?: number;
      contractValue?: number;
      billingFrequency?: string;
      autoRenew?: boolean;
      description?: string;
      specialTerms?: string;
    },
  ) {
    return this.contractsService.createContract(body, req.user.userId, organizationId);
  }

  @Get()
  async listContracts(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Query('status') status?: ContractStatus,
    @Query('accountId') accountId?: string,
    @Query('renewalDue') renewalDue?: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.contractsService.listContracts({
      status,
      accountId,
      renewalDue: renewalDue === 'true',
    }, isAdmin, organizationId);
  }

  @Get('stats')
  async getContractStats(
    @Request() req,
    @CurrentOrganization() organizationId: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.contractsService.getContractStats(req.user.userId, isAdmin, organizationId);
  }

  @Get(':id')
  async getContract(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Param('id') id: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.contractsService.getContract(id, req.user.userId, isAdmin, organizationId);
  }

  @Patch(':id')
  async updateContract(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Param('id') id: string,
    @Body()
    body: {
      contractName?: string;
      startDate?: Date;
      endDate?: Date;
      contractTerm?: number;
      contractValue?: number;
      billingFrequency?: string;
      autoRenew?: boolean;
      description?: string;
      specialTerms?: string;
    },
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.contractsService.updateContract(id, req.user.userId, body, isAdmin, organizationId);
  }

  @Post(':id/submit')
  async submitForReview(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Param('id') id: string,
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.contractsService.submitForReview(id, userId, isAdmin, organizationId);
  }

  @Post(':id/approve')
  async approveContract(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Param('id') id: string,
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.contractsService.approveContract(id, userId, isAdmin, organizationId);
  }

  @Post(':id/activate')
  async activateContract(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Param('id') id: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.contractsService.activateContract(id, req.user.userId, isAdmin, organizationId);
  }

  @Post(':id/terminate')
  async terminateContract(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.contractsService.terminateContract(id, req.user.userId, reason, isAdmin, organizationId);
  }

  @Post(':id/renew')
  async renewContract(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Param('id') id: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.contractsService.renewContract(id, req.user.userId, isAdmin, organizationId);
  }
}
