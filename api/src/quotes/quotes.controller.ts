import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request, UploadedFile, UseInterceptors, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { QuotesService } from './quotes.service';
import { QuoteStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { PrismaService } from '../database/prisma.service';
import { PageIndexService } from '../pageindex/pageindex.service';
import { CurrentOrganization } from '../common/decorators/organization.decorator';

// Transform quote to match frontend expected format
function transformQuote(quote: any) {
  if (!quote) return quote;
  const { totalPrice, sentDate, acceptedDate, rejectedDate, ...rest } = quote;

  // Recalculate line item totals
  const transformedLineItems = quote.lineItems?.map((item: any) => {
    const quantity = item.quantity ?? 1;
    const unitPrice = item.unitPrice ?? 0;
    const discount = item.discount ?? 0;
    const calculatedTotal = Math.max(0, (quantity * unitPrice) - discount);
    return {
      ...item,
      total: calculatedTotal,
      totalPrice: calculatedTotal,
    };
  }) ?? [];

  // Recalculate quote subtotal from line items
  const calculatedSubtotal = transformedLineItems.reduce(
    (sum: number, item: any) => sum + (item.total ?? 0),
    0
  );

  // Recalculate quote total: subtotal - quote discount + tax + shipping
  const quoteDiscount = quote.discount ?? 0;
  const tax = quote.tax ?? 0;
  const shippingHandling = quote.shippingHandling ?? 0;
  const calculatedTotal = calculatedSubtotal - quoteDiscount + tax + shippingHandling;

  return {
    ...rest,
    subtotal: calculatedSubtotal,
    total: calculatedTotal,
    currency: 'USD',
    // Map date fields to frontend expected names
    sentAt: sentDate,
    acceptedAt: acceptedDate,
    rejectedAt: rejectedDate,
    lineItems: transformedLineItems,
  };
}

@ApiTags('Quotes')
@ApiBearerAuth('JWT')
@Controller('quotes')
@UseGuards(JwtAuthGuard)
export class QuotesController {
  constructor(
    private readonly quotesService: QuotesService,
    private readonly prisma: PrismaService,
    private readonly pageIndexService: PageIndexService,
  ) {}

  @Post()
  async createQuote(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Body()
    body: {
      accountId: string;
      opportunityId: string;
      name: string;
      validUntil?: Date;
      description?: string;
      shippingHandling?: number;
      tax?: number;
      discount?: number;
    },
  ) {
    const quote = await this.quotesService.createQuote(body, req.user.userId, organizationId);
    return transformQuote(quote);
  }

  @Get()
  async listQuotes(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Query('status') status?: QuoteStatus,
    @Query('opportunityId') opportunityId?: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    const quotes = await this.quotesService.listQuotes({ status, opportunityId, ownerId: req.user.userId }, isAdmin, organizationId);
    return quotes.map(transformQuote);
  }

  @Get('stats')
  async getQuoteStats(@Request() req, @CurrentOrganization() organizationId: string) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    const stats = await this.quotesService.getQuoteStats(req.user.userId, isAdmin, organizationId);

    // Transform to match frontend QuoteStats type
    const statusMap: Record<string, number> = {};
    stats.byStatus.forEach((s: any) => {
      statusMap[s.status] = s._count;
    });

    const accepted = statusMap['ACCEPTED'] || 0;
    const conversionRate = stats.total > 0 ? accepted / stats.total : 0;
    const averageValue = stats.total > 0 ? stats.totalValue / stats.total : 0;

    return {
      total: stats.total,
      draft: statusMap['DRAFT'] || 0,
      sent: statusMap['SENT'] || 0,
      accepted,
      rejected: statusMap['REJECTED'] || 0,
      expired: statusMap['EXPIRED'] || 0,
      totalValue: stats.totalValue,
      acceptedValue: stats.acceptedValue,
      averageValue,
      conversionRate,
    };
  }

  @Get(':id')
  async getQuote(@Request() req, @CurrentOrganization() organizationId: string, @Param('id') id: string) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    const quote = await this.quotesService.getQuote(id, req.user.userId, isAdmin, organizationId);
    return transformQuote(quote);
  }

  @Patch(':id')
  async updateQuote(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      validUntil?: Date;
      description?: string;
      paymentTerms?: string;
      shippingHandling?: number;
      tax?: number;
      discount?: number;
    },
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    const quote = await this.quotesService.updateQuote(id, req.user.userId, body, isAdmin, organizationId);
    return transformQuote(quote);
  }

  @Post(':id/line-items')
  async addLineItem(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Param('id') id: string,
    @Body()
    body: {
      productName: string;
      description?: string;
      quantity: number;
      listPrice: number;
      unitPrice: number;
      discount?: number;
    },
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.quotesService.addLineItem(id, req.user.userId, body, isAdmin, organizationId);
  }

  @Patch('line-items/:lineItemId')
  async updateLineItem(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Param('lineItemId') lineItemId: string,
    @Body()
    body: {
      productName?: string;
      description?: string;
      quantity?: number;
      listPrice?: number;
      unitPrice?: number;
      discount?: number;
    },
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.quotesService.updateLineItem(lineItemId, req.user.userId, body, isAdmin, organizationId);
  }

  @Delete('line-items/:lineItemId')
  async removeLineItem(@Request() req, @CurrentOrganization() organizationId: string, @Param('lineItemId') lineItemId: string) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.quotesService.removeLineItem(lineItemId, req.user.userId, isAdmin, organizationId);
  }

  @Post(':id/send')
  async sendQuote(@Request() req, @CurrentOrganization() organizationId: string, @Param('id') id: string) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    const quote = await this.quotesService.sendQuote(id, req.user.userId, isAdmin, organizationId);
    return transformQuote(quote);
  }

  @Post(':id/accept')
  async acceptQuote(@Request() req, @CurrentOrganization() organizationId: string, @Param('id') id: string) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    const quote = await this.quotesService.acceptQuote(id, req.user.userId, isAdmin, organizationId);
    return transformQuote(quote);
  }

  @Post(':id/reject')
  async rejectQuote(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    const quote = await this.quotesService.rejectQuote(id, req.user.userId, reason, isAdmin, organizationId);
    return transformQuote(quote);
  }

  @Get(':id/pdf')
  async generatePdf(@Request() req, @CurrentOrganization() organizationId: string, @Param('id') id: string) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    const result = await this.quotesService.generatePdf(id, req.user.userId, isAdmin, organizationId);
    return {
      ...result,
      quote: transformQuote(result.quote),
    };
  }

  @Post(':id/clone')
  async cloneQuote(@Request() req, @CurrentOrganization() organizationId: string, @Param('id') id: string) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    const quote = await this.quotesService.cloneQuote(id, req.user.userId, isAdmin, organizationId);
    return transformQuote(quote);
  }

  @Post(':id/recalculate')
  async recalculateQuote(@Request() req, @CurrentOrganization() organizationId: string, @Param('id') id: string) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    const quote = await this.quotesService.recalculateQuote(id, req.user.userId, isAdmin, organizationId);
    return transformQuote(quote);
  }

  // ========== QUOTE DOCUMENTS ==========

  /**
   * Upload a document to a quote with AI extraction
   */
  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Param('id') quoteId: string,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new HttpException('No file provided', HttpStatus.BAD_REQUEST);
    }

    // Verify quote exists and user has access
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    await this.quotesService.getQuote(quoteId, req.user.userId, isAdmin, organizationId);

    try {
      // Store file in PageIndex for AI processing
      const pageIndexResult = await this.pageIndexService.indexDocumentAsync(
        file,
        true,  // addSummary
        true,  // addDescription
        true,  // useOcr
        true,  // extractTables
      );

      // Create document record linked to quote
      const document = await this.prisma.quoteDocument.create({
        data: {
          quoteId,
          filename: file.originalname,
          fileUrl: pageIndexResult.document_id, // Store PageIndex document ID
          mimeType: file.mimetype || 'application/pdf',
          sizeBytes: file.size,
          status: 'PROCESSING',
          uploadedBy: req.user.userId,
        },
      });

      // Start background processing
      this.processDocumentAsync(document.id, pageIndexResult.document_id);

      return {
        id: document.id,
        filename: document.filename,
        status: document.status,
        message: 'Document uploaded, AI processing started',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to upload document: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Background processing for document AI extraction
   */
  private async processDocumentAsync(documentId: string, pageIndexDocId: string) {
    try {
      // Poll for completion (max 60 seconds)
      let attempts = 0;
      const maxAttempts = 30;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s between checks
        attempts++;

        try {
          const status = await this.pageIndexService.getIndexingStatus(pageIndexDocId);

          if (status.status === 'complete') {
            // Extract summary from tree structure
            let summary = '';
            let pageCount = 0;
            let tableCount = 0;
            const keyTerms: string[] = [];

            if (status.tree_structure) {
              // Count pages
              if (status.tree_structure.pages) {
                pageCount = status.tree_structure.pages.length;
              }

              // Extract summaries from sections
              const extractSummaries = (node: any, depth = 0) => {
                if (node.summary && depth < 2) {
                  summary += node.summary + '\n\n';
                }
                if (node.tables) {
                  tableCount += node.tables.length;
                }
                if (node.children) {
                  node.children.forEach((child: any) => extractSummaries(child, depth + 1));
                }
              };
              extractSummaries(status.tree_structure);

              // Extract key terms from metadata if available
              if (status.tree_structure.metadata?.keywords) {
                keyTerms.push(...status.tree_structure.metadata.keywords);
              }
            }

            // Update document with results
            await this.prisma.quoteDocument.update({
              where: { id: documentId },
              data: {
                status: 'COMPLETE',
                summary: summary.trim() || 'Document processed successfully',
                pageCount,
                tableCount,
                keyTerms,
                processedAt: new Date(),
              },
            });
            return;
          } else if (status.status === 'error') {
            await this.prisma.quoteDocument.update({
              where: { id: documentId },
              data: {
                status: 'ERROR',
                errorMessage: status.message || 'Processing failed',
              },
            });
            return;
          }
        } catch (err) {
          // Continue polling on error
        }
      }

      // Timeout - mark as complete with basic info
      await this.prisma.quoteDocument.update({
        where: { id: documentId },
        data: {
          status: 'COMPLETE',
          summary: 'Document uploaded successfully (processing timed out)',
          processedAt: new Date(),
        },
      });
    } catch (error) {
      await this.prisma.quoteDocument.update({
        where: { id: documentId },
        data: {
          status: 'ERROR',
          errorMessage: error.message,
        },
      });
    }
  }

  /**
   * List all documents for a quote
   */
  @Get(':id/documents')
  async listDocuments(@Request() req, @CurrentOrganization() organizationId: string, @Param('id') quoteId: string) {
    // Verify quote exists and user has access
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    await this.quotesService.getQuote(quoteId, req.user.userId, isAdmin, organizationId);

    const documents = await this.prisma.quoteDocument.findMany({
      where: { quoteId },
      include: {
        uploader: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return documents;
  }

  /**
   * Get a single document with AI summary
   */
  @Get('documents/:docId')
  async getDocument(@Request() req, @Param('docId') docId: string) {
    const document = await this.prisma.quoteDocument.findUnique({
      where: { id: docId },
      include: {
        uploader: {
          select: { id: true, name: true, email: true },
        },
        quote: true,
      },
    });

    if (!document) {
      throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
    }

    // Verify access
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    if (!isAdmin && document.quote.ownerId !== req.user.userId) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }

    return document;
  }

  /**
   * Delete a document
   */
  @Delete('documents/:docId')
  async deleteDocument(@Request() req, @Param('docId') docId: string) {
    const document = await this.prisma.quoteDocument.findUnique({
      where: { id: docId },
      include: { quote: true },
    });

    if (!document) {
      throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
    }

    // Verify access
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    if (!isAdmin && document.quote.ownerId !== req.user.userId) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }

    // Delete from PageIndex if exists
    try {
      if (document.fileUrl) {
        await this.pageIndexService.deleteDocument(document.fileUrl);
      }
    } catch (err) {
      // Continue even if PageIndex deletion fails
    }

    // Delete from database
    await this.prisma.quoteDocument.delete({ where: { id: docId } });

    return { message: 'Document deleted successfully' };
  }

  /**
   * Re-process a document with AI
   */
  @Post('documents/:docId/reprocess')
  async reprocessDocument(@Request() req, @Param('docId') docId: string) {
    const document = await this.prisma.quoteDocument.findUnique({
      where: { id: docId },
      include: { quote: true },
    });

    if (!document) {
      throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
    }

    // Verify access
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    if (!isAdmin && document.quote.ownerId !== req.user.userId) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }

    // Reset status and reprocess
    await this.prisma.quoteDocument.update({
      where: { id: docId },
      data: {
        status: 'PROCESSING',
        summary: null,
        extractedText: null,
        keyTerms: [],
        tableCount: null,
        pageCount: null,
        errorMessage: null,
      },
    });

    // Start background processing
    this.processDocumentAsync(document.id, document.fileUrl);

    return { message: 'Document reprocessing started' };
  }
}
