import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { TeamMessagesService } from './team-messages.service';
import { CreateChannelDto, UpdateChannelDto, SendMessageDto, UpdateMessageDto, AddMembersDto, ReactionDto } from './dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class TeamMessagesController {
  constructor(private readonly teamMessagesService: TeamMessagesService) {}

  // ==================== CHANNELS ====================

  @Post('team/channels')
  async createChannel(@Request() req, @Body() dto: CreateChannelDto) {
    return this.teamMessagesService.createChannel(req.user.userId, dto);
  }

  @Get('team/channels')
  async getUserChannels(@Request() req) {
    return this.teamMessagesService.getUserChannels(req.user.userId);
  }

  @Get('team/channels/:id')
  async getChannel(@Request() req, @Param('id') id: string) {
    return this.teamMessagesService.getChannel(id, req.user.userId);
  }

  @Put('team/channels/:id')
  async updateChannel(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateChannelDto,
  ) {
    return this.teamMessagesService.updateChannel(id, req.user.userId, dto);
  }

  @Delete('team/channels/:id')
  async deleteChannel(@Request() req, @Param('id') id: string) {
    return this.teamMessagesService.deleteChannel(id, req.user.userId);
  }

  @Post('team/channels/:id/join')
  async joinChannel(@Request() req, @Param('id') id: string) {
    return this.teamMessagesService.joinChannel(id, req.user.userId);
  }

  @Post('team/channels/:id/leave')
  async leaveChannel(@Request() req, @Param('id') id: string) {
    return this.teamMessagesService.leaveChannel(id, req.user.userId);
  }

  @Post('team/channels/:id/members')
  async addChannelMembers(
    @Request() req,
    @Param('id') id: string,
    @Body() body: AddMembersDto,
  ) {
    return this.teamMessagesService.addChannelMembers(id, req.user.userId, body.memberIds);
  }

  @Delete('team/channels/:channelId/members/:userId')
  async removeChannelMember(
    @Request() req,
    @Param('channelId') channelId: string,
    @Param('userId') userId: string,
  ) {
    return this.teamMessagesService.removeChannelMember(channelId, req.user.userId, userId);
  }

  @Get('team/channels/:id/messages')
  async getChannelMessages(
    @Request() req,
    @Param('id') id: string,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '50',
  ) {
    return this.teamMessagesService.getChannelMessages(
      id,
      req.user.userId,
      parseInt(page, 10),
      parseInt(pageSize, 10),
    );
  }

  // ==================== DIRECT CONVERSATIONS ====================

  @Get('team/conversations')
  async getUserDirectConversations(@Request() req) {
    return this.teamMessagesService.getUserDirectConversations(req.user.userId);
  }

  @Get('team/conversations/:id/messages')
  async getDirectMessages(
    @Request() req,
    @Param('id') id: string,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '50',
  ) {
    return this.teamMessagesService.getDirectMessages(
      id,
      req.user.userId,
      parseInt(page, 10),
      parseInt(pageSize, 10),
    );
  }

  @Post('team/conversations/with/:userId')
  async getOrCreateDirectConversation(
    @Request() req,
    @Param('userId') otherUserId: string,
  ) {
    return this.teamMessagesService.getOrCreateDirectConversation(req.user.userId, otherUserId);
  }

  // ==================== MESSAGES ====================

  @Post('team/messages')
  async sendMessage(@Request() req, @Body() dto: SendMessageDto) {
    return this.teamMessagesService.sendMessage(req.user.userId, dto);
  }

  @Put('team/messages/:id')
  async updateMessage(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateMessageDto,
  ) {
    return this.teamMessagesService.updateMessage(id, req.user.userId, dto);
  }

  @Delete('team/messages/:id')
  async deleteMessage(@Request() req, @Param('id') id: string) {
    return this.teamMessagesService.deleteMessage(id, req.user.userId);
  }

  @Post('team/messages/:id/reactions')
  async addReaction(
    @Request() req,
    @Param('id') id: string,
    @Body() body: ReactionDto,
  ) {
    return this.teamMessagesService.addReaction(id, req.user.userId, body.emoji);
  }

  @Delete('team/messages/:id/reactions/:emoji')
  async removeReaction(
    @Request() req,
    @Param('id') id: string,
    @Param('emoji') emoji: string,
  ) {
    return this.teamMessagesService.removeReaction(id, req.user.userId, emoji);
  }

  @Post('team/messages/:id/pin')
  async togglePinMessage(@Request() req, @Param('id') id: string) {
    return this.teamMessagesService.pinMessage(id, req.user.userId);
  }

  // ==================== SEARCH ====================

  @Get('team/users/search')
  async searchUsers(
    @Request() req,
    @Query('q') query: string,
    @Query('limit') limit: string = '10',
  ) {
    return this.teamMessagesService.searchUsers(
      query,
      req.user.userId,
      parseInt(limit, 10),
    );
  }
}
