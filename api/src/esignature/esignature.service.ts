import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ESignProvider, ESignStatus, Prisma } from '@prisma/client';

interface Signer {
  name: string;
  email: string;
  role?: string;
  order?: number;
  status?: string;
  signedAt?: string;
}

@Injectable()
export class ESignatureService {
  constructor(private readonly prisma: PrismaService) {}

  async createESignatureRequest(
    quoteId: string,
    userId: string,
    data: {
      provider: ESignProvider;
      subject: string;
      message?: string;
      signers: Signer[];
      sendImmediately?: boolean;
    },
  ) {
    // Verify quote exists and user has access
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (quote.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const signersData = data.signers.map((signer, index) => ({
      name: signer.name,
      email: signer.email,
      role: signer.role || 'Signer',
      order: signer.order || index + 1,
      status: 'PENDING',
    }));

    const esignRequest = await this.prisma.eSignatureRequest.create({
      data: {
        quoteId,
        provider: data.provider,
        subject: data.subject,
        message: data.message,
        signers: signersData,
        status: data.sendImmediately ? 'SENT' : 'DRAFT',
        sentAt: data.sendImmediately ? new Date() : undefined,
      },
    });

    // In a real implementation, this would integrate with the e-signature provider
    // For now, we just return the created request

    return esignRequest;
  }

  async listESignatureRequests(
    filters: {
      quoteId?: string;
      provider?: ESignProvider;
      status?: ESignStatus;
      ownerId?: string;
    },
    isAdmin: boolean,
  ) {
    const where: Prisma.ESignatureRequestWhereInput = {};

    if (filters.quoteId) where.quoteId = filters.quoteId;
    if (filters.provider) where.provider = filters.provider;
    if (filters.status) where.status = filters.status;

    // If not admin, filter by owner through quote
    if (!isAdmin && filters.ownerId) {
      where.quote = { ownerId: filters.ownerId };
    }

    return this.prisma.eSignatureRequest.findMany({
      where,
      include: {
        quote: {
          select: {
            id: true,
            name: true,
            quoteNumber: true,
            ownerId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getByQuote(quoteId: string, userId: string, isAdmin: boolean) {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (!isAdmin && quote.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.eSignatureRequest.findMany({
      where: { quoteId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getESignatureRequest(id: string, userId: string, isAdmin: boolean) {
    const request = await this.prisma.eSignatureRequest.findUnique({
      where: { id },
      include: {
        quote: {
          select: {
            id: true,
            name: true,
            quoteNumber: true,
            ownerId: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('E-signature request not found');
    }

    if (!isAdmin && request.quote.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return request;
  }

  async sendESignatureRequest(id: string, userId: string, isAdmin: boolean) {
    const request = await this.getESignatureRequest(id, userId, isAdmin);

    if (request.status !== 'DRAFT') {
      throw new BadRequestException('Request has already been sent');
    }

    // In a real implementation, this would send to the e-signature provider
    return this.prisma.eSignatureRequest.update({
      where: { id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });
  }

  async refreshStatus(id: string, userId: string, isAdmin: boolean) {
    const request = await this.getESignatureRequest(id, userId, isAdmin);

    // In a real implementation, this would fetch status from the provider
    // For now, we just return the current status
    return request;
  }

  async voidESignatureRequest(
    id: string,
    userId: string,
    reason?: string,
    isAdmin: boolean = false,
  ) {
    const request = await this.getESignatureRequest(id, userId, isAdmin);

    if (['COMPLETED', 'VOIDED', 'EXPIRED'].includes(request.status)) {
      throw new BadRequestException('Cannot void this request');
    }

    return this.prisma.eSignatureRequest.update({
      where: { id },
      data: {
        status: 'VOIDED',
        voidedAt: new Date(),
        voidedReason: reason,
      },
    });
  }

  async resendESignatureRequest(id: string, userId: string, isAdmin: boolean) {
    const request = await this.getESignatureRequest(id, userId, isAdmin);

    if (!['SENT', 'VIEWED'].includes(request.status)) {
      throw new BadRequestException('Cannot resend this request');
    }

    // In a real implementation, this would resend through the provider
    return this.prisma.eSignatureRequest.update({
      where: { id },
      data: {
        sentAt: new Date(),
      },
    });
  }

  async downloadSignedDocument(id: string, userId: string, isAdmin: boolean) {
    const request = await this.getESignatureRequest(id, userId, isAdmin);

    if (request.status !== 'COMPLETED') {
      throw new BadRequestException('Document is not yet signed');
    }

    if (!request.signedDocumentUrl) {
      throw new NotFoundException('Signed document not available');
    }

    // In a real implementation, this would return a download URL or stream
    return {
      url: request.signedDocumentUrl,
      expiresAt: new Date(Date.now() + 3600000), // 1 hour expiry
    };
  }

  async getSigningUrl(requestId: string, signerId: string) {
    const request = await this.prisma.eSignatureRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('E-signature request not found');
    }

    const signers = request.signers as unknown as Signer[];
    const signer = signers.find(
      (s) => s.email.toLowerCase() === signerId.toLowerCase(),
    );

    if (!signer) {
      throw new NotFoundException('Signer not found');
    }

    // In a real implementation, this would return a URL from the provider
    return {
      url: `https://esign.example.com/sign/${request.externalId}/${signerId}`,
      expiresAt: new Date(Date.now() + 86400000), // 24 hours
    };
  }

  async handleWebhook(
    provider: ESignProvider,
    payload: Record<string, any>,
    signature?: string,
  ) {
    // Verify webhook signature based on provider
    // This would be implemented differently for each provider

    // Find the request by external ID
    const externalId = payload.envelopeId || payload.documentId || payload.id;

    if (!externalId) {
      throw new BadRequestException('Missing external ID in webhook payload');
    }

    const request = await this.prisma.eSignatureRequest.findFirst({
      where: {
        provider,
        externalId,
      },
    });

    if (!request) {
      // Request not found - may be for a different system
      return { received: true, processed: false };
    }

    // Update status based on webhook event
    const eventType = payload.event || payload.status;
    const updateData: Prisma.ESignatureRequestUpdateInput = {
      webhookPayload: payload,
    };

    switch (eventType) {
      case 'sent':
        updateData.status = 'SENT';
        updateData.sentAt = new Date();
        break;
      case 'viewed':
        updateData.status = 'VIEWED';
        updateData.viewedAt = new Date();
        break;
      case 'signed':
        updateData.status = 'SIGNED';
        updateData.signedAt = new Date();
        break;
      case 'completed':
        updateData.status = 'COMPLETED';
        updateData.completedAt = new Date();
        if (payload.signedDocumentUrl) {
          updateData.signedDocumentUrl = payload.signedDocumentUrl;
        }
        break;
      case 'declined':
        updateData.status = 'DECLINED';
        updateData.declinedAt = new Date();
        updateData.declinedReason = payload.declineReason;
        break;
      case 'voided':
        updateData.status = 'VOIDED';
        updateData.voidedAt = new Date();
        updateData.voidedReason = payload.voidReason;
        break;
      default:
        // Unknown event type - just store the payload
        break;
    }

    await this.prisma.eSignatureRequest.update({
      where: { id: request.id },
      data: updateData,
    });

    return { received: true, processed: true };
  }

  async getStats(userId: string, isAdmin: boolean) {
    const baseWhere: Prisma.ESignatureRequestWhereInput = isAdmin
      ? {}
      : {
          quote: { ownerId: userId },
        };

    const [total, byStatus, byProvider] = await Promise.all([
      this.prisma.eSignatureRequest.count({ where: baseWhere }),
      this.prisma.eSignatureRequest.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: true,
      }),
      this.prisma.eSignatureRequest.groupBy({
        by: ['provider'],
        where: baseWhere,
        _count: true,
      }),
    ]);

    return {
      total,
      byStatus: byStatus.reduce(
        (acc, item) => ({ ...acc, [item.status]: item._count }),
        {},
      ),
      byProvider: byProvider.reduce(
        (acc, item) => ({ ...acc, [item.provider]: item._count }),
        {},
      ),
    };
  }

  async getProviders() {
    // Return available e-signature providers
    // In a real implementation, this would check which providers are configured
    return [
      {
        id: 'DOCUSIGN',
        name: 'DocuSign',
        isConfigured: false,
        description: 'Industry-leading e-signature solution',
      },
      {
        id: 'ADOBE_SIGN',
        name: 'Adobe Sign',
        isConfigured: false,
        description: 'Adobe Document Cloud e-signatures',
      },
      {
        id: 'HELLOSIGN',
        name: 'HelloSign',
        isConfigured: false,
        description: 'Simple and intuitive e-signatures by Dropbox',
      },
      {
        id: 'PANDADOC',
        name: 'PandaDoc',
        isConfigured: false,
        description: 'All-in-one document automation',
      },
      {
        id: 'INTERNAL',
        name: 'Internal',
        isConfigured: true,
        description: 'Built-in e-signature (no external provider)',
      },
    ];
  }
}
