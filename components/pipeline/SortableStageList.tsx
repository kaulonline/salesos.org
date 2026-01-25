import React, { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import type { PipelineStage, UpdatePipelineStageDto, CreatePipelineStageDto } from '../../src/types';
import { StageEditor } from './StageEditor';
import { STAGE_COLOR_PRESETS } from '../../src/types/pipeline';

interface SortableStageListProps {
  stages: PipelineStage[];
  onUpdateStage: (stageId: string, data: UpdatePipelineStageDto) => Promise<unknown>;
  onDeleteStage: (stageId: string) => Promise<unknown>;
  onReorderStages: (stageIds: string[]) => Promise<unknown>;
  onCreateStage: (data: CreatePipelineStageDto) => Promise<unknown>;
  isUpdating?: boolean;
  isDeleting?: boolean;
  isReordering?: boolean;
  isCreating?: boolean;
}

export const SortableStageList: React.FC<SortableStageListProps> = ({
  stages,
  onUpdateStage,
  onDeleteStage,
  onReorderStages,
  onCreateStage,
  isUpdating = false,
  isDeleting = false,
  isReordering = false,
  isCreating = false,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStageName, setNewStageName] = useState('');

  // Sort stages by sortOrder
  const sortedStages = [...stages].sort((a, b) => a.sortOrder - b.sortOrder);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    // Add a slight delay before showing the drag effect
    requestAnimationFrame(() => {
      const element = e.target as HTMLElement;
      element.style.opacity = '0.5';
    });
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    const element = e.target as HTMLElement;
    element.style.opacity = '1';
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && index !== draggedIndex) {
      setDragOverIndex(index);
    }
  }, [draggedIndex]);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    // Create new order
    const newStages = [...sortedStages];
    const [draggedStage] = newStages.splice(draggedIndex, 1);
    newStages.splice(dropIndex, 0, draggedStage);

    // Get new order of IDs
    const newStageIds = newStages.map(s => s.id);
    await onReorderStages(newStageIds);

    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex, sortedStages, onReorderStages]);

  const handleAddStage = async () => {
    if (!newStageName.trim()) return;

    const usedColors = stages.map(s => s.color);
    const availableColor = STAGE_COLOR_PRESETS.find(c => !usedColors.includes(c)) || STAGE_COLOR_PRESETS[0];

    await onCreateStage({
      name: newStageName.toUpperCase().replace(/\s+/g, '_'),
      displayName: newStageName.trim(),
      color: availableColor,
      probability: 50,
      sortOrder: stages.length,
    });

    setNewStageName('');
    setShowAddForm(false);
  };

  // Determine if a stage can be deleted (need at least 2 stages, can't delete if it's the only non-closed stage)
  const canDeleteStage = (stage: PipelineStage) => {
    if (stages.length <= 2) return false;
    const openStages = stages.filter(s => !s.isClosedWon && !s.isClosedLost);
    if (openStages.length <= 1 && !stage.isClosedWon && !stage.isClosedLost) return false;
    return true;
  };

  return (
    <div className="space-y-2">
      {sortedStages.map((stage, index) => (
        <div
          key={stage.id}
          draggable
          onDragStart={(e) => handleDragStart(e, index)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, index)}
          className={`transition-all duration-200 ${
            dragOverIndex === index
              ? 'border-t-2 border-[#EAD07D] pt-2'
              : ''
          } ${
            draggedIndex === index
              ? 'opacity-50'
              : ''
          }`}
        >
          <StageEditor
            stage={stage}
            onUpdate={onUpdateStage}
            onDelete={onDeleteStage}
            isUpdating={isUpdating}
            isDeleting={isDeleting}
            canDelete={canDeleteStage(stage)}
            dragHandleProps={{
              onMouseDown: (e) => e.stopPropagation(),
            }}
          />
        </div>
      ))}

      {/* Add Stage Button/Form */}
      {showAddForm ? (
        <div className="bg-white rounded-xl border border-gray-100 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={newStageName}
              onChange={(e) => setNewStageName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddStage();
                if (e.key === 'Escape') {
                  setShowAddForm(false);
                  setNewStageName('');
                }
              }}
              placeholder="Stage name..."
              autoFocus
              className="flex-1 px-4 py-2 bg-[#F8F8F6] rounded-xl border-transparent focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm font-medium"
            />
            <button
              onClick={handleAddStage}
              disabled={!newStageName.trim() || isCreating}
              className="px-4 py-2 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? 'Adding...' : 'Add'}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewStageName('');
              }}
              className="px-4 py-2 text-[#666] hover:text-[#1A1A1A] text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-[#666] font-medium hover:border-[#1A1A1A]/20 hover:text-[#1A1A1A] transition-all flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          <span>Add Stage</span>
        </button>
      )}

      {isReordering && (
        <div className="text-center text-sm text-[#666] py-2">
          Saving order...
        </div>
      )}
    </div>
  );
};

export default SortableStageList;
