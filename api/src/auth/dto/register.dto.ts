import { IsEmail, IsNotEmpty, MinLength, MaxLength, Matches, IsOptional, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
    @ApiProperty({ description: 'User email address' })
    @IsEmail()
    @MaxLength(254, { message: 'Email address is too long' })
    email: string;

    /**
     * SECURITY: Strong password requirements
     * - Minimum 12 characters (NIST recommendation)
     * - At least one uppercase letter
     * - At least one lowercase letter
     * - At least one number
     * - At least one special character
     */
    @ApiProperty({ description: 'Password (min 12 characters with complexity requirements)' })
    @IsNotEmpty()
    @MinLength(12, { message: 'Password must be at least 12 characters long' })
    @MaxLength(128, { message: 'Password is too long (max 128 characters)' })
    @Matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.,#^()_+=\-\[\]{}|\\:;"'<>\/`~])[A-Za-z\d@$!%*?&.,#^()_+=\-\[\]{}|\\:;"'<>\/`~]{12,}$/,
        { message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' }
    )
    password: string;

    // Support both "name" field (web) and "firstName/lastName" fields (mobile)
    @ApiPropertyOptional({ description: 'Full name (used if firstName/lastName not provided)' })
    @ValidateIf(o => !o.firstName && !o.lastName)
    @IsNotEmpty({ message: 'Name is required (either name or firstName/lastName)' })
    name?: string;

    @ApiPropertyOptional({ description: 'First name' })
    @IsOptional()
    firstName?: string;

    @ApiPropertyOptional({ description: 'Last name' })
    @IsOptional()
    lastName?: string;

    @ApiPropertyOptional({ description: 'Company name' })
    @IsOptional()
    company?: string;

    /**
     * Organization registration code (Enterprise B2B)
     * Required for enterprise registration - validates and associates user with organization
     */
    @ApiPropertyOptional({ description: 'Organization registration code (required for enterprise access)' })
    @IsOptional()
    @MinLength(6, { message: 'Organization code must be at least 6 characters' })
    organizationCode?: string;

    /**
     * Origin URL for determining email branding (SalesOS vs IRIS)
     */
    @ApiPropertyOptional({ description: 'Origin URL for email branding' })
    @IsOptional()
    origin?: string;

    // Helper to get full name regardless of input format
    getFullName(): string {
        if (this.name) {
            return this.name;
        }
        const parts = [this.firstName, this.lastName].filter(Boolean);
        return parts.length > 0 ? parts.join(' ') : 'User';
    }
}
