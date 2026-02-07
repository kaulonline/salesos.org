import { IsString, IsOptional, IsEnum, IsBoolean, IsObject } from 'class-validator';

export enum CaptureMode {
  BUSINESS_CARD = 'business_card',
  DOCUMENT = 'document',
  HANDWRITTEN = 'handwritten',
  RECEIPT = 'receipt',
}

export enum CrmEntityType {
  LEAD = 'lead',
  CONTACT = 'contact',
  ACCOUNT = 'account',
  NOTE = 'note',
}

export class ProcessImageDto {
  @IsEnum(CaptureMode)
  mode: CaptureMode;

  @IsOptional()
  @IsBoolean()
  autoCreateEntity?: boolean;

  @IsOptional()
  @IsEnum(CrmEntityType)
  targetEntityType?: CrmEntityType;

  @IsOptional()
  @IsString()
  linkedEntityId?: string;

  @IsOptional()
  @IsString()
  linkedEntityType?: string;
}

export class ExtractedContactDto {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  jobTitle?: string;
  company?: string;
  department?: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  fax?: string;
  website?: string;
  address?: string;
  confidence?: number;
}

export class ExtractedTextDto {
  text: string;
  pageCount?: number;
  hasHandwriting?: boolean;
  confidence?: number;
  wordCount?: number;
}

export class ExtractedReceiptDto {
  merchantName?: string;
  merchantAddress?: string;
  merchantPhone?: string;
  transactionDate?: string;
  transactionTime?: string;
  subtotal?: number;
  tax?: number;
  tip?: number;
  total?: number;
  items?: Array<{
    description?: string;
    quantity?: number;
    price?: number;
  }>;
  confidence?: number;
}

export class SmartCaptureResultDto {
  success: boolean;
  mode: CaptureMode;
  extractedData: ExtractedContactDto | ExtractedTextDto | ExtractedReceiptDto;
  aiEnhanced?: boolean;
  createdEntity?: {
    type: CrmEntityType;
    id: string;
    name?: string;
  };
  error?: string;
}

export class CreateFromCaptureDto {
  @IsEnum(CrmEntityType)
  entityType: CrmEntityType;

  @IsObject()
  extractedData: Record<string, any>;

  @IsOptional()
  @IsString()
  linkedEntityId?: string;

  @IsOptional()
  @IsString()
  linkedEntityType?: string;

  @IsOptional()
  @IsObject()
  additionalFields?: Record<string, any>;
}

export class TranscribeNotesDto {
  @IsOptional()
  @IsString()
  linkedEntityId?: string;

  @IsOptional()
  @IsString()
  linkedEntityType?: string;

  @IsOptional()
  @IsString()
  noteTitle?: string;

  @IsOptional()
  @IsBoolean()
  createNote?: boolean;
}

// Smart Capture Configuration DTO for admin settings
export class SmartCaptureConfigDto {
  @IsOptional()
  @IsBoolean()
  enableBusinessCardScan?: boolean;

  @IsOptional()
  @IsBoolean()
  enableDocumentScan?: boolean;

  @IsOptional()
  @IsBoolean()
  enableHandwritingRecognition?: boolean;

  @IsOptional()
  @IsBoolean()
  enableReceiptScan?: boolean;

  @IsOptional()
  @IsBoolean()
  autoCreateLeadFromBusinessCard?: boolean;

  @IsOptional()
  @IsBoolean()
  aiEnhancedExtraction?: boolean;

  @IsOptional()
  @IsString()
  defaultNoteEntityType?: string;
}
