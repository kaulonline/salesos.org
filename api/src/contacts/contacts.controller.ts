import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { CurrentOrganization } from '../common/decorators/organization.decorator';

@Controller('contacts')
@UseGuards(JwtAuthGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  async createContact(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Body()
    body: {
      accountId: string;
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      mobilePhone?: string;
      title?: string;
      department?: string;
      reportsToId?: string;
      mailingStreet?: string;
      mailingCity?: string;
      mailingState?: string;
      mailingPostalCode?: string;
      mailingCountry?: string;
      description?: string;
    },
  ) {
    return this.contactsService.createContact(body, req.user.userId, organizationId);
  }

  @Get()
  async listContacts(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Query('accountId') accountId?: string,
    @Query('search') search?: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.contactsService.listContacts({
      accountId,
      ownerId: req.user.userId,
      search,
    }, organizationId, isAdmin);
  }

  @Get('stats')
  async getContactStats(
    @Request() req,
    @CurrentOrganization() organizationId: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.contactsService.getContactStats(req.user.userId, organizationId, isAdmin);
  }

  @Get(':id')
  async getContact(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Param('id') id: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.contactsService.getContact(id, req.user.userId, organizationId, isAdmin);
  }

  @Get(':id/opportunities')
  async getContactOpportunities(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Param('id') id: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.contactsService.getContactOpportunities(id, req.user.userId, organizationId, isAdmin);
  }

  @Patch(':id')
  async updateContact(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Param('id') id: string,
    @Body()
    body: {
      accountId?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      mobilePhone?: string;
      title?: string;
      department?: string;
      reportsToId?: string;
      mailingStreet?: string;
      mailingCity?: string;
      mailingState?: string;
      mailingPostalCode?: string;
      mailingCountry?: string;
      description?: string;
    },
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.contactsService.updateContact(id, req.user.userId, body, organizationId, isAdmin);
  }

  @Delete(':id')
  async deleteContact(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Param('id') id: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    await this.contactsService.deleteContact(id, req.user.userId, organizationId, isAdmin);
    return { message: 'Contact deleted successfully' };
  }

  // Bulk Operations
  @Post('bulk/update')
  async bulkUpdate(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Body() body: { ids: string[]; updates: any },
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.contactsService.bulkUpdate(body.ids, req.user.userId, body.updates, organizationId, isAdmin);
  }

  @Post('bulk/delete')
  async bulkDelete(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Body() body: { ids: string[] },
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.contactsService.bulkDelete(body.ids, req.user.userId, organizationId, isAdmin);
  }

  @Post('bulk/assign')
  async bulkAssign(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Body() body: { ids: string[]; newOwnerId: string },
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.contactsService.bulkAssign(body.ids, req.user.userId, body.newOwnerId, organizationId, isAdmin);
  }
}
