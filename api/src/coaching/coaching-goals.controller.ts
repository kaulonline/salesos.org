/**
 * Coaching Goals Controller
 * Manages user coaching goals and practice patterns
 * 
 * AI-Generated Code - GitHub Copilot
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { PrismaService } from '../database/prisma.service';

interface CoachingGoal {
  id: string;
  title: string;
  targetSessions: number;
  completedSessions: number;
  targetScore: number;
  currentScore: number;
  deadline: string;
  scenario: string;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PracticePattern {
  id: string;
  dayOfWeek: number;
  timeSlot: string;
  scenario: string;
  duration: number;
  isActive: boolean;
}

@ApiTags('Coaching Goals')
@ApiBearerAuth('JWT')
@Controller('coaching')
@UseGuards(JwtAuthGuard)
export class CoachingGoalsController {
  private readonly logger = new Logger(CoachingGoalsController.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==================== GOALS ====================

  @Get('goals')
  async getGoals(@Request() req): Promise<CoachingGoal[]> {
    const userId = req.user.userId;
    
    try {
      // Store goals in user settings as JSON
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { settings: true },
      });

      const settings = (user?.settings as any) || {};
      return settings.coachingGoals || [];
    } catch (error) {
      this.logger.error(`Failed to get goals for user ${userId}: ${error.message}`);
      return [];
    }
  }

  @Post('goals')
  async createGoal(@Request() req, @Body() goal: Partial<CoachingGoal>): Promise<CoachingGoal> {
    const userId = req.user.userId;
    
    const newGoal: CoachingGoal = {
      id: `goal_${Date.now()}`,
      title: goal.title || 'New Goal',
      targetSessions: goal.targetSessions || 10,
      completedSessions: goal.completedSessions || 0,
      targetScore: goal.targetScore || 80,
      currentScore: goal.currentScore || 0,
      deadline: goal.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      scenario: goal.scenario || 'GENERAL_PRACTICE',
      isCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { settings: true },
      });

      const settings = (user?.settings as any) || {};
      const goals = settings.coachingGoals || [];
      goals.push(newGoal);

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          settings: {
            ...settings,
            coachingGoals: goals,
          },
        },
      });

      return newGoal;
    } catch (error) {
      this.logger.error(`Failed to create goal for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  @Put('goals/:id')
  async updateGoal(
    @Request() req,
    @Param('id') goalId: string,
    @Body() updates: Partial<CoachingGoal>,
  ): Promise<CoachingGoal | null> {
    const userId = req.user.userId;

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { settings: true },
      });

      const settings = (user?.settings as any) || {};
      const goals: CoachingGoal[] = settings.coachingGoals || [];
      
      const goalIndex = goals.findIndex(g => g.id === goalId);
      if (goalIndex === -1) {
        return null;
      }

      goals[goalIndex] = {
        ...goals[goalIndex],
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          settings: {
            ...settings,
            coachingGoals: goals,
          },
        },
      });

      return goals[goalIndex];
    } catch (error) {
      this.logger.error(`Failed to update goal ${goalId} for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  @Delete('goals/:id')
  async deleteGoal(@Request() req, @Param('id') goalId: string): Promise<{ success: boolean }> {
    const userId = req.user.userId;

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { settings: true },
      });

      const settings = (user?.settings as any) || {};
      const goals: CoachingGoal[] = settings.coachingGoals || [];
      
      const filteredGoals = goals.filter(g => g.id !== goalId);

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          settings: {
            ...settings,
            coachingGoals: filteredGoals,
          },
        },
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to delete goal ${goalId} for user ${userId}: ${error.message}`);
      return { success: false };
    }
  }

  // ==================== PATTERNS ====================

  @Get('patterns')
  async getPatterns(@Request() req): Promise<PracticePattern[]> {
    const userId = req.user.userId;
    
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { settings: true },
      });

      const settings = (user?.settings as any) || {};
      return settings.practicePatterns || [];
    } catch (error) {
      this.logger.error(`Failed to get patterns for user ${userId}: ${error.message}`);
      return [];
    }
  }

  @Post('patterns')
  async createPattern(@Request() req, @Body() pattern: Partial<PracticePattern>): Promise<PracticePattern> {
    const userId = req.user.userId;
    
    const newPattern: PracticePattern = {
      id: `pattern_${Date.now()}`,
      dayOfWeek: pattern.dayOfWeek ?? 1,
      timeSlot: pattern.timeSlot || '09:00',
      scenario: pattern.scenario || 'GENERAL_PRACTICE',
      duration: pattern.duration || 15,
      isActive: pattern.isActive ?? true,
    };

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { settings: true },
      });

      const settings = (user?.settings as any) || {};
      const patterns = settings.practicePatterns || [];
      patterns.push(newPattern);

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          settings: {
            ...settings,
            practicePatterns: patterns,
          },
        },
      });

      return newPattern;
    } catch (error) {
      this.logger.error(`Failed to create pattern for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  @Put('patterns/:id')
  async updatePattern(
    @Request() req,
    @Param('id') patternId: string,
    @Body() updates: Partial<PracticePattern>,
  ): Promise<PracticePattern | null> {
    const userId = req.user.userId;

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { settings: true },
      });

      const settings = (user?.settings as any) || {};
      const patterns: PracticePattern[] = settings.practicePatterns || [];
      
      const patternIndex = patterns.findIndex(p => p.id === patternId);
      if (patternIndex === -1) {
        return null;
      }

      patterns[patternIndex] = {
        ...patterns[patternIndex],
        ...updates,
      };

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          settings: {
            ...settings,
            practicePatterns: patterns,
          },
        },
      });

      return patterns[patternIndex];
    } catch (error) {
      this.logger.error(`Failed to update pattern ${patternId} for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  @Delete('patterns/:id')
  async deletePattern(@Request() req, @Param('id') patternId: string): Promise<{ success: boolean }> {
    const userId = req.user.userId;

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { settings: true },
      });

      const settings = (user?.settings as any) || {};
      const patterns: PracticePattern[] = settings.practicePatterns || [];
      
      const filteredPatterns = patterns.filter(p => p.id !== patternId);

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          settings: {
            ...settings,
            practicePatterns: filteredPatterns,
          },
        },
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to delete pattern ${patternId} for user ${userId}: ${error.message}`);
      return { success: false };
    }
  }
}
