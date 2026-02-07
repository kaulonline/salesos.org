// AI Generated Code by Deloitte + Cursor (BEGIN)
/**
 * Video Coaching Service - Unit Tests
 * Tests for video/audio recording, transcription, and AI feedback generation
 */

import { Test, TestingModule } from '@nestjs/testing';
import { VideoCoachingService } from './video-coaching.service';
import { PrismaService } from '../database/prisma.service';
import { AnthropicService } from '../anthropic/anthropic.service';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { CoachingScenario, CoachingSessionStatus } from '@prisma/client';

describe('VideoCoachingService', () => {
  let service: VideoCoachingService;
  let prismaService: PrismaService;

  const mockUserId = 'user-123';
  const mockSessionId = 'session-123';

  const mockSession = {
    id: mockSessionId,
    userId: mockUserId,
    title: 'Test Session',
    scenario: CoachingScenario.ELEVATOR_PITCH,
    status: CoachingSessionStatus.RECORDING,
    opportunityId: null,
    accountId: null,
    videoUrl: null,
    audioUrl: null,
    thumbnailUrl: null,
    fileSize: null,
    durationSeconds: null,
    transcription: null,
    transcriptionSegments: [],
    overallScore: null,
    feedback: null,
    processingTimeMs: null,
    errorMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    coachingSession: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockAnthropicService = {
    generateChatCompletion: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(() => ''),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoCoachingService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AnthropicService, useValue: mockAnthropicService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<VideoCoachingService>(VideoCoachingService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a new coaching session', async () => {
      const createDto = {
        title: 'My Elevator Pitch',
        scenario: CoachingScenario.ELEVATOR_PITCH,
      };

      mockPrismaService.coachingSession.create.mockResolvedValue(mockSession);

      const result = await service.createSession(mockUserId, createDto);

      expect(result).toEqual(mockSession);
      expect(mockPrismaService.coachingSession.create).toHaveBeenCalled();
    });
  });

  describe('getSession', () => {
    it('should return a session if it exists', async () => {
      mockPrismaService.coachingSession.findFirst.mockResolvedValue(mockSession);

      const result = await service.getSession(mockSessionId, mockUserId);

      expect(result).toEqual(mockSession);
    });

    it('should throw NotFoundException if session does not exist', async () => {
      mockPrismaService.coachingSession.findFirst.mockResolvedValue(null);

      await expect(service.getSession(mockSessionId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getProgress', () => {
    it('should calculate progress metrics correctly', async () => {
      const completedSessions = [
        { ...mockSession, status: CoachingSessionStatus.COMPLETED, overallScore: 85 },
        { ...mockSession, id: 'session-2', status: CoachingSessionStatus.COMPLETED, overallScore: 90 },
      ];

      mockPrismaService.coachingSession.findMany.mockResolvedValue(completedSessions);
      mockPrismaService.coachingSession.count.mockResolvedValue(2);

      const result = await service.getProgress(mockUserId);

      expect(result.totalSessions).toBe(2);
      expect(result.completedSessions).toBe(2);
      expect(result.averageScore).toBeGreaterThan(0);
    });
  });
});
// AI Generated Code by Deloitte + Cursor (END)
