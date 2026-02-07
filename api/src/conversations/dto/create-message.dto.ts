import { IsNotEmpty, IsString, MaxLength, IsOptional, IsEnum } from 'class-validator';

// CRM data source modes
export enum CrmMode {
  LOCAL = 'local',
  SALESFORCE = 'salesforce',
  ORACLE = 'oracle',
  ORACLE_CX = 'oracle_cx',
  ORACLE_PORTAL = 'oracle_portal', // Lightweight Oracle CX mode for new.iriseller.com
  DOCUMENTS = 'documents',
}

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  content!: string;

  @IsEnum(CrmMode)
  @IsOptional()
  mode?: CrmMode;
}
