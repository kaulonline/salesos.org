import { IsString, IsOptional, IsArray, IsEnum, IsBoolean } from 'class-validator';
import { TeamChannelType } from '@prisma/client';

export class CreateChannelDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TeamChannelType)
  @IsOptional()
  type?: TeamChannelType;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  memberIds?: string[];
}

export class UpdateChannelDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TeamChannelType)
  @IsOptional()
  type?: TeamChannelType;

  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;
}

export class SendMessageDto {
  @IsString()
  content: string;

  @IsString()
  @IsOptional()
  channelId?: string;

  @IsString()
  @IsOptional()
  directUserId?: string;

  @IsString()
  @IsOptional()
  parentId?: string;

  @IsArray()
  @IsOptional()
  attachments?: Array<{ name: string; url: string; type: string }>;
}

export class UpdateMessageDto {
  @IsString()
  content: string;
}

export class AddMembersDto {
  @IsArray()
  @IsString({ each: true })
  memberIds: string[];
}

export class ReactionDto {
  @IsString()
  emoji: string;
}
