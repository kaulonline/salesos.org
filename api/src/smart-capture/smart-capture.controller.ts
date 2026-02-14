import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { CurrentOrganization } from '../common/decorators/organization.decorator';
import { SmartCaptureService } from './smart-capture.service';
import {
  ProcessImageDto,
  CaptureMode,
  CreateFromCaptureDto,
  TranscribeNotesDto,
  SmartCaptureConfigDto,
} from './dto';
import {
  validateFileType,
  validateFileSize,
  createFileFilter,
  ALLOWED_FILE_TYPES,
  FILE_SIZE_LIMITS,
} from '../common/utils/file-validator';

interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

// Allowed file types for smart capture (images and PDFs)
const SMART_CAPTURE_ALLOWED_TYPES = ALLOWED_FILE_TYPES.SMART_CAPTURE;

// Maximum file size for smart capture uploads (20MB)
const MAX_SMART_CAPTURE_SIZE = FILE_SIZE_LIMITS.IMAGE;

// Multer options for file uploads - 20MB limit with file type filter
const multerOptions = {
  limits: {
    fileSize: MAX_SMART_CAPTURE_SIZE,
  },
  fileFilter: createFileFilter(SMART_CAPTURE_ALLOWED_TYPES),
};

@ApiTags('Smart Capture')
@ApiBearerAuth('JWT')
@Controller('smart-capture')
@UseGuards(JwtAuthGuard)
export class SmartCaptureController {
  constructor(private readonly smartCaptureService: SmartCaptureService) {}

  /**
   * Process an image based on capture mode
   */
  @Post('process')
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async processImage(
    @UploadedFile() file: UploadedFile,
    @Body() body: ProcessImageDto,
    @CurrentOrganization() organizationId: string,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type using magic bytes
    const typeValidation = validateFileType(file.buffer, SMART_CAPTURE_ALLOWED_TYPES);
    if (!typeValidation.valid) {
      throw new BadRequestException(
        `Invalid file type. Detected '${typeValidation.detectedType}'. ` +
        'Allowed types: JPEG, PNG, GIF, WebP, BMP, HEIC, HEIF, PDF.'
      );
    }

    const userId = req.user.sub || req.user.userId;
    const mode = body.mode || CaptureMode.DOCUMENT;

    switch (mode) {
      case CaptureMode.BUSINESS_CARD:
        return this.smartCaptureService.processBusinessCard(
          file,
          userId,
          organizationId,
          body.autoCreateEntity,
        );

      case CaptureMode.HANDWRITTEN:
        return this.smartCaptureService.processHandwritten(file, userId, organizationId, {
          createNote: body.autoCreateEntity,
          linkedEntityId: body.linkedEntityId,
          linkedEntityType: body.linkedEntityType,
        });

      case CaptureMode.RECEIPT:
        return this.smartCaptureService.processReceipt(file, userId);

      case CaptureMode.DOCUMENT:
      default:
        return this.smartCaptureService.processDocument(file, userId);
    }
  }

  /**
   * Process a business card image
   */
  @Post('business-card')
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async processBusinessCard(
    @UploadedFile() file: UploadedFile,
    @Query('autoCreate') autoCreate: string,
    @CurrentOrganization() organizationId: string,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type using magic bytes
    const typeValidation = validateFileType(file.buffer, SMART_CAPTURE_ALLOWED_TYPES);
    if (!typeValidation.valid) {
      throw new BadRequestException(
        `Invalid file type. Detected '${typeValidation.detectedType}'. ` +
        'Allowed types: JPEG, PNG, GIF, WebP, BMP, HEIC, HEIF, PDF.'
      );
    }

    const userId = req.user.sub || req.user.userId;
    return this.smartCaptureService.processBusinessCard(
      file,
      userId,
      organizationId,
      autoCreate === 'true',
    );
  }

  /**
   * Process a document image with OCR
   */
  @Post('document')
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async processDocument(
    @UploadedFile() file: UploadedFile,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type using magic bytes
    const typeValidation = validateFileType(file.buffer, SMART_CAPTURE_ALLOWED_TYPES);
    if (!typeValidation.valid) {
      throw new BadRequestException(
        `Invalid file type. Detected '${typeValidation.detectedType}'. ` +
        'Allowed types: JPEG, PNG, GIF, WebP, BMP, HEIC, HEIF, PDF.'
      );
    }

    const userId = req.user.sub || req.user.userId;
    return this.smartCaptureService.processDocument(file, userId);
  }

  /**
   * Process handwritten notes
   */
  @Post('handwritten')
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async processHandwritten(
    @UploadedFile() file: UploadedFile,
    @Body() body: TranscribeNotesDto,
    @CurrentOrganization() organizationId: string,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type using magic bytes
    const typeValidation = validateFileType(file.buffer, SMART_CAPTURE_ALLOWED_TYPES);
    if (!typeValidation.valid) {
      throw new BadRequestException(
        `Invalid file type. Detected '${typeValidation.detectedType}'. ` +
        'Allowed types: JPEG, PNG, GIF, WebP, BMP, HEIC, HEIF, PDF.'
      );
    }

    const userId = req.user.sub || req.user.userId;
    return this.smartCaptureService.processHandwritten(file, userId, organizationId, {
      createNote: body.createNote,
      linkedEntityId: body.linkedEntityId,
      linkedEntityType: body.linkedEntityType,
      noteTitle: body.noteTitle,
    });
  }

  /**
   * Process a receipt image
   */
  @Post('receipt')
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async processReceipt(
    @UploadedFile() file: UploadedFile,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type using magic bytes
    const typeValidation = validateFileType(file.buffer, SMART_CAPTURE_ALLOWED_TYPES);
    if (!typeValidation.valid) {
      throw new BadRequestException(
        `Invalid file type. Detected '${typeValidation.detectedType}'. ` +
        'Allowed types: JPEG, PNG, GIF, WebP, BMP, HEIC, HEIF, PDF.'
      );
    }

    const userId = req.user.sub || req.user.userId;
    return this.smartCaptureService.processReceipt(file, userId);
  }

  /**
   * Create CRM entity from extracted data
   */
  @Post('create-entity')
  async createEntity(
    @Body() body: CreateFromCaptureDto,
    @CurrentOrganization() organizationId: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    return this.smartCaptureService.createEntityFromCapture(body, userId, organizationId);
  }

  /**
   * Get OCR service availability and capabilities
   */
  @Get('capabilities')
  async getCapabilities() {
    return this.smartCaptureService.checkOcrAvailability();
  }

  /**
   * Get smart capture configuration
   */
  @Get('config')
  async getConfig() {
    return this.smartCaptureService.getConfig();
  }

  /**
   * Update smart capture configuration (admin only)
   */
  @Put('config')
  async updateConfig(@Body() config: SmartCaptureConfigDto) {
    return this.smartCaptureService.saveConfig(config);
  }
}
