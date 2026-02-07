import { Body, Controller, Delete, Get, Param, Patch, Post, Res, Header, UseGuards, Request } from '@nestjs/common';
import type { Response } from 'express';
import { ConversationsService } from './conversations.service';
import { OracleCXConversationsService } from './oracle-cx-conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto, CrmMode } from './dto/create-message.dto';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { RequireFeature, LicenseFeatures } from '../licensing/decorators/license.decorator';

// DTO for metadata extraction
class ExtractMetadataDto {
  content: string;
  aiResponse?: string;
}

// DTO for updating conversation
class UpdateConversationDto {
  title?: string;
  isPinned?: boolean;
  isStarred?: boolean;
}

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly oracleCXConversationsService: OracleCXConversationsService,
  ) {}

  @Get()
  list(@Request() req) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.conversationsService.listConversations(req.user.userId, isAdmin);
  }

  @Post()
  create(@Request() req, @Body() dto: CreateConversationDto) {
    return this.conversationsService.createConversation(dto, req.user.userId);
  }

  @Get(':id')
  getOne(@Request() req, @Param('id') id: string) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.conversationsService.getConversation(id, req.user.userId, isAdmin);
  }

  @Post(':id/messages')
  @RequireFeature(LicenseFeatures.AI_CHAT)
  async sendMessage(@Request() req, @Param('id') id: string, @Body() dto: CreateMessageDto) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';

    // Route to lightweight Oracle CX service for oracle_portal mode
    if (dto.mode === CrmMode.ORACLE_PORTAL) {
      return this.oracleCXConversationsService.sendMessage(id, dto.content, req.user.userId, isAdmin);
    }

    return this.conversationsService.sendMessage(id, dto.content, req.user.userId, isAdmin, dto.mode);
  }

  /**
   * Extract metadata from user message using LLM
   * Used for artifact detection and company name extraction
   */
  @Post('extract-metadata')
  async extractMetadata(@Body() dto: ExtractMetadataDto) {
    return this.conversationsService.extractMetadata(dto.content, dto.aiResponse);
  }

  /**
   * Streaming endpoint using Vercel AI SDK
   * Returns Server-Sent Events for real-time token streaming
   */
  @Post(':id/messages/stream')
  @RequireFeature(LicenseFeatures.AI_CHAT)
  @Header('Content-Type', 'text/event-stream')
  @Header('Cache-Control', 'no-cache')
  @Header('Connection', 'keep-alive')
  async streamMessage(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: CreateMessageDto,
    @Res() res: Response,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.conversationsService.streamMessage(id, dto.content, res, req.user.userId, isAdmin, dto.mode);
  }

  @Patch(':id')
  async update(@Request() req, @Param('id') id: string, @Body() dto: UpdateConversationDto) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.conversationsService.updateConversation(id, dto, req.user.userId, isAdmin);
  }

  @Delete(':id')
  async delete(@Request() req, @Param('id') id: string) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.conversationsService.deleteConversation(id, req.user.userId, isAdmin);
  }

  @Delete()
  async deleteAll(@Request() req) {
    return this.conversationsService.deleteAllConversations(req.user.userId);
  }

  /**
   * Get IRIS Optimizer statistics for monitoring
   * Shows deterministic hit rate, cache performance, and latency optimization metrics
   */
  @Get('stats/optimizer')
  getOptimizerStats(@Request() req) {
    // Only allow admins to view optimizer stats
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    if (!isAdmin) {
      return { error: 'Admin access required' };
    }
    return this.conversationsService.getOptimizerStats();
  }
}
