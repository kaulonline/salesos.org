import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Req,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { WebFormsService } from './web-forms.service';
import { CreateWebFormDto } from './dto/create-web-form.dto';
import { UpdateWebFormDto } from './dto/update-web-form.dto';
import { SubmitWebFormDto } from './dto/submit-web-form.dto';
import { WebFormSubmissionStatus } from '@prisma/client';
import type { Request as ExpressRequest } from 'express';

@ApiTags('Web Forms')
@Controller('web-forms')
export class WebFormsController {
  constructor(private readonly webFormsService: WebFormsService) {}

  // Authenticated endpoints
  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a new web form' })
  async create(@Request() req, @Body() dto: CreateWebFormDto) {
    return this.webFormsService.create(req.user.id, dto);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all web forms' })
  @ApiQuery({ name: 'isActive', type: Boolean, required: false })
  async findAll(@Query('isActive') isActive?: string) {
    return this.webFormsService.findAll({
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get('stats')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get global web form statistics' })
  async getGlobalStats() {
    return this.webFormsService.getStats();
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a web form by ID' })
  async findOne(@Param('id') id: string) {
    return this.webFormsService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update a web form' })
  async update(@Param('id') id: string, @Body() dto: UpdateWebFormDto) {
    return this.webFormsService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a web form' })
  async remove(@Param('id') id: string) {
    return this.webFormsService.remove(id);
  }

  @Post(':id/clone')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Clone a web form' })
  async clone(@Param('id') id: string, @Body() body: { name: string }, @Request() req) {
    return this.webFormsService.clone(id, body.name, req.user.id);
  }

  @Get(':id/embed-code')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get embed code for the form' })
  async getEmbedCode(@Param('id') id: string, @Req() req: ExpressRequest) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return this.webFormsService.getEmbedCode(id, baseUrl);
  }

  @Post(':id/regenerate-slug')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Regenerate form slug' })
  async regenerateSlug(@Param('id') id: string) {
    return this.webFormsService.regenerateSlug(id);
  }

  @Get(':id/stats')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get form statistics' })
  async getFormStats(@Param('id') id: string) {
    return this.webFormsService.getStats(id);
  }

  // Submissions
  @Get(':id/submissions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get form submissions' })
  @ApiQuery({ name: 'status', enum: WebFormSubmissionStatus, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  async getSubmissions(
    @Param('id') id: string,
    @Query('status') status?: WebFormSubmissionStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.webFormsService.getSubmissions(id, {
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get(':id/submissions/:submissionId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a specific submission' })
  async getSubmission(
    @Param('id') id: string,
    @Param('submissionId') submissionId: string,
  ) {
    return this.webFormsService.getSubmission(id, submissionId);
  }

  @Delete(':id/submissions/:submissionId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Delete a submission' })
  async deleteSubmission(
    @Param('id') id: string,
    @Param('submissionId') submissionId: string,
  ) {
    return this.webFormsService.deleteSubmission(id, submissionId);
  }

  // Public endpoints for form submission
  @Get('public/:slug')
  @ApiOperation({ summary: 'Get public form data by slug' })
  async getPublicForm(@Param('slug') slug: string) {
    return this.webFormsService.findBySlug(slug);
  }

  @Post('public/:slug/submit')
  @ApiOperation({ summary: 'Submit a web form (public endpoint)' })
  async submitForm(
    @Param('slug') slug: string,
    @Body() dto: SubmitWebFormDto,
    @Req() req: ExpressRequest,
    @Headers('user-agent') userAgent?: string,
    @Headers('referer') referrer?: string,
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    return this.webFormsService.submit(slug, dto, {
      ipAddress,
      userAgent,
      referrer,
    });
  }
}
