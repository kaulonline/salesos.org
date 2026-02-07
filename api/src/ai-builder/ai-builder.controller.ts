import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { AIBuilderService } from './ai-builder.service';
import {
  GenerateConfigDto,
  GenerateConfigResponseDto,
  RefineConfigDto,
  AIBuilderEntityType,
} from './dto';

@ApiTags('AI Builder')
@Controller('ai-builder')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AIBuilderController {
  constructor(private readonly aiBuilderService: AIBuilderService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate configuration from natural language',
    description:
      'Use AI to generate CRM configurations (forms, fields, templates, rules) from natural language descriptions',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuration generated successfully',
    type: GenerateConfigResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async generate(@Body() dto: GenerateConfigDto): Promise<GenerateConfigResponseDto> {
    return this.aiBuilderService.generate(dto);
  }

  @Post('refine')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refine a previously generated configuration',
    description:
      'Modify an existing AI-generated configuration based on refinement instructions',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuration refined successfully',
    type: GenerateConfigResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async refine(@Body() dto: RefineConfigDto): Promise<GenerateConfigResponseDto> {
    return this.aiBuilderService.refine(dto);
  }

  @Get('entity-types')
  @ApiOperation({
    summary: 'Get supported entity types',
    description: 'List all entity types that can be generated with AI Builder',
  })
  @ApiResponse({
    status: 200,
    description: 'List of supported entity types',
  })
  getEntityTypes(): Array<{
    type: AIBuilderEntityType;
    description: string;
    examples: string[];
  }> {
    return this.aiBuilderService.getSupportedEntityTypes();
  }
}
