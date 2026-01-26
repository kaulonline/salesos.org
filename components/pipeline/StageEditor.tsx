import React, { useState } from 'react';
import { GripVertical, Trash2, ChevronDown, Trophy, XCircle } from 'lucide-react';
import type { PipelineStage, UpdatePipelineStageDto } from '../../src/types';
import { STAGE_COLOR_PRESETS } from '../../src/types/pipeline';
import { ConfirmationModal } from '../../src/components/ui/ConfirmationModal';

interface StageEditorProps {
  stage: PipelineStage;
  onUpdate: (stageId: string, data: UpdatePipelineStageDto) => Promise<unknown>;
  onDelete: (stageId: string) => Promise<unknown>;
  isUpdating?: boolean;
  isDeleting?: boolean;
  canDelete?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

export const StageEditor: React.FC<StageEditorProps> = ({
  stage,
  onUpdate,
  onDelete,
  isUpdating = false,
  isDeleting = false,
  canDelete = true,
  dragHandleProps,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [localName, setLocalName] = useState(stage.displayName);
  const [localProbability, setLocalProbability] = useState(stage.probability);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleNameBlur = async () => {
    if (localName !== stage.displayName && localName.trim()) {
      await onUpdate(stage.id, { displayName: localName.trim() });
    }
  };

  const handleProbabilityBlur = async () => {
    const prob = Math.max(0, Math.min(100, localProbability));
    if (prob !== stage.probability) {
      await onUpdate(stage.id, { probability: prob });
    }
  };

  const handleColorChange = async (color: string) => {
    setShowColorPicker(false);
    await onUpdate(stage.id, { color });
  };

  const handleClosedWonToggle = async () => {
    await onUpdate(stage.id, {
      isClosedWon: !stage.isClosedWon,
      isClosedLost: false,
      probability: !stage.isClosedWon ? 100 : stage.probability,
    });
  };

  const handleClosedLostToggle = async () => {
    await onUpdate(stage.id, {
      isClosedLost: !stage.isClosedLost,
      isClosedWon: false,
      probability: !stage.isClosedLost ? 0 : stage.probability,
    });
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    await onDelete(stage.id);
    setShowDeleteModal(false);
  };

  return (
    <div className={`bg-white rounded-xl border border-gray-100 overflow-hidden transition-all ${isUpdating ? 'opacity-70' : ''}`}>
      {/* Header - Always visible */}
      <div className="flex items-center gap-3 p-4">
        {/* Drag Handle */}
        <div
          {...dragHandleProps}
          className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors"
        >
          <GripVertical size={18} />
        </div>

        {/* Color Indicator */}
        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="w-6 h-6 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
            style={{ backgroundColor: stage.color }}
          />
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-2 p-2 bg-white rounded-xl shadow-xl border border-gray-100 z-20 grid grid-cols-7 gap-1 animate-in fade-in zoom-in duration-200">
              {STAGE_COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  onClick={() => handleColorChange(color)}
                  className={`w-6 h-6 rounded-full hover:scale-110 transition-transform ${
                    stage.color === color ? 'ring-2 ring-offset-2 ring-[#1A1A1A]' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Stage Name */}
        <input
          type="text"
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          onBlur={handleNameBlur}
          className="flex-1 font-medium text-[#1A1A1A] bg-transparent border-transparent hover:bg-[#F8F8F6] focus:bg-[#F8F8F6] px-2 py-1 rounded-lg outline-none focus:ring-1 focus:ring-[#EAD07D]"
        />

        {/* Probability Badge */}
        <div className="flex items-center gap-1 text-sm">
          <input
            type="number"
            value={localProbability}
            onChange={(e) => setLocalProbability(Number(e.target.value))}
            onBlur={handleProbabilityBlur}
            min={0}
            max={100}
            className="w-12 text-center font-medium text-[#666] bg-[#F8F8F6] rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-[#EAD07D]"
          />
          <span className="text-[#999]">%</span>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-1">
          {stage.isClosedWon && (
            <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
              <Trophy size={12} />
              Won
            </span>
          )}
          {stage.isClosedLost && (
            <span className="flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              <XCircle size={12} />
              Lost
            </span>
          )}
        </div>

        {/* Expand/Collapse */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 hover:bg-[#F8F8F6] rounded-lg transition-colors"
        >
          <ChevronDown
            size={16}
            className={`text-[#666] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-50 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 gap-4">
            {/* Closed Won Toggle */}
            <div className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl">
              <div className="flex items-center gap-2">
                <Trophy size={16} className="text-green-600" />
                <span className="text-sm font-medium">Closed Won Stage</span>
              </div>
              <button
                onClick={handleClosedWonToggle}
                disabled={isUpdating}
                className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                  stage.isClosedWon ? 'bg-green-500' : 'bg-gray-200'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                    stage.isClosedWon ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Closed Lost Toggle */}
            <div className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl">
              <div className="flex items-center gap-2">
                <XCircle size={16} className="text-gray-500" />
                <span className="text-sm font-medium">Closed Lost Stage</span>
              </div>
              <button
                onClick={handleClosedLostToggle}
                disabled={isUpdating}
                className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                  stage.isClosedLost ? 'bg-gray-500' : 'bg-gray-200'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                    stage.isClosedLost ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Delete Button */}
          {canDelete && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={handleDelete}
                disabled={isDeleting || isUpdating}
                className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                <Trash2 size={14} />
                <span>Delete Stage</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Click outside to close color picker */}
      {showColorPicker && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowColorPicker(false)}
        />
      )}

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Stage"
        message={`Are you sure you want to delete the "${stage.displayName}" stage? Deals in this stage will need to be reassigned.`}
        confirmLabel="Delete"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  );
};

export default StageEditor;
