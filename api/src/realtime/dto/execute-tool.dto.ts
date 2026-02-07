import { IsString, IsOptional, IsObject, IsIn } from 'class-validator';

export class ExecuteToolDto {
  @IsString()
  toolName: string;

  @IsObject()
  @IsOptional()
  arguments?: Record<string, any>;

  @IsString()
  @IsOptional()
  callId?: string;

  /**
   * Data source preference: 'salesforce' or 'local'
   * When set to 'local', will bypass Salesforce even if connected
   * When set to 'salesforce', will only use Salesforce (fail if not connected)
   * When not set, defaults to preferring Salesforce if connected
   */
  @IsString()
  @IsOptional()
  @IsIn(['salesforce', 'local'])
  dataSource?: 'salesforce' | 'local';
}
