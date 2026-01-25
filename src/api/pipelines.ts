import client from './client';
import type {
  Pipeline,
  PipelineStage,
  CreatePipelineDto,
  UpdatePipelineDto,
  CreatePipelineStageDto,
  UpdatePipelineStageDto,
  ReorderStagesDto,
} from '../types/pipeline';

export const pipelinesApi = {
  /**
   * Get all pipelines
   */
  getAll: async (): Promise<Pipeline[]> => {
    const response = await client.get<Pipeline[]>('/pipelines');
    return response.data;
  },

  /**
   * Get a single pipeline by ID
   */
  getById: async (id: string): Promise<Pipeline> => {
    const response = await client.get<Pipeline>(`/pipelines/${id}`);
    return response.data;
  },

  /**
   * Get the default pipeline
   */
  getDefault: async (): Promise<Pipeline> => {
    const response = await client.get<Pipeline>('/pipelines/default');
    return response.data;
  },

  /**
   * Create a new pipeline
   */
  create: async (data: CreatePipelineDto): Promise<Pipeline> => {
    const response = await client.post<Pipeline>('/pipelines', data);
    return response.data;
  },

  /**
   * Update a pipeline
   */
  update: async (id: string, data: UpdatePipelineDto): Promise<Pipeline> => {
    const response = await client.patch<Pipeline>(`/pipelines/${id}`, data);
    return response.data;
  },

  /**
   * Delete a pipeline
   */
  delete: async (id: string): Promise<void> => {
    await client.delete(`/pipelines/${id}`);
  },

  /**
   * Set a pipeline as the default
   */
  setDefault: async (id: string): Promise<Pipeline> => {
    const response = await client.post<Pipeline>(`/pipelines/${id}/set-default`);
    return response.data;
  },

  // Stage Operations

  /**
   * Create a new stage in a pipeline
   */
  createStage: async (pipelineId: string, data: CreatePipelineStageDto): Promise<PipelineStage> => {
    const response = await client.post<PipelineStage>(`/pipelines/${pipelineId}/stages`, data);
    return response.data;
  },

  /**
   * Update a stage
   */
  updateStage: async (pipelineId: string, stageId: string, data: UpdatePipelineStageDto): Promise<PipelineStage> => {
    const response = await client.patch<PipelineStage>(`/pipelines/${pipelineId}/stages/${stageId}`, data);
    return response.data;
  },

  /**
   * Delete a stage
   */
  deleteStage: async (pipelineId: string, stageId: string): Promise<void> => {
    await client.delete(`/pipelines/${pipelineId}/stages/${stageId}`);
  },

  /**
   * Reorder stages in a pipeline
   */
  reorderStages: async (pipelineId: string, data: ReorderStagesDto): Promise<PipelineStage[]> => {
    const response = await client.post<PipelineStage[]>(`/pipelines/${pipelineId}/stages/reorder`, data);
    return response.data;
  },

  /**
   * Duplicate a pipeline with all its stages
   */
  duplicate: async (id: string, newName: string): Promise<Pipeline> => {
    const response = await client.post<Pipeline>(`/pipelines/${id}/duplicate`, { name: newName });
    return response.data;
  },
};

export default pipelinesApi;
