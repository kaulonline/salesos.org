import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Copy, Star, AlertCircle, X, Loader2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { SortableStageList } from '../../components/pipeline';
import { usePipelines, usePipeline } from '../../src/hooks';
import { STAGE_COLOR_PRESETS, DEFAULT_PIPELINE_STAGES } from '../../src/types/pipeline';
import type { Pipeline } from '../../src/types';

export const PipelineSettings: React.FC = () => {
  const {
    pipelines,
    loading,
    error,
    create,
    update,
    remove,
    setDefault,
    duplicate,
    isCreating,
    isDeleting,
  } = usePipelines();

  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<Pipeline | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState<Pipeline | null>(null);
  const [duplicateName, setDuplicateName] = useState('');

  // Select first pipeline when loaded
  useEffect(() => {
    if (pipelines.length > 0 && !selectedPipelineId) {
      const defaultPipeline = pipelines.find(p => p.isDefault) || pipelines[0];
      setSelectedPipelineId(defaultPipeline.id);
    }
  }, [pipelines, selectedPipelineId]);

  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId);

  // Use single pipeline hook for stage operations
  const {
    pipeline: pipelineDetail,
    loading: loadingDetail,
    createStage,
    updateStage,
    deleteStage,
    reorderStages,
    isCreatingStage,
    isUpdatingStage,
    isDeletingStage,
    isReordering,
  } = usePipeline(selectedPipelineId || undefined);

  const handleCreatePipeline = async (name: string, description?: string) => {
    try {
      const newPipeline = await create({
        name,
        description,
        stages: DEFAULT_PIPELINE_STAGES,
        color: STAGE_COLOR_PRESETS[Math.floor(Math.random() * STAGE_COLOR_PRESETS.length)],
      });
      setSelectedPipelineId(newPipeline.id);
      setShowCreateModal(false);
    } catch (err) {
      console.error('Failed to create pipeline:', err);
    }
  };

  const handleDeletePipeline = async (pipeline: Pipeline) => {
    try {
      await remove(pipeline.id);
      if (selectedPipelineId === pipeline.id) {
        const remaining = pipelines.filter(p => p.id !== pipeline.id);
        setSelectedPipelineId(remaining[0]?.id || null);
      }
      setShowDeleteModal(null);
    } catch (err) {
      console.error('Failed to delete pipeline:', err);
    }
  };

  const handleDuplicatePipeline = async () => {
    if (!showDuplicateModal || !duplicateName.trim()) return;
    try {
      const newPipeline = await duplicate(showDuplicateModal.id, duplicateName);
      setSelectedPipelineId(newPipeline.id);
      setShowDuplicateModal(null);
      setDuplicateName('');
    } catch (err) {
      console.error('Failed to duplicate pipeline:', err);
    }
  };

  const handleSetDefault = async (pipeline: Pipeline) => {
    try {
      await setDefault(pipeline.id);
    } catch (err) {
      console.error('Failed to set default pipeline:', err);
    }
  };

  const handleUpdatePipelineName = async (name: string) => {
    if (!selectedPipelineId || !name.trim()) return;
    try {
      await update(selectedPipelineId, { name });
    } catch (err) {
      console.error('Failed to update pipeline name:', err);
    }
  };

  const handleUpdatePipelineDescription = async (description: string) => {
    if (!selectedPipelineId) return;
    try {
      await update(selectedPipelineId, { description });
    } catch (err) {
      console.error('Failed to update pipeline description:', err);
    }
  };

  const handleToggleActive = async (pipeline: Pipeline) => {
    try {
      await update(pipeline.id, { isActive: !pipeline.isActive });
    } catch (err) {
      console.error('Failed to toggle pipeline active state:', err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-4">
            <Skeleton className="h-[400px] rounded-[2rem] bg-white" />
          </div>
          <div className="md:col-span-8">
            <Skeleton className="h-[600px] rounded-[2rem] bg-white" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-4xl font-medium text-[#1A1A1A]">Pipeline Settings</h1>
        <p className="text-[#666] mt-1">Configure your sales pipelines and stages</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Pipeline List Sidebar */}
        <div className="md:col-span-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#1A1A1A]">Pipelines</h3>
              <button
                onClick={() => setShowCreateModal(true)}
                className="p-2 hover:bg-[#F8F8F6] rounded-lg transition-colors"
                title="Create Pipeline"
              >
                <Plus size={18} />
              </button>
            </div>

            <div className="space-y-2">
              {pipelines.map((pipeline) => (
                <button
                  key={pipeline.id}
                  onClick={() => setSelectedPipelineId(pipeline.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                    selectedPipelineId === pipeline.id
                      ? 'bg-[#1A1A1A] text-white'
                      : 'hover:bg-[#F8F8F6] text-[#666]'
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: pipeline.color || '#6366f1' }}
                  />
                  <span className="font-medium text-sm flex-1 text-left truncate">
                    {pipeline.name}
                  </span>
                  {pipeline.isDefault && (
                    <Star
                      size={14}
                      className={selectedPipelineId === pipeline.id ? 'text-[#EAD07D]' : 'text-[#999]'}
                      fill="currentColor"
                    />
                  )}
                  {!pipeline.isActive && (
                    <Badge variant="neutral" size="sm">Inactive</Badge>
                  )}
                </button>
              ))}

              {pipelines.length === 0 && (
                <div className="text-center py-8 text-[#666]">
                  <p className="text-sm mb-4">No pipelines yet</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="text-sm font-medium text-[#1A1A1A] underline"
                  >
                    Create your first pipeline
                  </button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Pipeline Editor */}
        <div className="md:col-span-8">
          {selectedPipeline ? (
            <Card className="p-8">
              {/* Pipeline Header */}
              <div className="flex items-start justify-between mb-8">
                <div className="flex-1">
                  <input
                    type="text"
                    defaultValue={selectedPipeline.name}
                    onBlur={(e) => handleUpdatePipelineName(e.target.value)}
                    className="text-2xl font-medium text-[#1A1A1A] bg-transparent border-transparent hover:bg-[#F8F8F6] focus:bg-[#F8F8F6] px-2 py-1 -ml-2 rounded-lg outline-none focus:ring-1 focus:ring-[#EAD07D] w-full"
                  />
                  <input
                    type="text"
                    defaultValue={selectedPipeline.description || ''}
                    placeholder="Add a description..."
                    onBlur={(e) => handleUpdatePipelineDescription(e.target.value)}
                    className="text-sm text-[#666] bg-transparent border-transparent hover:bg-[#F8F8F6] focus:bg-[#F8F8F6] px-2 py-1 -ml-2 rounded-lg outline-none focus:ring-1 focus:ring-[#EAD07D] w-full mt-1"
                  />
                </div>
                <div className="flex items-center gap-2">
                  {!selectedPipeline.isDefault && (
                    <button
                      onClick={() => handleSetDefault(selectedPipeline)}
                      className="p-2 hover:bg-[#F8F8F6] rounded-lg transition-colors text-[#666] hover:text-[#1A1A1A]"
                      title="Set as default"
                    >
                      <Star size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setDuplicateName(`${selectedPipeline.name} (Copy)`);
                      setShowDuplicateModal(selectedPipeline);
                    }}
                    className="p-2 hover:bg-[#F8F8F6] rounded-lg transition-colors text-[#666] hover:text-[#1A1A1A]"
                    title="Duplicate"
                  >
                    <Copy size={18} />
                  </button>
                  {!selectedPipeline.isDefault && pipelines.length > 1 && (
                    <button
                      onClick={() => setShowDeleteModal(selectedPipeline)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors text-[#666] hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>

              {/* Pipeline Info */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="p-4 bg-[#F8F8F6] rounded-xl">
                  <div className="text-2xl font-bold text-[#1A1A1A]">
                    {pipelineDetail?.stages.length || 0}
                  </div>
                  <div className="text-xs text-[#666]">Stages</div>
                </div>
                <div className="p-4 bg-[#F8F8F6] rounded-xl">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        selectedPipeline.isActive ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                    />
                    <span className="text-sm font-medium">
                      {selectedPipeline.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleToggleActive(selectedPipeline)}
                    className="text-xs text-[#666] underline mt-1"
                  >
                    {selectedPipeline.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
                <div className="p-4 bg-[#F8F8F6] rounded-xl">
                  {selectedPipeline.isDefault ? (
                    <div className="flex items-center gap-2">
                      <Star size={16} className="text-[#EAD07D]" fill="currentColor" />
                      <span className="text-sm font-medium">Default Pipeline</span>
                    </div>
                  ) : (
                    <span className="text-sm text-[#666]">Not default</span>
                  )}
                </div>
              </div>

              {/* Stages Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-[#1A1A1A]">Stages</h3>
                  <span className="text-xs text-[#666]">Drag to reorder</span>
                </div>

                {loadingDetail ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 rounded-xl" />
                    ))}
                  </div>
                ) : pipelineDetail ? (
                  <SortableStageList
                    stages={pipelineDetail.stages}
                    onUpdateStage={updateStage}
                    onDeleteStage={deleteStage}
                    onReorderStages={reorderStages}
                    onCreateStage={createStage}
                    isUpdating={isUpdatingStage}
                    isDeleting={isDeletingStage}
                    isReordering={isReordering}
                    isCreating={isCreatingStage}
                  />
                ) : null}
              </div>
            </Card>
          ) : (
            <Card className="p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
              <div className="w-16 h-16 bg-[#F8F8F6] rounded-full flex items-center justify-center mb-4">
                <Plus size={24} className="text-[#666]" />
              </div>
              <h3 className="text-lg font-medium text-[#1A1A1A] mb-2">No Pipeline Selected</h3>
              <p className="text-sm text-[#666] mb-4">
                Select a pipeline from the list or create a new one
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium hover:bg-black transition-colors"
              >
                Create Pipeline
              </button>
            </Card>
          )}
        </div>
      </div>

      {/* Create Pipeline Modal */}
      {showCreateModal && (
        <CreatePipelineModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreatePipeline}
          isCreating={isCreating}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeletePipelineModal
          pipeline={showDeleteModal}
          onClose={() => setShowDeleteModal(null)}
          onConfirm={() => handleDeletePipeline(showDeleteModal)}
          isDeleting={isDeleting}
        />
      )}

      {/* Duplicate Pipeline Modal */}
      {showDuplicateModal && (
        <DuplicatePipelineModal
          pipeline={showDuplicateModal}
          name={duplicateName}
          onNameChange={setDuplicateName}
          onClose={() => {
            setShowDuplicateModal(null);
            setDuplicateName('');
          }}
          onConfirm={handleDuplicatePipeline}
          isCreating={isCreating}
        />
      )}
    </div>
  );
};

// Create Pipeline Modal Component
interface CreatePipelineModalProps {
  onClose: () => void;
  onCreate: (name: string, description?: string) => Promise<void>;
  isCreating: boolean;
}

const CreatePipelineModal: React.FC<CreatePipelineModalProps> = ({
  onClose,
  onCreate,
  isCreating,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Pipeline name is required');
      return;
    }
    setError(null);
    await onCreate(name.trim(), description.trim() || undefined);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-8 w-full max-w-md animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-medium text-[#1A1A1A]">New Pipeline</h2>
          <button onClick={onClose} className="text-[#666] hover:text-[#1A1A1A]">
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-[#666] mb-1 block">Pipeline Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
              placeholder="e.g., Enterprise Sales"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#666] mb-1 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none resize-none"
              rows={3}
              placeholder="What is this pipeline used for?"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-[#666] font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !name.trim()}
              className="flex-1 px-4 py-3 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Pipeline'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Delete Pipeline Modal Component
interface DeletePipelineModalProps {
  pipeline: Pipeline;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

const DeletePipelineModal: React.FC<DeletePipelineModalProps> = ({
  pipeline,
  onClose,
  onConfirm,
  isDeleting,
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-8 w-full max-w-md animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-medium text-red-600">Delete Pipeline</h2>
          <button onClick={onClose} className="text-[#666] hover:text-[#1A1A1A]">
            <X size={24} />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-[#666] mb-4">
            Are you sure you want to delete <strong className="text-[#1A1A1A]">{pipeline.name}</strong>?
          </p>
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
            <strong>Warning:</strong> This action cannot be undone. All deals in this pipeline will need to be reassigned to another pipeline.
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-[#666] font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 size={16} />
                Delete Pipeline
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Duplicate Pipeline Modal Component
interface DuplicatePipelineModalProps {
  pipeline: Pipeline;
  name: string;
  onNameChange: (name: string) => void;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isCreating: boolean;
}

const DuplicatePipelineModal: React.FC<DuplicatePipelineModalProps> = ({
  pipeline,
  name,
  onNameChange,
  onClose,
  onConfirm,
  isCreating,
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-8 w-full max-w-md animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-medium text-[#1A1A1A]">Duplicate Pipeline</h2>
          <button onClick={onClose} className="text-[#666] hover:text-[#1A1A1A]">
            <X size={24} />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-[#666] mb-4">
            Create a copy of <strong className="text-[#1A1A1A]">{pipeline.name}</strong> with all its stages.
          </p>
          <div>
            <label className="text-xs font-medium text-[#666] mb-1 block">New Pipeline Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
              autoFocus
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-[#666] font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isCreating || !name.trim()}
            className="flex-1 px-4 py-3 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isCreating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Duplicating...
              </>
            ) : (
              <>
                <Copy size={16} />
                Duplicate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PipelineSettings;
