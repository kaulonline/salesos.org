import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Headers,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ESignatureService } from './esignature.service';
import { ESignProvider, ESignStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';

interface CreateSignerDto {
  name: string;
  email: string;
  role?: string;
  order?: number;
}

@Controller('esignature')
export class ESignatureController {
  constructor(private readonly esignatureService: ESignatureService) {}

  @Post('requests')
  @UseGuards(JwtAuthGuard)
  async createRequest(
    @Request() req,
    @Body()
    body: {
      quoteId: string;
      provider: ESignProvider;
      subject: string;
      message?: string;
      signers: CreateSignerDto[];
      sendImmediately?: boolean;
    },
  ) {
    return this.esignatureService.createESignatureRequest(
      body.quoteId,
      req.user.userId,
      body,
    );
  }

  @Get('requests')
  @UseGuards(JwtAuthGuard)
  async listRequests(
    @Request() req,
    @Query('quoteId') quoteId?: string,
    @Query('provider') provider?: ESignProvider,
    @Query('status') status?: ESignStatus,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.esignatureService.listESignatureRequests(
      {
        quoteId,
        provider,
        status,
        ownerId: req.user.userId,
      },
      isAdmin,
    );
  }

  @Get('requests/by-quote/:quoteId')
  @UseGuards(JwtAuthGuard)
  async getByQuote(@Request() req, @Param('quoteId') quoteId: string) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.esignatureService.getByQuote(quoteId, req.user.userId, isAdmin);
  }

  @Get('requests/:id')
  @UseGuards(JwtAuthGuard)
  async getRequest(@Request() req, @Param('id') id: string) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.esignatureService.getESignatureRequest(
      id,
      req.user.userId,
      isAdmin,
    );
  }

  @Post('requests/:id/send')
  @UseGuards(JwtAuthGuard)
  async sendRequest(@Request() req, @Param('id') id: string) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.esignatureService.sendESignatureRequest(
      id,
      req.user.userId,
      isAdmin,
    );
  }

  @Post('requests/:id/refresh')
  @UseGuards(JwtAuthGuard)
  async refreshStatus(@Request() req, @Param('id') id: string) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.esignatureService.refreshStatus(id, req.user.userId, isAdmin);
  }

  @Post('requests/:id/void')
  @UseGuards(JwtAuthGuard)
  async voidRequest(
    @Request() req,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.esignatureService.voidESignatureRequest(
      id,
      req.user.userId,
      reason,
      isAdmin,
    );
  }

  @Post('requests/:id/resend')
  @UseGuards(JwtAuthGuard)
  async resendRequest(@Request() req, @Param('id') id: string) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.esignatureService.resendESignatureRequest(
      id,
      req.user.userId,
      isAdmin,
    );
  }

  @Get('requests/:id/download')
  @UseGuards(JwtAuthGuard)
  async downloadSignedDocument(@Request() req, @Param('id') id: string) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.esignatureService.downloadSignedDocument(
      id,
      req.user.userId,
      isAdmin,
    );
  }

  @Get('requests/:requestId/signing-url/:signerId')
  async getSigningUrl(
    @Param('requestId') requestId: string,
    @Param('signerId') signerId: string,
  ) {
    return this.esignatureService.getSigningUrl(requestId, signerId);
  }

  @Post('webhook/:provider')
  async handleWebhook(
    @Param('provider') provider: ESignProvider,
    @Body() payload: Record<string, any>,
    @Headers('x-signature') signature?: string,
  ) {
    return this.esignatureService.handleWebhook(provider, payload, signature);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getStats(@Request() req) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.esignatureService.getStats(req.user.userId, isAdmin);
  }

  @Get('providers')
  @UseGuards(JwtAuthGuard)
  async getProviders() {
    return this.esignatureService.getProviders();
  }
}
