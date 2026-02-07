import { IsString, IsEnum, IsOptional, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export enum ImportEntityType {
  LEAD = 'LEAD',
  CONTACT = 'CONTACT',
  ACCOUNT = 'ACCOUNT',
  OPPORTUNITY = 'OPPORTUNITY',
}

export enum ImportFileFormat {
  CSV = 'CSV',
  EXCEL = 'EXCEL',
  SALESFORCE = 'SALESFORCE',
}

export class FieldMappingDto {
  @IsString()
  sourceField: string;

  @IsString()
  targetField: string;

  @IsOptional()
  @IsString()
  defaultValue?: string;

  @IsOptional()
  @IsString()
  transformation?: string; // e.g., 'uppercase', 'lowercase', 'trim'
}

export class ImportOptionsDto {
  @IsEnum(ImportEntityType)
  entityType: ImportEntityType;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldMappingDto)
  fieldMappings?: FieldMappingDto[];

  @IsOptional()
  @IsBoolean()
  skipDuplicates?: boolean;

  @IsOptional()
  @IsString()
  duplicateCheckField?: string; // Field to check for duplicates (e.g., 'email')

  @IsOptional()
  @IsBoolean()
  updateExisting?: boolean;

  @IsOptional()
  @IsBoolean()
  skipFirstRow?: boolean; // Skip header row

  @IsOptional()
  @IsString()
  dateFormat?: string; // e.g., 'MM/DD/YYYY', 'YYYY-MM-DD'
}

export class ImportPreviewDto {
  @IsEnum(ImportEntityType)
  entityType: ImportEntityType;

  @IsOptional()
  @IsEnum(ImportFileFormat)
  fileFormat?: ImportFileFormat;
}

export interface ImportPreviewResult {
  headers: string[];
  sampleRows: Record<string, any>[];
  totalRows: number;
  suggestedMappings: FieldMappingDto[];
  detectedFormat: ImportFileFormat;
}

export interface ImportResult {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  entityType: ImportEntityType;
  totalRecords: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  errors: ImportError[];
  startedAt: Date;
  completedAt?: Date;
}

export interface ImportError {
  row: number;
  field?: string;
  message: string;
  data?: Record<string, any>;
}
