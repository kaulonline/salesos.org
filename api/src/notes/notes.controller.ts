import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { NotesService } from './notes.service';
import { NoteIntelligenceService } from './note-intelligence.service';
import { PendingNoteActionsService } from './pending-note-actions.service';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { CurrentOrganization } from '../common/decorators/organization.decorator';
import { NoteSourceType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

@Controller('notes')
@UseGuards(JwtAuthGuard)
export class NotesController {
  constructor(
    private readonly notesService: NotesService,
    private readonly noteIntelligenceService: NoteIntelligenceService,
    private readonly pendingActionsService: PendingNoteActionsService,
  ) {}

  @Post()
  async createNote(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Body()
    body: {
      title?: string;
      body: string;
      isPrivate?: boolean;
      // Local IRIS entity IDs
      leadId?: string;
      accountId?: string;
      contactId?: string;
      opportunityId?: string;
      // Salesforce entity IDs (for Salesforce mode)
      sfLeadId?: string;
      sfAccountId?: string;
      sfContactId?: string;
      sfOpportunityId?: string;
    },
  ) {
    return this.notesService.createNote(body, req.user.userId, organizationId);
  }

  @Get()
  async listNotes(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    // Local IRIS entity IDs
    @Query('leadId') leadId?: string,
    @Query('accountId') accountId?: string,
    @Query('contactId') contactId?: string,
    @Query('opportunityId') opportunityId?: string,
    // Salesforce entity IDs
    @Query('sfLeadId') sfLeadId?: string,
    @Query('sfAccountId') sfAccountId?: string,
    @Query('sfContactId') sfContactId?: string,
    @Query('sfOpportunityId') sfOpportunityId?: string,
    // Other filters
    @Query('isPrivate') isPrivate?: string,
    @Query('search') search?: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.notesService.listNotes({
      userId: req.user.userId,
      leadId,
      accountId,
      contactId,
      opportunityId,
      sfLeadId,
      sfAccountId,
      sfContactId,
      sfOpportunityId,
      isPrivate: isPrivate === 'true' ? true : isPrivate === 'false' ? false : undefined,
      search,
    }, organizationId, isAdmin);
  }

  @Get('stats')
  async getNoteStats(@Request() req, @CurrentOrganization() organizationId: string) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.notesService.getNoteStats(organizationId, req.user.userId, isAdmin);
  }

  @Get('search')
  async searchNotes(@Request() req, @CurrentOrganization() organizationId: string, @Query('q') query: string) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.notesService.searchNotes(query, organizationId, req.user.userId, isAdmin);
  }

  @Get(':id')
  async getNote(@Request() req, @CurrentOrganization() organizationId: string, @Param('id') id: string) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.notesService.getNote(id, req.user.userId, organizationId, isAdmin);
  }

  @Patch(':id')
  async updateNote(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      body?: string;
      isPrivate?: boolean;
      // Local IRIS entity IDs (null to unlink)
      leadId?: string | null;
      accountId?: string | null;
      contactId?: string | null;
      opportunityId?: string | null;
      // Salesforce entity IDs (null to unlink)
      sfLeadId?: string | null;
      sfAccountId?: string | null;
      sfContactId?: string | null;
      sfOpportunityId?: string | null;
    },
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.notesService.updateNote(id, body, req.user.userId, organizationId, isAdmin);
  }

  @Delete(':id')
  async deleteNote(@Request() req, @CurrentOrganization() organizationId: string, @Param('id') id: string) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    await this.notesService.deleteNote(id, req.user.userId, organizationId, isAdmin);
    return { message: 'Note deleted successfully' };
  }

  // ============================================
  // Voice Note & AI Processing Endpoints
  // ============================================

  /**
   * Create a voice note from audio file
   * Transcribes audio and creates note with transcription
   */
  @Post('voice')
  @UseInterceptors(FileInterceptor('audio'))
  async createVoiceNote(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @UploadedFile() file: { originalname: string; buffer: Buffer; mimetype: string },
    @Body()
    body: {
      title?: string;
      leadId?: string;
      accountId?: string;
      contactId?: string;
      opportunityId?: string;
      sfLeadId?: string;
      sfAccountId?: string;
      sfContactId?: string;
      sfOpportunityId?: string;
      autoProcess?: string; // 'true' to auto-run AI processing
    },
  ) {
    if (!file) {
      throw new BadRequestException('Audio file is required');
    }

    // Save audio to temp file for processing
    const tempDir = os.tmpdir();
    const tempPath = path.join(tempDir, `voice-note-${Date.now()}-${file.originalname}`);
    fs.writeFileSync(tempPath, file.buffer);

    try {
      // Transcribe the audio
      const transcription = await this.noteIntelligenceService.transcribeAudio(tempPath);

      // Create the note with transcription
      const note = await this.notesService.createNote(
        {
          title: body.title || 'Voice Note',
          body: transcription.text,
          leadId: body.leadId,
          accountId: body.accountId,
          contactId: body.contactId,
          opportunityId: body.opportunityId,
          sfLeadId: body.sfLeadId,
          sfAccountId: body.sfAccountId,
          sfContactId: body.sfContactId,
          sfOpportunityId: body.sfOpportunityId,
        },
        req.user.userId,
        organizationId,
      );

      // Update note with voice-specific fields
      const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
      const updatedNote = await this.notesService.updateNoteWithVoiceData(note.id, {
        transcription: transcription.text,
        sourceType: NoteSourceType.VOICE,
        audioUrl: null, // Would store to S3/blob storage in production
      }, organizationId, req.user.userId, isAdmin);

      // Optionally auto-process with AI
      if (body.autoProcess === 'true') {
        return this.noteIntelligenceService.processNote(updatedNote.id, req.user.userId);
      }

      return updatedNote;
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }
  }

  /**
   * Process a note with AI to extract insights and generate actions
   */
  @Post(':id/process')
  async processNote(@Request() req, @Param('id') id: string) {
    return this.noteIntelligenceService.processNote(id, req.user.userId);
  }

  /**
   * Re-process a note (clears pending actions and re-runs AI)
   */
  @Post(':id/reprocess')
  async reprocessNote(@Request() req, @Param('id') id: string) {
    return this.noteIntelligenceService.reprocessNote(id, req.user.userId);
  }

  /**
   * Get AI extraction results for a note
   */
  @Get(':id/extraction')
  async getExtractionResults(@Param('id') id: string) {
    return this.noteIntelligenceService.getExtractionResults(id);
  }

  // ============================================
  // Pending Actions Endpoints
  // ============================================

  /**
   * Get all pending actions for current user
   */
  @Get('actions/pending')
  async getUserPendingActions(
    @Request() req,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
  ) {
    return this.pendingActionsService.getUserPendingActions(req.user.userId, {
      status: status as any,
      actionType: type as any,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  /**
   * Get action statistics for current user
   */
  @Get('actions/stats')
  async getActionStats(@Request() req) {
    return this.pendingActionsService.getActionStats(req.user.userId);
  }

  /**
   * Get pending actions for a specific note
   */
  @Get(':id/pending-actions')
  async getPendingActionsForNote(@Request() req, @Param('id') id: string) {
    return this.pendingActionsService.getPendingActionsForNote(id, req.user.userId);
  }

  /**
   * Approve a single action
   */
  @Post('actions/:actionId/approve')
  async approveAction(@Request() req, @Param('actionId') actionId: string) {
    return this.pendingActionsService.approveAction(actionId, req.user.userId);
  }

  /**
   * Reject a single action
   */
  @Post('actions/:actionId/reject')
  async rejectAction(@Request() req, @Param('actionId') actionId: string) {
    return this.pendingActionsService.rejectAction(actionId, req.user.userId);
  }

  /**
   * Bulk approve/reject actions
   */
  @Post('actions/bulk')
  async bulkProcessActions(
    @Request() req,
    @Body() body: { actionIds: string[]; approve: boolean },
  ) {
    if (!body.actionIds || !Array.isArray(body.actionIds)) {
      throw new BadRequestException('actionIds must be an array');
    }
    return this.pendingActionsService.bulkProcessActions(
      body.actionIds,
      req.user.userId,
      body.approve,
    );
  }
}
