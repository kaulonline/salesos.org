// Pipeline Types - Multiple Sales Pipelines Feature

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  color?: string;
  sortOrder: number;
  stages: PipelineStage[];
  createdAt: string;
  updatedAt: string;
}

export interface PipelineStage {
  id: string;
  pipelineId: string;
  name: string;
  displayName: string;
  color: string;
  probability: number;
  isClosedWon: boolean;
  isClosedLost: boolean;
  sortOrder: number;
}

// DTOs for API operations
export interface CreatePipelineDto {
  name: string;
  description?: string;
  isDefault?: boolean;
  color?: string;
  stages?: CreatePipelineStageDto[];
}

export interface UpdatePipelineDto {
  name?: string;
  description?: string;
  isDefault?: boolean;
  isActive?: boolean;
  color?: string;
  sortOrder?: number;
}

export interface CreatePipelineStageDto {
  name: string;
  displayName: string;
  color: string;
  probability: number;
  isClosedWon?: boolean;
  isClosedLost?: boolean;
  sortOrder?: number;
}

export interface UpdatePipelineStageDto {
  name?: string;
  displayName?: string;
  color?: string;
  probability?: number;
  isClosedWon?: boolean;
  isClosedLost?: boolean;
  sortOrder?: number;
}

export interface ReorderStagesDto {
  stageIds: string[];
}

// Default pipeline configuration for backwards compatibility
export const DEFAULT_PIPELINE_STAGES: CreatePipelineStageDto[] = [
  { name: 'PROSPECTING', displayName: 'Prospecting', color: '#0ea5e9', probability: 10, sortOrder: 0 },
  { name: 'QUALIFICATION', displayName: 'Qualification', color: '#06b6d4', probability: 20, sortOrder: 1 },
  { name: 'NEEDS_ANALYSIS', displayName: 'Needs Analysis', color: '#14b8a6', probability: 30, sortOrder: 2 },
  { name: 'VALUE_PROPOSITION', displayName: 'Value Proposition', color: '#f97316', probability: 40, sortOrder: 3 },
  { name: 'DECISION_MAKERS_IDENTIFIED', displayName: 'Decision Makers', color: '#eab308', probability: 50, sortOrder: 4 },
  { name: 'PERCEPTION_ANALYSIS', displayName: 'Perception Analysis', color: '#a855f7', probability: 60, sortOrder: 5 },
  { name: 'PROPOSAL_PRICE_QUOTE', displayName: 'Proposal/Quote', color: '#f59e0b', probability: 70, sortOrder: 6 },
  { name: 'NEGOTIATION_REVIEW', displayName: 'Negotiation', color: '#8b5cf6', probability: 80, sortOrder: 7 },
  { name: 'CLOSED_WON', displayName: 'Closed Won', color: '#22c55e', probability: 100, isClosedWon: true, sortOrder: 8 },
  { name: 'CLOSED_LOST', displayName: 'Closed Lost', color: '#9ca3af', probability: 0, isClosedLost: true, sortOrder: 9 },
];

// Stage color presets for the UI
export const STAGE_COLOR_PRESETS = [
  '#0ea5e9', // sky
  '#06b6d4', // cyan
  '#14b8a6', // teal
  '#22c55e', // green
  '#84cc16', // lime
  '#eab308', // yellow
  '#f97316', // orange
  '#ef4444', // red
  '#ec4899', // pink
  '#a855f7', // purple
  '#8b5cf6', // violet
  '#6366f1', // indigo
  '#3b82f6', // blue
  '#9ca3af', // gray
];
