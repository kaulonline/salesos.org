import { PipeTransform, Injectable, BadRequestException, ArgumentMetadata } from '@nestjs/common';
import { IdValidator } from '../validators/id.validator';

/**
 * Pipe to validate that a parameter is a valid local database ID (CUID format).
 * Use this pipe on controller route parameters to ensure IDs are in correct format.
 *
 * Usage:
 * @Get(':id')
 * findOne(@Param('id', LocalIdValidationPipe) id: string) { ... }
 */
@Injectable()
export class LocalIdValidationPipe implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    if (!value) {
      throw new BadRequestException('ID parameter is required');
    }

    // Check if it's a Salesforce ID and provide helpful error
    if (IdValidator.isSalesforceId(value)) {
      const sfObjectType = IdValidator.getSalesforceObjectType(value);
      throw new BadRequestException(
        `The provided ID "${value}" is a Salesforce ID${sfObjectType ? ` (${sfObjectType})` : ''}. ` +
        `This endpoint requires a local database ID. ` +
        `For Salesforce operations, use the chat interface with Salesforce mode enabled.`
      );
    }

    // Validate it's a proper CUID
    if (!IdValidator.isCUID(value)) {
      throw new BadRequestException(
        `Invalid ID format: "${value}". Expected a valid local database ID.`
      );
    }

    return value;
  }
}

/**
 * Pipe to validate that a parameter is a valid Salesforce ID (15 or 18 character).
 *
 * Usage:
 * @Get(':recordId')
 * getSalesforceRecord(@Param('recordId', SalesforceIdValidationPipe) recordId: string) { ... }
 */
@Injectable()
export class SalesforceIdValidationPipe implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    if (!value) {
      throw new BadRequestException('Salesforce ID parameter is required');
    }

    // Check if it's a local CUID and provide helpful error
    if (IdValidator.isCUID(value)) {
      throw new BadRequestException(
        `The provided ID "${value}" is a local database ID. ` +
        `This endpoint requires a Salesforce ID (15 or 18 characters).`
      );
    }

    // Validate it's a proper Salesforce ID
    if (!IdValidator.isSalesforceId(value)) {
      throw new BadRequestException(
        `Invalid Salesforce ID format: "${value}". Expected a 15 or 18-character Salesforce ID.`
      );
    }

    // Normalize to 18-character format
    return IdValidator.normalizeSalesforceId(value);
  }
}

/**
 * Pipe that accepts either local CUID or Salesforce ID formats.
 * Validates the ID is in one of the expected formats and returns info about the type.
 *
 * This is useful when an endpoint needs to handle both types and route accordingly.
 */
@Injectable()
export class FlexibleIdValidationPipe implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    if (!value) {
      throw new BadRequestException('ID parameter is required');
    }

    const validation = IdValidator.validate(value);

    if (!validation.isValid) {
      throw new BadRequestException(
        validation.error || `Invalid ID format: "${value}"`
      );
    }

    // Normalize Salesforce IDs to 18-character format
    if (validation.idType === 'salesforce') {
      return IdValidator.normalizeSalesforceId(value);
    }

    return value;
  }
}
