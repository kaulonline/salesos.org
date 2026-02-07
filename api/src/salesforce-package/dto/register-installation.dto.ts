import { IsString, IsOptional, IsEmail, IsUrl, Length, Matches } from 'class-validator';

export class RegisterInstallationDto {
  @IsString()
  @Length(15, 18, { message: 'Salesforce Org ID must be 15 or 18 characters' })
  @Matches(/^00D[a-zA-Z0-9]{12,15}$/, { message: 'Invalid Salesforce Organization ID format' })
  orgId: string;

  @IsString()
  @Length(1, 255)
  orgName: string;

  @IsUrl()
  instanceUrl: string;

  @IsEmail()
  adminEmail: string;

  @IsOptional()
  @IsString()
  salesforceVersion?: string;

  @IsOptional()
  @IsString()
  packageVersion?: string;
}

export class RegisterInstallationResponseDto {
  success: boolean;
  installation: {
    id: string;
    orgId: string;
    packageApiKey: string;
    packageSecret: string;
    apiCallLimit: number;
  };
  message: string;
}
