import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../database/prisma.service';
import { LeadsService } from '../leads/leads.service';
import { ContactsService } from '../contacts/contacts.service';
import { AccountsService } from '../accounts/accounts.service';
import { NotesService } from '../notes/notes.service';
import { AnthropicService } from '../anthropic/anthropic.service';
import {
  CaptureMode,
  CrmEntityType,
  ExtractedContactDto,
  ExtractedTextDto,
  ExtractedReceiptDto,
  SmartCaptureResultDto,
  CreateFromCaptureDto,
  SmartCaptureConfigDto,
} from './dto';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FormData = require('form-data');

interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

// Default smart capture configuration
const DEFAULT_CONFIG: SmartCaptureConfigDto = {
  enableBusinessCardScan: true,
  enableDocumentScan: true,
  enableHandwritingRecognition: true,
  enableReceiptScan: true,
  autoCreateLeadFromBusinessCard: false,
  aiEnhancedExtraction: true,
  defaultNoteEntityType: 'lead',
};

@Injectable()
export class SmartCaptureService {
  private readonly logger = new Logger(SmartCaptureService.name);
  private readonly pageIndexUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly leadsService: LeadsService,
    private readonly contactsService: ContactsService,
    private readonly accountsService: AccountsService,
    private readonly notesService: NotesService,
    private readonly anthropicService: AnthropicService,
  ) {
    this.pageIndexUrl = this.configService.get<string>('PAGEINDEX_SERVICE_URL') || 'http://localhost:8001';
    this.logger.log(`Smart Capture service initialized, PageIndex URL: ${this.pageIndexUrl}`);
  }

  /**
   * Get smart capture configuration from system config
   */
  async getConfig(): Promise<SmartCaptureConfigDto> {
    try {
      const settings = await this.prisma.systemConfig.findUnique({
        where: { key: 'smart_capture_config' },
      });
      if (settings && settings.value) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(settings.value) };
      }
    } catch (error) {
      this.logger.warn('Could not load smart capture config, using defaults');
    }
    return DEFAULT_CONFIG;
  }

  /**
   * Save smart capture configuration
   */
  async saveConfig(config: SmartCaptureConfigDto): Promise<SmartCaptureConfigDto> {
    const existing = await this.prisma.systemConfig.findUnique({
      where: { key: 'smart_capture_config' },
    });

    if (existing) {
      await this.prisma.systemConfig.update({
        where: { key: 'smart_capture_config' },
        data: { value: JSON.stringify(config) },
      });
    } else {
      await this.prisma.systemConfig.create({
        data: {
          key: 'smart_capture_config',
          value: JSON.stringify(config),
          category: 'smart_capture',
          type: 'json',
          label: 'Smart Capture Configuration',
          description: 'Configuration for Smart Camera & Notepad features',
        },
      });
    }

    return this.getConfig();
  }

  /**
   * Process a business card image
   */
  async processBusinessCard(
    file: UploadedFile,
    userId: string,
    organizationId: string,
    autoCreate?: boolean,
  ): Promise<SmartCaptureResultDto> {
    this.logger.log(`Processing business card: ${file.originalname}`);

    try {
      const formData = new FormData();
      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });

      const response = await firstValueFrom(
        this.httpService.post(`${this.pageIndexUrl}/ocr/business-card`, formData, {
          headers: formData.getHeaders(),
          timeout: 60000,
        }),
      );

      const ocrResult = response.data;
      const extractedData: ExtractedContactDto = ocrResult.contact;

      // Optionally enhance with AI
      const config = await this.getConfig();
      let aiEnhanced = false;

      if (config.aiEnhancedExtraction && extractedData) {
        try {
          const enhanced = await this.enhanceContactWithAI(extractedData);
          Object.assign(extractedData, enhanced);
          aiEnhanced = true;
        } catch (error) {
          this.logger.warn('AI enhancement failed, using raw OCR data');
        }
      }

      const result: SmartCaptureResultDto = {
        success: ocrResult.success,
        mode: CaptureMode.BUSINESS_CARD,
        extractedData,
        aiEnhanced,
      };

      // Auto-create lead/contact if requested
      if (autoCreate || config.autoCreateLeadFromBusinessCard) {
        try {
          const lead = await this.createLeadFromContact(extractedData, userId, organizationId);
          result.createdEntity = {
            type: CrmEntityType.LEAD,
            id: lead.id,
            name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
          };
        } catch (error) {
          this.logger.error('Auto-create lead failed:', error);
        }
      }

      return result;
    } catch (error) {
      this.logger.error(`Business card processing failed: ${error.message}`);
      return {
        success: false,
        mode: CaptureMode.BUSINESS_CARD,
        extractedData: {},
        error: error.message,
      };
    }
  }

  /**
   * Process a document image with OCR
   */
  async processDocument(file: UploadedFile, userId: string): Promise<SmartCaptureResultDto> {
    this.logger.log(`Processing document: ${file.originalname}`);

    try {
      const formData = new FormData();
      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });

      const response = await firstValueFrom(
        this.httpService.post(`${this.pageIndexUrl}/ocr/image`, formData, {
          headers: formData.getHeaders(),
          timeout: 60000,
        }),
      );

      const ocrResult = response.data;
      const extractedData: ExtractedTextDto = {
        text: ocrResult.text,
        pageCount: ocrResult.pageCount,
        hasHandwriting: ocrResult.hasHandwriting,
        confidence: ocrResult.confidence,
        wordCount: ocrResult.wordCount,
      };

      return {
        success: true,
        mode: CaptureMode.DOCUMENT,
        extractedData,
      };
    } catch (error) {
      this.logger.error(`Document processing failed: ${error.message}`);
      return {
        success: false,
        mode: CaptureMode.DOCUMENT,
        extractedData: { text: '' },
        error: error.message,
      };
    }
  }

  /**
   * Process handwritten notes
   */
  async processHandwritten(
    file: UploadedFile,
    userId: string,
    organizationId: string,
    options?: {
      createNote?: boolean;
      linkedEntityId?: string;
      linkedEntityType?: string;
      noteTitle?: string;
    },
  ): Promise<SmartCaptureResultDto> {
    this.logger.log(`Processing handwritten notes: ${file.originalname}`);

    try {
      const formData = new FormData();
      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });

      const response = await firstValueFrom(
        this.httpService.post(`${this.pageIndexUrl}/ocr/handwritten`, formData, {
          headers: formData.getHeaders(),
          timeout: 60000,
        }),
      );

      const ocrResult = response.data;
      const extractedData: ExtractedTextDto = {
        text: ocrResult.text,
        hasHandwriting: ocrResult.isMainlyHandwritten,
        confidence: ocrResult.confidence,
        wordCount: ocrResult.wordCount,
      };

      const result: SmartCaptureResultDto = {
        success: true,
        mode: CaptureMode.HANDWRITTEN,
        extractedData,
      };

      // Create note if requested
      if (options?.createNote && extractedData.text) {
        try {
          const noteData: any = {
            title: options.noteTitle || `Handwritten Note - ${new Date().toLocaleDateString()}`,
            body: extractedData.text,
          };

          // Link to entity if specified
          if (options.linkedEntityId && options.linkedEntityType) {
            switch (options.linkedEntityType.toLowerCase()) {
              case 'lead':
                noteData.leadId = options.linkedEntityId;
                break;
              case 'contact':
                noteData.contactId = options.linkedEntityId;
                break;
              case 'account':
                noteData.accountId = options.linkedEntityId;
                break;
              case 'opportunity':
                noteData.opportunityId = options.linkedEntityId;
                break;
            }
          }

          const note = await this.notesService.createNote(noteData, userId, organizationId);
          result.createdEntity = {
            type: CrmEntityType.NOTE,
            id: note.id,
            name: note.title || 'Note',
          };
        } catch (error) {
          this.logger.error('Create note failed:', error);
        }
      }

      return result;
    } catch (error) {
      this.logger.error(`Handwritten processing failed: ${error.message}`);
      return {
        success: false,
        mode: CaptureMode.HANDWRITTEN,
        extractedData: { text: '' },
        error: error.message,
      };
    }
  }

  /**
   * Process receipt image
   */
  async processReceipt(file: UploadedFile, userId: string): Promise<SmartCaptureResultDto> {
    this.logger.log(`Processing receipt: ${file.originalname}`);

    try {
      const formData = new FormData();
      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });

      const response = await firstValueFrom(
        this.httpService.post(`${this.pageIndexUrl}/ocr/receipt`, formData, {
          headers: formData.getHeaders(),
          timeout: 60000,
        }),
      );

      const ocrResult = response.data;
      const extractedData: ExtractedReceiptDto = ocrResult.receipt;

      return {
        success: ocrResult.success,
        mode: CaptureMode.RECEIPT,
        extractedData,
      };
    } catch (error) {
      this.logger.error(`Receipt processing failed: ${error.message}`);
      return {
        success: false,
        mode: CaptureMode.RECEIPT,
        extractedData: {},
        error: error.message,
      };
    }
  }

  /**
   * Create CRM entity from extracted data
   */
  async createEntityFromCapture(
    dto: CreateFromCaptureDto,
    userId: string,
    organizationId: string,
  ): Promise<SmartCaptureResultDto> {
    this.logger.log(`Creating ${dto.entityType} from captured data`);

    try {
      let createdEntity: any;
      const data = { ...dto.extractedData, ...dto.additionalFields };

      switch (dto.entityType) {
        case CrmEntityType.LEAD:
          createdEntity = await this.createLeadFromContact(data as ExtractedContactDto, userId, organizationId);
          break;

        case CrmEntityType.CONTACT:
          createdEntity = await this.createContactFromExtracted(data as ExtractedContactDto, userId, organizationId);
          break;

        case CrmEntityType.ACCOUNT:
          createdEntity = await this.createAccountFromExtracted(data, userId, organizationId);
          break;

        case CrmEntityType.NOTE:
          createdEntity = await this.notesService.createNote(
            {
              title: data.title || 'Captured Note',
              body: data.text || data.body || '',
              leadId: dto.linkedEntityType === 'lead' ? dto.linkedEntityId : undefined,
              contactId: dto.linkedEntityType === 'contact' ? dto.linkedEntityId : undefined,
              accountId: dto.linkedEntityType === 'account' ? dto.linkedEntityId : undefined,
              opportunityId: dto.linkedEntityType === 'opportunity' ? dto.linkedEntityId : undefined,
            },
            userId,
            organizationId,
          );
          break;

        default:
          throw new BadRequestException(`Unsupported entity type: ${dto.entityType}`);
      }

      return {
        success: true,
        mode: CaptureMode.DOCUMENT,
        extractedData: data,
        createdEntity: {
          type: dto.entityType,
          id: createdEntity.id,
          name: this.getEntityName(createdEntity, dto.entityType),
        },
      };
    } catch (error) {
      this.logger.error(`Create entity failed: ${error.message}`);
      return {
        success: false,
        mode: CaptureMode.DOCUMENT,
        extractedData: dto.extractedData,
        error: error.message,
      };
    }
  }

  /**
   * Enhance extracted contact data with AI
   */
  private async enhanceContactWithAI(contact: ExtractedContactDto): Promise<Partial<ExtractedContactDto>> {
    const prompt = `Clean up and enhance this extracted business card data. Fix any OCR errors, normalize phone numbers, and fill in missing fields if you can reasonably infer them.

Input data:
${JSON.stringify(contact, null, 2)}

Return a JSON object with the corrected/enhanced fields only. Do not add fields that cannot be reasonably inferred.`;

    try {
      const response = await this.anthropicService.generateChatCompletion({
        messages: [{ role: 'user', content: prompt }],
      });

      // Parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      this.logger.warn('AI enhancement failed:', error.message);
    }

    return {};
  }

  /**
   * Create a lead from extracted contact data
   */
  private async createLeadFromContact(contact: ExtractedContactDto, userId: string, organizationId: string) {
    return this.leadsService.create(
      userId,
      {
        firstName: contact.firstName || 'Unknown',
        lastName: contact.lastName || '',
        email: contact.email,
        phone: contact.phone || contact.mobilePhone,
        company: contact.company,
        title: contact.jobTitle,
        website: contact.website,
        leadSource: 'OTHER',
        description: `Created from business card scan. Address: ${contact.address || 'N/A'}${contact.mobilePhone ? ` Mobile: ${contact.mobilePhone}` : ''}`,
      },
      organizationId,
    );
  }

  /**
   * Create a contact from extracted data
   */
  private async createContactFromExtracted(contact: ExtractedContactDto, userId: string, organizationId: string) {
    // First try to find or create an account if company is present
    let accountId: string | undefined;

    if (contact.company) {
      try {
        const existingAccount = await this.prisma.account.findFirst({
          where: {
            ownerId: userId,
            organizationId,
            name: { contains: contact.company, mode: 'insensitive' },
          },
        });

        if (existingAccount) {
          accountId = existingAccount.id;
        } else {
          const newAccount = await this.accountsService.createAccount(
            {
              name: contact.company,
              type: 'PROSPECT',
              website: contact.website,
              phone: contact.phone,
            },
            userId,
            organizationId,
          );
          accountId = newAccount.id;
        }
      } catch (error) {
        this.logger.warn('Could not create/find account for contact:', error.message);
      }
    }

    // Build contact data - accountId is required so throw if not available
    if (!accountId) {
      throw new Error('Cannot create contact without an associated account');
    }

    return this.contactsService.createContact(
      {
        firstName: contact.firstName || 'Unknown',
        lastName: contact.lastName || '',
        email: contact.email,
        phone: contact.phone,
        mobilePhone: contact.mobilePhone,
        title: contact.jobTitle,
        department: contact.department,
        accountId,
        description: `Created from business card scan.`,
      },
      userId,
      organizationId,
    );
  }

  /**
   * Create an account from extracted data
   */
  private async createAccountFromExtracted(data: any, userId: string, organizationId: string) {
    return this.accountsService.createAccount(
      {
        name: data.company || data.merchantName || 'Unknown Company',
        type: data.type || 'PROSPECT',
        website: data.website,
        phone: data.phone || data.merchantPhone,
        billingStreet: data.address || data.merchantAddress,
        description: data.description,
      },
      userId,
      organizationId,
    );
  }

  /**
   * Get display name for an entity
   */
  private getEntityName(entity: any, type: CrmEntityType): string {
    switch (type) {
      case CrmEntityType.LEAD:
      case CrmEntityType.CONTACT:
        return `${entity.firstName || ''} ${entity.lastName || ''}`.trim() || 'Unnamed';
      case CrmEntityType.ACCOUNT:
        return entity.name || 'Unnamed Account';
      case CrmEntityType.NOTE:
        return entity.title || 'Note';
      default:
        return 'Unknown';
    }
  }

  /**
   * Check OCR service availability
   */
  async checkOcrAvailability(): Promise<{
    available: boolean;
    capabilities: string[];
  }> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.pageIndexUrl}/capabilities`, { timeout: 5000 }),
      );

      const caps = response.data.capabilities;
      const capabilities: string[] = [];

      if (caps.ocr) capabilities.push('ocr');
      if (caps.business_card_scan) capabilities.push('business_card');
      if (caps.handwriting_recognition) capabilities.push('handwriting');
      if (caps.receipt_scan) capabilities.push('receipt');
      if (caps.table_extraction) capabilities.push('table_extraction');

      return {
        available: caps.ocr === true,
        capabilities,
      };
    } catch (error) {
      this.logger.error('OCR service check failed:', error.message);
      return {
        available: false,
        capabilities: [],
      };
    }
  }
}
